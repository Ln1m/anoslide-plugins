import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, extname, isAbsolute, join, normalize, sep } from "node:path";
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
import { defineTool } from "@deepseek-ai/dsh-tools";
// 拓展栏「命令行」面板的两个后端（2026-09-12）：
//   · shell-session：常驻 PowerShell 会话（cd / 变量跨命令保留）
//   · agent-shell：本会话里 Agent 自己调的 shell 命令（session/event 火线采集）
import { clear as shellClear, dispose as shellDispose, enqueue as shellEnqueue, snapshot as shellSnapshot } from "./shell-session.js";
import { clear as agentShellClear, dispose as agentShellDispose, install as agentShellInstall, list as agentShellList } from "./agent-shell.js";

/** 原始文件（图片预览）单次响应上限。 */
const MAX_BLOB_BYTES = 64 * 1024 * 1024;
/** 文件扩展名 → Content-Type（GET /vscode-files/file 原始字节路由用）。 */
const MIME_BY_EXT = {
	png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg",
	gif: "image/gif", webp: "image/webp", avif: "image/avif", apng: "image/png",
	bmp: "image/bmp", ico: "image/x-icon", svg: "image/svg+xml",
	tif: "image/tiff", tiff: "image/tiff", heic: "image/heic", heif: "image/heif",
	pdf: "application/pdf"
};

// ── 中栏网页预览（GET /vscode-files/fs/<绝对路径>）──
/**
 * 网页预览可服务的扩展名 → MIME。**白名单**：未列出的一律 403，
 * 避免把 .env / 密钥 / .yaml 之类通过这个路由读给浏览器。
 */
const WEB_MIME = {
	html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8",
	css: "text/css; charset=utf-8",
	js: "text/javascript; charset=utf-8", mjs: "text/javascript; charset=utf-8", cjs: "text/javascript; charset=utf-8",
	json: "application/json; charset=utf-8", map: "application/json; charset=utf-8",
	svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg",
	gif: "image/gif", webp: "image/webp", avif: "image/avif", apng: "image/png", bmp: "image/bmp",
	ico: "image/x-icon", tif: "image/tiff", tiff: "image/tiff",
	woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", eot: "application/vnd.ms-fontobject",
	mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", mp4: "video/mp4", webm: "video/webm", vtt: "text/vtt",
	pdf: "application/pdf", xml: "application/xml; charset=utf-8",
	txt: "text/plain; charset=utf-8", md: "text/plain; charset=utf-8", csv: "text/csv; charset=utf-8",
	wasm: "application/wasm"
};
/** 路径 → URL 段编码（保留 / 与盘符冒号，转义 # ? 与中文空格）。 */
function encodePreviewPath(path) {
	return encodeURI(String(path).replace(/\\/g, "/")).replace(/#/g, "%23").replace(/\?/g, "%3F");
}
/**
 * 给 HTML 注入 `<base href>`，把页面内的相对路径与以 / 开头的绝对路径都锚定到文件所在目录。
 * 不注入的话，`src="a.css"` 会解析成 /vscode-files/fs/a.css（404），`src="/a.css"` 同样落到站点根。
 * 页面自己已声明 <base> 时不覆盖。
 */
function injectPreviewBase(html, baseHref) {
	if (/<base[\s>]/i.test(html)) return html;
	const tag = '<base href="' + baseHref + '">';
	const head = /<head[^>]*>/i.exec(html);
	if (head !== null) return html.slice(0, head.index + head[0].length) + tag + html.slice(head.index + head[0].length);
	const root = /<html[^>]*>/i.exec(html);
	if (root !== null) return html.slice(0, root.index + root[0].length) + tag + html.slice(root.index + root[0].length);
	return tag + html;
}
/**
 * 服务中栏网页预览的一个文件。路径式 URL（不是 ?path=）是关键：
 * iframe 里的相对资源会自然解析到同目录，再由本函数按白名单返回。
 * 目录请求自动落到该目录的 index.html。
 */
async function servePreviewPage(req, res, encodedPath) {
	if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { ok: false, error: "method not allowed" });
	let rel = "";
	try {
		rel = decodeURIComponent(encodedPath);
	} catch {
		return sendJson(res, 400, { ok: false, error: "bad path encoding" });
	}
	rel = rel.replace(/^\/+/, "");
	if (rel.length === 0) return sendJson(res, 400, { ok: false, error: "missing path" });
	const target = normalize(rel.split("/").join(sep));
	let info = await stat(target).catch(() => void 0);
	if (info === void 0) return sendJson(res, 404, { ok: false, error: "not found: " + target });
	if (info.isDirectory()) {
		const index = join(target, "index.html");
		const idx = await stat(index).catch(() => void 0);
		if (idx === void 0 || !idx.isFile()) return sendJson(res, 404, { ok: false, error: "no index.html in directory: " + target });
		const body = await readFile(index, "utf8");
		const html = injectPreviewBase(body, "/vscode-files/fs/" + encodePreviewPath(target) + "/");
		const data = Buffer.from(html, "utf8");
		res.writeHead(200, { "content-type": WEB_MIME.html, "cache-control": "no-cache", "content-length": String(data.length), "x-content-type-options": "nosniff" });
		res.end(data);
		return;
	}
	if (!info.isFile()) return sendJson(res, 404, { ok: false, error: "not a file" });
	const ext = extname(target).slice(1).toLowerCase();
	const mime = WEB_MIME[ext];
	if (mime === void 0) return sendJson(res, 403, { ok: false, error: "extension not served by web preview: " + (ext.length > 0 ? ext : "(none)") });
	if (info.size > MAX_BLOB_BYTES) return sendJson(res, 413, { ok: false, error: "file too large to preview (" + info.size + " bytes)" });
	if (ext === "html" || ext === "htm") {
		const body = await readFile(target, "utf8");
		const html = injectPreviewBase(body, "/vscode-files/fs/" + encodePreviewPath(dirname(target)) + "/");
		const data = Buffer.from(html, "utf8");
		res.writeHead(200, { "content-type": mime, "cache-control": "no-cache", "content-length": String(data.length), "x-content-type-options": "nosniff" });
		res.end(data);
		return;
	}
	const data = await readFile(target);
	res.writeHead(200, { "content-type": mime, "cache-control": "no-cache", "content-length": String(data.length), "x-content-type-options": "nosniff" });
	res.end(data);
}

// ── Office → PDF 中栏预览（LibreOffice headless；结果按 源路径+大小+mtime 缓存到 ~/.dsh/office-cache）──
/**
 * 需要转换的 Office / Visio 扩展名（纯 PDF 走 /vscode-files/file 直出，不在此列）。
 * Visio（.vsd/.vsdx/.vsdm）由 LibreOffice Draw 导入后导出 PDF（实测 vsdx → 1 页 PDF 正常）。
 */
const OFFICE_CONVERT_EXT = new Set(["docx", "doc", "pptx", "ppt", "xlsx", "xls", "odt", "odp", "ods", "vsdx", "vsd", "vsdm"]);
/** Office 转 PDF 的源文件大小上限。 */
const OFFICE_MAX_SRC_BYTES = 200 * 1024 * 1024;
/** 音视频流式输出用的 MIME 表（只收浏览器原生能解的容器/编码）。 */
const MEDIA_MIME = {
	mp4: "video/mp4",
	m4v: "video/mp4",
	webm: "video/webm",
	ogv: "video/ogg",
	mov: "video/quicktime",
	mp3: "audio/mpeg",
	wav: "audio/wav",
	flac: "audio/flac",
	ogg: "audio/ogg",
	oga: "audio/ogg",
	opus: "audio/ogg",
	m4a: "audio/mp4",
	aac: "audio/aac"
};
const OFFICE_CACHE_DIR = join(homedir(), ".dsh", "office-cache");
const SOFFICE_CANDIDATES = [
	typeof process.env.LIBREOFFICE_PATH === "string" && process.env.LIBREOFFICE_PATH.length > 0 ? process.env.LIBREOFFICE_PATH : null,
	"C:\\Program Files\\LibreOffice\\program\\soffice.com",
	"C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com",
	"C:\\Program Files\\LibreOffice\\program\\soffice.exe",
	"C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"
].filter((p) => p !== null);
let sofficePathCache = null;
/** 探测 soffice.exe（只探一次）。 */
function sofficeExe() {
	if (sofficePathCache !== null) return sofficePathCache;
	for (const candidate of SOFFICE_CANDIDATES) {
		if (typeof candidate === "string" && candidate.length > 0 && existsSync(candidate)) {
			sofficePathCache = candidate;
			return candidate;
		}
	}
	sofficePathCache = false;
	return null;
}
/** LibreOffice 单实例串行队列（同一 user profile 并行会锁冲突，逐个转）。 */
let officeChain = Promise.resolve();
function runConvertOnce(exe, source, outdir) {
	return new Promise((resolve, reject) => {
		execFile(exe, ["--headless", "--norestore", "--nolockcheck", "--convert-to", "pdf", "--outdir", outdir, source], {
			timeout: 180000,
			windowsHide: true
		}, (error) => {
			if (error) reject(error instanceof Error ? error : new Error(String(error)));
			else resolve();
		});
	});
}
function pathStem(p) {
	const base = String(p).split(/[\\/]/).pop() ?? "";
	const i = base.lastIndexOf(".");
	return i > 0 ? base.slice(0, i) : base;
}
/**
 * 确保源 Office 文档的 PDF 缓存存在，返回缓存 PDF 的绝对路径；失败返回 null。
 * 缓存键 = sha1(路径+mtimeMs+size)，文件变化自动重转。
 */
async function officeCachePdfFor(target, info) {
	const exe = sofficeExe();
	if (exe === null) return null;
	try {
		await mkdir(OFFICE_CACHE_DIR, { recursive: true });
	} catch {}
	const hash = createHash("sha1").update(target).update("\u0000").update(String(info.mtimeMs)).update("\u0000").update(String(info.size)).digest("hex");
	const cachePdf = join(OFFICE_CACHE_DIR, hash + ".pdf");
	if (existsSync(cachePdf)) return cachePdf;
	const workDir = join(OFFICE_CACHE_DIR, ".work-" + hash);
	try {
		await mkdir(workDir, { recursive: true });
	} catch {}
	const run = officeChain.then(async () => {
		try {
			await runConvertOnce(exe, target, workDir);
			const out = join(workDir, pathStem(target) + ".pdf");
			const data = await readFile(out);
			await writeFile(cachePdf, data);
			return cachePdf;
		} finally {
			await rm(workDir, { recursive: true, force: true }).catch(() => {});
		}
	});
	officeChain = run.then(() => void 0, () => void 0);
	try {
		return await run;
	} catch (error) {
		console.warn("[dsh-host-files] office -> pdf failed:", error instanceof Error ? error.message : String(error));
		return null;
	}
}

// ── Office → 中栏「网页视图」（MS Office COM 优先；任何失败回落 LibreOffice→PDF）──
/**
 * 网页视图支持的扩展 → 导出器。**只放 MS Office 原生格式**：odt/ods/odp 没有 COM 导出器，
 * 继续走 PDF 路径。导出策略全部来自本机实测（见各行注释），不是推测。
 * 实现要点：Office COM 在 PowerShell 里会 `TYPE_E_CANTLOADLIBRARY`，只能用 cscript + VBScript
 * 后期绑定；VBS 脚本本身保持纯 ASCII（动态值一律走命令行参数），避开编码坑。
 */
const OFFICE_WEB_KIND_BY_EXT = {
	docx: "word", doc: "word",
	xlsx: "excel", xls: "excel",
	pptx: "ppt", ppt: "ppt",
	vsdx: "visio", vsd: "visio", vsdm: "visio"
};
/** COM 单次转换超时（与 LibreOffice 同量级；实测 42 页 Word 导 HTML 28s、207 页 PPT 导 PDF 32s）。 */
const OFFICE_COM_TIMEOUT_MS = 180000;
/** 转换失败后的冷却时间：避免每次打开都重试一遍几分钟的超时。 */
const OFFICE_COM_FAIL_COOLDOWN_MS = 600000;
/** PPT 超过这个页数就不做 PNG 相册，改由 PowerPoint 直接导 PDF（实测 207 页：相册 43.5MB vs PDF 15MB）。 */
const PPT_RASTER_MAX_SLIDES = 30;
const PPT_RASTER_WIDTH = 1920;
const PPT_RASTER_HEIGHT = 1080;
/** Office 主进程映像名（超时清理只针对本次新起、且命令行含 -Embedding 的进程）。 */
const OFFICE_APP_IMAGES = ["WINWORD.EXE", "EXCEL.EXE", "POWERPNT.EXE", "VISIO.EXE"];
const CSCRIPT_CANDIDATES = [
	"C:\\Windows\\System32\\cscript.exe",
	"C:\\Windows\\SysWOW64\\cscript.exe"
];
/** 网页视图壳的公共样式：深灰底 + 白卡，与浏览器 PDF 阅读器观感一致。 */
const VIEW_SHELL_CSS = [
	"html,body{margin:0;background:#525659}",
	".vk-bar{position:sticky;top:0;z-index:9;display:flex;gap:10px;align-items:center;flex-wrap:wrap;",
	"background:#3b3e42;color:#d7d7d7;font:12px/1.7 system-ui,'Microsoft YaHei',sans-serif;padding:6px 12px}",
	".vk-bar b{color:#fff;font-weight:600}",
	".vk-bar span{white-space:nowrap}",
	".vk-page{display:block;margin:14px auto;max-width:100%;height:auto;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.45)}"
].join("");
/** 给 Word 导出的 HTML 注入的观感样式（改的是写进缓存的副本，不动源文档）。 */
const WORD_VIEW_STYLE = "<style id=\"dsh-office-web-view\">"
	+ "html{background:#525659}"
	+ "body{background:#fff;max-width:960px;margin:0 auto;padding:28px 44px;min-height:100vh;box-shadow:0 2px 10px rgba(0,0,0,.45)}"
	+ "img{max-width:100%;height:auto}"
	+ "</style>";
