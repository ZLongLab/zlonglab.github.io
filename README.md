# ZL AI LAB

**Building digital tools and intelligent experiences.**

个人数字空间与 AI 工具入口，包含实时 WebGL 能量核心、多层粒子、神经连线、内部粒子流与 Bloom 光效。

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

首页只保留中心 Logo、品牌与短标语、一个主要工具入口及小型动画暂停按钮。

`src/content.ts` 配置入口；`src/NeuralScene.tsx` 定义 3D 场景；`src/styles.css` 控制界面。页面支持响应式布局、动画暂停、减少动态效果偏好和 WebGL 回退。

`github-profile` 提供可选的 GitHub Profile README 素材，不影响网站本身。
