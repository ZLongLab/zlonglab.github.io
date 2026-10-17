# ZL AI LAB

**Building digital tools and intelligent experiences.**

浸入式 AI 节点终端：多层能量核心、可变形 GPU 粒子、分段机械轨道、悬浮投影盘与相互联动的双入口。

网站：https://zlonglab.github.io/

## 开发

需要 Node.js 24（最低 22.12）。

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run preview
```

技术栈：React、TypeScript、Three.js、React Three Fiber、Tailwind CSS。

## 自动部署

推送到 `main` 后，`.github/workflows/pages.yml` 自动安装锁定依赖、执行类型检查和构建，并将 `dist` 部署到 GitHub Pages。仓库 Settings → Pages 的 Source 使用 GitHub Actions。

本仓库是账号主页 `zlonglab.github.io`，Vite 使用默认 `base: '/'`。如果以后改成项目路径部署，需要在 Vite 中配置对应的 `base`。[Vite 官方说明](https://vite.dev/guide/static-deploy.html#github-pages)

## 入口与视觉

- DocumentAssistant：当前主要项目，连接现有仓库。
- GitHub：直接访问个人主页。

桌面采用非对称双栏，手机采用上下堆叠。DocumentAssistant 和 GitHub Gateway 两个卡片分别提供声波涟漪与分支数据流；悬停或键盘聚焦时建立数据光带，驱动核心切换形态。离开入口后恢复手动选择的模式。

- CORE：球面流动粒子、内部多面体能量核、旋转机械环与周期扫光。
- NETWORK：粒子汇聚成空间节点，强化外层神经网络连线。
- FLOW：粒子连续变形为沙漏状数据涡流。
- 点击 / Enter / 空格：释放扩散能量波；鼠标拖动：旋转核心；鼠标靠近：局部粒子吸引与摄像机视差。

底部悬浮投影盘采用实时 Shader 扫描，外层 HUD 提供旋转刻度与扫描弧线。保留 Bloom、多层星场、四条独立轨道、流光拖影和 110px 渐细鼠标拖尾。触屏保留自然纵向滚动和点击操作。

遥测数字为模拟视觉读数，声波为装饰动画，不访问麦克风、不播放音频。底部胶囊开关统一暂停 WebGL、CSS/SVG 动效和遥测；遵循系统减少动态效果偏好。

`src/content.ts` 配置入口；`src/HoloCard.tsx` 定义双卡片；`src/LinkBridge.tsx` 连接卡片与核心；`src/Telemetry.tsx` 更新模拟读数；`src/NeuralScene.tsx` 定义 GPU 粒子形变、轨道与鼠标拖尾；`src/SceneEnhancements.tsx` 定义内部能量核、机械环、投影盘、文档节点与冲击波；`src/styles.css` 控制界面。页面支持响应式布局、动画暂停、减少动态效果偏好和 WebGL 回退。

本地预览运行后，`node scripts/verify-browser.mjs` 检查原有功能与响应式布局，`node scripts/verify-interactions.mjs` 检查新交互。浏览器脚本默认使用本机 Chrome；可通过 `SITE_URL` 指定线上地址。

`github-profile` 提供可选的 GitHub Profile README 素材，不影响网站本身。