let cscriptPathCache = null;
/** 探测 cscript.exe（只探一次）。 */
function cscriptExe() {
	if (cscriptPathCache !== null) return cscriptPathCache;
	for (const candidate of CSCRIPT_CANDIDATES) {
		if (existsSync(candidate)) {
			cscriptPathCache = candidate;
			return candidate;
		}
	}
	cscriptPathCache = false;
	return null;
}
/** HTML 文本转义（壳里注入的标题/表名）。 */
function escapeHtml(value) {
	return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
/** 把值安全地塞进 <script>（防止 </script> 提前闭合）。 */
function jsonForScript(value) {
	return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
/** 读 JSON 文件，任何异常都当"没有"。 */
async function readJsonFile(path) {
	try {
		const data = JSON.parse(await readFile(path, "utf8"));
		return data !== null && typeof data === "object" ? data : null;
	} catch {
		return null;
	}
}
/** 从 VBS 的 stdout 里取 `KEY=数字` 这类统计行。 */
function readStat(stdout, key) {
	const m = new RegExp("^" + key + "=(\\d+)$", "m").exec(stdout);
	return m === null ? null : Number(m[1]);
}
/** 数目录里匹配的文件个数（COM 没回传统计时兜底）。 */
async function countFiles(dir, pattern) {
	const items = await readdir(dir).catch(() => []);
	return items.filter((name) => pattern.test(name)).length;
}
/** 列出正在运行的 Office 主进程 PID（tasklist，无需管理员权限）。 */
async function listOfficePids() {
	const pids = new Set();
	for (const image of OFFICE_APP_IMAGES) {
		const stdout = await new Promise((resolve) => {
			execFile("tasklist.exe", ["/FI", "IMAGENAME eq " + image, "/FO", "CSV", "/NH"], {
				windowsHide: true,
				timeout: 20000
			}, (error, out) => resolve(error ? "" : String(out)));
		});
		for (const line of stdout.split(/\r?\n/)) {
			const m = /^"[^"]+","(\d+)"/.exec(line.trim());
			if (m !== null) pids.add(Number(m[1]));
		}
	}
	return pids;
}
/**
 * 杀掉"本次转换新起、且命令行含 -Embedding"的 Office 进程。
 * 只传进来本次新出现的 PID，且再按 -Embedding 复查一次 —— 用户手点开的 Word/Excel
 * 命令行里没有这个参数，绝不会被误杀。
 */
const KILL_EMBEDDED_VBS = [
	"Option Explicit",
	"Dim svc, col, p, i, pid, cl",
	"On Error Resume Next",
	"Set svc = GetObject(\"winmgmts:\\\\.\\root\\cimv2\")",
	"For i = 0 To WScript.Arguments.Count - 1",
	"  pid = CLng(WScript.Arguments(i))",
	"  Set col = svc.ExecQuery(\"SELECT ProcessId, CommandLine FROM Win32_Process\")",
	"  For Each p In col",
	"    If p.ProcessId = pid Then",
	"      cl = p.CommandLine",
	"      If Not IsNull(cl) Then",
	"        If InStr(cl, \"-Embedding\") > 0 Then",
	"          p.Terminate()",
	"          WScript.Echo \"killed \" & pid",
	"        End If",
	"      End If",
	"    End If",
	"  Next",
	"Next"
].join("\r\n");
/** 跑一段 VBScript；成功返回 stdout，失败抛异常（带 stdout/stderr，便于定位）。 */
async function runVbsOnce(script, args, timeoutMs) {
	const exe = cscriptExe();
	if (exe === null) throw new Error("cscript.exe not found");
	await mkdir(OFFICE_CACHE_DIR, { recursive: true }).catch(() => {});
	const dir = await mkdtemp(join(OFFICE_CACHE_DIR, ".vbs-"));
	const file = join(dir, "run.vbs");
	try {
		await writeFile(file, script, "utf8");
		return await new Promise((resolve, reject) => {
			execFile(exe, ["//nologo", file, ...args], {
				timeout: timeoutMs,
				windowsHide: true,
				maxBuffer: 8 * 1024 * 1024
			}, (error, stdout, stderr) => {
				if (error) {
					const out = String(stdout ?? "").trim();
					const err = String(stderr ?? "").trim();
					reject(new Error((error instanceof Error ? error.message : String(error))
						+ " | stdout=" + (out.length > 0 ? out : "(空)")
						+ " | stderr=" + (err.length > 0 ? err : "(空)")));
					return;
				}
				resolve(String(stdout));
			});
		});
	} finally {
		await rm(dir, { recursive: true, force: true }).catch(() => {});
	}
}
/**
 * 跑 VBS：前后各取一次 Office 进程快照，结束时清理"本次新起且命令行含 -Embedding"的进程。
 * 成功路径也要清理 —— 实测 PowerPoint 走完 Quit 仍可能留一个后台实例。
 * 只杀快照差集里的新进程，且再按 -Embedding 复查，用户自己开的 Office 绝不会被误杀。
 */
async function runVbs(script, args, timeoutMs) {
	const before = await listOfficePids();
	try {
		return await runVbsOnce(script, args, timeoutMs);
	} catch (error) {
		console.warn("[dsh-host-files] office com failed:", error instanceof Error ? error.message : String(error));
		return null;
	} finally {
		const after = await listOfficePids();
		const fresh = [...after].filter((pid) => !before.has(pid));
		if (fresh.length > 0) {
			await runVbsOnce(KILL_EMBEDDED_VBS, fresh.map((pid) => String(pid)), 30000).catch(() => {});
		}
	}
}
// 四段导出脚本（纯 ASCII；源路径/输出目录都走命令行参数，避免 VBS 编码坑）
const WORD_VBS = [
	"Option Explicit",
	"Dim src, outDir, base, fso, w, d",
	"src = WScript.Arguments(0)",
	"outDir = WScript.Arguments(1)",
	"base = WScript.Arguments(2)",
	"On Error Resume Next",
	"Set fso = CreateObject(\"Scripting.FileSystemObject\")",
	"If Not fso.FolderExists(outDir) Then fso.CreateFolder(outDir)",
	"Set w = CreateObject(\"Word.Application\")",
	"If Err.Number <> 0 Then",
	"  WScript.Echo \"ERR=create \" & Err.Number",
	"  WScript.Quit 1",
	"End If",
	"w.Visible = False",
	"w.DisplayAlerts = 0",
	"w.AutomationSecurity = 3",
	"Set d = w.Documents.Open(src, False, True)",
	"If Err.Number <> 0 Then",
	"  WScript.Echo \"ERR=open \" & Err.Number & \" \" & Err.Description",
	"  w.Quit",
	"  WScript.Quit 2",
	"End If",
	"' 文档级 Web 选项：HTML 导出用 UTF-8（实测 Application.Options.Encoding 在本机是 438，不可用）",
	"d.WebOptions.Encoding = 65001",
	"WScript.Echo \"ENC=\" & d.WebOptions.Encoding",
	"d.SaveAs2 outDir & \"\\\" & base & \".html\", 10",
	"If Err.Number <> 0 Then",
	"  WScript.Echo \"ERR=save \" & Err.Number & \" \" & Err.Description",
	"  d.Close 0",
	"  w.Quit",
	"  WScript.Quit 3",
	"End If",
	"d.Close 0",
	"w.Quit",
	"WScript.Echo \"MODE=web\""
].join("\r\n");
const EXCEL_VBS = [
	"Option Explicit",
	"Dim src, outDir, base, fso, x, wb, oldEnc",
	"src = WScript.Arguments(0) : outDir = WScript.Arguments(1) : base = WScript.Arguments(2)",
	"On Error Resume Next",
	"Set fso = CreateObject(\"Scripting.FileSystemObject\")",
	"If Not fso.FolderExists(outDir) Then fso.CreateFolder(outDir)",
	"Set x = CreateObject(\"Excel.Application\")",
	"If Err.Number <> 0 Then",
	"  WScript.Echo \"ERR=create\"",
	"  WScript.Quit 1",
	"End If",
	"x.Visible = False",
	"x.DisplayAlerts = False",
	"x.AutomationSecurity = 3",
	"oldEnc = x.DefaultWebOptions.Encoding",
	"x.DefaultWebOptions.Encoding = 65001",
	"Set wb = x.Workbooks.Open(src, 0, True)",
	"If Err.Number <> 0 Then",
	"  WScript.Echo \"ERR=open\"",
	"  x.DefaultWebOptions.Encoding = oldEnc",
	"  x.Quit",
	"  WScript.Quit 2",
	"End If",
	"WScript.Echo \"SHEETS=\" & wb.Worksheets.Count",
	"wb.SaveAs outDir & \"\\\" & base & \".html\", 44",
	"If Err.Number <> 0 Then",
	"  WScript.Echo \"ERR=save \" & Err.Number",
	"  wb.Close False",
	"  x.DefaultWebOptions.Encoding = oldEnc",
	"  x.Quit",
	"  WScript.Quit 3",
	"End If",
	"wb.Close False",
	"x.DefaultWebOptions.Encoding = oldEnc",
	"x.Quit",
	"WScript.Echo \"MODE=web\""
].join("\r\n");
const PPT_VBS = [
	"Option Explicit",
	"Dim src, outDir, pdfPath, maxSlides, pw, ph, fso, p, pres, n, i",
	"src = WScript.Arguments(0) : outDir = WScript.Arguments(1) : pdfPath = WScript.Arguments(2)",
	"maxSlides = CLng(WScript.Arguments(3)) : pw = CLng(WScript.Arguments(4)) : ph = CLng(WScript.Arguments(5))",
	"On Error Resume Next",
	"Set fso = CreateObject(\"Scripting.FileSystemObject\")",
	"If Not fso.FolderExists(outDir) Then fso.CreateFolder(outDir)",
	"Set p = CreateObject(\"PowerPoint.Application\")",
	"If Err.Number <> 0 Then",
	"  WScript.Echo \"ERR=create\"",
	"  WScript.Quit 1",
	"End If",
	"Set pres = p.Presentations.Open(src, True, False, False)",
	"If Err.Number <> 0 Then",
	"  WScript.Echo \"ERR=open\"",
	"  p.Quit",
	"  WScript.Quit 2",
	"End If",
	"n = pres.Slides.Count",
	"WScript.Echo \"SLIDES=\" & n",
	"If n > maxSlides Then",
	"  pres.SaveAs pdfPath, 32",
	"  If Err.Number <> 0 Then",
	"    WScript.Echo \"ERR=save \" & Err.Number",
	"    pres.Close",
	"    p.Quit",
	"    WScript.Quit 3",
	"  End If",
	"  pres.Close",
	"  p.Quit",
	"  WScript.Echo \"MODE=pdf\"",
	"  WScript.Quit 0",
	"End If",
	"For i = 1 To n",
	"  pres.Slides(i).Export outDir & \"\\slide\" & Right(\"00\" & i, 3) & \".png\", \"PNG\", pw, ph",
	"Next",
	"If Err.Number <> 0 Then",
	"  WScript.Echo \"ERR=export \" & Err.Number",
	"  pres.Close",
	"  p.Quit",
	"  WScript.Quit 4",
	"End If",
	"pres.Close",
	"p.Quit",
	"WScript.Echo \"MODE=web\""
].join("\r\n");
const VISIO_VBS = [
	"Option Explicit",
	"Dim src, outDir, fso, v, d, n, i",
	"src = WScript.Arguments(0) : outDir = WScript.Arguments(1)",
	"On Error Resume Next",
	"Set fso = CreateObject(\"Scripting.FileSystemObject\")",
	"If Not fso.FolderExists(outDir) Then fso.CreateFolder(outDir)",
	"Set v = CreateObject(\"Visio.Application\")",
	"If Err.Number <> 0 Then",
	"  WScript.Echo \"ERR=create\"",
	"  WScript.Quit 1",
	"End If",
	"v.Visible = False",
	"Set d = v.Documents.Open(src)",
	"If Err.Number <> 0 Then",
	"  Err.Clear",
	"  Set d = v.Documents.OpenEx(src, 2)",
	"End If",
	"If Err.Number <> 0 Then",
	"  WScript.Echo \"ERR=open\"",
	"  v.Quit",
	"  WScript.Quit 2",
	"End If",
	"n = d.Pages.Count",
	"For i = 1 To n",
	"  d.Pages(i).Export outDir & \"\\page\" & Right(\"00\" & i, 3) & \".svg\"",
	"Next",
	"If Err.Number <> 0 Then",
	"  WScript.Echo \"ERR=export \" & Err.Number",
	"  d.Close",
	"  v.Quit",
	"  WScript.Quit 3",
	"End If",
	"WScript.Echo \"PAGES=\" & n",
	"d.Close",
	"v.Quit",
	"WScript.Echo \"MODE=web\""
].join("\r\n");
/** 相册壳（PPT 每页 PNG / Visio 每页 SVG）：深灰底 + 白卡，一屏连续滚动。 */
function galleryShell(title, pages, ext, note) {
	const items = [];
	for (let i = 1; i <= pages; i += 1) {
		const name = (ext === "svg" ? "page" : "slide") + String(i).padStart(3, "0") + "." + ext;
		items.push("<img class=\"vk-page\" src=\"" + name + "\" loading=\"lazy\" alt=\"" + escapeHtml(title) + " P" + i + "\">");
	}
	return "<!DOCTYPE html>\n<html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><title>" + escapeHtml(title)
		+ "</title><style>" + VIEW_SHELL_CSS + "</style></head><body>\n"
		+ "<div class=\"vk-bar\"><b>网页视图</b><span>" + escapeHtml(title) + "</span><span>共 " + pages + " 页</span><span>"
		+ escapeHtml(note) + "</span></div>\n" + items.join("\n") + "\n</body></html>";
}
/** 从 Excel 导出的 frameset HTML 里读工作表名（c_rgszSh[i]="名字"）。 */
function parseSheetNames(html) {
	const names = [];
	const re = /c_rgszSh\[(\d+)\]\s*=\s*"([^"]*)"/g;
	let m = re.exec(html);
	while (m !== null) {
		const decoded = m[2].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'");
		names[Number(m[1])] = decoded;
		m = re.exec(html);
	}
	return names.filter((n) => typeof n === "string" && n.length > 0);
}
/**
 * 工作簿壳：自建顶部工作表标签条 + 内容 iframe。
 * 不用 Excel 自己生成的 frameset 当视图页 —— 实测它的观感差（内容挤在左上、标签在最底部）。
 */
