/**
 * Agent shell 调用采集（拓展栏「命令行」面板的 agent 数据源）
 *
 * 用户诉求（2026-09-12）：会话过程中 Agent 自己调 PowerShell 的过程，也要显示在拓展栏下方
 * 同一条终端流里，但**只显示本对话**的。
 *
 * 做法：host 侧挂 `session/event` 火线，只收 `tool/call` 与 `tool/result` 两条，按会话 id 分桶
 * 压入环形缓冲；前端跟着 700ms 轮询一起拉（`GET /vscode-files/agent-shell?session=<sid>`）。
 *
 * 为什么不走客户端事件：`session/event` 是服务端事件域，浏览器侧的插件 ctx 只有 slots/settings
 * 一类 UI 事件，拿不到工具调用；host 半端本来就常驻，成本最低。
 *
 * 为什么按 callId 配对：`tool/call` 事件带 `callId + name + arguments`，`tool/result` 事件的
 * `message.content[0].toolCallId` 与之对应，配对后就能同时给出「命令」与「输出」。
 */
/** 每个会话保留的调用条数上限（滚动窗口）。 */
const MAX_CALLS_PER_SESSION = 200;
/** 单条调用的参数 / 输出保留上限（字符）。 */
const MAX_ARGS = 8 * 1024;
const MAX_OUTPUT = 128 * 1024;
/** 与本机命令行面板同源的 shell 工具名（大小写不敏感精确匹配；子串匹配会把 bash-local 之类算进来）。 */
const SHELL_TOOLS = new Set(["pwsh", "bash", "cmd"]);
/** 会话桶上限（防长跑进程里会话无限增长）。 */
const MAX_SESSIONS = 40;

const sessions = new Map();

function bucket(sessionId) {
	let list = sessions.get(sessionId);
	if (list === undefined) {
		list = [];
		sessions.set(sessionId, list);
		if (sessions.size > MAX_SESSIONS) {
			const oldest = sessions.keys().next().value;
			if (oldest !== undefined && oldest !== sessionId) sessions.delete(oldest);
		}
	}
	return list;
}

function clip(text, max) {
	const s = String(text ?? "");
	return s.length > max ? s.slice(0, max) + "\n… （已截断）" : s;
}

/** 从工具结果消息里抠模型可见文本（text 块拼接）。 */
function outputOf(message) {
	try {
		const blocks = message !== null && message !== undefined && Array.isArray(message.content) ? message.content : [];
		const parts = [];
		for (const block of blocks) {
			if (block !== null && block !== undefined && block.type === "text" && typeof block.text === "string") parts.push(block.text);
		}
		return parts.join("\n");
	} catch {
		return "";
	}
}

/** 从 `tool/call` 的原始 arguments JSON 里取命令正文（解析失败就原样留着）。 */
function commandOf(rawArguments) {
	try {
		const parsed = JSON.parse(String(rawArguments));
		if (parsed !== null && typeof parsed === "object") {
			for (const key of ["command", "cmd", "script", "code"]) {
				if (typeof parsed[key] === "string") return parsed[key];
			}
		}
	} catch {
		/* 非 JSON：原样返回 */
	}
	return String(rawArguments ?? "");
}

/**
 * 挂 `session/event` 只读监听；返回卸载函数。
 * @param {import("@deepseek-ai/cordis").Context} ctx
 */
export function install(ctx) {
	try {
		const off = ctx.on("session/event", (session, event) => {
			try {
				const type = event === null || event === undefined ? "" : String(event.type);
				if (type !== "tool/call" && type !== "tool/result") return;
				const sessionId = session !== null && session !== undefined && typeof session.id === "string" ? session.id : "";
				if (sessionId.length === 0) return;
				const data = event.data ?? {};
				if (type === "tool/call") {
					const name = String(data.name ?? "").toLowerCase();
					if (SHELL_TOOLS.has(name) !== true) return;
					const list = bucket(sessionId);
					// 同 callId 重复上报（重放/重发）只记一次
					const callId = String(data.callId ?? "");
					if (callId.length > 0 && list.some((item) => item.callId === callId)) return;
					list.push({
						callId,
						tool: name,
						command: clip(commandOf(data.arguments), MAX_ARGS),
						at: Date.now(),
						status: "running",
						output: "",
						isError: false
					});
					while (list.length > MAX_CALLS_PER_SESSION) list.shift();
					return;
				}
				// tool/result
				const message = data.message ?? {};
				const blocks = Array.isArray(message.content) ? message.content : [];
				const first = blocks.length > 0 ? blocks[0] : null;
				const callId = first !== null && typeof first.toolCallId === "string" ? first.toolCallId : "";
				if (callId.length === 0) return;
				const list = sessions.get(sessionId);
				if (list === undefined) return;
				const hit = list.find((item) => item.callId === callId);
				if (hit === undefined) return;
				hit.output = clip(outputOf(message), MAX_OUTPUT);
				hit.isError = first.isError === true || data.error !== undefined;
				hit.status = hit.isError === true ? "error" : "done";
				hit.endedAt = Date.now();
			} catch {
				/* 采集失败绝不影响会话本身 */
			}
		});
		return typeof off === "function" ? off : () => {};
	} catch {
		return () => {};
	}
}

/**
 * 取某会话的调用列表（按时间升序）。
 * @param {string} sessionId
 */
export function list(sessionId) {
	const calls = sessions.get(String(sessionId ?? ""));
	if (calls === undefined) return { ok: true, calls: [] };
	return {
		ok: true,
		calls: calls.map((item) => ({
			callId: item.callId,
			tool: item.tool,
			command: item.command,
			at: item.at,
			endedAt: item.endedAt ?? null,
			status: item.status,
			isError: item.isError === true,
			output: item.output
		}))
	};
}

/** 清空某会话（或全部）的采集。 */
export function clear(sessionId) {
	if (typeof sessionId === "string" && sessionId.length > 0) sessions.delete(sessionId);
	else sessions.clear();
	return { ok: true };
}

/** 卸载：丢掉全部采集。 */
export function dispose() {
	sessions.clear();
}
