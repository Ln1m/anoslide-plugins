/**
 * 持久 PowerShell 会话（拓展栏「命令行」面板的后端）
 *
 * 设计（全部由本机实测确定，踩过的坑写在注释里，别再改回去）：
 *  · 宿主进程：`powershell.exe -NoLogo -NoProfile -NoExit -Command -`，**常驻一条**，
 *    用户的 cd / 变量 / 函数跨命令保留（观感与 VS Code 集成终端一致）。
 *  · 每条命令：宿主侧把脚本写成带 **UTF-8 BOM** 的临时 .ps1，再 `. '<file>.ps1'` dot-source
 *    （dot-source 在**当前作用域**执行，状态因此留在宿主 shell 里）。
 *    为什么不用 `-EncodedCommand`：那是另起子进程，继承不到宿主状态（实测 `$global:VKX`
 *    在第二条命令里就没了）；为什么不用 `-Command -` 逐行喂 stdin：PS 逐行解析执行，
 *    多行块的首行（裸标记）会被当成命令名 → CommandNotFoundException（实测）。
 *  · 取输出：脚本内 `& { <命令> } *>&1 | Out-String | Add-Content <结果文件> -Encoding utf8`，
 *    成功流/错误流/警告流一起落盘。**不读宿主 stdout**：Windows PowerShell 会把子进程 stderr
 *    序列化成 CLIXML（`#< CLIXML` + 转义中文），读回来全是噪声。
 *  · 哨兵：结果文件首行 `___VK_BEGIN___<id>`、末行 `___VK_END___<id>;<code>;<cwd-base64>`。
 *    host 轮询到 END 行才算跑完，然后把去哨兵的正文交给前端；cwd 随 END 一起带回来，
 *    前端提示符后面显示的就是真·当前目录（不是从命令文本里猜的）。
 *  · 编码：脚本必须 BOM（PS 5.1 无 BOM 时按 ANSI 读，中文源码必乱）；结果文件一律
 *    `-Encoding utf8`（`Add-Content` 默认 ANSI，中文会写坏）。读回时去掉 BOM。
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/** 单条命令累计输出上限（字符）——超过就截断，避免把浏览器拖死。 */
const JOB_MAX_OUTPUT = 512 * 1024;
/** 会话里保留的历史任务条数（滚动窗口）。 */
const JOB_KEEP = 40;
/** 已完成任务保留时长（毫秒）。 */
const JOB_DONE_TTL = 10 * 60 * 1000;
/** 允许的幂等 job id（client 生成，重复 POST 不会重复执行）。 */
const JOB_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
/** 临时脚本 / 结果文件目录。 */
const WORK_DIR = join(tmpdir(), "dsh-vk-cmdline");
/** 本机 shell 候选（按顺序试；本机只有 Windows PowerShell 5.1，pwsh7 不存在时自然跳过）。 */
const SHELL_CANDIDATES = [
	"pwsh.exe",
	"C:\\Program Files\\PowerShell\\7\\pwsh.exe",
	"powershell.exe",
	"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
];

const state = {
	exe: null,
	child: null,
	buf: "",
	queue: [],
	jobs: new Map(),
	pending: null,
	seq: 0,
	cwd: ""
};

function shellAlive() {
	return state.child !== null && state.child.exitCode === null && state.child.killed !== true;
}

/** 在 PATH 里找裸名字的可执行文件。 */
function findOnPath(name) {
	for (const dir of String(process.env.PATH || "").split(";")) {
		if (dir.length === 0) continue;
		const full = dir.replace(/[\\/]+$/, "") + "\\" + name;
		if (existsSync(full)) return full;
	}
	return null;
}

function pickShell() {
	const custom = process.env.DSH_VK_SHELL;
	if (typeof custom === "string" && custom.trim().length > 0) return custom.trim();
	for (const candidate of SHELL_CANDIDATES) {
		if (candidate.includes("\\") || candidate.includes("/")) {
			if (existsSync(candidate)) return candidate;
			continue;
		}
		const hit = findOnPath(candidate);
		if (hit !== null) return hit;
	}
	return "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
}