function workbookShell(title, assetsDir, sheets) {
	const files = sheets.map((_, i) => assetsDir + "/sheet" + String(i + 1).padStart(3, "0") + ".html");
	const payload = jsonForScript({ names: sheets, files });
	return "<!DOCTYPE html>\n<html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><title>" + escapeHtml(title) + "</title><style>"
		+ VIEW_SHELL_CSS
		+ "html,body{height:100%}"
		+ ".vk-bar{gap:4px;padding:0 8px;height:34px;background:#3b3e42}"
		+ ".vk-bar button{font:12px system-ui,'Microsoft YaHei',sans-serif;margin:4px 0 0;padding:3px 12px;border:1px solid #5b5f63;"
		+ "border-bottom:none;border-radius:4px 4px 0 0;background:#4a4e52;color:#ccc;cursor:pointer;white-space:nowrap}"
		+ ".vk-bar button[data-on=\"1\"]{background:#fff;color:#0a7d4d;border-color:#fff;font-weight:600}"
		+ "iframe{display:block;width:100%;height:calc(100% - 34px);border:0;background:#fff}"
		+ "</style></head><body>\n"
		+ "<div class=\"vk-bar\" id=\"vkBar\"></div>\n<iframe id=\"vkFrame\" title=\"" + escapeHtml(title) + "\"></iframe>\n"
		+ "<script>\nvar VK=" + payload + ";\n"
		+ "(function(){var bar=document.getElementById('vkBar'),fr=document.getElementById('vkFrame'),btns=[];\n"
		+ "function show(i){fr.src=VK.files[i];for(var k=0;k<btns.length;k+=1)btns[k].setAttribute('data-on',k===i?'1':'0');}\n"
		+ "for(var i=0;i<VK.names.length;i+=1){(function(i){var b=document.createElement('button');b.textContent=VK.names[i];\n"
		+ "b.onclick=function(){show(i);};bar.appendChild(b);btns.push(b);})(i);}\n"
		+ "if(VK.files.length>0)show(0);})();\n</script>\n</body></html>";
}
/** 给 Word 导出的 HTML 注入统一观感样式（就地改写缓存副本）。 */
function injectViewStyle(html) {
	if (html.includes("dsh-office-web-view")) return html;
	const head = /<head[^>]*>/i.exec(html);
	if (head !== null) return html.slice(0, head.index + head[0].length) + WORD_VIEW_STYLE + html.slice(head.index + head[0].length);
	const root = /<html[^>]*>/i.exec(html);
	if (root !== null) return html.slice(0, root.index + root[0].length) + WORD_VIEW_STYLE + html.slice(root.index + root[0].length);
	return WORD_VIEW_STYLE + html;
}
/** Word：COM 导 Filtered HTML（UTF-8）。公式会被 Word 自己渲染成 PNG 贴进 HTML，实测 100 张。 */
async function buildWordView(target, dir) {
	const stdout = await runVbs(WORD_VBS, [target, dir, "doc"], OFFICE_COM_TIMEOUT_MS);
	if (stdout === null || !stdout.includes("MODE=web")) return null;
	const html = join(dir, "doc.html");
	if (!existsSync(html)) return null;
	await writeFile(html, injectViewStyle(await readFile(html, "utf8")), "utf8");
	// 注意：Word 的 ComputeStatistics(2) 在无窗口实例里常返回 1（不重新分页），不作为页数依据
	return { mode: "web", kind: "word", entry: html, pages: null, note: "版式由 Word 自己转换（文字可选中；分页以 Word 的分页符为准）" };
}
/** Excel：COM 导 HTML frameset（UTF-8、多 sheet），再套自建标签条壳。实测导出 0.05s。 */
async function buildExcelView(target, dir) {
	const stdout = await runVbs(EXCEL_VBS, [target, dir, "book"], OFFICE_COM_TIMEOUT_MS);
	if (stdout === null || !stdout.includes("MODE=web")) return null;
	const main = join(dir, "book.html");
	if (!existsSync(main)) return null;
	const sheets = parseSheetNames(await readFile(main, "utf8"));
	if (sheets.length === 0) {
		// 解析不到表名：退回 Excel 自己的 frameset（观感一般但能用），不再套壳
		return { mode: "web", kind: "excel", entry: main, sheets: [], note: "未解析到工作表名，已回退 Excel 原生 frameset" };
	}
	const entry = join(dir, "index.html");
	await writeFile(entry, workbookShell(pathStem(target), "book.files", sheets), "utf8");
	return { mode: "web", kind: "excel", entry, sheets, pages: sheets.length, note: "工作表：" + sheets.join(" / ") };
}
/** PPT：≤ 阈值 → 每页 PNG 相册（版式 = PowerPoint 自己）；超过 → PowerPoint 直接导 PDF。 */
async function buildPptView(target, dir, pdfPath) {
	const stdout = await runVbs(PPT_VBS, [target, dir, pdfPath, String(PPT_RASTER_MAX_SLIDES), String(PPT_RASTER_WIDTH), String(PPT_RASTER_HEIGHT)], OFFICE_COM_TIMEOUT_MS);
	if (stdout === null) return null;
	const slides = readStat(stdout, "SLIDES");
	if (stdout.includes("MODE=pdf")) {
		if (!existsSync(pdfPath)) return null;
		return { mode: "pdf", kind: "ppt", entry: pdfPath, slides, note: "本片 " + (slides ?? "?") + " 页，超过 " + PPT_RASTER_MAX_SLIDES + " 页，已由 PowerPoint 直接导出 PDF" };
	}
	if (!stdout.includes("MODE=web")) return null;
	const pages = slides !== null && slides > 0 ? slides : await countFiles(dir, /^slide\d{3}\.png$/);
	if (pages < 1) return null;
	const entry = join(dir, "index.html");
	await writeFile(entry, galleryShell(pathStem(target), pages, "png", "版式由 PowerPoint 自己渲染（" + PPT_RASTER_WIDTH + "×" + PPT_RASTER_HEIGHT + "）"), "utf8");
	return { mode: "web", kind: "ppt", entry, pages, slides: pages, note: "共 " + pages + " 页" };
}
/** Visio：每页导出 SVG（矢量）。实测 Visio 的 ExportAsFixedFormat 不可用（err 450），PDF 仍归 LibreOffice。 */
async function buildVisioView(target, dir) {
	const stdout = await runVbs(VISIO_VBS, [target, dir], OFFICE_COM_TIMEOUT_MS);
	if (stdout === null || !stdout.includes("MODE=web")) return null;
	const pages = readStat(stdout, "PAGES") ?? await countFiles(dir, /^page\d{3}\.svg$/);
	if (pages < 1) return null;
	const entry = join(dir, "index.html");
	await writeFile(entry, galleryShell(pathStem(target), pages, "svg", "矢量 SVG（Ctrl+滚轮缩放不糊）"), "utf8");
	return { mode: "web", kind: "visio", entry, pages, note: "共 " + pages + " 页" };
}
/** 在临时目录里造好视图，再整体改名就位（避免 /fs/ 读到半成品）。 */
async function buildOfficeWebView(kind, target, dir, pdfPath) {
	await mkdir(OFFICE_CACHE_DIR, { recursive: true }).catch(() => {});
	const work = dir + ".work";
	await rm(work, { recursive: true, force: true }).catch(() => {});
	await mkdir(work, { recursive: true });
	let view = null;
	if (kind === "word") view = await buildWordView(target, work);
	else if (kind === "excel") view = await buildExcelView(target, work);
	else if (kind === "ppt") view = await buildPptView(target, work, pdfPath);
	else view = await buildVisioView(target, work);
	if (view === null) {
		await rm(work, { recursive: true, force: true }).catch(() => {});
		return null;
	}
	// PPT 超页走 PDF 时，产物在最终缓存路径上（不在 work 里），不需要改名就位
	if (view.mode === "web") {
		await rm(dir, { recursive: true, force: true }).catch(() => {});
		await rename(work, dir);
		view = { ...view, entry: view.entry.replace(work, dir) };
		const marker = join(dir, ".view.json");
		await writeFile(marker, JSON.stringify({ ...view, at: Date.now() }), "utf8").catch(() => {});
	} else {
		await rm(work, { recursive: true, force: true }).catch(() => {});
	}
	return view;
}
/** 网页视图的缓存路径（hash 算法与 PDF 缓存完全一致：路径+mtime+size）。 */
function officeWebViewPaths(target, info) {
	const hash = createHash("sha1").update(target).update("\u0000").update(String(info.mtimeMs)).update("\u0000").update(String(info.size)).digest("hex");
	return {
		hash,
		dir: join(OFFICE_CACHE_DIR, hash + "-web"),
		pdfPath: join(OFFICE_CACHE_DIR, hash + ".pdf")
	};
}
/**
 * 确保「网页视图」缓存存在，返回 { mode, kind, entry, ... }；不适用/失败返回 null。
 * 缓存键与 PDF 一致（路径+mtime+size），文件一变自动重建；失败记冷却时间，避免反复吃超时。
 */
async function officeWebViewFor(target, info) {
	const kind = OFFICE_WEB_KIND_BY_EXT[extname(target).slice(1).toLowerCase()];
	if (kind === void 0) return null;
	if (cscriptExe() === null) return null;
	const { dir, pdfPath } = officeWebViewPaths(target, info);
	const marker = join(dir, ".view.json");
	const cached = await readJsonFile(marker);
	if (cached !== null) {
		if (typeof cached.entry === "string" && cached.entry.length > 0 && existsSync(cached.entry)) return cached;
		if (cached.failed === true && typeof cached.at === "number" && Date.now() - cached.at < OFFICE_COM_FAIL_COOLDOWN_MS) return null;
	}
	const run = officeChain.then(() => buildOfficeWebView(kind, target, dir, pdfPath));
	officeChain = run.then(() => void 0, () => void 0);
	try {
		const view = await run;
		if (view === null) {
			await mkdir(dir, { recursive: true }).catch(() => {});
			await writeFile(marker, JSON.stringify({ failed: true, at: Date.now() }), "utf8").catch(() => {});
		}
		return view;
	} catch (error) {
		console.warn("[dsh-host-files] office web view failed:", error instanceof Error ? error.message : String(error));
		return null;
	}
}

/** 插件名（loader 条目用）。 */
const name = "dsh-host-files";
/** 依赖服务。 */
const inject = ["webServer", "tools"];
/** 单文件读取上限（超出则截断并标记）。 */
const MAX_READ_BYTES = 2 * 1024 * 1024;
/** 单文件写入上限。 */
const MAX_WRITE_BYTES = 10 * 1024 * 1024;
/** 服务端高亮处理上限。 */
const MAX_HIGHLIGHT_BYTES = 1024 * 1024;
/** 搜索递归深度/条目/结果上限。 */
const SEARCH_DEPTH_LIMIT = 8;
const SEARCH_ENTRY_LIMIT = 20000;
const SEARCH_RESULT_LIMIT = 200;
/** 默认折叠的目录名。 */
const COLLAPSED_DIRS = new Set([".git", "node_modules", "__pycache__", ".venv", "venv", "dist", ".next", ".dsh"]);
/** 全局人设文件（~/.dsh/global-persona.md，注入所有会话的 systemPrompt）。 */
const PERSONA_FILE = join(homedir(), ".dsh", "global-persona.md");
const MAX_PERSONA_BYTES = 128 * 1024;
/** 全局人设的 prompt 段名与排序（紧随官方 persona order 0 之后）。 */
const PERSONA_SECTION = "user:global-persona";
const PERSONA_ORDER = 1;
/** MCP server 运行时管理（~/.dsh/mcp-servers.json，动态挂载 dsh-mcp-client）。 */
const MCP_STATE_FILE = join(homedir(), ".dsh", "mcp-servers.json");
/** 全局 skill 目录（~/.dsh/skills）。 */
const SKILLS_ROOT = join(homedir(), ".dsh", "skills");
/** 会话建议的文件夹根目录（按会话隔离：<sessionId>.txt）。 */
const SUGGESTED_ROOT_DIR = join(homedir(), ".dsh", "suggested-workspace");
/** 待审批修改暂存目录（按会话隔离：<sessionId>.txt，内容为 JSON {"path","old","new"}）。 */
// 审批机制已移除（2026-08-19）：pending-edit 目录不再使用

/** 从工具执行上下文取会话 id（agent.id 即 session id；session.id / 环境变量兜底）。 */
function sessionIdOf(exec) {
	return exec?.agent?.id ?? exec?.agent?.session?.id ?? process.env.DSH_SESSION_ID ?? "unknown";
}
/** 工具输出渲染：值转 JSON 文本。 */
function renderJson(args, value) {
	return [{ type: "text", text: JSON.stringify(value, null, 2) }];
}
/** 工具输出 schema：对象（DSH 要求 type:'object' 显式 additionalProperties，否则插件加载失败）。 */
const OBJ_SCHEMA = { type: "object", additionalProperties: true };

/**
 * 文件树切换工具：模型提供目标文件夹路径 → 校验存在 → 写入会话隔离 txt（UTF-8）。
 * 取代「模型用 pwsh 手写 txt」的旧方式：自动 UTF-8 编码（PS5.1 默认 GBK 会写坏中文路径）、
 * 写入前校验路径真实存在、自带会话 ID 解析与写后确认，显著提高切换成功率。
 */
