# GPU候机室

Windows 本地桌面应用。连接自己的 AutoDL 账号后，可以建立 GPU 库存监测任务，发现符合条件的资源后自动创建实例，或克隆同地区的已关机实例。

## 使用

- **用户配置**管理登录、账户名、余额和实例。桌面版启动时检查保存的登录，人工登录使用专用 Edge 窗口，监测使用后台 Edge。已配置 Token 时余额每 10 分钟自动更新，也可手动刷新。
- **资源监测**建立新建或迁移克隆任务。官方报价、时长、预算和扫描选项集中在高级设置中。
- **任务队列**查看进度和日志、暂停或恢复任务、确认完成及删除任务。关闭主窗口后应用留在托盘，通过托盘菜单退出。
- **通知设置**支持桌面提醒、AutoDL 微信和 HTTPS Webhook。

自动执行任务会真实创建并开机，按 AutoDL 规则计费。手动确认完成或在冲突提示中继续创建，会解除对应旧任务的重复创建限制，可能产生重复租用。删除从队列移除任务，保留本地历史依据；有未核对提交的任务应先核对或确认完成。

## 开发环境

Windows 10/11 x64、Node.js 22.12+（建议 24）、npm、Microsoft Edge。应用本身不需要本机 GPU。首次安装开发依赖需要联网下载 Electron。

~~~powershell
git clone https://github.com/anleatr/Stop-Manually-Refreshing-AutoDL-GPU.git
cd Stop-Manually-Refreshing-AutoDL-GPU
npm ci
npm run desktop:dev
~~~

也可以运行本地网页服务：

~~~powershell
npm start
~~~

打开终端显示的本机地址，默认 http://127.0.0.1:8787 。停止网页服务使用 Ctrl+C 或 `npm run stop`。

## 构建 Windows 桌面版

~~~powershell
npm run desktop:pack
npm run desktop:dist
~~~

- `desktop:pack` 生成可直接运行的 `desktop/out/win-unpacked/`。分发时保留整个文件夹。
- `desktop:dist` 生成 `desktop/out/*-Setup.exe`。安装后创建「GPU候机室」快捷方式。
- Electron 和打包工具均在本项目的 `devDependencies` 中固定版本，由 `package-lock.json` 锁定。构建不依赖其他项目目录。
- 源码仓库不提交构建结果。安装包需要分发时，可单独上传到 GitHub Releases。

## 验证

~~~powershell
npm run check
npm test
npm run test:tasks-ui
npm run test:queue-ui
~~~

单元、接口及界面测试使用独立临时目录和合成数据。上述检查不登录真实账号、不租用 GPU。完整 UI 回归命令见 [开发指南](docs/DEVELOPMENT.md)。CI 在 Windows 上运行语法、单元及核心 UI 回归。

## 数据与配置

`AUTODL_RUNTIME_DIR` 可以统一指定任务与登录资料位置。未指定时，桌面版使用 Electron 用户数据目录下的 `runtime/`，网页服务使用项目下的 `.runtime/`。从网页版本切换到桌面版时，可把该变量指向原有目录，先正常退出原服务再启动桌面版。

~~~powershell
$env:AUTODL_RUNTIME_DIR = 'D:\GPUWatch\runtime'
npm run desktop:dev
~~~

该目录包含任务、提交记录、通知设置、专用浏览器资料及加密凭据。运行资料、缓存、日志、依赖、安装包和测试生成图片均不提交到 Git。更换电脑后重新登录和配置凭据。

其他可选环境变量：

| 变量 | 用途 |
| --- | --- |
| `PORT` | 网页服务端口，默认 8787；桌面版分配本机可用端口 |
| `AUTODL_BROWSER_CHANNEL` | Playwright 浏览器通道，桌面版默认 `msedge` |
| `AI_TEST_BROWSER` | 历史命名的 UI 测试浏览器可执行路径 |
| `PLAYWRIGHT_BROWSERS_PATH` | Playwright 浏览器下载与查找位置 |

## 项目结构

| 路径 | 内容 |
| --- | --- |
| `desktop/` | Electron 入口、图标和 Windows 打包配置 |
| `public/` | 共用界面 |
| `src/` | 本地服务、任务引擎、网页适配器和数据存储 |
| `tests/` | 单元与接口测试及合成夹具 |
| `scripts/` | UI 回归和诊断入口 |
| `docs/` | 开发、使用及历史验证记录 |
| `eval/` | 已移除 AI 选卡功能的历史评测资料，仅供追溯 |

## 许可证

MIT，见 [LICENSE](LICENSE)。本项目基于 [cc2025cheng/Stop-Manually-Refreshing-AutoDL-GPU](https://github.com/cc2025cheng/Stop-Manually-Refreshing-AutoDL-GPU) 演进。第三方组件说明见 [docs/THIRD_PARTY.md](docs/THIRD_PARTY.md)。
