# ZL AI LAB

**Building digital tools and intelligent experiences.**

浸入式 AI 节点终端：双栏操作区、实时 WebGL 粒子球、SVG 数据拓扑、声波涟漪和透视网格。

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

桌面采用非对称双栏，手机采用上下堆叠。DocumentAssistant 和 GitHub Gateway 两个卡片分别提供声波涟漪与分支数据流；悬停时动画提速。右侧粒子沿球面纬线流动，配合周期扫光、四条立体轨道、拖影及 Bloom。

遥测数字为模拟视觉读数，声波为装饰动画，不访问麦克风、不播放音频。底部胶囊开关统一暂停 WebGL、CSS/SVG 动效和遥测；遵循系统减少动态效果偏好。

`src/content.ts` 配置入口；`src/HoloCard.tsx` 定义双卡片、频谱与拓扑；`src/Telemetry.tsx` 更新模拟读数；`src/NeuralScene.tsx` 定义 GPU 粒子、轨道与鼠标短拖尾；`src/styles.css` 控制界面。页面支持响应式布局、动画暂停、减少动态效果偏好和 WebGL 回退。

`github-profile` 提供可选的 GitHub Profile README 素材，不影响网站本身。