const switchWorkspaceRootTool = defineTool({
	name: "switch_workspace_root",
	description: "把浏览器左侧文件树切换到指定文件夹（按会话隔离，仅当前窗口生效）。用户提供了文件夹路径、或你按规则创建了 session-NNN-* 会话文件夹后，必须调用本工具完成切换；目标路径必须真实存在。",
	parameters: {
		path: { type: "string", required: true, description: "目标文件夹的绝对路径（必须已存在，目录）" }
	},
	output: { schema: OBJ_SCHEMA, render: renderJson },
	async execute(args, exec) {
		const raw = typeof args?.path === "string" ? args.path.trim() : "";
		if (raw.length === 0) return { ok: false, error: "path 不能为空" };
		const clean = raw.replace(/^["']|["']$/g, "").replace(/[\\/]+$/, "");
		if (clean.length === 0) return { ok: false, error: "path 非法" };
		if (!existsSync(clean)) return { ok: false, error: `路径不存在：${clean}（请先确认文件夹已创建）` };
		const sid = sessionIdOf(exec);
		if (sid === "unknown") {
			return { ok: false, error: "无法确定会话 ID，请改用 pwsh 读取 $env:DSH_SESSION_ID 后手动写入" };
		}
		await mkdir(SUGGESTED_ROOT_DIR, { recursive: true });
		const file = join(SUGGESTED_ROOT_DIR, sid + ".txt");
		await writeFile(file, clean + "\n", "utf8");
		return { ok: true, root: clean, sessionId: sid, file };
	}
});

/** 各会话「投入（对 Agent 可见）」的文件：Map<sessionId, Map<path, true|false>>，true=点亮、false=用户显式关闭。缺省（无记录）=投入。 */
const sessionFiles = new Map();
const SESSION_FILES_FILE = join(homedir(), ".dsh", "session-visible-files.json");
try {
	const parsedFiles = JSON.parse(readFileSync(SESSION_FILES_FILE, "utf8"));
	if (parsedFiles && typeof parsedFiles === "object") {
		for (const [sid, m] of Object.entries(parsedFiles)) {
			if (typeof sid !== "string" || m === null || typeof m !== "object") continue;
			const inner = new Map();
			for (const [p, on] of Object.entries(m)) {
				if (typeof p === "string" && p.length > 0) inner.set(p, on === true);
			}
			if (inner.size > 0) sessionFiles.set(sid, inner);
		}
	}
} catch {}
function saveSessionFiles() {
	try {
		const obj = {};
		for (const [sid, m] of sessionFiles) {
			if (m.size > 0) obj[sid] = Object.fromEntries(m);
		}
		writeFile(SESSION_FILES_FILE, JSON.stringify(obj), "utf8").catch(() => {});
	} catch {}
}
/** 拖入文件的落点目录：优先该会话建议根（会话文件夹）；没有则 ~/.dsh/drop-inbox/<session> 并建议设为该会话根（让左栏可见）。 */
async function dropInboxDirOf(sid) {
	const sugFile = join(SUGGESTED_ROOT_DIR, sid + ".txt");
	try {
		let text = await readFile(sugFile, "utf8");
		if (text.includes("\uFFFD")) {
			try {
				text = new TextDecoder("gbk").decode(await readFile(sugFile));
			} catch {}
		}
		const c = text.trim();
		if (c.length > 0 && existsSync(c)) return { dir: c, setAsRoot: false };
	} catch {}
	const dir = join(homedir(), ".dsh", "drop-inbox", sid);
	await mkdir(dir, { recursive: true });
	return { dir, setAsRoot: true };
}
/** 文件内容快照（首次读取时记录，用于 diff 高亮 Agent 的改动）。 */
const readSnapshots = new Map();

// ──────────────────────────────────────────────────────────────────────────────
// 「当前会话文件」采集（客户端左栏文件栏的新栏目 + @ 列表同位置同步）：
//   ① 贴进本会话对话的绝对路径（user/message 事件里抠出来的，可能是文件也可能是文件夹）；
//   ② Agent 在本会话里写/改过的文件（tool/call 事件里写类工具的参数）；
//   ③ 兜底：会话工作区根目录下、会话开始之后改动过的文件（脚本/命令产出的也能抓到）。
// 数据只来自会话事件流（结构化，不解析 zstd 日志），并按会话落盘，重启后仍在。
// ──────────────────────────────────────────────────────────────────────────────
/** 会话 → Map<路径, { t, kind, src }>；kind: "file" | "dir"；src: "paste" | "tool" | "deliver"。 */
const sessionTouched = new Map();
/** 会话 → 该会话首个事件的时间（毫秒；兜底扫描的 since 基准）。 */
const sessionStart = new Map();
const SESSION_TOUCH_FILE = join(homedir(), ".dsh", "session-touched-files.json");
/** 每个会话最多记多少条（超出丢最旧的）。 */
const SESSION_TOUCH_MAX = 200;
try {
	const parsedTouch = JSON.parse(readFileSync(SESSION_TOUCH_FILE, "utf8"));
	if (parsedTouch && typeof parsedTouch === "object") {
		for (const [sid, rec] of Object.entries(parsedTouch.sessions ?? {})) {
			if (typeof sid !== "string" || rec === null || typeof rec !== "object") continue;
			const inner = new Map();
			for (const [p, v] of Object.entries(rec.files ?? {})) {
				if (typeof p !== "string" || p.length === 0) continue;
				inner.set(p, {
					t: typeof v?.t === "number" ? v.t : 0,
					kind: v?.kind === "dir" ? "dir" : "file",
					src: typeof v?.src === "string" ? v.src : "tool"
				});
			}
			if (inner.size > 0) sessionTouched.set(sid, inner);
			if (typeof rec.start === "number" && rec.start > 0) sessionStart.set(sid, rec.start);
		}
	}
} catch {}
let sessionTouchSaveTimer = null;
function saveSessionTouched() {
	if (sessionTouchSaveTimer !== null) return;
	sessionTouchSaveTimer = setTimeout(() => {
		sessionTouchSaveTimer = null;
		try {
			const sessions = {};
			for (const [sid, m] of sessionTouched) {
				if (m.size === 0) continue;
				const files = {};
				for (const [p, v] of m) files[p] = v;
				sessions[sid] = { files, start: sessionStart.get(sid) ?? 0 };
			}
			writeFile(SESSION_TOUCH_FILE, JSON.stringify({ version: 1, sessions }), "utf8").catch(() => {});
		} catch {}
	}, 1500);
	if (typeof sessionTouchSaveTimer.unref === "function") sessionTouchSaveTimer.unref();
}
/** 写类工具（参数里的路径算「本会话产出」）；读类工具不算，避免把 Agent 看过的文件全灌进来。 */
const WRITE_TOOL_RE = /(write|edit|create|patch|replace|save|export|present|rename|move|copy|mkdir|touch|upload|delete)/i;
/** 文本里的绝对 Windows 路径 / UNC 路径。两套正则：允许空格的（D:\Program Files\…）与不允许空格的
 *  （一句话里连着贴两个路径时，允许空格的那条会把后文一起吞进来，靠这条拆开）。
 *  ⚠️ **分隔符必须同时收 `\` 与 `/`**（2026-09-11 实测踩到）：模型给 write/edit 工具的 `file_path`
 *  常常写成 `D:/DeepSeek_harness/…/x.txt`（正斜杠），而旧正则只认 `[A-Za-z]:\\` → 一条候选都抠不出来，
 *  表现是「tool/call 收到了、`debug.tried` 恒为 0、当前会话文件永远空」。 */
const WIN_PATH_RE = /(?:[A-Za-z]:[\\/]|\\\\)[^\r\n\t"'<>|?*\uFF08\uFF09\u3001\uFF0C\u3002\uFF1B]{1,240}/g;
const WIN_PATH_NOSPACE_RE = /(?:[A-Za-z]:[\\/]|\\\\)[^\s"'<>|?*\uFF08\uFF09\u3001\uFF0C\u3002\uFF1B]{1,240}/g;
/** 尾部常被正文粘上的标点/括号，剥掉再判存在；顺手把正斜杠归一成反斜杠（Windows 下 statSync 两种都认，
 *  统一形态只为让「同一文件」在集合里只出一条、且与文件栏/最近打开里的写法一致）。
 *  ⚠️ 只剥**不会出现在真实文件名末尾**的那几类：成对括号/引号/句点/顿号句号等。
 *  早期实现连 `;`、`,`、`:` 都剥，于是 `<工作区根>\;` 这种被修成 `<工作区根>\`（尾斜杠版），
 *  与别的写法不相等 → 同一目录在列表里出两条（2026-09-12 查 session-touched 数据时发现）。 */
function trimPathTail(p) {
	let s = String(p).trim();
	while (s.length > 0 && /[)\]}>。，、；：！？…」』】"']/.test(s.slice(-1))) s = s.slice(0, -1);
	if (/^[A-Za-z]:[\\/]/.test(s) || s.startsWith("\\\\")) s = s.replace(/\//g, "\\");
	return s;
}
/** 干净路径判据：整段就是一条路径，没有引号/反引号/问号/竖线，也没有全角标点（路径本体允许空格与中文）。
 *  ⚠️ 只用来判「**磁盘上不存在**」的候选（tool/call 执行前那份）。真实存在的路径一律放行——
 *  存在是最强证据，`D:\我的文档\示例项目\Paper\论文撰写指导\论文初稿.md` 这种带空格的中文路径必须留。
 *  旧版用「含分隔符 + 长度 ≤240」当判据，于是路径后面黏着的续写说明（中文注释、英文句子）也被收了进来。 */
const CLEAN_PATH_RE = /^(?:[A-Za-z]:[\\/]|\\\\|\\\\)[^"'`?*<>|，。；：、（）【】《》、！？“”‘’…]*$/;
/**
 * Agent 自己的窝：这些前缀下的路径是「harness 本体 / 技能 / 日志 / 工具」，不是用户的项目
 * （历史数据里躺着大量 `<DSH 安装根>\…` 与 `~\.dsh\…`，都是旧采集期把系统注入段当用户贴入收进来的）。
 * 读取端滤掉，用户以后换装目录也只多出一条噪声，不需要动这个名单以外的任何东西。
 */
const AGENT_SIDE_DIRS = [join(homedir(), ".dsh"), process.env.DSH_ROOT || join(homedir(), "DeepSeek_harness")];
/** 采集过程的自查计数（只读路由带出去，排障用：事件到没到、路径抠没抠出来）。 */
const touchDebug = { events: 0, byType: {}, lastUser: null, lastTool: null, lastErr: null, tried: 0, ok: 0, miss: null, cands: [] };
/**
 * 记一条「本会话碰过的路径」。
 * 两条实测过的坑都在这里兜住：
 *  ① 正文里的路径后面常跟着英文/中文说明，正则会把它们一起吞（"…\x.txt and then reply"）→
 *     按空格**从右往左逐段收缩**，取第一个真实存在的；
 *  ② `tool/call` 事件在**执行前**就落盘，文件此刻可能还没写出来 → 判不存在时**不丢**，
 *     只要看着像路径就记下（真伪留给 /vscode-files/session-files 读取时按 statSync 过滤）。
 */
function noteTouched(sid, rawPath, src) {
	if (typeof sid !== "string" || sid.length === 0) return;
	if (typeof rawPath !== "string" || rawPath.length === 0) return;
	if (touchDebug.cands.length > 20) touchDebug.cands.shift();
	touchDebug.cands.push(src + ":" + rawPath.slice(0, 120));
	let p = trimPathTail(rawPath);
	if (p.length < 3) return;
	touchDebug.tried += 1;
	// 内部目录不进列表（~/.dsh 下的日志、缓存等）	if (p.toLowerCase().startsWith(join(homedir(), ".dsh").toLowerCase())) { touchDebug.miss = "internal:" + p; return; }
	let st = null;
	for (let i = 0; i < 8; i += 1) {
		try { st = statSync(p); break; } catch { st = null; }
		const cut = p.lastIndexOf(" ");
		if (cut <= 2) break;
		p = p.slice(0, cut);
	}
	if (st === null && !CLEAN_PATH_RE.test(p)) { touchDebug.miss = "junk:" + p; return; }
	// 不存在但形态干净的路径仍然记下（tool/call 在执行前就落盘、文件还没写出来），
	// 但**必须是纯路径**：旧版只看「含分隔符 + 长度」，于是 `<工作区根>\` 这种
	// 后面黏着续写说明（乃至中文注释）的串也被收进来，最近打开里因此出现一堆假条目。
	touchDebug.ok += 1;
	const kind = st !== null && st.isDirectory() ? "dir" : "file";
	let m = sessionTouched.get(sid);
	if (m === void 0) {
		m = new Map();
		sessionTouched.set(sid, m);
	}
	m.set(p, { t: Date.now(), kind, src });
	if (m.size > SESSION_TOUCH_MAX) {
		let oldestKey = null;
		let oldestT = Infinity;
		for (const [k, v] of m) {
			if (v.t < oldestT) { oldestT = v.t; oldestKey = k; }
		}
		if (oldestKey !== null) m.delete(oldestKey);
	}
	saveSessionTouched();
}
/** 从任意字符串里抠出所有存在的绝对路径。 */
function notePathsInText(sid, text, src) {
	if (typeof text !== "string" || text.length === 0) return;
	const hits = text.match(WIN_PATH_RE);
	if (hits !== null) for (const h of hits) noteTouched(sid, trimPathTail(h), src);
	const tight = text.match(WIN_PATH_NOSPACE_RE);
	if (tight !== null) for (const h of tight) noteTouched(sid, trimPathTail(h), src);
}
/** 递归扫一个对象里的字符串值，抠路径（工具参数是 JSON 字符串，先 parse 再扫，避免正文里的路径混进来）。 */
function notePathsInValue(sid, value, src, depth = 0) {
	if (depth > 4 || value === null || value === void 0) return;
	if (typeof value === "string") {
		// arguments 里路径是 "D:\\a\\b" 这种转义形态：直接 match 会带上双反斜杠，先规整
		notePathsInText(sid, value.replace(/\\\\/g, "\\"), src);
		return;
	}
	if (Array.isArray(value)) {
		for (const v of value) notePathsInValue(sid, v, src, depth + 1);
		return;
	}
	if (typeof value === "object") {
		for (const v of Object.values(value)) notePathsInValue(sid, v, src, depth + 1);
	}
}
/**
 * 系统注入内容里反复出现的路径（不是用户贴的）。
 *
 * ⚠️ 为什么必须滤掉（2026-09-12 实测到的真因）：`user/message` 事件的 data 里**同时装着**
 * 用户手打的正文与运行时注入的 system section（全局人设、AGENTS.md 指令、技能目录、runtime
 * context、会话工作区说明…）。它们每一段都写满了绝对路径，于是旧实现（对整个 event.data 直接
 * 抠路径）把 `<工作区根>\`、`<DSH 安装根>\`、`<工具目录>` 之类的
 * 「环境说明里的路径」统统记成了 src="paste" → 文件栏「当前会话文件 / 最近打开」被灌满，
 * 用户看到的症状正是「Agent 改文件 / 系统提示，全跑到我的最近打开里」。
 */
// 这些 marker 一出现就整段丢弃（宁可少记，也不能把环境说明当用户贴的路径）。
const INJECTED_PATH_MARKERS = [
	"[system-reminder]",
	"Instructions from:",
	"AGENTS.md",
	"base directory for this skill",
	"Default Settings & Scenario Handbook",
	"技能档：",
	"This snapshot supersedes earlier runtime-context snapshots",
	"Current runtime context",
	"MNEMON RUNTIME MEMORY PROTOCOL",
	"你是我专属的 AI 助手",
	"文件树切换（按会话隔离",
	"User profile (用户画像)",
	"Workspace (session folders live here)",
	"DSH install (agent's own folder)",
	"Tool/software folders on D:",
	"Standing user rules (always apply)"
];
/** 用户正文的字段名候选（打头的都是官方 user/message 里出现过的形态）。 */
const USER_TEXT_KEYS = ["text", "content", "message", "prompt", "body", "value", "input"];
/** 该字符串是否属于「系统/技能/人设注入」那一类（含 markers 之一即判注入）。 */
function looksInjected(text) {
	for (const m of INJECTED_PATH_MARKERS) if (text.includes(m)) return true;
	return false;
}
/** 记一批「确实是用户打的」字符串（已滤掉注入内容）。 */
function noteUserTexts(sid, texts) {
	for (const t of texts) {
		if (typeof t !== "string" || t.length === 0) continue;
		if (looksInjected(t)) continue;
		notePathsInText(sid, t, "paste");
	}
}
/**
 * 从 `user/message` 事件里取出**只属于用户输入**的文本。
 * 结构随官方实现而变，所以按「已知的用户正文字段优先」的次序取；任一段落命中注入 markers 就整段丢掉。
 */
function userTypedTexts(data, depth = 0) {
	const out = [];
	if (depth > 3 || data === null || data === void 0) return out;
	if (typeof data === "string") {
		if (!looksInjected(data)) out.push(data);
		return out;
	}
	if (Array.isArray(data)) {
		for (const v of data) out.push(...userTypedTexts(v, depth + 1));
		return out;
	}
	if (typeof data !== "object") return out;
	for (const key of USER_TEXT_KEYS) {
		if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
		const v = data[key];
		if (typeof v === "string") { if (!looksInjected(v)) out.push(v); continue; }
		if (Array.isArray(v)) {
			for (const item of v) {
				if (typeof item === "string") { if (!looksInjected(item)) out.push(item); continue; }
				if (item !== null && typeof item === "object" && typeof item.text === "string" && !looksInjected(item.text)) out.push(item.text);
			}
		}
	}
	if (out.length > 0) return out;
	// 兜底：官方事件的字段名可能换（正文塞在 parts[0].text / blocks[…].text 之类的嵌套里）。
	// 把本层所有「看着像路径」的字符串拼起来交给路径正则 —— 这样既不漏用户贴的路径，
	// 又不会把一整段对话正文当路径收进来（正则只认绝对路径片段，说明文字自然被切掉）。
	let blob = "";
	for (const v of Object.values(data)) {
		if (typeof v !== "string" || v.length === 0 || v.length > 20000) continue;
		if (looksInjected(v)) continue;
		if (!/[:\\/]/.test(v)) continue;
		blob += (blob.length > 0 ? " " : "") + v;
	}
	return blob.length > 0 ? [blob] : out;
}
/** 会话事件 → 采集（apply 里挂一次）。 */
function watchSessionEvents(ctx) {
	try {
		ctx.on("session/event", (session, event) => {
			try {
				const sid = session?.id;
				if (typeof sid !== "string" || sid.length === 0) return;
				touchDebug.events += 1;
				const t = String(event?.type ?? "?");
				touchDebug.byType[t] = (touchDebug.byType[t] ?? 0) + 1;
				if (typeof event?.time === "number" && event.time > 0) {
					const prev = sessionStart.get(sid);
					if (prev === void 0 || event.time < prev) { sessionStart.set(sid, event.time); saveSessionTouched(); }
				}
				const type = event?.type;
				if (type === "user/message") {
					touchDebug.lastUser = JSON.stringify(event.data).slice(0, 300);
					// ⚠️ 只取**用户正文**（userTypedTexts）：event.data 里还挂着运行时注入的
					// system section（人设/AGENTS.md/技能目录/runtime context），它们满是绝对路径，
					// 旧实现整份扫下来 → 环境说明里的路径全变成「用户贴入」（见 INJECTED_PATH_MARKERS 的注释）。
					noteUserTexts(sid, userTypedTexts(event.data));
					return;
				}
				if (type === "tool/call") {
					const toolName = String(event.data?.name ?? "");
					const raw = event.data?.arguments;
					touchDebug.lastTool = toolName + " :: " + String(raw ?? "").slice(0, 200);
					if (!WRITE_TOOL_RE.test(toolName)) return;
					if (typeof raw !== "string" || raw.length === 0) return;
					let args = null;
					try { args = JSON.parse(raw); } catch { args = null; }
					if (args === null || typeof args !== "object") { notePathsInText(sid, raw, "tool"); return; }
					notePathsInValue(sid, args, "tool");
					return;
				}
				if (type === "deliverables/presented") {
					notePathsInValue(sid, event.data, "deliver");
				}
			} catch (e) {
				touchDebug.lastErr = String(e && e.message ? e.message : e);
			}
		});
	} catch { /* 无事件面时静默跳过 */ }
}
/** 会话工作区根（只读，不创建目录）。 */
async function sessionRootOf(sid) {
	try {
		const text = await readFile(join(SUGGESTED_ROOT_DIR, sid + ".txt"), "utf8");
		const c = text.trim();
		if (c.length > 0 && existsSync(c)) return c;
	} catch {}
	return null;
}
/** 兜底扫描：会话根下 since 之后改动过的文件（深度/条数有上限）。 */
function scanRecentUnder(root, sinceMs, limit) {
	const found = [];
	let visited = 0;
	const walk = (dir, depth) => {
		if (depth > 4 || visited > 4000 || found.length >= limit * 3) return;
		let entries = [];
		try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
		for (const e of entries) {
			visited += 1;
			if (visited > 4000) return;
			if (e.name.startsWith(".") || COLLAPSED_DIRS.has(e.name)) continue;
			const p = join(dir, e.name);
			if (e.isDirectory()) { walk(p, depth + 1); continue; }
			if (!e.isFile()) continue;
			try {
				const st = statSync(p);
				if (st.mtimeMs >= sinceMs) found.push({ path: p, name: e.name, mtimeMs: st.mtimeMs, size: st.size });
			} catch {}
		}
	};
	walk(root, 0);
	found.sort((a, b) => b.mtimeMs - a.mtimeMs);
	return found.slice(0, limit);
}
/** 每个会话的结果缓存（key = sid，值 = { at, body }）——客户端 3 秒一轮询，不必每次全量扫。 */
const sessionFilesCache = new Map();
const SESSION_FILES_TTL = 2500;

function sendJson(res, code, value) {
	const body = JSON.stringify(value);
	res.writeHead(code, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(body);
}

/**
 * 命令行面板的来源校验：只放本机（或本机反代）来源。
 * 判据：① Origin 必须是 loopback（http://127.0.0.1 / localhost / ::1）；
 *      ② Sec-Fetch-Site 只能是 same-origin / none（浏览器跨站请求会给 cross-site → 拒）；
 *      ③ Host 必须是 loopback（3081 WiFi 反代会把 Host 改写成 127.0.0.1:3080，手机端同样通过）。
 * @param {import("node:http").IncomingMessage} req
 */
function vkExecOriginAllowed(req) {
	const origin = req.headers.origin;
	if (typeof origin === "string" && origin.length > 0 && origin !== "null") {
		try {
			const host = new URL(origin).hostname;
			if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") return false;
		} catch {
			return false;
		}
	}
	const site = req.headers["sec-fetch-site"];
	if (typeof site === "string" && site.length > 0 && site !== "same-origin" && site !== "none") return false;
	const host = req.headers.host;
	if (typeof host === "string" && host.length > 0) {
		const name = host.replace(/^\[/, "").split("]")[0].split(":")[0].toLowerCase();
		if (name !== "127.0.0.1" && name !== "localhost" && name !== "::1") return false;
	}
	return true;
}

function isHiddenName(name) {
	return name.startsWith(".") || COLLAPSED_DIRS.has(name);
}

/** 判断内容是否像二进制（NUL 字节比例过高）。 */
function looksBinary(text) {
	const n = text.length;
	if (n === 0) return false;
	let nul = 0;
	for (let i = 0; i < Math.min(n, 8192); i++) if (text.charCodeAt(i) === 0) nul++;
	return nul / Math.min(n, 8192) > 0.01;
}

/** 行级 diff：返回 b 中相对 a 变化的 1-based 行号（公共前缀/后缀裁剪，够用即可）。 */
function changedLineNumbers(a, b) {
	const A = a.split("\n");
	const B = b.split("\n");
	let p = 0;
	while (p < A.length && p < B.length && A[p] === B[p]) p++;
	let s = 0;
	while (s < A.length - p && s < B.length - p && A[A.length - 1 - s] === B[B.length - 1 - s]) s++;
	const out = [];
	const end = B.length - s;
	for (let i = p + 1; i <= end; i++) out.push(i);
	return out;
}

/** 读取 JSON 请求体（带大小上限）。 */
function readJsonBody(req, cap) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > cap) {
				reject(new Error("request body too large"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
			} catch {
				reject(new Error("invalid JSON body"));
			}
		});
		req.on("error", reject);
	});
}

/** 跑 git status --porcelain，返回 相对路径 → 状态码 映射。 */
function gitStatusOf(root) {
	return new Promise((resolve) => {
		execFile("git", ["-C", root, "status", "--porcelain=v1", "--untracked-files=normal"], {
			timeout: 8000,
			maxBuffer: 8 * 1024 * 1024,
			windowsHide: true
		}, (error, stdout) => {
			if (error) {
				resolve({ ok: false, notRepo: true, error: "not a git repository" });
				return;
			}
			const statuses = {};
			for (const line of stdout.split(/\r?\n/)) {
				if (line.length < 4) continue;
				const code = line.slice(0, 2).trim();
				let path = line.slice(3).trim();
				if (code === "R") {
					const arrow = path.indexOf(" -> ");
					if (arrow !== -1) path = path.slice(arrow + 4).trim();
				}
				if (path.length === 0) continue;
				if (!(path in statuses)) statuses[path] = code === "R" ? "R" : code;
			}
			resolve({ ok: true, statuses });
		});
	});
}

/** 递归搜索文件名（跳过隐藏目录，带深度/条目/结果上限）。kind="dirs" 时只匹配目录名（目录也计入结果并继续下潜），供目录浏览器模糊搜文件夹。 */
async function searchDir(root, q, kind) {
	const needle = q.toLowerCase();
	const dirsOnly = kind === "dirs";
	const out = [];
	const budget = { used: 0 };
	async function walk(dir, depth) {
		if (depth > SEARCH_DEPTH_LIMIT || budget.used >= SEARCH_ENTRY_LIMIT || out.length >= SEARCH_RESULT_LIMIT) return;
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (out.length >= SEARCH_RESULT_LIMIT || budget.used >= SEARCH_ENTRY_LIMIT) return;
			if (isHiddenName(entry.name)) continue;
			budget.used += 1;
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (dirsOnly && entry.name.toLowerCase().includes(needle)) {
					out.push({ name: entry.name, path: full, rel: full.slice(root.length + 1).replace(/\\/g, "/") });
				}
				await walk(full, depth + 1);
			} else if (!dirsOnly && entry.name.toLowerCase().includes(needle)) {
				out.push({ name: entry.name, path: full, rel: full.slice(root.length + 1).replace(/\\/g, "/") });
			}
		}
	}
	await walk(root, 0);
	return out;
}

/** 送回收站删除（可恢复；目录递归）。 */
function recycleBinDelete(target, isDir) {
	return new Promise((resolve, reject) => {
		const script = isDir
			? 'Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($env:DSH_DELETE_PATH, "OnlyErrorDialogs", "SendToRecycleBin")'
			: 'Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($env:DSH_DELETE_PATH, "OnlyErrorDialogs", "SendToRecycleBin")';
		execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
			env: { ...process.env, DSH_DELETE_PATH: target },
			timeout: 60000,
			windowsHide: true
		}, (error) => {
			if (error) reject(new Error(`recycle-bin delete failed: ${error.message}`));
			else resolve();
		});
	});
}

