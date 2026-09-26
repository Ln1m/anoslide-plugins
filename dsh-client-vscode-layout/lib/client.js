window.__ModuleLoader__.load({
	id: "@anoslide/dsh-client-vscode-layout",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		try {
			storeModule = require("@deepseek-ai/dsh-client-store");
		} catch (e) {
			try {
				storeModule = require("@deepseek-ai/dsh-client-runtime/client");
			} catch (e2) {
				storeModule = undefined;
			}
		}
		const h = react.createElement;

		// 挂载层共享句柄：registered 组件（左栏文件树）运行在框架渲染树里，拿不到 apply 的闭包，
		// 因此把插件 ctx 与目录选择器挂到模块级 ref（apply 每次激活时刷新）。
		const ctxRef = { current: null };
		const pickFolderRef = { current: async () => { throw new Error("native directory picker unavailable"); } };

		/**
		 * 文件绝对值 → 官方资源地址：`dsh-resource://file/session/<会话>/<路径>`。
		 * 与官方 ui-sidebar-files 的 fileAddressFor 同构（工作区根内写相对路径、根外保留绝对路径），
		 * 官方 viewer 与自研查看器都按这个地址认领，因此两边都能打开文件树里的任意文件。
		 * @param sessionId - 会话 id（资源读取按会话解析）。
		 * @param cwd - 该会话工作区根（可为空）。
		 * @param path - 绝对路径（两个分隔符都收）。
		 */
		function fileAddressFor(sessionId, cwd, path) {
			const prefix = "dsh-resource://file/session/";
			const norm = String(path === null || path === undefined ? "" : path).replace(/\\/g, "/");
			let relative = norm;
			const root = typeof cwd === "string" && cwd.length > 0 ? cwd.replace(/\\/g, "/").replace(/\/+$/, "") : "";
			if (root !== "" && relative.startsWith(root + "/")) relative = relative.slice(root.length + 1);
			const encodeSegment = (seg) => encodeURIComponent(seg).replace(/%3A/gi, ":");
			const encoded = relative.replace(/^(?:\.\/)+/, "").split("/").filter((s, i) => !(i === 0 && s === "")).map(encodeSegment).join("/");
			return prefix + encodeSegment(String(sessionId === null || sessionId === undefined ? "" : sessionId)) + "/" + encoded;
		}

		// —— 内联 SVG 图标（stroke=currentColor 随主题变色，替代 emoji，避免部分设备渲染成「方块灰框」）——
		const _VK_ICONS = {
			menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
			tasks: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/>',
			folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
			folderOpen: '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
			chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
			eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
			eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
			search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
			edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
			trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
			check: '<path d="M20 6 9 17l-5-5"/>',
			close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
			save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
			columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/>',
			fullscreen: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
			file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/>',
			fileText: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
			image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
			video: '<path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
			music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
			archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
			lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
			tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
			atom: '<circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/>',
			terminal: '<path d="m4 17 6-5-6-5"/><path d="M12 19h8"/>',
			open: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/>',
			zoomIn: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
			zoomOut: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>',
			gear: '<circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
			gitBranch: '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
			box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
			chevronLeft: '<path d="m15 18-6-6 6-6"/>',
			// 侧栏/面板类图标（左侧栏 Tab 条最右端的「打开拓展栏」按钮用）
			panelRight: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="15" y1="4" x2="15" y2="20"/>',
			// 拓展栏顶栏第 4 颗按钮：上下分界（上=官方拓展栏，下=命令行）
			panelBottom: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="13" x2="21" y2="13"/><path d="m6.6 15.6 2.4 1.7-2.4 1.7" stroke-width="1.6"/><line x1="11" y1="19" x2="15" y2="19" stroke-width="1.6"/>',
			chevronRight: '<path d="m9 18 6-6-6-6"/>',
			chevronDown: '<path d="m6 9 6 6 6-6"/>',
			chevronUp: '<path d="m18 15-6-6-6 6"/>',
			arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
			hardDrive: '<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>',
			refresh: '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
			monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
			home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'
		};
		function VIcon({ name, size = 14 }) {
			const d = _VK_ICONS[name];
			if (!d) return null;
			return h("svg", { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flex: "none", display: "block" }, dangerouslySetInnerHTML: { __html: d } });
		}
		function pathBase(path) {
			const s = String(path);
			const i = Math.max(s.lastIndexOf("/"), s.lastIndexOf("\\"));
			return i === -1 ? s : s.slice(i + 1);
		}
		// 文件树落地页（未打开具体文件夹时）：折叠展示的常用根目录，展开即可浏览；要固定展示自己的目录，在这里补条目
		const HOME_DIRS = [];
		// 路径归一化：去首尾空白与尾部分隔符、盘根补斜杠、转小写（Windows 大小写不敏感，避免过滤漏判）
		function normPath(p) {
			if (typeof p !== "string") return "";
			let s = p.trim().replace(/[\\/]+$/, "");
			if (/^[A-Za-z]:$/.test(s)) s += "\\";
			return s.toLowerCase();
		}
		// 工作区 / 长期任务固定目录（HOME_DIRS）：不出现在「最近打开」，也不写入最近打开记录
		function isHomeDirPath(p) {
			const n = normPath(p);
			return HOME_DIRS.some((d) => normPath(d.path) === n);
		}
		// ── 文件栏的展开状态：**模块级共享（仅文件栏这一族视图内部）**────────────────────
		// 2026-09-12 晚修订：与「会话 @ 列表」**解绑**（用户口径：两边只是内容一致，展开状态各自独立）。
		// 写入方只剩文件栏自己：那颗三角 toggle；复位方是「离开文件栏」（切 Tab / 收起面板 / 卸载，
		// 用户口径「切走再切回来仍纯折叠」）与换工作区根。@ 菜单不再清它、也不拿它当自己的展开态：
		// @ 菜单目录行走官方 drill（vkAtBrowse）自己那一套。
		// 保留模块级存放只是为了文件栏内的多个入口（落地页 / 文件列表 / 最近打开）读到同一份。
		// showHidden 同理（文件栏那颗眼睛）：要显示同一批条目。
		// 注意用**归一化路径**比较（大小写/尾斜杠不敏感），但集合里存**原样路径**——
		// 原样路径要拿去请求 /vscode-files/list 并作为 entries 的键，写成小写会让 rows() 取不到子项。
		const vkFileTreeState = { expanded: new Set(), showHidden: false, subs: new Set() };
		// ── 诊断探针（2026-09-12 晚，临时；查完「还是会自己收」就删）──────────────────────
		// 自报数（DevTools 控制台）：JSON.stringify(__VK_DIAG__)
		//   · mounts.k 一直涨 → FileTree 被反复重挂载（本地 state 复位 → 看起来「自己收」）
		//   · unmounts  涨  → 同上，且能看出是哪次渲染卸的
		//   · clears.<来源> 涨 → 展开集真的被某条代码路径清了，来源直接点名
		const vkDiag = { mountedAt: new Date().toISOString(), mounts: 0, unmounts: 0, clears: {}, lastMounts: [], lastUnmounts: [], events: [], uiSeq: [] };
		try { globalThis.__VK_DIAG__ = vkDiag; } catch { /* 非浏览器环境 */ }
		/** 统一录入一条诊断事件（带调用栈）。 */
		function vkDiagEvent(kind, detail) {
			try {
				vkDiag.events.push({ at: new Date().toISOString().slice(11, 23), kind: kind, detail: detail, stack: String(new Error().stack || "").split("\n").slice(2, 6).join(" <- ") });
				if (vkDiag.events.length > 80) vkDiag.events.shift();
			} catch { /* 探针失败不影响行为 */ }
		}
		/** 统一的时间线录入：把「点击 / 栏目开合 / 卸载」放进同一条序列里，用来对齐先后。 */
		function vkDiagUI(kind, detail) {
			try {
				vkDiag.uiSeq.push({ at: new Date().toISOString().slice(11, 23), kind: kind, detail: detail });
				if (vkDiag.uiSeq.length > 120) vkDiag.uiSeq.shift();
			} catch { /* 探针失败不影响行为 */ }
		}
		/** 清空展开集：正常路径与诊断共用，reason 就是「谁清的」。 */
		function vkFileTreeClearExpanded(reason) {
			if (vkFileTreeState.expanded.size === 0) return;
			vkDiag.clears[reason] = (vkDiag.clears[reason] || 0) + 1;
			vkFileTreeSetExpanded(new Set());
			vkDiagEvent("clear:" + reason, "");
		}
		function vkFileTreeSubscribe(fn) {
			vkFileTreeState.subs.add(fn);
			return () => { vkFileTreeState.subs.delete(fn); };
		}
		function vkFileTreeSetExpanded(next) {
			vkFileTreeState.expanded = next instanceof Set ? new Set(next) : new Set(next);
			const list = [...vkFileTreeState.expanded];
			for (const fn of [...vkFileTreeState.subs]) { try { fn(list); } catch { /* 订阅方可能已卸载 */ } }
		}
		// ── 展开集什么时候被清空（2026-09-13 定稿：与 @ 列表彻底解绑）──────────────────────
		// 只有**确定性的两个来源**：
		//   ① 用户离开文件栏：切到会话/任务 Tab、或收起左栏 —— 由 VK_SidebarBody 的 tab/wide effect
		//      直接清（见那边注释）；切回来时 DOM 还没渲染就已经是空的，天然「纯折叠」。
		//   ② 在文件栏里换根 / 关根（setRoot 到不同值）—— 由 FileTree 的 [root] effect 清。
		// 写入方只有文件栏自己（那颗三角 / 单击目录行）。
		// **@ 列表与文件栏完全分离**（用户第一轮口径：两边只是内容一致）：@ 菜单的关闭复位、@ 的旧目录行
		// 分支都不再读写这份状态；IntersectionObserver 那条「看可见性」的兜底也已删除。
		// 展开状态在文件栏内也不跨视图记忆：切走再切回来仍是纯折叠。
		/** 某目录是否处于展开态（按归一化路径比较，忽略大小写与尾斜杠）。 */
		function vkFileTreeHas(path) {
			const k = normPath(path);
			for (const p of vkFileTreeState.expanded) if (normPath(p) === k) return true;
			return false;
		}
		/** 展开 / 收起一个目录（收起时级联收起全部后代）；返回切换后的状态（true = 已展开）。 */
		function vkFileTreeToggle(path) {
			const k = normPath(path);
			const next = new Set();
			let wasOpen = false;
			for (const p of vkFileTreeState.expanded) {
				const pk = normPath(p);
				if (pk === k) { wasOpen = true; continue; }
				if (pk.startsWith(k + "\\") || pk.startsWith(k + "/")) continue;
				next.add(p);
			}
			if (!wasOpen) next.add(String(path));
			vkFileTreeSetExpanded(next);
			return !wasOpen;
		}
		// ── 栏目（section）折叠：两份独立状态（2026-09-11，用户要求）────────────────────
		// 形态：**默认全部折叠 + 一次只开一栏**（手风琴）。展开某栏时其他栏自动收起；
		// 点当前已展开的那一栏 = 全部收起。切走再切回来不会"记着"展开（用户明确口径）。
		// ① vkSectionState —— @ 菜单落地页的栏目。
		// ② vkHomeState    —— 左侧文件栏（项目栏）落地页的同样四个栏目，同一套形态。
		// 两份状态都不落盘：刷新页面即回到默认（全折叠）。
		const vkSectionState = { open: null, subs: new Set() }; // open = 当前展开的栏目名；null = 全折叠
		function vkSectionSubscribe(fn) {
			vkSectionState.subs.add(fn);
			return () => { vkSectionState.subs.delete(fn); };
		}
		/** 栏目是否展开（@ 落地页；默认为 null → 全折叠）。 */
		function vkSectionIsOpen(name) {
			return vkSectionState.open !== null && vkSectionState.open === String(name);
		}
		/** 切换栏目展开态（@ 落地页）：开一栏即收其他栏，返回切换后的状态。 */
		function vkSectionToggle(name) {
			const k = String(name);
			vkSectionState.open = vkSectionState.open === k ? null : k;
			for (const fn of [...vkSectionState.subs]) { try { fn(k); } catch { /* 订阅方可能已卸载 */ } }
			return vkSectionState.open === k;
		}
		const vkHomeState = { open: null, subs: new Set() }; // open = 当前展开的栏目名；null = 全折叠
		function vkHomeSubscribe(fn) {
			vkHomeState.subs.add(fn);
			return () => { vkHomeState.subs.delete(fn); };
		}
		/** 栏目是否展开（文件栏落地页；默认为 null → 全折叠）。 */
		function vkHomeIsOpen(name) {
			return vkHomeState.open !== null && vkHomeState.open === String(name);
		}
		/** 切换栏目展开态（文件栏落地页）：开一栏即收其他栏，返回切换后的状态。 */
		function vkHomeToggle(name) {
			const k = String(name);
			vkHomeState.open = vkHomeState.open === k ? null : k;
			vkDiagUI("home-toggle", k + " -> open=" + String(vkHomeState.open));
			for (const fn of [...vkHomeState.subs]) { try { fn(k); } catch { /* 订阅方可能已卸载 */ } }
			return vkHomeState.open === k;
		}
		/** 复位落地页栏目（reason 只用于诊断）：当前是「切走文件栏 / 卸载」两条路径。 */
		function vkHomeReset(reason) {
			const wasOpen = vkHomeState.open;
			vkHomeState.open = null;
			vkDiagUI("home-reset", reason + " wasOpen=" + String(wasOpen));
			for (const fn of [...vkHomeState.subs]) { try { fn(null); } catch { /* 订阅方可能已卸载 */ } }
		}
		// 本机桌面目录（本机若已重定向，按下面的常量改）：目录浏览器根视图里与磁盘同级列出的快捷入口，探测存在才显示
		const DESKTOP_HINT = "D:\\Desktop";
		/**
		 * 当前会话 id（**文件栏按会话隔离的唯一基准**，2026-09-12 用户口径「每个对话不共享文件栏」）。
		 * root 作用域插槽拿不到 props.sessionId（见 §5.2.1），一律现取 sessions 服务的快照。
		 * 取不到（插件刚加载 / 无会话面）时返回空串，调用方回落到一个与「无会话」等价的桶。
		 */
		function vkCurrentSessionId() {
			try {
				const snapshot = ctxRef.current.get("sessions").list.getSnapshot();
				return snapshot !== undefined && snapshot !== null && typeof snapshot.current === "string" ? snapshot.current : "";
			} catch { return ""; }
		}
		/** 文件栏两份列表（最近打开 / 文件列表）的落盘键：**按会话隔离**，键里带会话 id。 */
		function vkSessionKey(sid, kind) {
			return "dsh-vscode-layout:" + kind + ":v1:" + (typeof sid === "string" && sid.length > 0 ? sid : "none");
		}
		const RECENTS_MAX = 8;
		// 拖入文件的自动收件目录（~/.dsh/drop-inbox/<sessionId>）：这类路径本身是 UUID 乱码，
		// 在「最近打开」里用其内含的首个文件名做可辨识标签
		const DROP_INBOX_RE = /[\\/]\.dsh[\\/]drop-inbox[\\/][^\\/]+$/i;
		function isDropInboxDir(p) {
			return typeof p === "string" && DROP_INBOX_RE.test(p);
		}
		function dropDirLabel(p, e) {
			if (e && e.ok && Array.isArray(e.files) && e.files.length > 0) {
				const n = String(e.files[0].name || "").trim();
				if (n.length > 0) {
					const i = n.lastIndexOf(".");
					return "贴入 · " + (i > 0 ? n.slice(0, i) : n);
				}
			}
			return "贴入文件";
		}
		function landingLabel(p, e) {
			return isDropInboxDir(p) ? dropDirLabel(p, e) : pathBase(p);
		}
		/**
		 * 读「最近打开」：**按会话隔离**（键 = dsh-vscode-layout:recents:v1:<sessionId>）。
		 * @param sid - 会话 id；缺省现取当前会话。取不到会话时落进 "none" 桶（不与其他会话混）。
		 * 旧版全局键 RECENTS_KEY 不再读取——残留数据留给用户自己清，避免误删他手写的记录。
		 */
		function readRecents(sid) {
			const s = typeof sid === "string" && sid.length > 0 ? sid : vkCurrentSessionId();
			try {
				const raw = localStorage.getItem(vkSessionKey(s, "recents"));
				const arr = raw === null ? [] : JSON.parse(raw);
				// 读取即清洗：工作区/长期任务目录不进入「最近打开」（含历史残留数据）
				const kept = Array.isArray(arr)
					? arr.filter((p) => typeof p === "string" && p.length > 0 && !isHomeDirPath(p))
					: [];
				// 排重（含大小写/尾斜杠变体），保留首次出现顺序——重复路径会共享展开状态导致折叠错乱
				const seen = new Set();
				return kept.filter((p) => {
					const k = normPath(p);
					if (seen.has(k)) return false;
					seen.add(k);
					return true;
				}).slice(0, RECENTS_MAX);
			} catch {
				return [];
			}
		}
		function writeRecents(list, sid) {
			const s = typeof sid === "string" && sid.length > 0 ? sid : vkCurrentSessionId();
			try {
				const seen = new Set();
				const clean = (Array.isArray(list) ? list : []).filter((p) => {
					if (typeof p !== "string" || p.length === 0) return false;
					const k = normPath(p);
					if (seen.has(k)) return false;
					seen.add(k);
					return true;
				});
				localStorage.setItem(vkSessionKey(s, "recents"), JSON.stringify(clean.slice(0, RECENTS_MAX)));
			} catch {}
		}
		// ── 「文件列表」（第二轮新增）：文件栏那颗文件夹图标弹出的自适应浏览器里「点中文件」的落点 ——
		//    被点中的文件既在拓展栏打开，也在落地页单独成一组（工作区目录 / 最近打开 / 文件列表），方便回头再开。
		const FILE_LIST_KEY = "dsh-vscode-layout:filelist:v1";
		const FILE_LIST_MAX = 12;
		/** 读「文件列表」：与「最近打开」同一套**按会话隔离**的落盘（键 = dsh-vscode-layout:filelist:v1:<sessionId>）。 */
		function readFileList(sid) {
			const s = typeof sid === "string" && sid.length > 0 ? sid : vkCurrentSessionId();
			try {
				const raw = localStorage.getItem(vkSessionKey(s, "filelist"));
				const arr = raw === null ? [] : JSON.parse(raw);
				const seen = new Set();
				return (Array.isArray(arr) ? arr : []).filter((it) => {
					if (it === null || typeof it !== "object") return false;
					if (typeof it.path !== "string" || it.path.length === 0) return false;
					const k = normPath(it.path);
					if (seen.has(k)) return false;
					seen.add(k);
					return true;
				}).map((it) => ({ path: it.path, name: typeof it.name === "string" && it.name.length > 0 ? it.name : pathBase(it.path) })).slice(0, FILE_LIST_MAX);
			} catch {
				return [];
			}
		}
		function writeFileList(list, sid) {
			const s = typeof sid === "string" && sid.length > 0 ? sid : vkCurrentSessionId();
			try {
				const seen = new Set();
				const clean = (Array.isArray(list) ? list : []).filter((it) => {
					if (it === null || typeof it !== "object") return false;
					if (typeof it.path !== "string" || it.path.length === 0) return false;
					const k = normPath(it.path);
					if (seen.has(k)) return false;
					seen.add(k);
					return true;
				}).map((it) => ({ path: it.path, name: typeof it.name === "string" && it.name.length > 0 ? it.name : pathBase(it.path) }));
				localStorage.setItem(vkSessionKey(s, "filelist"), JSON.stringify(clean.slice(0, FILE_LIST_MAX)));
			} catch {}
		}
		// ──────────────────────────────────────────────────────────────
		// 文件图标（VS Code 式）：代码/数据类 = 按语言着色的字母徽章，
		// 媒体/压缩/二进制类 = emoji。徽章颜色在样式区按浅/深色双套定义
		// （body[data-ds-dark-theme] 覆盖），只改动 className，不改结构
		// ──────────────────────────────────────────────────────────────
		const FILE_ICONS = {
			js: ["JS", "Js"], mjs: ["JS", "Js"], cjs: ["JS", "Js"],
			ts: ["TS", "Ts"], mts: ["TS", "Ts"], cts: ["TS", "Ts"],
			jsx: ["atom", "svg"], tsx: ["atom", "svg"],
			vue: ["V", "Vue"], svelte: ["S", "Svelte"],
			py: ["Py", "Py"],
			json: ["{}", "Json"], jsonc: ["{}", "Json"],
			html: ["<>", "Html"], htm: ["<>", "Html"], xml: ["<>", "Xml"], svg: ["<>", "Svg"],
			css: ["#", "Css"], scss: ["#", "Scss"], sass: ["#", "Scss"], less: ["#", "Less"],
			md: ["Md", "Md"], markdown: ["Md", "Md"],
			yml: ["Y", "Yaml"], yaml: ["Y", "Yaml"],
			sh: ["terminal", "svg"], bash: ["terminal", "svg"], zsh: ["terminal", "svg"], ps1: ["terminal", "svg"], bat: ["terminal", "svg"], cmd: ["terminal", "svg"],
			toml: ["gear", "svg"], ini: ["gear", "svg"], cfg: ["gear", "svg"], conf: ["gear", "svg"], env: ["gear", "svg"], properties: ["gear", "svg"],
			txt: ["Txt", "Txt"], log: ["Txt", "Txt"],
			sql: ["DB", "Sql"], graphql: ["Gql", "Gql"], gql: ["Gql", "Gql"],
			rs: ["Rs", "Rs"], go: ["Go", "Go"], java: ["Jv", "Java"],
			c: ["C", "C"], h: ["C", "C"],
			cpp: ["C+", "Cpp"], cc: ["C+", "Cpp"], cxx: ["C+", "Cpp"], hpp: ["C+", "Cpp"], cs: ["C#", "Cs"],
			rb: ["Rb", "Rb"], php: ["Php", "Php"], kt: ["K", "Kt"], kts: ["K", "Kt"], swift: ["Sw", "Swift"],
			lua: ["Lu", "Lua"], r: ["R", "R"], wasm: ["W", "Wasm"],
			woff: ["A", "Font"], woff2: ["A", "Font"], ttf: ["A", "Font"], otf: ["A", "Font"], eot: ["A", "Font"],
			exe: ["box", "svg"], dll: ["box", "svg"], bin: ["box", "svg"], dat: ["box", "svg"], msi: ["box", "svg"],
			png: ["image", "svg"], jpg: ["image", "svg"], jpeg: ["image", "svg"], gif: ["image", "svg"], webp: ["image", "svg"],
			bmp: ["image", "svg"], ico: ["image", "svg"], icns: ["image", "svg"], avif: ["image", "svg"],
			mp4: ["video", "svg"], mov: ["video", "svg"], avi: ["video", "svg"], mkv: ["video", "svg"], webm: ["video", "svg"],
			mp3: ["music", "svg"], wav: ["music", "svg"], ogg: ["music", "svg"], flac: ["music", "svg"],
			zip: ["archive", "svg"], tar: ["archive", "svg"], gz: ["archive", "svg"], rar: ["archive", "svg"], "7z": ["archive", "svg"], bz2: ["archive", "svg"], xz: ["archive", "svg"],
			pdf: ["fileText", "svg"], lock: ["lock", "svg"],
			vsd: ["Vi", "Visio"], vsdx: ["Vi", "Visio"], vsdm: ["Vi", "Visio"]
		};
		const FILE_ICON_NAMES = {
			"package.json": ["box", "svg"], ".npmrc": ["box", "svg"], ".nvmrc": ["box", "svg"],
			"package-lock.json": ["lock", "svg"], "yarn.lock": ["lock", "svg"], "pnpm-lock.yaml": ["lock", "svg"],
			"tsconfig.json": ["TS", "Ts"],
			"dockerfile": ["box", "svg"], "docker-compose.yml": ["box", "svg"], "docker-compose.yaml": ["box", "svg"], ".dockerignore": ["box", "svg"],
			"makefile": ["tool", "svg"], "cmakelists.txt": ["tool", "svg"],
			"license": ["fileText", "svg"], "license.md": ["fileText", "svg"], "license.txt": ["fileText", "svg"],
			".gitignore": ["gitBranch", "svg"], ".gitattributes": ["gitBranch", "svg"], ".gitmodules": ["gitBranch", "svg"]
		};
		function iconOf(name, isDir, expanded) {
			if (isDir) return { svg: expanded ? "folderOpen" : "folder" };
			const lower = String(name).toLowerCase();
			const hit = FILE_ICON_NAMES[lower] ?? FILE_ICONS[lower.includes(".") ? lower.split(".").pop() : ""];
			if (hit) {
				if (hit[1] === "svg") return { svg: hit[0] };
				return { g: hit[0], c: "vk_iconChip vk_i" + hit[1] };
			}
			return { svg: "file" };
		}
		// 渲染文件图标：字母徽章 = 彩色文本 chip；其余 = 单色线性 SVG 图标
		function renderFileIcon(ic) {
			if (ic.svg) return h("span", { className: "vk_icon vk_iconSvg" }, h(VIcon, { name: ic.svg, size: 14 }));
			return h("span", { className: "vk_icon " + ic.c }, ic.g);
		}

		// ──────────────────────────────────────────────────────────────
		// 样式
		// ──────────────────────────────────────────────────────────────
		const css = [
			// ── 骨架与三栏 ─────────────────────────────────────────────
			// --vk-accent：官方主题未提供 --dsw-alias-accent（此前引用全部落空），
			// 回退到 --dsw-alias-state-business-primary（DeepSeek 蓝，浅/深自适应）
			// 2026-09-11 修复（用户报「打开按键看不见了」）：这三个变量原先只挂在 `.vk_frame` 上，
			// 路线 A 之后自研视图改挂官方框架，实测页面里 `.vk_frame` 数量 = 0 → 变量**全树落空**：
			// 主按钮 .vk_primaryBtn 的 background:var(--vk-accent) 解析为空 → 透明，深色底上只剩白字
			// （禁用态再乘 .45 基本看不见）；.vk_modeBtn/.vk_personaSave/.vk_editBtnPrimary 同病，
			// rail/tab 选中态的 accent 描边也一起丢。故把定义抬到 :root 与 body（body 覆盖浮层宿主）。
			":root,body{--vk-accent:var(--dsw-alias-accent,var(--dsw-alias-state-business-primary));--vk-accent-ring:color-mix(in srgb,var(--vk-accent) 22%,transparent);--vk-accent-soft:color-mix(in srgb,var(--vk-accent) 12%,transparent)}",
			".vk_frame{background:var(--dsw-alias-bg-base);height:100%;display:grid;grid-template-rows:100%;position:relative;overflow:hidden;--vk-accent:var(--dsw-alias-accent,var(--dsw-alias-state-business-primary));--vk-accent-ring:color-mix(in srgb,var(--vk-accent) 22%,transparent);--vk-accent-soft:color-mix(in srgb,var(--vk-accent) 12%,transparent)}",
			".vk_frame[data-native] .vk_colRight{border-left:none}",
			".vk_frame[data-dragging]{user-select:none;cursor:col-resize}",
			".vk_colRight{border-left:1px solid var(--dsw-alias-border-l2);min-width:0;overflow:hidden;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base)}",
			".vk_reconnectHint{align-self:center;flex:none;font-size:12px;font-weight:600;line-height:16px;white-space:nowrap;color:var(--dsw-alias-state-warn-primary,#e0a63c);padding:4px 13px;border-radius:999px;background:rgba(224,166,60,.14);animation:vkReconnectIn .22s ease-out}",
			"@keyframes vkReconnectIn{from{opacity:0}to{opacity:1}}",
			// 断连期间的手动恢复按钮（后端重启后 WS 会自己重连，但个别情况需要整页重载；
			// 桌面外壳 dsh-desktop 已加"加载失败自动重试"，这里再给一个免 Ctrl+F5 的入口）
			".vk_reloadBtn{align-self:center;flex:none;cursor:pointer;font-size:12px;line-height:16px;padding:4px 12px;margin-left:6px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:0 0;color:var(--dsw-alias-label-primary);font-family:inherit}",
			".vk_reloadBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			// 拖拽手柄：悬停/拖动时浮现 accent 亮条
			".vk_handle{cursor:col-resize;z-index:2;touch-action:none;width:8px;margin-left:-4px;position:absolute;top:0;bottom:0}",
			".vk_handle::after{content:'';position:absolute;top:0;bottom:0;left:3px;width:2px;border-radius:1px;background:transparent;transition:background-color .15s}",
			".vk_handle:hover::after,.vk_handle[data-dragging]::after{background:var(--vk-accent)}",
			// ── 滚动条：细、半透明、贴主题；标签条隐藏但可滚 ─────────────
			".vk_tree,.vk_viewer,.vk_editorInput{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l1) transparent}",
			".vk_tree::-webkit-scrollbar,.vk_viewer::-webkit-scrollbar,.vk_editorInput::-webkit-scrollbar{width:10px;height:10px}",
			".vk_tree::-webkit-scrollbar-thumb,.vk_viewer::-webkit-scrollbar-thumb,.vk_editorInput::-webkit-scrollbar-thumb{background:var(--dsw-alias-scrollbar-bg-l1);border:3px solid transparent;border-radius:6px;background-clip:padding-box;min-height:40px}",
			".vk_tree::-webkit-scrollbar-thumb:hover,.vk_viewer::-webkit-scrollbar-thumb:hover,.vk_editorInput::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-scrollbar-hover-l1);border:3px solid transparent;background-clip:padding-box}",
			".vk_tree::-webkit-scrollbar-track,.vk_viewer::-webkit-scrollbar-track,.vk_editorInput::-webkit-scrollbar-track,.vk_tree::-webkit-scrollbar-corner,.vk_viewer::-webkit-scrollbar-corner,.vk_editorInput::-webkit-scrollbar-corner{background:transparent}",
			// ── 面板 Tab 栏（左：文件/会话；右：对话/详情） ──────────────
			".vk_tabBar{display:flex;align-items:stretch;flex:none;min-width:0;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-sidebar-fill);container-type:inline-size}@container (width<=560px){.vk_reconnectHint{max-width:8em;overflow:hidden;text-overflow:ellipsis}.vk_modeBtn{padding:4px 9px;margin:0 6px 0 2px;font-size:11px}}@container (width<=460px){.vk_reconnectHint{display:none}}@container (width<=400px){.vk_tabBtn{padding:7px 8px}.vk_reloadBtn{padding:4px 8px;margin-left:4px}}",
			".vk_tabBtn{appearance:none;border:none;background:none;cursor:pointer;color:var(--dsw-alias-label-secondary);padding:7px 12px;font-size:12px;line-height:16px;font-family:inherit;position:relative;border-bottom:2px solid transparent;transition:color .12s,background-color .12s,border-color .12s;display:inline-flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap}",
			// 左栏过窄时「会话/文件/任务」由文字换成图标（2026-09-11 实测临界值：
			// tabBar 宽 268px 时恰好放得下 3 个文字 tab + 重启 + 2 个图标按钮，240px 起
			// 文字就换行成两行、180px 起成三行）。阈值取 264px：略低于临界即切图标，
			// 图标态总宽约 210px，窄栏也不会再折行；宽态外观完全不变（仍只有文字）。
			// container query 匹配的是最近的祖先容器 = .vk_tabBar（它声明了 container-type）。
			".vk_tabGlyph{display:none;flex:none}",
			".vk_tabText{white-space:nowrap}",
			"@container (width<=264px){.vk_tabBtn{padding:7px 8px}.vk_tabText{display:none}.vk_tabGlyph{display:inline-flex;align-items:center}}",
			".vk_tabBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}",
			// 忙态（重启中）文字与空闲态相同，靠禁用变暗区分
			".vk_tabBtn:disabled{color:var(--dsw-alias-label-dimmed,var(--dsw-alias-label-secondary));opacity:.55;cursor:default;background:none}",
			".vk_tabBtnActive{color:var(--dsw-alias-label-primary);border-bottom-color:var(--vk-accent)}",
			".vk_tabBody{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}",
			".vk_tabBarSpacer{flex:1}",
			// ── 右栏查看器 tab 正文（路线 A：Office 转换 / 网页）────────────
			".vk_viewerTab{width:100%;height:100%;display:flex;flex-direction:column;min-height:0}",
			".vk_viewerBar{display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:11.5px;color:var(--dsw-alias-label-tertiary);border-bottom:0.5px solid var(--dsw-alias-border-l3);flex:none;min-width:0}",
			".vk_viewerFrame{flex:1;min-height:0;width:100%;border:0;background:var(--dsw-alias-bg-base)}",
			// ── rail 窄条（左栏收起态）：图标 + accent 指示条 ────────────
			".vk_rail{align-items:center;padding:10px 0;gap:4px}",
			".vk_railBtn{appearance:none;border:none;background:none;cursor:pointer;width:38px;height:38px;border-radius:9px;font-size:17px;line-height:1;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;justify-content:center;position:relative;transition:background-color .12s,color .12s,transform .08s}",
			".vk_railBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_railBtn:active{transform:scale(.93)}",
			".vk_railBtnActive{background:var(--vk-accent-soft);color:var(--vk-accent)}",
			// 窄轨里的重启按钮 arming 态（Tab 条那条 .vk_tabBtnArm 只作用于 vk_tabBtn，这里补一条）
			".vk_railBtn.vk_railArm{color:var(--dsw-alias-state-error-primary)}",
			// 窄轨按钮的禁用态（重启 busy）：窄态没有文字，靠变暗表达「正在重启、不可点」
			".vk_railBtn:disabled{cursor:default;opacity:.45}",
			".vk_railBtn:disabled:hover{background:none;color:var(--dsw-alias-label-secondary)}",
			".vk_railBtnActive::before{content:'';position:absolute;left:-9px;top:9px;bottom:9px;width:3px;border-radius:2px;background:var(--vk-accent)}",
			// ── 文件树头部与工具按钮 ───────────────────────────────────
			".vk_treeWrap{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}",
			".vk_treeHead{display:flex;align-items:center;gap:2px;flex:none;padding:7px 6px 7px 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}",
			".vk_treeTitle{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}",
			".vk_treeBtn{appearance:none;border:none;background:none;cursor:pointer;width:24px;height:24px;padding:0;border-radius:6px;font-size:13px;line-height:1;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;justify-content:center;flex:none;transition:background-color .12s,color .12s}",
			".vk_treeBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_treeBtnActive{background:var(--vk-accent-soft);color:var(--vk-accent)}",
			".vk_treeBtn:disabled{opacity:.35;cursor:not-allowed}",
			".vk_treeBtn:disabled:hover{background:none;color:var(--dsw-alias-label-secondary)}",
			// ── 表单（打开文件夹/新建/重命名/搜索） ─────────────────────
			".vk_pickForm{padding:8px;display:flex;flex-direction:column;gap:6px;border-bottom:1px solid var(--dsw-alias-border-l1)}",
			".vk_pickInput{box-sizing:border-box;width:100%;background:var(--dsw-specific-input-major);border:1px solid var(--dsw-alias-border-l2);border-radius:6px;color:var(--dsw-alias-label-primary);font-size:12px;padding:6px 9px;outline:none;font-family:inherit;transition:border-color .12s,box-shadow .12s}",
			".vk_pickInput:hover{border-color:var(--dsw-alias-border-l3)}",
			".vk_pickInput:focus{border-color:var(--vk-accent);box-shadow:0 0 0 2px var(--vk-accent-ring)}",
			".vk_pickInput::placeholder{color:var(--dsw-alias-label-tertiary)}",
			".vk_row .vk_pickInput{padding:3px 8px}",
			".vk_pickErr{font-size:11px;line-height:15px;color:var(--dsw-alias-state-error-primary);padding:0 2px}",
			".vk_pickRow{display:flex;gap:6px;justify-content:flex-end;min-width:0;container-type:inline-size}@container (width<=360px){.vk_pickBtn{padding:4px 8px;font-size:11px}}",
			".vk_pickBtn{appearance:none;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:6px;font-size:12px;padding:4px 12px;font-family:inherit;transition:background-color .12s,border-color .12s,color .12s}",
			".vk_pickBtn:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3)}",
			// 模式切换胶囊（accent 实心；右栏「全屏对话/分栏视图」与「新建文件/文件夹」切换复用。
			// 位置须在 .vk_pickBtn/.vk_tabBtn 之后：同级特异性下靠后者覆盖底色与圆角）
			".vk_modeBtn{align-self:center;background:var(--vk-accent);color:#fff;border-radius:999px;padding:4px 13px;margin:0 8px 0 4px;border-bottom:none;font-weight:600;line-height:16px;letter-spacing:.2px;box-shadow:0 1px 3px rgba(0,0,0,.18);transition:filter .12s,box-shadow .12s,color .12s,background-color .12s}",
			".vk_modeBtn:hover{color:#fff;background:var(--vk-accent);filter:brightness(1.1);box-shadow:0 2px 8px var(--vk-accent-ring)}",
			".nL4_yW_sessionLogButton{display:none!important}",
			// 重启按钮改由本插件的容器渲染：宽态 = Tab 条里的 VK_RestartControl，窄轨 = .vk_rail 里的
			// ⟳ 图标（同一状态机，见 VK_RestartControl 的 rail 形态）。2026-09-12 用户要求：左栏收起时
			// 官方会话头那颗会冒到会话栏上方，与自研入口重复（原先只在有 Tab 条时隐藏），
			// 现在**两种自研容器任一存在都隐藏官方那颗**；只有自研布局整个没渲染时才回退显示它。
			"body:has(.vk_tabBar) .drb-btn{display:none!important}",
			"body:has(.vk_rail) .drb-btn{display:none!important}",
			".vk_tabBtnArm:not(.vk_tabBtnActive){color:var(--dsw-alias-state-error-primary)}",
			".wSkVaW_root[data-phase=hero] .wSkVaW_scrollBody{justify-content:flex-start!important}",
			".wSkVaW_root[data-phase=hero] .wSkVaW_composerSeat{flex:1 1 auto!important}",
			".wSkVaW_root[data-phase=hero] .wSkVaW_composerHero{flex:1 1 auto!important}",
			".wSkVaW_root[data-phase=hero] .pXSMma_root{height:auto!important;flex:none!important;padding-top:64px!important}",
			".wSkVaW_root[data-phase=hero] .wSkVaW_heroWorkspaceRow{margin-top:auto!important}",
			// ── 文件树行：缩进参考线 / 图标 / 悬停与选中层次 ─────────────
			".vk_tree{flex:1;min-height:0;overflow:auto;padding:4px 0}",
			".vk_row{position:relative;display:flex;align-items:center;gap:5px;padding:2px 8px 2px 4px;cursor:pointer;font-size:13px;line-height:22px;white-space:nowrap;user-select:none;transition:background-color .1s}",
			".vk_row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".vk_rowActive{background:var(--vk-accent-soft)}",
			// 选中态（第三轮 B 项）：单击 = 选中，底纹 + 一圈 accent 描边；正在拓展栏打开的那一行
			// （vk_rowActive）保留 accent 实底，两者同时存在时以「已打开」为准。
			".vk_rowSelected{background:var(--dsw-alias-interactive-bg-hover);box-shadow:inset 0 0 0 1px var(--vk-accent-ring)}",
			".vk_rowSelected.vk_rowActive{background:var(--vk-accent-soft)}",
			".vk_openErr{padding:6px 10px;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-error,#d9534f);background:var(--vk-accent-soft);border-bottom:0.5px solid var(--dsw-alias-border-l3);flex:none;word-break:break-all}",
			// 官方品牌行右侧那颗「收起侧边栏」按钮：自研 Tab 条右端已有同功能按钮，用户明确不要这一颗。
			// 只在**自研 Tab 条存在时**（= 官方宽态）隐藏——官方收起态里那颗是唯一的展开入口，必须留着。
			// 用 :has 而不是给官方组件加类：官方 CSS module 的类名带哈希，只能按 `_logoRow`/`_toggle` 后缀匹配。
			"body:has(.vk_tabBar) [class*=\"_logoRow\"]>[class*=\"_toggle\"]{display:none}",
			".vk_rowActive:hover{background:var(--vk-accent-ring)}",
			".vk_rowHidden{opacity:.55}",
			".vk_guide{position:absolute;top:0;bottom:0;width:0;border-left:1px solid var(--dsw-alias-border-l2)}",
			".vk_row:hover .vk_guide{border-left-color:var(--dsw-alias-border-l3)}",
			".vk_caret{width:14px;flex:none;color:var(--dsw-alias-label-tertiary);text-align:center;font-size:10px}",
			// 左侧三角现在是**唯一的展开/收起入口**（单击行改成了「选中 / 再点一次进入」，见 B 项）
			".vk_caretBtn{cursor:pointer;border-radius:4px}",
			".vk_caretBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_name{overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-primary)}",
			".vk_dirName{font-weight:500}",
			".vk_relPath{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:11px;color:var(--dsw-alias-label-tertiary)}",
			".vk_nameFixed{flex:none}",
			".vk_rowActions{display:none;flex:none;margin-left:4px;align-items:center;gap:2px}",
			// 行右端那一组按钮（「进入子目录」常显按钮 + hover 才出的重命名/删除）整块靠右：
			// 用一层 tail 兜住，避免给两个兄弟节点同时 margin-left:auto 把空白平均分掉。
			".vk_rowTail{display:flex;align-items:center;gap:2px;flex:none}",
			".vk_row:not(:has(.vk_gitBadge)) .vk_rowTail{margin-left:auto}",
			".vk_rowTail .vk_rowActions{margin-left:0}",
			".vk_row:hover .vk_rowActions{display:flex}",
			".vk_rowBtn{appearance:none;border:none;background:none;cursor:pointer;font-size:11px;width:20px;height:20px;padding:0;border-radius:5px;line-height:1;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;justify-content:center;transition:background-color .1s,color .1s}",
			".vk_rowBtn:hover{background:var(--dsw-alias-interactive-bg-hover-accent);color:var(--dsw-alias-label-primary)}",
			// 真删除（送回收站）那颗：悬停染成告警色，和上面那颗「仅移出列表」的垃圾桶区分开
			".vk_rowBtnDanger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e5534b) 16%,transparent);color:var(--dsw-alias-state-error-primary,#e5534b)}",
			".vk_hiddenHint{padding:3px 12px;font-size:11px;color:var(--dsw-alias-label-tertiary);cursor:default;white-space:nowrap;font-style:italic}",
			// ── 应用内「打开文件夹」目录浏览器弹窗 ──────────────────────
			// z-index：官方 @ 菜单自身是 z-index:100（dsh-client-ui-input-trigger 的 ._3e4SsG_menu），
			// 官方 UI 里最高的浮层是 1100。原来这里是 90 → **@ 菜单浮在弹窗之上**，正好压在卡片上半截，
			// 就是用户 2026-09-13 报的「@ 列表搜索框还是存在遮挡关系」。取 1200 让它置顶到所有官方浮层之上。
			".vk_browseOverlay{position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.38);display:flex;align-items:center;justify-content:center;padding:24px;animation:vkFadeIn .12s ease-out}",
			// 固定尺寸（2026-09-12 用户要求：点开文件夹后不能变大，弹窗自始至终一个大小）：
			// 卡片给死高度、内容区只滚不撑 —— 条数少（磁盘列表）与条数多（文件夹里几十项）都是同一块框。
			// 高度取 300px = 「刚打开那一屏」的自然高度（头部 + 路径行 + 磁盘/桌面约 5 行条目 ≈ 285px），
			// 也就是用户口径里的「原来那个刚进搜索栏的大小」；480px 那种大框会顶到窗口边缘被遮挡。
			// --vk-browse-dx：水平对齐偏移（2026-09-13 用户要求「相对对话框水平居中」）。
			// 浮层模式由 VK_BrowseModal 按锚点算出像素值写成内联变量；嵌入式不设 → 默认 0px，行为不变。
			// transform 既写在常规态（动画结束后由它生效）也写进 vkBrowseIn（动画期间不丢偏移）。
			".vk_browseCard{width:min(520px,94vw);height:min(300px,72vh);max-height:min(300px,72vh);background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:var(--dsw-shadow-lv3),0 24px 60px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;transform:translateX(var(--vk-browse-dx,0px));animation:vkBrowseIn .14s cubic-bezier(.2,.7,.3,1)}",
			".vk_browseHead{display:flex;align-items:center;gap:8px;padding:11px 12px 10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}",
			".vk_browseTitle{flex:1;min-width:0;font-size:13px;font-weight:600;letter-spacing:.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
			".vk_iconBtn{appearance:none;border:none;background:none;cursor:pointer;color:var(--dsw-alias-label-tertiary);padding:0;width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex:none;transition:background-color .1s,color .1s,transform .08s}",
			".vk_iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_iconBtn:active{transform:scale(.94)}",
			".vk_iconBtnOn{color:var(--vk-accent)}",
			".vk_iconBtnOn:hover{color:var(--vk-accent)}",
			".vk_browsePathRow{display:flex;gap:6px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}",
			".vk_browsePathRow .vk_pickInput{flex:1;min-width:0}",
			".vk_browsePathIcon{display:flex;color:var(--dsw-alias-label-tertiary);flex:none}",
			".vk_crumbs{display:flex;align-items:center;gap:1px;overflow-x:auto;scrollbar-width:none;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12px;user-select:none}",
			".vk_crumbs::-webkit-scrollbar{display:none}",
			".vk_crumb{display:inline-flex;align-items:center;gap:1px;padding:2px 5px;border-radius:5px;white-space:nowrap;color:var(--dsw-alias-label-tertiary)}",
			".vk_crumb:not(.vk_crumbCur){cursor:pointer}",
			".vk_crumb:not(.vk_crumbCur):hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_crumbCur{color:var(--dsw-alias-label-primary);font-weight:600}",
			".vk_crumbsSpacer{flex:1;min-width:8px}",
			".vk_crumbsBack{margin-left:auto}",
			// 内容区：只负责滚动，不再用 max-height 让卡片跟着内容长高（尺寸由 .vk_browseCard 定死）
			".vk_browseBody{flex:1;min-height:0;overflow:auto;padding:6px;display:flex;flex-direction:column;gap:1px}",
			".vk_browseErr{margin:2px 4px 4px;padding:7px 10px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 9%,transparent);color:var(--dsw-alias-state-error-primary);border-radius:7px;font-size:12px;line-height:16px;flex:none}",
			".vk_browseHint{display:flex;align-items:center;justify-content:center;gap:6px;padding:20px 10px;font-size:12px;color:var(--dsw-alias-label-tertiary);text-align:center}",
			".vk_browseRow{display:flex;align-items:center;gap:9px;padding:4px 10px;line-height:24px;font-size:13px;color:var(--dsw-alias-label-primary);cursor:pointer;border-radius:7px;white-space:nowrap;user-select:none;flex:none}",
			".vk_browseRow:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".vk_browseRowIcon{display:flex;color:var(--dsw-alias-label-tertiary);flex:none;transition:color .1s}",
			".vk_browseRow:hover .vk_browseRowIcon{color:var(--dsw-alias-label-primary)}",
			".vk_browseRow .vk_name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis}",
			".vk_browseRowUp{color:var(--dsw-alias-label-secondary)}",
			// 选中态（第三轮 B 项）：单击选中（底纹 + accent 描边），再点一次才动作
			".vk_browseRowSelected{background:var(--dsw-alias-interactive-bg-hover);box-shadow:inset 0 0 0 1px var(--vk-accent-ring)}",
			".vk_browseRowEnter{flex:none;width:20px;height:20px}",
			".vk_browseRowSelected .vk_browseOpenHint{opacity:1}",
			".vk_browseRowHidden{opacity:.55}",
			".vk_browseShowHidden{color:var(--dsw-alias-label-tertiary);font-size:12px}",
			// 文件行（"打开本机文件"弹窗的文件模式）：与目录行同款，光标给 pointer，末端的回车提示常显
			".vk_browseFileRow{color:var(--dsw-alias-label-primary)}",
			".vk_browseFileRow .vk_name{flex:0 1 auto}",
			".vk_browseOpenHint{flex:none;margin-left:auto;font-size:10.5px;line-height:16px;padding:0 6px;border-radius:999px;background:var(--vk-accent-soft);color:var(--vk-accent);opacity:0;transition:opacity .12s}",
			".vk_browseFileRow:hover .vk_browseOpenHint{opacity:1}",
			// ── @ 列表右上角：「搜索本机文件」放大镜（2026-09-12 用户要求，从对话框工具行搬到这里） ──
			// 绝对定位钉在官方 @ 菜单容器（[data-trigger-menu]）的右上角；按钮本体是原生 DOM，
			// 由 vkInstallAtSearchButton 注入（原因见那里的长注释：菜单是官方 React 树，插不进去）。
			"[data-trigger-menu] .vk_atSearchBtn{position:absolute;top:5px;right:5px;z-index:3;appearance:none;border:none;background:none;cursor:pointer;width:24px;height:24px;padding:0;border-radius:6px;color:var(--dsw-alias-label-tertiary);display:flex;align-items:center;justify-content:center;transition:background-color .12s,color .12s}",
			"[data-trigger-menu] .vk_atSearchBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			"[data-trigger-menu] .vk_atSearchBtn.vk_atSearchBtnOn{background:var(--vk-accent-soft);color:var(--vk-accent)}",
			// @ 菜单里「单击选中」的描边高亮：与弹窗 .vk_browseRowSelected 同款（底纹 + accent 内描边）。
			// 官方候选行是 role=option 的按钮（容器带 data-trigger-menu），候选对象没有样式字段，
			// 选中态只能由本插件在 DOM 上标类（见 vkAtMarkPicked）。
			"[data-trigger-menu] [role=option].vk-at-picked{background:var(--dsw-alias-interactive-bg-hover)!important;box-shadow:inset 0 0 0 1px var(--vk-accent-ring);border-radius:8px}",
			// 浏览态第一行「↑ 返回上一级」：position:sticky 钉在菜单顶部，滚动时不动（用户口径：随时能点返回）。
			// 必须有实底背景，否则下面的行会从它底下透出来；sticky 的参照就是官方 listbox 那个滚动视口。
			"[data-trigger-menu] [role=option].vk-at-pinned{position:sticky;top:0;z-index:2;background:var(--dsw-specific-menu);border-bottom:1px solid var(--dsw-alias-border-l1)}",
			// 标签正文内嵌（拓展栏「打开本机文件」）：不浮层、不遮罩，改成**居中卡片**（高度约栏高 1/3，
			// 内容超出时卡片内部滚动）。原先铺满整列（height:100%）会把「只有几行目录」的内容拉成一大片空白，
			// 上下顶到栏的两端，观感很差；改成自适应高度（flex:0 1 auto）+ 上限 22vh 后：内容少则卡片矮、
			// 内容多则卡片内部滚动，卡片始终竖向居中。
			".vk_browseEmbed{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:12px;overflow:hidden}",
			// 内嵌（拓展栏标签正文）形态：这条**不受上面那个固定高度管**，卡片按内容自适应（height:auto 覆盖），
			// 否则几行目录会被 480px 的框拉出一大片空白。
			".vk_browseCardEmbed{width:100%;max-width:520px;height:auto;max-height:100%;border-radius:12px;box-shadow:var(--dsw-shadow-lv3)}",
			".vk_browseCardEmbed .vk_browseBody{flex:0 1 auto;min-height:0;max-height:min(22vh,230px)}",
			// 官方 sidebar.footer.action 是 **list 槽**，容器默认按一行横排；自研那三块 dock（钱包 dsw-dock /
			// 移动端访问 dwa-dock / 局域网服务 dls-dock）都是「整宽一行」的设计，横排会互相挤，
			// 实测后两块被顶到侧栏之外（局域网服务渲染在 x=378，而侧栏只有 280px 宽）。
			// 改成竖向排列后实测：三块各占一行、x=12、宽 256（侧栏 280 − 两侧 12），与设置行左右边距对齐。
			// 注意槽里那个匿名包裹层是 `display:contents`（不生成盒子），所以槽的直接子元素在**盒子树**里
			// 就是这几块 dock——用后代选择器（不要用 `>`，DOM 上它们是孙节点）兜住宽度。
			"[class*=_footerActions]{flex-direction:column;align-items:stretch;gap:0}",
			"[class*=_footerActions] [class*=dsw-dock],[class*=_footerActions] [class*=dwa-dock],[class*=_footerActions] [class*=dls-dock]{width:100%;min-width:0;box-sizing:border-box}",
			// 官方把左栏收成窄轨后（自研 Body 拿到 wide=false，渲染 .vk_rail），官方 sidebar.footer.action 槽
			// **照样渲染**：实测窄态 footerActions 落在 x=-68 / 宽 191（侧栏只剩 55px），
			// 「移动端访问」dwa-dock 与「局域网服务」dls-dock 整块横在栏外压到对话栏上（钱包 dsw-rail 同理）。
			// 官方收起是它自己 layout.toggleSidebar 的决策，自研只能跟着表现 → 用 :has(.vk_rail) 兜底整槽隐藏；
			// 官方自己的「设置」在 settingsArea（不在此槽内），窄轨下照常显示。
			"body:has(.vk_rail) [class*=_footerActions]{display:none}",
			// 左侧栏 Tab 条最右端那颗图标按钮（收起侧栏）
			".vk_tabBtnIcon{width:26px;padding:0;justify-content:center}",
			// 会话头部右上角的「打开/收起拓展栏」按钮：观感对齐官方那颗图标按钮
			// （官方 = 28px 圆形、label-secondary、hover 加一层交互底色）
			".vk_rightToggle{appearance:none;border:none;background:none;cursor:pointer;width:28px;height:28px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:0;color:var(--dsw-alias-label-secondary);transition:background-color .12s,color .12s,transform .08s}",
			".vk_rightToggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_rightToggle:active{transform:scale(.94)}",
			".vk_rightToggleOn{color:var(--vk-accent)}",
			".vk_rightToggleOn:hover{color:var(--vk-accent)}",
			// 兜底去重：官方那颗展开按钮若也出现（同一角），我们的按钮在就不要它（会变成两颗一样的图标）
			"body:has([data-vk-right-toggle]) [data-sidebar-right-expand]{display:none!important}",
			// ── 拓展栏「上下分界」：下半是命令行面板（2026-09-12）────────────────────────
			// 分隔**不靠样式表**：上半让位走 `右栏列.style.paddingBottom = <px>`（JS 内联），
			// 面板高度也全部内联，CSS 只管面板内部的观感，不做任何尺寸决策。
			// 顶栏第 4 颗按钮（与官方两颗、自研拓展栏开关并排）
			".vk_cmdChromeBtn{appearance:none;border:none;background:none;cursor:pointer;width:28px;height:28px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:0;color:var(--dsw-alias-label-secondary);transition:background-color .12s,color .12s,transform .08s}",
			".vk_cmdChromeBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_cmdChromeBtn:active{transform:scale(.94)}",
			".vk_cmdChromeBtnOn{color:var(--vk-accent)}",
			".vk_cmdChromeBtnOn:hover{color:var(--vk-accent)}",
			".vk_cmdPanel{display:flex;flex-direction:column;min-height:0;height:100%;box-sizing:border-box;background:var(--dsw-alias-bg-base);border-top:1px solid var(--dsw-alias-border-l1);pointer-events:auto}",
			".vk_cmdHandle{position:absolute;left:0;right:0;top:-4px;height:8px;cursor:row-resize;touch-action:none;z-index:6}",
			".vk_cmdHandle::after{content:'';position:absolute;left:0;right:0;top:3px;height:2px;background:transparent;transition:background-color .12s}",
			".vk_cmdHandle:hover::after,.vk_cmdHandle[data-dragging]::after{background:var(--vk-accent)}",
			".vk_cmdHead{display:flex;align-items:center;gap:6px;flex:none;height:30px;padding:0 6px 0 10px;border-bottom:1px solid var(--dsw-alias-border-l1)}",
			".vk_cmdTitle{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--dsw-alias-label-secondary);flex:none}",
			".vk_cmdCwd{flex:1;min-width:0;font-size:11px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:ui-monospace,'Cascadia Mono',Consolas,monospace}",
			".vk_cmdBadge{flex:none;font-size:11px;padding:1px 7px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);white-space:nowrap}",
			".vk_cmdDiag{flex:none;max-width:46%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10.5px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-family:ui-monospace,'Cascadia Mono',Consolas,monospace;opacity:.85}",
			".vk_cmdIconBtn{appearance:none;border:none;background:none;cursor:pointer;flex:none;width:24px;height:24px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;padding:0;color:var(--dsw-alias-label-secondary)}",
			".vk_cmdIconBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_cmdIconBtn:disabled{opacity:.4;cursor:default}",
			".vk_cmdIconBtn:disabled:hover{background:none;color:var(--dsw-alias-label-secondary)}",
			".vk_cmdTextBtn{appearance:none;border:none;background:none;cursor:pointer;flex:none;height:24px;padding:0 8px;border-radius:6px;font-family:inherit;font-size:12px;color:var(--dsw-alias-label-secondary)}",
			".vk_cmdTextBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_cmdIconBtn:focus-visible,.vk_cmdTextBtn:focus-visible,.vk_cmdInput:focus-visible{outline:2px solid var(--vk-accent-ring);outline-offset:-2px}",
			".vk_cmdBody{flex:1;min-height:0;overflow:auto;padding:6px 0 8px;font-family:ui-monospace,'Cascadia Mono',Consolas,'Courier New',monospace;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-primary);user-select:text}",
			".vk_cmdOut{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;font-family:inherit;font-size:inherit;padding:0 10px}",
			".vk_cmdOutErr{color:var(--dsw-alias-state-error-primary)}",
			".vk_cmdOutSys{color:var(--dsw-alias-state-warn-primary)}",
			".vk_cmdCmd{display:flex;align-items:flex-start;gap:8px;padding:2px 10px 0;color:var(--dsw-alias-label-secondary)}",
			".vk_cmdCmdMark{flex:none;color:var(--vk-accent);font-weight:600;user-select:none}",
			".vk_cmdCmdText{flex:1;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere}",
			".vk_cmdCmdMeta{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-variant-numeric:tabular-nums;white-space:nowrap}",
			".vk_cmdCmdText::before{content:'PS> ';color:var(--vk-accent);font-weight:600}",
			".vk_cmdCmdAgent .vk_cmdCmdMark{color:var(--dsw-alias-state-warn-primary)}",
			".vk_cmdCmdAgent .vk_cmdCmdText::before{content:'🤖 ';color:inherit}",
			".vk_cmdCmdAgent .vk_cmdCmdText{color:var(--dsw-alias-label-secondary)}",
			".vk_cmdCopyBtn{flex:none;appearance:none;border:none;background:none;cursor:pointer;opacity:0;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));border-radius:5px;font-size:11px;padding:0 6px;height:18px;font-family:inherit}",
			".vk_cmdCmd:hover .vk_cmdCopyBtn{opacity:1}",
			".vk_cmdCopyBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_cmdFilter{flex:none;width:110px;height:20px;padding:0 6px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:11px}",
			".vk_cmdFilter:focus{outline:none;border-color:var(--vk-accent)}",
			".vk_cmdSticky{position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-base);margin:0 0 4px}",
			".vk_cmdMetaOk{color:var(--dsw-alias-state-success-primary)}",
			".vk_cmdInputRow{flex:none;display:flex;align-items:flex-end;gap:6px;padding:5px 8px 6px 10px;border-top:1px solid var(--dsw-alias-border-l1)}",
			".vk_cmdPrompt{flex:none;color:var(--vk-accent);font-weight:600;font-family:ui-monospace,'Cascadia Mono',Consolas,monospace;font-size:12px;line-height:22px}",
			".vk_cmdInput{flex:1;min-width:0;resize:none;border:none;outline:none;background:transparent;color:var(--dsw-alias-label-primary);font-family:ui-monospace,'Cascadia Mono',Consolas,monospace;font-size:12px;line-height:18px;padding:2px 0;max-height:120px;overflow:auto}",
			".vk_cmdRun{flex:none;appearance:none;border:1px solid transparent;border-radius:6px;background:var(--vk-accent);color:#fff;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;height:26px;padding:0 12px}",
			".vk_cmdRun:hover:not(:disabled){filter:brightness(1.1)}",
			".vk_cmdRun:disabled{opacity:.45;cursor:default;filter:none}",
			".vk_cmdEmpty{color:var(--dsw-alias-label-tertiary);padding:2px 10px}",
			// ── 下段 v2（2026-09-17）：正文 = 官方 TerminalBody。样式只做「撑高 / 撑满」兜底，
			//    官方自己的模块样式若已生效，这几条与之不冲突（都是让 xterm 容器拿到真实高度）。──
			".vk_termPanel{display:flex;flex-direction:column;min-height:0;height:100%;box-sizing:border-box;background:var(--dsw-alias-bg-base)}",
			".vk_termHost{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}",
			".vk_termHost>[data-sidebar-terminal]{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;height:100%;width:100%}",
			".vk_termHost>[data-sidebar-terminal]>div[role=status]{flex:none;padding:4px 10px;font-size:12px;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;gap:8px}",
			".vk_termHost>[data-sidebar-terminal]>div:not([role=status]){flex:1 1 auto;min-height:0;width:100%;overflow:hidden}",
			".vk_termHost .xterm{height:100%}",
			".vk_termNote{flex:1;display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font-size:12px;padding:12px;text-align:center}",
			".vk_browseFoot{display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid var(--dsw-alias-border-l1)}",
			".vk_browseFootPath{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--dsw-alias-label-tertiary)}",
			".vk_primaryBtn{background:var(--vk-accent);color:#fff;border-color:var(--vk-accent);font-weight:600}",
			".vk_primaryBtn:hover{background:var(--vk-accent);color:#fff;filter:brightness(1.1);border-color:var(--vk-accent)}",
			".vk_primaryBtn:disabled{opacity:.45;cursor:not-allowed;filter:none}",
			"@keyframes vkBrowseIn{from{opacity:0;transform:translateX(var(--vk-browse-dx,0px)) scale(.97) translateY(4px)}to{opacity:1;transform:translateX(var(--vk-browse-dx,0px))}}",
			"@keyframes vkFadeIn{from{opacity:0}to{opacity:1}}",
			// ── 图片缩放面板（上一版中栏查看器的样式原样捞回；棋盘格底 + 抓手 + 工具条）──
			// ── 查看器工具条：官方「打开方式 / 显示方式」胶囊 + 下拉列表 ─────────────
			// 抄的是官方 documentpreview 里那颗「打开方式」胶囊：实测 DOM
			// `<button class="dhJKeW_tool dhJKeW_viewerTool" aria-label="打开方式" data-document-viewer-menu="true">`
			// 高 28 / 圆角 28px / 字号 12px / 透明底，点开是 `role=menu` 的列表（官方 md 那档给
			// Markdown / 代码 / 纯文本三条，选中项带 _selected）。
			//
			// 为什么非改不可：原先这里直接排一排 `.vk_rowBtn`，而 `.vk_rowBtn` 是 **20×20 的图标**按钮
			// （`.vk_rowBtn{width:20px;height:20px}`）→ 文字按钮被压进 20px 的方框、两颗之间只隔 26px。
			// 右栏 720px 时实测：「用 Office 打开」按钮 rect 宽 20 而 scrollWidth 26（溢出），
			// 「所在文件夹」在 20px 盒里换行 —— 窄栏下就是用户看到的「排一排按钮、变形」。
			".vk_viewerBar{position:relative}",
			".vk_viewMode{position:relative;flex:none;margin-left:auto}",
			".vk_viewModeBtn{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 8px;border:none;border-radius:28px;background:transparent;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:12px;cursor:pointer;transition:background-color .12s,color .12s}",
			".vk_viewModeBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_viewModeBtnOn{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			// 菜单观感同样照官方量：bg rgb(53,54,56)、圆角 20px、内边距 4px、外发光
			// rgba(255,255,255,.06) 0 0 0 .5px + rgba(0,0,0,.04) 0 3px 8px
			".vk_viewMenu{position:absolute;right:0;top:calc(100% + 6px);z-index:40;min-width:218px;padding:4px;border-radius:20px;background:var(--dsw-specific-menu);box-shadow:rgba(255,255,255,.06) 0 0 0 .5px,rgba(0,0,0,.04) 0 3px 8px 0,var(--dsw-shadow-lv3);display:flex;flex-direction:column;animation:vkFadeIn .1s ease-out}",
			".vk_viewMenuItem{display:flex;align-items:center;gap:8px;width:100%;height:34px;padding:0 10px;border:none;border-radius:14px;background:transparent;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:12.5px;text-align:left;cursor:pointer;white-space:nowrap}",
			".vk_viewMenuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".vk_viewMenuItemOn{color:var(--vk-accent)}",
			".vk_viewMenuLabel{overflow:hidden;text-overflow:ellipsis}",
			".vk_viewMenuCheck{margin-left:auto;display:inline-flex;color:var(--vk-accent)}",
			".vk_viewMenuSep{height:1px;margin:4px 8px;background:var(--dsw-alias-border-l2);flex:none}",
			".vk_imgToolbar{display:flex;align-items:center;gap:2px;padding:4px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap;flex:none}",
			".vk_imgToolbarSpacer{flex:1;min-width:8px}",
			".vk_imgZoomBtn{display:inline-flex;align-items:center;gap:4px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;padding:4px 7px;border-radius:6px;cursor:pointer;font-family:inherit}",
			".vk_imgZoomBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_imgZoomBtnOn{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}",
			".vk_imgZoomPct{font-size:11px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));min-width:52px;text-align:center;font-variant-numeric:tabular-nums}",
			".vk_imgWrap{flex:1;min-height:0;display:flex;overflow:auto;background:repeating-conic-gradient(var(--dsw-alias-interactive-bg-hover) 0% 25%,transparent 0% 50%) 0 0/22px 22px;position:relative;cursor:grab}",
			".vk_imgWrap.vk_imgPan{cursor:grabbing}",
			".vk_imgWrap img{display:block;margin:auto;user-select:none;-webkit-user-drag:none;box-shadow:0 2px 16px rgba(0,0,0,.35);background:#fff;border-radius:4px}",
			// ── 文件图标徽章（浅色基准；深色在文末覆盖） ─────────────────
			".vk_icon{flex:none;width:17px;height:17px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;line-height:1}",
			".vk_iconSvg{color:var(--dsw-alias-label-secondary)}",
			".vk_iconChip{width:16px;height:16px;border-radius:4px;font-size:8.5px;font-weight:700;font-family:ui-monospace,'Cascadia Mono',Consolas,monospace;letter-spacing:.1px}",
			".vk_iJs{color:#9c8205;background:rgba(241,224,90,.28)}",
			".vk_iTs{color:#3178c6;background:rgba(49,120,198,.16)}",
			".vk_iReact{color:#0e9fc9;background:rgba(97,218,251,.2)}",
			".vk_iPy{color:#3572a5;background:rgba(53,114,165,.14)}",
			".vk_iJson{color:#a87b00;background:rgba(203,182,65,.18)}",
			".vk_iHtml{color:#e34c26;background:rgba(227,76,38,.12)}",
			".vk_iXml{color:#7d4b8f;background:rgba(125,75,143,.12)}",
			".vk_iSvg{color:#b8563e;background:rgba(184,86,62,.12)}",
			".vk_iCss{color:#2965f1;background:rgba(41,101,241,.12)}",
			".vk_iScss{color:#c6538c;background:rgba(198,83,140,.12)}",
			".vk_iLess{color:#2a4d8f;background:rgba(42,77,143,.12)}",
			".vk_iVue{color:#41b883;background:rgba(65,184,131,.16)}",
			".vk_iSvelte{color:#ff3e00;background:rgba(255,62,0,.1)}",
			".vk_iMd{color:#519aba;background:rgba(81,154,186,.14)}",
			".vk_iYaml{color:#c93c3c;background:rgba(203,60,60,.1)}",
			".vk_iShell{color:#4e9a06;background:rgba(137,224,81,.18)}",
			".vk_iConf{color:#6d8086;background:rgba(109,128,134,.14)}",
			".vk_iTxt{color:#7f8c8d;background:rgba(127,140,141,.14)}",
			".vk_iSql{color:#e38c00;background:rgba(227,140,0,.12)}",
			".vk_iVisio{color:#3955a3;background:rgba(57,85,163,.14)}",
			".vk_iGql{color:#e535ab;background:rgba(229,53,171,.12)}",
			".vk_iRs{color:#b4713d;background:rgba(222,165,132,.22)}",
			".vk_iGo{color:#00add8;background:rgba(0,173,216,.12)}",
			".vk_iC{color:#5c6bc0;background:rgba(92,107,192,.14)}",
			".vk_iCpp{color:#d1477b;background:rgba(243,75,125,.12)}",
			".vk_iCs{color:#2c8c1e;background:rgba(35,145,32,.12)}",
			".vk_iRb{color:#cc342d;background:rgba(204,52,45,.1)}",
			".vk_iPhp{color:#777bb4;background:rgba(119,123,180,.14)}",
			".vk_iKt{color:#7f52ff;background:rgba(127,82,255,.12)}",
			".vk_iSwift{color:#f05138;background:rgba(240,81,56,.12)}",
			".vk_iLua{color:#4a4ab8;background:rgba(74,74,184,.12)}",
			".vk_iR{color:#276dc3;background:rgba(39,109,195,.12)}",
			".vk_iWasm{color:#654ff0;background:rgba(101,79,240,.12)}",
			".vk_iFont{color:#a074c4;background:rgba(160,116,196,.14)}",
			".vk_iBin{color:#6e7681;background:rgba(110,118,129,.16)}",
			".vk_iGit{color:#e94e32;background:rgba(240,80,51,.12)}",
			".vk_iNpm{color:#cb3837;background:rgba(203,56,55,.12)}",
			".vk_iJava{color:#b07219;background:rgba(176,114,25,.14)}",
			// ── Git 角标：VS Code 式纯色字母（无底色胶囊） ────────────────
			".vk_gitBadge{flex:none;margin-left:auto;padding:0 2px;font-size:11px;font-weight:700;line-height:16px;letter-spacing:.2px}",
			".vk_gitM{color:#c09a52}",
			".vk_gitU,.vk_gitA{color:#4f9e68}",
			".vk_gitD{color:#d64545}",
			".vk_gitR{color:#a866c4}",
			// ── 中间编辑区：标签条 / 标签页（激活·脏标记·关闭键层次） ─────
			".vk_editor{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}",
			".vk_tabStrip{display:flex;flex:none;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-sidebar-fill);overflow-x:auto;scrollbar-width:none}",
			".vk_tabStrip::-webkit-scrollbar{display:none}",
			".vk_fileTab{display:flex;align-items:center;gap:7px;flex:0 1 auto;min-width:112px;max-width:230px;cursor:pointer;padding:7px 10px 7px 12px;font-size:12.5px;color:var(--dsw-alias-label-secondary);border-right:1px solid var(--dsw-alias-border-l1);background:transparent;border-top:none;border-left:none;border-bottom:2px solid transparent;font-family:inherit;white-space:nowrap;transition:background-color .1s,color .1s,border-color .1s}",
			".vk_fileTab:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}",
			".vk_fileTabActive{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border-bottom-color:var(--vk-accent)}",
			".vk_menu{position:fixed;z-index:60;min-width:160px;background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:4px;box-shadow:var(--dsw-shadow-lv3);display:flex;flex-direction:column}",
			".vk_menuItem{appearance:none;border:none;background:none;cursor:pointer;text-align:left;color:var(--dsw-alias-label-primary);font-size:12.5px;font-family:inherit;padding:6px 10px;border-radius:5px}",
			".vk_menuItem:hover{background:var(--dsw-alias-interactive-bg-hover)}",
			".vk_fileTab[draggable=true]{cursor:grab}",
			".vk_fileTab[draggable=true]:active{cursor:grabbing}",
			".vk_tabClose{appearance:none;border:none;background:none;cursor:pointer;color:var(--dsw-alias-label-tertiary);padding:0;width:18px;height:18px;font-size:13px;border-radius:5px;line-height:1;display:flex;align-items:center;justify-content:center;flex:none;opacity:0;pointer-events:none;transition:opacity .1s,background-color .1s,color .1s}",
			".vk_fileTab:hover .vk_tabClose,.vk_fileTabActive:not(.vk_fileTabDirty) .vk_tabClose{opacity:1;pointer-events:auto}",
			// ── 会话文件「小眼睛」Dock 已删除（文件投入语义交给官方 @ 引用），样式一并清掉 ──
			".vk_tabClose:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover-accent)}",
			".vk_fileTabDirty:hover .vk_tabDot{display:none}",
			// ── 查看器：行号槽与代码区 ─────────────────────────────────
			".vk_viewer{flex:1;min-height:0;overflow:auto;display:flex;font-family:ui-monospace,'Cascadia Mono',Consolas,'Courier New',monospace;font-size:12.5px;line-height:20px}",
			".vk_code{flex:1;min-width:max-content;margin:0;padding:10px 14px;white-space:pre;tab-size:4;color:var(--dsw-alias-label-primary)}",
			".vk_viewer ::selection{background:var(--vk-accent-ring)}",
			".vk_codeHl{flex:1;min-width:max-content;overflow:visible;padding:0}",
			".vk_codeHl .shiki{background:transparent !important;color:var(--dsw-alias-label-primary);margin:0;padding:10px 14px;line-height:20px;font-size:12.5px;tab-size:4;overflow:visible !important;font-family:inherit;width:max-content;min-width:100%}",
			// 文档类软换行（isWrapFile → vk_viewerWrap）：覆盖 pre / min-width:max-content，长行自动折行
			".vk_viewerWrap .vk_code{flex:1;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}",
			".vk_viewerWrap .vk_codeHl{min-width:0}",
			".vk_viewerWrap .vk_codeHl .shiki{width:auto;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}",
			".vk_codeHl .shiki code{font-family:inherit;font-size:inherit;line-height:20px}",
			// 兜底高亮（shiki 返回前的瞬态）：CSS 固定 dark 配色。
			// 正常路径已支持主题：后端 highlight 接口按 theme 参数返回
			// github-light/github-dark，Viewer 监听 body[data-ds-dark-theme]
			// 切换时重取。兜底仅在 shiki 失败时短暂出现，偏 dark 可接受
			// ── 编辑模式：工具条 / 按钮 / 输入区 ────────────────────────
			// 中栏工具条：按钮一律 flex:none + nowrap（窄栏不挤压变形），条本身可横向滚动（滚动条隐藏）
			".vk_editBar{display:flex;align-items:center;gap:8px;flex:none;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none}",
			".vk_editBar::-webkit-scrollbar{display:none}",
			// 网址标签的工具条元素多（刷新/浏览器/地址/打开/开关/缩放），窄栏时允许换行，避免缩放按钮被挤掉
			".vk_editBtn{appearance:none;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:6px;font-size:12px;padding:4px 12px;font-family:inherit;flex:none;white-space:nowrap;transition:background-color .12s,border-color .12s,filter .12s,opacity .12s}",
			".vk_editBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l3)}",
			".vk_editBtn:disabled{opacity:.5;cursor:default}",
			".vk_editBtnPrimary{background:var(--vk-accent);border-color:transparent;color:#fff;font-weight:600}",
			".vk_editBtnPrimary:hover:not(:disabled){background:var(--vk-accent);border-color:transparent;filter:brightness(1.1)}",
			".vk_tabDot{flex:none}",
			".vk_editorInput{flex:1;min-height:0;box-sizing:border-box;width:100%;resize:none;border:none;outline:none;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:ui-monospace,'Cascadia Mono',Consolas,'Courier New',monospace;font-size:12.5px;line-height:20px;padding:10px 14px;white-space:pre;overflow:auto;tab-size:4;caret-color:var(--vk-accent)}",
			".vk_editorInput::selection{background:var(--vk-accent-ring)}",
			".vk_saveMsg{font-size:12px;color:var(--dsw-alias-label-secondary);flex:none}",
			".vk_diffBody{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column}",
			".vk_diffCard{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:hidden;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);flex:none}",
			".vk_diffCard .vk_editBar{border-bottom:1px solid var(--dsw-alias-border-l1)}",
			".vk_diffCard .vk_diffBody{max-height:320px;overflow:auto}",
			// ── 空态 / 错误 / 通知排版 ─────────────────────────────────
			".vk_err{margin:8px;padding:8px 10px;font-size:12px;line-height:1.6;color:var(--dsw-alias-state-error-primary);background:var(--dsw-alias-interactive-bg-hover-danger);border-radius:6px}",
			".vk_empty{padding:32px 20px;font-size:12.5px;line-height:2;color:var(--dsw-alias-label-tertiary);text-align:center;white-space:pre-wrap}",
			// ── 键盘聚焦可见态（统一 accent 光圈） ──────────────────────
			".vk_tabBtn:focus-visible,.vk_railBtn:focus-visible,.vk_treeBtn:focus-visible,.vk_rowBtn:focus-visible,.vk_pickBtn:focus-visible,.vk_editBtn:focus-visible,.vk_tabClose:focus-visible{outline:2px solid var(--vk-accent-ring);outline-offset:-2px}",
			// ── 深色主题覆盖：徽章/角标颜色提亮 ─────────────────────────
			"body[data-ds-dark-theme] .vk_iJs{color:#f1e05a;background:rgba(241,224,90,.14)}",
			"body[data-ds-dark-theme] .vk_iTs{color:#5496d8}",
			"body[data-ds-dark-theme] .vk_iReact{color:#61dafb;background:rgba(97,218,251,.12)}",
			"body[data-ds-dark-theme] .vk_iPy{color:#6aa5e0}",
			"body[data-ds-dark-theme] .vk_iJson{color:#cbcb41}",
			"body[data-ds-dark-theme] .vk_iHtml{color:#ff7a59}",
			"body[data-ds-dark-theme] .vk_iXml{color:#b47fd4}",
			"body[data-ds-dark-theme] .vk_iSvg{color:#e08a70}",
			"body[data-ds-dark-theme] .vk_iCss{color:#6ea8ff}",
			"body[data-ds-dark-theme] .vk_iLess{color:#7a9ee0}",
			"body[data-ds-dark-theme] .vk_iYaml{color:#ff7b72}",
			"body[data-ds-dark-theme] .vk_iShell{color:#89e051}",
			"body[data-ds-dark-theme] .vk_iConf{color:#9aa7b0}",
			"body[data-ds-dark-theme] .vk_iTxt{color:#9aa7b0}",
			"body[data-ds-dark-theme] .vk_iSql{color:#f0a63c}",
			"body[data-ds-dark-theme] .vk_iVisio{color:#8aa4e8}",
			"body[data-ds-dark-theme] .vk_iRs{color:#dea584}",
			"body[data-ds-dark-theme] .vk_iC{color:#8fa3e8}",
			"body[data-ds-dark-theme] .vk_iCs{color:#6fbf4a}",
			"body[data-ds-dark-theme] .vk_iRb{color:#ff7b72}",
			"body[data-ds-dark-theme] .vk_iLua{color:#8b8bff}",
			"body[data-ds-dark-theme] .vk_iR{color:#6aa5e0}",
			"body[data-ds-dark-theme] .vk_iBin{color:#9aa7b0}",
			"body[data-ds-dark-theme] .vk_iGit{color:#f05033}",
			"body[data-ds-dark-theme] .vk_iJava{color:#e6b84f}",
			"body[data-ds-dark-theme] .vk_gitM{color:#e2c08d}",
			"body[data-ds-dark-theme] .vk_gitU,body[data-ds-dark-theme] .vk_gitA{color:#73c991}",
			"body[data-ds-dark-theme] .vk_gitD{color:#f14c4c}",
			"body[data-ds-dark-theme] .vk_gitR{color:#c678dd}",
			// 设置面板 · 全局人设分区
			".vk_personaSection{display:flex;flex-direction:column;gap:10px;padding:16px;width:100%;box-sizing:border-box}",
			".vk_personaDesc{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.7}",
			".vk_personaArea{min-height:280px;resize:vertical;background:var(--dsw-specific-input-fill,var(--dsw-specific-sidebar-fill));color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px 12px;font-family:inherit;font-size:12.5px;line-height:1.75;tab-size:4}",
			".vk_personaArea:focus{outline:none;border-color:var(--vk-accent)}",
			".vk_personaFoot{display:flex;align-items:center;gap:8px}",
			".vk_personaMsg{font-size:12px}",
			".vk_personaMsgOk{color:#73c991}",
			".vk_personaMsgErr{color:#f14c4c}",
			".vk_personaSave{background:var(--vk-accent);color:#fff;border-radius:6px;padding:6px 16px;font-weight:600;border:none;cursor:pointer;font-size:12.5px}",
			".vk_personaSave:hover{filter:brightness(1.1)}",
			".vk_personaSave:disabled{opacity:.5;cursor:default}",
			// Skill / MCP 管理分区
			".vk_mgrList{display:flex;flex-direction:column;gap:8px}",
			".vk_mgrRow{display:flex;align-items:center;gap:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px 12px;background:var(--dsw-specific-input-fill,var(--dsw-specific-sidebar-fill))}",
			".vk_mgrInfo{flex:1;min-width:0}",
			".vk_mgrName{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			".vk_mgrMeta{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}",
			".vk_mgrBadge{flex:none;font-size:11px;border-radius:999px;padding:2px 9px;font-weight:600}",
			".vk_mgrBadgeOn{color:#73c991;background:rgba(115,201,145,.14)}",
			".vk_mgrBadgeOff{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}",
			".vk_mgrBtn{flex:none;appearance:none;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;font-family:inherit}",
			".vk_mgrBtn:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}",
			".vk_mgrBtn:disabled{opacity:.5;cursor:default}",
			".vk_mgrBtnDanger{color:#f14c4c;border-color:rgba(241,76,76,.35)}",
			".vk_mgrBtnDanger:hover{background:rgba(241,76,76,.1);color:#f14c4c}",
			".vk_mgrBtnPrimary{background:var(--vk-accent);color:#fff;border-color:transparent;font-weight:600}",
			".vk_mgrBtnPrimary:hover{filter:brightness(1.1);color:#fff}",
			".vk_mgrHead{display:flex;align-items:center;gap:8px;margin-bottom:10px}",
			".vk_mgrEmpty{font-size:12px;color:var(--dsw-alias-label-secondary);padding:18px 0;text-align:center}",
			".vk_mgrAddForm{display:flex;flex-direction:column;gap:8px;border:1px dashed var(--dsw-alias-border-l2);border-radius:8px;padding:12px;margin-bottom:10px}",
			".vk_mgrInput{background:var(--dsw-specific-input-fill,var(--dsw-specific-sidebar-fill));color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:6px 10px;font-size:12.5px;font-family:inherit}",
			".vk_mgrInput:focus{outline:none;border-color:var(--vk-accent)}",
			".vk_mgrLabel{font-size:11.5px;color:var(--dsw-alias-label-secondary)}",
			".vk_imgWrap{flex:1;min-height:0;display:flex;overflow:auto;background:repeating-conic-gradient(var(--dsw-alias-interactive-bg-hover) 0% 25%,transparent 0% 50%) 0 0/22px 22px;position:relative;cursor:grab}",
			".vk_imgWrap.vk_imgPan{cursor:grabbing}",
			".vk_imgWrap img{display:block;margin:auto;user-select:none;-webkit-user-drag:none;box-shadow:0 2px 16px rgba(0,0,0,.35);background:#fff;border-radius:4px}",
			".vk_imgToolbar{display:flex;align-items:center;gap:2px;padding:4px 8px;border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}",
			".vk_imgZoomBtn{display:inline-flex;align-items:center;gap:4px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;padding:4px 7px;border-radius:6px;cursor:pointer}",
			".vk_imgZoomBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".vk_imgZoomBtn:disabled{opacity:.4;cursor:default}",
			".vk_imgZoomPct{font-size:11px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));min-width:52px;text-align:center;font-variant-numeric:tabular-nums}",
			// 中栏统一缩放：可缩放 iframe 容器（浏览器缩放语义 —— 逻辑视口 ÷ 比例 + transform 放大，
			// 任何比例都铺满中栏，所以外层 overflow:hidden，永远不出现外层滚动条）
			// 底色用主题色（不是 #fff）：页面加载完成前的中栏不该闪一块白；
			// 加载完成后由 applyGuestScrollbar 返回的页面底色覆盖（滚动条槽位露的就是这个元素底色）
			// 按住 Ctrl 才出现的透明捕获层：拦下外层 Ctrl+滚轮（否则会缩放整个 DSH 页面）
			// 中栏网页预览：网址标签的地址栏与开关、空态的「打开网址」输入行
			".vk_webInput{flex:1;min-width:140px;height:26px;padding:0 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2,#d0d5dd);background:var(--dsw-alias-bg-layer-2,transparent);color:var(--dsw-alias-label-primary,inherit);font-size:12px;font-family:inherit}",
			".vk_webInput:focus{outline:none;border-color:var(--dsw-alias-brand-primary,#4d6bfe)}",
			".vk_homeLabel{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--dsw-alias-label-tertiary);letter-spacing:.02em;margin:6px 10px 2px}",
			".vk_homeLabelToggle{cursor:pointer;user-select:none;border-radius:4px;padding:1px 4px;margin-left:6px;margin-right:6px}",
			".vk_homeLabelToggle:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}",
			// 对话里 read/write 卡片的路径按钮（官方 `_fileLink`）：自研把点击改成「在拓展栏打开」，
			// 于是补一颗小箭头做**可见提示**——不 hover 不占位（宽度 0、opacity 0），hover 才展开，
			// 因此官方那一行文字的位置、宽度、省略号行为一字不变（不碰官方 DOM，全是 CSS + 捕获阶段拦截）。
			".vk_chatFileHint{display:inline-block;flex:none;width:0;margin-left:0;overflow:hidden;white-space:nowrap;color:var(--vk-accent);opacity:0;transition:width .12s,opacity .12s,margin-left .12s}",
			"[data-vk-chat-file]:hover .vk_chatFileHint,[data-vk-chat-file]:focus-visible .vk_chatFileHint{width:14px;margin-left:4px;opacity:1}"
		].join("");
		{
			const tagId = "@anoslide/dsh-client-vscode-layout/vscode.module.css";
			if (typeof document !== "undefined") {
				// 先把本插件此前注入的样式表全部摘掉再插新的：否则插件热重载后旧 CSS 会留着，改动看不到。
				for (const old of document.querySelectorAll('style[data-plugin="@anoslide/dsh-client-vscode-layout"]')) { try { old.remove(); } catch { /* ignore */ } }
				const tag = document.createElement("style");
				tag.dataset.plugin = "@anoslide/dsh-client-vscode-layout";
				tag.dataset.pluginCss = tagId;
				tag.textContent = css;
				document.head.appendChild(tag);
			}
		}

		// ──────────────────────────────────────────────────────────────
		// 路径小工具（浏览弹窗与文件树共用，纯函数）
		// ──────────────────────────────────────────────────────────────
		/** 是否盘根本身（`D:\` 这种）。 */
		function isRootDriveOf(p) {
			return typeof p === "string" && /^[A-Za-z]:[\\/]$/.test(p);
		}
		/** 上一级目录（盘根返回自身）。 */
		function parentOfPath(p) {
			const s = String(p === null || p === undefined ? "" : p).replace(/[\\/]+$/, "");
			const i = Math.max(s.lastIndexOf("\\"), s.lastIndexOf("/"));
			if (i < 0) return s;
			const cut = s.slice(0, i);
			return /^[A-Za-z]:$/.test(cut) ? cut + "\\" : cut;
		}
		/** 面包屑：把绝对路径拆成 [{label, path}]（逐级累积）。 */
		function crumbPartsOf(p) {
			if (typeof p !== "string" || p.length === 0) return [];
			const out = [];
			const driveMatch = /^([A-Za-z]:)[\\/]?/.exec(p);
			if (driveMatch !== null) {
				const root = driveMatch[1] + "\\";
				out.push({ label: root, path: root });
				let acc = root;
				const rest = p.slice(root.length).split(/[\\/]/).filter((s) => s.length > 0);
				for (const seg of rest) {
					acc += seg + "\\";
					out.push({ label: seg, path: acc });
				}
			} else {
				const segs = p.split(/[\\/]/).filter((s) => s.length > 0);
				let acc = "";
				for (const seg of segs) {
					acc += seg + "\\";
					out.push({ label: seg, path: acc });
				}
			}
			return out;
		}

		// ──────────────────────────────────────────────────────────────
		// 组件：应用内文件浏览弹窗（**共用**）
		//
		// 两个调用点共用同一套浏览逻辑（数据与交互都长在调用方，这里只画）：
		//   ① 文件栏顶部那颗文件夹图标「打开文件夹（应用内浏览目录）」——**自适应**（fileMode + pickFolder）：
		//      进入目录 / 点中文件都算「选中」，点文件就在拓展栏打开，点「打开」就把当前目录加入列表；
		//   ② 拓展栏「新标签页」里的「打开本机文件」——文件模式，**最终必须选中一个文件**并在该标签打开。
		// 两处必须保持一模一样：同一套磁盘/桌面根视图、面包屑、模糊搜索、隐藏项开关、上下级导航，
		// 差别只有「文件行可点」这一条（fileMode）。
		//
		// @param props - { title, fileMode, path, dir, err, drives, probing, desktopPath, query, search,
		//                  showHidden, input, onInput, onQuery, onGoto, onRoots, onPickFile, onToggleHidden,
		//                  onReload, onOpen, onClose, openTarget, dirCount }
		// ──────────────────────────────────────────────────────────────
		function VK_BrowseModal(props) {
			const fileMode = props.fileMode === true;
			// insertMode（2026-09-12）：本弹窗被当作「往会话里插 @引用」的入口时（对话框那颗放大镜），
			// 文案与底部动作一律说「引用」，不再出现「打开 / 在拓展栏打开 / 进入」的说法。
			// 缺省 false = 文件栏那颗文件夹图标与拓展栏「打开本机文件」两处调用点的原行为，一字不变。
			const insertMode = props.mode === "insert";
			/** 底部主按钮与行末提示用的词：引用 / 打开。 */
			const actWord = insertMode ? "引用" : "打开";
			// pickFolder（第二轮新增）：文件模式下**同时**保留底部「打开」按钮（= 把当前所在目录加入列表）。
			// 文件栏那颗文件夹图标走的就是 fileMode + pickFolder 的组合：自适应——没点文件就是选目录、
			// 点了文件就是选文件，不再让人先选「目录 / 文件」模式。
			const pickFolder = props.pickFolder === true;
			// embedded = 直接铺在标签正文里（拓展栏「打开本机文件」），否则是浮在页面上的弹窗（左栏文件树）。
			// 两种模式共用同一套头部/面包屑/列表/底部，只有最外层容器与「取消」按钮的语义不同。
			const embedded = props.embedded === true;
			// anchorX（2026-09-13）：调用方量好的「对话框」水平中心（视口坐标）。给了就以它为准 ——
			// 卡片中心线与对话框中心线重合，而不是相对整个视口居中；给不出（null）则保持原来的视口居中。
			// 嵌入式（铺在标签正文里）不参与这套对齐。
			const anchorX = typeof props.anchorX === "number" && isFinite(props.anchorX) ? props.anchorX : null;
			const path = typeof props.path === "string" ? props.path : "";
			const dir = props.dir;
			const query = typeof props.query === "string" ? props.query : "";
			const search = props.search;
			const drives = Array.isArray(props.drives) ? props.drives : [];
			const desktopPath = props.desktopPath !== undefined && props.desktopPath !== null ? props.desktopPath : null;
			const showHidden = props.showHidden === true;
			const crumb = crumbPartsOf(path);
			const loaded = dir !== null && dir !== undefined && dir.ok === true;
			const dirs = loaded ? (dir.dirs || []).filter((d) => showHidden || !d.hidden) : [];
			const files = loaded && fileMode ? (dir.files || []).filter((f) => showHidden || !f.hidden) : [];
			const hiddenCount = loaded ? (dir.dirs || []).filter((d) => d.hidden).length + (fileMode ? (dir.files || []).filter((f) => f.hidden).length : 0) : 0;
			// 选中态（B 项第 4/5 条）：单击任意条目 = 选中（底纹），不再直接进目录/开文件；
			// 已选中的条目再点一次才动作（目录进下一级、文件按「打开」在拓展栏打开）。
			// 换目录/换查询即清空——选中态只属于当前这一屏。
			const [sel, setSel] = react.useState(null);
			// 水平对齐偏移：卡片用 translateX(var(--vk-browse-dx)) 平移，居中后限幅，保证卡片不出视口。
			// 首帧还没量到卡片宽度 → 先用 CSS 的 min(520px,94vw) 现算一份兜底，rAF 里再量一遍校正。
			const cardRef = react.useRef(null);
			const [shiftX, setShiftX] = react.useState(0);
			react.useEffect(() => {
				if (embedded === true) return void 0;
				const compute = () => {
					try {
						if (anchorX === null) { setShiftX(0); return; }
						const w = window.innerWidth;
						const rect = cardRef.current === null ? null : cardRef.current.getBoundingClientRect();
						const cw = rect !== null && rect.width > 0 ? rect.width : Math.min(520, w * 0.94);
						const limit = Math.max(0, w / 2 - cw / 2 - 12);
						let v = anchorX - w / 2;
						if (v > limit) v = limit;
						else if (v < -limit) v = -limit;
						setShiftX(Math.round(v));
					} catch { setShiftX(0); }
				};
				compute();
				const onResize = () => { compute(); };
				let raf = 0;
				try {
					if (typeof requestAnimationFrame === "function") raf = requestAnimationFrame(compute);
					window.addEventListener("resize", onResize);
				} catch { /* 非浏览器环境（冒烟测试的沙箱）：算一次就够 */ }
				return () => {
					try {
						if (raf !== 0 && typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
						window.removeEventListener("resize", onResize);
					} catch { /* 同上 */ }
				};
			}, [anchorX, embedded]);
			react.useEffect(() => { setSel(null); }, [path, query]);
			const isSelPath = (p) => sel !== null && sel.path === p;
			const clickDir = (p, name) => {
				if (isSelPath(p)) props.onGoto(p);
				else setSel({ path: p, name: name, isDir: true });
			};
			const clickFile = (p, name) => {
				if (isSelPath(p)) props.onPickFile({ path: p, name: name });
				else setSel({ path: p, name: name, isDir: false });
			};
			return h("div", {
				className: embedded ? "vk_browseEmbed" : "vk_browseOverlay",
				role: "dialog",
				"aria-modal": embedded ? void 0 : "true",
				onClick: embedded ? void 0 : (e) => { if (e.target === e.currentTarget) props.onClose(); }
			},
				h("div", {
					className: "vk_browseCard" + (embedded ? " vk_browseCardEmbed" : ""),
					ref: embedded ? void 0 : cardRef,
					style: embedded ? void 0 : { "--vk-browse-dx": shiftX + "px" }
				},
					h("div", { className: "vk_browseHead" },
						h(VIcon, { name: "folderOpen", size: 15 }),
						h("span", { className: "vk_browseTitle" }, insertMode ? "引用本机文件或文件夹" : (fileMode ? (pickFolder ? "打开文件夹 / 文件" : "打开本机文件") : "打开文件夹")),
						h("button", {
							className: "vk_iconBtn" + (showHidden ? " vk_iconBtnOn" : ""),
							title: showHidden ? "隐藏系统/配置文件" : "显示系统/配置文件（node_modules、.git 等）",
							onClick: () => props.onToggleHidden()
						}, h(VIcon, { name: showHidden ? "eyeOff" : "eye", size: 14 })),
						h("button", {
							className: "vk_iconBtn",
							title: path.length > 0 ? "重新加载当前目录" : "重新检测磁盘与桌面",
							onClick: () => { if (path.length > 0) props.onGoto(path); else props.onReload(); }
						}, h(VIcon, { name: "refresh", size: 14 })),
						h("button", { className: "vk_iconBtn", title: "关闭 (Esc)", onClick: () => props.onClose() }, h(VIcon, { name: "close", size: 14 }))),
					h("div", { className: "vk_browsePathRow" },
						h("span", { className: "vk_browsePathIcon" }, h(VIcon, { name: "search", size: 12 })),
						h("input", {
							className: "vk_pickInput",
							placeholder: fileMode ? "搜索文件名（模糊匹配；知道完整路径也可直接粘贴后回车；粘贴网址回车即开网页）" : "搜索文件夹名（模糊匹配；知道完整路径也可直接粘贴后回车）",
							value: query,
							spellCheck: false,
							autoFocus: true,
							onChange: (e) => props.onQuery(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter") {
									const v = query.trim();
									// 粘贴网址回车即在本标签开网页（只有认领了 onOpenUrl 的调用点会这么走）
									if (v.length > 0 && /^https?:\/\//i.test(v) && typeof props.onOpenUrl === "function") { props.onOpenUrl(v); return; }
									if (v.length > 0 && (v.includes("\\") || v.includes("/") || /^[A-Za-z]:/.test(v))) props.onGoto(v);
								}
								if (e.key === "Escape") props.onClose();
							}
						}),
						query.length > 0
							? h("button", { className: "vk_iconBtn", title: "清除搜索，回到目录浏览", onClick: () => props.onQuery("") }, h(VIcon, { name: "close", size: 12 }))
							: null),
					crumb.length > 0
						? h("div", { className: "vk_crumbs" },
							crumb.map((c, i) =>
								h("span", {
									key: c.path,
									className: "vk_crumb" + (i === crumb.length - 1 ? " vk_crumbCur" : ""),
									title: c.path,
									onClick: i === crumb.length - 1 ? void 0 : () => props.onGoto(c.path)
								},
									c.label,
									i < crumb.length - 1 ? h(VIcon, { name: "chevronRight", size: 11 }) : null)),
							h("span", { className: "vk_crumbsSpacer" }),
							h("button", { className: "vk_iconBtn vk_crumbsBack", title: "回到磁盘与桌面列表", onClick: () => props.onRoots() }, h(VIcon, { name: "home", size: 13 })))
						: null,
					h("div", { className: "vk_browseBody" },
						query.trim().length > 0
							? h("div", null,
								search !== null && search !== undefined && search.busy === true
									? h("div", { className: "vk_browseHint" }, h(VIcon, { name: "refresh", size: 12 }), "搜索中…")
									: null,
								search !== null && search !== undefined && search.items.length > 0
									? search.items.map((r) =>
										h("div", {
											className: "vk_browseRow" + (isSelPath(r.path) ? " vk_browseRowSelected" : ""),
											key: r.path,
											title: r.path,
											onClick: () => { if (props.fileMode === true) clickFile(r.path, r.name); else clickDir(r.path, r.name); }
										},
											h("span", { className: "vk_browseRowIcon" }, h(VIcon, { name: "folder", size: 15 })),
											h("span", { className: "vk_name" }, r.name),
											h("span", { className: "vk_relPath" }, r.rel),
											h(VIcon, { name: "chevronRight", size: 12 })))
									: null,
								search !== null && search !== undefined && search.items.length === 0 && search.busy !== true
									? h("div", { className: "vk_browseHint" }, (search.note !== null && search.note !== void 0 ? search.note : "") || (fileMode ? "没有匹配的文件，试试更短的关键词" : "没有匹配的文件夹"))
									: null)
							: h("div", null,
								props.err !== null && props.err !== void 0 ? h("div", { className: "vk_browseErr" }, props.err) : null,
								path.length === 0
									? (props.probing === true
										? h("div", { className: "vk_browseHint" }, h(VIcon, { name: "refresh", size: 12 }), "正在检测磁盘与桌面…")
										: (drives.length === 0 && desktopPath === null
											? h("div", { className: "vk_browseHint" }, "未检测到磁盘与桌面，可点右上角刷新或在上方输入路径")
											: h("div", null,
												desktopPath !== null
													? h("div", {
														className: "vk_browseRow" + (isSelPath(desktopPath) ? " vk_browseRowSelected" : ""),
														key: "desktop",
														title: desktopPath + "（本机桌面；单击选中 · 再点一次进入）",
														onClick: () => clickDir(desktopPath, "桌面")
													},
														h("span", { className: "vk_browseRowIcon" }, h(VIcon, { name: "monitor", size: 15 })),
														h("span", { className: "vk_name" }, "桌面"),
														h("button", { className: "vk_rowBtn vk_browseRowEnter", title: "进入此文件夹", onClick: (e) => { e.stopPropagation(); props.onGoto(desktopPath); } }, h(VIcon, { name: "folderOpen", size: 12 })),
														h(VIcon, { name: "chevronRight", size: 12 }))
													: null,
												drives.map((p) =>
													h("div", {
														className: "vk_browseRow" + (isSelPath(p) ? " vk_browseRowSelected" : ""),
														key: p,
														title: p + "（单击选中 · 再点一次进入）",
														onClick: () => clickDir(p, p)
													},
														h("span", { className: "vk_browseRowIcon" }, h(VIcon, { name: "hardDrive", size: 15 })),
														h("span", { className: "vk_name" }, p),
														h("button", { className: "vk_rowBtn vk_browseRowEnter", title: "进入此盘", onClick: (e) => { e.stopPropagation(); props.onGoto(p); } }, h(VIcon, { name: "folderOpen", size: 12 })),
														h(VIcon, { name: "chevronRight", size: 12 }))))))
									: h("div", null,
										!isRootDriveOf(path)
											? h("div", { className: "vk_browseRow vk_browseRowUp", title: parentOfPath(path), onClick: () => props.onGoto(parentOfPath(path)) },
												h("span", { className: "vk_browseRowIcon" }, h(VIcon, { name: "arrowUp", size: 14 })),
												h("span", { className: "vk_name" }, "上一级"))
											: null,
										!loaded && (props.err === null || props.err === void 0)
											? h("div", { className: "vk_browseHint" }, "加载中…")
											: null,
										loaded
											? dirs.map((d) =>
												h("div", {
													className: "vk_browseRow" + (d.hidden ? " vk_browseRowHidden" : "") + (isSelPath(d.path) ? " vk_browseRowSelected" : ""),
													key: d.path,
													title: d.path + (insertMode ? "（单击选中 · 再点一次进入；选中后点「引用」插入 @引用）" : "（单击选中 · 再点一次进入）"),
													onClick: () => clickDir(d.path, d.name)
												},
													h("span", { className: "vk_browseRowIcon" }, renderFileIcon(iconOf(d.name, true, false))),
													h("span", { className: "vk_name" }, d.name),
													// 「进入子目录」按钮：与文件栏行里那颗同款同位置（官方 @ 菜单的那颗）
													h("button", { className: "vk_rowBtn vk_browseRowEnter", title: "进入此文件夹", onClick: (e) => { e.stopPropagation(); props.onGoto(d.path); } }, h(VIcon, { name: "folderOpen", size: 12 })),
													h(VIcon, { name: "chevronRight", size: 12 })))
											: null,
										loaded
											? files.map((f) =>
												h("div", {
													className: "vk_browseRow vk_browseFileRow" + (f.hidden ? " vk_browseRowHidden" : "") + (isSelPath(f.path) ? " vk_browseRowSelected" : ""),
													key: f.path,
													title: f.path + (insertMode ? "（单击选中 · 再点一次或点「引用」插入到会话）" : "（单击选中，再点一次或点「打开」在拓展栏打开）"),
													onClick: () => clickFile(f.path, f.name)
												},
													h("span", { className: "vk_browseRowIcon" }, renderFileIcon(iconOf(f.name, false, false))),
													h("span", { className: "vk_name" }, f.name),
													h("span", { className: "vk_openHint vk_browseOpenHint" }, actWord)))
											: null,
										loaded && dirs.length === 0 && files.length === 0 && hiddenCount === 0
											? h("div", { className: "vk_browseHint" }, fileMode ? "该目录下没有子文件夹与文件" : "该目录下没有子文件夹")
											: null,
										loaded && hiddenCount > 0 && !showHidden
											? h("div", { className: "vk_browseRow vk_browseShowHidden", title: "显示隐藏条目", onClick: () => props.onToggleHidden() },
												h("span", { className: "vk_name" }, "⋯ " + hiddenCount + " 个隐藏项"),
												h(VIcon, { name: "eye", size: 12 }))
											: null))),
					h("div", { className: "vk_browseFoot" },
						h("span", { className: "vk_browseFootPath", title: sel !== null ? sel.path : path },
							sel !== null
								? (insertMode
									? (sel.isDir === true ? "已选中文件夹（点「引用」插入 @引用）：" : "已选中文件（点「引用」插入 @引用）：") + sel.path
									: (sel.isDir === true ? "已选中文件夹（点「打开」进入）：" : "已选中文件（点「打开」在拓展栏打开）：") + sel.path)
								: (insertMode
									? (path.length > 0 ? "单击选中文件或文件夹，再点「引用」插入到会话：" + path : "单击选中文件或文件夹，再点「引用」插入到会话")
									: (fileMode
										? (pickFolder
											? (path.length > 0
												? "单击选中条目 · 再点「打开」；未选中时打开当前目录：" + path
												: "单击选中条目 · 再点「打开」；未选中时打开当前目录")
											: (path.length > 0 ? "单击选中文件，再点「打开」在本标签打开：" + path : "单击选中文件，再点「打开」在本标签打开"))
										: (typeof props.openTarget === "string" && props.openTarget.length > 0 ? props.openTarget : (query.trim().length > 0 ? "正在搜索：单击选中目录，再点「打开」进入" : "未选择目录"))))),
						h("button", { className: "vk_pickBtn", onClick: () => props.onClose() }, embedded ? "关闭" : "取消"),
						h("button", {
							className: "vk_pickBtn vk_primaryBtn",
							disabled: !(sel !== null || (typeof props.openTarget === "string" && props.openTarget.length > 0)),
							title: sel !== null
								? (insertMode
									? "在会话中引用选中的" + (sel.isDir === true ? "文件夹 " : "文件 ") + sel.path
									: (sel.isDir === true ? "打开选中的文件夹 " : "在拓展栏打开选中的文件 ") + sel.path)
								: (typeof props.openTarget === "string" && props.openTarget.length > 0 ? "打开 " + props.openTarget : ""),
							onClick: () => {
								// 选中的是文件 → 走 onPickFile（引用模式下它同样是「插入 @引用」）；
								// 否则把选中项（可能为 null）交给 onOpen：null = 保持原逻辑（把当前所在目录当作目标），
								// 由各调用点自己决定含义。
								if (sel !== null && sel.isDir !== true) {
									if (typeof props.onPickFile === "function") props.onPickFile({ path: sel.path, name: sel.name });
									return;
								}
								if (typeof props.onOpen === "function") props.onOpen(sel);
							}
						}, actWord)))
			);
		}

		// ──────────────────────────────────────────────────────────────
		// 组件：文件树
		// ──────────────────────────────────────────────────────────────
		// onOpenInViewer 为可选：路线 A 下文件树住在官方左栏，点文件要在官方右侧栏多标签里打开，
		// 由挂载层传入；不传时完全保持旧行为（中栏编辑器），因此不影响任何既有调用点。
		function FileTree({ root, custom, onOpenFolder, onCloseFolder, onOpenFile, onOpenInViewer, onPickNative, activePath, recentDirs, autoRoot, onRemoveRecent, onRemoveAuto, fileList, onRememberFile, onRemoveFile, onDeleted, onDeleteTreeRow, sessionFiles, sessionDirs }) {
			// 诊断探针（临时）：实例挂载/卸载各记一次；探针 id 也挂到 DOM 上，DevTools 里能核对是不是换了实例。
			const vkProbeId = react.useRef("ft" + Math.random().toString(36).slice(2, 7));
			react.useEffect(() => {
				vkDiag.mounts += 1;
				vkDiag.lastMounts.push({ id: vkProbeId.current, at: new Date().toISOString().slice(11, 23), size: vkFileTreeState.expanded.size, root: String(root) });
				if (vkDiag.lastMounts.length > 12) vkDiag.lastMounts.shift();
				vkDiagEvent("mount", vkProbeId.current + " root=" + String(root));
				return () => {
					vkDiag.unmounts += 1;
					vkDiag.lastUnmounts.push({ id: vkProbeId.current, at: new Date().toISOString().slice(11, 23), size: vkFileTreeState.expanded.size });
					if (vkDiag.lastUnmounts.length > 12) vkDiag.lastUnmounts.shift();
					vkDiagEvent("unmount", vkProbeId.current + " size=" + vkFileTreeState.expanded.size);
				};
			}, []);
			// 诊断（临时）：把文件栏里的每次点击与栏目状态一起录下来，用来回答
			// 「点一下刚展开的栏目，到底是谁把它折回去的」。结果看 __VK_DIAG__.uiSeq。
			react.useEffect(() => {
				if (typeof document === "undefined" || typeof document.addEventListener !== "function") return;
				const record = (kind, e) => {
					try {
						const wrap = document.querySelector(".vk_treeWrap");
						if (wrap === null) return;
						const t = e.target;
						if (t === null || (typeof t.closest === "function" && t.closest(".vk_treeWrap") === null)) return;
						const sec = typeof t.closest === "function" ? t.closest('[data-vk-sec]') : null;
						vkDiagUI(kind, JSON.stringify({
							ft: wrap.dataset.vkFt || "",
							cls: String(t.className || "").slice(0, 60),
							sec: sec !== null ? String(sec.getAttribute("data-vk-sec")) : "",
							open: String(vkHomeState.open)
						}));
					} catch { /* 录不上不影响行为 */ }
				};
				const onPointer = (e) => record("pointer", e);
				const onMouse = (e) => record("mouse", e);
				document.addEventListener("pointerdown", onPointer, true);
				document.addEventListener("mousedown", onMouse, true);
				return () => {
					document.removeEventListener("pointerdown", onPointer, true);
					document.removeEventListener("mousedown", onMouse, true);
				};
			}, []);
			// 统一的「点开文件」入口：挂了 onOpenInViewer（路线 A：打开到官方右侧栏多标签）就走它，
			// 否则回落旧的中栏编辑器回调。全部调用点只走这一个函数，避免两套行为分叉。
			const activateFile = (file) => {
				if (typeof onOpenInViewer === "function") onOpenInViewer(file);
				else if (typeof onOpenFile === "function") onOpenFile(file);
			};
			// 展开集合是**模块级共享**的（vkFileTreeState，见文件顶部）：文件栏的多个入口（落地页四栏、
			// 目录树、@ 菜单旧行的兼容路径）读写同一份；这里留一个本地副本纯粹是为了触发重渲染。
			const [expanded, setExpanded] = react.useState(() => new Set(vkFileTreeState.expanded));
			react.useEffect(() => vkFileTreeSubscribe((list) => setExpanded(new Set(list))), []);
			// 栏目折叠（2026-09-11）：与 expanded 同理，订阅模块级状态后用一个 tick 触发重渲染。
			const [, setVkHomeTick] = react.useState(0);
			react.useEffect(() => vkHomeSubscribe(() => setVkHomeTick((n) => n + 1)), []);
			// 离开文件栏（切到别的 tab / 收起面板）即回到默认折叠：栏目展开态**不跨视图记忆**
			// （用户 2026-09-11 口径：切回来不该还是展开的）。
			// 2026-09-12 晚定稿：文件树的展开集同样「不跨视图记忆」，但**清空这件事只在布局层发生**
			// （VK_SidebarBody 的 tab / wide effect 直接清，见那边注释）。这里只复位栏目态；
			// 卸载/重挂载**绝不**碰展开集 —— 那正是「点开一个目录立马又被收掉」的元凶。
			// 栏目在**被隐藏时**复位（切到会话/任务 Tab 或收起左栏都走布局层 effect；这里是隐藏态卸载的兜底），
			// 与文件树的「切走再切回来仍纯折叠」同口径：不做跨视图记忆。
			// 注意这里**只**复位栏目，不碰文件树展开集（展开集只由那两条确定性 effect 清）。
			react.useEffect(() => () => { vkHomeReset("unmount"); }, []);
			// ⚠️ 2026-09-13：这里原来有一条 IntersectionObserver「离开视口就把落地页栏目折回去」的兜底，
			// **已整条删除**。它的触发信号（元素不再相交）在「展开一栏导致重排 / 滚动 / 重挂载 / 隐藏」时
			// 都会出现，于是用户点一下「工作区目录」刚展开就被它折回去（用户报「点一次立马自动收起」）。
			// 落地页栏目的复位现在只在两处发生：切走文件栏（VK_SidebarBody 的 tab/wide effect）与卸载。
			const [entries, setEntries] = react.useState(() => ({}));
			const [error, setError] = react.useState(null);
			const [picking, setPicking] = react.useState(false);
			const [pickErr, setPickErr] = react.useState(null);
			const [draft, setDraft] = react.useState("");
			// 选中态（B 项）：单击任意条目 = 选中它；再点一次才动作。Row 是 FileTree 内部组件，
			// 直接闭包读写这份状态，不必给 9 个调用点逐个加 props。
			const [selected, setSelected] = react.useState(null);
			// 换根/关根就清掉选中：选中态属于「当前这一屏」，留着会让下一次单击变成「第二次点击」。
			react.useEffect(() => { setSelected(null); }, [root]);
			const [showHidden, setShowHidden] = react.useState(false);
			// 「显示系统/隐藏项」也镜像给 @ 源：两边看到的条目必须一致（见模块顶部 vkFileTreeState）。
			react.useEffect(() => { vkFileTreeState.showHidden = showHidden === true; }, [showHidden]);
			const [git, setGit] = react.useState(null);
			react.useEffect(() => {
				setGit(null);
				if (typeof root === "string" && root.length > 0) {
					fetch("/vscode-files/git?path=" + encodeURIComponent(root))
						.then((r) => r.json())
						.then((d) => { if (d && d.ok && d.statuses) setGit(d.statuses); })
						.catch(() => {});
				}
			}, [root]);
			const [creating, setCreating] = react.useState(null);
			const [createName, setCreateName] = react.useState("");
			const [createErr, setCreateErr] = react.useState(null);
			const [searchOn, setSearchOn] = react.useState(false);
			const [searchQ, setSearchQ] = react.useState("");
			const [searchResults, setSearchResults] = react.useState(null);
			// 应用内「打开文件夹」目录浏览器状态（文件夹图标按钮；不依赖本机系统对话框）
			const [browseOpen, setBrowseOpen] = react.useState(false);
			const [browsePath, setBrowsePath] = react.useState("");
			const [browseInput, setBrowseInput] = react.useState("");
			const [browseDir, setBrowseDir] = react.useState(null);
			const [browseErr, setBrowseErr] = react.useState(null);
			const [drives, setDrives] = react.useState([]);
			const [drivesProbing, setDrivesProbing] = react.useState(false);
			const [desktopPath, setDesktopPath] = react.useState(null);
			const [showBrowseHidden, setShowBrowseHidden] = react.useState(false);
			// 弹窗顶部的模糊搜索：输入目录名关键词，在「当前浏览目录」或「探测到的全部磁盘」下递归匹配文件夹
			const [browseQ, setBrowseQ] = react.useState("");
			const [browseSearch, setBrowseSearch] = react.useState(null); // null | { busy, note, items:[{name,path,rel}] }
			const browseSeq = react.useRef(0);
			react.useEffect(() => {
				const q = browseQ.trim();
				if (q.length === 0) {
					setBrowseSearch(null);
					return;
				}
				const seq = ++browseSeq.current;
				const timer = setTimeout(() => {
					const roots = (typeof browsePath === "string" && browsePath.length > 0)
						? [browsePath]
						: [...(Array.isArray(drives) ? drives : []), ...(desktopPath !== null ? [desktopPath] : [])];
					if (roots.length === 0) {
						setBrowseSearch({ busy: false, note: "磁盘尚未检测完成，请稍候或先进入一个目录", items: [] });
						return;
					}
					setBrowseSearch({ busy: true, note: null, items: [] });
					const items = [];
					(async () => {
						for (const root of roots) {
							if (seq !== browseSeq.current) return;
							try {
								const r = await fetch("/vscode-files/search?path=" + encodeURIComponent(root) + "&q=" + encodeURIComponent(q) + "&kind=dir");
								const d = await r.json();
								if (d && d.ok && Array.isArray(d.results)) items.push(...d.results);
							} catch {}
						}
						if (seq !== browseSeq.current) return;
						setBrowseSearch({
							busy: false,
							note: items.length === 0 ? "没有匹配的文件夹，试试更短的关键词" : null,
							items: items.slice(0, 80)
						});
					})();
				}, 250);
				return () => { clearTimeout(timer); };
			}, [browseQ, browsePath, drives, desktopPath]);
			react.useEffect(() => {
				const q = searchQ.trim();
				if (q.length === 0) {
					setSearchResults(null);
					return;
				}
				if (typeof root !== "string" || root.length === 0) return;
				let dead = false;
				const timer = setTimeout(() => {
					fetch("/vscode-files/search?path=" + encodeURIComponent(root) + "&q=" + encodeURIComponent(q))
						.then((r) => r.json())
						.then((d) => { if (!dead) setSearchResults(d && d.ok ? d.results : []); })
						.catch(() => { if (!dead) setSearchResults([]); });
				}, 250);
				return () => { dead = true; clearTimeout(timer); };
			}, [searchQ, root]);
			// 换根 / 关根 → 回到默认折叠（只展开根那一层，子目录全收起）。
			// 只在 root **真的变了**时清：重挂载（root 未变）保留用户展开的目录，不再无声收掉。
			const lastRootSeenRef = react.useRef(root === undefined ? null : root);
			react.useEffect(() => {
				const changed = lastRootSeenRef.current !== root;
				lastRootSeenRef.current = root;
				if (changed) vkFileTreeClearExpanded("root-changed");
				setEntries({});
				setError(null);
				if (typeof root === "string" && root.length > 0) load(root);
			}, [root]);
			// 已展开但还没取过子项的目录，这里补一次请求：换根之外的另一种来源是「@ 菜单在 @ 里展开了一级」
			// （共享状态被对端改动），不补请求的话文件栏会一直停在「加载中…」。
			react.useEffect(() => {
				for (const p of expanded) if (entries[p] === void 0) load(p);
			}, [expanded, entries]);
			function load(path) {
				fetch("/vscode-files/list?path=" + encodeURIComponent(path))
					.then((r) => r.json())
					.then((d) => {
						if (d && d.ok) setEntries((m) => ({ ...m, [path]: d }));
						else setError((d && d.error) || "加载失败");
					})
					.catch((e) => setError(String(e)));
			}
			// ── 应用内目录浏览器（「打开文件夹」按钮；folderOpen 图标） ─────────
			function openBrowse() {
				setBrowseOpen(true);
				setBrowsePath("");
				setBrowseInput("");
				setBrowseDir(null);
				setBrowseErr(null);
				setShowBrowseHidden(false);
				setBrowseQ("");
				setBrowseSearch(null);
				probeRoots();
			}
			// 返回根视图（磁盘 + 桌面）：由面包屑行最右端固定按钮触发，任何层级可用、不随列表滚动消失
			function backToRoots() {
				setBrowsePath("");
				setBrowseInput("");
				setBrowseDir(null);
				setBrowseErr(null);
				setBrowseQ("");
				setBrowseSearch(null);
			}
			function gotoBrowse(target) {
				const t = String(target || "").trim();
				if (t.length === 0) return;
				setBrowseErr(null);
				setBrowseQ("");
				setBrowseSearch(null);
				const norm = /^[A-Za-z]:$/.test(t) ? t + "\\" : t;
				setBrowsePath(norm);
				setBrowseInput(norm);
				setBrowseDir(null);
				fetch("/vscode-files/list?path=" + encodeURIComponent(norm))
					.then((r) => r.json())
					.then((d) => {
						if (d && d.ok) { setBrowseDir(d); setBrowseErr(null); }
						else setBrowseErr((d && d.error) || "无法读取该目录");
					})
					.catch((e) => setBrowseErr(String(e)));
			}
			// 探测根视图候选：常见磁盘 + 桌面，仅展示存在的（打开弹窗时自动探测，可用头部刷新钮重试）
			function probeRoots() {
				const cands = ["C:\\", "D:\\", "E:\\", "F:\\"];
				let pending = cands.length + 1;
				const found = [];
				setDrivesProbing(true);
				setDrives([]);
				setDesktopPath(null);
				const settle = () => {
					pending -= 1;
					if (pending <= 0) {
						setDrives(found.slice().sort());
						setDrivesProbing(false);
					}
				};
				for (const p of cands) {
					fetch("/vscode-files/list?path=" + encodeURIComponent(p))
						.then((r) => r.json())
						.then((d) => { if (d && d.ok) found.push(p); })
						.catch(() => {})
						.finally(settle);
				}
				// 桌面（本机重定向）：探测到才与磁盘同级列出
				fetch("/vscode-files/list?path=" + encodeURIComponent(DESKTOP_HINT))
					.then((r) => r.json())
					.then((d) => { if (d && d.ok) setDesktopPath(DESKTOP_HINT); })
					.catch(() => {})
					.finally(settle);
			}
			function toggle(path) {
				// 展开/收起写进**模块级共享状态**（vkFileTreeToggle）：@ 菜单的「文件区」立刻跟着变；
				// 子项加载由上面那条 [expanded, entries] 的 effect 负责（两边任一方展开都会触发）。
				vkFileTreeToggle(path);
			}
			// 落地页：预载 drop-inbox 收件目录内容，让「贴入 · 文件名」行标签尽快可辨识；加载完成会自然触发重渲染
			react.useEffect(() => {
				if (typeof root === "string" && root.length > 0) return;
				const need = [];
				const pushIfDrop = (p) => { if (typeof p === "string" && p.length > 0 && isDropInboxDir(p) && entries[p] === void 0) need.push(p); };
				pushIfDrop(autoRoot);
				for (const rp of Array.isArray(recentDirs) ? recentDirs : []) pushIfDrop(rp);
				if (need.length > 0) need.forEach(load);
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, [root, autoRoot, recentDirs, entries]);
			function rel(p) {
				if (typeof root !== "string") return null;
				if (p === root) return "";
				if (p.startsWith(root + "\\") || p.startsWith(root + "/")) return p.slice(root.length + 1).replace(/\\/g, "/");
				return null;
			}
			function badgeOf(code) {
				if (code === "??") return { text: "U", cls: " vk_gitU" };
				if (code.includes("M")) return { text: "M", cls: " vk_gitM" };
				if (code.includes("A")) return { text: "A", cls: " vk_gitA" };
				if (code.includes("D")) return { text: "D", cls: " vk_gitD" };
				if (code.includes("R")) return { text: "R", cls: " vk_gitR" };
				return null;
			}
			function dirBadge(dirPath) {
				if (git === null) return null;
				const base = rel(dirPath);
				if (base === null) return null;
				const prefix = base === "" ? "" : base + "/";
				let hasM = false;
				let hasOther = false;
				for (const k of Object.keys(git)) {
					const hit = prefix === "" ? !k.includes("/") : k.startsWith(prefix);
					if (!hit) continue;
					if (git[k].includes("M") || git[k].includes("D") || git[k].includes("R")) hasM = true;
					else hasOther = true;
				}
				if (hasM) return { text: "M", cls: " vk_gitM" };
				if (hasOther) return { text: "U", cls: " vk_gitU" };
				return null;
			}
			function refreshGit() {
				if (typeof root !== "string" || root.length === 0) return;
				fetch("/vscode-files/git?path=" + encodeURIComponent(root))
					.then((r) => r.json())
					.then((d) => { if (d && d.ok && d.statuses) setGit(d.statuses); })
					.catch(() => {});
			}
			function refreshAround(dirPath) {
				load(dirPath);
				setEntries((m) => {
					const next = {};
					for (const k of Object.keys(m)) {
						if (k === dirPath) continue;
						if (k.startsWith(dirPath + "\\") || k.startsWith(dirPath + "/")) continue;
						next[k] = m[k];
					}
					return next;
				});
				refreshGit();
			}
			function commitCreate() {
				const n = createName.trim();
				const kind = creating;
				if (n.length === 0 || kind === null) return;
				const parent = typeof root === "string" ? root : "";
				if (parent.length === 0) return;
				const endpoint = kind === "dir" ? "/vscode-files/mkdir" : "/vscode-files/mkfile";
				fetch(endpoint + "?path=" + encodeURIComponent(parent), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ path: parent, name: n })
				})
					.then((r) => r.json())
					.then((d) => {
						if (d && d.ok) {
							setCreateErr(null);
							setCreating(null);
							setCreateName("");
							refreshAround(parent);
							if (kind === "file" && d.path) activateFile({ path: d.path, name: n });
						} else setCreateErr((d && d.error) || "创建失败");
					})
					.catch((e) => setCreateErr(String(e)));
			}
			function doDelete(path, name) {
				if (typeof confirm === "function" && !confirm(`删除「${name}」？\n（会送入回收站，可从回收站恢复）`)) return;
				fetch("/vscode-files/delete?path=" + encodeURIComponent(path), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ path })
				})
					.then((r) => r.json())
					.then((d) => {
						if (d && d.ok) {
							refreshAround(parentOfPath(path));
							onDeleted?.(path);
						} else setError((d && d.error) || "删除失败");
					})
					.catch((e) => setError(String(e)));
			}
			// 真删除入口（送入回收站）：文件栏所有「目录/文件的树行」共用一份（见 Row 的 ops 与 deleteTreeRow）。
			const deleteTreeRow = (p, n) => {
				if (typeof onDeleteTreeRow === "function") { onDeleteTreeRow(p, n); return; }
				doDelete(p, n);
			};
			function rows(dir, depth, seen, allowRealDelete) {
				if (!dir) return [];
				const out = [];
				for (const d of dir.dirs) {
					if (d.hidden && !showHidden) continue;
					// 整树去重：同一目录若已在别处（顶层区块/更早的展开分支）渲染过，
					// 这里不再渲染第二份——重复的同路径行共享展开状态必然联动，导致折叠错乱
					if (seen !== void 0) {
						const k = normPath(d.path);
						if (seen.has(k)) continue;
						seen.add(k);
					}
					// 目录树行（2026-09-13 语义修订）：**单击 = 原地展开/收起**（用户口径：点工作区目录就该展开看内容）；
					// 「把这个文件夹设为文件栏的根」是另一件事，只留给行尾那颗方框图标 / 双击 —— 换根会按设计重置展开集，
					// 以前三者共用一个单击，所以用户点一下就觉得「展开完立马被收掉」。只有「工作区目录」那一栏展开出来的
					// 行才多一颗真删除（allowRealDelete，用户 2026-09-12 口径）。
					const rowOps = {
						enter: true,
						// 当前根自己不再「进入」（进入等于原地重建一次根，纯属白重置）
						onEnter: () => { if (normPath(d.path) !== normPath(root)) onOpenFolder(d.path); },
						onRealRemove: allowRealDelete === true ? () => deleteTreeRow(d.path, d.name) : void 0
					};
					out.push(h(Row, { key: d.path, path: d.path, name: d.name, isDir: true, hidden: d.hidden, active: false, badge: dirBadge(d.path), depth, expanded: vkFileTreeHas(d.path), ops: rowOps, onToggle: () => toggle(d.path) }));
					if (vkFileTreeHas(d.path) && entries[d.path] && entries[d.path].ok) out.push(...rows(entries[d.path], depth + 1, seen, allowRealDelete));
				}
				for (const f of dir.files) {
					if (f.hidden && !showHidden) continue;
					const code = git !== null ? git[rel(f.path) ?? ""] ?? null : null;
					// 文件树行：不给任何操作按钮（打开 = 单击选中 · 再点一次）
					out.push(h(Row, { key: f.path, path: f.path, name: f.name, isDir: false, hidden: f.hidden, active: f.path === activePath, badge: code !== null && rel(f.path) !== null ? badgeOf(code) : null, depth, ops: {}, onToggle: () => activateFile({ path: f.path, name: f.name }) }));
				}
				return out;
			}
			function Row(props) {
				const pad = { paddingLeft: 10 + props.depth * 16 + "px" };
				const isSelected = typeof selected === "string" && selected === props.path;
				// 左侧三角：单击行已改为「选中 / 再点一次进入」，所以**展开/收起挂在这颗三角上**
				// （不 stopPropagation 的话会连带触发行单击）。
				const caret = props.isDir
					? h("span", { className: "vk_caret vk_caretBtn", title: props.expanded ? "收起此文件夹" : "展开此文件夹", onClick: (e) => { e.stopPropagation(); props.onToggle(); } }, h(VIcon, { name: props.expanded ? "chevronDown" : "chevronRight", size: 12 }))
					: h("span", { className: "vk_caret" }, "\u00A0");
				// 缩进参考线（纯装饰）：对齐各级祖先目录的 caret 中心
				const guides = [];
				for (let i = 0; i < props.depth; i++) guides.push(h("span", { key: "g" + i, className: "vk_guide", style: { left: 17 + i * 16 + "px" } }));
				const ic = iconOf(props.name, props.isDir, props.isDir && props.expanded === true);
				const icon = renderFileIcon(ic);
				const name = props.isDir
					? h("span", { className: "vk_name vk_dirName" }, props.name)
					: h("span", { className: "vk_name" }, props.name);
				const badge = props.badge ? h("span", { className: "vk_gitBadge" + props.badge.cls }, props.badge.text) : null;
				// ── 行尾按钮（2026-09-12 用户口径重排）──────────────────────────────
				// 旧版：**每一行**都挂「重命名 + 删除」，连展开出来的二级文件也带垃圾桶 —— 用户报「不符合预期」。
				// 现在按钮由调用方用 props.ops 显式指定，三种形态：
				//   ① 列表行（落地页四栏的条目）：仅移出列表 / 仅打开，不碰磁盘；
				//   ② 目录树行：进入文件夹 + 真删除（送回收站，带确认）；
				//   ③ 文件树行：一颗都不给（打开靠单击选中 · 再点一次）。
				// 重命名整体退场：列表条目改名没有意义，树行改名用户已明确不要（见 ops 的调用点）。
				const ops = props.ops !== void 0 && props.ops !== null ? props.ops : {};
				const rowOpenable = props.isDir === true && typeof props.onOpenDir === "function";
				const opBtns = [];
				if (ops.enter === true) {
					opBtns.push(h("button", {
						className: "vk_rowBtn",
						title: "进入此文件夹（打开为文件栏当前根）",
						onClick: (e) => { e.stopPropagation(); (ops.onEnter ?? props.onOpenDir)(); }
					}, h(VIcon, { name: "folderOpen", size: 12 })));
				}
				if (typeof ops.onRemove === "function") {
					opBtns.push(h("button", {
						className: "vk_rowBtn",
						title: ops.removeTitle || "移除（仅移出列表，不删磁盘文件）",
						onClick: (e) => { e.stopPropagation(); ops.onRemove(); }
					}, h(VIcon, { name: "trash", size: 12 })));
				}
				if (typeof ops.onRealRemove === "function") {
					opBtns.push(h("button", {
						className: "vk_rowBtn vk_rowBtnDanger",
						title: "删除（送入回收站）",
						onClick: (e) => { e.stopPropagation(); ops.onRealRemove(); }
					}, h(VIcon, { name: "trash", size: 12 })));
				}
				const actions = opBtns.length > 0 ? h("span", { className: "vk_rowActions" }, opBtns) : null;
				// 单击语义（2026-09-13 修订）：
				//   · 目录行 → **原地展开/收起**（用户口径：点工作区目录就该展开看里面的东西）；
				//   · 文件行 → 先选中、再点一次才在拓展栏打开（保持原有防误触）；
				//   · 「把该目录设为文件栏的根」只留给行尾方框图标 / 双击（换根会按设计重置展开集）。
				const onClick = () => {
					if (props.isDir === true) { props.onToggle(); return; }
					if (!isSelected) { setSelected(props.path); return; }
					props.onToggle();
				};
				// titleText：非目录行（如「文件列表」里的文件）也要能挂 tooltip——目录行用固定的展开/打开提示，
				// 文件行以前 title 恒为 undefined，看不见完整路径。
				const rowTitle = typeof props.titleText === "string"
					? props.titleText
					: (props.isDir === true
						? props.name + "（单击展开/收起 · 双击或点行尾方框 = 设为文件栏根）"
						: props.name + "（单击选中 · 再点一次在拓展栏打开）");
				return h("div", { className: "vk_row" + (props.hidden ? " vk_rowHidden" : "") + (props.active ? " vk_rowActive" : "") + (isSelected ? " vk_rowSelected" : ""), style: pad, title: rowTitle, onClick: onClick, onDoubleClick: rowOpenable ? (e) => { e.preventDefault(); props.onOpenDir(); } : void 0 }, guides, caret, icon, name, badge, h("span", { className: "vk_rowTail" }, actions));
			}
			// 打开前先校验目录真实存在：ok→onOk(path)；不存在/不可读→onReject(path)（不进入，避免把编造的路径当文件夹打开）
			function tryOpenFolder(p, onOk, onReject) {
				const t = String(p || "").trim();
				if (t.length === 0) return;
				fetch("/vscode-files/list?path=" + encodeURIComponent(t))
					.then((r) => r.json())
					.then((d) => {
						if (d && d.ok) { if (typeof onOk === "function") onOk(t); }
						else if (typeof onReject === "function") onReject(t);
					})
					.catch(() => { if (typeof onReject === "function") onReject(t); });
			}
			function commitFolder() {
				const p = draft.trim();
				if (p.length === 0) return;
				tryOpenFolder(p,
					(path) => { setPicking(false); setDraft(""); setPickErr(null); onOpenFolder(path); },
					(path) => { setPickErr("当前文件夹不存在：" + path); }
				);
			}
			const title = typeof root === "string" && root.length > 0 ? (root.split(/[\\/]/).pop() || root) : "常用目录";
			const head = h("div", { className: "vk_treeHead" },
				h("span", { className: "vk_treeTitle", title: typeof root === "string" ? root : "" }, title),
				h("button", {
					className: "vk_treeBtn",
					title: "打开文件夹（应用内浏览目录）",
					onClick: () => openBrowse()
				}, h(VIcon, { name: "folderOpen", size: 13 })),
				h("button", { className: "vk_treeBtn" + (showHidden ? " vk_treeBtnActive" : ""), title: showHidden ? "隐藏系统/配置文件" : "显示系统/配置文件（node_modules、.git 等）", onClick: () => setShowHidden((v) => !v) }, h(VIcon, { name: "eye", size: 13 })),
				h("button", { className: "vk_treeBtn", title: "手动输入路径", onClick: () => { setPicking(true); setDraft(""); } }, h(VIcon, { name: "edit", size: 13 })),
				h("button", { className: "vk_treeBtn" + (creating !== null ? " vk_treeBtnActive" : ""), disabled: !(typeof root === "string" && root.length > 0), title: (typeof root === "string" && root.length > 0) ? "新建文件/文件夹" : "新建文件/文件夹：需先打开或双击进入一个文件夹", onClick: () => { if (!(typeof root === "string" && root.length > 0)) return; setCreating(creating === null ? "file" : null); setCreateName(""); setCreateErr(null); } }, "＋"),
				h("button", { className: "vk_treeBtn" + (searchOn ? " vk_treeBtnActive" : ""), disabled: !(typeof root === "string" && root.length > 0), title: (typeof root === "string" && root.length > 0) ? "搜索文件" : "搜索文件：需先打开或双击进入一个文件夹", onClick: () => { if (!(typeof root === "string" && root.length > 0)) return; setSearchOn(!searchOn); setSearchQ(""); } }, h(VIcon, { name: "search", size: 13 })),
				custom ? h("button", { className: "vk_treeBtn", title: "关闭当前文件夹（回到常用目录）", onClick: onCloseFolder }, "×") : null
			);
			const picker = picking ? h("div", { className: "vk_pickForm" },
				h("input", {
					className: "vk_pickInput",
					placeholder: "输入文件夹绝对路径，如 D:\\my-projects",
					value: draft,
					autoFocus: true,
					onChange: (e) => { setDraft(e.target.value); setPickErr(null); },
					onKeyDown: (e) => {
						if (e.key === "Enter") commitFolder();
						if (e.key === "Escape") { setPicking(false); setDraft(""); setPickErr(null); }
					}
				}),
				pickErr !== null ? h("div", { className: "vk_pickErr" }, pickErr) : null,
				h("div", { className: "vk_pickRow" },
					h("button", { className: "vk_pickBtn", onClick: commitFolder }, "打开"),
					h("button", { className: "vk_pickBtn", onClick: () => { setPicking(false); setDraft(""); setPickErr(null); } }, "取消")
				)
			) : null;
			const createForm = creating !== null ? h("div", { className: "vk_pickForm" },
				h("div", { className: "vk_pickRow" },
					h("button", { className: "vk_pickBtn" + (creating === "file" ? " vk_modeBtn" : ""), onClick: () => setCreating("file") }, "新建文件"),
					h("button", { className: "vk_pickBtn" + (creating === "dir" ? " vk_modeBtn" : ""), onClick: () => setCreating("dir") }, "新建文件夹")
				),
				h("input", {
					className: "vk_pickInput",
					placeholder: creating === "dir" ? "文件夹名" : "文件名",
					value: createName,
					autoFocus: true,
					onChange: (e) => setCreateName(e.target.value),
					onKeyDown: (e) => {
						if (e.key === "Enter") commitCreate();
						if (e.key === "Escape") { setCreating(null); setCreateName(""); setCreateErr(null); }
					}
				}),
				createErr !== null ? h("span", { className: "vk_saveMsg" }, createErr) : null,
				h("div", { className: "vk_pickRow" },
					h("button", { className: "vk_pickBtn", onClick: commitCreate }, "创建"),
					h("button", { className: "vk_pickBtn", onClick: () => { setCreating(null); setCreateName(""); setCreateErr(null); } }, "取消")
				)
			) : null;
			const searchForm = searchOn ? h("div", { className: "vk_pickForm" },
				h("input", {
					className: "vk_pickInput",
					placeholder: "搜索文件名…（回车打开第一个结果）",
					value: searchQ,
					autoFocus: true,
					onChange: (e) => setSearchQ(e.target.value),
					onKeyDown: (e) => {
						if (e.key === "Escape") { setSearchOn(false); setSearchQ(""); }
						if (e.key === "Enter" && searchResults !== null && searchResults.length > 0) {
							const first = searchResults[0];
							activateFile({ path: first.path, name: first.name });
							setSearchOn(false);
							setSearchQ("");
						}
					}
				})
			) : null;
			const dir = typeof root === "string" && root.length > 0 ? entries[root] : void 0;
			const body = (() => {
				if (searchOn && searchQ.trim().length > 0) {
					if (searchResults === null) return h("div", { className: "vk_empty" }, "搜索中…");
					if (searchResults.length === 0) return h("div", { className: "vk_empty" }, "没有匹配的文件");
					return searchResults.map((r) => h("div", {
						key: r.path,
						className: "vk_row" + (selected === r.path ? " vk_rowSelected" : ""),
						style: { paddingLeft: 10 + "px" },
						title: r.path + "（单击选中 · 再点一次在拓展栏打开）",
						onClick: () => {
							// 与文件栏行同一套语义（B 项）：单击 = 选中，再点一次才打开。
							if (selected !== r.path) { setSelected(r.path); return; }
							activateFile({ path: r.path, name: r.name });
							setSearchOn(false);
							setSearchQ("");
						}
					},
						h("span", { className: "vk_caret" }, "\u00A0"),
						renderFileIcon(iconOf(r.name, false, false)),
						h("span", { className: "vk_name vk_nameFixed" }, r.name),
						h("span", { className: "vk_relPath" }, r.rel)
					));
				}
				if (typeof root !== "string" || root.length === 0) {
					const els = [];
					// 栏目头（2026-09-11 用户要求）：可点击折叠 / 展开，▾ = 展开中、▸ = 已收起，后面带条数。
					const secHead = (key, name, count) => h("div", {
						key: key,
						className: "vk_homeLabel vk_homeLabelToggle",
						"data-vk-sec": name,
						title: "点击折叠 / 展开「" + name + "」",
						onClick: () => vkHomeToggle(name)
					}, (vkHomeIsOpen(name) ? "\u25BE " : "\u25B8 ") + name + (count > 0 ? "（" + count + " 条）" : ""));
					// 落地页整树去重（顶层行与展开子行共用同一 seen 集合，由 rows(...,topSeen) 逐级登记）：
					// 同一目录若同时出现在工作区目录 / 会话建议根 / 最近打开 / 某目录的子层级里，只渲染最早一份——
					// 重复的同路径行共享展开状态必然联动，导致子项收不干净、串位、折叠错乱
					const topSeen = new Set();
					const topSeenAdd = (p) => {
						const k = normPath(p);
						if (topSeen.has(k)) return false;
						topSeen.add(k);
						return true;
					};
					els.push(secHead("__wsHead", "工作区目录", HOME_DIRS.length));
					if (vkHomeIsOpen("工作区目录")) for (const hd of HOME_DIRS) {
						if (!topSeenAdd(hd.path)) continue;
						const open = vkFileTreeHas(hd.path);
						// 列表条目本身：只给「进入」（这两个是固定常用目录，不让人从列表里删掉）
						els.push(h(Row, { key: hd.path, path: hd.path, name: hd.name, isDir: true, hidden: false, active: false, badge: null, depth: 0, expanded: open, ops: { enter: true, onEnter: () => { if (normPath(hd.path) !== normPath(root)) onOpenFolder(hd.path); } }, onOpenDir: () => { if (normPath(hd.path) !== normPath(root)) onOpenFolder(hd.path); }, onToggle: () => toggle(hd.path) }));
						if (!open) continue;
						const sub = entries[hd.path];
						if (sub === void 0) els.push(h("div", { key: hd.path + "-loading", className: "vk_hiddenHint" }, "加载中…"));
						else if (sub.ok) els.push(...rows(sub, 1, topSeen, true)); // 只有这一栏的展开行带「真删除」
						else els.push(h("div", { key: hd.path + "-err", className: "vk_hiddenHint" }, sub.error || "读取失败"));
					}
					// 「当前会话文件」（第三轮微调第四批追加，用户要求**紧跟「工作区目录」**）：
					// 数据源 = host 的 /vscode-files/session-files；自 2026-09-12 起该接口只回 **src="paste"**
					// （用户自己贴进对话的路径）——原先还回「Agent 写/改过的文件」与「会话根下近期改动的文件」，
					// 于是会话里被 Agent 动过的文件全被当成「会话文件」混进来（用户口径：这一栏只该是我贴进来的）。
					// 行内只有垃圾桶 = **仅从列表移出**（不删磁盘文件，与「最近打开」那颗同义）。
					const sessFiles = (Array.isArray(sessionFiles) ? sessionFiles : [])
						.filter((it) => it !== null && typeof it === "object" && typeof it.path === "string" && it.path.length > 0);
					if (sessFiles.length > 0) {
						els.push(secHead("__sessionHead", "当前会话文件", sessFiles.length));
						if (vkHomeIsOpen("当前会话文件")) for (const it of sessFiles) {
							const fname = typeof it.name === "string" && it.name.length > 0 ? it.name : pathBase(it.path);
							els.push(h(Row, {
								key: "session:" + it.path,
								path: it.path,
								name: fname,
								isDir: false,
								hidden: false,
								active: typeof activePath === "string" && activePath === it.path,
								badge: null,
								depth: 0,
								titleText: it.path + "（当前会话文件 · 点一下在拓展栏打开）",
								ops: {
									onRemove: () => { if (typeof onRemoveRecent === "function") onRemoveRecent(it.path); },
									removeTitle: "从当前会话文件移出（不删除磁盘文件）"
								},
								onToggle: () => activateFile({ path: it.path, name: fname })
							}));
						}
					}
					const autoPath = (typeof autoRoot === "string" && autoRoot.length > 0) ? autoRoot : null;
					const autoShown = autoPath !== null && !isHomeDirPath(autoPath) && topSeenAdd(autoPath);
					if (autoShown) els.push(secHead("__recentHead", "最近打开", 0));
					if (autoShown && vkHomeIsOpen("最近打开")) {
						const open = vkFileTreeHas(autoPath);
						els.push(h(Row, { key: autoPath, path: autoPath, name: landingLabel(autoPath, entries[autoPath]), isDir: true, hidden: false, active: false, badge: null, depth: 0, expanded: open, ops: { enter: true, onEnter: () => onOpenFolder(autoPath), onRemove: () => { if (typeof onRemoveAuto === "function") onRemoveAuto(autoPath); }, removeTitle: "从最近打开移出（不删除磁盘文件）" }, onOpenDir: () => onOpenFolder(autoPath), onToggle: () => toggle(autoPath) }));
						if (open) {
							const sub = entries[autoPath];
							if (sub === void 0) els.push(h("div", { key: autoPath + "-loading", className: "vk_hiddenHint" }, "加载中…"));
							else if (sub.ok) els.push(...rows(sub, 1, topSeen));
							else els.push(h("div", { key: autoPath + "-err", className: "vk_hiddenHint" }, sub.error || "读取失败"));
						}
					}
					// 贴进对话的**文件夹**也进「最近打开」（用户口径：最近打开 = 我手动打开的 + 贴进对话的路径）；
					// host 侧现在只回 src="paste" 的目录（见 /vscode-files/session-files）。先后顺序：
					// 会话建议根 → 本会话贴入的文件夹 → 本会话自己打开过的目录（localStorage 那份）。
					const sessDirRows = (Array.isArray(sessionDirs) ? sessionDirs : [])
						.filter((it) => it !== null && typeof it === "object" && typeof it.path === "string" && it.path.length > 0 && !isHomeDirPath(it.path))
						.map((it) => ({ path: it.path, name: typeof it.name === "string" && it.name.length > 0 ? it.name : pathBase(it.path) }));
					const recents = (Array.isArray(recentDirs) ? recentDirs : []).filter((p) => typeof p === "string" && p.length > 0 && !isHomeDirPath(p) && (autoPath === null || normPath(p) !== normPath(autoPath)));
					const recentRows = [...sessDirRows, ...recents.map((p) => ({ path: p, name: landingLabel(p, entries[p]) }))];
					if (recentRows.length > 0) {
						if (!autoShown) els.push(secHead("__recentHead", "最近打开", recentRows.length));
						if (vkHomeIsOpen("最近打开")) for (const rr of recentRows) {
							if (!topSeenAdd(rr.path)) continue;
							const open = vkFileTreeHas(rr.path);
							els.push(h(Row, {
								key: rr.path, path: rr.path, name: rr.name, isDir: true, hidden: false, active: false, badge: null, depth: 0,
								expanded: open,
								ops: {
									enter: true,
									onEnter: () => { if (normPath(rr.path) !== normPath(root)) onOpenFolder(rr.path); },
									// 贴入的文件夹、自己打开过的目录：都从「最近打开」移出（磁盘文件一律不动）。
									// 贴入的那份还要在 host 侧抹掉记录，否则 3 秒轮询会把它带回来（调用方一并处理）。
									onRemove: () => { if (typeof onRemoveRecent === "function") onRemoveRecent(rr.path); },
									removeTitle: "从最近打开移出（不删除磁盘文件）"
								},
								onOpenDir: () => { if (normPath(rr.path) !== normPath(root)) onOpenFolder(rr.path); },
								onToggle: () => toggle(rr.path)
							}));
							if (open) {
								const sub = entries[rr.path];
								if (sub === void 0) els.push(h("div", { key: rr.path + "-loading", className: "vk_hiddenHint" }, "加载中…"));
								else if (sub.ok) els.push(...rows(sub, 1, topSeen));
								else els.push(h("div", { key: rr.path + "-err", className: "vk_hiddenHint" }, sub.error || "读取失败"));
							}
						}
					}
					// 文件列表（第二轮新增）：由文件夹图标那个自适应浏览器里「点中文件」写进来的，
					// 点条目 = 重新在拓展栏打开；垃圾桶 = 仅移出列表（不删磁盘文件）。
					const fileItems = (Array.isArray(fileList) ? fileList : []).filter((it) => it !== null && typeof it === "object" && typeof it.path === "string" && it.path.length > 0);
					if (fileItems.length > 0) {
						els.push(secHead("__fileHead", "文件列表", fileItems.length));
						if (vkHomeIsOpen("文件列表")) for (const it of fileItems) {
							const fname = typeof it.name === "string" && it.name.length > 0 ? it.name : pathBase(it.path);
							els.push(h(Row, {
								key: "file:" + it.path,
								path: it.path,
								name: fname,
								isDir: false,
								hidden: false,
								active: typeof activePath === "string" && activePath === it.path,
								badge: null,
								depth: 0,
								titleText: it.path + "（点一下在拓展栏重新打开）",
								ops: {
									onRemove: () => { if (typeof onRemoveFile === "function") onRemoveFile(it.path); },
									removeTitle: "从文件列表移出（不删除磁盘文件）"
								},
								onToggle: () => activateFile({ path: it.path, name: fname })
							}));
						}
					}
					return els;
				}
				if (error !== null) return h("div", { className: "vk_err" }, error);
				if (dir === void 0) return h("div", { className: "vk_empty" }, "加载中…");
				if (dir.ok) {
					const hiddenCount = showHidden ? 0 : dir.dirs.filter((d) => d.hidden).length + dir.files.filter((f) => f.hidden).length;
					return [...rows(dir, 0), hiddenCount > 0 ? h("div", { key: "__hiddenHint", className: "vk_hiddenHint" }, "⋯ 已折叠 " + hiddenCount + " 个隐藏项（点眼睛图标显示）") : null];
				}
				return h("div", { className: "vk_err" }, dir.error || "无法读取目录");
			})();
			// 浏览弹窗改用共用组件（VK_BrowseModal）：与拓展栏「打开本机文件」是同一套 UI 与交互。
			// 第二轮起这里是**自适应**的：目录行照旧点进下一级，文件行可点（点了就在拓展栏打开并记入
			// 「文件列表」），底部「打开」则把当前所在目录加入列表——不再让人先选「目录 / 文件」模式，
			// 「打开了 A 但没选任何文件」= 选中 A，「进入了子目录 B」= 选中 B，「点了文件 C」= 选中 C。
			const openTarget = browseQ.trim().length > 0 ? "" : browseInput.trim();
			const browseModal = browseOpen ? h(VK_BrowseModal, {
				fileMode: true,
				pickFolder: true,
				path: browsePath,
				dir: browseDir,
				err: browseErr,
				drives: drives,
				probing: drivesProbing,
				desktopPath: desktopPath,
				query: browseQ,
				search: browseSearch,
				showHidden: showBrowseHidden,
				openTarget: openTarget,
				onQuery: (v) => setBrowseQ(v),
				onGoto: (target) => gotoBrowse(target),
				onRoots: () => backToRoots(),
				onToggleHidden: () => setShowBrowseHidden((v) => !v),
				onReload: () => probeRoots(),
				onClose: () => setBrowseOpen(false),
				onOpen: (sel) => {
					// 选中了文件夹 → 打开**选中的**那个（B 项第 4 条）；没选中 → 原逻辑（打开当前所在目录）
					const target = sel !== null && sel !== undefined && sel.isDir === true ? sel.path : openTarget;
					if (target.length === 0) return;
					tryOpenFolder(target,
						(path) => { onOpenFolder(path); setBrowseOpen(false); },
						(path) => { setBrowseErr("当前文件夹不存在：" + path); }
					);
				},
				// 自适应分支之二：点中文件 → 在拓展栏打开 + 记入「文件列表」+ 关掉弹窗
				// （弹窗是覆盖全屏的，不关掉就看不见右栏刚打开的文件）。
				onPickFile: (f) => {
					if (f === null || typeof f !== "object" || typeof f.path !== "string") return;
					activateFile({ path: f.path, name: f.name });
					if (typeof onRememberFile === "function") onRememberFile({ path: f.path, name: f.name });
					setBrowseOpen(false);
				}
			}) : null;
			return h("div", { className: "vk_treeWrap", "data-vk-ft": vkProbeId.current }, head, picker, createForm, searchForm, h("div", { className: "vk_tree" }, body), browseModal);
		}

		// ──────────────────────────────────────────────────────────────
		// 组件：会话（中间栏）头部右上角的「打开/收起拓展栏」按钮
		// ──────────────────────────────────────────────────────────────
		/**
		 * 拓展栏「展开状态 + 开关」——三处入口共用（会话头右上角、左栏 Tab 条、窄轨按钮）。
		 * 官方 store 自研订不到，只能 800ms 轮询 `sidebarRight.isExpanded()`：服务面只有
		 * `isExpanded()` / `toggleExpanded()`（⚠️ 没有 `expanded()`）。开关结果写进 localStorage，
		 * 供 VK_SidebarBody 在下次加载时「常驻恢复」（官方自己不持久化，实测每次都是收起）。
		 */
		function useVKRightPane() {
			const [open, setOpen] = react.useState(false);
			// 落盘基线：首次读到只记基线、不写盘（否则会和下方「常驻恢复」抢跑，把 key 提前改成当前值）；
			// 之后只在**真实状态变化**时同步落盘。
			const baseRef = react.useRef(null);
			react.useEffect(() => {
				const read = () => {
					try {
						const sr = ctxRef.current.get("sidebarRight");
						// 服务未就绪时既不能读也不能写：早期误读成 false 会把「上次是展开」的恢复依据抹掉。
						if (sr === undefined || sr === null || typeof sr.isExpanded !== "function") return;
						const v = sr.isExpanded() === true;
						setOpen((prev) => (prev === v ? prev : v));
						if (baseRef.current === null) { baseRef.current = v; return; }
						if (baseRef.current !== v) {
							baseRef.current = v;
							// 2026-09-11 修复（用户报「刷新前双栏、刷新后变三栏」）：展开态过去只在自研按钮里落盘，
							// 用官方入口（或其它路径）收起时 localStorage 停在旧值 "1"，下次刷新就按旧值恢复成三栏。
							// 现在跟随真实状态同步落盘 —— key 永远等于「最后一次真实状态」。
							try { window.localStorage.setItem(VK_RIGHT_PANE_KEY, v ? "1" : "0"); } catch { /* ignore */ }
						}
					} catch { /* 服务未就绪 */ }
				};
				read();
				const t = setInterval(read, 800);
				return () => clearInterval(t);
			}, []);
			const toggle = () => {
				try {
					const sr = ctxRef.current.get("sidebarRight");
					if (sr === undefined || sr === null || typeof sr.toggleExpanded !== "function") return;
					const before = typeof sr.isExpanded === "function" ? sr.isExpanded() === true : open;
					sr.toggleExpanded();
					// ⚠️ 官方 store 是**异步生效**的：紧跟 toggleExpanded() 之后读 isExpanded() 拿到的还是旧值
					// （实测第一版就把持久化状态存反了：展开存成 "0"、收起存成 "1"，刷新后恢复的正好相反）。
					// 所以这里轮询等它翻过来再落盘，最多 1 秒；实在读不到就按「取反」兜底。
					let tries = 0;
					const settle = () => {
						tries += 1;
						let now = null;
						try { now = typeof sr.isExpanded === "function" ? sr.isExpanded() === true : null; } catch { now = null; }
						if (now === null || now === before) {
							if (tries < 5) { setTimeout(settle, 200); return; }
							now = !before;
						}
						setOpen(now);
						try { window.localStorage.setItem(VK_RIGHT_PANE_KEY, now ? "1" : "0"); } catch { /* ignore */ }
					};
					settle();
				} catch { /* 没接上官方右栏服务就什么也不做 */ }
			};
			return { open: open, toggle: toggle };
		}
		/**
		 * 会话（中间栏）头部右上角的「打开/收起拓展栏」按钮。
		 *
		 * 为什么原先放在这里：官方的收起/展开按钮也在同一个角（官方 sidebar-right 把 ExpandButton 注册到
		 * `conversation.session.header.corner`），但实测**收起态那颗 `[data-sidebar-right-expand]` 并不出现**。
		 *
		 * ⚠️ 只放这里不够（用户实测反馈：新会话/欢迎页「必须对话一次才看得到拓展栏那一栏」）：
		 * 该角所在的整块会话头**只在会话真正打开时才挂载**（`[data-conversation-header-corner]` 数量 = 0），
		 * 于是「一条消息都没发」时根本没有入口。修法 = 再在**常驻的左栏**放两个同样的入口
		 * （Tab 条最右端那颗图标按钮 + 窄轨里的按钮），三处共用 useVKRightPane 的状态与开关。
		 */
		function VK_RightPaneToggle() {
			const pane = useVKRightPane();
			return h("button", {
				type: "button",
				className: "vk_rightToggle" + (pane.open ? " vk_rightToggleOn" : ""),
				title: pane.open ? "收起拓展栏（官方右侧栏）" : "打开拓展栏（官方右侧栏）",
				"aria-label": pane.open ? "收起拓展栏" : "打开拓展栏",
				"data-vk-right-toggle": "true",
				onClick: pane.toggle
			}, h(VIcon, { name: "panelRight", size: 16 }));
		}

		// ──────────────────────────────────────────────────────────────
		// 组件：全局人设设置分区（settings.section，类似 CC 的全局 CLAUDE.md）
		// ──────────────────────────────────────────────────────────────
		function PersonaSection() {
			const [content, setContent] = react.useState(null); // null = 加载中
			const [saving, setSaving] = react.useState(false);
			const [msg, setMsg] = react.useState(null); // {ok, text}
			react.useEffect(() => {
				let dead = false;
				fetch("/vscode-files/persona")
					.then((r) => r.json())
					.then((d) => { if (!dead) setContent(d && d.ok ? (d.content || "") : ""); })
					.catch(() => { if (!dead) setContent(""); });
				return () => { dead = true; };
			}, []);
			const save = () => {
				setSaving(true);
				setMsg(null);
				fetch("/vscode-files/persona", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }) })
					.then((r) => r.json())
					.then((d) => { setSaving(false); setMsg(d && d.ok ? { ok: true, text: "已保存，新消息立即生效" } : { ok: false, text: (d && d.error) || "保存失败" }); })
					.catch((e) => { setSaving(false); setMsg({ ok: false, text: String(e) }); });
			};
			return h("div", { className: "vk_personaSection" },
				h("div", { className: "vk_personaDesc" }, "类似 Claude Code 的全局 CLAUDE.md：内容会注入到所有会话的系统提示中，新消息立即生效（无需重启）。支持 Markdown。"),
				content === null
					? h("div", { className: "vk_personaDesc" }, "加载中…")
					: h("textarea", { className: "vk_personaArea", value: content, onChange: (e) => setContent(e.target.value), placeholder: "例如：\n- 你叫小鲸，说话简洁直接\n- 一律用简体中文回答\n- …" }),
				h("div", { className: "vk_personaFoot" },
					msg !== null ? h("div", { className: "vk_personaMsg" + (msg.ok ? " vk_personaMsgOk" : " vk_personaMsgErr") }, msg.text) : null,
					h("div", { style: { flex: 1 } }),
					h("button", { className: "vk_personaSave", disabled: saving || content === null, onClick: save }, saving ? "保存中…" : "保存")
				)
			);
		}

		// ──────────────────────────────────────────────────────────────
		// 组件：Skill 管理分区（~/.dsh/skills，开关/删除）
		// ──────────────────────────────────────────────────────────────
		function SkillSection() {
			const [skills, setSkills] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const [err, setErr] = react.useState(null);
			const refresh = react.useCallback(() => {
				let dead = false;
				setBusy(true);
				fetch("/vscode-files/skills")
					.then((r) => r.json())
					.then((d) => { if (!dead) { setSkills(d && d.ok ? d.skills : []); setErr(null); } })
					.catch((e) => { if (!dead) setErr(String(e)); })
					.finally(() => { if (!dead) setBusy(false); });
				return () => { dead = true; };
			}, []);
			react.useEffect(refresh, [refresh]);
			const act = (path, kind) => {
				setBusy(true);
				setErr(null);
				fetch("/vscode-files/skills/" + kind, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path }) })
					.then((r) => r.json())
					.then((d) => { if (!d || !d.ok) setErr((d && d.error) || "操作失败"); refresh(); })
					.catch((e) => { setErr(String(e)); setBusy(false); });
			};
			return h("div", { className: "vk_personaSection" },
				h("div", { className: "vk_mgrHead" },
					h("div", { className: "vk_personaDesc", style: { flex: 1 } }, "管理 ~/.dsh/skills 下的全局 Skill（目录含 SKILL.md，或单文件 .md）。关闭 = 标记 .disabled，不删除内容。"),
					h("button", { className: "vk_mgrBtn", onClick: refresh, disabled: busy }, "刷新")
				),
				err !== null ? h("div", { className: "vk_personaMsg vk_personaMsgErr" }, String(err)) : null,
				skills === null ? h("div", { className: "vk_mgrEmpty" }, "加载中…")
					: skills.length === 0 ? h("div", { className: "vk_mgrEmpty" }, "暂无全局 Skill（~/.dsh/skills 为空）")
					: h("div", { className: "vk_mgrList" },
						skills.map((s) => h("div", { key: s.path, className: "vk_mgrRow" },
							h("div", { className: "vk_mgrInfo" },
								h("div", { className: "vk_mgrName" }, s.name),
								h("div", { className: "vk_mgrMeta" }, (s.kind === "dir" ? "目录" : "单文件") + " · " + s.path)
							),
							h("span", { className: "vk_mgrBadge " + (s.enabled ? "vk_mgrBadgeOn" : "vk_mgrBadgeOff") }, s.enabled ? "开启" : "关闭"),
							h("button", { className: "vk_mgrBtn", disabled: busy, onClick: () => act(s.path, "toggle") }, s.enabled ? "关闭" : "开启"),
							h("button", { className: "vk_mgrBtn vk_mgrBtnDanger", disabled: busy, onClick: () => { if (window.confirm("确定删除 Skill「" + s.name + "」？（送回收站，可恢复）")) act(s.path, "delete"); } }, "删除")
						))
					)
			);
		}

		// ──────────────────────────────────────────────────────────────
		// 组件：MCP 管理分区（~/.dsh/mcp-servers.json，开关/删除/添加）
		// ──────────────────────────────────────────────────────────────
		function MCPSection() {
			const [servers, setServers] = react.useState(null);
			const [busy, setBusy] = react.useState(false);
			const [err, setErr] = react.useState(null);
			const [showAdd, setShowAdd] = react.useState(false);
			const [form, setForm] = react.useState({ serverName: "", transport: "stdio", command: "", args: "", url: "", env: "{}" });
			const refresh = react.useCallback(() => {
				let dead = false;
				setBusy(true);
				fetch("/vscode-files/mcp")
					.then((r) => r.json())
					.then((d) => { if (!dead) { setServers(d && d.ok ? d.servers : []); setErr(null); } })
					.catch((e) => { if (!dead) setErr(String(e)); })
					.finally(() => { if (!dead) setBusy(false); });
				return () => { dead = true; };
			}, []);
			react.useEffect(refresh, [refresh]);
			const act = (id, kind) => {
				setBusy(true);
				setErr(null);
				fetch("/vscode-files/mcp/" + kind, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) })
					.then((r) => r.json())
					.then((d) => { if (!d || !d.ok) setErr((d && d.error) || "操作失败"); refresh(); })
					.catch((e) => { setErr(String(e)); setBusy(false); });
			};
			const submitAdd = () => {
				let env = {};
				try {
					env = JSON.parse(form.env || "{}");
					if (typeof env !== "object" || env === null || Array.isArray(env)) throw new Error("not object");
				} catch {
					setErr("环境变量需为 JSON 对象，如 {\"KEY\":\"value\"}");
					return;
				}
				setBusy(true);
				setErr(null);
				fetch("/vscode-files/mcp/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
					serverName: form.serverName.trim(),
					transport: form.transport,
					command: form.command.trim(),
					args: form.args.split(/[\s,]+/).filter(Boolean),
					url: form.url.trim(),
					env
				}) })
					.then((r) => r.json())
					.then((d) => {
						setBusy(false);
						if (!d || !d.ok) setErr((d && d.error) || "添加失败");
						else {
							setShowAdd(false);
							setForm({ serverName: "", transport: "stdio", command: "", args: "", url: "", env: "{}" });
							refresh();
						}
					})
					.catch((e) => { setBusy(false); setErr(String(e)); });
			};
			return h("div", { className: "vk_personaSection" },
				h("div", { className: "vk_mgrHead" },
					h("div", { className: "vk_personaDesc", style: { flex: 1 } }, "管理 MCP server（~/.dsh/mcp-servers.json，含密钥，请勿外传）。开关即时生效，无需重启。"),
					h("button", { className: "vk_mgrBtn", onClick: () => setShowAdd(!showAdd) }, showAdd ? "取消添加" : "＋ 添加 MCP"),
					h("button", { className: "vk_mgrBtn", onClick: refresh, disabled: busy }, "刷新")
				),
				err !== null ? h("div", { className: "vk_personaMsg vk_personaMsgErr" }, String(err)) : null,
				showAdd ? h("div", { className: "vk_mgrAddForm" },
					h("div", { className: "vk_mgrLabel" }, "serverName（唯一标识，1-32 位字母/数字/_-）"),
					h("input", { className: "vk_mgrInput", value: form.serverName, onChange: (e) => setForm({ ...form, serverName: e.target.value }), placeholder: "my-server" }),
					h("div", { className: "vk_mgrLabel" }, "传输类型"),
					h("select", { className: "vk_mgrInput", value: form.transport, onChange: (e) => setForm({ ...form, transport: e.target.value }) },
						h("option", { value: "stdio" }, "stdio（本地进程）"),
						h("option", { value: "streamable-http" }, "streamable-http（远程 URL）")
					),
					form.transport === "stdio"
						? h("div", { className: "vk_mgrLabel" }, "命令（参数用空格/逗号分隔）")
						: h("div", { className: "vk_mgrLabel" }, "URL"),
					form.transport === "stdio"
						? h("input", { className: "vk_mgrInput", value: form.command, onChange: (e) => setForm({ ...form, command: e.target.value }), placeholder: "npx @playwright/mcp@latest --browser msedge" })
						: h("input", { className: "vk_mgrInput", value: form.url, onChange: (e) => setForm({ ...form, url: e.target.value }), placeholder: "https://example.com/mcp" }),
					form.transport === "stdio"
						? h("div", { className: "vk_mgrLabel" }, "环境变量（JSON 对象，可含密钥）")
						: h("div", { className: "vk_mgrLabel" }, "请求头（JSON 对象，可含密钥）"),
					h("input", { className: "vk_mgrInput", value: form.env, onChange: (e) => setForm({ ...form, env: e.target.value }), placeholder: '{"KEY":"value"}' }),
					h("div", { className: "vk_personaFoot" },
						h("button", { className: "vk_mgrBtn", onClick: () => setShowAdd(false) }, "取消"),
						h("div", { style: { flex: 1 } }),
						h("button", { className: "vk_mgrBtn vk_mgrBtnPrimary", disabled: busy, onClick: submitAdd }, "添加并启用")
					)
				) : null,
				servers === null ? h("div", { className: "vk_mgrEmpty" }, "加载中…")
					: servers.length === 0 ? h("div", { className: "vk_mgrEmpty" }, "暂无 MCP server，点「＋ 添加 MCP」添加")
					: h("div", { className: "vk_mgrList" },
						servers.map((s) => h("div", { key: s.id, className: "vk_mgrRow" },
							h("div", { className: "vk_mgrInfo" },
								h("div", { className: "vk_mgrName" }, s.serverName),
								h("div", { className: "vk_mgrMeta" }, (s.transport === "stdio" ? (s.command || "stdio") : (s.url || "http")) + (s.hasEnv ? " · 含环境变量" : ""))
							),
							h("span", { className: "vk_mgrBadge " + (s.enabled ? "vk_mgrBadgeOn" : "vk_mgrBadgeOff") }, s.enabled ? "开启" : "关闭"),
							h("button", { className: "vk_mgrBtn", disabled: busy, onClick: () => act(s.id, "toggle") }, s.enabled ? "关闭" : "开启"),
							h("button", { className: "vk_mgrBtn vk_mgrBtnDanger", disabled: busy, onClick: () => { if (window.confirm("确定删除 MCP「" + s.serverName + "」？")) act(s.id, "delete"); } }, "删除")
						))
					)
			);
		}

		// ──────────────────────────────────────────────────────────────
		// 重启 DSH 按钮（右栏标签栏）与它的复位状态机
		//
		// 历史坑：旧实现（dsh-restart-button 的 client 半端，注册在官方会话头部工具区）
		// setBusy(true) 之后没有任何复位路径 → 点完一次重启按钮就永久 disabled，只能刷新页面。
		// 这里把「何时从 busy 复位」抽成纯函数 restartPhaseAfter（见下），四类事件全部有出路：
		// 连接断开→再恢复 / 轮询（至少见过一次失败后连续 2 次成功）/ 60s 兜底超时 / 请求异常。
		// ──────────────────────────────────────────────────────────────
		const RESTART_PHASES = ["idle", "armed", "busy", "timeout"];
		const RESTART_PROBE_PREFIX = "→ DSH 后端正在重启（脚本已启动，通常 5~20 秒后自动恢复）";
		// 纯函数状态机：输入 (当前阶段, 事件) → 输出 (新阶段, 新提示文案)。
		// 事件：CLICK / ARM_TIMEOUT / REQUEST_OK / REQUEST_FAIL / CONNECTION_DOWN /
		//       CONNECTION_UP{waited} / PROBE{ok, failures} / DEADLINE / RELOADED
		// 任何未列举的 (阶段 × 事件) 组合都原样返回，绝不落入「没有出路」的分支。
		function restartPhaseAfter(phase, event) {
			const cur = RESTART_PHASES.includes(phase) ? phase : "idle";
			const type = event && event.type;
			const same = (note) => ({ phase: cur, note });
			switch (type) {
				case "CLICK":
					if (cur === "idle") return { phase: "armed", note: null };
					if (cur === "armed") return { phase: "busy", note: RESTART_PROBE_PREFIX };
					return same(null);
				case "ARM_TIMEOUT":
					return cur === "armed" ? { phase: "idle", note: null } : same(null);
				case "REQUEST_OK":
				case "REQUEST_FAIL":
				case "CONNECTION_DOWN":
					return cur === "busy" ? same(RESTART_PROBE_PREFIX) : same(null);
				case "PROBE":
					if (cur !== "busy") return same(null);
					if (event.ok !== true) {
						// 旧进程在 0.8s 窗口内仍会应答 200，所以「第一次探测成功」不算恢复：
						// 必须见过失败之后，再连续 2 次成功才算回来。
						const failures = Number(event.failures) || 0;
						return same(failures > 0
							? "→ 后端已停止应答，重启中…（后台会一直探测，最长 60 秒）"
							: RESTART_PROBE_PREFIX);
					}
					if ((Number(event.failures) || 0) > 0 && (Number(event.streak) || 0) >= 2) return { phase: "idle", note: null };
					return same(RESTART_PROBE_PREFIX);
				case "CONNECTION_UP":
					// 先「断连」再「恢复」才算重启完成；从未断连的两个连续快照不算
					if (cur === "busy" && event.waited === true) return { phase: "idle", note: null };
					return same(null);
				case "DEADLINE":
					return cur === "busy" ? { phase: "timeout", note: "重启未确认，按钮已恢复可点；若页面仍异常请手动刷新" } : same(null);
				case "RELOADED":
					return cur === "busy" ? { phase: "idle", note: "页面已重新连接，按钮已恢复可点" } : same(null);
				default:
					return same(null);
			}
		}

		// 按钮外观由 (阶段, 空闲/忙) 纯函数决定，避免渲染期出现未定义文案。
		// busy 不再改按钮文字（2026-09-11）："正在重启…" 比空闲态还宽，窄栏里会顶坏 Tab 条，
		// 而后端是否正在重启官方 ConnectionIndicator 已经给了提示。忙态改为「文字不变 + 禁用变暗」
		// （见样式表 .vk_tabBtn:disabled），状态仍可从悬停 title 与官方提示读到。
		function restartButtonView(phase, busy) {
			const cur = RESTART_PHASES.includes(phase) ? phase : "idle";
			const disabled = cur === "busy" || busy === true;
			const label = cur === "armed" ? "确认" : "⟳ 重启";
			const title = cur === "armed"
				? "再次点击确认重启（将中断当前对话）"
				: cur === "busy" ? "重启中：按钮会在后端恢复后自动恢复可点" : "重启 DSH 后端（两击确认）";
			return { phase: cur, disabled, label, title, armed: cur === "armed" };
		}

		function restartStatusNote(phase) {
			switch (phase) {
				case "armed": return "再次点击「确认」以重启后端";
				case "busy": return RESTART_PROBE_PREFIX;
				case "timeout": return "重启未确认，按钮已恢复可点；若页面仍异常请手动刷新";
				case "reloaded": return "页面已重新连接，按钮已恢复可点";
				default: return null;
			}
		}

		// 单个按钮 + 两击确认（语义照搬原 dsh-restart-button 的 client 半端，未改动 host 路由）
		function RestartButton(props) {
			const phase = RESTART_PHASES.includes(props.phase) ? props.phase : "idle";
			const view = restartButtonView(phase, false);
			return h("button", {
				type: "button",
				className: "vk_tabBtn" + (view.armed ? " vk_tabBtnArm" : ""),
				disabled: view.disabled,
				title: view.title,
				onClick: () => { if (typeof props.onClick === "function") props.onClick(); }
			}, view.label);
		}

		// ──────────────────────────────────────────────────────────────
		// ctx.layout 服务面（与官方同名兼容：openDetails/closeDetails/toggleSidebar）
		// ──────────────────────────────────────────────────────────────
		var LayoutController = class {
			#panels;
			attachPanels(actions) { this.#panels = actions; }
			toggleSidebar() { this.#require().toggleSidebar(); }
			openDetails() { this.#require().openDetails(); }
			closeDetails() { this.#require().closeDetails(); }
			#require() {
				if (this.#panels === void 0) throw new Error("layout: panel actions not wired (root entry not mounted)");
				return this.#panels;
			}
		};

		// ──────────────────────────────────────────────────────────────
		// 主题呈现器（照搬官方）
		// ──────────────────────────────────────────────────────────────
		const DARK_ATTRIBUTE = "data-ds-dark-theme";
		var ThemePresenter = class {
			appliedTokens = [];
			themeColorMeta;
			constructor() {
				this.themeColorMeta = document.createElement("meta");
				this.themeColorMeta.name = "theme-color";
			}
			apply(snapshot) {
				const scheme = snapshot.active.colorScheme;
				document.documentElement.style.colorScheme = scheme;
				const body = document.body;
				if (scheme === "dark") body.setAttribute(DARK_ATTRIBUTE, "");
				else body.removeAttribute(DARK_ATTRIBUTE);
				for (const name of this.appliedTokens) body.style.removeProperty(name);
				this.appliedTokens = [];
				for (const [name, value] of Object.entries(snapshot.active.tokens)) {
					body.style.setProperty(name, value);
					this.appliedTokens.push(name);
				}
				this.themeColorMeta.content = getComputedStyle(body).backgroundColor;
				if (!this.themeColorMeta.isConnected) document.head.append(this.themeColorMeta);
			}
			dispose() {
				document.documentElement.style.removeProperty("color-scheme");
				const body = document.body;
				body.removeAttribute(DARK_ATTRIBUTE);
				for (const name of this.appliedTokens) body.style.removeProperty(name);
				this.appliedTokens = [];
				this.themeColorMeta.remove();
			}
		};

		/** 拓展栏「打开本机文件」标签的静态身份（id 必须与 tab 正文注册的 key 一致）。 */
		const PICK_TAB_ID = "@anoslide/dsh-client-vscode-layout/pick";
		/**
		 * 该类型的 kind。**故意的**取官方的 "files"：
		 * 官方 ui-sidebar-files 的 files 类型是 builtin 段，右侧栏注册表允许「extension 段登记一个 builtin
		 * 已持有的 kind 并顶替它，直到自己注销」（同段第二次注册、或撞上 fallback 段才是装配错误）。
		 * 顶替之后 `active()` 里只剩自研这条，官方那条被 shadow、`guide()` 里也就只剩自研这一条
		 * ——「新标签页」里那句「浏览会话区文件」自然消失，不用去改官方包、也不用 CSS 隐藏。
		 * files 类型**没有 patterns**（从不参与 candidates 排序，只被「按 kind 点名打开」），
		 * 所以这次顶替不会截胡任何按地址打开的请求。
		 */
		const PICK_TAB_KIND = "files";
		/**
		 * 「打开本机文件」这个标签类型。
		 */
		function vkPickTabDefinition() {
			return {
				id: PICK_TAB_ID,
				kind: PICK_TAB_KIND,
				priority: "extension",
				title: () => "打开本机文件",
				guide: [{
					order: 10,
					title: () => "打开本机文件",
					description: () => "在应用内的文件浏览器里选一个文件，在本标签打开",
					icon: ({ size }) => h(VIcon, { name: "folderOpen", size: size === undefined || size === null ? 22 : size })
				}]
			};
		}
		/**
		 * 「打开本机文件」标签的正文：一块和文件栏那颗文件夹图标**完全同款**的应用内浏览弹窗（文件模式）。
		 *
		 * 版面（第二轮调整）：这块正文不再是「从上到下铺满整列」的卡片（那样只有几行内容时会被拉成
		 * 一大片空白），而是**竖向居中的卡片、高度约栏高 1/3**，内容超出时卡片内部滚动。
		 *
		 * 选中文件后走与文件栏点文件**同一条路**：
		 *   fileAddressFor(会话id, cwd, 绝对路径) → sidebarRight.openResource(address)（**不传 kind**，让注册表挑类型），
		 * 差别只在 `replaceTab`：这里要把**本次新建的这个标签**换成文件，而不是再开一个。
		 * `useTabInfo()` 拿到的 `tab.actions.openResource` 恰好带 replaceTab 语义（官方 TabActions 自带），
		 * 所以「点了新建 → 选文件 → 本标签变成该文件」一步到位。
		 */
		function VK_PickTabBody({ useTabInfo }) {
			const { tab } = useTabInfo();
			const [path, setPath] = react.useState("");
			const [dir, setDir] = react.useState(null);
			const [err, setErr] = react.useState(null);
			const [drives, setDrives] = react.useState([]);
			const [probing, setProbing] = react.useState(false);
			const [desktopPath, setDesktopPath] = react.useState(null);
			const [query, setQuery] = react.useState("");
			const [search, setSearch] = react.useState(null);
			const [showHidden, setShowHidden] = react.useState(false);
			const [openError, setOpenError] = react.useState(null);
			const seqRef = react.useRef(0);
			// 磁盘与桌面探测（与文件栏同一套候选）
			const probeRoots = react.useCallback(() => {
				const cands = ["C:\\", "D:\\", "E:\\", "F:\\"];
				let pending = cands.length + 1;
				const found = [];
				setProbing(true);
				setDrives([]);
				setDesktopPath(null);
				const settle = () => {
					pending -= 1;
					if (pending <= 0) { setDrives(found.slice().sort()); setProbing(false); }
				};
				for (const p of cands) {
					fetch("/vscode-files/list?path=" + encodeURIComponent(p))
						.then((r) => r.json())
						.then((d) => { if (d && d.ok) found.push(p); })
						.catch(() => {})
						.finally(settle);
				}
				fetch("/vscode-files/list?path=" + encodeURIComponent(DESKTOP_HINT))
					.then((r) => r.json())
					.then((d) => { if (d && d.ok && typeof d.path === "string") setDesktopPath(d.path); })
					.catch(() => {})
					.finally(settle);
			}, []);
			react.useEffect(() => { probeRoots(); }, [probeRoots]);
			const goto = react.useCallback((target) => {
				const t = String(target || "").trim();
				if (t.length === 0) return;
				setErr(null);
				setQuery("");
				setSearch(null);
				const norm = /^[A-Za-z]:$/.test(t) ? t + "\\" : t;
				setPath(norm);
				setDir(null);
				fetch("/vscode-files/list?path=" + encodeURIComponent(norm))
					.then((r) => r.json())
					.then((d) => { if (d && d.ok) setDir(d); else setErr((d && d.error) || "无法读取该目录"); })
					.catch((e) => setErr(String(e)));
			}, []);
			// 模糊搜索：在当前目录下递归找**文件**（与文件栏弹窗同一端点，kind 缺省即文件）
			react.useEffect(() => {
				const q = query.trim();
				if (q.length === 0) { setSearch(null); return void 0; }
				const seq = ++seqRef.current;
				const timer = setTimeout(() => {
					const roots = path.length > 0 ? [path] : [...drives, ...(desktopPath !== null ? [desktopPath] : [])];
					if (roots.length === 0) { setSearch({ busy: false, note: "磁盘尚未检测完成，请稍候或先进入一个目录", items: [] }); return; }
					setSearch({ busy: true, note: null, items: [] });
					const items = [];
					(async () => {
						for (const root of roots) {
							if (seq !== seqRef.current) return;
							try {
								const r = await fetch("/vscode-files/search?path=" + encodeURIComponent(root) + "&q=" + encodeURIComponent(q));
								const d = await r.json();
								if (d && d.ok && Array.isArray(d.results)) items.push(...d.results);
							} catch { /* 网络抖动忽略 */ }
						}
						if (seq !== seqRef.current) return;
						setSearch({ busy: false, note: items.length === 0 ? "没有匹配的文件，试试更短的关键词" : null, items: items.slice(0, 80) });
					})();
				}, 250);
				return () => { clearTimeout(timer); };
			}, [query, path, drives, desktopPath]);
			// 选中文件 → 与文件栏点文件同一条路：拼官方资源地址 → 在本标签里打开（replaceTab）
			const pickFile = react.useCallback((file) => {
				const liveSessionId = (() => {
					try {
						const snapshot = ctxRef.current.get("sessions").list.getSnapshot();
						if (snapshot !== undefined && typeof snapshot.current === "string" && snapshot.current.length > 0) return snapshot.current;
					} catch { /* 服务未就绪 */ }
					return "";
				})();
				const cwd = (() => { try { return vkAtSessionCwd(); } catch { return ""; } })();
				try {
					globalThis.__VK_LAST_OPEN__ = { at: new Date().toISOString(), stage: "pick-tab-click", path: file && file.path, sessionId: liveSessionId, cwd: cwd };
				} catch { /* ignore */ }
				if (liveSessionId === "") {
					setOpenError("请先在中间栏打开或新建一个会话，再选文件");
					try { globalThis.__VK_LAST_OPEN__.stage = "no-session"; } catch { /* ignore */ }
					return;
				}
				const address = fileAddressFor(liveSessionId, cwd, file.path);
				try {
					// replaceTab 语义：不传 tabId 时官方 place() 会带上本标签的 tabId（见 TabActions.openResource）
					tab.actions.openResource(address, { replaceTab: true });
					try { globalThis.__VK_LAST_OPEN__.stage = "ok"; } catch { /* ignore */ }
				} catch (e) {
					const message = String(e && e.message ? e.message : e);
					setOpenError("无法打开该文件：" + message);
					try { globalThis.__VK_LAST_OPEN__.stage = "throw"; globalThis.__VK_LAST_OPEN__.error = message; } catch { /* ignore */ }
				}
			}, [tab]);
			/**
			 * 粘贴网址 → 在本标签换成网页。
			 * 走 `tab.actions.openTab(VIEW_TAB_KIND, { params: { url }, replaceTab: true })`：
			 * 官方 `placeResource` 只吃 `dsh-resource://` 前缀的地址（http(s) 一律抛
			 * `no registered tab type claims`，实测确认为前缀校验而非 pattern 问题），
			 * 所以网页只能走「标签页类型路径」进来，网址放在 params.url 里。
			 */
			const openWeb = (u) => {
				const url = String(u || "").trim();
				if (!/^https?:\/\//i.test(url)) return;
				try {
					globalThis.__VK_LAST_OPEN__ = { at: new Date().toISOString(), stage: "web-click", url: url };
					tab.actions.openTab(VIEW_TAB_KIND, { params: { url: url }, replaceTab: true });
					setOpenError(null);
					try { globalThis.__VK_LAST_OPEN__.stage = "web-ok"; } catch { /* ignore */ }
				} catch (e) {
					const message = String(e && e.message ? e.message : e);
					setOpenError("无法打开该网址：" + message);
					try { globalThis.__VK_LAST_OPEN__.stage = "web-throw"; globalThis.__VK_LAST_OPEN__.error = message; } catch { /* ignore */ }
				}
			};
			return h("div", { className: "vk_pickTab", style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } },
				openError !== null ? h("div", { className: "vk_openErr", style: { flex: "none" } }, openError) : null,
				h(VK_BrowseModal, {
					fileMode: true,
					embedded: true,
					path: path,
					dir: dir,
					err: err,
					drives: drives,
					probing: probing,
					desktopPath: desktopPath,
					query: query,
					search: search,
					showHidden: showHidden,
					onQuery: (v) => setQuery(v),
					onGoto: (t) => goto(t),
					onOpenUrl: openWeb,
					onRoots: () => { setPath(""); setDir(null); setErr(null); setQuery(""); setSearch(null); },
					onToggleHidden: () => setShowHidden((v) => !v),
					onReload: () => probeRoots(),
					onClose: () => { try { tab.actions.close(); } catch { /* 关不掉就留着 */ } },
					onPickFile: pickFile,
					// 底部「打开」：选中目录 → 进入该目录（这个标签是「选一个文件/目录」用的，
					// 「进入」正是它需要的语义）；选中文件由弹窗自己走 onPickFile；没选中则按钮禁用。
					onOpen: (sel) => { if (sel !== null && sel !== undefined && sel.isDir === true) goto(sel.path); }
				})
			);
		}

		/**
		 * 去掉草稿**末尾那个未完成的 `@` 触发片段**（2026-09-12 用户报「@唤起列表后用搜索插引用会多出一个 @」）。
		 *
		 * 为什么需要：@ 菜单是靠草稿里的 `@`（以及 `@关键词` / `@"带空格的关键词`）唤起的，官方点候选时
		 * 会把这段触发文本**消费掉**换成引用 chip；而搜索弹窗走的是 inputActions.setDraft 直接写草稿，
		 * 绕过了官方那一步 —— 不清就会留下一个孤立的 `@`（表现为「@ @路径」）。
		 *
		 * 清理范围与官方一致：只摘末尾那一段，前面的正文原样保留；
		 * 已闭合的 `@"完整引用"` 整体摘掉；未闭合的 `@"abc`（quoteOpen）摘到末尾。
		 * 纯函数，便于离线断言。
		 * @param text - 当前草稿。
		 * @returns 去掉尾部 @ 触发片段后的草稿。
		 */
		function vkStripTrailingAtToken(text) {
			const s = typeof text === "string" ? text : "";
			// 引号（含尾随空白）先摘掉再 trim，一次正则同时覆盖 `@"/vscode-files/x` 这种未闭合形态
			const mQuoted = /(^|\s)@"[^"\n]*"?\s*$/u.exec(s);
			if (mQuoted !== null) return (s.slice(0, mQuoted.index) + (mQuoted[1] === "" ? "" : mQuoted[1])).replace(/\s+$/u, "");
			// 普通 `@关键词` / 裸 `@`：从最后一个 @ 起摘掉（@ 前必须是空白或行首，
			// 否则当作文本里的邮箱等用法，原样保留）
			const at = s.lastIndexOf("@");
			if (at < 0) return s;
			if (at > 0 && !/\s/u.test(s.charAt(at - 1))) return s;
			return s.slice(0, at).replace(/\s+$/u, "");
		}

		/**
		 * 「搜索本机文件」放大镜（2026-09-12 新增；同日按用户要求从对话框工具行搬到 **@ 列表右上角**）。
		 *
		 * 注意分工：按钮**本体不在 React 里** —— 它由 vkInstallAtSearchButton 以原生 DOM 钉进官方
		 * @ 菜单（`[data-trigger-menu]`）的右上角。本组件只做两件事：① 接收那颗按钮的点击并打开弹窗；
		 * ② 承载弹窗本身。因此它在工具行里**渲染 null**，但仍注册在 conversation.input.left 槽位上常驻
		 * （有输入框就有它，而 @ 菜单打开时输入框必然在）。
		 * 与文件栏那颗文件夹图标、拓展栏「打开本机文件」标签**共用同一套浏览与检索逻辑**：
		 * 同一个 /vscode-files/list 目录列表、同一个 /vscode-files/search 递归搜索端点、
		 * 同一个 VK_BrowseModal 弹窗组件（fileMode 文件模式、浮层形态、磁盘 + 桌面根视图、
		 * 面包屑、隐藏项开关、模糊搜索），不做第二套实现。
		 *
		 * 唯一差别在「选中之后」：这里不打开右侧标签页、也不进入目录，而是把该条目的 @引用
		 * **追加进当前会话的输入框**（官方 inputActions.setDraft）—— **文件和文件夹都能引用**
		 * （文件夹带尾斜杠，如 `@notes/`）；写法与官方 @ 源一致：会话根内用相对路径、
		 * 根外用绝对路径，含空格用 @"…" 引号形式。
		 */
		function VK_ComposerFileSearch(props) {
			const inputActions = props.inputActions;
			// 末段追加需要先读到当前草稿；useInput 是官方 session 作用域的标准 selector hook
			const draftText = typeof props.useInput === "function"
				? props.useInput((s) => (s !== void 0 && s !== null && typeof s.draft === "string" ? s.draft : ""))
				: "";
			const [open, setOpen] = react.useState(false);
			const [path, setPath] = react.useState("");
			const [dir, setDir] = react.useState(null);
			const [err, setErr] = react.useState(null);
			const [drives, setDrives] = react.useState([]);
			const [probing, setProbing] = react.useState(false);
			const [desktopPath, setDesktopPath] = react.useState(null);
			const [query, setQuery] = react.useState("");
			const [search, setSearch] = react.useState(null);
			const [showHidden, setShowHidden] = react.useState(false);
			const seqRef = react.useRef(0);
			// 「对话框」水平中心（视口坐标 x；量不到为 null）—— 打开弹窗那一刻量，见 openDialog。
			const [anchorX, setAnchorX] = react.useState(null);
			// 模糊搜索：与文件栏弹窗同一端点（kind 缺省即文件），根取「当前目录」或「全部磁盘 + 桌面」
			react.useEffect(() => {
				if (open !== true) return void 0;
				const q = query.trim();
				if (q.length === 0) { setSearch(null); return void 0; }
				const seq = ++seqRef.current;
				const timer = setTimeout(() => {
					const roots = path.length > 0 ? [path] : [...drives, ...(desktopPath !== null ? [desktopPath] : [])];
					if (roots.length === 0) { setSearch({ busy: false, note: "磁盘尚未检测完成，请稍候或先进入一个目录", items: [] }); return; }
					setSearch({ busy: true, note: null, items: [] });
					const items = [];
					(async () => {
						for (const root of roots) {
							if (seq !== seqRef.current) return;
							try {
								const r = await fetch("/vscode-files/search?path=" + encodeURIComponent(root) + "&q=" + encodeURIComponent(q));
								const d = await r.json();
								if (d && d.ok && Array.isArray(d.results)) items.push(...d.results);
							} catch { /* 网络抖动忽略 */ }
						}
						if (seq !== seqRef.current) return;
						setSearch({ busy: false, note: items.length === 0 ? "没有匹配的文件，试试更短的关键词" : null, items: items.slice(0, 80) });
					})();
				}, 250);
				return () => { clearTimeout(timer); };
			}, [open, query, path, drives, desktopPath]);
			// 根视图候选：常见磁盘 + 桌面，只展示真实存在的（与文件栏那颗按钮同一套候选与端点）
			const probeRoots = react.useCallback(() => {
				const cands = ["C:\\", "D:\\", "E:\\", "F:\\"];
				let pending = cands.length + 1;
				const found = [];
				setProbing(true);
				setDrives([]);
				setDesktopPath(null);
				const settle = () => {
					pending -= 1;
					if (pending <= 0) { setDrives(found.slice().sort()); setProbing(false); }
				};
				for (const p of cands) {
					fetch("/vscode-files/list?path=" + encodeURIComponent(p))
						.then((r) => r.json())
						.then((d) => { if (d && d.ok) found.push(p); })
						.catch(() => {})
						.finally(settle);
				}
				fetch("/vscode-files/list?path=" + encodeURIComponent(DESKTOP_HINT))
					.then((r) => r.json())
					.then((d) => { if (d && d.ok && typeof d.path === "string") setDesktopPath(d.path); })
					.catch(() => {})
					.finally(settle);
			}, []);
			const goto = react.useCallback((target) => {
				const t = String(target || "").trim();
				if (t.length === 0) return;
				setErr(null);
				setQuery("");
				setSearch(null);
				const norm = /^[A-Za-z]:$/.test(t) ? t + "\\" : t;
				setPath(norm);
				setDir(null);
				fetch("/vscode-files/list?path=" + encodeURIComponent(norm))
					.then((r) => r.json())
					.then((d) => { if (d && d.ok) { setDir(d); setErr(null); } else setErr((d && d.error) || "无法读取该目录"); })
					.catch((e) => setErr(String(e)));
			}, []);
			const openDialog = () => {
				// 先把「对话框」的水平中心量下来再开：此刻按钮所在的 @ 菜单还在 DOM 里
				// （按钮走 mousedown + preventDefault，菜单不会因失焦收摊），而弹窗一开遮罩压上来，
				// 菜单随时可能被官方流水线收掉 —— 那时候就量不到了。
				setAnchorX(vkMeasureComposerCenterX());
				setOpen(true);
				setPath("");
				setDir(null);
				setErr(null);
				setQuery("");
				setSearch(null);
				setShowHidden(false);
				probeRoots();
			};
			// 选中条目 → 不打开标签页、也不进入目录，而是把 @引用（文件 / 文件夹都行）追加进输入框。
			// 注意：先摘掉唤起 @ 菜单的那段未完成触发文本（`@` / `@关键词` / `@"关键词`），否则
			// 输入框里会留下一个孤立的 @（用户 2026-09-12 报的「多注入一个 @」就是这里）。
			const pickEntry = react.useCallback((entry) => {
				const abs = entry !== null && entry !== undefined && typeof entry.path === "string" ? entry.path : "";
				if (abs.length === 0) return;
				const mention = vkInsertMentionOf(abs, entry.isDir === true);
				if (mention.length === 0) return;
				const current = vkStripTrailingAtToken(typeof draftText === "string" ? draftText : "");
				const head = current.replace(/\s+$/u, "");
				const next = (head.length > 0 ? head + " " : "") + mention + " ";
				try {
					if (inputActions !== void 0 && inputActions !== null && typeof inputActions.setDraft === "function") inputActions.setDraft(next);
				} catch { /* 输入机不可写（提交中/无会话）：静默，弹窗照常关闭 */ }
				setOpen(false);
				setPath("");
				setDir(null);
				setErr(null);
				setQuery("");
				setSearch(null);
			}, [draftText, inputActions]);
			// @ 菜单右上角那颗原生按钮点下来时，靠这里回到 React：登记本组件的「开弹窗」动作
			// （每次渲染都重登一次，保证登记的是最新闭包；卸载时只清自己那一份）。
			react.useEffect(() => {
				vkAtSearchOpenDialog = openDialog;
				// 顺带补一次：宿主就位的这一刻 @ 菜单可能已经开着，而 observer 那次早于本 effect 跑完了。
				vkAtSearchEnsureButton();
				return () => { if (vkAtSearchOpenDialog === openDialog) vkAtSearchOpenDialog = null; };
			});
			// 弹窗开着时点亮右上角那颗按钮（与之前的 vk_cfBtnOn 同义；按钮被菜单重挂后由
			// vkAtSearchSyncBtnState 重新贴回高亮态）。
			react.useEffect(() => {
				vkAtSearchDialogOpen = open === true;
				vkAtSearchSyncBtnState();
			}, [open]);
			// 工具行里不再出按钮（2026-09-12 用户要求：这颗放大镜搬到 @ 列表右上角，
			// 见 vkInstallAtSearchButton）——但组件必须继续挂载：它既是弹窗的宿主，也是右上角那颗
			// DOM 按钮的落点，所以这里渲染 null，而不是把自己卸载掉。
			if (open !== true) return null;
			return h(react.Fragment, null,
				h(VK_BrowseModal, {
					fileMode: true,
					mode: "insert",
					// 相对「对话框」水平居中用的锚点（见 vkMeasureComposerCenterX）
					anchorX: anchorX,
					path: path,
					dir: dir,
					err: err,
					drives: drives,
					probing: probing,
					desktopPath: desktopPath,
					query: query,
					search: search,
					showHidden: showHidden,
					onQuery: (v) => setQuery(v),
					onGoto: (t) => goto(t),
					onRoots: () => { setPath(""); setDir(null); setErr(null); setQuery(""); setSearch(null); },
					onToggleHidden: () => setShowHidden((v) => !v),
					onReload: () => probeRoots(),
					onClose: () => setOpen(false),
					onPickFile: (f) => pickEntry({ path: f.path, name: f.name, isDir: false }),
					// 底部「引用」：选中的是文件夹就插 `@目录/`，是文件就插 `@文件` —— 都不再「进入 / 打开」
					onOpen: (sel) => { if (sel !== null && sel !== undefined) pickEntry({ path: sel.path, name: sel.name, isDir: sel.isDir === true }); }
				})
			);
		}

		// ──────────────────────────────────────────────────────────────
		// 图片缩放：纯函数一套（从上一版中栏查看器原样捞回，未做任何算法改动）
		//
		// 为什么需要：官方 viewer 的图片分支是 `<img>` 直接铺在可滚动容器里（实测 src 是 blob:，无任何
		// 缩放控件、不响应滚轮），而右侧栏只有 ~700px 宽，手机拍的照片、论文插图、PCB 截图都看不清细节。
		// 这里把自研缩放面板注册成第二个拓展栏 tab 类型（extension 段），canOpen 只认图片扩展名，
		// 其余地址继续交给官方 viewer。
		// ──────────────────────────────────────────────────────────────
		const ZOOM_MIN = 0.25;        // 下限 25%
		const ZOOM_MAX = 5;           // 上限 500%
		const ZOOM_BTN_STEP = 1.25;   // 工具条 ＋/－ 一档、以及滚轮一档（归一化 100px）的倍数
		const ZOOM_WHEEL_MAX = 600;   // 单次滚轮增量的归一化上限（≈3.8×，防个别设备给出离谱值）
		/** 缩放比例钳制到 [min,max]；非法输入回落到下限（纯函数）。 */
		function clampZoom(z, min, max) {
			const lo = Number.isFinite(min) ? min : ZOOM_MIN;
			const hi = Number.isFinite(max) ? max : ZOOM_MAX;
			const v = Number(z);
			if (!Number.isFinite(v)) return lo;
			return Math.min(hi, Math.max(lo, v));
		}
		/**
		 * 图片缩放下限：统一下限是 25%，但大图「适应窗口」可能远小于 25%（6000px 宽图在窄栏里约 13%），
		 * 若硬钳到 25% 会让「适应窗口」永远达不到。故下限取 min(25%, 适应比例)（纯函数）。
		 */
		function imageZoomMin(fitScale) {
			const fit = Number(fitScale);
			return Math.min(ZOOM_MIN, Number.isFinite(fit) && fit > 0 ? fit : ZOOM_MIN);
		}
		/** 滚轮增量归一化：行模式（Firefox 一档 ≈ 3 行）/ 页模式折算成像素（纯函数）。 */
		function normalizeWheelDelta(deltaY, deltaMode) {
			const d = Number(deltaY);
			if (!Number.isFinite(d)) return 0;
			const m = Number(deltaMode);
			if (m === 1) return d * (100 / 3);   // 行模式：一档 = 3 行 = 100px
			if (m === 2) return d * 100;
			return d;
		}
		/** 滚轮增量 → 缩放倍数（纯函数）：上滚放大、下滚缩小；一档（归一化 100px）≈ 25%，与浏览器档距一致。 */
		function wheelZoomFactor(deltaY, deltaMode) {
			const d = Math.max(-ZOOM_WHEEL_MAX, Math.min(ZOOM_WHEEL_MAX, normalizeWheelDelta(deltaY, deltaMode)));
			if (d === 0) return 1;
			return Math.pow(ZOOM_BTN_STEP, -d / 100);
		}
		/** 工具条单步缩放：dir>0 放大（纯函数）。 */
		function stepZoom(cur, dir, min, max) {
			const f = dir > 0 ? ZOOM_BTN_STEP : 1 / ZOOM_BTN_STEP;
			return clampZoom(clampZoom(cur, min, max) * f, min, max);
		}
		/** 缩放后按比例换算视口中心，让原可视中心仍落在中心（图片用；纯函数）。 */
		function recenterScroll(start, viewSize, ratio) {
			const s = Number(start) || 0;
			const v = Number(viewSize) || 0;
			const r = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
			return Math.max(0, (s + v / 2) * r - v / 2);
		}
		/** 标签 → 缩放比例的会话内记忆（刷新页面即回 100%，不写 localStorage）。 */
		const TAB_ZOOM = new Map();
		function tabZoomOf(address) {
			const v = TAB_ZOOM.get(String(address));
			return Number.isFinite(v) ? clampZoom(v, ZOOM_MIN, ZOOM_MAX) : 1;
		}
		function setTabZoom(address, z) {
			TAB_ZOOM.set(String(address), clampZoom(z, ZOOM_MIN, ZOOM_MAX));
		}

		// ── 右栏网页 / HTML 预览的缩放（2026-09-12 第二轮：换成「浏览器原生语义」的 iframe zoom）──
		//
		// 用户否掉了上一版的 transform:scale（那是"视觉放大"）。这一版的施加点是 **iframe 元素自身的
		// style.zoom**：CSS zoom 真正改变子帧的布局视口、按比例重排，并按新的 devicePixelRatio 重新
		// 栅格化 —— 这正是 Chrome 的 Ctrl+滚轮 / Ctrl+±/0 那条机制。以下都是 CDP 真键鼠 + 真 iframe 实测：
		//   ① 父页给 iframe 元素设 zoom:2（外层 400×300，flex:1 布局下同样）：元素盒子**不变** 400×300，
		//      内部视口按 1/zoom 收缩（innerWidth 400→200、innerHeight 300→150）、devicePixelRatio 1→2；
		//      zoom:0.5 → 内部 800×600、dpr 0.5；复位（style.zoom=""）后各读数原样回 1。
		//      内部滚动条照常可用（900px 内容、缩放后视口 150px 时 scrollTop 能到 750）。
		//   ② 跨源同一套语义：用 opaque origin 的 data: iframe 复测（父页读到 contentDocument === null），
		//      子帧 postMessage 自报 zoom:2 时 w=200 h=150 dpr=2、盒子仍 400×300 —— 这条只改父页侧样式，
		//      不碰 iframe 内部，所以跨源读不到 document 也照样成立。
		//   ③ 反面（同样是实测）：只改 iframe **内部** documentElement 的 zoom，内部视口**不缩**
		//      （innerWidth 仍 400）、dpr 不变 —— 内容被整体放大后溢出/裁掉一角，还是"视觉放大"；
		//      旧实现的 body transform:scale + 反比宽高同理（200px 盒子渲染成 400px、100% 盒子变 800px）。
		//      两条旧路径**已整段删除**，避免与 zoom 叠加成 1.25ⁿ。
		//
		// 事件怎么进来（实测，决定下面两条分支）：
		//   · 滚轮不会从 iframe 冒泡到父页：指针在跨源 iframe 上时父页 mousemove / wheel 计数都是 0。
		//     同源 iframe 可以往它内部装非被动 wheel（真 Ctrl+滚轮命中 1 次、defaultPrevented=true）。
		//   · 父页同样收不到跨源 iframe 内的 keydown（真鼠标点进子帧后，父页 keydown 日志为空）。
		//     所以跨源只能「Ctrl 按住时铺一层透明捕获层」在父页拦，Ctrl 的按下/松开由父页 keydown/keyup 感知。
		//     ⚠️ 已知边界（实测）：焦点进了跨源页之后父页再也听不到 Ctrl —— 跨源页要**先按住 Ctrl**（父页这时
		//     还看得见）再滚；同源页没有这个限制，监听装在子帧内部。
		const PAGE_ZOOM = new Map();
		/**
		 * 缩放诊断（给命令行面板标题行那行字用；命令行没开时就留在内存里，排障可从控制台读）。
		 * 用独立变量而不是 store，是因为本段在命令行面板的 store 之前定义，不能提前引用它。
		 */
		const vkZoomNote = { text: "", store: null, set(text) { this.text = String(text); if (this.store !== null) this.store.setDiag(String(text)); } };
		/** 最近一次被滚轮/捕获层缩放过的那一帧：父页键盘只认它（守卫条件之一，见 attachFrameZoom）。 */
		let vkZoomLastFrame = null;
		/** 同一个 iframe window 上装过的内部监听（window → handlers）；换 src / 重装时先卸旧的，免得叠加成 1.25ⁿ。 */
		const vkFrameZoomWins = new Map();
		function pageZoomOf(address) {
			const v = PAGE_ZOOM.get(String(address));
			return Number.isFinite(v) ? clampZoom(v, ZOOM_MIN, ZOOM_MAX) : 1;
		}
		function setPageZoom(address, z) {
			PAGE_ZOOM.set(String(address), clampZoom(z, ZOOM_MIN, ZOOM_MAX));
		}
		/** 缩放施加点：iframe **元素**自身（父页侧；同源/跨源同一套语义，见上面实测）。 */
		function applyFrameZoom(frame, zoom) {
			try {
				if (frame === null || frame === undefined) return false;
				frame.style.zoom = zoom <= 1.0001 ? "" : String(zoom);
				return true;
			} catch { return false; }
		}
		/** Ctrl+加号 / 减号 / 0 → 目标比例（浏览器习惯）；不是这三个键就返回 null，调用方原样放行。 */
		function zoomForKey(current, event) {
			const key = String(event !== null && event !== undefined && event.key !== undefined ? event.key : "");
			const code = String(event !== null && event !== undefined && event.code !== undefined ? event.code : "");
			if (key === "+" || key === "=" || key === "Add" || code === "Equal" || code === "NumpadAdd") return clampZoom(current * ZOOM_BTN_STEP, ZOOM_MIN, ZOOM_MAX);
			if (key === "-" || key === "_" || key === "Subtract" || code === "Minus" || code === "NumpadSubtract") return clampZoom(current / ZOOM_BTN_STEP, ZOOM_MIN, ZOOM_MAX);
			if (key === "0" || code === "Digit0" || code === "Numpad0") return 1;
			return null;
		}
		/**
		 * 给一个 iframe 装缩放：同源走子帧内部监听，跨源走父页透明捕获层，键盘两条路都接。
		 * @returns {() => void} 卸载函数（换 src 后 document 是新的，调用方在 load 时重装）
		 */
		function attachFrameZoom(frame, address) {
			if (frame === null || frame === undefined) return () => {};
			const offs = [];
			const setNote = (zoom, suffix) => {
				vkZoomNote.set("网页缩放 " + String(Math.round(zoom * 100)) + "%" + (suffix === undefined ? "" : String(suffix)) + " · Ctrl+0 复位");
			};
			/** 按倍数步进一次：改状态 + 施加到 iframe + 记诊断；返回新比例。 */
			const step = (factor, suffix) => {
				const next = clampZoom(pageZoomOf(address) * factor, ZOOM_MIN, ZOOM_MAX);
				setPageZoom(address, next);
				applyFrameZoom(frame, next);
				vkZoomLastFrame = frame;
				setNote(next, suffix);
				return next;
			};
			// 同源判定只看一处：跨源 iframe 的 contentDocument 是 null（**不抛异常**），内部监听也就装不上
			let doc = null;
			try { doc = frame.contentDocument; } catch { doc = null; }
			let win = null;
			if (doc !== null && doc !== undefined) { try { win = frame.contentWindow; } catch { win = null; } }
			if (win !== null && win !== undefined) {
				// ① 同源：wheel / keydown 都装进子帧内部（焦点在页面里也生效；不按 Ctrl 一律放行）
				const old = vkFrameZoomWins.get(win);
				if (old !== undefined && old !== null) {
					try { win.removeEventListener("wheel", old.wheel, { passive: false }); } catch { /* ignore */ }
					try { win.removeEventListener("keydown", old.key, true); } catch { /* ignore */ }
					vkFrameZoomWins.delete(win);
				}
				const onWheel = (event) => {
					try {
						// 不按 Ctrl：滚轮保持翻页原义，绝不 preventDefault
						if (event.ctrlKey !== true && event.metaKey !== true) return;
						event.preventDefault();
						step(wheelZoomFactor(event.deltaY, event.deltaMode), "");
					} catch { /* 缩放失败绝不影响页面本身 */ }
				};
				const onKey = (event) => {
					try {
						if (event.ctrlKey !== true && event.metaKey !== true) return;
						const next = zoomForKey(pageZoomOf(address), event);
						if (next === null) return;
						event.preventDefault();
						setPageZoom(address, next);
						applyFrameZoom(frame, next);
						vkZoomLastFrame = frame;
						setNote(next, "");
					} catch { /* ignore */ }
				};
				try {
					win.addEventListener("wheel", onWheel, { passive: false });
					win.addEventListener("keydown", onKey, true);
					vkFrameZoomWins.set(win, { wheel: onWheel, key: onKey });
					offs.push(() => {
						try { win.removeEventListener("wheel", onWheel, { passive: false }); } catch { /* ignore */ }
						try { win.removeEventListener("keydown", onKey, true); } catch { /* ignore */ }
						if (vkFrameZoomWins.get(win) !== undefined) vkFrameZoomWins.delete(win);
					});
				} catch { /* 装不进去：交给下面的捕获层 */ }
			}
			// ② 跨源：Ctrl 按住 → 铺一层透明捕获层在父页拦滚轮（指针在跨源帧上时父页收不到任何鼠标事件，
			//    这是唯一一条路）。松开 Ctrl 立刻 pointer-events:none，页面交互一字不改。
			let setOverlay = () => {};
			if (win === null || win === undefined) {
				const parent = frame.parentElement;
				if (parent !== null && parent !== undefined && typeof parent.appendChild === "function") {
					const overlay = document.createElement("div");
					overlay.setAttribute("data-vk-frame-overlay", "true");
					overlay.style.cssText = "position:absolute;left:0;top:0;right:0;bottom:0;z-index:5;display:none;pointer-events:none;background:transparent;";
					overlay.addEventListener("wheel", (event) => {
						try {
							if (event.ctrlKey !== true && event.metaKey !== true) return;
							event.preventDefault();
							step(wheelZoomFactor(event.deltaY, event.deltaMode), "（跨源页）");
						} catch { /* ignore */ }
					}, { passive: false });
					setOverlay = (on) => {
						try {
							overlay.style.display = on === true ? "block" : "none";
							overlay.style.pointerEvents = on === true ? "auto" : "none";
						} catch { /* ignore */ }
					};
					try {
						// 捕获层贴在 iframe 的父节点上（它本来就是 relative 的定位上下文）
						if (parent.style.position === "") parent.style.position = "relative";
						parent.appendChild(overlay);
						offs.push(() => { try { overlay.remove(); } catch { /* ignore */ } });
					} catch { /* ignore */ }
				}
			}
			// ③ 父页键盘：Ctrl+±/0（与滚轮共用同一套比例状态）。守卫只认三种情形之一 —— 焦点在这一帧 /
			//    事件落在我们的查看器里 / 刚刚用滚轮缩放过这一帧；免得把中栏和输入框的 Ctrl 组合键抢走。
			const onParentKey = (event) => {
				try {
					const held = event.ctrlKey === true || event.metaKey === true;
					if (event.type === "blur") { setOverlay(false); return; }
					if (event.type === "keydown") {
						if (held !== true) { setOverlay(false); return; }
						setOverlay(true); // 同源时是空操作；跨源时这一下才让捕获层接管滚轮
						const next = zoomForKey(pageZoomOf(address), event);
						if (next === null) return;
						const target = event.target;
						const owner = frame.parentElement;
						const inViewer = target !== null && target !== undefined &&
							(target === frame || (owner !== null && owner !== undefined && typeof owner.contains === "function" && owner.contains(target) === true));
						if (document.activeElement !== frame && vkZoomLastFrame !== frame && inViewer !== true) return;
						event.preventDefault();
						setPageZoom(address, next);
						applyFrameZoom(frame, next);
						vkZoomLastFrame = frame;
						setNote(next, "");
						return;
					}
					// keyup：松开 Ctrl 就把捕获层收起来
					if (held !== true) setOverlay(false);
				} catch { /* 缩放失败绝不影响页面本身 */ }
			};
			try {
				window.addEventListener("keydown", onParentKey, true);
				window.addEventListener("keyup", onParentKey, true);
				window.addEventListener("blur", onParentKey, true);
				offs.push(() => {
					try { window.removeEventListener("keydown", onParentKey, true); } catch { /* ignore */ }
					try { window.removeEventListener("keyup", onParentKey, true); } catch { /* ignore */ }
					try { window.removeEventListener("blur", onParentKey, true); } catch { /* ignore */ }
				});
			} catch { /* ignore */ }
			applyFrameZoom(frame, pageZoomOf(address)); // 换 src / 重装后把当前比例重新施加到新文档
			return () => {
				for (const off of offs) { try { off(); } catch { /* ignore */ } }
				if (vkZoomLastFrame === frame) vkZoomLastFrame = null;
			};
		}

		/** iframe 元素 + 地址 → 在 React 里挂载/卸载缩放（返回挂到 iframe 上的 ref）。 */
		function useFrameZoom(address) {
			const ref = react.useRef(null);
			react.useEffect(() => {
				const frame = ref.current;
				if (frame === null) return void 0;
				let off = () => {};
				const bind = () => {
					off();
					off = attachFrameZoom(frame, address);
				};
				bind();
				// 换 src / 重新加载后 document 是新的，监听要重装；跨源页也是加载完才判定得出来
				frame.addEventListener("load", bind);
				return () => {
					try { frame.removeEventListener("load", bind); } catch { /* ignore */ }
					off();
				};
			}, [address]);
			return ref;
		}
		/**
		 * 图片查看器（可缩放 / 可平移）：
		 * - 图片按实际像素尺寸渲染在可滚动容器里；初始「适应窗口」（大图缩小到完整可见，小图不放大）。
		 * - Ctrl(⌘)+滚轮 = 缩放图片（与 PDF / 浏览器一致，必须 preventDefault，否则会缩放整个 DSH 页面）；
		 *   不按 Ctrl 的滚轮 = 滚动图片本身（放行，不抢）。拖拽 = 平移；双击 = 适应/实际大小；Ctrl+0 = 复位 100%。
		 * - 工具条：缩小 / 放大 / 当前百分比 / 适应窗口 / 实际大小(1:1)。
		 * @param props - { src, alt, zoom, onZoom }
		 */
		function VK_ImageZoomPane(props) {
			const wrapRef = react.useRef(null);
			const naturalRef = react.useRef({ w: 0, h: 0 });
			const fitScaleRef = react.useRef(1);
			const fitModeRef = react.useRef(true);
			const ratioRef = react.useRef(1);
			const scaleRef = react.useRef(props.zoom === undefined ? 1 : props.zoom);
			const insideRef = react.useRef(false);
			const [scale, setScale] = react.useState(props.zoom === undefined ? 1 : props.zoom);
			const [fitScale, setFitScale] = react.useState(1);
			const [imgOk, setImgOk] = react.useState(false);
			const [imgErr, setImgErr] = react.useState(null);
			// 超过 host 预览上限（64MB）时另给一条出路：仅仅说「加载失败」等于把人堵死。
			const [imgTooBig, setImgTooBig] = react.useState(null);
			// <img> 的 onError 拿不到原因（413 的 JSON 体进不了 <img>），所以失败后再探一次：
			// 只在 413 时记下 host 的原话，其余错误保持通用提示。
			const onImgError = react.useCallback(() => {
				setImgErr("无法读取该地址");
				try {
					fetch(props.src, { headers: { Range: "bytes=0-0" } })
						.then((r) => {
							if (r.status !== 413) {
								try { if (r.body && typeof r.body.cancel === "function") r.body.cancel(); } catch { /* ignore */ }
								return null;
							}
							return r.json()
								.then((d) => { setImgTooBig(d !== null && d !== undefined && typeof d.error === "string" ? d.error : "file too large"); })
								.catch(() => { setImgTooBig("file too large"); });
						})
						.catch(() => { /* 探测本身失败就保留通用提示 */ });
				} catch { /* ignore */ }
			}, [props.src]);
			const applyScale = react.useCallback((next) => {
				scaleRef.current = next;
				setScale(next);
				if (typeof props.onZoom === "function") props.onZoom(next);
			}, [props]);
			// 计算「适应窗口」比例：容器/原始尺寸取小，且不超过 1（大图缩小到可见，小图不放大）
			const computeFit = react.useCallback(() => {
				const wrap = wrapRef.current;
				const n = naturalRef.current;
				if (!wrap || n.w <= 0 || n.h <= 0) return;
				const cw = wrap.clientWidth || 1;
				const ch = wrap.clientHeight || 1;
				const s = Math.min(1, cw / n.w, ch / n.h);
				fitScaleRef.current = s;
				setFitScale(s);
				if (fitModeRef.current) applyScale(s);
			}, [applyScale]);
			react.useEffect(() => {
				const wrap = wrapRef.current;
				if (!wrap) return () => {};
				computeFit();
				const ro = new ResizeObserver(() => computeFit());
				ro.observe(wrap);
				return () => ro.disconnect();
			}, [computeFit]);
			// 图片加载完成 → 拿到原始尺寸；svg 等无 natural 尺寸时退回首帧渲染尺寸
			const onImgLoad = react.useCallback((e) => {
				const img = e.target;
				let nw = img.naturalWidth || 0;
				let nh = img.naturalHeight || 0;
				if (nw <= 0 || nh <= 0) {
					const r = img.getBoundingClientRect();
					nw = r.width || 1;
					nh = r.height || 1;
				}
				naturalRef.current = { w: nw, h: nh };
				setImgOk(true);
				setImgErr(null);
				computeFit();
			}, [computeFit]);
			// 统一缩放入口：以当前可视中心为锚，缩放后滚动位置按比例重算
			const zoomBy = react.useCallback((factor) => {
				const wrap = wrapRef.current;
				if (!wrap || naturalRef.current.w <= 0) return;
				const cur = scaleRef.current;
				const next = clampZoom(cur * factor, imageZoomMin(fitScaleRef.current), ZOOM_MAX);
				if (next === cur) return;
				ratioRef.current = next / cur;
				fitModeRef.current = false;
				applyScale(next);
			}, [applyScale]);
			react.useEffect(() => {
				const wrap = wrapRef.current;
				if (!wrap || ratioRef.current === 1) return;
				const r = ratioRef.current;
				ratioRef.current = 1;
				wrap.scrollLeft = recenterScroll(wrap.scrollLeft, wrap.clientWidth, r);
				wrap.scrollTop = recenterScroll(wrap.scrollTop, wrap.clientHeight, r);
			}, [scale]);
			// 原生滚轮（非 passive）→ Ctrl+滚轮缩放；不按 Ctrl 时滚轮保持原义（滚动图片），绝不 preventDefault
			react.useEffect(() => {
				const wrap = wrapRef.current;
				if (!wrap) return () => {};
				const onWheel = (e) => {
					if (!(e.ctrlKey || e.metaKey)) return;
					e.preventDefault();
					e.stopPropagation();
					const f = wheelZoomFactor(e.deltaY, e.deltaMode);
					if (f === 1) return;
					zoomBy(f);
				};
				// Ctrl+0：复位到 100%（实际大小）。仅当指针在图片区域内时响应，不抢全局快捷键
				const onKeyDown = (e) => {
					if (!(e.ctrlKey || e.metaKey) || (e.key !== "0" && e.code !== "Digit0")) return;
					if (!insideRef.current) return;
					e.preventDefault();
					fitModeRef.current = false;
					applyScale(1);
				};
				const onEnter = () => { insideRef.current = true; };
				const onLeave = () => { insideRef.current = false; };
				wrap.addEventListener("wheel", onWheel, { passive: false });
				wrap.addEventListener("mouseenter", onEnter);
				wrap.addEventListener("mouseleave", onLeave);
				window.addEventListener("keydown", onKeyDown);
				return () => {
					wrap.removeEventListener("wheel", onWheel);
					wrap.removeEventListener("mouseenter", onEnter);
					wrap.removeEventListener("mouseleave", onLeave);
					window.removeEventListener("keydown", onKeyDown);
				};
			}, [zoomBy, applyScale]);
			// 拖拽平移（抓手/抓取光标）
			const dragRef = react.useRef(null);
			const onPanStart = react.useCallback((e) => {
				if (e.button !== 0) return;
				const wrap = e.currentTarget;
				dragRef.current = { x: e.clientX, y: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop };
				wrap.classList.add("vk_imgPan");
				try { wrap.setPointerCapture(e.pointerId); } catch { /* 某些环境不支持捕获 */ }
				const move = (ev) => {
					const d = dragRef.current;
					if (!d) return;
					wrap.scrollLeft = d.sl - (ev.clientX - d.x);
					wrap.scrollTop = d.st - (ev.clientY - d.y);
				};
				const up = () => {
					dragRef.current = null;
					wrap.classList.remove("vk_imgPan");
					wrap.removeEventListener("pointermove", move);
					wrap.removeEventListener("pointerup", up);
					wrap.removeEventListener("pointercancel", up);
				};
				wrap.addEventListener("pointermove", move);
				wrap.addEventListener("pointerup", up);
				wrap.addEventListener("pointercancel", up);
			}, []);
			// 双击：适应窗口 ↔ 实际大小(1:1)。scale 就是相对原始像素的直接比例，实际大小即 1。
			const onDblClick = react.useCallback(() => {
				if (fitModeRef.current) {
					fitModeRef.current = false;
					applyScale(1);
				} else {
					fitModeRef.current = true;
					applyScale(fitScaleRef.current);
				}
			}, [applyScale]);
			const toFit = react.useCallback(() => {
				fitModeRef.current = true;
				applyScale(fitScaleRef.current);
			}, [applyScale]);
			const toActual = react.useCallback(() => {
				fitModeRef.current = false;
				applyScale(1);
			}, [applyScale]);
			const zoomIn = react.useCallback(() => { zoomBy(ZOOM_BTN_STEP); }, [zoomBy]);
			const zoomOut = react.useCallback(() => { zoomBy(1 / ZOOM_BTN_STEP); }, [zoomBy]);
			const pct = Math.round(scale * 100);
			const imgStyle = imgOk
				? { width: Math.round(naturalRef.current.w * scale) + "px", height: Math.round(naturalRef.current.h * scale) + "px" }
				: { maxWidth: "100%", maxHeight: "100%" };
			return h("div", { className: "vk_imgPane", style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } },
				h("div", { className: "vk_imgToolbar" },
					h("button", { type: "button", className: "vk_imgZoomBtn", title: "缩小（Ctrl+滚轮下滚同效）", onClick: zoomOut }, h(VIcon, { name: "zoomOut", size: 13 })),
					h("button", { type: "button", className: "vk_imgZoomBtn", title: "放大（Ctrl+滚轮上滚同效）", onClick: zoomIn }, h(VIcon, { name: "zoomIn", size: 13 })),
					h("span", { className: "vk_imgZoomPct", title: "当前缩放比例（" + Math.round(ZOOM_MIN * 100) + "% ~ " + Math.round(ZOOM_MAX * 100) + "%，Ctrl+滚轮可调）" }, pct + "%"),
					h("span", { className: "vk_imgToolbarSpacer" }),
					h("button", { type: "button", className: "vk_imgZoomBtn" + (fitScale > 0 && Math.abs(scale - fitScale) < 1e-6 ? " vk_imgZoomBtnOn" : ""), title: "适应窗口（双击也可）", onClick: toFit }, "适应窗口"),
					h("button", { type: "button", className: "vk_imgZoomBtn" + (Math.abs(scale - 1) < 1e-6 ? " vk_imgZoomBtnOn" : ""), title: "实际大小 100%（Ctrl+0 同效）", onClick: toActual }, "1:1")
				),
				h("div", {
					className: "vk_imgWrap",
					ref: wrapRef,
					onPointerDown: onPanStart,
					onDoubleClick: onDblClick,
					title: "Ctrl+滚轮缩放 · 滚轮/拖拽平移 · 双击切换适应/实际大小 · Ctrl+0 复位 100%"
				},
					imgErr !== null
						? h("div", { style: { margin: "auto", padding: "18px", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", textAlign: "center" } },
							h("div", { style: { fontSize: "13px", fontWeight: 600 } }, imgTooBig === null ? "图片加载失败" : "图片过大，面板内无法预览"),
							h("div", { style: { fontSize: "11.5px", lineHeight: "17px", color: "var(--dsw-alias-label-tertiary)" } },
								imgTooBig === null
									? imgErr
									: ("host 预览上限 64MB（" + imgTooBig + "）。用「所在文件夹」调系统看图器打开，或「新窗口」交给浏览器（同样受该上限）。")),
							h("div", { style: { display: "flex", gap: "8px" } },
								h("button", { type: "button", className: "vk_pickBtn vk_primaryBtn", title: "在资源管理器中打开该文件所在的文件夹（不受 64MB 预览上限影响）", onClick: () => vkRevealInExplorer(vkImagePathOfSrc(props.src)) }, "所在文件夹"),
								h("button", { type: "button", className: "vk_pickBtn", title: "在新标签页打开原图地址", onClick: () => { try { window.open(props.src, "_blank"); } catch { /* 打不开就留着 */ } } }, "新窗口")))
						: h("img", {
							src: props.src,
							alt: props.alt === undefined ? "" : props.alt,
							style: imgStyle,
							draggable: false,
							onLoad: onImgLoad,
							onError: onImgError
						})
				)
			);
		}

		/**
		 * 图片地址 → 本地文件路径（给 <img src> 用 host 路由，浏览器才能直接解码）。
		 * 官方 blob: 预览走的是另一条路；这里用 /vscode-files/file（带正确的 content-type），
		 * 大小上限 64MB（host 侧 MAX_BLOB_BYTES），超出时由 <img> 的 onError 提示。
		 */
		function vkImageSrcOf(address, filePath) {
			const target = filePath !== null && filePath !== undefined ? filePath : vkFilePathOfAddress(address);
			if (target === null) return address;
			return "/vscode-files/file?path=" + encodeURIComponent(target);
		}
		/** 从 `/vscode-files/file?path=…` 这类自研 src 里取回磁盘路径（取不到给 null）。 */
		function vkImagePathOfSrc(src) {
			try {
				const u = new URL(String(src), "http://localhost");
				const p = u.searchParams.get("path");
				return p !== null && p.length > 0 ? p : null;
			} catch { return null; }
		}
		/**
		 * 用系统默认程序打开一个磁盘文件（Office 交给本机 Word/Excel/PowerPoint 原生打开）。
		 * 走自研 host 路由 `POST /vscode-files/open-native`（见 dsh-host-files）：
		 * 官方的 `/open-in-app/open` 只接受目录、且 app 表是编译期常量，做不到「打开这个文件」。
		 */
		function vkOpenNative(path) {
			if (typeof path !== "string" || path.length === 0) return;
			try {
				globalThis.__VK_OPEN_NATIVE__ = { at: new Date().toISOString(), path: path };
				fetch("/vscode-files/open-native", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ path: path })
				}).then((r) => r.json())
					.then((d) => { try { globalThis.__VK_OPEN_NATIVE__.result = d; } catch { /* ignore */ } })
					.catch((e) => { try { globalThis.__VK_OPEN_NATIVE__.result = String(e && e.message ? e.message : e); } catch { /* ignore */ } });
			} catch { /* 路由缺失时静默 */ }
		}
		/**
		 * 在资源管理器中打开某个文件**所在的文件夹**。
		 *
		 * 用官方 host 的 `POST /open-in-app/open`（app 目录里 Windows 上是 `explorer`）。
		 * ⚠️ 实测两个硬约束（源码 `lib/index.js` 的 open 路由）：① 只接受**目录**——
		 * 传文件路径会被 `isAbsolute + stat().isDirectory()` 判掉，直接 404 `directory does not exist`；
		 * ② 所以大图（>64MB）的出路是「打开所在文件夹」再由系统看图器打开，这条路不经
		 * `/vscode-files/file`，不受 64MB（MAX_BLOB_BYTES）预览上限影响。
		 */
		function vkRevealInExplorer(path) {
			if (typeof path !== "string" || path.length === 0) return;
			const dir = parentOfPath(path);
			if (typeof dir !== "string" || dir.length === 0) return;
			try {
				globalThis.__VK_REVEAL__ = { at: new Date().toISOString(), file: path, dir: dir };
				fetch("/open-in-app/open", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ app: "explorer", path: dir })
				}).then((r) => { try { globalThis.__VK_REVEAL__.status = r.status; } catch { /* ignore */ } })
					.catch((e) => { try { globalThis.__VK_REVEAL__.status = "error " + String(e && e.message ? e.message : e); } catch { /* ignore */ } });
			} catch { /* 路由缺失时静默 */ }
		}

		/** 右栏查看器 tab 类型的静态身份（id 与正文注册的 key 必须一致）。 */
		const VIEW_TAB_ID = "@anoslide/dsh-client-vscode-layout/view";
		const VIEW_TAB_KIND = "anoslide.view";
		/**
		 * 左栏正文 Tab 的持久化键。
		 * 换键名（v2）而不是沿用旧键：旧键里存的缺省值历史上是 "files"（刷新一次就会被写死成文件栏），
		 * 沿用旧键就会永远开局停在文件栏。换键 = 旧值自然作废，无需迁移代码，首帧一定落在会话栏。
		 */
		const VK_SIDEBAR_TAB_KEY = "vk.layout.vkSidebarTab.v2";
		/** 拓展栏展开状态（自研自己持久化：官方不持久化，实测每次加载都是收起）。 */
		const VK_RIGHT_PANE_KEY = "vk.layout.rightPaneOpen.v1";

		/** 自研私有子插槽：官方会话浏览器（WorkspaceBrowser）镜像落点（左栏「会话」Tab 的正文）。 */
		const VK_SIDEBAR_BROWSER = "vk.sidebar.browser";
		/** 自研私有子插槽：官方「添加工作区」弹层里那个目录选择洞的镜像落点。 */
		const VK_SIDEBAR_DIRFLOW = "vk.sidebar.dirflow";

		/** 该扩展名是否走自研查看器（Office 转换）。 */
		const VK_OFFICE_EXT = new Set(["doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "odp", "ods", "vsd", "vsdx", "vsdm"]);
		/** 该扩展名是否走自研图片缩放面板（官方 viewer 的图片分支无缩放，实测 src 是 blob:、无任何缩放控件）。 */
		const VK_IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "avif", "svg"]);
		/**
		 * 音视频：官方 viewer 注册表里只有 text/code/markdown/html/image/pdf 六类，
		 * 音视频落到 text 兜底只会显示「非文本文件，暂时无法预览」，所以由自研接管（host 侧走流式 + Range）。
		 * 只收浏览器原生能解的容器：mkv/avi/rmvb 这类放进去也只会得到一块黑屏。
		 */
		const VK_VIDEO_EXT = new Set(["mp4", "webm", "ogv", "m4v", "mov"]);
		const VK_AUDIO_EXT = new Set(["mp3", "wav", "flac", "ogg", "oga", "m4a", "aac", "opus"]);
		/**
		 * 本地文件里「应该交给系统默认程序打开」的扩展名：Office（Word/Excel/PPT 原生打开才能改版式）
		 * 与本地网页 html/htm（交给默认浏览器）。⚠️ http(s) 地址**不给**这个入口——
		 * 那是宿主自己的页面（如钱包充值页），塞给浏览器没有意义。
		 */
		function vkNativeOpenLabel(ext) {
			if (VK_OFFICE_EXT.has(ext)) return "用 Office 打开";
			if (ext === "html" || ext === "htm") return "用浏览器打开";
			return null;
		}
		/** 该地址是否是网页（http/https）。 */
		function vkIsWebAddress(address) {
			return typeof address === "string" && /^https?:\/\//i.test(address);
		}
		/** 地址 → 扩展名（小写，不含点）。 */
		function vkExtOfAddress(address) {
			if (typeof address !== "string") return "";
			const noQuery = address.split(/[?#]/)[0];
			const seg = noQuery.split("/").pop() || "";
			const dot = seg.lastIndexOf(".");
			return dot >= 0 ? seg.slice(dot + 1).toLowerCase() : "";
		}
		/**
		 * 该地址是否由自研查看器接管：Office 转换、http(s) 网页、以及图片（自研缩放面板）。
		 * 其余 dsh-resource 地址继续交给官方 sidebar-documentpreview（文本/代码/PDF/Markdown）。
		 */
		function vkShouldClaim(address) {
			if (vkIsWebAddress(address)) return true;
			const ext = vkExtOfAddress(address);
			// ⚠️ 本地 html/htm **不要**接管（实测踩过）：官方 documentpreview 的 html 正文走的是 host 的
			// `/vscode-files/fs/<目录>/<文件>` 网页预览路由（带 MIME 白名单 + 自动注入 `<base href>`，
			// 相对资源能正确加载）；自研这条正文用的是 `/vscode-files/file`，那个路由的 MIME 表里没有
			// html → 响应 `application/octet-stream` → **浏览器直接下载文件、拓展栏一片空白**。
			// 所以本地 html 交回官方，自研只负责 Office / 图片 / 音视频。
			return VK_OFFICE_EXT.has(ext) || VK_IMAGE_EXT.has(ext) || VK_VIDEO_EXT.has(ext) || VK_AUDIO_EXT.has(ext);
		}
		/**
		 * 地址 → 可读文本：`dsh-resource://file/session/<sid>/<编码路径>` 里的路径段是
		 * **percent-encoded** 的（`D%3A%2F…%2F%E4%B8%AD%E6%96%87.docx`），任何「把地址当文案显示」的
		 * 地方都必须先解码，否则标签条上出现的就是一串 `%E4%B8%AD` （实测踩到：中文文件名整条编码串）。
		 * 解不出来（路径里含裸 `%`）就回退原串，绝不抛。
		 */
		function vkDecodeAddress(address) {
			const raw = String(address);
			try { return decodeURIComponent(raw); } catch { return raw; }
		}
		/** 标签页标题：网页用主机名，Office 用文件名。 */
		function vkViewTitle(address) {
			if (vkIsWebAddress(address)) {
				try { return new URL(address).host; } catch { return "网页"; }
			}
			// ⚠️ 必须**先整串解码再切末段**：编码地址里的 `/` 是 `%2F`，先按 `/` 切会把整条路径当成一段
			// （`D%3A%2F…%2F%E4%B8%AD%E6%96%87.docx` 解码前没有分隔符可切）。解码后 Windows 盘符 `D:`、
			// 根内相对路径（`probe-zoom.png`）都能落到同一个末段逻辑上。
			const segs = vkDecodeAddress(address).split(/[\\/]+/).filter((s) => s.length > 0);
			return segs.length > 0 ? segs[segs.length - 1] : "文档";
		}

		/**
		 * 右栏查看器 tab 类型定义（两步注册的第一步）。
		 * patterns 只声明本类型真正要接管的地址：Office 文件地址、音视频、本地 html 与 http(s) 网页；
		 * 其余 dsh-resource://file/** 由官方 sidebar-documentpreview 的 fallback 类型接。
		 *
		 * ⚠️ 官方匹配器的语义（源码 `matcherFor`）：含 `:` 的 pattern 用 picomatch 匹配**整串地址**，
		 * 不含 `:` 的匹配 URL 的 pathname（且带 basename 选项）；而 **picomatch 的单星号不跨 `/`**——
		 * 写 `http://*` 时 `http://127.0.0.1:3098/` 与 `https://a.com/x/y` 都不匹配（实测：
		 * openResource 直接抛 `no registered tab type claims "http://…"`）。跨路径段必须用 `**`。
		 */
		function vkViewTabDefinition() {
			return {
				id: VIEW_TAB_ID,
				kind: VIEW_TAB_KIND,
				patterns: ["dsh-resource://file/**", "http://**", "https://**", "*"],
				priority: "extension",
				canOpen: (address) => vkShouldClaim(address),
				title: (address) => vkViewTitle(address)
			};
		}

		/**
		 * 解析官方文件地址 `dsh-resource://file/session/<会话>/<编码路径>`。
		 * 自研查看器的正文是 host 侧路由（/vscode-files/office、/vscode-files/file），它们要的是**磁盘路径**，
		 * 不是资源地址，所以要在这里把地址还原成文件系统路径（逐段解码，保留 Windows 盘符）。
		 * @param address - 资源地址。
		 * @returns 磁盘路径，或 null（不是文件地址时）。
		 */
		function vkFilePathOfAddress(address) {
			const prefix = "dsh-resource://file/session/";
			if (typeof address !== "string" || !address.startsWith(prefix)) return null;
			const rest = address.slice(prefix.length);
			const cut = rest.indexOf("/");
			if (cut < 0) return null;
			const encoded = rest.slice(cut + 1);
			const decoded = encoded.split("/").map((seg) => { try { return decodeURIComponent(seg); } catch { return seg; } }).join("/");
			// Windows 盘符在地址里是 `D:`，host 的路径解析两者都收，这里统一转成反斜杠形式更稳。
			//
			// ⚠️ 两种地址都要认（实测）：官方 viewer 与文件栏对**工作区根内**的文件写**相对路径**
			// （`.../session/<sid>/probe-zoom.png`），工作区根外才写绝对路径（`.../session/<sid>/D:/…`）。
			// 相对路径必须还原成绝对路径再交给 host 的 `/vscode-files/*`（它们要磁盘路径），否则会去
			// 服务进程的工作目录下找文件而 404/空。
			if (!/^[A-Za-z]:[\\/]/.test(decoded) && !decoded.startsWith("/")) {
				const cwd = vkCurrentSessionCwd();
				if (cwd.length > 0) return cwd.replace(/[\\/]+$/, "") + "\\" + decoded.replace(/\//g, "\\");
			}
			return decoded;
		}

		/**
		 * 查看器工具条的「打开方式 / 显示方式」下拉（官方 documentpreview 那颗胶囊的同款观感与交互）。
		 * items: `{ key?, label, title?, on?, run? }`；`on:true` 画成当前选中态（右侧打勾）。
		 * 关掉菜单的三种途径：点菜单外的任意处（捕获阶段 mousedown）、Esc、点任意一项。
		 */
		function VK_ViewModeMenu({ label, title, items }) {
			const [open, setOpen] = react.useState(false);
			const boxRef = react.useRef(null);
			react.useEffect(() => {
				if (!open) return void 0;
				const onDown = (e) => {
					const box = boxRef.current;
					if (box !== null && box !== undefined && !box.contains(e.target)) setOpen(false);
				};
				const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
				document.addEventListener("mousedown", onDown, true);
				document.addEventListener("keydown", onKey, true);
				return () => {
					document.removeEventListener("mousedown", onDown, true);
					document.removeEventListener("keydown", onKey, true);
				};
			}, [open]);
			const list = Array.isArray(items) ? items : [];
			return h("div", { className: "vk_viewMode", ref: boxRef },
				h("button", {
					type: "button",
					className: "vk_viewModeBtn" + (open ? " vk_viewModeBtnOn" : ""),
					title: title !== undefined && title !== null ? title : label,
					"aria-label": "打开方式",
					"aria-haspopup": "menu",
					"aria-expanded": open ? "true" : "false",
					onClick: () => setOpen(!open)
				}, label, h(VIcon, { name: "chevronDown", size: 11 })),
				open
					? h("div", { className: "vk_viewMenu", role: "menu" },
						list.map((it, i) => (it === null
							? h("div", { key: "sep" + i, className: "vk_viewMenuSep" })
							: h("button", {
								key: it.key !== undefined && it.key !== null ? it.key : String(i),
								type: "button",
								role: "menuitem",
								className: "vk_viewMenuItem" + (it.on === true ? " vk_viewMenuItemOn" : ""),
								title: it.title !== undefined && it.title !== null ? it.title : it.label,
								onClick: () => { setOpen(false); if (typeof it.run === "function") it.run(); }
							}, h("span", { className: "vk_viewMenuLabel" }, it.label), it.on === true ? h("span", { className: "vk_viewMenuCheck" }, h(VIcon, { name: "check", size: 12 })) : null))))
					: null
			);
		}

		// ──────────────────────────────────────────────────────────────
		// 组件：左栏「任务」Tab 的正文（长期任务插件 dsh-lt-tasks 的组件本体）
		// ──────────────────────────────────────────────────────────────
		/**
		 * 为什么需要它：`dsh-lt-tasks` 的客户端半边注册进 `sidebar.tasks` 这个插槽
		 * （`slots.inject("sidebar.tasks", () => slots.register({name:"sidebar.tasks"}, …))`），
		 * 而 0.1.5 的三栏形态下**没有任何人声明过这个键**（自研只接管 `sidebar.workspaces`，官方也不声明它），
		 * 于是那个 `inject` 因「未声明」**根本不回调** → 长期任务视图在两版界面里都消失（实测
		 * `slots.entries('sidebar.tasks')` = 空数组）。
		 * 修法：自研在自己 children 里**声明** `sidebar.tasks`（见 apply 里的注册），再在这里 renderSlot 渲染它。
		 * ⚠️ 风险与边界：声明是排他的——官方哪天也声明这个键就会冲突并拖垮整条 entry（§5.2.2 第 2 条）。
		 * 目前官方全部包里都搜不到 `sidebar.tasks`（只有 lt-tasks 注册、无人声明），所以当前是安全的；
		 * 真出问题时的退路：删掉 children 里的这一行即可回到「任务栏空白」的旧状态，不影响其余三栏。
		 */
		function VK_ExtensionsTabPane({ renderSlot, active }) {
			const [waiting, setWaiting] = react.useState(true);
			react.useEffect(() => {
				// 与 VK_TasksTabPane 同款：注册可能晚于本组件首帧 → 轻量轮询，最多 8 秒后给明确提示。
				let alive = true;
				let tries = 0;
				const tick = () => {
					if (!alive) return;
					tries += 1;
					let n = 0;
					try { n = (ctxRef.current.slots.entries("sidebar.extensions") || []).length; } catch { n = 0; }
					if (n > 0 || tries >= 20) { setWaiting(false); return; }
					setTimeout(tick, 400);
				};
				tick();
				return () => { alive = false; };
			}, []);
			const node = typeof renderSlot === "function" ? renderSlot("sidebar.extensions", { active: active === true }) : null;
			const empty = node === null || node === void 0 || (Array.isArray(node) && node.length === 0);
			return h("div", { style: { display: "flex", flexDirection: "column", minHeight: 0, height: "100%", overflow: "auto" } },
				empty
					? h("div", { className: "vk_empty", style: { padding: "12px" } },
						waiting ? "功能栏加载中…" : "未检测到「功能栏」插件（dsh-extensions-panel）：装上并重启后，移动端访问与局域网服务会出现在这里")
					: node);
		}

		function VK_TasksTabPane({ renderSlot, active }) {
			const [waiting, setWaiting] = react.useState(true);
			react.useEffect(() => {
				// 注册可能晚于本组件首帧（插件 apply 次序不保证）→ 轻量轮询，最多 8 秒后给一句明确提示。
				let alive = true;
				let tries = 0;
				const tick = () => {
					if (!alive) return;
					tries += 1;
					let n = 0;
					try { n = (ctxRef.current.slots.entries("sidebar.tasks") || []).length; } catch { n = 0; }
					if (n > 0 || tries >= 20) { setWaiting(false); return; }
					setTimeout(tick, 400);
				};
				tick();
				return () => { alive = false; };
			}, []);
			// 2026-09-13 修：必须把 active 透传下去——lt-tasks 的 TasksView 靠它判断「任务栏当前是否可见」，
			// 收到 active=true 时才重置视图（关掉已打开的任务详情、回到列表）。此前不传 → 恒 undefined
			// → 其 effect 里 `if (!active) return` 永远提前返回，切回任务栏会一直停在任务详情。
			const node = typeof renderSlot === "function" ? renderSlot("sidebar.tasks", { active: active === true }) : null;
			const empty = node === null || node === void 0 || (Array.isArray(node) && node.length === 0);
			return h("div", { style: { display: "flex", flexDirection: "column", minHeight: 0, height: "100%", overflow: "auto" } },
				empty
					? h("div", { className: "vk_empty", style: { padding: "12px" } },
						waiting ? "长期任务栏加载中…" : "未检测到「长期任务」插件（dsh-lt-tasks）：装上并重启后，任务列表会出现在这里")
					: node);
		}

		/**
		 * 右栏 tab 正文：把地址渲染成一个 URL 帧。
		 *   Office（docx/xlsx/pptx/vsd…）→ host 的 /vscode-files/office（COM 网页视图，失败自动转 PDF）；
		 *   网页                      → 直接 iframe 真地址；
		 *   其他本地文件              → /vscode-files/file 原样字节。
		 * 这是「Office 桥接」：复用 dsh-host-files 现成的转换端点，客户端不做任何转换逻辑。
		 */
		function VK_ViewerTabBody({ useTabInfo }) {
			const { tab } = useTabInfo();
			const navigation = tab.navigation;
			const address = navigation.address;
			const params = navigation.params !== undefined && navigation.params !== null ? navigation.params : {};
			const paramsUrl = params.url !== undefined && typeof params.url === "string" ? params.url : null;
			// 网页有两种进来方式：① 地址本身就是 http(s)（openResource 走不通，见下）；② 标签页类型路径
			// （`openTab`）把网址放在 params.url 里——官方 `placeResource` 只吃 `dsh-resource://` 前缀的地址，
			// http(s) 一律被前缀校验挡掉（实测确认不是 pattern 问题），所以自研的「粘贴网址即开」走的是 ②。
			const webUrl = vkIsWebAddress(address) ? address : (paramsUrl !== null && vkIsWebAddress(paramsUrl) ? paramsUrl : null);
			const web = webUrl !== null;
			// 网页 / 本地 html 的 iframe 缩放挂点（浏览器原生语义：iframe 元素 zoom；Ctrl+滚轮 / Ctrl+±/0；
			// 见 useFrameZoom 上面那段实测结论）。键用**真地址**（webUrl 或落盘地址），
			// 与标签一一对应，缩放比例按标签记忆。
			const frameRef = useFrameZoom(web ? webUrl : address);
			const filePath = web ? null : vkFilePathOfAddress(address);
			const targetPath = filePath !== null ? filePath : address;
			const targetExt = vkExtOfAddress(targetPath);
			const office = !web && VK_OFFICE_EXT.has(targetExt);
			// 音视频：走 host 的流式路由（支持 Range，<video> 才能拖进度；/vscode-files/file 是整块读+64MB 上限）
			const video = !web && VK_VIDEO_EXT.has(targetExt);
			const audio = !web && VK_AUDIO_EXT.has(targetExt);
			// 「用系统默认程序打开」：Office → 本机 Office；本地 html → 默认浏览器；http(s) 网页 → 默认浏览器。
			// 网页这一路是「把内嵌 iframe 里的这一页拿到真正的浏览器窗口里去」的出口（用户明确要）。
			const nativeOpenLabel = web ? "用浏览器打开" : vkNativeOpenLabel(targetExt);
			// Office 走两步：先问 host 的转换端点拿「视图入口 url」（/vscode-files/office 返回的是 JSON，直接塞进
			// iframe 只会显示一段 JSON——实测踩过），再把 iframe 指到那个入口。
			const [officeView, setOfficeView] = react.useState(() => (paramsUrl !== null ? { status: "ready", url: paramsUrl } : { status: "loading", url: null }));
			/** 音视频播放失败原因（浏览器解不了容器/编码时给出可执行的下一步）。 */
			const [mediaErr, setMediaErr] = react.useState(null);
			react.useEffect(() => {
				if (!office) return void 0;
				if (paramsUrl !== null) { setOfficeView({ status: "ready", url: paramsUrl }); return void 0; }
				let dead = false;
				setOfficeView({ status: "loading", url: null });
				const target = filePath !== null ? filePath : address;
				fetch("/vscode-files/office?path=" + encodeURIComponent(target))
					.then((r) => r.json())
					.then((d) => {
						if (dead) return;
						if (d !== null && d !== undefined && d.ok === true && typeof d.url === "string") setOfficeView({ status: "ready", url: d.url, note: typeof d.note === "string" ? d.note : null });
						else setOfficeView({ status: "error", url: null, note: d !== null && d !== undefined && typeof d.error === "string" ? d.error : "转换失败" });
					})
					.catch((e) => { if (!dead) setOfficeView({ status: "error", url: null, note: String(e && e.message ? e.message : e) }); });
				return () => { dead = true; };
			}, [office, address, filePath, paramsUrl]);
			const url = web
				? webUrl
				: office
					? (officeView.url !== null && officeView.url !== undefined ? officeView.url : null)
					: "/vscode-files/file?path=" + encodeURIComponent(filePath !== null ? filePath : address);
			// 图片：走自研缩放面板（同一标签类型内分支，地址语义与其它文件完全一样）
			if (!web && VK_IMAGE_EXT.has(vkExtOfAddress(address))) {
				return h("div", { className: "vk_viewerTab", style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } },
					h("div", { className: "vk_viewerBar", style: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", fontSize: "11.5px", color: "var(--dsw-alias-label-tertiary)", borderBottom: "0.5px solid var(--dsw-alias-border-l3)", flex: "none" } },
						h(VIcon, { name: "image", size: 13 }),
						h("span", { title: vkDecodeAddress(address), style: { flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, "图片 · " + vkViewTitle(address)),
						h(VK_ViewModeMenu, {
							label: "打开方式",
							title: "打开方式",
							items: [
								{
									key: "new-window",
									label: "新窗口",
									title: "在新标签页打开原图地址（用系统默认看图程序/浏览器打开）",
									run: () => {
										try {
											const target = filePath !== null ? filePath : address;
											window.open("/vscode-files/file?path=" + encodeURIComponent(target), "_blank");
										} catch { /* 打不开就留着 */ }
									}
								},
								{
									key: "reveal",
									label: "所在文件夹",
									title: "在资源管理器中打开该文件所在的文件夹（用系统看图器打开；不受 64MB 预览上限影响）",
									run: () => vkRevealInExplorer(filePath !== null ? filePath : address)
								}
							]
						})
					),
					h(VK_ImageZoomPane, {
						src: vkImageSrcOf(address, filePath),
						alt: vkViewTitle(address),
						zoom: tabZoomOf(address),
						onZoom: (z) => setTabZoom(address, z)
					})
				);
			}
			// 音视频：官方 viewer 没有这一类（落到 text 兜底只会说「非文本文件，暂时无法预览」）。
			// 走 host 的 /vscode-files/media —— 流式输出 + Range（<video> 没有 Range 就不能拖进度，
			// 而 /vscode-files/file 是整块读进内存、还有 64MB 上限）。
			if (video || audio) {
				const mediaSrc = "/vscode-files/media?path=" + encodeURIComponent(targetPath);
				return h("div", { className: "vk_viewerTab", style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } },
					h("div", { className: "vk_viewerBar", style: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", fontSize: "11.5px", color: "var(--dsw-alias-label-tertiary)", borderBottom: "0.5px solid var(--dsw-alias-border-l3)", flex: "none" } },
						h(VIcon, { name: video ? "monitor" : "file", size: 13 }),
						h("span", { title: vkDecodeAddress(address), style: { flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, (video ? "视频 · " : "音频 · ") + vkViewTitle(address)),
						h(VK_ViewModeMenu, {
							label: "打开方式",
							title: "打开方式",
							items: [
								{
									key: "new-window",
									label: "新窗口",
									title: "在新标签页打开流地址（交给浏览器自带播放器/下载）",
									run: () => { try { window.open(mediaSrc, "_blank"); } catch { /* 打不开就留着 */ } }
								},
								{
									key: "reveal",
									label: "所在文件夹",
									title: "在资源管理器中打开该文件所在的文件夹（用系统播放器打开）",
									run: () => vkRevealInExplorer(targetPath)
								}
							]
						})
					),
					h("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", padding: "12px", overflow: "auto" } },
						video
							? h("video", {
								src: mediaSrc,
								controls: true,
								preload: "metadata",
								style: { maxWidth: "100%", maxHeight: "100%", background: "#000", borderRadius: "8px" },
								onError: () => setMediaErr("浏览器无法播放该视频（容器/编码不支持；mkv、avi、rmvb 这类请用「所在文件夹」调系统播放器）")
							})
							: h("audio", {
								src: mediaSrc,
								controls: true,
								preload: "metadata",
								style: { width: "100%", maxWidth: "420px" },
								onError: () => setMediaErr("浏览器无法播放该音频（编码不支持；请用「所在文件夹」调系统播放器）")
							}),
						mediaErr !== null
							? h("div", { style: { fontSize: "11.5px", lineHeight: "17px", color: "var(--dsw-alias-label-tertiary)", textAlign: "center", maxWidth: "340px" } }, mediaErr)
							: null
					)
				);
			}
			// 「打开方式 / 显示方式」下拉的条目：按当前标签的实际能力拼（Office / 网页 / 本地 html 各不相同）。
			// Office 那两个是「显示方式」二选一（选中项打勾），其余是动作项；null 是分隔线。
			const officePdf = paramsUrl !== null && paramsUrl.indexOf("as=pdf") >= 0;
			const openOfficeView = (asPdf) => {
				try {
					const q = "/vscode-files/office?path=" + encodeURIComponent(targetPath) + (asPdf ? "&as=pdf" : "");
					tab.actions.openResource(address, { params: { url: q }, revealIfOpened: false });
				} catch { /* 打开失败时保留当前内容 */ }
			};
			const viewModeItems = [];
			if (office) {
				viewModeItems.push({
					key: "office-web", label: "网页视图", on: !officePdf,
					title: "本机 Office 转出来的网页视图（只读，首次转换较慢，结果会缓存）",
					run: () => openOfficeView(false)
				});
				viewModeItems.push({
					key: "office-pdf", label: "原版式（LibreOffice→PDF）", on: officePdf,
					title: "改用 LibreOffice 导出原版式 PDF",
					run: () => openOfficeView(true)
				});
				viewModeItems.push(null);
			}
			if (nativeOpenLabel !== null) {
				viewModeItems.push({
					key: "native", label: nativeOpenLabel,
					title: web
						? "用系统默认浏览器（Edge）打开这个网页"
						: VK_OFFICE_EXT.has(targetExt)
							? "用本机 Office（Word/Excel/PowerPoint）原生打开该文件"
							: "用系统默认浏览器打开这个本地网页",
					run: () => vkOpenNative(web ? webUrl : targetPath)
				});
			}
			if (!web) {
				viewModeItems.push({
					key: "reveal", label: "所在文件夹",
					title: "在资源管理器中打开该文件所在的文件夹",
					run: () => vkRevealInExplorer(targetPath)
				});
			}
			return h("div", { className: "vk_viewerTab", style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } },
				h("div", { className: "vk_viewerBar", style: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 8px", fontSize: "11.5px", color: "var(--dsw-alias-label-tertiary)", borderBottom: "0.5px solid var(--dsw-alias-border-l3)", flex: "none" } },
					h(VIcon, { name: web ? "monitor" : office ? "fileText" : "file", size: 13 }),
					h("span", { title: web ? webUrl : vkDecodeAddress(address), style: { flex: "1 1 auto", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, office ? "Office 转换预览 · " + vkViewTitle(address) : web ? webUrl : vkViewTitle(address)),
					h(VK_ViewModeMenu, {
						label: office ? "显示方式" : "打开方式",
						title: office ? "选择显示方式（网页视图 / 原版式），或用其它方式打开" : "打开方式",
						items: viewModeItems
					})
				),
				url !== null && url !== undefined
					? h("iframe", {
						key: url,
						ref: frameRef,
						className: "vk_viewerFrame",
						src: url,
						title: vkViewTitle(address),
						style: { flex: 1, minHeight: 0, width: "100%", border: 0, background: "var(--dsw-alias-bg-base)" }
					})
					: h("div", { className: "vk_empty", style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontSize: "12.5px", opacity: .85 } },
						office && officeView.status === "error"
							? "转换失败：" + String(officeView.note || "未知原因")
							: office ? "正在转换（首次转换较慢，结果会缓存）…" : "无可显示内容"
					)
			);
		}

		// ──────────────────────────────────────────────────────────────
		// @ 引用扩域源（T4）：官方 @ 只覆盖「会话工作区根」一个根，这里再挂一个同触发键 "@" 的源，
		// 把文件栏落地页里那些根（常用目录 / 会话根 / 最近打开）一并纳入，并做「按目录分组 + 逐组折叠」。
		//   ① 同触发键多源是官方支持的：inputTriggers 的 roster 按 (trigger, name) 去重、按 order 排序，
		//      菜单里每个源各成一节（官方源在前，本源的 order 给 70）。
		//   ② 插入格式走**官方语法**：`@相对路径` / 带空格用 `@"路径"`。相对路径是相对**会话工作区根**
		//      （官方 FILE_REFERENCE_PROMPT 的约定）；根外的文件写绝对斜杠路径。
		//   ③ 折叠：按「所在目录」分组（同组连续排，组间按最佳命中排序），每组首屏最多 VK_AT_GROUP_LIMIT 条，
		//      多出来的给一行「展开更多（本目录还有 N 条）」，点它菜单不关（onPick 回 continue:true，
		//      官方 shell 的 insertText 会把 draft 原样写回并按 continue 继续补全），下次 candidates 放开该组。
		// ──────────────────────────────────────────────────────────────
		/** 每个目录分组首屏条数上限。 */
		const VK_AT_GROUP_LIMIT = 8;
		/** 「展开更多」后单组条数上限。 */
		const VK_AT_GROUP_MAX = 40;
		/** 一次菜单最多回传的总条数（防止把上千条一口气铺开）。 */
		const VK_AT_TOTAL_LIMIT = 200;
		/** 检索命中条数上限（host /vscode-files/search 递归到 8 层、每根最多 200 条）。 */
		const VK_AT_ITEM_LIMIT = 120;
		/** 「展开更多」那一行在候选 value 里的标记，onPick 据此识别。 */
		const VK_AT_EXPAND_TAG = "vk-at-expand";
		/** 「展开更多目录」那一行在候选 value 里的标记。 */
		const VK_AT_MORE_TAG = "vk-at-more";
		/** 栏目（section）折叠行在候选 value 里的标记：点它 = 展开 / 收起整栏（2026-09-11 用户要求）。 */
		const VK_AT_SECTION_TAG = "vk-at-section";
		/** 落地页的目录行标记：点它 = 展开/收起那一级（不插入引用），与文件栏左右三角同义。 */
		const VK_AT_ROW_TAG = "vk-at-row";
		/** 首发列出的目录分组数 / 「展开更多目录」后的目录数上限。 */
		const VK_AT_GROUP_SHOW = 10;
		const VK_AT_GROUP_SHOW_MAX = 40;
		/** 本源在菜单里的节标题前缀（要能和官方源的「文件与文件夹」区分开）。 */
		const VK_AT_SECTION = "本机常用目录";
		/**
		 * onPick 回写 token 用的文本。
		 * 官方 shell 的 insertText 是「替换 token span」：文本必须与当前 token 一致才算应用成功
		 * （给空串会被判失败 → 菜单关掉、drilled 复位，实测踩过），所以「展开更多」这类不插入文字的动作
		 * 必须把 `@<当前 query>` 原样写回 + `continue:true` 让菜单继续开着重新取候选。
		 */
		let vkAtRestoreText = "";
		/**
		 * 「展开更多目录」是否已被点开：**跨查询保留**（第二轮改动）。
		 * 以前这里存的是「那一轮对应的查询」，查询一变就作废、菜单又收回 10 个目录；
		 * 现在点开一次就一直全展开，直到刷新页面（列表本身仍有 VK_AT_TOTAL_LIMIT 硬上限）。
		 */
		let vkAtShowAllGroups = false;
		/**
		 * 已展开的目录集合（键 = 归一化目录路径）。
		 * 同样**跨查询保留**（第二轮改动）：换关键词后之前展开过的目录保持展开，不必再点一次。
		 */
		const vkAtExpanded = new Set();
		/**
		 * @ 菜单的浏览 / 选中态（2026-09-12 第六轮用户口径）：
		 *   q        = 上一屏的查询（换关键词即作废选中）；
		 *   root     = 本次浏览的起点目录 ——「返回上一级」最多退到这里，再点就回落地页（不再无限往上退）；
		 *   dir      = 当前浏览的目录（null = 落地页 / 搜索结果那一屏）；
		 *   sel/selEntry = 单击选中的条目（路径 + 完整 value）；
		 *   mousePick    = 被鼠标**第二次**点击的那一行（onPick 靠它区分「鼠标再点一次」与「回车」）。
		 * 交互：单击 = 选中（DOM 描边高亮，不重取候选所以不闪）；再点同一行 = 目录进下一级 / 文件引用；
		 *       回车 = **一律在会话引用**（不管选中的是文件还是文件夹）。
		 * 菜单关闭时全部复位（见 vkInstallAtMenuReset）。
		 */
		const vkAtBrowse = { q: null, root: null, dir: null, sel: null, selEntry: null, mousePick: null };
		/**
		 * 「单击选中」的拦截 + 描边高亮（2026-09-12 第五轮：这是唯一可行的做法）。
		 *
		 * 官方 pipeline 的 settle() 在**任何鼠标 pick 之后都会无条件 reduce({type:'close'})**
		 * （见 ui-input-trigger/lib/client.js 的 settle），只有 outcome 带 continue 才会重开菜单。
		 * 所以「返回 undefined 让菜单别关」做不到 —— 那样菜单会被关掉（实测：整个 @ 列表消失）。
		 * 改法：在 **document 捕获阶段**拦下第一次 mousedown（document 早于 React 的 root 监听器，
		 * stopPropagation 后官方收不到事件 → settle 不执行 → 菜单原地不动、候选不重取 → 不闪），
		 * 只把描边打在那一行上；同一行的**第二次**点击直接放行给官方（目录进下一级 / 文件引用）。
		 * 行号来自官方 option 的 id：`dsh-slash-option-<source>-<index>`（ui-input-trigger 的 optionId）。
		 */
		const VK_AT_PICKED_CLASS = "vk-at-picked";
		/** 浏览态里那一行导航（kind === "nav"）的「钉住」标记类（CSS 做 sticky，钉在菜单顶部）。 */
		const VK_AT_PINNED_CLASS = "vk-at-pinned";
		/** 本屏候选的最后一份（拦点击时按 option 行号取回自己的 value；贴描边时按路径找回行号）。 */
		let vkAtLastItems = [];
		/** 清掉所有「已选中」描边与「钉住」标记（换屏 / 进入下一级 / 菜单关闭 / 引用之后都要清）。 */
		function vkAtClearPicked() {
			try {
				for (const el of document.querySelectorAll("." + VK_AT_PICKED_CLASS)) el.classList.remove(VK_AT_PICKED_CLASS);
				for (const el of document.querySelectorAll("." + VK_AT_PINNED_CLASS)) el.classList.remove(VK_AT_PINNED_CLASS);
			} catch { /* 非浏览器环境：跳过 */ }
		}
		/** 选中项在本屏候选里的行号（找不到给 -1）—— 官方 option 的 id 就是按这个行号编的。 */
		function vkAtPickedRowIndex() {
			if (vkAtBrowse.sel === null) return -1;
			for (let i = 0; i < vkAtLastItems.length; i += 1) {
				const it = vkAtLastItems[i];
				if (it === null || it === void 0 || typeof it.value !== "string") continue;
				try {
					const v = JSON.parse(it.value);
					if (v !== null && typeof v.path === "string" && normPath(v.path) === normPath(vkAtBrowse.sel)) return i;
				} catch { /* 坏 value：跳过 */ }
			}
			return -1;
		}
		/**
		 * 把描边重新贴到选中行上。
		 *
		 * 为什么不能只贴一次：候选行是 React 渲染的，**鼠标在行间移动就会触发 hover 高亮 → 整行重渲染 →
		 * className 被官方重算覆盖**，我们加的 vk-at-picked 就被冲掉（用户实测：描边一闪就没）。
		 * 所以每次菜单子树变动后都重新贴一次：按选中路径找回行号（与官方 option 的 id 同源），
		 * 只做一次 getElementById + classList 读写，幂等、开销可忽略。
		 */
		function vkAtSyncPicked() {
			try {
				const index = vkAtPickedRowIndex();
				const wantId = index < 0 ? null : "dsh-slash-option-vk-extended-" + index;
				for (const el of document.querySelectorAll("." + VK_AT_PICKED_CLASS)) {
					if (wantId === null || el.id !== wantId) el.classList.remove(VK_AT_PICKED_CLASS);
				}
				if (wantId === null) return;
				const row = document.getElementById(wantId);
				if (row !== null && !row.classList.contains(VK_AT_PICKED_CLASS)) row.classList.add(VK_AT_PICKED_CLASS);
			} catch { /* 非浏览器环境：跳过 */ }
		}
		/** 浏览态里那一行导航（kind === "nav"）在本屏候选里的行号；不在浏览态给 -1。 */
		function vkAtNavRowIndex() {
			if (vkAtBrowse.dir === null) return -1;
			for (let i = 0; i < vkAtLastItems.length; i += 1) {
				const it = vkAtLastItems[i];
				if (it === null || it === void 0 || typeof it.value !== "string") continue;
				try {
					const v = JSON.parse(it.value);
					if (v !== null && v.kind === "nav") return i;
				} catch { /* 坏 value：跳过 */ }
			}
			return -1;
		}
		/**
		 * 给导航行钉上 vk-at-pinned（CSS 的 sticky，滚动时固定在菜单顶部；用户口径：随时能点返回）。
		 * 与描边同理：React 重渲染会覆盖 className，所以要反复贴。
		 */
		function vkAtSyncPinnedNav() {
			try {
				const index = vkAtNavRowIndex();
				const wantId = index < 0 ? null : "dsh-slash-option-vk-extended-" + index;
				for (const el of document.querySelectorAll("." + VK_AT_PINNED_CLASS)) {
					if (wantId === null || el.id !== wantId) el.classList.remove(VK_AT_PINNED_CLASS);
				}
				if (wantId === null) return;
				const row = document.getElementById(wantId);
				if (row !== null && !row.classList.contains(VK_AT_PINNED_CLASS)) row.classList.add(VK_AT_PINNED_CLASS);
			} catch { /* 非浏览器环境：跳过 */ }
		}
		/** 装捕获阶段的 mousedown 拦截 + 描边续贴（详见上面的长注释）。 */
		function vkInstallAtPickHighlight() {
			try {
				document.addEventListener("mousedown", (e) => {
					const t = e === null || e === void 0 ? null : e.target;
					const row = t !== null && typeof t.closest === "function" ? t.closest("[role=option]") : null;
					if (row === null || row.closest("[data-trigger-menu]") === null) return;
					const parsed = /^dsh-slash-option-(.+)-(\d+)$/.exec(String(row.id === void 0 || row.id === null ? "" : row.id));
					if (parsed === null || parsed[1] !== "vk-extended") return; // 官方「对话」等条目照旧走官方 pick
					const item = vkAtLastItems[Number(parsed[2])];
					if (item === void 0 || typeof item.value !== "string") return;
					let value = null;
					try { value = JSON.parse(item.value); } catch { return; }
					if (value === null || value.kind !== "file") return; // 只有条目行参与「两段式」
					const p = String(value.path === null || value.path === undefined ? "" : value.path);
					if (p.length === 0) return;
					// 第二次点击同一行：记下「这一行是鼠标点的」，然后放行给官方。
					// （官方 settle() 里 via 恒为 "menu" —— 鼠标与回车都走它，所以 onPick 只能靠这个标记区分。）
					if (vkAtBrowse.sel !== null && normPath(vkAtBrowse.sel) === normPath(p)) {
						vkAtBrowse.mousePick = p;
						return;
					}
					e.preventDefault();
					e.stopPropagation();
					vkAtBrowse.mousePick = null; // 第一次点击：清掉可能残留的标记
					vkAtBrowse.sel = p;
					vkAtBrowse.selEntry = value;
					vkAtSyncPicked();
				}, true);
				// 官方每次重渲染都会覆盖 className → 菜单子树（含 class 变化）一动就补一次描边与顶部钉住。
				const obs = new MutationObserver(() => {
					if (vkAtBrowse.sel !== null) vkAtSyncPicked();
					vkAtSyncPinnedNav();
				});
				obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
			} catch { /* 非浏览器环境：跳过 */ }
		}

		/** @ 菜单右上角那颗放大镜的类名（样式见 CSS 的 `[data-trigger-menu] .vk_atSearchBtn`）。 */
		const VK_AT_SEARCH_BTN_CLASS = "vk_atSearchBtn";

		/**
		 * 量出「对话框」的水平中心（视口坐标 x）。
		 *
		 * 锚点两级回退：① 当前聚焦的 textarea / 可编辑区（就是对话框本体，最准）；② 官方 @ 菜单容器
		 * `[data-trigger-menu]` —— 它 `position:absolute;left:0;right:0` 铺满输入栏那一层，中心一致。
		 * 两级都量不到时返回 null，调用方回退到视口居中（旧行为）。
		 */
		function vkMeasureComposerCenterX() {
			try {
				// ① 最准的一档：此刻聚焦的那个输入框。按钮走 mousedown + preventDefault（见
				//    vkAtSearchEnsureButton），焦点仍在 textarea 上，量的就是「对话框」本体。
				const active = document.activeElement;
				if (active !== null && active !== void 0 && typeof active.getBoundingClientRect === "function"
					&& (active.tagName === "TEXTAREA" || active.isContentEditable === true)) {
					const ra = active.getBoundingClientRect();
					if (ra.width > 0) return ra.left + ra.width / 2;
				}
				// ② 次选：官方 @ 菜单容器（position:absolute;left:0;right:0 铺满输入栏那一层，中心一致）
				const menu = document.querySelector("[data-trigger-menu]");
				if (menu === null) return null;
				const r = menu.getBoundingClientRect();
				if (!(r.width > 0)) return null;
				return r.left + r.width / 2;
			} catch {
				return null;
			}
		}
		/** 它的图标：官方 IconSearch 同款的放大镜（原生 DOM 按钮拿不到 VIcon，用内联 SVG）。 */
		const VK_AT_SEARCH_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.6-3.6"></path></svg>';
		/** 右上角按钮的 DOM 引用（同步高亮态用；菜单重挂后由 observer 补回）。 */
		let vkAtSearchBtnEl = null;
		/** 弹窗当前开着没有（组件侧同步过来，供按钮重建后恢复高亮态）。 */
		let vkAtSearchDialogOpen = false;
		/** 组件登记进来的「打开弹窗」动作（点右上角按钮时调它）。 */
		let vkAtSearchOpenDialog = null;
		/** 观察器只装一次（apply 理论上只跑一次，这里仍加个闸）。 */
		let vkAtSearchBtnInstalled = false;

		/** 把「弹窗已打开」的高亮态贴回右上角按钮（幂等；按钮不在就什么都不做）。 */
		function vkAtSearchSyncBtnState() {
			try {
				if (vkAtSearchBtnEl === null || typeof vkAtSearchBtnEl.classList === "undefined") return;
				vkAtSearchBtnEl.classList.toggle("vk_atSearchBtnOn", vkAtSearchDialogOpen === true);
			} catch { /* 非浏览器环境：跳过 */ }
		}

		/**
		 * 把「搜索本机文件」放大镜钉到官方 @ 菜单（`[data-trigger-menu]`）的右上角
		 * （2026-09-12 用户要求：从对话框工具行搬到这里）。
		 *
		 * 为什么只能走 DOM：菜单是 ui-input-trigger 自己的 React 树（MenuView），自研插不进去 ——
		 * 同一个菜单里「单击描边」「顶部钉住」两处也是这个理由（见 vkAtSyncPicked / vkAtSyncPinnedNav）。
		 * 做法与它们一致：append 一个原生 button 到菜单容器，再由 MutationObserver 在菜单重挂后补回。
		 *
		 * 交互上两个要点：
		 * ① 用 mousedown + preventDefault（而不是 onClick）：不让输入框失焦 —— 焦点一离开 textarea，
		 *    官方的 @ 补全流水线就收摊、菜单跟着消失；
		 * ② 不会误关菜单：官方 MenuView 的「点到别处就收」判据是 `listRef.contains(target)`
		 *    （见其 onPointerDown），而按钮是菜单容器的后代 → 判据为真 → 菜单原地不动。
		 */
		function vkAtSearchEnsureButton() {
			try {
				// 快路径：按钮还在菜单里就只同步高亮态（DOM 变动很频繁，不做多余的 querySelector）
				if (vkAtSearchBtnEl !== null && vkAtSearchBtnEl.isConnected === true) {
					vkAtSearchSyncBtnState();
					return;
				}
				vkAtSearchBtnEl = null;
				// 没有宿主就不注入：搬家前那颗工具行按钮本来也只在 conversation.input.left 里渲染
				// （官方 InputBar 的判据是 `input === void 0 || sessionId === void 0 ? null : renderSlot(...)`，
				// 无会话时它根本不出现）。与其留一颗点了没反应的按钮，不如与搬家前保持同一个可用范围。
				if (typeof vkAtSearchOpenDialog !== "function") return;
				const menu = document.querySelector("[data-trigger-menu]");
				if (menu === null) return; // @ 菜单没开：什么都不做
				let btn = menu.querySelector("." + VK_AT_SEARCH_BTN_CLASS);
				if (btn === null) {
					btn = document.createElement("button");
					btn.type = "button";
					btn.className = VK_AT_SEARCH_BTN_CLASS;
					btn.title = "搜索本机文件 / 文件夹（浏览或模糊搜索，选中后在会话里插入 @ 引用）";
					btn.setAttribute("aria-label", "搜索本机文件");
					btn.innerHTML = VK_AT_SEARCH_ICON;
					btn.addEventListener("mousedown", (e) => {
						e.preventDefault();
						e.stopPropagation();
						const open = vkAtSearchOpenDialog;
						if (typeof open === "function") {
							try { open(); } catch { /* 输入机不可写（提交中/无会话）：静默 */ }
						}
					});
					menu.appendChild(btn);
				}
				vkAtSearchBtnEl = btn;
				vkAtSearchSyncBtnState();
			} catch { /* 非浏览器环境：跳过 */ }
		}

		/**
		 * 装上「观察 → 注入」这一套：body 每次变动都试着把按钮补进当时打开着的 @ 菜单。
		 * 官方菜单整棵由 React 管理、候选重取时还会重挂，所以只能这样反复补
		 * （与 vkAtSyncPicked / vkAtSyncPinnedNav 同一个理由）。
		 */
		function vkInstallAtSearchButton() {
			if (vkAtSearchBtnInstalled === true) return;
			vkAtSearchBtnInstalled = true;
			try {
				vkAtSearchEnsureButton();
				const obs = new MutationObserver(vkAtSearchEnsureButton);
				obs.observe(document.body, { childList: true, subtree: true });
			} catch { vkAtSearchBtnInstalled = false; /* 非浏览器环境：跳过 */ }
		}

		/** 该路径是否在一个根的子树内（Windows 大小写不敏感）。 */
		function vkAtInside(root, path) {
			const r = String(root === null || root === undefined ? "" : root).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
			const p = String(path === null || path === undefined ? "" : path).replace(/\\/g, "/").toLowerCase();
			return r.length > 0 && (p === r || p.startsWith(r + "/"));
		}
		/** 相对会话根的斜杠路径（官方插入格式）；不在根内给 null。 */
		function vkAtRelTo(cwd, path) {
			const c = String(cwd === null || cwd === undefined ? "" : cwd);
			if (c.length === 0 || !vkAtInside(c, path)) return null;
			const rel = String(path).replace(/\\/g, "/").slice(c.replace(/\\/g, "/").replace(/\/+$/, "").length + 1);
			return rel.length > 0 ? rel : null;
		}
		/**
		 * 选中文件**或文件夹**后写进输入框的 @ 引用文本（纯函数，写法与官方 @ 源一致）：
		 * 会话根内用相对路径、根外用绝对路径；含空格（或引号）用 @"…"；
		 * 文件夹**带尾斜杠**（`@目录/`）—— 正是官方 grammar 里目录候选的形态。
		 * @param absPath - 磁盘绝对路径（反斜杠或正斜杠皆可）。
		 * @param isDir - 该路径是文件夹（true）还是文件（缺省 / false）。
		 * @returns mention 文本；空路径返回空串。
		 */
		function vkInsertMentionOf(absPath, isDir) {
			const p = String(absPath === null || absPath === undefined ? "" : absPath);
			if (p.length === 0) return "";
			let cwd = "";
			try { cwd = vkAtSessionCwd(); } catch { cwd = ""; }
			const rel = vkAtRelTo(cwd, p);
			const text = rel !== null ? rel : p.replace(/\\/g, "/");
			return vkAtMention(text, isDir === true);
		}
		/** 模糊命中评分：命中越靠前越小，文件名命中优先于仅路径命中；不命中给 null（纯函数）。 */
		function vkAtScore(name, rel, q) {
			const n = String(name).toLowerCase();
			const r = String(rel).toLowerCase();
			if (q.length === 0) return r.length / 1000;
			const base = n.indexOf(q);
			if (base === 0) return r.length / 1000;
			if (base > 0) return 100 + base + r.length / 1000;
			const inPath = r.indexOf(q);
			return inPath < 0 ? null : 300 + inPath + r.length / 1000;
		}
		/** 会话工作区根（root 作用域组件拿不到 sessionId，一律现取；@ 扩域与地址解析共用）。 */
		function vkCurrentSessionCwd() {
			try {
				const snapshot = ctxRef.current.get("sessions").list.getSnapshot();
				const row = snapshot !== undefined && snapshot.current !== undefined ? snapshot.byId[snapshot.current] : undefined;
				return row !== undefined && typeof row.cwd === "string" && row.cwd.length > 0 ? row.cwd : "";
			} catch { return ""; }
		}
		/** 会话工作区根（vkAtSearch 用；实现见 vkCurrentSessionCwd）。 */
		function vkAtSessionCwd() {
			return vkCurrentSessionCwd();
		}
		/**
		 * 文件栏**当前状态**的镜像（由侧栏组件在状态变化时写入），@ 源的落地页据此镜像文件栏的三组结构：
		 *   treeRoot   —— 文件栏当前打开的根（含 switch_workspace_root 写入的会话根），排在 @ 检索根的第一位
		 *   autoRoot   —— 文件栏「最近打开」里那条会话建议根（/vscode-files/root 轮询拿到）
		 *   recentDirs —— 文件栏「最近打开」列表（localStorage dsh-vscode-layout:recents:v1）
		 *   fileList   —— 文件栏「文件列表」（localStorage dsh-vscode-layout:filelist:v1，点过的文件）
		 *   sessionFiles —— 「当前会话文件」（host /vscode-files/session-files：本会话贴入 + Agent 写/改 + 会话根近期改动）
		 *   sessionDirs  —— 本会话贴进对话的**文件夹**（并入「最近打开」）
		 */
		const vkUiRootRef = { treeRoot: null, autoRoot: null, recentDirs: [], fileList: [], sessionFiles: [], sessionDirs: [] };
		/**
		 * 本源要检索的根目录（按优先级降序，去重）：
		 * 文件栏当前根（第二轮新增，首要）→ 会话工作区根 → 常用目录 → 最近打开。
		 * 会话根同时是「相对路径」的基准，插入格式一律由 vkAtRelTo(cwd, path) 决定。
		 */
		function vkAtRoots() {
			const out = [];
			const seen = new Set();
			const push = (p) => {
				if (typeof p !== "string" || p.trim().length === 0) return;
				const v = p.trim();
				if (v.startsWith("::")) return;
				const k = normPath(v);
				if (seen.has(k)) return;
				seen.add(k);
				out.push(v);
			};
			push(vkUiRootRef.treeRoot);
			push(vkAtSessionCwd());
			for (const d of HOME_DIRS) push(d.path);
			// 最近打开按会话隔离：与左栏文件栏读同一把键（会话 id 现取）
			for (const p of readRecents(vkCurrentSessionId())) push(p);
			return out;
		}
		/** 组标签：相对该根的最多两段（例：`session-002-flyback-transformer`、`…/模型文件`）。 */
		function vkAtGroupLabel(root, dir) {
			const rel = vkAtRelTo(root, dir);
			const base = rel === null ? String(dir).replace(/\\/g, "/") : rel;
			const segs = base.split("/").filter((s) => s.length > 0);
			if (segs.length === 0) return rootBaseLabel(root);
			return segs.length <= 2 ? base : "…/" + segs.slice(-2).join("/");
		}
		/** 末段名（空则回落整串）。 */
		function rootBaseLabel(dir) {
			const segs = String(dir).replace(/\\/g, "/").split("/").filter((s) => s.length > 0);
			return segs.length > 0 ? segs[segs.length - 1] : String(dir);
		}
		/**
		 * 列一个目录的**直接子项**（目录在前、文件在后，与 FileTree 的 rows() 同序）。
		 * 隐藏项过滤跟文件栏那颗「眼睛」对齐（默认关，即两边都不显示 node_modules / .git 那类条目）：
		 * 「内容一致」的口径落到这一层 —— 两边看到的是同一批条目，而展开状态各记各的。
		 */
		async function vkAtListDir(dir, signal) {
			let d = null;
			try {
				const r = await fetch("/vscode-files/list?path=" + encodeURIComponent(dir), { signal });
				d = await r.json();
			} catch { return []; }
			if (d === undefined || d === null || d.ok !== true) return [];
			const showHidden = vkFileTreeState.showHidden === true;
			const dirs = (Array.isArray(d.dirs) ? d.dirs : []).filter((x) => showHidden || x.hidden !== true);
			const files = (Array.isArray(d.files) ? d.files : []).filter((x) => showHidden || x.hidden !== true);
			return [...dirs.map((y) => ({ y: y, isDir: true })), ...files.map((y) => ({ y: y, isDir: false }))]
				.map((e) => ({ path: e.y.path, name: e.y.name, isDir: e.isDir, hidden: e.y.hidden === true }));
		}
		/**
		 * 浏览态的一屏候选（2026-09-12 第六轮）：**第一行**是「↑ 返回上一级」，
		 * 由本插件在 DOM 上给它加 vk-at-pinned 类 → CSS `position:sticky;top:0`，滚动时钉在菜单顶部
		 * （用户口径：随时能点返回）；其余是该目录的直接子项（目录在前、文件在后，与文件栏 rows() 同序）。
		 * 返回**有边界**：最多退到本次浏览的起点 vkAtBrowse.root（从 DeepSeek 进来的不能一路退到 D 盘往上）；
		 * 已经到 root 时那一行变成「⌂ 回到目录首页」，点了回落地页。
		 * @param dir - 正在浏览的目录绝对路径。
		 * @param signal - 请求取消信号。
		 * @param query - 当前 query（continue 回写 token 用）。
		 * @returns 候选数组（直接交给菜单，不经栏目折叠）。
		 */
		async function vkAtBrowseRows(dir, signal, query) {
			const cwd = vkAtSessionCwd();
			const root = vkAtBrowse.root;
			const atRoot = root === null || root === undefined || normPath(dir) === normPath(root);
			const parent = parentOfPath(dir);
			const canUp = !atRoot && typeof parent === "string" && parent.length > 0;
			// 导航行必须在**首位**：sticky 只能钉在它自己的文档位置之上，放末尾就只能钉到列表底部。
			const rows = [{
				name: canUp ? "↑ 返回上一级" : "⌂ 回到目录首页",
				description: canUp ? parent : "回到落地页",
				icon: "folder",
				section: "浏览 · " + dir,
				value: JSON.stringify({ kind: "nav", to: canUp ? parent : "", q: query })
			}];
			const list = await vkAtListDir(dir, signal);
			for (const it of list) {
				const rel = vkAtRelTo(cwd, it.path);
				const mentionPath = rel !== null ? rel : String(it.path).replace(/\\/g, "/");
				rows.push({
					name: it.name,
					description: it.path,
					icon: it.isDir === true ? "folder" : "file",
					section: "浏览 · " + dir,
					value: JSON.stringify({
						kind: "file",
						fileKind: it.isDir === true ? "directory" : "file",
						path: it.path,
						isDir: it.isDir === true,
						label: it.name,
						mention: vkAtMention(mentionPath, it.isDir === true),
						q: query
					})
				});
			}
			if (list.length === 0) {
				rows.push({ name: "（这个文件夹是空的）", section: "浏览 · " + dir, value: JSON.stringify({ kind: "info" }) });
			}
			return rows.slice(0, VK_AT_TOTAL_LIMIT);
		}
		/** 一次「@ 后输入」的检索：串行扫各个根（并发容易把 host 打满），命中即按目录分组。 */
		async function vkAtSearch(query, signal, session) {
			const cwd = vkAtSessionCwd();
			const roots = vkAtRoots();
			const q = String(query === null || query === undefined ? "" : query).toLowerCase();
			// 浏览态优先（用户点开了某个文件夹）：无论此刻输入框里有没有关键词，都显示该目录的内容 ——
			// 「再点一次进入下一级」必须真的换屏，不能还停在搜索结果上。输入关键词会退出浏览态（见 candidates）。
			if (vkAtBrowse.dir !== null) {
				const rows = await vkAtBrowseRows(vkAtBrowse.dir, signal, query);
				return { cwd: cwd, items: rows, sections: { "浏览目录": rows.length }, mode: "browse" };
			}
			if (q.length === 0) {
				// 空查询 = @ 文件区落地页：**与左栏文件栏落地页逐项对齐**（第三轮微调第四批，取代旧版
				// 「列各根的直接子项」做法——那既不是文件栏的层级，也不同步展开状态）。
				//   ① 结构：工作区目录（**只有 DeepSeek / DSHlongtasks 两条目录行本身**，不铺子项）
				//      → 最近打开（会话建议根 + 最近列表）→ 文件列表（文件栏里点过的文件）。
				//      组名就是文件栏那三个 .vk_homeLabel 的原文，字字一致。
				//   ② 层级：目录行只有**处于展开态**时才把子项接在它下面（缩进 + ▸/▾），可以一层层点进去。
				//   ③ 展开态 = 文件栏那份共享集合（vkFileTreeHas / vkFileTreeToggle）：文件栏里收起，
				//      @ 里就收起；@ 里点开，文件栏立刻跟着展开（双向，见模块顶部的 vkFileTreeState）。
				//   ④ 去重与文件栏同一套：归一化路径整树去重、先到先得（工作区目录优先于最近打开）。
				// 注：这里**不再**单独出「文件栏当前根」一组——用户口径是「一级只有那两个目录条目」；
				//     「当前根优先」只保留在检索模式（vkAtRoots 仍把 treeRoot 排第一）。
				const out = [];
				const sections = { "工作区目录": 0, "当前会话文件": 0, "最近打开": 0, "文件列表": 0 };
				const seen = new Set();
				const seenAdd = (p) => {
					const k = normPath(p);
					if (seen.has(k)) return false;
					seen.add(k);
					return true;
				};
				/**
				 * 一条菜单条目（2026-09-12 第四轮用户口径）：
				 *   单击 = 选中（由 vkAtMarkPicked 在 DOM 上打描边高亮，候选文本本身不变 → 不重取所以不闪）；
				 *   再点同一行 = 目录打开下一级 / 文件在会话引用；回车 = 在会话引用。
				 * @param it - 条目（path / name / isDir）。
				 * @param depth - 保留参数（历史缩进用），现在一律平铺。
				 * @param section - 该行所属栏目名。
				 */
				const pushRow = (it, depth, section) => {
					const isDir = it.isDir === true;
					const rel = vkAtRelTo(cwd, it.path);
					const mentionPath = rel !== null ? rel : String(it.path).replace(/\\/g, "/");
					out.push({
						name: it.name,
						description: it.path,
						icon: isDir ? "folder" : "file",
						section: section,
						value: JSON.stringify({
							kind: "file",
							fileKind: isDir ? "directory" : "file",
							path: it.path,
							isDir: isDir,
							label: it.name,
							mention: vkAtMention(mentionPath, isDir),
							q: query
						})
					});
					sections[section] = (sections[section] === void 0 ? 0 : sections[section]) + 1;
				};
				// 注（2026-09-12 第三轮用户口径）：这里**不再内联展开**、也不进下一级 —— 目录/文件行就是可引用条目
				// （单击选中、回车引用），原先那套与文件栏共享展开态的 walk() 递归已删除；
				// 文件栏自己那份内联展开（vkFileTreeState.expanded）照旧保留、互不影响。
				// 一、工作区目录：两条**目录行本身**（一级不铺子项）
				for (const hd of HOME_DIRS) {
					if (out.length >= VK_AT_TOTAL_LIMIT) break;
					if (!seenAdd(hd.path)) continue;
					pushRow({ path: hd.path, name: hd.name, isDir: true }, 0, "工作区目录");
				}
				// 二、当前会话文件：与文件栏同位置（紧跟工作区目录）、同一份 host 采集结果。
				// 目录行点进去 = 展开（与文件栏一致），文件行照旧插入引用。
				const sessFiles = (Array.isArray(vkUiRootRef.sessionFiles) ? vkUiRootRef.sessionFiles : [])
					.filter((it) => it !== null && typeof it === "object" && typeof it.path === "string" && it.path.length > 0);
				for (const it of sessFiles) {
					if (out.length >= VK_AT_TOTAL_LIMIT) break;
					pushRow({ path: it.path, name: typeof it.name === "string" && it.name.length > 0 ? it.name : pathBase(it.path), isDir: false }, 0, "当前会话文件");
				}
				// 三、最近打开：文件栏那条会话建议根（autoRoot）+ **本会话贴进对话的文件夹** + 最近打开列表；
				//    工作区目录不进这一组（去重仍走同一套 seenAdd）。
				const autoRoot = typeof vkUiRootRef.autoRoot === "string" && vkUiRootRef.autoRoot.length > 0 ? vkUiRootRef.autoRoot : null;
				/** 文件栏用 landingLabel(路径, 该目录的 list 结果) 取名（拖入收件目录显示「贴入 · 文件名」），这里照办。 */
				const recentLabel = async (p) => {
					if (!isDropInboxDir(p)) return rootBaseLabel(p);
					const list = await vkAtListDir(p, signal);
					const files = list.filter((x) => x.isDir !== true).map((x) => ({ name: x.name }));
					return dropDirLabel(p, files.length > 0 ? { ok: true, files: files } : null);
				};
				if (autoRoot !== null && !isHomeDirPath(autoRoot) && seenAdd(autoRoot)) {
					pushRow({ path: autoRoot, name: await recentLabel(autoRoot), isDir: true }, 0, "最近打开");
				}
				const sessDirs = (Array.isArray(vkUiRootRef.sessionDirs) ? vkUiRootRef.sessionDirs : [])
					.filter((it) => it !== null && typeof it === "object" && typeof it.path === "string" && it.path.length > 0 && !isHomeDirPath(it.path));
				for (const sd of sessDirs) {
					if (out.length >= VK_AT_TOTAL_LIMIT) break;
					if (autoRoot !== null && normPath(sd.path) === normPath(autoRoot)) continue;
					if (!seenAdd(sd.path)) continue;
					pushRow({ path: sd.path, name: typeof sd.name === "string" && sd.name.length > 0 ? sd.name : rootBaseLabel(sd.path), isDir: true }, 0, "最近打开");
				}
				for (const rp of readRecents(vkCurrentSessionId())) {
					if (out.length >= VK_AT_TOTAL_LIMIT) break;
					if (isHomeDirPath(rp)) continue;
					if (autoRoot !== null && normPath(rp) === normPath(autoRoot)) continue;
					if (!seenAdd(rp)) continue;
					pushRow({ path: rp, name: await recentLabel(rp), isDir: true }, 0, "最近打开");
				}
				// 四、文件列表：**文件**（不是某个目录的直接子项），单独成一组直接给条目
				const listed = (Array.isArray(vkUiRootRef.fileList) ? vkUiRootRef.fileList : [])
					.filter((it) => it !== null && typeof it === "object" && typeof it.path === "string" && it.path.length > 0);
				for (const it of listed) {
					if (out.length >= VK_AT_TOTAL_LIMIT) break;
					pushRow({
						path: it.path,
						name: typeof it.name === "string" && it.name.length > 0 ? it.name : pathBase(it.path),
						isDir: false
					}, 0, "文件列表");
				}
				// 五、对话：条目**原样复用官方源那一份**（value 与 option 文案都不动，插入语义因此与官方逐字一致），
				// 只把 section 统一成「对话」，好让本源把它当成一个可折叠的栏目统一处理。
				const sessionCands = await vkAtSessionItems(session, signal);
				if (Array.isArray(sessionCands)) {
					for (const c of sessionCands) {
						if (out.length >= VK_AT_TOTAL_LIMIT) break;
						if (c === null || c === undefined) continue;
						out.push({ ...c, section: "对话" });
						sections["对话"] = (sections["对话"] === void 0 ? 0 : sections["对话"]) + 1;
					}
				}
				// 栏目折叠（2026-09-11 用户要求）：默认每栏只出一行「▸ 栏目（N 条）」，点开才铺内容。
				return { cwd, items: vkAtCollapseSections(out, query), sections: sections, mode: "toplevel" };
			}
			const groups = new Map();
			let total = 0;
			for (const root of roots) {
				if (signal !== undefined && signal.aborted) break;
				if (total >= VK_AT_ITEM_LIMIT) break;
				// 以前这里会跳过「会话工作区根本身」（那批文件交给官方源覆盖，免得菜单里出现两份）。
				// 现在官方源的「文件与文件夹」一节已被定向摘掉（见 vkPatchOfficialAtSource），会话根不再有人覆盖，
				// 必须自己搜——否则最常用的那个根（会话工作区）在 @ 里一条都搜不到。
				let items = [];
				try {
					const r = await fetch("/vscode-files/search?path=" + encodeURIComponent(root) + "&q=" + encodeURIComponent(query), { signal });
					const d = await r.json();
					if (d !== undefined && d !== null && d.ok === true && Array.isArray(d.results)) items = d.results;
				} catch { continue; }
				for (const it of items) {
					if (total >= VK_AT_ITEM_LIMIT) break;
					const path = String(it.path);
					const dir = path.slice(0, Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/")));
					const key = normPath(dir);
					let g = groups.get(key);
					if (g === void 0) {
						g = { dir: dir, root: root, label: vkAtGroupLabel(root, dir), items: [] };
						groups.set(key, g);
					}
					g.items.push({ name: it.name, path: path, rel: typeof it.rel === "string" ? it.rel : vkAtRelTo(root, path), isDir: false });
					total += 1;
				}
			}
			const list = [...groups.values()];
			for (const g of list) {
				g.items = g.items
					.map((it) => ({ it: it, s: vkAtScore(it.name, it.rel === null ? it.name : it.rel, q) }))
					.filter((x) => x.s !== null)
					.sort((x, y) => x.s - y.s)
					.map((x) => x.it);
			}
			// 组间连续：同目录的条目始终排在一起，section 头不重复出现；组顺序按各组最佳命中
			const nonEmpty = list.filter((g) => g.items.length > 0);
			nonEmpty.sort((x, y) => vkAtScore(x.items[0].name, x.items[0].rel, q) - vkAtScore(y.items[0].name, y.items[0].rel, q));
			return { cwd, groups: nonEmpty, query: q };
		}
		/** 把一组命中转成菜单条目（含「展开更多」）。groupLimit 是「跨组公平」后本组能占的条数。 */
		function vkAtGroupItems(cwd, group, q, groupLimit) {
			const key = normPath(group.dir);
			const expanded = vkAtExpanded.has(key);
			const cap = expanded ? VK_AT_GROUP_MAX : Math.max(1, groupLimit);
			const shown = Math.min(cap, group.items.length);
			const out = [];
			// 组标题：**只管检索模式**——落地页（空查询）现在由 vkAtSearch 直接产出条目（见那里的 ①-④），
			// 不再经过这个函数。检索模式的组标签一律「本机常用目录 · <目录相对路径>」。
			const head = typeof group.section === "string" && group.section.length > 0 ? group.section : VK_AT_SECTION;
			const sectionText = group.label === head ? head : head + " · " + group.label;
			for (const it of group.items.slice(0, shown)) {
				const rel = vkAtRelTo(cwd, it.path);
				// 会话根内写相对路径（官方约定），根外退回绝对斜杠路径
				const mentionPath = rel !== null ? rel : String(it.path).replace(/\\/g, "/");
				out.push({
					name: it.name,
					description: group.label,
					icon: it.isDir === true ? "folder" : "file",
					section: sectionText,
					value: JSON.stringify({ kind: "file", fileKind: it.isDir === true ? "directory" : "file", path: it.path, isDir: it.isDir === true, label: it.name, mention: vkAtMention(mentionPath, it.isDir === true), q: q })
				});
			}
			if (group.items.length > shown) {
				out.push({
					name: "展开更多（本目录还有 " + (group.items.length - shown) + " 条）",
					description: group.label,
					section: sectionText,
					value: JSON.stringify({ kind: VK_AT_EXPAND_TAG, group: key, q: q })
				});
			}
			return out;
		}
		/**
		 * 把落地页条目按栏目折叠（2026-09-11 用户要求：栏目可折叠、默认折叠，且形态与文件栏对齐）。
		 * 与文件栏同一套形态：**栏目头永远在内容上方**，点它 = 收起 / 展开。
		 *   · 收起：`▸ 对话（12 条）`
		 *   · 展开：`▾ 对话（12 条）` + 紧随其后的条目（条目一律去掉 section 字段，
		 *     否则官方会在下面再渲染一个同名 section 标题，变成「两层标题」；内容行再加一个全角空格
		 *     的缩进，看起来才像挂在这一栏下面）。
		 * 展开态记在模块级 vkSectionState（跨查询保留，刷新即复位）。
		 */
		function vkAtCollapseSections(items, query) {
			const out = [];
			let i = 0;
			while (i < items.length) {
				const sec = items[i].section;
				if (typeof sec !== "string" || sec.length === 0) {
					out.push(items[i]);
					i += 1;
					continue;
				}
				const group = [];
				while (i < items.length && items[i].section === sec) {
					group.push(items[i]);
					i += 1;
				}
				const open = vkSectionIsOpen(sec);
				const value = JSON.stringify({ kind: VK_AT_SECTION_TAG, section: sec, q: query });
				out.push({
					name: (open ? "\u25BE " : "\u25B8 ") + sec + "（" + group.length + " 条）",
					description: "",
					value: value
				});
				if (open) for (const it of group) out.push({ ...it, section: void 0, name: "\u3000" + (typeof it.name === "string" ? it.name : "") });
			}
			return out;
		}
		/** 官方插入语法：`@路径`；含空格用 `@"路径"`（与官方 formatFileMention 同规则，目录带尾斜杠）。 */
		function vkAtMention(mentionPath, isDir) {
			const p = String(mentionPath) + (isDir === true ? "/" : "");
			return /[\s"]/.test(p) ? '@"' + p + '"' : "@" + p;
		}
		/**
		 * 「对话」栏（2026-09-11 用户要求：@ 里会话栏目也要折叠）。
		 * 官方 reference 源的会话条目点击走它自己的 onPick，我们拦不到 → 做不出「点标题展开」的栏目行。
		 * 但本插件**没有注入 typert registry**，`ctx.remote.sessionReferenceResolver` 用不了
		 * （实测 `ctx.remote` 不存在）。所以改走一条更稳的路：patch 官方源时留存它的**原始 candidates**，
		 * 由本源直接调用它拿会话条目（含官方生成的 mention），条目原样复用、只换一个可以折叠的 section。
		 * 拿不到（patch 未生效 / 调用失败）时返回 null：本源不出「对话」栏，官方那节保留，功能绝不回退。
		 */
		let vkOfficialAtSource = null; // 官方 reference 源对象
		let vkOfficialAtCandidates = null; // 它的原始 candidates
		let vkSessionPool = []; // 官方会话条目缓存（orig 调用失败时的兜底）
		async function vkAtSessionItems(session, signal) {
			// 每次都向官方源要最新列表（pool 只在官方源拿不到时兜底，避免 @ 里永远是旧会话）。
			if (typeof vkOfficialAtCandidates !== "function") return vkSessionPool.length > 0 ? vkSessionPool : null;
			try {
				const items = await vkOfficialAtCandidates.call(vkOfficialAtSource, session, {
					query: "", quoted: false, drilled: false, signal: signal
				});
				if (!Array.isArray(items)) return vkSessionPool.length > 0 ? vkSessionPool : null;
				const sess = items.filter((it) => {
					if (it === null || it === undefined || typeof it.value !== "string") return false;
					try { return JSON.parse(it.value).kind === "session"; } catch { return false; }
				});
				if (sess.length > 0) vkSessionPool = sess;
				return sess;
			} catch { return vkSessionPool.length > 0 ? vkSessionPool : null; }
		}
		/**
		 * 构建 @ 扩域源对象（供 inputTriggers.registerSource）。
		 * @returns 源定义。
		 */
		function vkAtSourceDefinition() {
			return {
				trigger: "@",
				name: "vk-extended",
				order: 70,
				showGroupTitle: false,
				async candidates(session, req) {
					const query = String(req.query === null || req.query === undefined ? "" : req.query);
					// 换了关键词 = 换了一屏内容：选中态作废、并退出目录浏览态（回到搜索结果那一屏）；
					// 否则回车可能引用已经不在列表里的旧条目、或搜索打字没反应。
					if (vkAtBrowse.q !== query) {
						vkAtBrowse.q = query;
						vkAtBrowse.sel = null;
						vkAtBrowse.selEntry = null;
						vkAtBrowse.mousePick = null;
						vkAtBrowse.dir = null;
						vkAtBrowse.root = null;
						vkAtClearPicked();
					}
					// 带斜杠的查询是「钻进目录」的路径式查询，交给官方源（它按目录列实时状态）
					if (query.includes("/") || query.includes("\\")) return [];
					const found = await vkAtSearch(query, req.signal, session);
					if (req.signal !== undefined && req.signal.aborted) return [];
					// 落地页（空查询）：候选由 vkAtSearch 一次算好（文件栏落地页的镜像：顺序、层级、
					// 展开态都按文件栏那份共享状态），不走下面的「跨组公平配额」——那套是给检索结果用的。
					if (Array.isArray(found.items)) {
						globalThis.__VK_AT_LAST__ = {
							at: new Date().toISOString(), query: query, cwd: found.cwd, roots: vkAtRoots(),
							treeRoot: vkUiRootRef.treeRoot,
							groups: Object.keys(found.sections === void 0 ? {} : found.sections).map((k) => ({ dir: "::" + k, label: k, n: found.sections[k] })),
							shown: found.items.length, drilled: vkAtShowAllGroups,
							expandedDirs: [...vkFileTreeState.expanded],
							hits: found.items.length, mode: "toplevel"
						};
						return found.items.slice(0, VK_AT_TOTAL_LIMIT);
					}
					// ── 以下为检索模式（query 非空）─────────────────────────────────
					// 跨组公平：先每组给 2 条铺开各目录，剩余配额按组顺序补到 VK_AT_GROUP_LIMIT；
					// 组数很多时也不会只剩某一个目录的条目。展开过的组单独放开（见 vkAtGroupItems）。
					//
					// 组数上限：命中散落在很多备份/版本目录时（实测 DSHlongtasks 下十几个 backups/vN/workspace），
					// 一次只列 VK_AT_GROUP_SHOW 个目录，尾部给一行「展开更多目录」，点开后放到
					// VK_AT_GROUP_SHOW_MAX 个——所以「@ 打开」永远是一屏可读，绝不会一次铺开几千条。
					const allGroups = Array.isArray(found.groups) ? found.groups : [];
					const drilled = vkAtShowAllGroups;
					const showGroups = drilled ? VK_AT_GROUP_SHOW_MAX : VK_AT_GROUP_SHOW;
					const groups = allGroups.slice(0, showGroups);
					globalThis.__VK_AT_LAST__ = {
						at: new Date().toISOString(), query: query, cwd: found.cwd, roots: vkAtRoots(),
						treeRoot: vkUiRootRef.treeRoot,
						groups: allGroups.map((g) => ({ dir: g.dir, label: g.label, n: g.items.length })),
						shown: groups.length, drilled: drilled, expandedDirs: [...vkAtExpanded],
						hits: allGroups.reduce((n, g) => n + g.items.length, 0), mode: "search"
					};
					const quota = groups.map(() => 2);
					let used = groups.reduce((n, g) => n + Math.min(2, g.items.length), 0);
					for (let i = 0; i < groups.length; i += 1) {
						while (quota[i] < VK_AT_GROUP_LIMIT && used < VK_AT_TOTAL_LIMIT && quota[i] < groups[i].items.length) {
							quota[i] += 1;
							used += 1;
						}
					}
					const out = [];
					for (let i = 0; i < groups.length; i += 1) {
						if (out.length >= VK_AT_TOTAL_LIMIT) break;
						out.push(...vkAtGroupItems(found.cwd, groups[i], query, quota[i]));
					}
					if (allGroups.length > groups.length && out.length < VK_AT_TOTAL_LIMIT) {
						out.push({
							name: "展开更多目录（还有 " + (allGroups.length - groups.length) + " 个目录命中）",
							description: "本机常用目录",
							section: VK_AT_SECTION + " · 更多目录",
							value: JSON.stringify({ kind: VK_AT_MORE_TAG, q: query })
						});
					}
					return out.slice(0, VK_AT_TOTAL_LIMIT);
				},
				// 不再发布 header（crumbs）：旧版那条「文件栏里的根目录」面包屑在新落地页里是多余的一行——
				// 三组内容已由 section 标题（工作区目录 / 最近打开 / 文件列表）自报家门，且文件栏里没有对应物。
				onPick({ candidate, action, via }) {
					let value = null;
					try { value = JSON.parse(candidate.value); } catch { return void 0; }
					if (value === null || value === void 0) return void 0;
					// ① 浏览态末尾的「↑ 返回上一级 / ⌂ 回到目录首页」（有边界：最多退到本次起点 vkAtBrowse.root）
					if (value.kind === "nav") {
						vkAtBrowse.dir = typeof value.to === "string" && value.to.length > 0 ? value.to : null;
						if (vkAtBrowse.dir === null) vkAtBrowse.root = null;
						vkAtBrowse.sel = null;
						vkAtBrowse.selEntry = null;
						vkAtBrowse.mousePick = null;
						vkAtClearPicked();
						vkAtRestoreText = String(value.q === null || value.q === undefined ? "" : value.q);
						return { text: "@" + vkAtRestoreText, continue: true };
					}
					// ② 条目行（2026-09-12 第六轮用户口径）
					if (value.kind === "file") {
						const p = String(value.path === null || value.path === undefined ? "" : value.path);
						const isDir = value.fileKind === "directory" || value.isDir === true;
						const restore = () => {
							vkAtRestoreText = String(value.q === null || value.q === undefined ? "" : value.q);
							return { text: "@" + vkAtRestoreText, continue: true };
						};
						const insertOf = (v) => ({ insert: {
							source: "reference",
							ref: v.mention,
							label: v.label,
							appearance: v.isDir === true || v.fileKind === "directory" ? "folder" : "file",
							clipboardText: v.mention
						} });
						// 鼠标「在同一行上的第二次点击」才会被 mousedown 拦截留下 mousePick 标记。
						// **不能看 via**：官方 settle() 里 via 恒为 "menu"（回车触发的 pick 也是它），
						// 早先按 via 判断导致「选中后回车 = 打开了文件夹」。
						const byMouse = p.length > 0 && vkAtBrowse.mousePick !== null && normPath(vkAtBrowse.mousePick) === normPath(p);
						vkAtBrowse.mousePick = null;
						if (!byMouse) {
							// 回车（以及其它不是「鼠标再点一次」的途径）= 在会话引用：
							// 有选中项就引用选中项（避免与官方「高亮项」错位），没有则引用当前高亮这一条。
							vkAtClearPicked();
							return insertOf(vkAtBrowse.selEntry !== null ? vkAtBrowse.selEntry : value);
						}
						// 已选中的目录再点一次（鼠标）：打开下一级（整份列表替换成该文件夹的内容）
						if (isDir) {
							if (vkAtBrowse.root === null) vkAtBrowse.root = p; // 记起点：「返回上一级」不得越过它
							vkAtBrowse.dir = p;
							vkAtBrowse.sel = null;
							vkAtBrowse.selEntry = null;
							vkAtClearPicked();
							return restore();
						}
						// 已选中的文件再点一次（鼠标）：在会话引用
						vkAtClearPicked();
						return insertOf(value);
					}
					// 目录行的旧形态（VK_AT_ROW_TAG）：保留兼容，仍按「展开-收起」处理
					if (value.kind === VK_AT_ROW_TAG || (value.dirRow === true && action === "drill")) {
						// 「点进去 = 展开那一级」（用户口径）：写回**共享**的展开集合 → 左栏文件栏同步展开/收起；
						// 子项由文件栏那条 [expanded, entries] 的 effect 自动取回（@ 侧下一次 candidates 自己列）。
						// 2026-09-13 按用户口径解绑：@ 菜单的旧「目录行」分支**不再写左栏文件栏的展开集**
						// （原来 vkFileTreeToggle 会连带把左栏展开/收起）。@ 自己那份由 vkAtBrowse 走官方 drill。
						// token 文本必须**原样**写回：官方 insertText 是「替换 token span」，空串会被判失败
						// → 菜单关闭并复位（实测踩过）；continue 让菜单保持打开并按新状态重新取候选。
						vkAtRestoreText = String(value.q === null || value.q === undefined ? "" : value.q);
						return { text: "@" + vkAtRestoreText, continue: true };
					}
					if (value.kind === "session") {
						// 会话引用：与官方 reference 源的 onPick 逐字一致（条目本身也是官方原样复制过来的）。
						return { insert: {
							source: "reference",
							ref: value.mention,
							label: value.label,
							appearance: "session",
							clipboardText: value.mention
						} };
					}
					if (value.kind === VK_AT_SECTION_TAG) {
						// 栏目折叠 / 展开（2026-09-11）：与「展开更多」同一套 continue 机制——
						// token 文本必须原样写回（官方 insertText 是「替换 span」，空串会被判失败 → 菜单关闭）。
						const nowOpen = vkSectionToggle(value.section);
						try {
							const trace = globalThis.__VK_AT_LAST__;
							if (trace !== undefined && trace !== null) trace.section = { name: value.section, nowOpen: nowOpen };
						} catch { /* 痕迹只给 CDP 取证用 */ }
						vkAtRestoreText = String(value.q === null || value.q === undefined ? "" : value.q);
						return { text: "@" + vkAtRestoreText, continue: true };
					}
					if (value.kind === VK_AT_EXPAND_TAG) {
						vkAtExpanded.add(value.group);
						// 把 token 原样写回（官方 insertText 是「替换 span」，文本必须与原样一致才算应用成功；
						// 给空串会被判失败 → 菜单关掉并复位。实测踩过），continue 让菜单继续开着重新取候选
						vkAtRestoreText = String(value.q === null || value.q === undefined ? "" : value.q);
						return { text: "@" + vkAtRestoreText, continue: true };
					}
					if (value.kind === VK_AT_MORE_TAG) {
						vkAtShowAllGroups = true;
						vkAtRestoreText = String(value.q === null || value.q === undefined ? "" : value.q);
						return { text: "@" + vkAtRestoreText, continue: true };
					}
					// 其余 kind（理论上不该出现）→ 无动作
					return void 0;
				},
				codec: {
					clipboardText: (ref) => ref,
					serialize: (ref) => Promise.resolve(ref)
				}
			};
		}
		/**
		 * 官方 @ 源（name="reference"，由 @deepseek-ai/dsh-client-ui-reference 注册）的**定向改造**：
		 *   ① 去掉它的「文件与文件夹」一节 —— 文件区只留自研那套「与文件栏逐项对齐」的镜像；
		 *   ② 它那一节里的「对话」（@ 某个会话）**保留**，只是排到菜单最下面（order 调到最大）。
		 *
		 * 为什么是「包一层 candidates + 改 order」而不是从 live.sources 里摘掉整个源：
		 *   官方这一个源同时产出两种条目（实测 27 条 = 22 条 kind:"file" 的文件夹/文件 + 5 条 kind:"session" 的会话），
		 *   而**插入引用**这条路（`slash/input-insert-reference`）与 @ chip 的渲染都挂在它身上 —— 整个摘掉会把
		 *   自研的 `{insert:{source:"reference"}}` 一起弄坏。所以只过滤条目、不碰 onPick / codec / header。
		 *   过滤判据用 **value 里的 kind==="file"**（不看 section 文案，locale 无关，也不怕官方改中文标题）。
		 * 官方源可能比自研晚注册，所以和自研注册一样用「轻量轮询」等它出现（最多 VK_AT_REGISTER_TRIES 次）。
		 */
		const VK_AT_REF_ORDER = 900;
		/** 官方源「对话」一节在空查询落地页的首屏条数上限（2026-09-11 用户要求不再一次铺开几十条）。 */
		const VK_AT_REF_SESSION_KEEP = 8;
		function vkPatchOfficialAtSource(ctx) {
			let tries = 0;
			const retry = () => {
				tries += 1;
				if (tries >= VK_AT_REGISTER_TRIES) {
					globalThis.__VK_AT_REF__ = { stage: "no-source", tries: tries };
					return;
				}
				try { setTimeout(attempt, VK_AT_REGISTER_INTERVAL); } catch { /* 无定时器环境：放弃 */ }
			};
			const attempt = () => {
				let list = null;
				try {
					const service = ctx.get("inputTriggers");
					if (service !== void 0 && service.live !== void 0 && Array.isArray(service.live.sources)) list = service.live.sources;
				} catch { list = null; }
				if (list === null) { retry(); return; }
				const src = list.find((s) => s !== null && s !== undefined && s.name === "reference" && s.trigger === "@");
				if (src === undefined) { retry(); return; }
				if (src.__vkPatched === true) return;
				try {
					src.__vkPatched = true;
					const orig = src.candidates;
					src.__vkOrigOrder = src.order;
					src.order = VK_AT_REF_ORDER;
					// 本源要复用官方 candidates 取「对话」栏条目（本插件拿不到 ctx.remote），这里先留存引用。
					vkOfficialAtSource = src;
					vkOfficialAtCandidates = orig;
					src.candidates = async function vkPatchedAtCandidates(session, req) {
						const items = await orig.call(this, session, req);
						if (!Array.isArray(items)) return items;
						// 「文件与文件夹」整节摘掉（文件区只留本源那套与文件栏对齐的镜像）；
						// 「对话」节也摘掉，摘下来的条目缓存进 vkSessionPool，由本源以**可折叠的栏目**呈现
						// （用户 2026-09-11 口径）。本源万一拿不到，这节会原样保留，功能不回退。
						const sess = [];
						const kept = items.filter((it) => {
							if (it === null || it === undefined || typeof it.value !== "string") return true;
							try {
								const kind = JSON.parse(it.value).kind;
								if (kind === "file") return false;
								if (kind === "session") { sess.push(it); return false; }
								return true;
							} catch { return true; }
						});
						if (sess.length > 0 && vkSessionPool.length === 0) vkSessionPool = sess;
						// 2026-09-11（「栏目默认可收起」的官方侧折中）：官方源的「对话」一节随会话数无限增长
						// （实测一次 50 条），而它的条目不带 section、点击走官方 onPick（我们拦不到，做不出
						// 「点标题展开」的栏目行）。这里只在**空查询落地页**收敛首屏条数，让 @ 一打开不再铺满；
						// 输入关键词检索时不受影响，全量照旧（官方自己的按关键词过滤）。
						const q = String(req !== null && req !== undefined && req.query !== null && req.query !== undefined ? req.query : "");
						if (q.length > 0 || kept.length <= VK_AT_REF_SESSION_KEEP) return kept;
						return kept.slice(0, VK_AT_REF_SESSION_KEEP);
					};
					globalThis.__VK_AT_REF__ = { stage: "patched", at: new Date().toISOString(), order: VK_AT_REF_ORDER };
				} catch (e) {
					globalThis.__VK_AT_REF__ = { stage: "throw", error: String(e && e.message ? e.message : e) };
				}
			};
			attempt();
		}
		/**
		 * 把 @ 扩域源挂到官方 inputTriggers 上。
		 *
		 * 不写进 inject 数组（那会让整条插件依赖它；万一该服务缺失，整套布局会连带不上）。
		 * 改为：立刻试一次，没就绪就轻量轮询（最多 VK_AT_REGISTER_TRIES 次、每次 VK_AT_REGISTER_INTERVAL 毫秒），
		 * 拿到服务就注册并留一条痕迹（__VK_AT_SOURCE__）供 CDP 取证。
		 * @param ctx - 插件 ctx。
		 */
		const VK_AT_REGISTER_TRIES = 40;
		const VK_AT_REGISTER_INTERVAL = 500;
		/**
		 * @ 菜单关闭时**只复位 @ 菜单自己那一族状态**（2026-09-11 口径：默认折叠、不跨次记忆）：
		 *   ① vkSectionState —— @ 落地页的栏目折叠；
		 *   ② vkAtBrowse     —— @ 菜单的选中/浏览态（单击选中的那一行、钻进的目录）。
		 *
		 * ⚠️ 2026-09-13 按用户口径**彻底解绑**（原话：让 @ 列表与文件栏分离，两边只是内容一致）：
		 * 这里**不再碰左栏文件栏的任何状态** —— 既不碰文件树展开集（早已去掉），
		 * 也不再碰 `vkHomeState`（左栏落地页栏目折叠）。此前那句 `vkHomeReset("at-menu-close")` 就是
		 * 「点一次工作区目录、250ms 后被折回」的直接原因：菜单从没打开过，这个观察器也照样判定「菜单刚关」。
		 *
		 * 官方菜单是它自己的 React 树，我们插不进去，所以用 DOM 侧观察：菜单节点消失即复位。
		 * 另外要求「本次确实见过菜单打开」（sawMenuOpen），没见过就不许判定它关闭。
		 */
		function vkInstallAtMenuReset() {
			let timer = null;
			/** 菜单真的在这次会话里出现过（只有它才能把「菜单不在」解释成「菜单刚关」）。 */
			let sawMenuOpen = false;
			/** @ 菜单自己那族还有没有需要复位的展开态（全都没开就直接跳过，避免每次 DOM 变动都进防抖）。 */
			const anyOpen = () => vkSectionState.open !== null
				|| vkAtBrowse.dir !== null
				|| vkAtBrowse.sel !== null;
			const menuPresent = () => document.querySelector("[data-trigger-menu]") !== null;
			try {
				const obs = new MutationObserver(() => {
					if (menuPresent()) { sawMenuOpen = true; return; }
					if (!sawMenuOpen) return; // 菜单没开过 → 「没有菜单节点」不构成「菜单关闭」
					if (!anyOpen()) return;
					// 防抖 250ms：continue 重取候选时官方菜单会短暂重挂载，不能把那次当成「菜单已关闭」。
					if (timer !== null) return;
					timer = setTimeout(() => {
						timer = null;
						if (menuPresent()) return;
						sawMenuOpen = false;
						vkSectionState.open = null;
						for (const fn of [...vkSectionState.subs]) { try { fn(null); } catch { /* 订阅方可能已卸载 */ } }
						vkAtBrowse.sel = null;
						vkAtBrowse.selEntry = null;
						vkAtBrowse.mousePick = null;
						vkAtBrowse.dir = null;
						vkAtBrowse.root = null;
						vkAtClearPicked();
						// 左栏文件栏（vkHomeState / vkFileTreeState）一概不动：与 @ 列表完全解绑。
					}, 250);
				});
				obs.observe(document.body, { childList: true, subtree: true });
			} catch { /* 非浏览器环境：跳过 */ }
		}
		function vkRegisterAtSource(ctx) {
			let tries = 0;
			let done = false;
			const attempt = () => {
				if (done) return;
				let service;
				try { service = ctx.get("inputTriggers"); } catch { service = void 0; }
				if (service !== void 0 && typeof service.registerSource === "function") {
					done = true;
					try {
						// 包一层 candidates：把本屏候选原样留一份，供 mousedown 拦截时
						// 按官方 option 的行号（dsh-slash-option-<source>-<index>）取回自己那条的 value。
						const def = vkAtSourceDefinition();
						const origCandidates = def.candidates;
						def.candidates = async (session, req) => {
							const items = await origCandidates.call(def, session, req);
							vkAtLastItems = Array.isArray(items) ? items : [];
							// DOM 还没渲染完，等一帧再补「选中描边 / 顶部钉住」（重取后 React 会重建整行）
							try {
								requestAnimationFrame(() => { vkAtSyncPicked(); vkAtSyncPinnedNav(); });
							} catch { /* 无 rAF 环境：靠 MutationObserver 兜底 */ }
							return items;
						};
						service.registerSource(def);
						globalThis.__VK_AT_SOURCE__ = { stage: "ok", at: new Date().toISOString(), roots: vkAtRoots() };
						// 顺手把官方 @ 源的「文件与文件夹」一节定向摘掉、会话一节排到最后（见上）
						vkPatchOfficialAtSource(ctx);
						// 菜单关掉后栏目回到全折叠，不跨次记忆（见 vkInstallAtMenuReset）
						vkInstallAtMenuReset();
						// 单击选中的描边高亮：捕获阶段记住被点的那一行（见 vkInstallAtPickHighlight）
						vkInstallAtPickHighlight();
					} catch (e) {
						globalThis.__VK_AT_SOURCE__ = { stage: "throw", error: String(e && e.message ? e.message : e) };
					}
					return;
				}
				tries += 1;
				if (tries >= VK_AT_REGISTER_TRIES) {
					globalThis.__VK_AT_SOURCE__ = { stage: "no-service", tries };
					return;
				}
				try { setTimeout(attempt, VK_AT_REGISTER_INTERVAL); } catch { /* 无定时器环境：放弃 */ }
			};
			attempt();
		}

		/**
		 * 官方条目镜像（路线 B 的核心手法）：把官方某个插槽里**胜出的那一条注册**
		 * （组件本体 + store 句柄 + inject 业务面 + locale 命名空间）整体搬到自研私有插槽上再注册一次，
		 * 由框架照常给它装配全套座位。
		 *
		 * 为什么只能这么做（三条都是源码/实测结论，别再试别的路）：
		 * ① 官方插槽的**声明是排他的**：一个键只能有一个声明者，后声明者抛 `already declared`，
		 *    而这一抛会拖垮整条 ui-sidebar（实测整页只剩 Failed to load plugins）。所以自研绝不能声明
		 *    `sidebar.workspaces` 这类官方键；
		 * ② `renderSlot` 只授予「本条目 children 里声明过的键」，因此也**借不到**官方的 renderSlot 绑定；
		 * ③ 但 register 的 `component` / `store` / `inject` / `locale` 都是可复用的普通值——换到自己声明的
		 *    私有键上注册一次，`standardKit` 会照常下发根标准座位（useSessions / useWorkspaces / usePanelInfo /
		 *    useSessionPendingInteraction）、store 实例与 `actions`、`t`（官方命名空间）以及官方 inject 面全部回调。
		 *    → 拿到的是**官方组件本体**，零 prop 拼装、零业务重写。
		 *
		 * @param ctx - 插件 ctx。
		 * @param sourceKey - 官方插槽键（被镜像的一方）。
		 * @param targetKey - 自研私有插槽键（镜像落点，必须由自研声明）。
		 * @param options - 可选：`children`（镜像注册要声明的子插槽表）、`component`（把官方组件包一层，
		 *                  例如重定向 renderSlot）、`inject`（包装官方注入面）、`pick`（从候选里挑要镜像的那条）。
		 * @returns { sync, dispose } —— `sync` 幂等；官方那条换了实现（或先注册后卸载）会自动重挂。
		 */
		function vkCreateMirror(ctx, sourceKey, targetKey, options) {
			const slots = ctx.slots;
			const config = options === undefined || options === null ? {} : options;
			let dispose = null;
			let mirrored = null;
			const winnerOf = () => {
				if (typeof config.pick === "function") return config.pick(typeof slots.entries === "function" ? slots.entries(sourceKey) : []);
				const winners = typeof slots.entriesOfSlot === "function" ? slots.entriesOfSlot(sourceKey) : [];
				if (winners.length > 0) return winners[0];
				const all = typeof slots.entries === "function" ? slots.entries(sourceKey) : [];
				return all.length > 0 ? all[0] : void 0;
			};
			const drop = () => {
				const current = dispose;
				dispose = null;
				mirrored = null;
				if (current !== null) {
					try { current(); } catch { /* 官方那条已自行卸载时清理是空操作 */ }
				}
			};
			const sync = () => {
				const source = winnerOf();
				if (source === mirrored) return;
				drop();
				if (source === void 0) return;
				mirrored = source;
				try {
					dispose = slots.register({
						name: targetKey,
						children: config.children,
						store: source.store,
						inject: typeof config.inject === "function" ? config.inject(source) : source.inject,
						locale: source.locale
					}, typeof config.component === "function" ? config.component(source) : source.component);
				} catch (error) {
					drop();
					try { ctx.logger.warn("[vscode-layout] 镜像官方条目失败 " + sourceKey + " → " + targetKey + "：" + String(error && error.message ? error.message : error)); } catch { /* ignore */ }
				}
			};
			return { sync, dispose: drop };
		}

		/**
		 * 在官方右侧栏多标签里打开一个地址。
		 * **不传 kind**：让官方 sidebarRightTabs 注册表按优先级打分挑类型——自研类型是 extension 段且只认
		 * Office / http(s)（canOpen 会拒绝别的），其余地址自然落到官方 viewer（文本高亮 / 图片 / PDF / Markdown）。
		 * 实测教训：传了 kind 就等于「强制该类型」，它的 canOpen 一拒绝就抛
		 * `tab type "anoslide.view" refuses "<address>"`——分发必须交给注册表。
		 */
		function vkOpenInViewer(ctx, address) {
			// 自报告痕迹：浏览器控制台执行 `__VK_LAST_OPEN__` 即可看到「最后一次点击文件」走了哪条路、
			// 拿到的地址与控制台服务状态。客户端 logger 不进 DevTools console，靠日志排查是白费功夫（实测）。
			try {
				globalThis.__VK_LAST_OPEN__ = { at: new Date().toISOString(), address, stage: "enter" };
			} catch { /* ignore */ }
			if (ctx === null || ctx === undefined) {
				try { globalThis.__VK_LAST_OPEN__.stage = "no-ctx"; } catch { /* ignore */ }
				return false;
			}
			const controller = ctx.get("sidebarRight");
			if (controller === void 0 || typeof controller.openResource !== "function") {
				try { globalThis.__VK_LAST_OPEN__.stage = "no-service"; } catch { /* ignore */ }
				try { ctx.logger.warn("[vscode-layout] sidebarRight 服务不可用：地址=" + address); } catch { /* ignore */ }
				return false;
			}
			try {
				controller.openResource(address);
				try { globalThis.__VK_LAST_OPEN__.stage = "ok"; } catch { /* ignore */ }
				return true;
			} catch (e) {
				// 失败必须留下可诊断的痕迹（最常见两种：没有已挂载会话面 / 没有任何类型认领该地址）。
				const message = String(e && e.message ? e.message : e);
				try { globalThis.__VK_LAST_OPEN__.stage = "throw"; globalThis.__VK_LAST_OPEN__.error = message; } catch { /* ignore */ }
				try { ctx.logger.warn("[vscode-layout] openResource 失败 address=" + address + " err=" + message); } catch { /* ignore */ }
				return false;
			}
		}

		/**
		 * 官方左栏**正文洞**（`sidebar.workspaces`）的自研占位：文件树 / 会话 双 Tab。
		 *
		 * 定位（路线 B 定稿）：官方 `ui-sidebar` 的 SidebarRoot **原样保留**（品牌行 / 新会话按钮 /
		 * 全局面板列 / 页脚钱包与归档 / 设置入口都是官方的），自研只在它声明的正文洞里以 priority:-1
		 * 胜出、接管正文区——所以这里拿到的 owner props 就是官方给的 `{wide, expandSidebar}`，
		 * 窄态（官方把侧栏收成图标轨道，wide=false）由本组件自己画紧凑入口。
		 *
		 * 会话 Tab 的正文是**官方会话浏览器本体**（由 apply 里的 browserMirror 镜像到 VK_SIDEBAR_BROWSER），
		 * 文件 Tab 里是自研 FileTree；两个 body 都用 CSS 隐藏而非卸载，切回来不丢滚动位置与内部状态。
		 */
		// ──────────────────────────────────────────────────────────────
		// 后端重启控件 + 断连提示（左栏 Tab 条右端）—— 2026-09-11
		//
		// 此前「重启按钮已搬到右栏标签栏」只留下了 restartPhaseAfter / RestartButton 的
		// 定义与 exports，apply 里从未真正渲染；而 dsh-restart-button 那颗又被
		// `.drb-btn{display:none!important}` 无条件隐藏 —— 界面上因此没有任何可用的
		// 重启入口（旧 client 半端还 <code>setBusy(true)</code> 之后没有复位路径，点一次就
		// 永久禁用）。这里把状态机真正接上，并复用样式表里早已写好、同样从未接线的
		// .vk_reconnectHint / .vk_reloadBtn 显示断连状态。
		// ──────────────────────────────────────────────────────────────
		const VK_PROBE_INTERVAL_MS = 1200;
		const VK_PROBE_DEADLINE_MS = 60000;

		/** 每个实例都会应答的最便宜活性探针：首页本身。 */
		async function vkBackendAlive() {
			try {
				const res = await fetch("/", { method: "GET", cache: "no-store", redirect: "manual" });
				return res.ok === true || res.type === "opaqueredirect" || (res.status >= 200 && res.status < 400);
			} catch {
				return false;
			}
		}

		/**
		 * 重启按钮：两击确认 → POST /dsh-restart/restart（host 重启**本实例**，不再是
		 * 硬编码的 3080）→ 1.2s 一次的首页探针等后端回来 → 复位。
		 * 恢复判据：必须先见过一次真实失败（垂死进程还会应答约 0.8s），再连续 2 次成功；
		 * 60s 兜底转到 timeout，按钮始终有出路。
		 */
		function VK_RestartControl(props) {
			// rail = 左栏收起后的图标窄轨形态（.vk_rail 里的 38×38 方块）：只画 ⟳ 图标，
			// 状态机、title、两击确认语义与 Tab 条那颗完全一致（同一个组件，只换外观）。
			const rail = props !== null && props !== undefined && props.rail === true;
			const [phase, setPhase] = react.useState("idle");
			const [note, setNote] = react.useState(null);
			const failures = react.useRef(0);
			const streak = react.useRef(0);
			const timer = react.useRef(null);
			const deadline = react.useRef(0);

			const stopPolling = react.useCallback(() => {
				if (timer.current !== null) { clearInterval(timer.current); timer.current = null; }
			}, []);
			react.useEffect(() => () => stopPolling(), [stopPolling]);
			react.useEffect(() => {
				if (phase !== "armed") return void 0;
				const t = setTimeout(() => { setPhase((cur) => (cur === "armed" ? "idle" : cur)); setNote(null); }, 4000);
				return () => clearTimeout(t);
			}, [phase]);

			const poll = react.useCallback(async () => {
				const ok = await vkBackendAlive();
				if (!ok) {
					failures.current += 1;
					streak.current = 0;
					setNote("后端已停止应答，重启中…");
					return;
				}
				if (failures.current > 0) {
					streak.current += 1;
					if (streak.current >= 2) {
						stopPolling();
						failures.current = 0;
						streak.current = 0;
						setPhase("idle");
						setNote(null);
						return;
					}
					setNote("后端正在恢复…");
					return;
				}
				setNote("已请求重启，等待后端断开…");
			}, [stopPolling]);

			const onClick = react.useCallback(async () => {
				if (phase === "busy") return;
				if (phase !== "armed") {
					setPhase("armed");
					setNote("再次点击「确认」以重启后端");
					return;
				}
				setPhase("busy");
				setNote("已请求重启，等待后端断开…");
				failures.current = 0;
				streak.current = 0;
				deadline.current = Date.now() + VK_PROBE_DEADLINE_MS;
				stopPolling();
				timer.current = setInterval(() => {
					if (Date.now() > deadline.current) {
						stopPolling();
						setPhase("timeout");
						setNote("重启未确认（60 秒）；按钮已恢复可点，页面异常时可整页重载");
						return;
					}
					poll();
				}, VK_PROBE_INTERVAL_MS);
				try {
					await fetch("/dsh-restart/restart", { method: "POST", cache: "no-store" });
				} catch {
					setNote("重启请求已发出（连接在应答前中断属正常）");
				}
				poll();
			}, [phase, poll, stopPolling]);

			const view = restartButtonView(phase, false);
			// 点击后不再自绘提示文字（2026-09-11）：后端重启/断连时官方外壳已在左栏设置行右侧
			// 给出 ConnectionIndicator（"连接中断，正在自动重试…"），自研这颗 pill 属重复噪音，
			// 还会在窄栏里挤占 Tab 条。状态改由按钮面（⟳ 重启 / 确认 / 正在重启…）与悬停 title 传达。
			if (rail) {
				// 窄轨里没有文字位：arming 态靠图标变红（.vk_railArm）+ title 提示，
				// busy 靠 :disabled 变暗。data-vk-restart 照旧带阶段，便于自检脚本核对。
				return h("button", {
					type: "button",
					className: "vk_railBtn" + (view.armed ? " vk_railArm" : ""),
					disabled: view.disabled,
					title: note === null ? view.title : view.title + " · " + note,
					"data-vk-restart": phase,
					"data-vk-restart-rail": "1",
					onClick
				}, h(VIcon, { name: "refresh", size: 16 }));
			}
			return h("button", {
				type: "button",
				className: "vk_tabBtn vk_tabBtnIcon" + (view.armed ? " vk_tabBtnArm" : ""),
				disabled: view.disabled,
				title: note === null ? view.title : view.title + " · " + note,
				"data-vk-restart": phase,
				onClick
			}, h(VIcon, { name: "refresh", size: 15 }));
		}

		/**
		 * 断连提示：官方外壳在设置行右侧放 ConnectionIndicator（"连接中断，正在自动重试，
		 * 点击立即重连"），自研布局此前完全没有等价物。这里读 ctx.connection.state，
		 * 只要不是 connected 就显示提示 + 一颗「重新加载」兜底按钮，恢复后自动消失。
		 */
		function VK_ConnectionHint() {
			const [state, setState] = react.useState("connected");
			react.useEffect(() => {
				const read = () => {
					let next = "connected";
					try {
						const ctx = ctxRef.current;
						const conn = ctx === null || ctx === undefined ? undefined : ctx.get("connection");
						const raw = conn === null || conn === undefined ? undefined : conn.state;
						if (typeof raw === "string") next = raw;
						else if (raw !== null && typeof raw === "object" && typeof raw.kind === "string") next = raw.kind;
						else if (raw !== null && typeof raw === "object" && typeof raw.value === "string") next = raw.value;
					} catch { next = "connected"; }
					setState((prev) => (prev === next ? prev : next));
				};
				read();
				const t = setInterval(read, 1500);
				return () => clearInterval(t);
			}, []);
			if (state === "connected") return null;
			return h(react.Fragment, null,
				h("span", { className: "vk_reconnectHint", title: "浏览器与后端的连接中断，正在自动重试" },
					state === "connecting" ? "重连中…" : "服务断开"),
				h("button", {
					type: "button",
					className: "vk_reloadBtn",
					title: "整页重新加载（连接异常时的兜底）",
					onClick: () => { try { window.location.reload(); } catch { /* ignore */ } }
				}, "重新加载")
			);
		}

		function VK_SidebarBody({ renderSlot, sessionId, useSessions, wide, expandSidebar }) {
			const [tab, setTab] = react.useState(() => {
				try {
					const v = window.localStorage.getItem(VK_SIDEBAR_TAB_KEY);
					// 缺省 = 会话栏（官方 WorkspaceBrowser）；只有用户显式切过文件栏/任务栏才落到那一栏。
					return v === "files" || v === "tasks" ? v : "sessions";
				} catch { return "sessions"; }
			});
			react.useEffect(() => {
				try { window.localStorage.setItem(VK_SIDEBAR_TAB_KEY, tab); } catch { /* ignore */ }
			}, [tab]);
			// 离开「文件」Tab = 文件栏回到默认折叠（用户 2026-09-12 口径「切走再切回来仍纯折叠」）。
			// 这里**当场清**（确定性的唯一清空点之一）：三条 Tab 的正文是 CSS 隐藏而非卸载，当场清
			// 既省事又不会漏；因为此刻文件栏已经不在前台，用户看不到这一下清空，切回来天然是纯折叠。
			// 栏目折叠（落地页那几栏）与文件树展开集一起清，口径一致。
			react.useEffect(() => {
				if (tab === "files") return;
				vkFileTreeClearExpanded("left-files-tab");
				vkHomeReset("left-files-tab");
			}, [tab]);
			// 收起左栏（宽 → 窄轨）也等于离开文件栏：同样当场清。
			// （FileTree 此时会卸载，但它的 cleanup 不再碰展开集 —— 清空只在这里发生。）
			react.useEffect(() => {
				if (wide === false) {
					vkFileTreeClearExpanded("sidebar-narrowed");
					vkHomeReset("sidebar-narrowed");
				}
			}, [wide]);
			// 拓展栏（官方右侧栏）：状态与开关在三处入口共用（会话头右上角 / Tab 条最右端 / 窄轨）
			const rightPane = useVKRightPane();
			// 「常驻」恢复：上次是展开的，这次加载后自动再展开一次（官方等会话面挂载，自研这里等服务就绪即可）。
			react.useEffect(() => {
				let want = false;
				try { want = window.localStorage.getItem(VK_RIGHT_PANE_KEY) === "1"; } catch { /* ignore */ }
				if (!want) return void 0;
				let tries = 0;
				const t = setInterval(() => {
					tries += 1;
					try {
						const sr = ctxRef.current.get("sidebarRight");
						if (sr !== undefined && sr !== null && typeof sr.isExpanded === "function") {
							if (sr.isExpanded() !== true && typeof sr.toggleExpanded === "function") sr.toggleExpanded();
							clearInterval(t);
							return;
						}
					} catch { /* 服务未就绪，下一轮再试 */ }
					if (tries >= 20) clearInterval(t);
				}, 500);
				return () => clearInterval(t);
			}, []);
			const sessionCwd = useSessions((s) => {
				const current = s.current;
				if (current === void 0) return void 0;
				const row = s.byId[current];
				return row !== void 0 && row.blank !== true ? row.cwd : void 0;
			});
			// ⚠️ 会话 id 的唯一真源是官方 sessions 服务。
			// 实测教训（点文件没反应的根因）：`sidebar` 是 root 作用域插槽，框架**不会**给它下发 sessionId，
			// 于是 `fileAddressFor(props.sessionId, …)` 拼出 `dsh-resource://file/session//D:/…`（会话段为空），
			// 官方 `parseFileAddress` 判为非法地址 → 没有任何 tab 类型认领 → openResource 抛
			// `no registered tab type claims …`，而错误只进了 logger.warn（客户端 logger 不进 DevTools console），
			// 表现为「点了没反应」。所以这里一律从服务读当前会话 id，props 只作兜底。
			const currentSessionId = useSessions((s) => (typeof s.current === "string" ? s.current : ""));
			const cwdRef = react.useRef(sessionCwd);
			cwdRef.current = sessionCwd;
			const readSessionId = react.useCallback(() => {
				try {
					const snapshot = ctxRef.current.get("sessions").list.getSnapshot();
					if (snapshot !== void 0 && typeof snapshot.current === "string" && snapshot.current.length > 0) return snapshot.current;
				} catch { /* 服务未就绪时退回 hook / props */ }
				if (typeof currentSessionId === "string" && currentSessionId.length > 0) return currentSessionId;
				if (typeof sessionId === "string" && sessionId.length > 0) return sessionId;
				return "";
			}, [currentSessionId, sessionId]);
			// 文件栏当前根（null = 落地页）。切会话时由下面的 effect 归零——root 属于「这个会话的视图状态」。
			const [root, setRoot] = react.useState(null);
			// 把「文件栏当前根」同步给 @ 扩域源（vkAtRoots 把它排在检索根第一位，见 vkUiRootRef）
			react.useEffect(() => { vkUiRootRef.treeRoot = root; }, [root]);
			const [autoRoot, setAutoRoot] = react.useState(null);
			// 「最近打开」/「文件列表」**按会话隔离**（2026-09-12 用户口径「每个对话不共享文件栏」）：
			// 状态初值按当前会话读，切会话时由下面那条 effect 整份换掉（另一份还在 localStorage 里）。
			const [recentDirs, setRecentDirs] = react.useState(() => readRecents(readSessionId()));
			// 「文件列表」：文件夹图标那个自适应浏览器里点中的文件（第二轮新增），跨刷新保留（同样按会话）
			const [fileList, setFileList] = react.useState(() => readFileList(readSessionId()));
			// 切会话 = 换整个文件栏：文件栏当前根回到落地页（随后由下面的轮询按该会话的「会话建议根」自动落位）。
			// 不重置的话，切过去的新会话会继续停在上一个会话打开的目录上——用户报的「每个对话不共享文件栏」。
			// 两份列表按会话重读、以及「当前会话文件」的清空，都放在下面 useState 声明之后的同一条 effect 里
			// （不能在这里写 setSessionFiles 之类：那是声明前的引用，首次挂载就会踩 TDZ 报错）。
			react.useEffect(() => {
				setRoot(null);
			}, [currentSessionId]);
			// 文件栏落地页的另外两组也镜像给 @ 源（A 项：@ 空查询落地页要按文件栏的三组显示）。
			// 同一条 useEffect 里写多个字段：这三处的变化频率相同（用户操作驱动），拆三段反而多两次渲染。
			react.useEffect(() => {
				vkUiRootRef.autoRoot = typeof autoRoot === "string" && autoRoot.length > 0 ? autoRoot : null;
				vkUiRootRef.recentDirs = Array.isArray(recentDirs) ? recentDirs : [];
				vkUiRootRef.fileList = Array.isArray(fileList) ? fileList : [];
			}, [autoRoot, recentDirs, fileList]);
			const [filesVisit, setFilesVisit] = react.useState(0);
			const [treeActive, setTreeActive] = react.useState(null);
			/** 打开失败原因（侧栏顶部一行提示）：静默失败是上一轮最大的教训，必须让人看见。 */
			const [openError, setOpenError] = react.useState(null);
			const lastRootRef = react.useRef(null);
			// 会话建议根：跟随 switch_workspace_root 写入的 <会话ID>.txt（2s 轮询，按会话隔离）
			// ⚠️ sessionId 一律现取 readSessionId()：root 作用域插槽下发的 props.sessionId 恒为空，
			// 用它去轮询 /vscode-files/root 会问到一个不存在的会话 → 「最近打开」里那条会话根永远空着。
			react.useEffect(() => {
				const sidRoot = readSessionId();
				if (sidRoot.length === 0) return;
				let dead = false;
				const check = async () => {
					try {
						const r = await fetch("/vscode-files/root?session=" + encodeURIComponent(sidRoot));
						const d = await r.json();
						if (dead || !(d && d.ok) || typeof d.root !== "string") return;
						const suggested = d.root.length > 0 ? d.root : null;
						setAutoRoot(suggested);
						if (suggested !== lastRootRef.current) {
							lastRootRef.current = suggested;
							if (suggested !== null && suggested !== cwdRef.current) setRoot((prev) => (prev === suggested ? prev : suggested));
						}
					} catch { /* 网络抖动忽略 */ }
				};
				check();
				const t = setInterval(check, 2000);
				return () => { dead = true; clearInterval(t); };
			}, [readSessionId]);
			// 「当前会话文件」：host 侧按会话采集（本会话贴入的路径 + Agent 写/改过的文件 + 会话根下近期改动），
			// 3 秒轮询一次；文件栏的「当前会话文件」栏目与 @ 落地页同位置的那一节都读这一份。
			// 只在签名变化时 setState，避免每 3 秒无谓重渲染整棵文件树。
			const [sessionFiles, setSessionFiles] = react.useState([]);
			const [sessionDirs, setSessionDirs] = react.useState([]);
			const sessionSigRef = react.useRef("");
			react.useEffect(() => {
				// ⚠️ root 作用域插槽拿不到 props.sessionId（见 §5.2.1），必须走 readSessionId()：
				// 一开始这里用了 props.sessionId，实测恒为空 → 轮询直接 return，栏目与「最近打开」都空着。
				const sidLive = readSessionId();
				if (typeof sidLive !== "string" || sidLive.length === 0) return void 0;
				let dead = false;
				const check = async () => {
					try {
						const r = await fetch("/vscode-files/session-files?session=" + encodeURIComponent(sidLive));
						const d = await r.json();
						if (dead || !(d && d.ok === true)) return;
						const files = Array.isArray(d.files) ? d.files : [];
						const dirs = Array.isArray(d.dirs) ? d.dirs : [];
						const sig = files.map((f) => f.path + "@" + f.mtimeMs).join("|") + "#" + dirs.map((x) => x.path).join("|");
						if (sig === sessionSigRef.current) return;
						sessionSigRef.current = sig;
						setSessionFiles(files);
						setSessionDirs(dirs);
					} catch { /* 网络抖动忽略 */ }
				};
				check();
				const t = setInterval(check, 3000);
				return () => { dead = true; clearInterval(t); };
			}, [readSessionId]);
			react.useEffect(() => {
				vkUiRootRef.sessionFiles = Array.isArray(sessionFiles) ? sessionFiles : [];
				vkUiRootRef.sessionDirs = Array.isArray(sessionDirs) ? sessionDirs : [];
			}, [sessionFiles, sessionDirs]);
			// 切会话 = 换整个文件栏（2026-09-12 用户口径「每个对话不共享文件栏」）：
			//   ① 最近打开 / 文件列表各自按会话键重读（另一份仍在 localStorage 里，切回去还在）；
			//   ② 「当前会话文件」先清空，交给上面那条 3 秒轮询按新会话重新采集（否则残留上一个会话的条目）。
			// 放在这三个 state 的声明之后就位是因为它要写 setSessionFiles/setSessionDirs——
			// 声明前引用会在首次挂载时踩 TDZ（Cannot access before initialization），整棵文件栏直接挂掉。
			react.useEffect(() => {
				setRecentDirs(readRecents(currentSessionId));
				setFileList(readFileList(currentSessionId));
				sessionSigRef.current = "";
				setSessionFiles([]);
				setSessionDirs([]);
			}, [currentSessionId]);
			// 最近打开：进入真实目录即置顶（上限 8）
			react.useEffect(() => {
				if (typeof root !== "string" || root.length === 0 || root.startsWith("::")) return;
				if (isHomeDirPath(root)) return;
				if (root === autoRoot) return;
				setRecentDirs((prev) => {
					if (prev[0] === root) return prev;
					const next = [root, ...prev.filter((x) => x !== root)].slice(0, RECENTS_MAX);
					writeRecents(next, readSessionId());
					return next;
				});
			}, [root, autoRoot]);
			// 在文件栏里主动换根/关根 = 回到默认折叠：不必额外打标记，[root] effect 按 root 变化清。
			// （同一个目录被再点一次时 root 没变，所以 enter 回调那边还有「目标即当前根就什么都不做」的守卫。）
			const openFolder = react.useCallback((p) => { setRoot(p); setTab("files"); }, []);
			const closeFolder = react.useCallback(() => { setRoot(null); }, []);
			const removeRecentDir = react.useCallback((path) => {
				// ① 本会话自己打开过的目录（localStorage 那份）直接筛掉；② 贴进对话的**文件/文件夹**
				// （host 侧的 session 记录，3 秒轮询会带回来）先从本地列表抹掉，再去 host 删记录。
				const key = normPath(path);
				setRecentDirs((prev) => {
					const next = prev.filter((p) => p !== path);
					writeRecents(next, readSessionId());
					return next;
				});
				setSessionDirs((prev) => (Array.isArray(prev) ? prev.filter((x) => x === null || typeof x !== "object" || normPath(x.path) !== key) : prev));
				setSessionFiles((prev) => (Array.isArray(prev) ? prev.filter((x) => x === null || typeof x !== "object" || normPath(x.path) !== key) : prev));
				const sidSession = readSessionId();
				if (sidSession.length > 0) {
					fetch("/vscode-files/session-touch/remove", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ session: sidSession, path })
					}).catch(() => {});
				}
			}, []);
			const removeAutoRoot = react.useCallback((path) => {
				const sidForget = readSessionId();
				if (sidForget.length > 0) {
					fetch("/vscode-files/root/forget", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ session: sidForget })
					}).catch(() => {});
				}
				setAutoRoot((prev) => (prev === path ? null : prev));
				lastRootRef.current = null;
				setRecentDirs((prev) => {
					if (!prev.includes(path)) return prev;
					const next = prev.filter((x) => x !== path);
					writeRecents(next, readSessionId());
					return next;
				});
				setRoot((prev) => (prev === path ? null : prev));
			}, []);
			const onDeleted = react.useCallback(() => { setFilesVisit((v) => v + 1); }, []);
			// 真删除之后把这条从文件栏的三份列表里一并抹掉（最近打开 / 当前会话文件 / 文件列表）：
			// hosts 侧的「贴入」记录不用动——路径已不存在，/vscode-files/session-files 的 statSync 会自己把它滤掉。
			const forgetPathEverywhere = react.useCallback((p) => {
				const key = normPath(p);
				setRecentDirs((prev) => {
					if (!Array.isArray(prev)) return prev;
					const next = prev.filter((x) => normPath(x) !== key);
					if (next.length === prev.length) return prev;
					writeRecents(next, readSessionId());
					return next;
				});
				setSessionFiles((prev) => (Array.isArray(prev) ? prev.filter((x) => x === null || typeof x !== "object" || normPath(x.path) !== key) : prev));
				setSessionDirs((prev) => (Array.isArray(prev) ? prev.filter((x) => x === null || typeof x !== "object" || normPath(x.path) !== key) : prev));
				setFileList((prev) => {
					if (!Array.isArray(prev)) return prev;
					const next = prev.filter((x) => x === null || typeof x !== "object" || normPath(x.path) !== key);
					if (next.length === prev.length) return prev;
					writeFileList(next, readSessionId());
					return next;
				});
			}, []);
			// 列表条目上的「真删除」（送回收站）：文件栏所有树行共用；删完重建文件树（filesVisit 换 key）。
			const deleteTreeRow = react.useCallback((p, n) => {
				const name = typeof n === "string" && n.length > 0 ? n : pathBase(p);
				if (typeof confirm === "function" && !confirm("删除「" + name + "」？\n（会送入回收站，可从回收站恢复）")) return;
				fetch("/vscode-files/delete?path=" + encodeURIComponent(p), {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ path: p })
				})
					.then((r) => r.json())
					.then((d) => {
						if (d && d.ok) { forgetPathEverywhere(p); onDeleted(); }
						else setOpenError((d && d.error) || ("删除失败：" + name));
					})
					.catch((e) => setOpenError(String(e)));
			}, [onDeleted, forgetPathEverywhere]);
			// 文件列表：点中的文件置顶（上限 12；同一路径去重，保留最新一次的文件名）
			const rememberFile = react.useCallback((f) => {
				if (f === null || typeof f !== "object" || typeof f.path !== "string" || f.path.length === 0) return;
				const name = typeof f.name === "string" && f.name.length > 0 ? f.name : pathBase(f.path);
				setFileList((prev) => {
					const k = normPath(f.path);
					const next = [{ path: f.path, name }, ...(Array.isArray(prev) ? prev : []).filter((x) => normPath(x.path) !== k)].slice(0, FILE_LIST_MAX);
					writeFileList(next, readSessionId());
					return next;
				});
			}, []);
			const removeFileItem = react.useCallback((p) => {
				setFileList((prev) => {
					const next = (Array.isArray(prev) ? prev : []).filter((x) => x.path !== p);
					writeFileList(next, readSessionId());
					return next;
				});
			}, []);
			// 点文件 → 官方右侧栏多标签（Office / 网页走自研类型，其余交官方 viewer）。
			// 失败必须**看得见**：上一轮全部症状都是「静默」，所以这里把失败原因同时写进
			// __VK_LAST_OPEN__（给 CDP 取证）和侧栏顶部的一行提示（给人看）。
			const onOpenInViewer = react.useCallback((file) => {
				const path = file && typeof file.path === "string" ? file.path : null;
				const liveSessionId = readSessionId();
				try {
					globalThis.__VK_LAST_OPEN__ = {
						at: new Date().toISOString(), stage: "click",
						path, hasCtx: ctxRef.current !== null && ctxRef.current !== undefined,
						sessionId: liveSessionId,
						cwd: cwdRef.current !== undefined ? String(cwdRef.current) : null
					};
				} catch { /* ignore */ }
				if (path === null) return;
				if (liveSessionId === "") {
					// 没有会话面时官方 openResource 必然抛 `no session surface is mounted`——先讲清楚。
					setTreeActive(null);
					setOpenError("请先在中间栏打开或新建一个会话，再点文件");
					try { globalThis.__VK_LAST_OPEN__.stage = "no-session"; } catch { /* ignore */ }
					return;
				}
				const address = fileAddressFor(liveSessionId, cwdRef.current, path);
				if (vkOpenInViewer(ctxRef.current, address)) {
					setTreeActive(path);
					setOpenError(null);
					return;
				}
				const reason = globalThis.__VK_LAST_OPEN__ !== void 0 && typeof globalThis.__VK_LAST_OPEN__.error === "string"
					? globalThis.__VK_LAST_OPEN__.error
					: "";
				setTreeActive(null);
				setOpenError("无法在右栏打开该文件" + (reason.length > 0 ? "：" + reason : ""));
				try { ctxRef.current.logger.warn("[vscode-layout] 打开失败 " + address + " err=" + reason); } catch { /* ignore */ }
			}, [readSessionId]);
			const tree = h(FileTree, {
				key: "vk-files-" + filesVisit,
				root,
				custom: root !== null,
				onOpenFolder: openFolder,
				onCloseFolder: closeFolder,
				onOpenInViewer,
				onPickNative: pickFolderRef.current,
				activePath: treeActive,
				recentDirs,
				autoRoot,
				onRemoveRecent: removeRecentDir,
				onRemoveAuto: removeAutoRoot,
				fileList,
				onRememberFile: rememberFile,
				onRemoveFile: removeFileItem,
				onDeleteTreeRow: deleteTreeRow,
				sessionFiles,
				sessionDirs,
				onDeleted
			});
			// 收起 / 展开统一走官方布局：官方才是收起的决策方（窄视口 / 官方按钮），自研只转发。
			const toggleOfficialSidebar = react.useCallback(() => {
				const layout = ctxRef.current.get("layout");
				if (layout !== undefined && typeof layout.toggleSidebar === "function") {
					try { layout.toggleSidebar(); return; } catch { /* 官方布局缺失时无处可收 */ }
				}
			}, []);
			// 官方会话浏览器在窄态点搜索时会调它（owner props.expandSidebar）——原样转发官方那个。
			const expandSidebarIfNeeded = react.useCallback(() => {
				if (wide === false && typeof expandSidebar === "function") {
					try { expandSidebar(); } catch { /* ignore */ }
				}
			}, [wide, expandSidebar]);
			// 窄态（官方把侧栏收成图标轨道，wide=false）：只给三个入口，展开交给官方轨道上那颗按钮。
			if (wide === false) {
				return h("div", { className: "vk_rail", style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "6px 0" } },
					// 顺序与展开态的 Tab 条**逐项对齐**：会话 → 文件 → 任务 → 重启 → 拓展栏。
					// 2026-09-12 用户指出：窄轨图标顺序（原先「文件」在最前）与展开左栏的文字顺序不一致。
					h("button", { className: "vk_railBtn", title: "会话", onClick: () => { setTab("sessions"); expandSidebarIfNeeded(); } }, h(VIcon, { name: "menu", size: 16 })),
					h("button", { className: "vk_railBtn", title: "文件", onClick: () => { setTab("files"); expandSidebarIfNeeded(); } }, h(VIcon, { name: "folder", size: 16 })),
					h("button", { className: "vk_railBtn", title: "任务", onClick: () => { setTab("tasks"); expandSidebarIfNeeded(); } }, h(VIcon, { name: "tasks", size: 16 })),
					h("button", { className: "vk_railBtn", title: "功能", onClick: () => { setTab("extensions"); expandSidebarIfNeeded(); } }, h(VIcon, { name: "gear", size: 16 })),
					// 重启入口（2026-09-12）：官方会话头那颗在窄轨里也被 CSS 隐藏，这颗是收起左栏后
					// 唯一的重启入口（同一状态机、两击确认）；位置照展开态，放在任务之后、拓展栏之前。
					h(VK_RestartControl, { key: "vk-restart-rail", rail: true }),
					// 窄轨里也要有拓展栏入口（同样常驻，title 随展开状态变）
					h("button", { className: "vk_railBtn", title: rightPane.open ? "收起拓展栏" : "打开拓展栏", "data-vk-right-toggle": "rail", onClick: rightPane.toggle }, h(VIcon, { name: "panelRight", size: 16 }))
				);
			}
			// 会话 Tab 的正文 = **官方会话浏览器本体**（WorkspaceBrowser），不是自绘列表。
			// 官方那条注册被 apply 里的 browserMirror 镜像到私有子插槽 VK_SIDEBAR_BROWSER 上，
			// 由框架给它装配全套座位；这里只把它渲染出来 + 透传 owner props（官方同款语义）。
			const officialBrowser = typeof renderSlot === "function"
				? renderSlot(VK_SIDEBAR_BROWSER, { wide: true, expandSidebar: expandSidebarIfNeeded })
				: null;
			const sessionsBody = h("div", { style: { display: "flex", flexDirection: "column", minHeight: 0, height: "100%", overflow: "auto" } },
				officialBrowser === null
					? h("div", { className: "vk_empty", style: { padding: "12px" } }, "官方会话栏尚未就绪")
					: officialBrowser
			);
			return h("div", { className: "vk_sidebarBody", style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } },
				h("div", { className: "vk_tabBar" },
					// 每颗 tab 都同时带「图标 + 文字」两套：宽态只显示文字（外观与之前完全一致），
					// 窄态（container query ≤264px）只显示图标 —— 见样式表里的 .vk_tabGlyph/.vk_tabText。
					h("button", { className: "vk_tabBtn" + (tab === "sessions" ? " vk_tabBtnActive" : ""), title: "会话", onClick: () => setTab("sessions") },
						h("span", { className: "vk_tabGlyph" }, h(VIcon, { name: "menu", size: 14 })),
						h("span", { className: "vk_tabText" }, "会话")),
					h("button", { className: "vk_tabBtn" + (tab === "files" ? " vk_tabBtnActive" : ""), title: "文件", onClick: () => setTab("files") },
						h("span", { className: "vk_tabGlyph" }, h(VIcon, { name: "folder", size: 14 })),
						h("span", { className: "vk_tabText" }, "文件")),
					h("button", { className: "vk_tabBtn" + (tab === "tasks" ? " vk_tabBtnActive" : ""), title: "任务", onClick: () => setTab("tasks") },
						h("span", { className: "vk_tabGlyph" }, h(VIcon, { name: "tasks", size: 14 })),
						h("span", { className: "vk_tabText" }, "任务")),
					h("button", { className: "vk_tabBtn" + (tab === "extensions" ? " vk_tabBtnActive" : ""), title: "功能", onClick: () => setTab("extensions") },
						h("span", { className: "vk_tabGlyph" }, h(VIcon, { name: "gear", size: 14 })),
						h("span", { className: "vk_tabText" }, "功能")),
					h("div", { className: "vk_tabBarSpacer" }),
					h(VK_RestartControl, { key: "vk-restart" }),
					h(VK_ConnectionHint, { key: "vk-conn" }),
					// 拓展栏开关（常驻入口：会话头那颗只在会话打开后才挂载，这里这条任何时候都在）
					h("button", { className: "vk_tabBtn vk_tabBtnIcon", title: rightPane.open ? "收起拓展栏（官方右侧栏）" : "打开拓展栏（官方右侧栏）", "data-vk-right-toggle": "tabbar", onClick: rightPane.toggle }, h(VIcon, { name: "panelRight", size: 15 })),
					// 官方品牌行那颗「收起侧边栏」按钮被 CSS 隐藏（见样式表里的 :has 规则），这里补回同功能的一颗。
					h("button", { className: "vk_tabBtn vk_tabBtnIcon", title: "收起侧栏", onClick: toggleOfficialSidebar }, h(VIcon, { name: "chevronLeft", size: 15 }))
				),
				openError !== null ? h("div", { className: "vk_openErr", title: openError }, openError) : null,
				// 会话栏 / 文件栏 / 任务栏都用 display:none 保留状态（不卸载），切回来不丢滚动位置与内部状态；
				// 顺序与 Tab 条一致：会话 → 文件 → 任务。
				h("div", { className: "vk_tabBody", style: { display: tab === "sessions" ? "flex" : "none", flex: 1, minHeight: 0, overflow: "hidden" } }, sessionsBody),
				h("div", { className: "vk_tabBody", style: { display: tab === "files" ? "flex" : "none", flex: 1, minHeight: 0, overflow: "auto" } }, tree),
				h("div", { className: "vk_tabBody", style: { display: tab === "tasks" ? "flex" : "none", flex: 1, minHeight: 0, overflow: "auto" } }, h(VK_TasksTabPane, { renderSlot: renderSlot, active: tab === "tasks" })),
				h("div", { className: "vk_tabBody", style: { display: tab === "extensions" ? "flex" : "none", flex: 1, minHeight: 0, overflow: "auto" } }, h(VK_ExtensionsTabPane, { renderSlot: renderSlot, active: tab === "extensions" }))
			);
		}

		// ──────────────────────────────────────────────────────────────
		// 对话里 read/write 卡片的路径 → 拓展栏（第七轮新增，用户诉求）
		// ──────────────────────────────────────────────────────────────
		/**
		 * 官方 read/write 工具卡片把路径渲染成一颗 `<button class="<hash>_fileLink">`（源码取证：
		 * `dsh-client-ui-tool/lib/client.js` 的 ToolRow → `fileLink`，点击调官方下发的 `openFile(filePath)`，
		 * 也就是**中间栏**那一套）。用户要求「点一下在拓展栏打开」，而中间栏一行都不能改，
		 * 所以这里走 **(b) 捕获阶段事件委托**：命中官方那颗路径按钮才拦，其余点击（卡片展开、inspect、bash prompt…）全放行。
		 *
		 * 三条边界（照 §5.2.2 与 §8.4 的既有裁决）：
		 *   ① **不碰官方 DOM、不抢官方插槽**：只用 CSS 给官方那颗按钮补一颗 hover 才出现的小箭头（`.vk_chatFileHint`）
		 *      做可见提示，拦截只发生在点击那一刻；`stopPropagation` 掉的正是官方那次 `openFile`（中间栏不动）。
		 *   ② **命中才拦**：必须是类名以 `_fileLink` 结尾的官方路径按钮，且**它的文本本身就是一条绝对路径**
		 *      （`D:\…` / `\\server\…` / `/…`；官方卡片里只有路径按钮会长这样）。
		 *      任何一条不满足 → 直接放行，绝不 preventDefault（宁可少拦，不可误伤）。
		 *   ③ **一行可回退**：常量 `VK_CHAT_FILE_LINK` 置 false 即整套失效（监听器照旧挂着，什么都不做）。
		 *
		 * 会话 id / 工作区根都在**点击那一刻**现取（`sessions.list.getSnapshot()`），不用 props（root 作用域插槽
		 * 不下发 sessionId，见 §8.4 第 48 条的同源坑）。
		 */
		const VK_CHAT_FILE_LINK = true;
		const VK_FILE_LINK_CLASS_RE = /_fileLink$/;
		const VK_CHAT_HINT_CLASS = "vk_chatFileHint";
		/**
		 * 取路径按钮里的**路径文本**：只收直接文本节点与白名单 span，跳过自研那颗提示箭头
		 * （`.vk_chatFileHint`）。⚠️ 实测坑：直接 `btn.textContent` 会把箭头一起算进去，
		 * 地址变成 `…session-file-test.txt%E2%86%97`（`↗` 被 percent-encode 进文件名）——
		 * 右栏照样显示，但标题多一个 `↗`、且路径是错的。
		 */
		function vkChatLinkText(btn) {
			let out = "";
			for (const node of btn.childNodes) {
				if (node.nodeType === 3) { out += node.nodeValue; continue; }
				if (node.nodeType !== 1) continue;
				const cls = String(node.className || "");
				if (cls.indexOf(VK_CHAT_HINT_CLASS) >= 0) continue;
				out += node.textContent;
			}
			return out;
		}
		/** 算一条「看起来就是路径」的按钮文本；不满足返回 null（调用方一律放行）。 */
		function vkChatFilePathOf(text) {
			const s = String(text === null || text === undefined ? "" : text).trim();
			if (s.length < 4 || s.length > 512) return null;
			if (s.indexOf("\n") >= 0) return null;
			if (/^[A-Za-z]:[\\/][^\\/:*?"<>|]+/.test(s)) return s;          // Windows 绝对路径：D:\… / D:/…
			if (s.startsWith("\\\\") && s.length > 5) return s;             // UNC
			if (s.startsWith("/") && /^\/[^\0]+$/.test(s)) return s;        // POSIX 绝对路径
			return null;
		}
		/** 点击那一刻的当前会话（id + 工作区根）。 */
		function vkLiveSession(ctx) {
			try {
				const snap = ctx.get("sessions").list.getSnapshot();
				const id = snap === null || snap === undefined ? null : snap.current;
				const entry = id !== null && snap.byId !== undefined ? snap.byId[id] : null;
				const cwd = entry !== null && entry !== undefined && typeof entry.cwd === "string" ? entry.cwd : "";
				return { id: id === null || id === undefined ? "" : String(id), cwd };
			} catch {
				return { id: "", cwd: "" };
			}
		}
		/**
		 * 在对话里点官方 read/write 卡片的路径 → 拓展栏打开；其余一律返回 false（放行官方行为）。
		 * @param ctx - 插件 ctx。
		 * @param event - 捕获阶段拿到的点击事件。
		 */
		function vkHandleChatFileClick(ctx, event) {
			if (VK_CHAT_FILE_LINK !== true) return false;
			if (event === null || event === undefined || event.defaultPrevented === true) return false;
			// 只认主键单击：带修饰键（ctrl 新标签 / shift / alt）与右键一律放行，留给官方与浏览器各家语义。
			if (event.button !== void 0 && event.button !== 0) return false;
			if (event.metaKey === true || event.ctrlKey === true || event.shiftKey === true || event.altKey === true) return false;
			const target = event.target;
			if (target === null || target === undefined || typeof target.closest !== "function") return false;
			const btn = target.closest("button");
			if (btn === null || btn === undefined) return false;
			if (!VK_FILE_LINK_CLASS_RE.test(String(btn.className || ""))) return false;
			const path = vkChatFilePathOf(vkChatLinkText(btn));
			if (path === null) return false;
			const live = vkLiveSession(ctx);
			if (live.id.length === 0) return false;                          // 没有当前会话 → 右栏开不了，放行走官方
			const address = fileAddressFor(live.id, live.cwd, path);
			// 自报告痕迹：CDP 一行 `__VK_LAST_OPEN__` 就能看出「拦到没有 / 打开成功没有 / 地址对不对」。
			try { globalThis.__VK_LAST_OPEN__ = { at: new Date().toISOString(), stage: "chat", path, address, sessionId: live.id, cwd: live.cwd }; } catch { /* ignore */ }
			if (vkOpenInViewer(ctx, address) !== true) return false;          // 右栏没开成 → 放行，让官方中间栏照旧工作
			// 只有真打开了才吃掉这次点击（吃掉的是官方那次 openFile → 中间栏保持原样）。
			event.preventDefault();
			event.stopPropagation();
			if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
			return true;
		}
		/**
		 * 给命中白名单的路径按钮挂「点了在拓展栏打开」的可见提示（一颗 hover 才出现的小箭头）。
		 * 只改自研自己加的那个 `<span>`，官方 DOM 结构与文本一字不动。用 MutationObserver 追新卡片。
		 */
		function vkDecorateChatFileLinks(root) {
			let links = [];
			const scope = root !== null && root !== undefined && typeof root.querySelectorAll === "function" ? root : document;
			try { links = scope.querySelectorAll("button[class$='_fileLink']"); } catch { links = []; }
			for (const btn of links) {
				if (btn.getAttribute("data-vk-chat-file") === "1") continue;
				if (vkChatFilePathOf(vkChatLinkText(btn)) === null) continue;
				try {
					btn.setAttribute("data-vk-chat-file", "1");
					btn.setAttribute("title", "在拓展栏打开");
					btn.appendChild(document.createElement("span")).className = VK_CHAT_HINT_CLASS;
					btn.lastChild.textContent = "↗";
				} catch { /* 单个装饰失败不影响其它 */ }
			}
		}
		/** 装上捕获阶段监听 + 新卡片观察者；返回 dispose。 */
		function vkInstallChatFileHooks(ctx) {
			const onClick = (event) => { try { vkHandleChatFileClick(ctx, event); } catch { /* 拦截出错一律放行 */ } };
			// capture=true：必须在 React 的冒泡 onClick 之前拿到这次点击（否则官方 openFile 已经调过了）。
			document.addEventListener("click", onClick, true);
			let obs = null;
			try {
				obs = new MutationObserver((records) => {
					for (const r of records) {
						for (const n of r.addedNodes) {
							if (n !== null && n !== undefined && n.nodeType === 1) vkDecorateChatFileLinks(n);
						}
					}
				});
				obs.observe(document.body, { childList: true, subtree: true });
			} catch { /* 无 MutationObserver 也不影响拦截本身 */ }
			vkDecorateChatFileLinks(document);
			return () => {
				try { document.removeEventListener("click", onClick, true); } catch { /* ignore */ }
				try { if (obs !== null) obs.disconnect(); } catch { /* ignore */ }
			};
		}

		// ──────────────────────────────────────────────────────────────
		// 插件主体
		// ──────────────────────────────────────────────────────────────
		// sessions / workspaces / layout 都是官方 boot 条目提供的客户端服务：
		// 会话 Tab 的会话列表与切换、文件树的目录选择、侧栏折叠都要用它们，写进 inject 让 cordis 保证就绪。
		const inject = ["slots", "theme", "connection", "sessions", "workspaces", "layout"];
		function apply(ctx) {
			ctxRef.current = ctx;
			// 排障把手：在浏览器控制台执行
			//   __VK_CTX__.get('sidebarRight') / __VK_CTX__.get('sidebarRightTabs') / __VK_CTX__.slots.entries('sidebar')
			// 即可确认官方服务与插槽是否可用，不必再靠「点了没反应」猜。
			try { globalThis.__VK_CTX__ = ctx; } catch { /* ignore */ }
			// 排障把手（第四批新增）：文件栏与 @ 菜单共用的展开状态。CDP 里一行就能看出
			// 「@ 里点开的那一级，文件栏有没有跟着展开」——两边共用这一份 Set。
			try { globalThis.__VK_FILETREE__ = vkFileTreeState; } catch { /* ignore */ }
			const pickFolder = async () => {
				const ws = ctx.get("workspaces");
				if (ws === void 0 || typeof ws.pickDirectory !== "function") throw new Error("native directory picker unavailable");
				return ws.pickDirectory();
			};
			pickFolderRef.current = pickFolder;
			// ── 左栏：官方 SidebarRoot 原样保留，自研只接管它的**正文洞**（sidebar.workspaces）──────
			// 官方左栏整条（品牌行 / 新会话按钮 / 全局面板列 / 钱包 / 归档 / 设置入口）都是官方组件本体，
			// 一行都不用自绘；自研在它声明的正文洞上以 priority:-1 胜出（SlotCore 的 single 语义只禁止
			// 「同优先级重复占用」，不同优先级按升序取最低者胜出），于是正文区换成自研的 文件 / 会话 双 Tab。
			//
			// ⚠️ 两条实测铁律（2026-09-11，都是真环境 CDP 抓到的）：
			// ① renderSlot 只授予「本条目 children 表里声明过的键」。不声明就拿不到 renderSlot，
			//    组件首帧抛错 → 框架把该条目取缔（abdicate）→ 官方条目静默接管。
			// ② **绝不能**在 children 里声明官方插槽键：声明是排他的，官方 ui-sidebar 也要声明
			//    sidebar.workspaces，谁后声明谁抛「slot "sidebar.workspaces" is already declared」，
			//    而这一抛会拖垮整个 ui-sidebar 条目（实测整页只剩 Failed to load plugins）。
			//    → 若需要官方某条注册的渲染能力，用 vkCreateMirror 把它镜像到自研私有键上（见下）。
			ctx.effect(() => ctx.slots.inject("sidebar.workspaces", () => ctx.slots.register({
				name: "sidebar.workspaces",
				priority: -1,
				children: {
					[VK_SIDEBAR_BROWSER]: { kind: "single", scope: "root" },
					// 「任务」Tab（长期任务插件 dsh-lt-tasks）住的插槽。这个键**没有官方声明者**，
					// 只有 lt-tasks 往里注册（见 VK_TasksTabPane 的注释）；不声明它那条 inject 就不会回调。
					"sidebar.tasks": { kind: "single", scope: "root" },
					// 「功能」Tab（dsh-extensions-panel）住的插槽：移动端访问 / 局域网服务 / 虚拟显示器开关。
					// 与 sidebar.tasks 同一套机制：自研声明、外部插件注册、VK_ExtensionsTabPane 里 renderSlot。
					"sidebar.extensions": { kind: "list", scope: "root" }
				}
			}, VK_SidebarBody)), "vscode-layout: sidebar body (files / sessions tabs)");
			// ── 左栏「会话」Tab：官方会话浏览器（WorkspaceBrowser）**组件本体**，不自绘 ──────────
			// 把官方注册在 sidebar.workspaces 上的那一条整体镜像到自研私有键 VK_SIDEBAR_BROWSER 上，
			// 框架会照常装配全套座位（见 vkCreateMirror 的注释），我们既不声明官方插槽、也不重写业务。
			const browserMirror = vkCreateMirror(ctx, "sidebar.workspaces", VK_SIDEBAR_BROWSER, {
				// 例外：官方那条自己就是被遮蔽的（自研在同一个键上胜出），所以镜像要显式取「非自研的那条」。
				pick: (list) => list.filter((entry) => typeof entry.component === "function" && entry.component.name !== "VK_SidebarBody")[0],
				// 镜像注册要声明它自己的子插槽（授权 renderSlot 用）：官方目录选择洞的自研对应物。
				children: {
					[VK_SIDEBAR_DIRFLOW]: { kind: "single", scope: "root" }
				},
				// 唯一要补的座位是 renderSlot：官方组件会调
				// renderSlot("sidebar.workspaces.directoryFlow", owner) 渲染「添加工作区」弹层里的
				// 目录选择洞，而那个键的声明权在官方手里 → 适配器把这一次调用重定向到自研私有洞
				// （下面 flowMirror 已把注册在官方洞里的组件镜像过来），其余 props 一字不改。
				component: (source) => {
					const Browser = source.component;
					return function VK_OfficialWorkspaceBrowser(props) {
						const slotOf = props.renderSlot;
						return h(Browser, {
							...props,
							renderSlot: (key, owner) => (key === "sidebar.workspaces.directoryFlow" && typeof slotOf === "function"
								? slotOf(VK_SIDEBAR_DIRFLOW, owner)
								: null)
						});
					};
				}
			});
			// 官方条目可能比我们晚注册（dsh.client.inject 只是加载顺序提示，不保证 apply 次序），
			// 所以：等「声明出现」用 inject，等「注册出现 / 换了实现」用 subscribe，两步都要。
			ctx.slots.inject(VK_SIDEBAR_BROWSER, () => ctx.slots.inject("sidebar.workspaces", () => {
				const off = ctx.slots.subscribe("sidebar.workspaces", browserMirror.sync);
				browserMirror.sync();
				return () => { off(); browserMirror.dispose(); };
			}));
			// 「添加工作区」的目录选择洞（ui-directory-picker-native 的 NativeDirectoryFlow）同样镜像一份。
			const flowMirror = vkCreateMirror(ctx, "sidebar.workspaces.directoryFlow", VK_SIDEBAR_DIRFLOW);
			ctx.slots.inject(VK_SIDEBAR_DIRFLOW, () => {
				const off = ctx.slots.subscribe("sidebar.workspaces.directoryFlow", flowMirror.sync);
				flowMirror.sync();
				return () => { off(); flowMirror.dispose(); };
			});
			// ── 右栏：官方右侧栏多标签的查看器 tab 类型（两步注册：类型 + keyed 正文）──
			// 只接管官方 viewer 覆盖不到的地址（Office 文档、http(s) 网页），其余地址仍由官方类型认领。
			ctx.effect(() => {
				// 2026-09-11 修复（用户报「拓展栏的打开本机文件有时退化为官方」，实测 3080/3081 都退化）：
				// 官方 sidebar-right 插件若比本插件晚落地，apply 这一刻 `sidebarRightTabs` 还没 provide，
				// 旧代码只试一次就 return —— 右栏自研类型（含「打开本机文件」）从未登记，guide 永远是官方那条。
				// 改成与 @ 源同一套轻量轮询（最多 VK_AT_REGISTER_TRIES 次 × VK_AT_REGISTER_INTERVAL ms）。
				let vkRegDone = false;
				let vkRegTries = 0;
				let vkRegDispose = null;
				const vkRegisterRightPaneTypes = () => {
				const registry = ctx.get("sidebarRightTabs");
				let disposeType = null;
				try {
					disposeType = registry.register(vkViewTabDefinition());
				} catch (e) {
					// id 被占用 = 本插件上一个实例还没清理干净。绝不能让它中断这个 effect：
					// 后面的 pick 自愈、@ 源注册全靠它跑完（2026-09-11）。
					try { ctx.logger.warn(`[vscode-layout] viewer tab 注册被拒（沿用已有注册）: ${String(e)}`); } catch { /* ignore */ }
				}
				const disposeBody = ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: VIEW_TAB_ID,
					inject: () => ({})
				}, VK_ViewerTabBody));
				// 「打开本机文件」：同 kind 覆盖官方 files 类型（extension 段盖 builtin 段），
				// 于是「新标签页」的 guide 条目从官方的「浏览会话区文件」换成自研这一条。
				//
				// 2026-09-11 修复（用户报「拓展栏的打开本机文件有时退化为官方」，实测 3080/3081 都退化）：
				// 只注册一次不够 —— client 插件在批内并发加载/重载时，本插件新实例的注册可能与旧实例的
				// 清理交错（旧实例注销会把官方 builtin 从 shadow 放回 inForce），最终页面上只剩官方那条。
				// 现在：登记后订阅注册表自愈 —— 只要 kind=files 当前在用的不是我们这条，就注销自己再补注册。
				let disposePickType = null;
				let pickTries = 0;
				const ensurePickType = () => {
					try {
						const inForce = registry.get(PICK_TAB_KIND);
						if (inForce !== void 0 && inForce.id === PICK_TAB_ID) return; // 已经是自研这条，无需动作
						if (pickTries >= 8) return; // 上限：避免来回抖动
						pickTries += 1;
						if (disposePickType !== null) { try { disposePickType(); } catch { /* 旧注册可能已释放 */ } disposePickType = null; }
						disposePickType = registry.register(vkPickTabDefinition());
						try { globalThis.__VK_PICK_TAB__ = { stage: "re-registered", at: new Date().toISOString(), tries: pickTries }; } catch { /* 痕迹只给排查用 */ }
					} catch (e) {
						try { ctx.logger.warn(`[vscode-layout] pick tab 自愈注册失败: ${String(e)}`); } catch { /* ignore */ }
					}
				};
				try {
					disposePickType = registry.register(vkPickTabDefinition());
				} catch (e) {
					// 同上：已存在我们的注册（旧实例残留）时不必也不该中断——交给下面的自愈接管。
					try { ctx.logger.warn(`[vscode-layout] pick tab 注册被拒（交给自愈）: ${String(e)}`); } catch { /* ignore */ }
				}
				try {
					const nowInForce = registry.get(PICK_TAB_KIND);
					globalThis.__VK_PICK_TAB__ = { stage: "registered", at: new Date().toISOString(), inForce: nowInForce === void 0 ? null : nowInForce.id };
				} catch { /* 痕迹只给排查用 */ }
				let offPickWatch = null;
				try { if (typeof registry.subscribe === "function") offPickWatch = registry.subscribe(() => { try { setTimeout(ensurePickType, 0); } catch { ensurePickType(); } }); } catch { /* 无订阅面：靠下面的定时校验 */ }
				const pickWatchTimer = setTimeout(ensurePickType, 1500);
				const disposePickBody = ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
					name: "sidebar.right.pane.tab",
					key: PICK_TAB_ID,
					inject: () => ({})
				}, VK_PickTabBody));
				return () => {
					try { clearTimeout(pickWatchTimer); } catch { /* ignore */ }
					try { if (offPickWatch !== null) offPickWatch(); } catch { /* ignore */ }
					disposePickBody();
					if (disposePickType !== null) disposePickType();
					disposeBody();
					if (disposeType !== null) disposeType();
				};
				};
				/** 轮询等服务就绪后注册一次；已注册则不再重复。 */
				const vkAttemptRightPane = () => {
					if (vkRegDone) return;
					let registry;
					try { registry = ctx.get("sidebarRightTabs"); } catch { registry = void 0; }
					if (registry === void 0 || typeof registry.register !== "function") {
						vkRegTries += 1;
						if (vkRegTries >= VK_AT_REGISTER_TRIES) {
							try { globalThis.__VK_PICK_TAB__ = { stage: "no-registry", tries: vkRegTries }; } catch { /* 痕迹只给排查用 */ }
							return;
						}
						try { setTimeout(vkAttemptRightPane, VK_AT_REGISTER_INTERVAL); } catch { /* 无定时器环境：放弃 */ }
						return;
					}
					vkRegDone = true;
					try { vkRegDispose = vkRegisterRightPaneTypes(); } catch (e) {
						try { globalThis.__VK_PICK_TAB__ = { stage: "throw", error: String(e && e.message ? e.message : e) }; } catch { /* 痕迹只给排查用 */ }
					}
				};
				vkAttemptRightPane();
				return () => {
					vkRegDone = true;
					try { if (vkRegDispose !== null) vkRegDispose(); } catch { /* ignore */ }
				};
			}, "vscode-layout: rightbar viewer tab type");
			// ── @ 引用扩域：把文件栏里的根（常用目录 / 会话根 / 最近打开）接进官方 @ 菜单 ──
			vkRegisterAtSource(ctx);
			// ── 对话框工具行的放大镜「搜索本机文件」：与文件栏「打开本机文件」同一套浏览/检索，
			//    2026-09-12 用户要求：按钮本体**搬到 @ 列表右上角**（原生 DOM 注入官方 [data-trigger-menu]），
			//    选中后把 @引用 追加进输入框（不打开标签页、不进文件栏列表）；
			//    工具行那个组件现在只当弹窗宿主（默认态渲染 null），点击由 vkInstallAtSearchButton 接管。──
			vkInstallAtSearchButton();
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "vk-composer-file-search",
				order: 30
			}, VK_ComposerFileSearch));
			// ── 会话文件「小眼睛」Dock 已整体删除（T3）：文件投入语义交给官方 @ 引用 ──
			// 拓展栏（官方右侧栏）的主动唤起：注册到**会话头部右上角**（与官方那颗收起按钮同一个角）。
			// 该插槽是 single → priority:-1 拿下（官方那条同 kind 就渲染不出来了，避免两颗重复按钮）。
			ctx.slots.inject("conversation.session.header.corner", () => ctx.slots.register({
				name: "conversation.session.header.corner",
				priority: -1
			}, VK_RightPaneToggle));
			// 注册「全局人设」设置分区（官方设置面板左侧导航 + 右侧内容）
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "persona",
				order: 1,
				label: () => "全局人设"
			}, PersonaSection));
			// 注册「Skill 管理」设置分区
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "skills",
				order: 2,
				label: () => "Skill 管理"
			}, SkillSection));
			// 注册「MCP 管理」设置分区
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "mcp",
				order: 3,
				label: () => "MCP 管理"
			}, MCPSection));
			ctx.effect(() => {
				const presenter = new ThemePresenter();
				presenter.apply(ctx.theme.getTheme());
				const off = ctx.on("theme/change", (snapshot) => {
					presenter.apply(snapshot);
				});
				return () => {
					off();
					presenter.dispose();
				};
			}, "vscode-layout: theme presenter");
			// ── 对话里 read/write 卡片的路径 → 拓展栏（第七轮新增；见 vkInstallChatFileHooks 的注释）──
			// 一行回退：把常量 VK_CHAT_FILE_LINK 置 false（监听器仍在，但一次都不拦）。
			ctx.effect(() => vkInstallChatFileHooks(ctx), "vscode-layout: chat file links → rightbar");
			// ── 拓展栏「上下分界」：顶栏第 4 颗按钮 + 下界命令行面板（2026-09-12）──
			// 整段包 try：这一行任何一处抛错都会让本插件条目 apply 失败 → 整页「Failed to load plugins」，
			// 一个新功能不允许把主界面带走。
			try {
				globalThis.__VK_CMD_BUILD__ = VK_CMD_BUILD;
				globalThis.__VK_CMDSTORE__ = vkCmdStore;
				globalThis.__VK_CMD_DIAG__ = vkCmdDiag;
				vkCmdProbe({ build: VK_CMD_BUILD });
			} catch { /* ignore */ }
			ctx.effect(() => {
				let host = null;
				let root = null;
				let unmountMount = () => {};
				let unmountButton = () => {};
				let unmountWheel = () => {};
				try {
					// ⚠️ 这个节点就是「面板本体」的容器，也是 React 根——**同一个节点，别另建**。
					// apply 时创建（先不插进 DOM），展开时由 vkCmdMount 整块插进右栏格下段。
					host = document.createElement("div");
					host.setAttribute("data-vk-cmd-host", "panel");
					host.style.cssText = "position:absolute;left:0;right:0;bottom:0;height:0;z-index:5;pointer-events:auto;";
					const client = require("react-dom/client");
					const dom = require("react-dom");
					const createRoot = client !== null && client !== void 0 && typeof client.createRoot === "function"
						? client.createRoot
						: void 0;
					// 渲染之后**在同一个任务里**用一次空 flushSync 把 React 的并发工作冲干净 →
					// 开关一按即刻落 DOM，不做「等下一帧」的赌。
					// ⚠️ 绝不能把 root.render 本身包进 flushSync：render 会同步通知订阅者，
					// 订阅者再 render 就变成「渲染中再渲染」，React 直接抛 Should not already be working。
					const flush = dom !== null && dom !== void 0 && typeof dom.flushSync === "function"
						? () => { try { dom.flushSync(() => {}); } catch { /* ignore */ } }
						: () => {};
					// 面板只在 open 时渲染：收起时 DOM 里什么都不留（按钮另有一段原生 DOM，不在这里）
					// 2026-09-17：下段正文换成**官方真终端**（官方 PTY + 官方 TerminalBody）。
					// 自研命令流 UI 摘掉（VK_CmdPanel 源码保留未被引用，一行回退即可）。挂载模型一字未动。
					const render = () => {
						const next = vkCmdStore.open === true ? h(VK_TerminalPanel, { key: "vk-term-panel" }) : null;
						if (createRoot !== void 0) {
							if (root === null) root = createRoot(host);
							root.render(next);
						} else {
							const legacy = dom;
							if (legacy !== null && legacy !== void 0 && typeof legacy.render === "function") legacy.render(next, host);
						}
						flush();
					};
					render();
					const off = vkCmdStore.subscribe(render);
					unmountMount = vkCmdMount(host);
					unmountButton = vkCmdInstallButton();
					unmountWheel = vkCmdInstallWheelProbe();
					return () => {
						vkCmdProbe({ panelRendered: false, inCol: false });
						try { off(); } catch { /* ignore */ }
						try { unmountMount(); } catch { /* ignore */ }
						try { unmountButton(); } catch { /* ignore */ }
						try { unmountWheel(); } catch { /* ignore */ }
						try { if (root !== null) root.unmount(); } catch { /* ignore */ }
						try { if (host !== null && host.parentElement !== null) host.parentElement.removeChild(host); } catch { /* ignore */ }
					};
				} catch (error) {
					vkCmdProbe({ err: String(error && error.message ? error.message : error) });
					try { ctx.logger.warn("[vscode-layout] 命令行面板挂载失败：" + String(error)); } catch { /* ignore */ }
				}
				return () => {
					try { unmountMount(); } catch { /* ignore */ }
					try { unmountButton(); } catch { /* ignore */ }
					try { unmountWheel(); } catch { /* ignore */ }
					try { if (host !== null && host.parentElement !== null) host.parentElement.removeChild(host); } catch { /* ignore */ }
				};
			}, "vscode-layout: rightbar command line (split bottom)");
			// 官方那几处「新建终端」入口 → 直接落到下段（不再在上段开官方标签）
			ctx.effect(() => vkInstallTerminalGuideIntercept(ctx), "vscode-layout: terminal guide → bottom pane");
		}

		// ──────────────────────────────────────────────────────────────
		// 拓展栏「上下分界」：上半仍是官方拓展栏，下半是本插件命令行（2026-09-12）
		//
		// 与上一版（session-017 那版，已废弃）的本质差别 —— 这三点是**唯一正确的挂载模型**：
		//   · 一个宿主节点身兼两职：它既是 React 根（createRoot 的容器），也是面板 DOM 本体。
		//     绝不按「React 根 + 面板宿主」建两个节点 —— 那样 React 渲染的内容会待在游离
		//     节点里，屏幕永远不变（用户看到的就是「点了没反应」）。
		//   · 面板**只在 open 时渲染**（收起时 React 不渲染它，DOM 里什么都不留）；
		//     而宿主节点由 tick() 按 open 插进 / 拔出官方右栏那一格（[data-rightbar-col]）。
		//   · 分隔全部走 **JS 内联像素**：上段 = `col.style.paddingBottom = <px>`（官方 absolute
		//     面板的包含块是 padding box，于是它自然只占上段），下段 = 宿主自己的 height。
		//     不铺覆盖层、不靠 CSS 变量、不靠 [class*=…] 选择器命中（上一版栽在这里）。
		//
		// 另外：顶栏第 4 颗按钮**不进这个 React 根**——它是一段原生 DOM，由 1s 轮询补挂进
		// [data-dockkit-strip-chrome]。两件互不相干的事各自有各自的生命周期，不互相牵连。
		//
		// 钩子（验收用，必须留着）：
		//   __VK_CMD_BUILD__  构建标记：刷新后不变 = 浏览器加载的还是旧 bundle（bundle 只随服务重启更新）
		//   __VK_CMDSTORE__   状态：.open / .height / .setOpen(true) 驱动整条链路
		//   __VK_CMD_MOUNT__  落位探针：{ colFound, inCol, pinnedPx, panelRendered, … }
		//   __VK_CMD_TICK__() 手动补一次落位（仅排障；断言不许用它，否则掩盖「订阅没接上」）
		// ──────────────────────────────────────────────────────────────
		const VK_CMD_OPEN_KEY = "vk.layout.cmdOpen.v1";
		const VK_CMD_HEIGHT_KEY = "vk.layout.cmdHeight.v1";
		const VK_CMD_HISTORY_KEY = "vk.layout.cmdHistory.v1";
		/** 下界高度：百分比（相对视口高），拖动会改它。 */
		const VK_CMD_HEIGHT_MIN = 12;
		const VK_CMD_HEIGHT_MAX = 70;
		const VK_CMD_HEIGHT_DEFAULT = 34;
		/** 下界像素下限（百分比在矮窗口里会小到没法用）。 */
		const VK_CMD_PX_MIN = 80;
		/** 右栏那一格至少这么宽（px）才放得下下界；收起时是 0px 的网格轨，低于它就是收起态。 */
		const VK_CMD_COL_MIN_W = 300;
		const VK_CMD_HISTORY_MAX = 60;
		const VK_CMD_POLL_MS = 700;
		/** 构建标记：每次改动这块代码必须改它（刷新后先在控制台确认它变了，再判断功能）。 */
		const VK_CMD_BUILD = "official-terminal-2026-09-17-1400";
		let vkCmdSeq = 0;

		function vkCmdStoredFlag(key) {
			try { return window.localStorage.getItem(key) === "1"; } catch { return false; }
		}
		function vkCmdWriteFlag(key, on) {
			try { window.localStorage.setItem(key, on ? "1" : "0"); } catch { /* ignore */ }
		}
		function vkCmdStoredHeight() {
			try {
				const raw = Number(window.localStorage.getItem(VK_CMD_HEIGHT_KEY));
				if (Number.isFinite(raw) && raw >= VK_CMD_HEIGHT_MIN && raw <= VK_CMD_HEIGHT_MAX) return Math.round(raw);
			} catch { /* ignore */ }
			return VK_CMD_HEIGHT_DEFAULT;
		}
		function vkCmdStoredHistory() {
			try {
				const raw = JSON.parse(window.localStorage.getItem(VK_CMD_HISTORY_KEY) || "[]");
				if (Array.isArray(raw)) return raw.filter((item) => typeof item === "string").slice(-VK_CMD_HISTORY_MAX);
			} catch { /* ignore */ }
			return [];
		}

		/** 面板级 UI 状态（面板收起时组件卸载，所以草稿/筛选/上次快照留在模块级，重开即恢复）。 */
		const vkCmdUi = {
			draft: "",
			filter: "",
			view: { jobs: [], agent: [], shell: null, ok: false, err: null, agentErr: null }
		};
		/** 诊断文本里的空值归一（`null`/`undefined` → "无"，避免把 undefined 写进 DOM）。 */
		function vkCmdText(value) {
			return value === null || value === undefined ? "无" : String(value);
		}
		/** 命令行面板共享状态：按钮与面板两处都读它，改动通过订阅同步到 DOM。 */
		const vkCmdStore = {
			open: vkCmdStoredFlag(VK_CMD_OPEN_KEY),
			height: vkCmdStoredHeight(),
			history: vkCmdStoredHistory(),
			/** 官方右栏当前是否展开（tick 轮询同步进来；收起时下界整块拔出）。 */
			paneOpen: true,
			/** 官方右栏是否处于全屏模式（全屏时它铺满视口，下界整块不出现）。 */
			paneFullscreen: false,
			/** 展开态够不够放下界：那一格宽 <300px（含收起时的 0px 网格轨）就算放不下。 */
			paneCollapsed: false,
			/** 诊断行：面板标题栏右侧显示的那串状态（真机上不带控制台就能读）。 */
			diag: "",
			listeners: new Set(),
			subscribe(fn) {
				this.listeners.add(fn);
				return () => { this.listeners.delete(fn); };
			},
			emit() {
				for (const fn of [...this.listeners]) { try { fn(); } catch { /* ignore */ } }
			},
			setPaneOpen(on) {
				const next = on === true;
				if (this.paneOpen === next) return;
				this.paneOpen = next;
				this.emit();
			},
			setPaneFullscreen(on) {
				const next = on === true;
				if (this.paneFullscreen === next) return;
				this.paneFullscreen = next;
				this.emit();
			},
			setPaneCollapsed(on) {
				const next = on === true;
				if (this.paneCollapsed === next) return;
				this.paneCollapsed = next;
				this.emit();
			},
			setDiag(text) {
				const next = String(text ?? "");
				if (this.diag === next) return;
				this.diag = next;
				this.emit();
			},
			setOpen(on) {
				const next = on === true;
				if (this.open === next) return;
				this.open = next;
				vkCmdWriteFlag(VK_CMD_OPEN_KEY, next);
				this.emit();
			},
			setHeight(percent) {
				const next = Math.max(VK_CMD_HEIGHT_MIN, Math.min(VK_CMD_HEIGHT_MAX, Math.round(percent)));
				if (this.height === next) return;
				this.height = next;
				try { window.localStorage.setItem(VK_CMD_HEIGHT_KEY, String(next)); } catch { /* ignore */ }
				this.emit();
			},
			pushHistory(text) {
				const line = String(text);
				const list = this.history.filter((item) => item !== line);
				list.push(line);
				this.history = list.slice(-VK_CMD_HISTORY_MAX);
				try { window.localStorage.setItem(VK_CMD_HISTORY_KEY, JSON.stringify(this.history)); } catch { /* ignore */ }
			}
		};
		function useVkCmdStore() {
			return typeof react.useSyncExternalStore === "function"
				? react.useSyncExternalStore((fn) => vkCmdStore.subscribe(fn), () => vkCmdStore)
				: vkCmdStore;
		}
		// 把「网页缩放」诊断接进面板标题行（缩放那条链定义在 store 之前，用这个反填）。
		try { vkZoomNote.store = vkCmdStore; } catch { /* ignore */ }

		/** 落位探针（控制台一行看出「按钮没接上 / 宿主没插 / 插了没高度」）。 */
		function vkCmdProbe(patch) {
			try {
				globalThis.__VK_CMD_MOUNT__ = Object.assign(
					globalThis.__VK_CMD_MOUNT__ ?? { colFound: false, inCol: false, pinnedPx: 0, panelRendered: false, chrome: false, buttonInChrome: false, err: null, ticks: 0, build: VK_CMD_BUILD },
					patch ?? {}
				);
			} catch { /* ignore */ }
		}

		/**
		 * 读右栏那一格的宽度（px）。
		 * `__VK_CMD_WIDTH__` 是**测试覆盖口**：离线冒烟的 DOM 垫片没有布局引擎，跨 vm 沙箱的
		 * getBoundingClientRect 读不到测试改的矩形，用它才能把「收起态（0 宽）」这条路径测出来。
		 * 真机上没有这个把手，一律走真实测量。
		 */
		function vkCmdWidthOf(col) {
			try {
				const override = globalThis.__VK_CMD_WIDTH__;
				if (typeof override === "number" && Number.isFinite(override)) return Math.round(override);
			} catch { /* ignore */ }
			try { return Math.round(col.getBoundingClientRect().width); } catch { return -1; }
		}

		/**
		 * 从某元素往上找第一个会裁剪的祖先（没有就返回 null）——「插进去了却看不见」的第一嫌疑。
		 * @param {HTMLElement|null} start
		 */
		function vkCmdClipAncestor(start) {
			try {
				let node = start === null || start === undefined ? null : start.parentElement;
				for (let i = 0; node !== null && node !== undefined && i < 8; i++) {
					const cs = window.getComputedStyle(node);
					if (cs.overflow !== "visible") return String(node.className || node.tagName).slice(0, 24) + "(" + cs.overflow + ")";
					node = node.parentElement;
				}
			} catch { /* ignore */ }
			return null;
		}

		/**
		 * 「分割」实证的最新读数（每次落位 tick 刷新）。
		 * 排障口径：`JSON.stringify(__VK_CMD_DIAG__().split)` —— 判「真分割」看三条：
		 *   ① overlap === false（官方面板 bottom ≤ 命令行宿主 top，两者不相交）；
		 *   ② panelH 还有一段可用高度（不是被压没）；
		 *   ③ mode 是 "padding"（那一格的 padding 就够，没碰官方盒子）还是 "panel"（改用内联 bottom）。
		 */
		const vkCmdSplitState = { mode: "none", gap: null, panelH: null, hostTop: null, panelBottom: null, overlap: null, touchedOfficial: false, scroller: null, at: null };

		/**
		 * 官方面板里那个「真正在滚」的容器（只读测量）：在面板后代里找第一个 scrollHeight 明显大于
		 * clientHeight 的元素并回报它 —— 分割之后它必须还留着可用高度，否则官方拓展栏就被压没了。
		 */
		function vkCmdScrollerOf(root) {
			try {
				if (root === null || root === undefined) return null;
				const list = [root];
				for (let i = 0; i < list.length && i < 60; i++) {
					const el = list[i];
					try { for (const child of el.children) list.push(child); } catch { /* ignore */ }
					let sh = 0;
					let ch = 0;
					try { sh = Number(el.scrollHeight) || 0; ch = Number(el.clientHeight) || 0; } catch { /* ignore */ }
					if (el !== root && ch > 0 && sh > ch + 4) {
						return { cls: String(el.className || el.tagName).slice(0, 24), clientH: Math.round(ch), scrollH: Math.round(sh) };
					}
				}
			} catch { /* ignore */ }
			return null;
		}

		/**
		 * 深探针：落位失败时用来一次性看清「那一格是谁、定位模式是什么、面板到底在哪」。
		 * 排障用法（控制台）：`JSON.stringify(__VK_CMD_DIAG__())`
		 * build 字段本身就是版本自证——**没有这个函数 = 浏览器跑的还是旧 bundle**。
		 */
		function vkCmdDiag() {
			const box = (el) => {
				if (el === null || el === undefined) return null;
				try {
					const r = el.getBoundingClientRect();
					return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
				} catch { return null; }
			};
			const chain = [];
			try {
				let node = document.querySelector("[data-rightbar-col]");
				for (let i = 0; node !== null && node !== undefined && i < 8; i++) {
					let pos = "?";
					try { pos = window.getComputedStyle(node).position; } catch { /* ignore */ }
					chain.push({
						tag: node.tagName,
						cls: String(node.className || "").slice(0, 40),
						pos,
						overflow: (() => { try { return window.getComputedStyle(node).overflow; } catch { return "?"; } })(),
						inlineStyle: String(node.getAttribute("style") || "").slice(0, 90),
						rect: box(node)
					});
					node = node.parentElement;
				}
			} catch { /* ignore */ }
			const panel = (() => { try { return document.querySelector('[class*="_panel"][data-sidebar-right-panel], [data-sidebar-right-panel]'); } catch { return null; } })();
			const paneAttrs = panel === null ? null : {
				panel: panel.getAttribute("data-sidebar-right-panel"),
				open: panel.hasAttribute("data-sidebar-right-open"),
				position: (() => { try { return window.getComputedStyle(panel).position; } catch { return "?"; } })(),
				rect: box(panel)
			};
			const el = (() => { try { return document.querySelector("[data-vk-cmd-host]"); } catch { return null; } })();
			// 宿主是否真的落在视口里、是否被祖先裁剪 —— 「按钮蓝了却看不见下界」最需要这两条
			const hostRect = box(el);
			const inViewport = hostRect === null ? null
				: (hostRect.y >= 0 && hostRect.x >= 0 && hostRect.y < window.innerHeight && hostRect.x < window.innerWidth);
			const clippedBy = vkCmdClipAncestor(el);
			return {
				build: VK_CMD_BUILD,
				when: new Date().toISOString(),
				viewport: { w: window.innerWidth, h: window.innerHeight },
				paneOpen: vkCmdStore.paneOpen,
				paneFullscreen: vkCmdStore.paneFullscreen,
				open: vkCmdStore.open,
				heightPct: vkCmdStore.height,
				mount: globalThis.__VK_CMD_MOUNT__ ?? null,
				hostInViewport: inViewport,
				clippedBy: clippedBy,				host: el === null ? null : {
					parentCls: String((el.parentElement && el.parentElement.className) || "").slice(0, 40),
					isCol: (() => { try { return el.parentElement === document.querySelector("[data-rightbar-col]"); } catch { return false; } })(),
					colPos: (() => { try { return window.getComputedStyle(el.parentElement).position; } catch { return "?"; } })(),
					colPaddingBottom: el.parentElement === null ? null : el.parentElement.style.paddingBottom,
					zIndex: el.style.zIndex,
					pe: (() => { try { return window.getComputedStyle(el).pointerEvents; } catch { return "?"; } })(),
					children: el.childNodes.length,
					rect: box(el)
				},
				panel: paneAttrs,
				split: Object.assign({}, vkCmdSplitState),
				colChain: chain
			};
		}

		/**
		 * 找到官方右栏那一格（右栏的网格轨）。
		 *
		 * 2026-09-12 用真实 shell 的 DOM 核对过（`class="pI_x6G_rightbarCol"`）：
		 *   `<div class="*_rightbarCol" data-rightbar-col="true"><div data-slot="rightbar" style="display:contents"></div></div>`
		 *   它 `position:relative`（自带定位上下文，不用我们改）、`display:block`、`overflow:visible`；
		 *   收起时它是 frame 网格里的 `0px` 轨（宽 0），官方面板根本**不渲染**（面板在 slot 的 display:contents 里）。
		 * 所以：① 认这个标记（它比"面板的父节点"更稳：收起时没有面板）；② 才退回面板父节点；
		 *       ③ 最后样式兜底。**并排除 body/html**——绝对定位挂到 body 上就会横在中栏、还吃掉滚轮。
		 */
		function vkCmdFindCol() {
			const ok = (el) => el !== null && el !== undefined && el !== document.body && el !== document.documentElement && el.isConnected === true;
			try {
				const tagged = document.querySelector("[data-rightbar-col]");
				if (ok(tagged)) return tagged;
			} catch { /* ignore */ }
			// 官方右栏面板（`[data-sidebar-right-panel]`，CSS module 类 `_panel`；normal 时 absolute
			// top:0/bottom:0/right:0，fullscreen 时 fixed + inset:0）的父节点同样可以当那一格用。
			try {
				const panel = document.querySelector("[data-sidebar-right-panel]");
				if (panel !== null && ok(panel.parentElement)) {
					try { panel.parentElement.setAttribute("data-rightbar-col", "true"); } catch { /* ignore */ }
					return panel.parentElement;
				}
			} catch { /* ignore */ }
			// 兜底：按样式特征找「贴右缘的绝对定位那一格」，排除自身也被绝对定位的嵌套层、排除太窄的
			try {
				const winW = window.innerWidth;
				for (const cand of document.querySelectorAll("div")) {
					if (!ok(cand)) continue;
					const style = cand.getAttribute("style");
					if (style === null || style.indexOf("absolute") < 0 || style.indexOf("right") < 0) continue;
					const parent = cand.parentElement;
					if (parent !== null && parent.getAttribute("style") !== null && parent.getAttribute("style").indexOf("absolute") >= 0) continue;
					if (cand.getBoundingClientRect().width < Math.max(80, winW * 0.2)) continue;
					try { cand.setAttribute("data-rightbar-col", "true"); } catch { /* ignore */ }
					return cand;
				}
			} catch { /* ignore */ }
			return null;
		}

		/** 官方面板是否处于全屏模式（fullscreen 时它是 position:fixed;inset:0，上下分界无意义）。 */
		function vkCmdFullscreen() {
			try {
				const panel = document.querySelector("[data-sidebar-right-panel]");
				return panel !== null && panel.getAttribute("data-sidebar-right-panel") === "fullscreen";
			} catch { return false; }
		}

		/**
		 * 只读滚轮探针（排障用：查「中栏网页缩不动」）。
		 * 在**捕获阶段**旁听 Ctrl+滚轮，不改任何行为，把三件事写进面板标题行的诊断：
		 *   · ctrl=1 — Ctrl 键确实到了页面；
		 *   · at=<元素> — 光标下是谁（若带「(我方)」说明滚在命令行面板上，而不是网页上）；
		 *   · pd=1/0 — 默认行为有没有被 preventDefault（延时 60ms 读最终值）。
		 * 不装这个，就只能靠「缩不动」三个字猜是哪一环断的。
		 */
		function vkCmdInstallWheelProbe() {
			const onWheel = (event) => {
				try {
					if (event.ctrlKey !== true && event.metaKey !== true) return;
					const tag = (el) => (el === null || el === undefined ? "null" : String(el.tagName) + "." + String(el.className || "").slice(0, 20));
					const under = document.elementFromPoint(event.clientX, event.clientY);
					let mine = false;
					try { mine = under !== null && typeof under.closest === "function" && under.closest("[data-vk-cmd-host], [data-vk-cmd-panel]") !== null; } catch { mine = false; }
					const line = (pd) => "ctrl=1 dy=" + String(Math.round(event.deltaY)) + " at=" + tag(under) + (mine ? "(我方)" : "") + " pd=" + pd;
					vkCmdStore.setDiag(line("…"));
					window.setTimeout(() => { try { vkCmdStore.setDiag(line(event.defaultPrevented ? "1" : "0")); } catch { /* ignore */ } }, 60);
				} catch { /* 探针出错绝不影响滚轮本身 */ }
			};
			try { window.addEventListener("wheel", onWheel, { capture: true, passive: true }); } catch { /* ignore */ }
			return () => { try { window.removeEventListener("wheel", onWheel, { capture: true }); } catch { /* ignore */ } };
		}

		/**
		 * 命令行落位：宿主 = React 根 = 面板本体，按 store 的 open/height 把它插进官方右栏那一格。
		 * 订阅在构造时就接上——**断言只驱动 store**，不手动补 tick（否则会掩盖「订阅没接上」）。
		 * @param {HTMLElement} host - apply 里创建、createRoot 挂上的那个节点
		 */
		function vkCmdMount(host) {
			if (host === null || host === undefined) return () => {};
			let col = null;
			let pinnedPx = -1;
			/** 每 tick 实读的格子宽度（真实宽度会随侧栏动画/收起/全屏变化，不能只在插入时量一次）。 */
			let colWidth = -1;
			/** 被我们临时改成 relative 的那一格的原始 inline position（拔出时还原；绝不留痕在官方盒子上）。 */
			let colPosBackup = null;
			/** 「分割」实证结论：null=还没量；"padding"=那一格的 padding 就够（没碰官方盒子）；"panel"=必须动官方盒子的内联 bottom。 */
			let splitMode = null;
			/** 被我们改过内联 bottom 的官方盒子 + 原值（拔出时**原样**还原，绝不留痕）。 */
			let panelNudged = null;
			const pxOf = () => {
				if (vkCmdStore.open !== true || vkCmdStore.paneOpen !== true || vkCmdStore.paneFullscreen === true) return 0;
				return Math.max(VK_CMD_PX_MIN, Math.round((window.innerHeight * vkCmdStore.height) / 100));
			};
			const detach = () => {
				try { if (host.parentElement !== null) host.parentElement.removeChild(host); } catch { /* ignore */ }
				try {
					if (col !== null && col.isConnected === true && col.style.paddingBottom !== "") col.style.paddingBottom = "";
					if (col !== null && colPosBackup !== null) {
						col.style.position = colPosBackup;
						colPosBackup = null;
					}
					// 官方盒子的内联 bottom 原样还回去（换成别的官方盒子了也一样处理）
					if (panelNudged !== null && panelNudged.el !== null && panelNudged.el !== undefined) {
						try { panelNudged.el.style.bottom = panelNudged.bottom; } catch { /* ignore */ }
					}
					panelNudged = null;
					splitMode = null;
					vkCmdSplitState.mode = "detached";
					vkCmdSplitState.overlap = null;
					vkCmdSplitState.gap = null;
				} catch { /* ignore */ }
				pinnedPx = -1;
			};
			/**
			 * 「分割」实证（用户原话：让他分割拓展栏而不是遮挡）——**先量后判**，不信推理。
			 *
			 * 现行做法（给那一格 padding-bottom）理论上能让官方面板只占上段：面板是 absolute +
			 * top:0/bottom:0，包含块正是那一格的 padding box。但实测（2026-09-12，按真实结构复刻
			 * frame/col/slot/panel，4 种 box-sizing × height 组合各测一遍）：
			 *   · 给那一格 padding-bottom:300px → 官方面板高度 600 → **600**（纹丝不动，padding 只缩了
			 *     content box，stretch/height:100% 下 padding box 不变）；
			 *   · 把内联 bottom:300px 写到**官方盒子**上 → 面板高度 600 → **300**。
			 * 所以这里每次都实读两个 rect：还重叠才动官方盒子（原值留底、拔出还原），并如实报出用的是哪条。
			 * @param {number} px - 命令行面板高度（px）
			 */
			const splitCheck = (px) => {
				const out = { mode: splitMode === null ? "measuring" : splitMode, gap: null, panelH: null, hostTop: null, panelBottom: null, overlap: null, touchedOfficial: panelNudged !== null, scroller: null, at: Date.now() };
				try {
					const panel = document.querySelector("[data-sidebar-right-panel]");
					if (panel === null || panel === undefined || vkCmdFullscreen() === true) { Object.assign(vkCmdSplitState, out); return out; }
					const hr = host.getBoundingClientRect();
					const pr = panel.getBoundingClientRect();
					// 还没拿到真实布局（垫片/初始帧）：不judge，也不动任何东西
					if (hr.height <= 1 || hr.width <= 1 || pr.height <= 1) { Object.assign(vkCmdSplitState, out); return out; }
					out.hostTop = Math.round(hr.top);
					out.panelBottom = Math.round(pr.bottom);
					out.panelH = Math.round(pr.height);
					out.gap = Math.round(hr.top - pr.bottom);
					out.overlap = pr.bottom > hr.top + 1 && pr.top < hr.bottom - 1;
					if (out.overlap === true && splitMode !== "panel") {
						splitMode = "panel";
						panelNudged = { el: panel, bottom: panel.style.bottom };
						panel.style.bottom = px + "px";
						out.touchedOfficial = true;
						const p2 = panel.getBoundingClientRect();
						out.panelH = Math.round(p2.height);
						out.panelBottom = Math.round(p2.bottom);
						out.gap = Math.round(hr.top - p2.bottom);
						out.overlap = p2.bottom > hr.top + 1 && p2.top < hr.bottom - 1;
					} else if (out.overlap !== true && splitMode === null) {
						splitMode = "padding";
					}
					if (splitMode === "panel") {
						// 官方盒子被 React 换过节点：旧的还原、新的接上（否则会留下一个多出来的内联 bottom）
						if (panelNudged !== null && panelNudged.el !== panel) {
							try { if (panelNudged.el !== null && panelNudged.el !== undefined) panelNudged.el.style.bottom = panelNudged.bottom; } catch { /* ignore */ }
							panelNudged = { el: panel, bottom: panel.style.bottom };
						}
						if (panelNudged !== null && panel.style.bottom !== px + "px") panel.style.bottom = px + "px";
					}
					out.mode = splitMode === null ? "measuring" : splitMode;
					out.touchedOfficial = panelNudged !== null;
					out.scroller = vkCmdScrollerOf(panel);
				} catch { /* 量不到就什么都不动 */ }
				Object.assign(vkCmdSplitState, out);
				return out;
			};
			const tick = () => {
				vkCmdProbe({ ticks: ((globalThis.__VK_CMD_MOUNT__ ?? {}).ticks ?? 0) + 1 });
				// 官方右栏展开态 / 全屏态：收起或全屏时整块拔出（有状态的部分留在 store/模块级，重开即恢复）
				try {
					const sr = ctxRef.current === null ? void 0 : ctxRef.current.get("sidebarRight");
					if (sr !== void 0 && sr !== null && typeof sr.isExpanded === "function") vkCmdStore.setPaneOpen(sr.isExpanded() === true);
				} catch { /* 服务未就绪：按上次状态 */ }
				// 只在状态真的变了才写 store（setPaneFullscreen 内部已去重，这里避免每 tick 都读 DOM 属性）
				const wantFullscreen = vkCmdFullscreen();
				if (vkCmdStore.paneFullscreen !== wantFullscreen) vkCmdStore.setPaneFullscreen(wantFullscreen);
				const px = pxOf();
				if (px === 0) {
					detach();
					vkCmdProbe({ inCol: false, pinnedPx: 0, colFound: col !== null, fullscreen: wantFullscreen });
					return;
				}
				if (col === null || col.isConnected !== true) {
					col = vkCmdFindCol();
					// 换过格子：旧格子上留下的 padding/position 要清掉
					if (col !== null && colPosBackup !== null) { try { colPosBackup = null; } catch { /* ignore */ } }
				}
				if (col === null || col === document.body || col === document.documentElement) {
					vkCmdProbe({ colFound: false, inCol: false, fullscreen: wantFullscreen });
					col = null;
					return;
				}
				// 那一格宽度不够（含收起时 0px 的网格轨 / 全屏时被固定层接管）：不挂，并如实告诉用户。
				// 宽度**每 tick 实读**：侧栏收起/展开有过渡动画，只在插入时量一次会拿到中间值。
				let widthNow = -1;
				try { widthNow = vkCmdWidthOf(col); } catch { widthNow = -1; }
				if (widthNow >= 0) colWidth = widthNow;
				if (colWidth >= 0 && colWidth < VK_CMD_COL_MIN_W) {
					detach();
					vkCmdStore.setPaneCollapsed(true);
					vkCmdStore.setDiag("colW=" + String(colWidth) + " · 放不下 · " + VK_CMD_BUILD);
					vkCmdProbe({ colFound: true, inCol: false, colWidth, collapsed: true, pinnedPx: 0 });
					return;
				}
				vkCmdStore.setPaneCollapsed(false);
				try {
					// ⚠️ 关键一条（用户实测：按钮变蓝但下栏不出现 + 中栏网页缩不动）：
					// 宿主是 position:absolute，只有当**那一格自己是 positioned** 时，它才落在下段；
					// 若那一格是 static，绝对定位会往上找包含块 → 跑出右栏、盖在中栏上（既看不见又吃掉滚轮）。
					// 所以插入前先确保这一格是定位元素（记录原值，拔出时还原）。
					// （实测真实 shell 的 `_rightbarCol` 本来就是 relative，这里是兜底，不改就不动。）
					const computed = window.getComputedStyle(col);
					if (computed !== null && computed.position === "static") {
						if (colPosBackup === null) colPosBackup = col.style.position;
						col.style.position = "relative";
					}
				} catch { /* 取不到 computed 也不能拦着挂载 */ }
				try {
					host.style.position = "absolute";
					host.style.left = "0";
					host.style.right = "0";
					host.style.bottom = "0";
					host.style.width = "auto";
					host.style.height = px + "px";
					// z-index 必须**高于**官方面板的 10（.P3OORG_panel{z-index:10}）：两者同在那一格的
					// 堆叠上下文里，低于它就会被压在官方面板下面（看得见格子、看不见下界）。
					host.style.zIndex = "20";
					host.style.pointerEvents = "auto";
				} catch { /* ignore */ }
				if (host.parentElement !== col) {
					try { col.appendChild(host); } catch (e) {
						vkCmdProbe({ err: "宿主插入失败：" + String(e && e.message ? e.message : e), inCol: false });
						col = null;
						return;
					}
				}
				if (pinnedPx !== px) {
					pinnedPx = px;
					try {
						col.style.paddingBottom = px + "px";
					} catch { /* ignore */ }
				}
				// 「分割」实证：padding 先试，**每次实读**两个 rect 判它到底有没有把官方面板抬起来；
				// 还重叠才动官方盒子的内联 bottom（见 splitCheck 上面那段实测）。
				const split = splitCheck(px);
				vkCmdProbe({
					colFound: true, inCol: host.parentElement === col, colWidth, pinnedPx: px, panelRendered: host.childElementCount > 0, err: null,
					split: split.mode, splitGap: split.gap, splitOverlap: split.overlap, splitPanelH: split.panelH, touchedOfficial: split.touchedOfficial
				});
				// 面板标题栏那行诊断（用户在真机上直接读，不用开控制台）。
				// 缩放那条**放在最前面**：这一行 max-width:46% + nowrap + ellipsis，只有开头一定看得见；
				// 完整串在 span 的 title 属性里（也能用 __VK_CMD_DIAG__() 读）。
				vkCmdStore.setDiag((vkZoomNote.text === "" ? "" : vkZoomNote.text + " · ") +
					"col=" + String(colWidth) + "x" + (() => { try { return Math.round(col.getBoundingClientRect().height); } catch { return -1; } })() +
					" pad=" + String(px) +
					" 分=" + vkCmdText(split.mode) + "(gap=" + vkCmdText(split.gap) + ",面板" + vkCmdText(split.panelH) + "px)" +
					" inCol=" + (host.parentElement === col ? "1" : "0") +
					" clip=" + vkCmdText(vkCmdClipAncestor(col)) +
					" · " + VK_CMD_BUILD);
			};
			tick();
			const timer = window.setInterval(tick, 1000);
			const onResize = () => tick();
			try { window.addEventListener("resize", onResize); } catch { /* ignore */ }
			const off = vkCmdStore.subscribe(tick);
			try { globalThis.__VK_CMD_TICK__ = tick; } catch { /* ignore */ }
			return () => {
				try { window.clearInterval(timer); } catch { /* ignore */ }
				try { window.removeEventListener("resize", onResize); } catch { /* ignore */ }
				try { off(); } catch { /* ignore */ }
				detach();
			};
		}

		/**
		 * 顶栏第 4 颗按钮（原生 DOM，不用 React）：1s 轮询补挂进
		 * [data-dockkit-strip-chrome]（官方重渲染会重建这个盒子，所以必须反复补）。
		 * 按钮的开关态直接订阅 store，与面板是否挂载无关。
		 */
		function vkCmdInstallButton() {
			const box = document.createElement("span");
			box.setAttribute("data-vk-cmd-strip-host", "true");
			box.style.cssText = "display:inline-flex;align-items:center;flex:none;";
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "vk_cmdChromeBtn";
			btn.setAttribute("data-vk-cmd-toggle", "true");
			box.appendChild(btn);
			const sync = () => {
				const on = vkCmdStore.open === true && vkCmdStore.paneOpen === true;
				btn.className = "vk_cmdChromeBtn" + (on ? " vk_cmdChromeBtnOn" : "");
				btn.title = vkCmdStore.paneCollapsed === true
					? "命令行：拓展栏这一格现在是 0 宽（收起态），先展开拓展栏"
					: (on ? "收起命令行（下界）" : "打开命令行（下界：持久 PowerShell 会话）");
				btn.setAttribute("aria-label", on ? "收起命令行" : "打开命令行");
				btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;display:block">' + _VK_ICONS.panelBottom + "</svg>";
			};
			btn.addEventListener("click", (event) => {
				try { event.stopPropagation(); } catch { /* ignore */ }
				vkCmdStore.setOpen(vkCmdStore.open !== true);
			});
			const pump = () => {
				sync();
				let chrome = null;
				try { chrome = document.querySelector("[data-dockkit-strip-chrome]"); } catch { chrome = null; }
				if (chrome === null) {
					vkCmdProbe({ chrome: false, buttonInChrome: false });
					return;
				}
				if (box.parentElement !== chrome) {
					try { chrome.appendChild(box); } catch { /* ignore */ }
				}
				vkCmdProbe({ chrome: true, buttonInChrome: box.parentElement === chrome });
			};
			pump();
			const timer = window.setInterval(pump, 1000);
			const off = vkCmdStore.subscribe(sync);
			return () => {
				try { window.clearInterval(timer); } catch { /* ignore */ }
				try { off(); } catch { /* ignore */ }
				try { if (box.parentElement !== null) box.parentElement.removeChild(box); } catch { /* ignore */ }
			};
		}

		/** 在拓展栏里打开「本机文件」页签（复用自研已有 files 类型入口）。 */
		function vkCmdOpenLocalFiles() {
			try {
				const sr = ctxRef.current === null ? void 0 : ctxRef.current.get("sidebarRight");
				if (sr !== undefined && sr !== null && typeof sr.openTab === "function") {
					sr.openTab(PICK_TAB_KIND, {});
					return true;
				}
			} catch { /* 没有官方右栏服务时静默 */ }
			return false;
		}

		/** 下界面板本体（只有 open 时才被渲染；这里只管内部，自己的高宽由宿主给）。 */
		function VK_CmdPanel() {
			const cmd = useVkCmdStore();
			const [view, setView] = react.useState(vkCmdUi.view);
			const [draft, setDraft] = react.useState(vkCmdUi.draft);
			const [filter, setFilter] = react.useState(vkCmdUi.filter);
			const [histAt, setHistAt] = react.useState(-1);
			const bodyRef = react.useRef(null);
			const inputRef = react.useRef(null);
			const lastSeqRef = react.useRef("");
			react.useEffect(() => { vkCmdUi.view = view; }, [view]);
			react.useEffect(() => { vkCmdUi.draft = draft; }, [draft]);
			react.useEffect(() => { vkCmdUi.filter = filter; }, [filter]);

			// 取数：GET /vscode-files/exec（用户命令）+ GET /vscode-files/agent-shell?session=（Agent 的调用）
			// 两条独立容错：agent 那条失败不该让用户命令流黑掉。
			react.useEffect(() => {
				if (cmd.open !== true) return void 0;
				let dead = false;
				const step = async () => {
					if (dead) return;
					try {
						const res = await fetch("/vscode-files/exec", { cache: "no-store" });
						const data = await res.json();
						if (dead) return;
						if (data && data.ok) setView((prev) => ({ ...prev, jobs: Array.isArray(data.jobs) ? data.jobs : [], shell: data.shell ?? null, ok: true, err: null }));
						else setView((prev) => ({ ...prev, ok: false, err: (data && data.error) || "取数失败" }));
					} catch (error) {
						if (!dead) setView((prev) => ({ ...prev, ok: false, err: String(error) }));
					}
					try {
						const sid = vkCurrentSessionId();
						if (sid.length > 0) {
							const res = await fetch("/vscode-files/agent-shell?session=" + encodeURIComponent(sid), { cache: "no-store" });
							const data = await res.json();
							if (dead) return;
							if (data && data.ok) setView((prev) => ({ ...prev, agent: Array.isArray(data.calls) ? data.calls : [], agentErr: null }));
						}
					} catch (error) {
						if (!dead) setView((prev) => ({ ...prev, agentErr: String(error) }));
					}
				};
				step();
				const timer = window.setInterval(step, VK_CMD_POLL_MS);
				return () => { dead = true; window.clearInterval(timer); };
			}, [cmd.open]);

			// 有新输出就自动滚到底（任务数 / Agent 调用数 / 输出长度任一变化都算）
			react.useEffect(() => {
				let newest = 0;
				for (const job of view.jobs) newest = Math.max(newest, typeof job.output === "string" ? job.output.length : 0);
				for (const call of view.agent ?? []) newest = Math.max(newest, typeof call.output === "string" ? call.output.length : 0);
				const seq = String(view.jobs.length) + ":" + String((view.agent ?? []).length) + ":" + String(newest);
				if (seq === lastSeqRef.current) return;
				lastSeqRef.current = seq;
				const el = bodyRef.current;
				if (el !== null) { try { el.scrollTop = el.scrollHeight; } catch { /* ignore */ } }
			}, [view]);

			// 输入框高度跟随内容（1~5 行）
			react.useEffect(() => {
				const el = inputRef.current;
				if (el === null) return;
				try {
					el.style.height = "auto";
					el.style.height = Math.min(120, Math.max(20, el.scrollHeight)) + "px";
				} catch { /* ignore */ }
			}, [draft]);

			const running = view.jobs.some((job) => job.status === "running" || job.status === "queued");
			const shellAlive = view.shell !== null && view.shell.alive === true;
			const cwd = view.shell !== null && typeof view.shell.cwd === "string" && view.shell.cwd.length > 0 ? view.shell.cwd : "";

			const send = async () => {
				const text = draft;
				if (text.trim().length === 0) return;
				vkCmdStore.pushHistory(text);
				setHistAt(-1);
				const id = "c" + String(Date.now()) + "-" + String(++vkCmdSeq);
				let queued = false;
				try {
					const res = await fetch("/vscode-files/exec", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ id, command: text })
					});
					const data = await res.json();
					if (data && data.ok) { queued = true; setDraft(""); }
					else setView((prev) => ({ ...prev, err: (data && data.error) || "命令未能入队" }));
				} catch (error) {
					setView((prev) => ({ ...prev, err: String(error) }));
				}
				if (queued) {
					try {
						const res = await fetch("/vscode-files/exec", { cache: "no-store" });
						const data = await res.json();
						if (data && data.ok) setView((prev) => ({ ...prev, jobs: Array.isArray(data.jobs) ? data.jobs : [], shell: data.shell ?? null, ok: true, err: null }));
					} catch { /* 下一轮轮询会补上 */ }
				}
			};
			const onKeyDown = (event) => {
				if (event.key === "Enter" && event.shiftKey !== true) {
					event.preventDefault();
					send();
					return;
				}
				if (event.key === "ArrowUp" && (draft.length === 0 || histAt >= 0)) {
					const list = cmd.history;
					if (list.length === 0) return;
					event.preventDefault();
					const next = histAt < 0 ? list.length - 1 : Math.max(0, histAt - 1);
					setHistAt(next);
					setDraft(list[next]);
					return;
				}
				if (event.key === "ArrowDown" && histAt >= 0) {
					event.preventDefault();
					const list = cmd.history;
					const next = histAt + 1;
					if (next >= list.length) { setHistAt(-1); setDraft(""); }
					else { setHistAt(next); setDraft(list[next]); }
				}
			};
			const clearAll = async () => {
				try {
					await fetch("/vscode-files/exec/clear", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
					const sid = vkCurrentSessionId();
					if (sid.length > 0) {
						await fetch("/vscode-files/agent-shell", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ session: sid }) });
					}
					const res = await fetch("/vscode-files/exec", { cache: "no-store" });
					const data = await res.json();
					if (data && data.ok) setView((prev) => ({ ...prev, jobs: Array.isArray(data.jobs) ? data.jobs : [], agent: [], shell: data.shell ?? null, ok: true, err: null }));
				} catch (error) {
					setView((prev) => ({ ...prev, err: String(error) }));
				}
			};
			/** 把一条命令抄回输入框（Agent 条目用；用户自己的历史在 ↑↓ 里）。 */
			const toDraft = (text) => {
				setDraft(text);
				setHistAt(-1);
				try { if (inputRef.current !== null) inputRef.current.focus(); } catch { /* ignore */ }
			};

			// 同一条终端流：用户命令（可交互）与 Agent 的 shell 调用（只读）按时间合流
			const timeline = [];
			for (const job of view.jobs) timeline.push({ kind: "user", at: job.startedAt ?? 0, job });
			for (const call of view.agent ?? []) timeline.push({ kind: "agent", at: call.at ?? 0, call });
			timeline.sort((a, b) => a.at - b.at);
			const needle = filter.trim().toLowerCase();
			const hit = (text) => needle.length === 0 || String(text ?? "").toLowerCase().includes(needle);

			const rows = [];
			for (const item of timeline) {
				if (item.kind === "agent") {
					const call = item.call;
					if (hit(call.command) !== true && hit(call.output) !== true) continue;
					const meta = call.status === "running"
						? "运行中…"
						: call.isError === true
							? "失败 · " + String(call.tool)
							: "完成 · " + String(call.tool);
					rows.push(h("div", { key: "ag-" + call.callId + "-cmd", className: "vk_cmdCmd vk_cmdCmdAgent", title: "Agent 在本会话执行的 " + String(call.tool) },
						h("span", { className: "vk_cmdCmdMark" }, "🤖"),
						h("span", { className: "vk_cmdCmdText" }, call.command),
						h("button", { type: "button", className: "vk_cmdCopyBtn", title: "把这条命令抄进输入框（可改后再跑）", onClick: () => toDraft(call.command) }, "抄回"),
						h("span", { className: "vk_cmdCmdMeta" }, meta)
					));
					if (typeof call.output === "string" && call.output.length > 0) {
						rows.push(h("pre", { key: "ag-" + call.callId + "-out", className: "vk_cmdOut" + (call.isError === true ? " vk_cmdOutErr" : "") }, call.output));
					}
					continue;
				}
				const job = item.job;
				if (job.system === true) {
					if (needle.length > 0) continue;
					rows.push(h("pre", { key: job.id, className: "vk_cmdOut vk_cmdOutSys" }, job.output || ""));
					continue;
				}
				if (hit(job.command) !== true && hit(job.output) !== true) continue;
				const metaText = job.status === "running" || job.status === "queued"
					? "运行中…"
					: job.error !== null && job.error !== undefined
						? "失败 · " + String(job.error)
						: job.exitCode === 0 || job.exitCode === null
							? "完成 · 0"
							: "完成 · 代码 " + String(job.exitCode);
				rows.push(h("div", { key: job.id + "-cmd", className: "vk_cmdCmd" },
					h("span", { className: "vk_cmdCmdText" }, job.command),
					h("span", { className: "vk_cmdCmdMeta" + (job.status === "done" && (job.exitCode === 0 || job.exitCode === null) ? " vk_cmdMetaOk" : "") }, metaText)
				));
				if (typeof job.output === "string" && job.output.length > 0) {
					rows.push(h("pre", { key: job.id + "-out", className: "vk_cmdOut" + (job.status === "error" || job.exitCode ? " vk_cmdOutErr" : "") },
						job.output + (job.truncated === true ? "\n… （输出已截断）" : "")));
				}
			}
			const empty = rows.length === 0;
			const counts = { user: view.jobs.filter((job) => job.system !== true).length, agent: (view.agent ?? []).length };

			return h("div", { className: "vk_cmdPanel", "data-vk-cmd-panel": "true" },
				h("div", { className: "vk_cmdHandle", "data-vk-cmd-handle": "true", title: "拖动调整命令行高度", onPointerDown: (event) => {
					try {
						event.preventDefault();
						const panel = event.currentTarget.parentElement;
						const startY = event.clientY;
						const startH = panel === null ? vkCmdStore.height : (panel.getBoundingClientRect().height / Math.max(1, window.innerHeight)) * 100;
						const handle = event.currentTarget;
						try { handle.setPointerCapture(event.pointerId); } catch { /* ignore */ }
						handle.dataset.dragging = "1";
						const move = (ev) => {
							const deltaPct = ((startY - ev.clientY) / Math.max(1, window.innerHeight)) * 100;
							vkCmdStore.setHeight(startH + deltaPct);
						};
						const up = () => {
							delete handle.dataset.dragging;
							try { handle.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
							handle.removeEventListener("pointermove", move);
							handle.removeEventListener("pointerup", up);
							handle.removeEventListener("pointercancel", up);
						};
						handle.addEventListener("pointermove", move);
						handle.addEventListener("pointerup", up);
						handle.addEventListener("pointercancel", up);
					} catch { /* ignore */ }
				} }),
				h("div", { className: "vk_cmdHead" },
					h("span", { className: "vk_cmdTitle" }, h(VIcon, { name: "terminal", size: 13 }), "命令行"),
					h("span", { className: "vk_cmdCwd", title: cwd.length > 0 ? "当前目录：" + cwd : "当前目录（第一条命令后出现）" }, cwd.length > 0 ? cwd : VK_CMD_BUILD),
					// 就地诊断：真机上肉眼可见（不开控制台就能把故障定位到「哪一格/多宽/被谁裁」）
					h("span", { className: "vk_cmdDiag", "data-vk-cmd-diag": "true", title: "落位诊断：" + cmd.diag }, cmd.diag),
					h("span", { className: "vk_cmdBadge", title: view.shell !== null && view.shell.exe ? view.shell.exe : "shell" },
						shellAlive ? "运行中" : running ? "排队中" : "空闲"),
					h("span", { style: { flex: 1 } }),
					h("button", { type: "button", className: "vk_cmdTextBtn", title: "在拓展栏里打开本机文件（应用内浏览）", onClick: () => vkCmdOpenLocalFiles() }, "打开文件"),
					h("button", { type: "button", className: "vk_cmdIconBtn", title: "清屏（只清已完成的输出）", onClick: clearAll }, h(VIcon, { name: "trash", size: 13 })),
					h("button", { type: "button", className: "vk_cmdIconBtn", title: "收起命令行", "data-vk-cmd-hide": "true", onClick: () => vkCmdStore.setOpen(false) }, h(VIcon, { name: "chevronDown", size: 14 }))
				),
				h("div", { className: "vk_cmdBody", ref: bodyRef },
					h("div", { className: "vk_cmdHead vk_cmdSticky" },
						h("span", { className: "vk_cmdTitle" }, "本会话 " + String(counts.user) + " 条 · Agent " + String(counts.agent) + " 条"),
						h("span", { style: { flex: 1 } }),
						h("input", {
							className: "vk_cmdFilter",
							type: "search",
							placeholder: "筛选命令/输出…",
							value: filter,
							onChange: (event) => setFilter(event.target.value)
						}),
						filter.length > 0 ? h("button", { type: "button", className: "vk_cmdTextBtn", title: "清掉筛选", onClick: () => setFilter("") }, "清除") : null
					),
					view.err !== null ? h("div", { className: "vk_err" }, "命令行后端不可用：" + view.err) : null,
					view.agentErr !== null && view.agentErr !== void 0 ? h("div", { className: "vk_err" }, "Agent 调用采集不可用：" + view.agentErr) : null,
					cmd.paneCollapsed === true ? h("div", { className: "vk_err" }, "拓展栏这一格现在是 0 宽（收起态）：先点官方那颗「展开拓展栏」按钮把它展开，下界才有地方落。") : null,
					empty
						? (needle.length > 0
							? h("div", { className: "vk_cmdEmpty" }, "没有匹配「" + filter + "」的命令")
							: h("div", { className: "vk_cmdEmpty" }, "在这里输入命令，回车执行（Shift+Enter 换行，↑↓ 翻历史）。会话持久：cd 与变量跨命令保留。Agent 在本会话执行的 shell 命令会自动出现在这条流里（🤖 标记，只读）。"))
						: null,
					rows
				),
				h("div", { className: "vk_cmdInputRow" },
					h("span", { className: "vk_cmdPrompt" }, "PS>"),
					h("textarea", {
						className: "vk_cmdInput",
						ref: inputRef,
						rows: 1,
						spellCheck: false,
						placeholder: "输入命令…",
						value: draft,
						onChange: (event) => { setHistAt(-1); setDraft(event.target.value); },
						onKeyDown
					}),
					h("button", { type: "button", className: "vk_cmdRun", disabled: draft.trim().length === 0, onClick: send }, "运行")
				)
			);
		}

		// ══════════════════════════════════════════════════════════════
		// 右栏下段 v2（2026-09-17）：**唯一内容 = 官方真终端**
		//   · 进程 = 官方 PTY（webTerminals，dsh-api-terminal-controller）；
		//     屏幕 = 官方 TerminalBody（dsh-client-ui-sidebar-terminal 注册在
		//     sidebar.right.pane.tab 的那条 entry）。官方包一行未改。
		//   · 「我们的壳」保留：.vk_cmdPanel 容器 / .vk_cmdHandle 拖高 / .vk_cmdHead / 收起按钮；
		//     右栏开合按钮在另一段原生 DOM 里（vkInstallButton），与本文件这段无关。
		//   · 本期接受丢掉：Agent 命令合流、命令抄回输入框、退出码标记、筛选/清屏、
		//     自研持久 PowerShell 会话的 cwd 展示。后端路由（dsh-host-files 的
		//     shell-session.js / agent-shell.js）一行未动 —— 回退只需把挂载段里的
		//     h(VK_TerminalPanel) 换回 h(VK_CmdPanel)（VK_CmdPanel 源码整块保留）。
		//   · 生命周期：收起（open=false → render(null)）与切会话都**不杀进程**
		//     （官方 mount() 的 cleanup 是 detach，重开恢复屏幕）；本期不主动 view.close()。
		// ══════════════════════════════════════════════════════════════
		/** 下段终端在官方 view 索引里的 key（固定；会话切换靠 sessionId 换索引，不换 key）。 */
		const VK_TERM_KEY = "vk-cmdline-term";
		/** 自己实现的 useTabInfo 返回的「页签」：id 必须 = 上面那个 key（TerminalBody 用它调 view/useTerminal）。 */
		const VK_TERM_TAB = { id: VK_TERM_KEY, title: "终端", visible: true };
		const VK_TERM_ENTRY_ID = "@deepseek-ai/dsh-client-ui-sidebar-terminal";
		/** 官方那个 entry 的 locale 命名空间（官方源码里就是这么注册的）。 */
		const VK_TERM_LOCALE = "sidebarTerminal";
		const VK_TERM_TRIES = 40;
		const VK_TERM_INTERVAL = 500;
		/** 拿不到 store 时的空快照（保证 hooks 调用链稳定，不抛）。 */
		const VK_TERM_EMPTY_STORE = { subscribe: () => () => {}, getSnapshot: () => void 0 };
		/**
		 * 服务不可用时的哑 view：让官方 TerminalBody 照常挂载（显示 loading）而不是在渲染期抛错
		 * ——「渲染期抛错 → 整棵树被卸载 → 下段空白」是本机 2026-09-17 踩过的坑。
		 */
		const VK_TERM_DEAD_VIEW = {
			state: VK_TERM_EMPTY_STORE,
			mount: () => () => {},
			connect: () => {},
			refresh: () => {},
			write: () => {},
			resize: () => {},
			rename: () => {},
			acknowledge: () => {},
			close: () => {}
		};
		/** 兜底文案（官方 locale 命名空间 sidebarTerminal 拿不到时用）。 */
		const VK_TERM_TEXT_ZH = {
			loading: "正在加载…", creating: "正在创建终端…", connecting: "正在连接…", disconnected: "连接已断开",
			exited: (params) => "进程已退出（代码 " + String(params.code ?? "—") + "）",
			unavailable: "终端不可用", closed: "终端已关闭", readonly: "只读：", control: "接管",
			retry: "重试", reconnect: "重新连接", title: "终端",
			failed: (params) => "终端失败：" + String(params.message ?? "")
		};
		const VK_TERM_TEXT_EN = {
			loading: "Loading…", creating: "Creating terminal…", connecting: "Connecting…", disconnected: "Disconnected",
			exited: (params) => "Exited (code " + String(params.code ?? "—") + ")",
			unavailable: "Unavailable", closed: "Closed", readonly: "Read-only:", control: "Take control",
			retry: "Retry", reconnect: "Reconnect", title: "Terminal",
			failed: (params) => "Terminal failed: " + String(params.message ?? "")
		};

		/**
		 * 官方终端条目：从 sidebar.right.pane.tab 的 entries 里找。
		 * 条目的字段形状是官方插槽给的，不保证每个字段都在 —— 所以按**多信号**认：key / id / name
		 * 命中官方包名、locale 命中 sidebarTerminal、或组件函数名就是 TerminalBody，任一命中即取。
		 * 命中信号写进 __VK_TERM_DIAG__（真机一眼看出「找到没 / 凭哪条认的 / 一共几条候选」）；
		 * 都没中就返回 null（面板显示等待态，不抛）。
		 */
		function vkTerminalEntry() {
			try {
				const ctx = ctxRef.current;
				if (ctx === null || ctx === void 0) return null;
				const entries = typeof ctx.slots.entries === "function" ? ctx.slots.entries("sidebar.right.pane.tab") : [];
				const seen = [];
				for (const entry of entries) {
					if (entry === null || entry === void 0) continue;
					const component = entry.component;
					if (typeof component !== "function") continue;
					let why = null;
					if (entry.key === VK_TERM_ENTRY_ID) why = "key";
					else if (entry.id === VK_TERM_ENTRY_ID) why = "id";
					else if (entry.name === VK_TERM_ENTRY_ID) why = "name";
					else if (entry.locale === VK_TERM_LOCALE) why = "locale";
					else if (component.name === "TerminalBody") why = "componentName";
					if (why === null) { seen.push(typeof component.name === "string" && component.name.length > 0 ? component.name : "anonymous"); continue; }
					try { globalThis.__VK_TERM_DIAG__ = { found: true, why, count: entries.length, seen }; } catch { /* ignore */ }
					return entry;
				}
				try { globalThis.__VK_TERM_DIAG__ = { found: false, why: null, count: entries.length, seen }; } catch { /* ignore */ }
			} catch { /* 右栏服务未就绪：面板显示等待态，不抛 */ }
			return null;
		}

		function vkTermFallback(key, params) {
			let en = false;
			try { en = String(window.navigator.language || "").toLowerCase().indexOf("en") === 0; } catch { en = false; }
			const table = en ? VK_TERM_TEXT_EN : VK_TERM_TEXT_ZH;
			const item = table[key];
			if (typeof item === "function") return item(params === null || params === void 0 ? {} : params);
			return item === void 0 ? key : item;
		}

		/** 文案：优先官方 locale.bind('sidebarTerminal')（与官方那条 entry 同一套），拿不到才自备。 */
		function vkTermText() {
			let bound = null;
			try {
				const locale = ctxRef.current === null || ctxRef.current === void 0 ? void 0 : ctxRef.current.locale;
				if (locale !== null && locale !== void 0 && typeof locale.bind === "function") bound = locale.bind("sidebarTerminal");
			} catch { bound = null; }
			if (typeof bound === "function") {
				return (key, params) => {
					try { return bound(key, params); } catch { return vkTermFallback(key, params); }
				};
			}
			return vkTermFallback;
		}

		/**
		 * 自己实现官方 TerminalBody 要的 5 个 props（照它的实现契约，不改官方包）。
		 *
		 * ⚠️ 真机教训（2026-09-17，DevTools 取证）：**绝不能用官方 entry 的 inject().view**。
		 * 官方那条 view 会先查官方右栏的 tab domain（「这个 key 在官方右栏里是不是一个已提交的
		 * 标签页」）——我们的下段 key 不是官方 tab，调用即抛
		 *   sidebarRight: tab "vk-cmdline-term" has no committed occurrence in session "…"
		 * → 渲染期抛错 → 整棵 React 树卸载 → 下段空白且毫无提示。
		 * 正解：走官方终端服务 ctx.get('webTerminals')（纯服务，**不碰 tab domain**）+ 插件自己的
		 * ctx.theme。服务调用一律在调用点兜错（任何异常都不许冒到渲染期）。
		 * @returns props 对象；会话还没就绪时返回 null（服务拿不到则返回哑 view，由出题态提示接管）。
		 */
		function vkTerminalProps(entry, sid) {
			if (sid.length === 0) return null;
			let svc = null;
			let svcErr = null;
			try { svc = ctxRef.current.get("webTerminals"); } catch (error) { svcErr = String(error && error.message ? error.message : error); }
			const usable = svc !== null && svc !== void 0 && typeof svc.view === "function";
			const callErr = { error: svcErr };
			/** 调服务取 view；**调用点兜错**（服务侧异常绝不冒到渲染期，否则整棵树被卸载）。 */
			const callView = (key) => {
				if (usable !== true) return null;
				try {
					const v = svc.view(sid, key);
					return v === null || v === void 0 ? null : v;
				} catch (error) {
					callErr.error = String(error && error.message ? error.message : error);
					return null;
				}
			};
			const view = (key) => {
				const v = callView(key);
				return v === null ? VK_TERM_DEAD_VIEW : v;
			};
			const storeOf = (key) => {
				const v = callView(key);
				return v === null ? null : v.state;
			};
			const via = usable === true ? "service" : "none";
			let themeObs = null;
			try {
				const ctx = ctxRef.current;
				if (ctx !== null && ctx !== void 0 && ctx.theme !== null && ctx.theme !== void 0) {
					themeObs = { getSnapshot: () => ctx.theme.getTheme(), subscribe: (listener) => ctx.on("theme/change", listener) };
				}
			} catch { themeObs = null; }
			if (themeObs === null) themeObs = { getSnapshot: () => void 0, subscribe: () => () => {} };
			// 就地诊断：真机「空白无提示」时，这几项就是根因（拿到哪条路 / 快照有没有 / 抛没抛）。
			let store = null;
			let probeErr = null;
			try { store = storeOf(VK_TERM_KEY); } catch (error) { probeErr = String(error && error.message ? error.message : error); }
			const probe = { via, sid, storeOk: store !== null && store !== void 0, probeErr, callErr: callErr.error };
			try { globalThis.__VK_TERM_DIAG__ = Object.assign(globalThis.__VK_TERM_DIAG__ ?? {}, probe); } catch { /* 痕迹只给排查用 */ }
			const useTabInfo = () => ({ tab: VK_TERM_TAB });
			const useTheme = (select) => {
				const ref = react.useRef(null);
				if (ref.current === null || ref.current.obs !== themeObs) {
					const cell = { obs: themeObs, sel: select, has: false, value: void 0, subs: new Set(), off: null, subscribe: null, snapshot: null };
					// ⚠️ 快照**只在主题变更通知时重算**：useSyncExternalStore 一旦每次拿到新对象就判定「变了」，
					// 立刻无限重渲染（实测：Maximum update depth exceeded + 整块白屏）。
					// 主题源换实现（getTheme() 每次返新对象）也照样稳。
					cell.subscribe = (fn) => {
						cell.subs.add(fn);
						if (cell.subs.size === 1) {
							cell.off = cell.obs.subscribe(() => {
								cell.has = false;
								for (const listener of [...cell.subs]) { try { listener(); } catch { /* ignore */ } }
							});
						}
						return () => {
							cell.subs.delete(fn);
							if (cell.subs.size === 0 && typeof cell.off === "function") {
								try { cell.off(); } catch { /* ignore */ }
								cell.off = null;
							}
						};
					};
					cell.snapshot = () => {
						if (cell.has !== true) { cell.value = cell.sel(cell.obs.getSnapshot()); cell.has = true; }
						return cell.value;
					};
					ref.current = cell;
				}
				const cell = ref.current;
				cell.sel = select;
				if (typeof react.useSyncExternalStore !== "function") return cell.snapshot();
				return react.useSyncExternalStore(cell.subscribe, cell.snapshot);
			};
			const useTerminal = (key) => {
				const store = storeOf(key);
				const ref = react.useRef(null);
				if (ref.current === null || ref.current.store !== store) {
					const cell = {
						store,
						target: store === null || store === void 0 ? VK_TERM_EMPTY_STORE : store,
						has: false,
						value: void 0,
						subscribe: null,
						snapshot: null
					};
					// ⚠️ 与 useTheme 同一条铁律：**getSnapshot 必须返回稳定引用**。
					// 直接透传 store.getSnapshot() 时，只要快照源每次调用都返新对象（快照库实现差异），
					// useSyncExternalStore 就判定「一直变了」→ Maximum update depth exceeded →
					// 整棵 React 树被卸载 → 下段**空白且无任何提示**（无错误边界时什么都看不到）。
					// 这里缓存值：只有订阅回调真的到达才失效，下一次 snapshot 才重算。
					cell.subscribe = (fn) => cell.target.subscribe(() => { cell.has = false; fn(); });
					cell.snapshot = () => {
						if (cell.has !== true) { cell.value = cell.target.getSnapshot(); cell.has = true; }
						return cell.value;
					};
					ref.current = cell;
				}
				const cell = ref.current;
				if (typeof react.useSyncExternalStore !== "function") return cell.snapshot();
				return react.useSyncExternalStore(cell.subscribe, cell.snapshot);
			};
			return { useTabInfo, useTerminal, useTheme, view, t: vkTermText(), probe };
		}

		/**
		 * 终端错误边界：官方 TerminalBody 万一在渲染期抛错，React 会**卸载整棵树** → 下段空白、
		 * 一点提示都没有（就是本机 2026-09-17 那次观测到的现象）。这一层把错误就地显示出来，
		 * 并留在 globalThis.__VK_TERM_ERROR__ 里供取证；切换会话时 key 变 → 自动重建重试。
		 */
		class VK_TermBoundary extends react.Component {
			constructor(props) {
				super(props);
				this.state = { err: null };
			}
			static getDerivedStateFromError(error) {
				return { err: error };
			}
			componentDidCatch(error) {
				try { globalThis.__VK_TERM_ERROR__ = String(error && error.stack ? error.stack : error); } catch { /* 痕迹只给排查用 */ }
			}
			render() {
				if (this.state.err === null) return this.props.children;
				const message = this.state.err === null || this.state.err === void 0 ? "未知错误" : String(this.state.err.message ?? this.state.err);
				return h("div", { className: "vk_termNote" }, "官方终端渲染失败：" + message);
			}
		}

		/** 状态徽标：与官方 TerminalBody 用**同一套 props 契约**订阅同一个快照，把 phase 显示在标题行。 */
		function VK_TermBadge(input) {
			const props = input === null || input === void 0 ? null : input.props;
			if (props === null) return h("span", { className: "vk_cmdBadge" }, "—");
			const state = props.useTerminal(VK_TERM_KEY);
			if (state === void 0 || state === null) return h("span", { className: "vk_cmdBadge" }, "无快照");
			const info = state.info;
			const alive = info !== null && info !== void 0 && typeof info.state === "string" ? "·" + info.state : "";
			return h("span", { className: "vk_cmdBadge", title: "终端状态（官方快照）" }, String(state.phase) + alive);
		}

		/**
		 * 下界面板 v2 本体：壳照旧（拖高 / 标题 / 收起），正文 = 官方 TerminalBody。
		 * 只在 open 时被渲染（收起即整棵卸载，进程不动）。
		 */
		function VK_TerminalPanel() {
			const cmd = useVkCmdStore();
			const [entry, setEntry] = react.useState(() => vkTerminalEntry());
			const [sid, setSid] = react.useState(() => vkCurrentSessionId());
			const [waited, setWaited] = react.useState(false);

			// 官方终端条目就绪轮询：照 vkAttemptRightPane 的既有模式（有上限，到顶就显示失败文案，不抛）
			react.useEffect(() => {
				if (entry !== null) return void 0;
				let tries = 0;
				let timer = 0;
				const tick = () => {
					const found = vkTerminalEntry();
					if (found !== null) { setEntry(found); return; }
					tries += 1;
					if (tries >= VK_TERM_TRIES) { setWaited(true); return; }
					timer = window.setTimeout(tick, VK_TERM_INTERVAL);
				};
				tick();
				return () => { try { window.clearTimeout(timer); } catch { /* ignore */ } };
			}, [entry]);

			// 会话切换：官方 view 按 (sessionId, key) 索引 —— 换会话就换 view，旧会话的进程**不杀**（切回即恢复）
			react.useEffect(() => {
				const tick = () => {
					const next = vkCurrentSessionId();
					setSid((prev) => (prev === next ? prev : next));
				};
				const timer = window.setInterval(tick, VK_CMD_POLL_MS);
				return () => { try { window.clearInterval(timer); } catch { /* ignore */ } };
			}, []);

			const props = entry === null ? null : vkTerminalProps(entry, sid);
			const diag = (() => { try { return globalThis.__VK_TERM_DIAG__ ?? null; } catch { return null; } })();
			let note = "";
			if (entry === null) {
				const count = diag === null || diag.count === void 0 ? "?" : String(diag.count);
				note = waited
					? "官方终端服务未加载（候选 " + count + " 条，一条都没认出来 —— 看 __VK_TERM_DIAG__.seen）"
					: "正在等待官方终端服务…（候选 " + count + " 条）";
			} else if (props === null) {
				note = sid.length === 0 ? "正在等待会话…" : "官方终端入口不可用（webTerminals 拿不到）";
			} else if (props.probe.storeOk !== true) {
				const why = props.probe.probeErr !== null ? props.probe.probeErr : props.probe.callErr;
				note = "官方终端服务不可用（via=" + props.probe.via + "）" + (why === null ? "" : "：" + why);
			}

			return h("div", { className: "vk_termPanel", "data-vk-cmd-panel": "true" },
				h("div", { className: "vk_cmdHandle", "data-vk-cmd-handle": "true", title: "拖动调整终端高度", onPointerDown: (event) => {
					try {
						event.preventDefault();
						const panel = event.currentTarget.parentElement;
						const startY = event.clientY;
						const startH = panel === null ? vkCmdStore.height : (panel.getBoundingClientRect().height / Math.max(1, window.innerHeight)) * 100;
						const handle = event.currentTarget;
						try { handle.setPointerCapture(event.pointerId); } catch { /* ignore */ }
						handle.dataset.dragging = "1";
						const move = (ev) => {
							const deltaPct = ((startY - ev.clientY) / Math.max(1, window.innerHeight)) * 100;
							vkCmdStore.setHeight(startH + deltaPct);
						};
						const up = () => {
							delete handle.dataset.dragging;
							try { handle.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
							handle.removeEventListener("pointermove", move);
							handle.removeEventListener("pointerup", up);
							handle.removeEventListener("pointercancel", up);
						};
						handle.addEventListener("pointermove", move);
						handle.addEventListener("pointerup", up);
						handle.addEventListener("pointercancel", up);
					} catch { /* ignore */ }
				} }),
				h("div", { className: "vk_cmdHead" },
					h("span", { className: "vk_cmdTitle" }, h(VIcon, { name: "terminal", size: 13 }), "终端"),
					h("span", { className: "vk_cmdCwd", title: "官方本机 PTY（PowerShell）· 会话 " + (sid.length > 0 ? sid : "—") },
						sid.length > 0 ? "官方 PTY · " + vkCmdText(vkTermSessionLabel(sid)) : "等待会话"),
					// 就地诊断：真机上肉眼可见（不开控制台就能把故障定位到「哪一格/多宽/被谁裁」）
					h("span", { className: "vk_cmdDiag", "data-vk-cmd-diag": "true", title: "落位诊断：" + cmd.diag }, cmd.diag),
					props === null
						? h("span", { className: "vk_cmdBadge" }, entry === null ? "等待服务" : "—")
						: h(VK_TermBadge, { key: "vk-term-badge", props }),
					h("span", { style: { flex: 1 } }),
					h("button", { type: "button", className: "vk_cmdIconBtn", title: "收起终端", "data-vk-cmd-hide": "true", onClick: () => vkCmdStore.setOpen(false) }, h(VIcon, { name: "chevronDown", size: 14 }))
				),
				h("div", { className: "vk_termHost", "data-vk-term-host": "true" },
					note.length > 0 ? h("div", { className: "vk_termNote" }, note) : null,
					props === null ? null : h(VK_TermBoundary, { key: "vk-term-bound-" + sid },
						h(entry.component, Object.assign({ key: "vk-term-" + sid }, props))
					)
				)
			);
		}

		/** 会话标签（标题行显示用；只读前 8 位，不做任何会话状态推断）。 */
		function vkTermSessionLabel(sid) {
			return sid.length > 8 ? sid.slice(0, 8) : sid;
		}

		// ══════════════════════════════════════════════════════════════
		// 「新建终端」入口重定向（2026-09-17 用户要求）：
		//   点官方那几处「新建终端」不许在上段开官方标签，**直接展开下段终端**（只留下段这一个终端）。
		//   官方入口的 DOM 锚点是它自己给的：TerminalGuide 渲染的根节点带
		//   `data-sidebar-right-guide-entry="terminal"`，里面的主按钮 onClick 就是
		//   `tab.actions.openTab("terminal", { replaceTab: true })`；旁边那颗 chevron 展开 shell 菜单后
		//   也是 `openTab("terminal", { params: { shellPath } })`。两条都在这个根节点里。
		//   拦法：document **捕获阶段**吃 click 并 stopPropagation —— React 17+ 把合成事件挂在 root
		//   容器上，document 捕获早于它，于是官方 onClick 根本不执行、官方标签不会被创建。
		//   处理函数同时挂在 __VK_TERM_GUIDE_CLICK__ 上，供离线测试与真机取证直接调用。
		// ══════════════════════════════════════════════════════════════
		const VK_TERM_GUIDE_ATTR = "data-sidebar-right-guide-entry";
		const VK_TERM_GUIDE_KIND = "terminal";

		/** 从事件目标向上找官方「新建终端」入口；命中返回该节点，否则 null（不用 closest：垫片环境没有）。 */
		function vkGuideEntryOf(node) {
			let el = node !== null && node !== void 0 && node.nodeType === 3 ? node.parentElement : node;
			let depth = 0;
			while (el !== null && el !== void 0 && depth < 12) {
				try {
					if (typeof el.getAttribute === "function" && el.getAttribute(VK_TERM_GUIDE_ATTR) === VK_TERM_GUIDE_KIND) return el;
				} catch { return null; }
				el = el.parentElement;
				depth += 1;
			}
			return null;
		}

		/**
		 * 装上「新建终端 → 下段」拦截。
		 * @param ctx - 插件上下文（用它拿 sidebarRight 判断要不要先展开右栏）。
		 * @returns 卸载函数。
		 */
		function vkInstallTerminalGuideIntercept(ctx) {
			const handle = (event) => {
				try {
					if (event === null || event === void 0) return false;
					if (vkGuideEntryOf(event.target) === null) return false;
					if (typeof event.preventDefault === "function") event.preventDefault();
					if (typeof event.stopPropagation === "function") event.stopPropagation();
					try {
						const prev = globalThis.__VK_TERM_GUIDE_INTERCEPT__;
						globalThis.__VK_TERM_GUIDE_INTERCEPT__ = { at: Date.now(), count: (prev === null || prev === void 0 ? 0 : Number(prev.count) || 0) + 1 };
					} catch { /* 痕迹只给排查用 */ }
					// 右栏若被收起，先展开：下段要有落位的那一格
					try {
						const sr = ctx.get("sidebarRight");
						if (sr !== null && sr !== void 0 && typeof sr.isExpanded === "function" && sr.isExpanded() !== true && typeof sr.toggleExpanded === "function") sr.toggleExpanded();
					} catch { /* ignore */ }
					vkCmdStore.setOpen(true);
					return true;
				} catch { return false; }
			};
			try { globalThis.__VK_TERM_GUIDE_CLICK__ = handle; } catch { /* ignore */ }
			try { document.addEventListener("click", handle, true); } catch { /* ignore */ }
			return () => {
				try { document.removeEventListener("click", handle, true); } catch { /* ignore */ }
				try { if (globalThis.__VK_TERM_GUIDE_CLICK__ === handle) delete globalThis.__VK_TERM_GUIDE_CLICK__; } catch { /* ignore */ }
			};
		}

		exports.restartPhaseAfter = restartPhaseAfter;
		exports.restartButtonView = restartButtonView;
		exports.restartStatusNote = restartStatusNote;
		exports.RestartButton = RestartButton;
		exports.VK_ComposerFileSearch = VK_ComposerFileSearch;
		exports.vkInsertMentionOf = vkInsertMentionOf;
		exports.LayoutController = LayoutController;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
