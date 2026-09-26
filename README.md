# anoslide-plugins

`@anoslide` 命名空间的两个插件，合起来是一套 VS Code 式布局。

| 包 | 端 | 作用 |
|---|---|---|
| `dsh-host-files` | host | `/vscode-files/*` HTTP 接口：列目录 / 读文件、外部修改的预览-应用-放弃审批、Skill 与 MCP 管理、全局人设与文件树切换的 systemPrompt 注入 |
| `dsh-client-vscode-layout` | client | 三栏布局（左文件树 / 中多标签只读查看器 / 右对话）、审批弹窗（红旧绿新 diff，逐笔或全部应用） |

## 装

```sh
dsh plugin --profile web add file:<本仓库>/dsh-host-files
dsh plugin --profile web add file:<本仓库>/dsh-client-vscode-layout
```

装完重启 web 实例。

## 配置

| 项 | 位置 | 默认 |
|---|---|---|
| 全局人设文件 | `~/.dsh/global-persona.md` | 空（面板里可编辑） |
| 文件树落地页常用根 | `dsh-client-vscode-layout/lib/client.js` 的 `HOME_DIRS` | `[]`，按需补自己的目录 |
| 桌面快捷入口 | 同文件 `DESKTOP_HINT` | `D:\Desktop`，探测存在才显示 |

## 前提

- DSH 的 client 插件依赖官方 UI 包（`@deepseek-ai/dsh-client-ui-*`），由 DSH 运行时提供
- Office 文档预览需本机装 Office 或转换器，缺失时降级
