# 各客户端安装位置线索（供 `src/core/locate.js` 使用）

核查日期 2026-11-22。**✓ = 官方文档/仓库直述**，**△ = 官方机制推断或第三方来源**，**✗ = 查不到**。

检测顺序：配置目录 → 安装目录 → npm 全局包 → VS Code 扩展 / globalStorage → 注册表 App Paths → `where`/常见 bin → 开始菜单。

## 终端 / 编码 Agent

| 客户端 | CLI | npm 包 | 配置路径 | 程序/安装位置 | 可信度 |
|---|---|---|---|---|---|
| Claude Code | `claude` | `@anthropic-ai/claude-code` | `~/.claude/settings.json`、`~/.claude.json` | `~/.local/bin/claude.exe`、`~/.local/share/claude`；npm 全局 `%APPDATA%\npm\claude.cmd` | ✓ [setup](https://code.claude.com/docs/en/setup) |
| Codex CLI | `codex` | `@openai/codex` | `~/.codex/config.toml`（`CODEX_HOME` 可改） | npm 全局；原生安装目录 ✗ | ✓ 配置 / ✗ 目录 [env](https://learn.chatgpt.com/docs/config-file/environment-variables) |
| Gemini CLI | `gemini` | `@google/gemini-cli` | `~/.gemini/settings.json` | 仅 npm | ✓ [install](https://geminicli.com/docs/get-started/installation/) |
| Qwen Code | `qwen` | `@qwen-code/qwen-code` | `~/.qwen/settings.json` | 仅 npm | ✓ [settings](https://qwenlm.github.io/qwen-code-docs/1.x/en/users/settings/) |
| Kimi Code CLI | `kimi` | `@moonshot-ai/kimi-code` | `~/.kimi/`（文件名 ✗） | npm 全局；`brew install kimi-code` | ✓ 包名 / ✗ 文件名 [npm](https://registry.npmjs.org/@moonshot-ai/kimi-code/latest) |
| Grok Build | `grok` | 官方走安装脚本（npm `@xai-official/grok` 存疑） | `~/.grok/config.toml` | `~/.grok/bin/grok` | ✓ 配置 / ✗ Windows 目录 [settings](https://docs.x.ai/build/settings) |
| OpenCode | `opencode` | `opencode-ai` | `~/.config/opencode/opencode.json(c)`；机器级 `%ProgramData%\opencode` | npm 全局 / 独立 zip | ✓ [config](https://opencode.ai/docs/config/) |
| Crush | `crush` | `@charmland/crush` | **Windows** `%LOCALAPPDATA%\crush\crush.json`；*nix `~/.config/crush/` | 仅二进制 | ✓ [config](https://mintlify.wiki/charmbracelet/crush/configuration/overview) |
| Aider | `aider` | PyPI `aider-chat` | `~/.aider.conf.yml`、仓库根、cwd | `~/.local/bin/aider.exe`（pipx/uv tool） | ✓ [install](https://aider.chat/docs/install.html) |
| Copilot CLI | `copilot` | `@github/copilot` | `~/.copilot/settings.json`（`COPILOT_HOME` 可改） | npm 全局 | ✓ [config dir](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference) |
| Factory Droid | `droid` | — | `~/.factory/config.json` | 官方安装脚本，目录 ✗ | △ 配置（第三方佐证）/ ✗ 目录 |
| Pi | `pi` | `@earendil-works/pi-coding-agent`（旧 `@mariozechner/...`） | `~/.pi/` | npm 全局 | ✓ 包名迁移 [changelog](https://pi.dev/changelog/2026/5/7/pi-has-a-new-home) |
| iFlow CLI | `iflow` | `@iflow-ai/iflow-cli` | `~/.iflow/settings.json` | npm 全局 | ✓ [repo](https://github.com/iflow-ai/iflow-cli) |
| Hermes Agent | `hermes` | PyPI `hermes-agent` | `~/.hermes/config.yaml`、`.env` | `~/.hermes/hermes-agent/`、`~/.local/bin/hermes` | ✓ [config](https://hermes-agent.nousresearch.com/docs/zh-Hans/user-guide/configuration) |
| OpenClaw | `openclaw` | `openclaw` | `~/.openclaw/openclaw.json`、`~/.openclaw/workspace` | npm 全局 | ✓ [setup](https://docs2.openclaw.ai/pt-BR/start/setup) |
| MiniMax Code | **`mcode`** | — | 目录 ✗ | 官方安装脚本；另有桌面端 | ✓ 命令名 / ✗ 目录 [docs](https://platform.minimaxi.com/docs/m-plan/minimax-code) |

## 编辑器 / 插件

| 项目 | 扩展 ID / CLI | 扩展目录 | 配置 / globalStorage | 可信度 |
|---|---|---|---|---|
| Continue | 扩展 `continue.continue` | `.vscode/extensions/continue.continue-*` | `~/.continue/config.yaml` | ✓ [config](https://docs.continue.dev/guides/understanding-configs) |
| Cline | `saoudrizwan.claude-dev` | `.vscode/extensions/saoudrizwan.claude-dev-*` | `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev`；CLI 状态 `~/.cline/data` | ✓ 扩展名 / △ globalStorage [issue](https://github.com/cline/cline/issues/3983) |
| Roo Code | `rooveterinaryinc.roo-cline` | 遗留目录 | 同上式 | **⚠ 2026-05-15 官方停服并归档** [sunset](https://github.com/roocodeinc/roo-code-docs/blob/main/docs/sunset.md) |
| Kilo Code | `kilocode.kilo-code` | `.vscode/extensions/kilocode.kilo-code-*` | `~/.config/kilo/kilo.jsonc`；globalStorage `kilocode.kilo-code` | ✓ [settings](https://kilo.ai/docs/getting-started/settings) |
| Cursor | CLI `cursor` / `agent` | — | `%APPDATA%\Cursor` | ✓ [paths](https://cursor.com/docs/enterprise/endpoint-security) |
| Windsurf → **Devin Desktop**（2026-06 改名） | CLI `devin-desktop` | — | `%APPDATA%\Devin`；旧 `%APPDATA%\Windsurf`、`~/.codeium/windsurf` | ✓ [FAQ 路径表](https://docs.devin.ai/desktop/devin-desktop-faq) |
| Trae | 无公开 CLI | — | `~/.trae`（规则/记忆文档） | ✓ 配置 / ✗ 安装目录 [rules](https://docs.trae.ai/ide/rules) |
| Zed | winget `ZedIndustries.Zed` | `%LOCALAPPDATA%\Zed\extensions` | `%APPDATA%\Zed\settings.json` | ✓ [windows](https://zed.dev/docs/windows) |

## 桌面 / 网页客户端

| 客户端 | 程序目录 | 用户数据 | 可信度 |
|---|---|---|---|
| Cherry Studio | `%LOCALAPPDATA%\Programs\Cherry Studio` | `%APPDATA%\CherryStudio`（v1）；`~/.cherrystudio`（v2 根） | ✓ 数据 [storage](https://docs.cherry-studio-ai.com/pre-basic/personalization-settings/storage) / △ 程序目录 |
| Chatbox | `%LOCALAPPDATA%\Programs\Chatbox` | `%APPDATA%\xyz.chatboxapp.app` **或** `%APPDATA%\chatbox`（官方两处说法不一致） | ✓/△ [storage map](https://github.com/chatboxai/chatbox/blob/75bb9355f826f9070ff5c53527674aab93eb8b9f/docs/technical/storage-map.md) |
| WorkBuddy | `%LOCALAPPDATA%\Programs\WorkBuddy` | `~/.workbuddy`；工作区 `~/WorkBuddy` | ✓ [安装指南](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Installation-Win-Guide) |
| Jan | `%LOCALAPPDATA%\Programs\jan` | `%APPDATA%\Jan\data`；CLI `jan serve` | ✓ 数据 [install](https://www.jan.ai/docs/desktop/install/windows) / △ 程序目录 |
| AnythingLLM | `%LOCALAPPDATA%\Programs\AnythingLLM` | `%APPDATA%\anythingllm-desktop\storage` | ✓ [storage](https://docs.anythingllm.com/installation-desktop/storage) |
| Open WebUI | 有 Desktop 安装包（Electron），目录 ✗ | Docker 卷 `/app/backend/data`；pip `DATA_DIR`（`~/.open-webui`） | ✓ [desktop](https://github.com/open-webui/desktop) |
| LobeChat | 桌面端存在，目录 ✗ | v1 `%APPDATA%\lobehub-storage`；v2 云优先无本地库 | ✓ 数据 [migrate](https://lobehub.com/zh/docs/usage/migrate-from-local-database) |
| NextChat | Tauri 桌面版，目录 ✗ | 无官方路径（WebView localStorage） | △ [tauri 分析](https://opendep.wiki/ChatGPTNextWeb/NextChat/desktop-clients.tauri) |
| DeepSeek Harness | `%LOCALAPPDATA%\Programs\DeepSeek Harness` | `~/.dsh`；`%APPDATA%\@deepseek-ai\dsh-desktop` | ✓ 数据（官方卸载文档）/ △ 程序目录（本机实测） |
| dsh-Go | **无桌面版**，仅 Android APK | — | ✓ [repo](https://github.com/ccch1mneyyy/dsh-Go) |

## 已知不一致 / 待实测

1. **Chatbox**：官方 FAQ 写 `%APPDATA%\chatbox`，仓库技术文档写 `xyz.chatboxapp.app` —— 两处都查。
2. **Cherry Studio**：v1 `%APPDATA%\CherryStudio` 与 v2 `~/.cherrystudio` 并存。
3. **Crush**：Windows 配置在 `%LOCALAPPDATA%\crush\crush.json`，与 *nix 的 `~/.config/crush/` 不同 —— 写入逻辑需要区分平台（待改）。
4. **Roo Code** 已停服；检测到也只提示迁移，不推荐继续配。
5. **Windsurf** 已改名 Devin Desktop；老装与新装路径都要探。
6. Electron 类 `%LOCALAPPDATA%\Programs\<name>` 大多只有第三方卸载库作证，属经验值。
