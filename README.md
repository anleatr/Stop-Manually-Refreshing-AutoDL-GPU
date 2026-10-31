<p align="center">
  <img src="docs/banner.png" alt="AutoDL 候机室：设好条件并授权，空闲 GPU 一出现就自动开机" width="100%">
</p>

<p align="center">
  <b>别再手动刷新 AutoDL 了！</b><br>
  你设好 GPU 型号、地区和镜像并授权，空闲 GPU 一出现就自动创建并开机；不知道该等哪张卡，贴上项目 README 帮你算。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License: MIT">
  <img src="https://img.shields.io/badge/node-22%2B-339933?logo=nodedotjs&logoColor=white" alt="Node.js 22+">
  <img src="https://img.shields.io/badge/platform-Windows-0078D6" alt="Windows">
  <img src="https://img.shields.io/badge/local%20GPU-not%20required-76B900?logo=nvidia&logoColor=white" alt="本机无需 GPU">
  <img src="https://img.shields.io/badge/AI-optional%20%C2%B7%20your%20own%20key-8A2BE2" alt="AI 可选，用自己的 Key">
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-使用步骤">使用步骤</a> ·
  <a href="#-ai-选卡">AI 选卡</a> ·
  <a href="#-如何更新">如何更新</a> ·
  <a href="#-常见问题">常见问题</a> ·
  <a href="docs/USER_GUIDE.md">详细说明</a>
</p>

## ✨ 它能做什么

- ⚡ **空闲即开机**：按你设的型号、卡数和地区（可多选），默认每秒检查一次，发现空闲 GPU 立即创建并开机。
- 🔁 **同地区克隆换卡**：把已关机的实例克隆到同地区的空闲 GPU，可以换型号、复制数据盘；源实例只读，不会被改动。
- 🧠 **AI 选卡（可选）**：贴上项目的 README 或 requirements.txt，算出这个项目能在哪些 GPU 上跑，一键填入任务。
- 🛡️ **防重复付费**：点击前把提交意图写入磁盘，点击后对账实例列表；结果不明就停下核对，不再点击。
- 🔔 **多渠道通知**：站内、桌面、AutoDL 微信、Webhook。
- 💻 **门槛低**：本机不需要 GPU，中文界面，双击启动；不用 AI 也能完整使用。

> [!NOTE]
> 已在真实账号上验证：2026-10-29～30 自动新建并开机完成 4 次、同地区克隆完成 2 次；334 项自动化测试全部通过。记录见 [TEST_REPORT.md](TEST_REPORT.md)。

## 🚀 快速开始