/** 用系统默认关联应用打开文件（中栏预览的「外部打开」备选）。 */
function openWithDefaultApp(target) {
	return new Promise((resolve, reject) => {
		const script = `Start-Process -FilePath $env:DSH_OPEN_PATH`;
		execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
			env: { ...process.env, DSH_OPEN_PATH: target },
			timeout: 30000,
			windowsHide: true
		}, (error) => {
			if (error) reject(new Error(`open-native failed: ${error.message}`));
			else resolve();
		});
	});
}

/** 名称合法性：单段、非空、不含路径分隔符。 */
function validSegment(s) {
	return typeof s === "string" && s.length > 0 && s.length <= 120 && !/[\\/]/.test(s) && s !== "." && s !== "..";
}

// ── 服务端 shiki 高亮（通用解析：先按插件自身依赖链，退回全局 dsh 安装）──
let shikiPromise = null;
function resolveShikiEntry() {
	try {
		return createRequire(import.meta.url).resolve("shiki");
	} catch {}
	// 退回：全局 npm 安装（Windows 默认 %APPDATA%\npm\node_modules）
	const globalRoot = process.env.APPDATA ? join(process.env.APPDATA, "npm", "node_modules") : null;
	if (globalRoot) {
		const dshBin = join(globalRoot, "@deepseek-ai", "dsh", "lib", "bin.js");
		if (existsSync(dshBin)) {
			try {
				return createRequire(dshBin).resolve("shiki");
			} catch {}
		}
	}
	throw new Error("无法定位 shiki：请确认全局安装了 @deepseek-ai/dsh");
}
function loadShiki() {
	if (shikiPromise === null) {
		shikiPromise = (async () => {
			const entry = resolveShikiEntry();
			return import(pathToFileURL(entry).href);
		})();
	}
	return shikiPromise;
}
/** 从全局 dsh 安装解析任意包入口（同 shiki 的通用回退，兼容 ESM）。 */
function resolveDshModule(name) {
	try {
		return createRequire(import.meta.url).resolve(name);
	} catch {}
	const globalRoot = process.env.APPDATA ? join(process.env.APPDATA, "npm", "node_modules") : null;
	if (globalRoot) {
		const dshBin = join(globalRoot, "@deepseek-ai", "dsh", "lib", "bin.js");
		if (existsSync(dshBin)) {
			try {
				return createRequire(dshBin).resolve(name);
			} catch {}
		}
	}
	throw new Error(`无法定位 ${name}：请确认全局安装了 @deepseek-ai/dsh`);
}

