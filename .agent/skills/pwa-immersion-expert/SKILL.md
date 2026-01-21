---
name: "pwa-immersion-expert"
description: "2025年渐进式Web应用（PWA）移动端沉浸式体验与异形屏适配规范。确保应用在 iOS 和 Android 全面屏设备上拥有原生级的视觉表现。"
---

# 核心指令与规范

当你处理 PWA 相关的 UI 布局、Meta 标签设置或全局样式时，必须严格遵守以下规范：

## 1. 视口与状态栏配置

- **强制使用 Cover 模式**：`<meta name="viewport">` 必须包含 `viewport-fit=cover`，以突破安全区域限制实现全屏。
- **PWA 独立模式必要 Meta**（iOS）：
  - `<meta name="apple-mobile-web-app-capable" content="yes">` — 启用 Web App 能力，**此项必须存在**，否则下方 status-bar-style 不生效。
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` — 沉浸式透明状态栏。
- **Android 状态栏着色**：使用双 `<meta name="theme-color">` 标签支持亮/暗主题：

  ```html
  <meta name="theme-color" content="#F6F2EA" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#1A1A1A" media="(prefers-color-scheme: dark)" />
  ```

- **缩放控制**：`user-scalable=no` 可模拟原生体验，但**存在可访问性风险**（违反 WCAG）。仅在沉浸式阅读、游戏等确需场景使用，并需评估弱视用户需求。默认建议保留缩放能力。

## 2. 安全区域 (Safe Area) 适配

- **环境变量**：所有固定定位（Fixed）或首屏容器必须使用 `env(safe-area-inset-*)` 变量。
- **回退方案**：必须提供默认像素值，如 `padding-top: env(safe-area-inset-top, 20px)`。
- **代码一致性**：推荐在 `:root` 中统一定义 CSS 变量（如 `--sat`, `--sab`）。

## 3. 现代视口单位

- **高度稳定性**：对于 App Shell 或首屏，优先使用 `100svh`（最小视口高度），避免地址栏伸缩导致的抖动。
- **兼容回退**：必须提供 `100vh` 作为回退，写法为 `min-height: 100vh; min-height: 100svh;`，确保老旧 WebView 不丢失高度。
- **全屏容器**：谨慎使用 `100dvh`（动态视口单位），注意其在滚动时可能触发的性能开销和重排。

## 4. 视觉与交互修复

- **过滚动行为**：使用 `overscroll-behavior-y: none;` 禁用橡皮筋效果，或确保背景色与应用主题一致，防止回弹时漏底。**注意**：iOS Safari 16 以下支持有限，需实测确认效果。
- **状态栏对比度**：在沉浸式模式下，确保顶部 UI 为深色或带有 `backdrop-filter: blur()`，以保证系统状态栏图标（白色）清晰可见。
- **启动画面**：iOS 需要针对不同机型分辨率提供精确匹配的 `apple-touch-startup-image`（维护成本高，非必需可省略）。

## 5. Manifest 基础配置

- **必要字段**：`manifest.json` 需包含 `display: "standalone"`、`background_color`、`theme_color`、`icons` 数组。
- **图标**：同时提供 `apple-touch-icon` link 标签与 manifest icons，确保 iOS/Android 均可正确显示。

## 6. 使用场景

- 修改 `index.html` 的头部 Meta 配置时。
- 调整页面布局，尤其是顶部导航栏或底部操作菜单的高度时。
- 修复 iOS 端的"顶部黑条"或内容遮挡问题。
- 优化 PWA 在刘海屏、灵动岛设备上的表现。