/** 终端正文里的系统消息（启动失败 / 进程退出）。 */
function pushSystem(text, level) {
	state.jobs.set("shell-" + String(++state.seq), {
		id: "shell-" + String(state.seq),
		command: "",
		status: "done",
		exitCode: null,
		output: text,
		startedAt: Date.now(),
		endedAt: Date.now(),
		truncated: false,
		error: null,
		system: true,
		level: level || "info"
	});
	gcJobs();
}

function ensureShell() {
	if (shellAlive()) return state.child;
	try {
		mkdirSync(WORK_DIR, { recursive: true });
	} catch {
		/* 目录已存在或权限异常：后面的写入会给出真实报错 */
	}
	const exe = pickShell();
	const child = spawn(exe, ["-NoLogo", "-NoProfile", "-NoExit", "-Command", "-"], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
	state.exe = exe;
	state.child = child;
	state.buf = "";
	child.stdout.on("data", (b) => { state.buf += b.toString("utf8"); drain(); });
	child.stderr.on("data", (b) => {
		// 宿主自身的问题（不是用户命令的输出）——用户命令的输出在结果文件里
		const text = b.toString("utf8");
		if (text.trim().length > 0) pushSystem(text, "warn");
	});
	child.on("error", (error) => {
		failPending("shell 启动失败：" + (error && error.message ? error.message : String(error)));
		pushSystem("\n[命令行] shell 启动失败：" + (error && error.message ? error.message : String(error)) +
			"（可用环境变量 DSH_VK_SHELL 指向自己的 shell）\n", "error");
	});
	child.on("exit", (code) => {
		state.child = null;
		state.cwd = "";
		failPending("shell 进程已退出（code=" + String(code) + "）");
		pushSystem("\n[命令行] shell 已退出（code=" + String(code) + "），下一条命令会自动重新拉起。\n", "warn");
	});
	try {
		child.stdin.write(
			[
				"$ErrorActionPreference = 'Continue'",
				"Write-Host 'DSH 命令行 · 持久会话（cd / 变量跨命令保留）' -ForegroundColor DarkGray"
			].join("; ") + "\n"
		);
	} catch {
		/* ignore */
	}
	return child;
}

function failPending(reason) {
	const job = state.pending;
	state.pending = null;
	for (const item of state.jobs.values()) {
		if (item.status === "running" || item.status === "queued") {
			item.status = "error";
			item.error = reason;
			item.endedAt = Date.now();
		}
	}
	if (job !== null) gcJobs();
}

/** 宿主 stdout：只用来消化缓冲（真实取数看结果文件）。 */
function drain() {
	const cut = state.buf.lastIndexOf("\n");
	if (cut < 0) return;
	state.buf = state.buf.slice(cut + 1);
}

/** 读结果文件 → { body, code, cwd, error }；END 行还没落盘时返回 null。 */
function pickOutput(job) {
	try {
		if (!existsSync(job.outFile)) return null;
		let text = readFileSync(job.outFile, "utf8");
		if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
		text = text.replace(/\r\n/g, "\n");
		const endMark = "___VK_END___" + job.id + ";";
		const endAt = text.lastIndexOf(endMark);
		if (endAt < 0) return null;
		const tail = text.slice(endAt + endMark.length).split("\n")[0].trim();
		const tailParts = tail.split(";");
		const codeText = tailParts.length > 0 ? tailParts[0] : "";
		let cwd = state.cwd;
		if (tailParts.length > 1 && tailParts[1].length > 0) {
			try { cwd = Buffer.from(tailParts[1], "base64").toString("utf8"); } catch { /* 保持上一次的 cwd */ }
		}
		const startMark = "___VK_BEGIN___" + job.id;
		const startAt = text.indexOf(startMark);
		let body = text.slice(startAt < 0 ? 0 : startAt + startMark.length, endAt);
		let error = null;
		const errMark = "___VK_ERR___";
		const errAt = body.indexOf(errMark);
		if (errAt >= 0) {
			const lineEnd = body.indexOf("\n", errAt);
			error = body.slice(errAt + errMark.length, lineEnd < 0 ? undefined : lineEnd).trim();
			body = body.slice(0, errAt) + (lineEnd < 0 ? "" : body.slice(lineEnd + 1));
		}
		// 只裁首尾用于分隔的空行，保留命令本身的空行结构
		body = body.replace(/^\n/, "").replace(/\n$/, "");
		if (body.length > JOB_MAX_OUTPUT) {
			body = body.slice(0, JOB_MAX_OUTPUT);
			job.truncated = true;
		}
		return { body, code: Number.parseInt(codeText, 10), cwd, error };
	} catch {
		return null;
	}
}

/** 轮询入口（语义占位：真正的扫描由 snapshot() 触发的 scanJobs() 完成）。 */
export function poll() {
	scanJobs();
	return null;
}

function scanJobs() {
	for (const job of state.jobs.values()) {
		if (job.status !== "running") continue;
		const got = pickOutput(job);
		if (got === null) {
			if (Date.now() - job.startedAt > 60 * 60 * 1000) {
				job.status = "error";
				job.error = "等待结果超时（超过 1 小时）";
				job.endedAt = Date.now();
				if (state.pending === job) state.pending = null;
			}
			continue;
		}
		job.output = got.body;
		job.exitCode = Number.isFinite(got.code) ? got.code : null;
		job.status = got.error === null ? "done" : "error";
		job.error = got.error;
		job.endedAt = Date.now();
		if (typeof got.cwd === "string" && got.cwd.length > 0) state.cwd = got.cwd;
		if (state.pending === job) state.pending = null;
		try { rmSync(job.outFile, { force: true }); } catch { /* ignore */ }
		try { rmSync(job.scriptFile, { force: true }); } catch { /* ignore */ }
		gcJobs();
	}
}

function gcJobs() {
	const now = Date.now();
	for (const [id, job] of state.jobs) {
		const finished = job.status === "done" || job.status === "error";
		if (finished && now - (job.endedAt ?? now) > JOB_DONE_TTL) state.jobs.delete(id);
	}
	const finished = [...state.jobs.entries()].filter(([, job]) => job.status === "done" || job.status === "error");
	for (let i = 0; i < finished.length - JOB_KEEP; i++) state.jobs.delete(finished[i][0]);
}

// ── 对外 API ──────────────────────────────────────────────────────────
/**
 * 排队执行一条命令；同一时刻只跑一条，其余排队（与真实终端一致）。
 * @param {{ id?: string, command: string }} input
 */
export function enqueue(input) {
	const raw = typeof input === "string" ? input : input?.command;
	const command = String(raw ?? "");
	const wanted = typeof input?.id === "string" && JOB_ID_RE.test(input.id) ? input.id : "";
	const id = wanted.length > 0 ? wanted : "job-" + String(++state.seq);
	if (state.jobs.has(id)) return { ok: true, id, deduped: true };
	const job = {
		id,
		command,
		status: "queued",
		exitCode: null,
		output: "",
		startedAt: Date.now(),
		endedAt: null,
		truncated: false,
		error: null,
		system: false,
		scriptFile: join(WORK_DIR, id + ".ps1"),
		outFile: join(WORK_DIR, id + ".out.txt")
	};
	state.jobs.set(id, job);
	state.queue.push(id);
	gcJobs();
	pump();
	return { ok: true, id };
}

/**
 * 把用户命令包成一个能落盘的脚本。
 * 关键点：`& { <命令> }` 原样嵌进去（多行安全）；退出码必须**在命令跑完的那一刻**抓，
 * 抓晚了就被后面的管道覆盖（实测：`cmd /c exit 7` 之后 `$?` 是 True、`$LASTEXITCODE` 是 0）。
 * 规则：native 命令看 `$LASTEXITCODE`，PS cmdlet 的非终止错误看 `$?`。
 */
function buildScript(job) {
	const out = job.outFile.replace(/'/g, "''");
	return [
		"$ErrorActionPreference = 'Continue'",
		"$__vkOut = '" + out + "'",
		"('___VK_BEGIN___' + '" + job.id + "') | Set-Content -LiteralPath $__vkOut -Encoding utf8",
		"$__vkBody = ''",
		"$__vkErr = $null",
		"$global:LASTEXITCODE = $null",
		"try {",
		"$__vkBody = (& {",
		job.command,
		"} *>&1 | Out-String)",
		"$__vkOk = $?",
		"} catch { $__vkErr = $_.Exception.Message; $__vkOk = $false }",
		"$__vkCode = if ($null -ne $global:LASTEXITCODE) { [int]$global:LASTEXITCODE } elseif ($__vkOk) { 0 } else { 1 }",
		"if ($__vkBody.Length -gt 0) { $__vkBody | Add-Content -LiteralPath $__vkOut -Encoding utf8 }",
		"if ($null -ne $__vkErr) { ('___VK_ERR___' + $__vkErr) | Add-Content -LiteralPath $__vkOut -Encoding utf8 }",
		"$__vkCwd = try { (Get-Location).Path } catch { '' }",
		"$__vkCwdB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes([string]$__vkCwd))",
		"('___VK_END___' + '" + job.id + "' + ';' + $__vkCode + ';' + $__vkCwdB64) | Add-Content -LiteralPath $__vkOut -Encoding utf8"
	].join("\n");
}

function pump() {
	if (state.pending !== null) return;
	const id = state.queue.shift();
	if (id === undefined) return;
	const job = state.jobs.get(id);
	if (job === undefined) return void pump();
	const child = ensureShell();
	job.status = "running";
	job.startedAt = Date.now();
	state.pending = job;
	try {
		// UTF-8 **BOM**：PS 5.1 没有 BOM 就按 ANSI 读脚本，中文源码必乱
		writeFileSync(job.scriptFile, "\uFEFF" + buildScript(job), "utf8");
	} catch (error) {
		finishImmediate(job, "无法写临时脚本：" + (error && error.message ? error.message : String(error)));
		return;
	}
	try {
		child.stdin.write(". '" + job.scriptFile.replace(/'/g, "''") + "'\n");
	} catch (error) {
		finishImmediate(job, "无法写入 shell stdin：" + (error && error.message ? error.message : String(error)));
	}
}

function finishImmediate(job, reason) {
	job.status = "error";
	job.error = reason;
	job.endedAt = Date.now();
	if (state.pending === job) state.pending = null;
	gcJobs();
	pump();
}

/** 快照：client 定时拉，全量交回（任务条数有上限，够小）。 */
export function snapshot() {
	scanJobs();
	const jobs = [...state.jobs.values()].map((job) => ({
		id: job.id,
		command: job.command,
		status: job.status,
		exitCode: job.exitCode,
		output: job.output,
		startedAt: job.startedAt,
		endedAt: job.endedAt,
		truncated: job.truncated === true,
		error: job.error ?? null,
		system: job.system === true,
		level: job.level ?? null
	}));
	return {
		ok: true,
		shell: { exe: state.exe, alive: shellAlive(), pid: state.child === null ? null : state.child.pid, cwd: state.cwd },
		jobs
	};
}

/** 清空输出（前端「清屏」用；不打断正在跑的命令，也不清正在跑的这条）。 */
export function clear() {
	for (const [id, job] of state.jobs) {
		const finished = job.status === "done" || job.status === "error";
		if (finished) state.jobs.delete(id);
	}
	return { ok: true };
}

/** 插件卸载：结束 shell 进程并清掉临时文件。 */
export function dispose() {
	const child = state.child;
	state.child = null;
	if (child !== null) {
		try { child.stdin.end("exit\n"); } catch { /* ignore */ }
		try { child.kill(); } catch { /* ignore */ }
	}
	for (const job of state.jobs.values()) {
		try { rmSync(job.outFile, { force: true }); } catch { /* ignore */ }
		try { rmSync(job.scriptFile, { force: true }); } catch { /* ignore */ }
	}
	state.jobs.clear();
	state.queue.length = 0;
	state.pending = null;
}