// ── MCP server 运行时管理（动态挂载/卸载 dsh-mcp-client 实例，即时生效）──
let rootCtx = null;
let mcpClientModulePromise = null;
let mcpServers = [];
let mcpDisposers = new Map(); // id → disposer
function loadMCPClientModule() {
	if (mcpClientModulePromise === null) {
		mcpClientModulePromise = (async () => {
			const entry = resolveDshModule("@deepseek-ai/dsh-mcp-client");
			return import(pathToFileURL(entry).href);
		})();
	}
	return mcpClientModulePromise;
}
async function loadMCPState() {
	try {
		const raw = JSON.parse(await readFile(MCP_STATE_FILE, "utf8"));
		mcpServers = Array.isArray(raw?.servers) ? raw.servers : [];
	} catch {
		mcpServers = [];
	}
}
async function saveMCPState() {
	await mkdir(dirname(MCP_STATE_FILE), { recursive: true });
	await writeFile(MCP_STATE_FILE, JSON.stringify({ version: 1, servers: mcpServers }, null, 2), "utf8");
}
function mcpConfigOf(server) {
	const base = {
		serverName: server.serverName,
		toolCallTimeoutMs: server.toolCallTimeoutMs ?? 30000,
		failOnStartupError: false,
		reconnect: { enabled: false }
	};
	if (server.transport === "streamable-http") {
		return { ...base, transport: "streamable-http", url: server.url, headers: server.headers ?? {} };
	}
	return { ...base, transport: "stdio", command: server.command, args: server.args ?? [], env: server.env ?? {}, cwd: server.cwd ?? "" };
}
async function mountMCPServer(server) {
	try {
		const mod = await loadMCPClientModule();
		if (rootCtx === null) throw new Error("host plugin 尚未初始化");
		const dispose = await rootCtx.plugin(mod, mcpConfigOf(server));
		mcpDisposers.set(server.id, dispose);
	} catch (error) {
		console.error(`[dsh-host-files] MCP 挂载失败 ${server.serverName}:`, error instanceof Error ? error.message : String(error));
	}
}
async function unmountMCP(id) {
	const dispose = mcpDisposers.get(id);
	if (dispose !== void 0) {
		mcpDisposers.delete(id);
		try {
			await dispose();
		} catch {}
	}
}
function mcpPublicView(server) {
	return {
		id: server.id,
		serverName: server.serverName,
		transport: server.transport,
		command: server.command,
		args: server.args,
		url: server.url,
		enabled: server.enabled !== false,
		hasEnv: !!(server.env && Object.keys(server.env).length > 0)
	};
}

