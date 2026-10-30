# 第三方组件与服务

本项目的许可证见 [LICENSE](../LICENSE)（MIT）。下面是项目用到的第三方软件与服务；本仓库不包含、也不分发它们的代码。

| 名称 | 类型 | 许可或条款 | 怎么使用 |
| --- | --- | --- | --- |
| Node.js | 运行环境 | MIT | 用户自行安装 |
| Playwright / playwright-core 1.64.1 | npm 依赖 | Apache-2.0 | `npm install` 安装，驱动专用浏览器，未修改其代码；如随项目分发 `node_modules`，需保留其 LICENSE 与 NOTICE |
| Chromium（由 Playwright 下载）或本机 Edge | 浏览器 | 各自的许可 | 用户本机安装 |
| DeepSeek、阿里云百炼等模型 API | 可选的第三方服务 | 各服务商条款 | 用户填写自己的 API Key 后才调用，按服务商计费 |
| AutoDL | 第三方平台 | AutoDL 用户协议 | 在用户本人登录的浏览器中操作可见页面；使用前请对照用户协议 |
| 评测用的公开 GitHub 项目资料 | 评测输入 | 各项目自己的许可 | 评测时现取，只缓存在本机，不随仓库分发；仓库只保存地址、截取方式、标注和标注依据的短句引用 |
| Ollama 与 Qwen3-4B | 开发期间的评测工具 | MIT / Apache-2.0 | 只用于产生 `eval/` 中前两轮评测的结果；产品不需要、不调用 |

开发中使用了 AI 编程助手（Claude Code、OpenAI Codex），生成的代码与文档经人工审核和测试后纳入。