**需要**：Windows 10/11、[Node.js 22+](https://nodejs.org)、自己的 AutoDL 账号。本机不需要 GPU。

1. 下载项目。推荐用 git，以后一条命令就能更新：

   ```powershell
   git clone https://github.com/cc2025cheng/Stop-Manually-Refreshing-AutoDL-GPU.git
   ```

   没装 git 也可以点仓库上方绿色的 **Code → Download ZIP** 并解压。
2. 进入项目文件夹，双击 **`启动监测台.cmd`**。第一次运行会自动安装依赖。
3. 浏览器打开 **http://127.0.0.1:8787** 。

<details>
<summary>命令行启动与常见安装问题</summary>

```powershell
npm.cmd install
npm.cmd start
```

- 依赖下载慢：`npm.cmd install --registry=https://registry.npmmirror.com`
- 提示找不到浏览器：`npm.cmd run browser:install`（没有时程序也会尝试本机 Edge）
- 8787 端口被占用：先运行 `$env:PORT='8788'`，再在同一窗口运行 `npm.cmd start`
- 停止服务：在启动窗口按 Ctrl+C，或运行 `npm.cmd run stop`

</details>

## 🧭 使用步骤

| 步骤 | 操作 |
| --- | --- |
| 1️⃣ 连接 AutoDL | “资源监测 → 连接 AutoDL”点“打开登录”，在弹出的专用浏览器中自己登录；回到控制台点“检查登录状态”，显示“会话可用”即可 |
| 2️⃣ 同步型号 | 勾选地区，点“同步 AutoDL 型号”，看到各地区有哪些 GPU、空闲多少 |
| 3️⃣ 选卡（可选） | 打开“AI 环境与选卡”，贴上项目资料，点“分析并选卡”，在想等的型号上点“填入新建任务” |
| 4️⃣ 建立任务 | **新建实例**：选型号、卡数、地区，点“同步官方镜像”逐级选环境；**迁移克隆**：点“同步实例”，选一个已关机的源实例 |
| 5️⃣ 开始监测 | 勾选费用授权后点“开始真实库存监测”；只想收到提醒就选“只通知，停在提交之前” |

> [!TIP]
> 监测期间保持电脑联网、不休眠，不要关闭启动窗口。关掉控制台网页不影响后台检查。

## 📸 界面预览

<table>
  <tr>
    <td width="50%"><img src="docs/figures/dashboard.png" alt="控制台：建立监测任务"></td>
    <td width="50%"><img src="docs/figures/plan-results.png" alt="AI 环境与选卡：各型号是否能跑"></td>
  </tr>
  <tr>
    <td align="center">控制台：建立监测任务</td>
    <td align="center">AI 环境与选卡：各型号是否能跑</td>
  </tr>
</table>

<sub>截图为隔离测试中的合成数据，型号库存是虚构的。</sub>

## 🧠 AI 选卡

等不到某一种卡时，换一张同样能跑的卡往往更快。把项目的 README、requirements.txt 或报错日志贴进来：

- 📄 **规则先读**：依赖文件里的 `torch==2.1.0+cu121`、`python>=3.8`、“至少 24GB 显存”等写法；资料没写显存时按模型大小估算，例如“部署 27B 模型”约需 65GB。
- 🎯 **对照真实目录**：和刚同步的 AutoDL 型号逐个比较，标出“可用 / 有风险 / 需核对 / 不满足”及原因，并选好官方镜像。
- 🤖 **AI 补充（可选）**：规则读不准的地方，例如表格里按模型大小列出的多个显存数字，由你自己 API Key 上的模型（DeepSeek、阿里云百炼等）按需求挑出。每条结论都引用原文，由程序核对。一次约 600～1100 Token，本机不需要 GPU。
- 🔒 **AI 只做建议**：不参与监测和下单；不填 Key 也能用规则部分。评测方法与结果见 [eval/PLAN_EVAL.md](eval/PLAN_EVAL.md)。

<details>
<summary>工作原理（架构图）</summary>

![总体架构](docs/figures/architecture.png)

</details>

## 🔐 安全与费用

- 💳 勾选费用授权后，程序会真实创建实例，费用由 AutoDL 收取；提交前会重新核对库存与结算费用。
- 👤 只在你本人登录的专用浏览器中操作可见页面，不调用私有接口，不代过验证码。
- 🏠 服务只监听本机 127.0.0.1；任务、日志与登录资料保存在本机 `.runtime/`，不要分享这个目录，也不要把端口共享到局域网或公网。
- 📜 本项目与 AutoDL 官方无隶属关系，使用前请对照 AutoDL 用户协议。详见 [docs/SECURITY.md](docs/SECURITY.md)。

## 🔄 如何更新

> [!IMPORTANT]
> 更新前先暂停正在运行的监测任务，等提交或核验结束，再停止服务：在启动窗口按 Ctrl+C，或运行 `npm.cmd run stop`。

| 下载方式 | 更新步骤 |
| --- | --- |
| `git clone` | 在项目文件夹运行 `git pull`，再运行 `npm.cmd install`（依赖有变化时需要），然后双击 `启动监测台.cmd` |
| Download ZIP | 下载新的 ZIP 解压到新文件夹，把旧文件夹里的 `.runtime` 整个复制过去，再双击新文件夹里的 `启动监测台.cmd` |

- 任务、设置和登录资料都在 `.runtime/`，不在仓库里，更新不会覆盖。
- 想第一时间知道新版本：点仓库右上角 **Watch → Custom → 勾选 Releases → Apply**。每个版本改了什么见 [CHANGELOG.md](CHANGELOG.md) 或 [Releases](https://github.com/cc2025cheng/Stop-Manually-Refreshing-AutoDL-GPU/releases)。

## ❓ 常见问题

<details>
<summary>网页提示“本地后台仍是旧版本”？</summary>

只刷新网页不会更新后台代码。双击 `启动监测台.cmd`，提示后台运行的是旧代码时输入 Y，程序会让旧后台正常停止后再启动新代码。不要删除 `.runtime`、运行锁或浏览器资料来处理这个提示。

</details>

<details>
<summary>点“打开登录”提示网络访问受限？</summary>

这说明专用浏览器访问网页被启动环境或网络策略拒绝了，和账号密码无关。退出旧服务后，在普通 Windows 环境双击 `启动监测台.cmd` 重启；也可以运行只读的网络诊断 `npm.cmd run diagnose:network`。

</details>

<details>
<summary>登录失效或要人工验证？</summary>

回到专用浏览器自己完成登录或验证，再点“检查登录状态”。程序不会代过验证码。

</details>

<details>
<summary>点击“创建并开机”后结果不明？</summary>

程序会停下来只读核对实例列表，不会再点一次。请在 AutoDL 页面核对；不要删除 `.runtime`，也不要新建同样的任务来重试。

</details>

## 🔧 检查和项目结构

```powershell
npm.cmd run check          # 语法检查
npm.cmd test               # 单元与接口测试
npm.cmd run test:plan-ui   # 选卡页面回归（其余页面回归见详细说明）
```

这些检查只用合成数据，不登录 AutoDL、不租卡、不调用模型。

| 目录 | 内容 |
| --- | --- |
| `src/` | 本地服务、任务引擎、AutoDL 网页适配器、选卡规划（`env-plan.mjs`）、AI 接入 |
| `public/` | 控制台网页 |
| `tests/` · `scripts/` | 自动化测试、页面回归与诊断脚本 |
| `eval/` | 选卡规划评测集与结果 |

## 📄 许可证

[MIT](LICENSE) © 2026 cc2025cheng。第三方组件及其许可见 [docs/THIRD_PARTY.md](docs/THIRD_PARTY.md)。

如果它帮你少刷了几次页面，欢迎点个 ⭐ Star。
