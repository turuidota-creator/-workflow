/**
 * PWA Runtime Setup & Fixes
 * Location: .agent/skills/pwa-immersion-expert/examples/pwa_setup.js
 */

export const setupPWAImmersion = () => {
    // 1. 环境检测
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone;

    if (isStandalone) {
        document.body.classList.add('pwa-mode');
        console.log("[PWA] Standalone mode detected. Immersion styles applied.");
    }

    // 2. 动态视口高度修复 (针对 100vh 兼容性)
    const setVh = () => {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('resize', setVh);
    setVh();

    // 3. iOS 18+ 旋转布局刷新 Hack
    window.addEventListener('orientationchange', () => {
        document.body.style.display = 'none';
        setTimeout(() => {
            document.body.style.display = 'block';
        }, 50);
    });
};