// ── Skill 管理（~/.dsh/skills；开关 = SKILL.md ↔ SKILL.md.disabled 改名，删除走回收站）──
async function listSkills() {
	const out = [];
	let entries = [];
	try {
		entries = await readdir(SKILLS_ROOT, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const entry of entries) {
		const full = join(SKILLS_ROOT, entry.name);
		if (entry.isDirectory()) {
			if (existsSync(join(full, "SKILL.md"))) out.push({ name: entry.name, path: full, enabled: true, kind: "dir" });
			else if (existsSync(join(full, "SKILL.md.disabled"))) out.push({ name: entry.name, path: full, enabled: false, kind: "dir" });
		} else if (entry.isFile()) {
			if (entry.name.endsWith(".md")) out.push({ name: entry.name, path: full, enabled: true, kind: "file" });
			else if (entry.name.endsWith(".md.disabled")) out.push({ name: entry.name.slice(0, -".disabled".length), path: full, enabled: false, kind: "file" });
		}
	}
	out.sort((a, b) => a.name.localeCompare(b.name));
	return out;
}
async function toggleSkill(target) {
	const info = await stat(target);
	if (info.isDirectory()) {
		const on = join(target, "SKILL.md");
		const off = join(target, "SKILL.md.disabled");
		if (existsSync(on)) await rename(on, off);
		else if (existsSync(off)) await rename(off, on);
	} else {
		if (target.endsWith(".disabled")) await rename(target, target.slice(0, -".disabled".length));
		else await rename(target, target + ".disabled");
	}
}
const LANG_BY_EXT = {
	js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx", mjs: "javascript", cjs: "javascript",
	html: "html", htm: "html", xml: "xml", svg: "xml", vue: "vue",
	css: "css", scss: "scss", less: "less", json: "json", jsonc: "jsonc",
	yml: "yaml", yaml: "yaml", md: "markdown", py: "python",
	sh: "shellscript", bash: "shellscript", zsh: "shellscript", go: "go", rs: "rust",
	java: "java", c: "c", h: "c", cpp: "cpp", hpp: "cpp", sql: "sql", toml: "toml", ini: "ini"
};
function shikiLangOf(path) {
	return LANG_BY_EXT[extname(path).slice(1).toLowerCase()] ?? "text";
}

/**
 * 浏览器端文件树/查看器的宿主接口。
 * GET  /vscode-files/list?path=<绝对路径> → { ok, path, dirs, files }
 * GET  /vscode-files/read?path=<绝对路径> → { ok, kind, content, size }
 * GET  /vscode-files/file?path=<绝对路径> → 原始字节流（Content-Type 按扩展名，图片预览用）
 * GET  /vscode-files/stat?path=<绝对路径> → { ok, mtimeMs, size }
 * GET  /vscode-files/git?path=<仓库根>  → { ok, statuses } 或 { ok:false, notRepo:true }
 * GET  /vscode-files/search?path=<根>&q=<关键词> → { ok, results: [{name, path, rel}] }
 * GET  /vscode-files/highlight?path=<绝对路径>&theme=<dark|light> → { ok, html }（服务端 shiki，默认 github-dark）
 * POST /vscode-files/write?path=<绝对路径> body { path, content } → { ok, size }
 * POST /vscode-files/mkdir  body { path: 父目录, name } → { ok, path }
 * POST /vscode-files/mkfile body { path: 父目录, name } → { ok, path }
 * POST /vscode-files/rename body { path, newName } → { ok, path }
 * POST /vscode-files/delete body { path } → { ok }（送回收站，可恢复）
 * GET  /vscode-files/persona → { ok, content }（全局人设，~/.dsh/global-persona.md）
 * POST /vscode-files/persona body { content } → { ok }（保存全局人设）
 * GET  /vscode-files/exec → { ok, shell, jobs }；POST 入队；POST /exec/clear 清屏
 * GET  /vscode-files/agent-shell?session=<sid> → { ok, calls }（本会话 Agent 的 shell 调用）
 */
function apply(ctx) {
	// 「当前会话文件」采集：挂一次会话事件监听（user/message 抠贴入的路径、tool/call 抠写类工具的目标）
	watchSessionEvents(ctx);
	// 拓展栏「命令行」的 Agent 数据源：同一条 session/event 火线上只读采集 shell 类工具调用。
	// 任何异常都不许影响会话本身（见 lib/agent-shell.js）；卸载时清掉采集缓冲。
	try {
		const offAgentShell = agentShellInstall(ctx);
		ctx.effect(() => () => {
			try { offAgentShell(); } catch { /* ignore */ }
			try { agentShellDispose(); } catch { /* ignore */ }
			try { shellDispose(); } catch { /* ignore */ }
		}, "dsh-host-files: command line backends");
	} catch (error) {
		console.warn("[dsh-host-files] agent shell collector failed:", error instanceof Error ? error.message : String(error));
	}
	// 全局人设：注入所有会话的 systemPrompt（text 为函数，每次组装时读文件，改后即时生效）
	ctx.inject(["systemPrompt"], (promptCtx) => {
		promptCtx.systemPrompt.section({
			name: PERSONA_SECTION,
			order: PERSONA_ORDER,
			text: () => {
				try {
					return readFileSync(PERSONA_FILE, "utf8").slice(0, MAX_PERSONA_BYTES);
				} catch {
					return "";
				}
			}
		});
		// 用户「投入会话」的文件（查看器标签上的眼睛点亮，按会话记录）。只注入路径级提示，不注入正文，
		// 正文由 Agent 按需用 read 工具读取，避免整篇进每轮上下文浪费 token；并提醒勿重复读取同一文件。
		// ⚠️ 按会话隔离：text 收到 assemble context（{ agent, scope, signal }），用当前 agent 的 session.id
		// 过滤——只注入「本会话」点亮的文件，绝不跨会话并集（曾把 A 会话点亮文件注入到 B 会话，即「串会话」）。
		promptCtx.systemPrompt.section({
			name: "user:session-files",
			order: 2,
			text: (context) => {
				// 收集当前 agent 所属会话：自身 session.id + 直接父会话（子代理继承父会话可见文件）+ env 兜底
				const keys = new Set();
				const agent = context?.agent;
				const own = agent?.session?.id ?? agent?.id;
				if (typeof own === "string" && own.length > 0) keys.add(own);
				const parent = agent?.session?.header?.parentSession;
				if (typeof parent === "string" && parent.length > 0) keys.add(parent);
				if (typeof process.env.DSH_SESSION_ID === "string" && process.env.DSH_SESSION_ID.length > 0) keys.add(process.env.DSH_SESSION_ID);
				const seen = [];
				for (const key of keys) {
					const m = sessionFiles.get(key);
					if (!m) continue;
					for (const [p, on] of m) {
						if (on === true && p.length > 0 && !seen.includes(p)) seen.push(p);
					}
				}
				if (seen.length === 0) return "";
				return "用户在查看器中投入了这些文件（本会话点亮眼睛的文件；仅路径提示，正文按需用 read 工具读取一次，勿重复读取同一文件）：\n" + seen.map((p) => "- " + p).join("\n");
			}
		});
		// 文件树自动切换：告诉 Agent 如何让文件树跟随用户提供的文件夹（按会话隔离）
		promptCtx.systemPrompt.section({
			name: "user:workspace-root",
			order: 3,
			text: () => `文件树切换（按会话隔离，仅当前窗口生效）：① 用户提供文件夹路径 → 立即调用 switch_workspace_root 工具（传入该路径）完成切换；② 用户没给路径时，只有当你按规则创建了会话文件夹（session-NNN-*）才调用 switch_workspace_root 把该文件夹路径写入并切换（不调用就不切换）；③ 其他情况（自己访问/下载/读取别的目录）不切换。新窗口默认工作区。`
		});
		// 修改审批机制已全面移除（2026-08-19 用户决定）：模型直接修改文件，不再暂存审批。
		// 删除原因：应用器在部分失败时残留 pending 文件导致无限重弹「应用了还弹」，且审批流
		// 与「直接修改」的默认行为冲突。若未来需要恢复，恢复此 section + /vscode-files 三路由。
	});
	rootCtx = ctx;
	// 文件树切换工具：模型调用即写会话隔离 txt（UTF-8 + 存在性校验），取代 pwsh 手写
	ctx.tools.register(switchWorkspaceRootTool);
	// MCP 运行时管理：启动时挂载 enabled 的 server，卸载时全部释放
	ctx.effect(() => {
		(async () => {
			await loadMCPState();
			for (const server of mcpServers) {
				if (server.enabled !== false) await mountMCPServer(server);
			}
		})();
		return () => {
			for (const id of [...mcpDisposers.keys()]) {
				const dispose = mcpDisposers.get(id);
				mcpDisposers.delete(id);
				try {
					dispose?.();
				} catch {}
			}
		};
	}, "dsh-host-files: mcp runtime");
	ctx.effect(() => {
		const off = ctx.webServer.register({
		kind: "prefix",
		path: "/vscode-files",
		handler: async (req, res) => {
			const url = new URL(req.url ?? "/", "http://x");
			// ── 拓展栏「命令行」面板（持久 PowerShell 会话）的兄弟路由 ──────────────────
			//   GET  /vscode-files/exec          → { ok, shell:{exe,alive,pid,cwd}, jobs:[…] }
			//   POST /vscode-files/exec          body { id?, command } → 入队（同 id 幂等）
			//   POST /vscode-files/exec/clear    → 清掉已完成的任务（不动正在跑的）
			// 来源校验只放本机/本机反代（Origin / Sec-Fetch-Site / Host 三判，见 vkExecOriginAllowed）。
			if (url.pathname === "/vscode-files/exec" || url.pathname === "/vscode-files/exec/clear") {
				if (vkExecOriginAllowed(req) !== true) return sendJson(res, 403, { ok: false, error: "forbidden origin" });
				if (url.pathname === "/vscode-files/exec/clear") {
					if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "use POST" });
					try { await readJsonBody(req, 4096); } catch { /* 空体也接受 */ }
					return sendJson(res, 200, shellClear());
				}
				if (req.method === "GET") return sendJson(res, 200, shellSnapshot());
				if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "use GET / POST" });
				try {
					const body = await readJsonBody(req, 1024 * 1024);
					const command = body?.command;
					if (typeof command !== "string" || command.trim().length === 0) {
						return sendJson(res, 400, { ok: false, error: "body needs { command: string }" });
					}
					if (command.length > 64 * 1024) return sendJson(res, 400, { ok: false, error: "command too long" });
					return sendJson(res, 200, shellEnqueue({ id: typeof body?.id === "string" ? body.id : "", command }));
				} catch (error) {
					return sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
			// Agent shell 调用采集（只回本会话）：
			//   GET  /vscode-files/agent-shell?session=<sid> → { ok, calls:[…] }
			//   POST /vscode-files/agent-shell body { session? } → 清空（不带 session 清全部）
			if (url.pathname === "/vscode-files/agent-shell") {
				if (vkExecOriginAllowed(req) !== true) return sendJson(res, 403, { ok: false, error: "forbidden origin" });
				const sid = url.searchParams.get("session") ?? "";
				if (req.method === "GET") return sendJson(res, 200, agentShellList(sid));
				if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "use GET / POST" });
				try {
					const body = await readJsonBody(req, 4096);
					return sendJson(res, 200, agentShellClear(typeof body?.session === "string" ? body.session : sid));
				} catch {
					return sendJson(res, 200, agentShellClear(sid));
				}
			}
			// 当前会话文件（无 path 参数，需在 path 校验之前处理）
			//   GET /vscode-files/session-files?session=<sid>
			//   → { ok, root, sinceMs, files:[{path,name,mtimeMs,size,src}], dirs:[{path,name,src}] }
			//   来源：本会话贴入的路径 + 写类工具的目标 + 会话根下 since 之后改动的文件（兜底）。
			if (url.pathname === "/vscode-files/session-files") {
				const sid = url.searchParams.get("session");
				if (typeof sid !== "string" || !/^[A-Za-z0-9_-]+$/.test(sid)) return sendJson(res, 400, { ok: false, error: "missing session" });
				try {
					const now = Date.now();
					const hit = sessionFilesCache.get(sid);
					if (hit !== void 0 && now - hit.at < SESSION_FILES_TTL) return sendJson(res, 200, hit.body);
					const files = new Map();
					const dirs = new Map();
					const m = sessionTouched.get(sid);
					if (m !== void 0) {
						for (const [p, v] of m) {
							// ⚠️ 只回 **src="paste"**（用户自己贴进对话的路径），2026-09-12 用户口径：
							//   ① 「当前会话文件」= 用户贴进来的，不是 Agent 改过的；
							//   ② 「最近打开」只认「手动打开的 + 贴进对话的路径」——原先 tool/workspace 两类也回给 client，
							//      client 的 sessionDirs 又并入「最近打开」，于是 Agent 写过的目录全挤进了最近打开。
							// 存在即放行；不存在时要求「整段本身就是一条干净路径」（见 CLEAN_PATH_RE）；
							// Agent 自己的窝（harness / .dsh / 工具目录）一律不进用户文件栏。
							if (v.src !== "paste") continue;
							if (AGENT_SIDE_DIRS.some((d) => p.toLowerCase().startsWith(d.toLowerCase()))) continue;
							if (!existsSync(p) && !CLEAN_PATH_RE.test(p)) continue;
							try {
								const st = statSync(p);
								if (st.isDirectory()) {
									if (!dirs.has(p)) dirs.set(p, { path: p, name: p.split(/[\\/]/).pop() || p, src: v.src });
									continue;
								}
								files.set(p, { path: p, name: p.split(/[\\/]/).pop() || p, mtimeMs: st.mtimeMs, size: st.size, src: v.src });
							} catch { /* 已被删/改名：不进列表 */ }
						}
					}
					const root = await sessionRootOf(sid);
					const sinceMs = sessionStart.get(sid) ?? (now - 12 * 60 * 60 * 1000);
					// 「会话根下近期改动」（兜底的 scanRecentUnder）已停用：它把 Agent 刚产出的文件全灌进
					// 「当前会话文件」，用户口径里那一栏只该是「我贴进来的路径」。
					const scanned = 0;
					const list = [...files.values()].sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, 120);
					const dirList = [...dirs.values()].slice(0, 24);
					const body = { ok: true, session: sid, root, sinceMs, files: list, dirs: dirList, scanned, total: files.size, debug: touchDebug };
					sessionFilesCache.set(sid, { at: now, body });
					return sendJson(res, 200, body);
				} catch (error) {
					return sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
			// 全局人设（无 path 参数，需在 path 校验之前处理）
			if (url.pathname === "/vscode-files/persona") {
				if (req.method === "POST") {
					try {
						const body = await readJsonBody(req, MAX_PERSONA_BYTES + 4096);
						const content = body?.content;
						if (typeof content !== "string") return sendJson(res, 400, { ok: false, error: "body needs { content: string }" });
						if (Buffer.byteLength(content, "utf8") > MAX_PERSONA_BYTES) return sendJson(res, 400, { ok: false, error: "persona too large" });
						await writeFile(PERSONA_FILE, content, "utf8");
						return sendJson(res, 200, { ok: true });
					} catch (error) {
						return sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
					}
				}
				let content = "";
				try {
					content = await readFile(PERSONA_FILE, "utf8");
				} catch {}
				return sendJson(res, 200, { ok: true, content });
			}
			// Skill / MCP 管理（无 path 参数）
			if (url.pathname === "/vscode-files/skills" && req.method === "GET") {
				return sendJson(res, 200, { ok: true, skills: await listSkills() });
			}
			if (url.pathname === "/vscode-files/mcp" && req.method === "GET") {
				return sendJson(res, 200, { ok: true, servers: mcpServers.map(mcpPublicView) });
			}
			if (url.pathname === "/vscode-files/skills/toggle" || url.pathname === "/vscode-files/skills/delete"
				|| url.pathname === "/vscode-files/mcp/toggle" || url.pathname === "/vscode-files/mcp/delete"
				|| url.pathname === "/vscode-files/mcp/add") {
				if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "method not allowed" });
				try {
					const body = await readJsonBody(req, 64 * 1024);
					if (url.pathname === "/vscode-files/skills/toggle") {
						const target = body?.path;
						if (typeof target !== "string" || target.length === 0) return sendJson(res, 400, { ok: false, error: "body needs { path }" });
						await toggleSkill(target);
						return sendJson(res, 200, { ok: true });
					}
					if (url.pathname === "/vscode-files/skills/delete") {
						const target = body?.path;
						if (typeof target !== "string" || target.length === 0) return sendJson(res, 400, { ok: false, error: "body needs { path }" });
						const info = await stat(target);
						await recycleBinDelete(target, info.isDirectory());
						return sendJson(res, 200, { ok: true });
					}
					if (url.pathname === "/vscode-files/mcp/toggle") {
						const server = mcpServers.find((s) => s.id === body?.id);
						if (server === void 0) return sendJson(res, 404, { ok: false, error: "server not found" });
						server.enabled = !(server.enabled !== false);
						if (server.enabled) await mountMCPServer(server);
						else await unmountMCP(server.id);
						await saveMCPState();
						return sendJson(res, 200, { ok: true, enabled: server.enabled });
					}
					if (url.pathname === "/vscode-files/mcp/delete") {
						await unmountMCP(body?.id);
						mcpServers = mcpServers.filter((s) => s.id !== body?.id);
						await saveMCPState();
						return sendJson(res, 200, { ok: true });
					}
					if (url.pathname === "/vscode-files/mcp/add") {
						const serverName = body?.serverName;
						const transport = body?.transport === "streamable-http" ? "streamable-http" : "stdio";
						if (typeof serverName !== "string" || !/^[A-Za-z0-9_-]{1,32}$/.test(serverName)) {
							return sendJson(res, 400, { ok: false, error: "serverName 需为 1-32 位字母/数字/_-" });
						}
						if (mcpServers.some((s) => s.id === serverName)) return sendJson(res, 400, { ok: false, error: "serverName 已存在" });
						if (transport === "stdio") {
							if (typeof body?.command !== "string" || body.command.length === 0) return sendJson(res, 400, { ok: false, error: "stdio 类型需要 command" });
						} else if (typeof body?.url !== "string" || body.url.length === 0) {
							return sendJson(res, 400, { ok: false, error: "streamable-http 类型需要 url" });
						}
						const server = {
							id: serverName,
							serverName,
							transport,
							command: body?.command ?? "",
							args: Array.isArray(body?.args) ? body.args.map(String) : [],
							env: body?.env && typeof body.env === "object" ? Object.fromEntries(Object.entries(body.env).map(([k, v]) => [k, String(v)])) : {},
							url: body?.url ?? "",
							headers: body?.headers && typeof body.headers === "object" ? Object.fromEntries(Object.entries(body.headers).map(([k, v]) => [k, String(v)])) : {},
							enabled: true
						};
						mcpServers.push(server);
						await mountMCPServer(server);
						await saveMCPState();
						return sendJson(res, 200, { ok: true, id: serverName });
					}
				} catch (error) {
					return sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
			// 投入会话文件可见性（眼睛按钮）：POST { session, path, on } 写入并持久化；GET ?session= 读取该会话全部状态
			if (url.pathname === "/vscode-files/visible") {
				if (req.method === "POST") {
					try {
						const body = await readJsonBody(req, 64 * 1024);
						const sid = body?.session;
						const p = body?.path;
						if (typeof sid !== "string" || !/^[A-Za-z0-9_-]+$/.test(sid) || typeof p !== "string" || p.length === 0) {
							return sendJson(res, 400, { ok: false, error: "body needs { session, path, on }" });
						}
						let m = sessionFiles.get(sid);
						if (m === void 0) {
							m = new Map();
							sessionFiles.set(sid, m);
						}
						if (body?.on === true) m.set(p, true);
						else m.set(p, false);
						saveSessionFiles();
						return sendJson(res, 200, { ok: true, files: Object.fromEntries(m) });
					} catch (error) {
						return sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
					}
				}
				const sid = url.searchParams.get("session");
				if (typeof sid !== "string" || !/^[A-Za-z0-9_-]+$/.test(sid)) return sendJson(res, 400, { ok: false, error: "missing session" });
				const m = sessionFiles.get(sid);
				return sendJson(res, 200, { ok: true, files: m === void 0 ? {} : Object.fromEntries(m) });
			}
			// 拖入外部文件落盘：复制内容到该会话建议根目录（无建议根则 drop-inbox/<session> 并设为建议根），返回最终路径
			if (url.pathname === "/vscode-files/upload-drop") {
				if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "method not allowed" });
				try {
					const body = await readJsonBody(req, 40 * 1024 * 1024);
					const sid = body?.session;
					const name = body?.name;
					const data = body?.data;
					if (typeof sid !== "string" || !/^[A-Za-z0-9_-]+$/.test(sid) || typeof name !== "string" || name.length === 0 || typeof data !== "string" || data.length === 0) {
						return sendJson(res, 400, { ok: false, error: "body needs { session, name, data(base64) }" });
					}
					const { dir } = await dropInboxDirOf(sid);
					const safeName = String(name).split(/[\\/]/).pop().replace(/[<>:"|?*\u0000-\u001F]/g, "_") || ("drop-" + Date.now() + ".txt");
					let target = join(dir, safeName);
					for (let i = 1; existsSync(target); i++) {
						const ext = extname(safeName);
						const stem = ext.length > 0 ? safeName.slice(0, -ext.length) : safeName;
						target = join(dir, stem + "-" + i + ext);
					}
					await writeFile(target, Buffer.from(data, "base64"));
					// 收件目录不再写入 suggested-workspace（避免 drop-inbox/<session> 变成会话建议根顶格霸占文件树，
					// 且 Agent 切根时把它误当会话文件夹）。落点目录由 client 即时放进「最近打开」，同样可见、可手动移出。
					return sendJson(res, 200, { ok: true, path: target, dir });
				} catch (error) {
					return sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
			// 从「当前会话文件 / 最近打开」移出一条：POST /vscode-files/session-touch/remove { session, path }
			//   只抹掉 host 侧的会话记录（sessionTouched），**不碰磁盘文件**——与文件栏那颗垃圾桶的提示一致。
			//   没有这条路由时，client 把路径移出列表后，下一轮 3 秒轮询立刻把「贴入的文件夹」原样带回来，
			//   表现为「点了移出却没反应」（用户 2026-09-12 报的三种冲突之一）。
			if (url.pathname === "/vscode-files/session-touch/remove") {
				if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "method not allowed" });
				try {
					const body = await readJsonBody(req, 64 * 1024);
					const sid = body?.session;
					const target = body?.path;
					if (typeof sid !== "string" || !/^[A-Za-z0-9_-]+$/.test(sid)) return sendJson(res, 400, { ok: false, error: "body needs { session }" });
					if (typeof target !== "string" || target.length === 0) return sendJson(res, 400, { ok: false, error: "body needs { path }" });
					const m = sessionTouched.get(sid);
					let removed = 0;
					if (m !== void 0) {
						const want = trimPathTail(target).toLowerCase();
						for (const p of [...m.keys()]) {
							if (trimPathTail(p).toLowerCase() !== want) continue;
							m.delete(p);
							removed += 1;
						}
						if (m.size === 0) sessionTouched.delete(sid);
						saveSessionTouched();
					}
					sessionFilesCache.delete(sid);
					return sendJson(res, 200, { ok: true, removed });
				} catch (error) {
					return sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
			// 删除某会话的工作区建议（Agent 自动设定文件树根目录的 <sessionId>.txt），删除后不再自动跳到它
			if (url.pathname === "/vscode-files/root/forget") {
				if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "method not allowed" });
				try {
					const body = await readJsonBody(req, 64 * 1024);
					const sid = body?.session;
					if (typeof sid !== "string" || !/^[A-Za-z0-9_-]+$/.test(sid)) return sendJson(res, 400, { ok: false, error: "body needs { session }" });
					const file = join(SUGGESTED_ROOT_DIR, sid + ".txt");
					try {
						await rm(file, { force: true });
					} catch {}
					return sendJson(res, 200, { ok: true });
				} catch (error) {
					return sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
			// 会话建议根目录（按会话隔离：client 带 session 参数，host 读 <sessionId>.txt）
			if (url.pathname === "/vscode-files/root") {
				let root = "";
				const sid = url.searchParams.get("session");
				if (typeof sid === "string" && /^[A-Za-z0-9_-]+$/.test(sid)) {
					const file = join(SUGGESTED_ROOT_DIR, sid + ".txt");
					try {
						let text = await readFile(file, "utf8");
						// 编码容错：UTF-8 解码出现替换符（U+FFFD）说明该文件可能被 GBK 写入（PS5.1 默认编码），
						// 尝试 GBK 重解码（Node 内置 TextDecoder 支持 'gbk'）。
						if (text.includes("\uFFFD")) {
							try {
								text = new TextDecoder("gbk").decode(await readFile(file));
							} catch {}
						}
						const candidate = text.trim();
						// 路径必须真实存在（目录），否则视为无效，让 client 回退到会话 cwd，避免加载坏路径
						if (candidate.length > 0 && existsSync(candidate)) root = candidate;
					} catch {}
				}
				return sendJson(res, 200, { ok: true, root });
			}
			// 音视频流式输出：GET /vscode-files/media?path=<绝对路径>
			// 与 /vscode-files/file 的区别（实测决定）：那条是整块读进内存 + 64MB 上限，视频动辄几百 MB，
			// 而且 <video> 必须能按 Range 分段取（否则拖动进度条、倍速都要等整个文件下完）。
			if (url.pathname === "/vscode-files/media") {
				const src = url.searchParams.get("path");
				if (typeof src !== "string" || src.length === 0) return sendJson(res, 400, { ok: false, error: "missing path" });
				const info = await stat(src).catch(() => void 0);
				if (info === void 0 || !info.isFile()) return sendJson(res, 404, { ok: false, error: "not found or not a file" });
				const total = info.size;
				const ext = extname(src).slice(1).toLowerCase();
				const mime = MEDIA_MIME[ext] ?? "application/octet-stream";
				const rangeHeader = req.headers.range;
				let start = 0;
				let end = total - 1;
				let partial = false;
				if (typeof rangeHeader === "string" && rangeHeader.length > 0) {
					const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
					if (m !== null) {
						partial = true;
						if (m[1] !== "") start = Number(m[1]);
						if (m[2] !== "") end = Number(m[2]);
						if (!Number.isFinite(start) || start < 0) start = 0;
						if (!Number.isFinite(end) || end >= total) end = total - 1;
						if (start > end) {
							res.writeHead(416, { "content-range": "bytes */" + String(total) });
							res.end();
							return;
						}
					}
				}
				const headers = {
					"content-type": mime,
					"content-length": String(end - start + 1),
					"accept-ranges": "bytes",
					"cache-control": "no-cache",
					"x-content-type-options": "nosniff"
				};
				if (partial) headers["content-range"] = "bytes " + start + "-" + end + "/" + total;
				res.writeHead(partial ? 206 : 200, headers);
				createReadStream(src, { start, end }).pipe(res);
				return;
			}
			// 用系统默认程序打开：POST /vscode-files/open-native body { path } → { ok }
			// path 支持两种形态：
			//   ① 本地绝对路径（Office 交给本机 Word/Excel/PowerPoint、本地 html 交给默认浏览器）；
			//   ② http(s) URL（直接用默认浏览器打开这个网页——用户在拓展栏里看到的网页预览是内嵌 iframe，
			//      这颗按钮是「拿到真正的浏览器窗口里」的出口）。
			// 官方的 /open-in-app/open 做不到：app 表是编译期常量，且**只接受目录**。
			if (url.pathname === "/vscode-files/open-native") {
				if (req.method !== "POST") return sendJson(res, 405, { ok: false, error: "use POST" });
				try {
					const body = await readJsonBody(req, 4096);
					const target = body?.path;
					if (typeof target !== "string" || target.length === 0) return sendJson(res, 400, { ok: false, error: "body needs { path: string }" });
					const isUrl = /^https?:\/\//i.test(target);
					if (!isUrl) {
						if (!isAbsolute(target)) return sendJson(res, 400, { ok: false, error: "path must be absolute" });
						const info = await stat(target).catch(() => void 0);
						if (info === void 0 || !info.isFile()) return sendJson(res, 404, { ok: false, error: "not found or not a file" });
					}
					// 复用本文件已有的 openWithDefaultApp（PowerShell Start-Process + 环境变量传参，无命令行注入面；
					// Start-Process 走 ShellExecute，URL 会落到默认浏览器）
					try {
						await openWithDefaultApp(target);
					} catch (error) {
						return sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
					}
					return sendJson(res, 200, { ok: true, target: target, kind: isUrl ? "url" : "file" });
				} catch (error) {
					return sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
			// Office 中栏预览：GET /vscode-files/office?path=<绝对路径>&as=web|pdf → { ok, mode, url, ... }
			// as=web（默认）：请 MS Office COM 导出「网页视图」（Word/Excel→HTML、PPT→每页 PNG、Visio→每页 SVG），
			//   url 指向 /vscode-files/fs/<缓存里的视图入口>，浏览器原生渲染（可滚动/切表/缩放）。
			//   不适用（odt/ods/odp、未装 Office）或失败 / PPT 超页 → 自动回落 LibreOffice→PDF（mode=pdf，老路径）。
			// as=pdf：直接走 LibreOffice→PDF（中栏「原版式」按钮）。
			if (url.pathname === "/vscode-files/office") {
				try {
					const src = url.searchParams.get("path");
					if (typeof src !== "string" || src.length === 0) return sendJson(res, 400, { ok: false, error: "missing path" });
					const ext = extname(src).slice(1).toLowerCase();
					if (!OFFICE_CONVERT_EXT.has(ext)) return sendJson(res, 400, { ok: false, error: "not an office file: ." + (ext || "?") });
					const info = await stat(src).catch(() => void 0);
					if (info === void 0 || !info.isFile()) return sendJson(res, 404, { ok: false, error: "not found or not a file" });
					if (info.size > OFFICE_MAX_SRC_BYTES) return sendJson(res, 413, { ok: false, error: "file too large to convert (" + info.size + " bytes)" });
					if (url.searchParams.get("as") !== "pdf") {
						const view = await officeWebViewFor(src, info);
						if (view !== null && typeof view.entry === "string") {
							if (view.mode === "web") {
								return sendJson(res, 200, {
									ok: true,
									mode: "web",
									kind: view.kind,
									pages: view.pages ?? null,
									sheets: view.sheets ?? null,
									note: view.note ?? null,
									url: "/vscode-files/fs/" + encodePreviewPath(view.entry)
								});
							}
							return sendJson(res, 200, {
								ok: true,
								mode: "pdf",
								kind: view.kind,
								pages: view.slides ?? null,
								note: view.note ?? null,
								url: "/vscode-files/file?path=" + encodeURIComponent(view.entry)
							});
						}
					}
					if (sofficeExe() === null) return sendJson(res, 500, { ok: false, error: "LibreOffice 未安装或未找到 soffice.exe（Office 预览需要它）" });
					const cachePdf = await officeCachePdfFor(src, info);
					if (cachePdf === null || cachePdf.length === 0) return sendJson(res, 500, { ok: false, error: "LibreOffice 转换失败（请确认文件未损坏、未加密）" });
					return sendJson(res, 200, { ok: true, mode: "pdf", url: "/vscode-files/file?path=" + encodeURIComponent(cachePdf) });
				} catch (error) {
					return sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
			// 用系统默认应用打开（中栏预览的「外部打开」备选）：GET /vscode-files/open-native?path=<绝对路径>
			if (url.pathname === "/vscode-files/open-native") {
				try {
					const src = url.searchParams.get("path");
					if (typeof src !== "string" || src.length === 0) return sendJson(res, 400, { ok: false, error: "missing path" });
					const info = await stat(src).catch(() => void 0);
					if (info === void 0) return sendJson(res, 404, { ok: false, error: "not found" });
					await openWithDefaultApp(src);
					return sendJson(res, 200, { ok: true });
				} catch (error) {
					return sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
			// 修改审批路由已全面移除（2026-08-19 用户决定：模型直接修改文件，不再暂存审批）。
			// 原 /vscode-files/preview、/vscode-files/apply-preview、/vscode-files/reject-preview 已删除，
			// pending-edit 目录不再被读写。文件树/查看器/编辑保存等其余 vscode-files 接口不受影响。
			// 中栏网页预览：路径式路由（不是 ?path=），让页面内相对资源按同目录解析，HTML 自动注入 <base>
			if (url.pathname.startsWith("/vscode-files/fs/")) {
				try {
					return await servePreviewPage(req, res, url.pathname.slice("/vscode-files/fs/".length));
				} catch (error) {
					return sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
				}
			}
			const target = url.searchParams.get("path");
			if (typeof target !== "string" || target.length === 0) {
				return sendJson(res, 400, { ok: false, error: "missing path" });
			}
			try {
				if (url.pathname === "/vscode-files/file") {
					const info = await stat(target).catch(() => void 0);
					if (info === void 0 || !info.isFile()) return sendJson(res, 404, { ok: false, error: "not found or not a file" });
					if (info.size > MAX_BLOB_BYTES) return sendJson(res, 413, { ok: false, error: "file too large to preview (" + info.size + " bytes)" });
					const mime = MIME_BY_EXT[extname(target).slice(1).toLowerCase()] ?? "application/octet-stream";
					const data = await readFile(target);
					res.writeHead(200, {
						"content-type": mime,
						"cache-control": "no-cache",
						"content-length": String(data.length),
						"x-content-type-options": "nosniff"
					});
					res.end(data);
					return;
				}
				if (url.pathname === "/vscode-files/list") {
					const entries = await readdir(target, { withFileTypes: true });
					const dirs = [];
					const files = [];
					for (const entry of entries) {
						const full = join(target, entry.name);
						const hidden = isHiddenName(entry.name);
						if (entry.isDirectory()) dirs.push({ name: entry.name, path: full, hidden });
						else if (entry.isFile()) {
							let size = 0;
							let mtimeMs = 0;
							try {
								const info = await stat(full);
								size = info.size;
								mtimeMs = info.mtimeMs;
							} catch {}
							files.push({ name: entry.name, path: full, size, mtimeMs, hidden });
						}
					}
					dirs.sort((a, b) => a.name.localeCompare(b.name));
					files.sort((a, b) => a.name.localeCompare(b.name));
					return sendJson(res, 200, { ok: true, path: target, dirs, files });
				}
				if (url.pathname === "/vscode-files/stat") {
					const info = await stat(target);
					return sendJson(res, 200, { ok: true, mtimeMs: info.mtimeMs, size: info.size });
				}
				if (url.pathname === "/vscode-files/read") {
					const info = await stat(target);
					if (info.isDirectory()) return sendJson(res, 400, { ok: false, error: "path is a directory" });
					if (info.size > MAX_READ_BYTES) {
						const text = await readFile(target, "utf8");
						return sendJson(res, 200, { ok: true, kind: "too-large", content: text.slice(0, MAX_READ_BYTES), size: info.size });
					}
					const text = await readFile(target, "utf8");
					if (looksBinary(text)) return sendJson(res, 200, { ok: true, kind: "binary", content: "", size: info.size });
					const prevSnap = readSnapshots.get(target);
					const changed = prevSnap === undefined ? [] : changedLineNumbers(prevSnap, text);
					readSnapshots.set(target, text);
					if (readSnapshots.size > 200) {
						const firstKey = readSnapshots.keys().next().value;
						if (firstKey !== undefined) readSnapshots.delete(firstKey);
					}
					return sendJson(res, 200, { ok: true, kind: "text", content: text, size: info.size, changedLines: changed });
				}
				if (url.pathname === "/vscode-files/git") {
					return sendJson(res, 200, await gitStatusOf(target));
				}
				if (url.pathname === "/vscode-files/search") {
					const q = url.searchParams.get("q");
					if (typeof q !== "string" || q.trim().length === 0) return sendJson(res, 400, { ok: false, error: "missing q" });
					const kind = url.searchParams.get("kind");
					return sendJson(res, 200, { ok: true, results: await searchDir(target, q.trim(), kind) });
				}
				if (url.pathname === "/vscode-files/highlight") {
					const info = await stat(target);
					if (info.isDirectory()) return sendJson(res, 400, { ok: false, error: "path is a directory" });
					if (info.size > MAX_HIGHLIGHT_BYTES) return sendJson(res, 200, { ok: false, error: "too large to highlight" });
					const text = await readFile(target, "utf8");
					if (looksBinary(text)) return sendJson(res, 200, { ok: false, error: "binary" });
					try {
						const shiki = await loadShiki();
						const theme = url.searchParams.get("theme") === "light" ? "github-light" : "github-dark";
						const html = await shiki.codeToHtml(text, { lang: shikiLangOf(target), theme });
						return sendJson(res, 200, { ok: true, html });
					} catch (error) {
						return sendJson(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error) });
					}
				}
				if (req.method === "POST") {
					let body;
					try {
						body = await readJsonBody(req, 12 * 1024 * 1024);
					} catch (error) {
						return sendJson(res, 400, { ok: false, error: error.message });
					}
					if (url.pathname === "/vscode-files/write") {
						const writePath = body?.path;
						const content = body?.content;
						if (typeof writePath !== "string" || writePath.length === 0 || typeof content !== "string") {
							return sendJson(res, 400, { ok: false, error: "body needs { path: string, content: string }" });
						}
						if (Buffer.byteLength(content, "utf8") > MAX_WRITE_BYTES) {
							return sendJson(res, 400, { ok: false, error: "content too large" });
						}
						const info = await stat(writePath).catch(() => void 0);
						if (info !== void 0 && info.isDirectory()) return sendJson(res, 400, { ok: false, error: "path is a directory" });
						await writeFile(writePath, content, "utf8");
						return sendJson(res, 200, { ok: true, size: Buffer.byteLength(content, "utf8") });
					}
					if (url.pathname === "/vscode-files/mkdir") {
						const parent = body?.path;
						if (typeof parent !== "string" || !validSegment(body?.name)) return sendJson(res, 400, { ok: false, error: "body needs { path: string, name: string }" });
						const full = join(parent, body.name);
						try {
							await mkdir(full);
						} catch (error) {
							return sendJson(res, 409, { ok: false, error: "已存在或无法创建：" + (error?.code ?? "unknown") });
						}
						return sendJson(res, 200, { ok: true, path: full });
					}
					if (url.pathname === "/vscode-files/mkfile") {
						const parent = body?.path;
						if (typeof parent !== "string" || !validSegment(body?.name)) return sendJson(res, 400, { ok: false, error: "body needs { path: string, name: string }" });
						const full = join(parent, body.name);
						try {
							await writeFile(full, "", { flag: "wx" });
						} catch (error) {
							return sendJson(res, 409, { ok: false, error: "已存在或无法创建：" + (error?.code ?? "unknown") });
						}
						return sendJson(res, 200, { ok: true, path: full });
					}
					if (url.pathname === "/vscode-files/rename") {
						const oldPath = body?.path;
						if (typeof oldPath !== "string" || !validSegment(body?.newName)) return sendJson(res, 400, { ok: false, error: "body needs { path: string, newName: string }" });
						const newPath = join(dirname(oldPath), body.newName);
						await rename(oldPath, newPath);
						return sendJson(res, 200, { ok: true, path: newPath });
					}
					if (url.pathname === "/vscode-files/delete") {
						const delPath = body?.path;
						if (typeof delPath !== "string" || delPath.length === 0) return sendJson(res, 400, { ok: false, error: "body needs { path: string }" });
						const info = await stat(delPath).catch(() => void 0);
						if (info === void 0) return sendJson(res, 404, { ok: false, error: "not found" });
						await recycleBinDelete(delPath, info.isDirectory());
						return sendJson(res, 200, { ok: true });
					}
				}
				return sendJson(res, 404, { ok: false, error: "unknown vscode-files endpoint" });
			} catch (error) {
				return sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
			}
		}
		});
		return () => {
			try { if (typeof off === "function") off(); } catch { /* ignore */ }
		};
	}, "dsh-host-files: /vscode-files routes");
}

export { name, inject, apply };
/** 离线校验钩子（tests/office-web-view-smoke.mjs 用；运行时不读）。 */
export const __test = {
	OFFICE_WEB_KIND_BY_EXT,
	PPT_RASTER_MAX_SLIDES,
	cscriptExe,
	listOfficePids,
	runVbs,
	galleryShell,
	workbookShell,
	parseSheetNames,
	injectViewStyle,
	buildOfficeWebView,
	officeWebViewPaths,
	officeWebViewFor
};
