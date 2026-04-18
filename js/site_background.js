/**
 * 将 body 上的 --site-background-* 同步到 <html>（供 overscroll / 安全区露边等使用）。
 *
 * 桌面：渐变在 fixed 视口层；窄屏：渐变在 body（见 CSS）。此处仅同步 token。
 */
(function () {
    const root = document.documentElement;

    function syncSiteBackgroundTokens() {
        if (!document.body) return;
        /**
         * 首页 index：body 上 :has() 等选择器在部分手机 WebView 里不生效，getComputedStyle 读到的
         * --site-background-fallback 仍可能是 #2f2f2f，同步到 html 后整页露边/重开会变灰。
         * 首页固定与 CSS 中 body.home-page 一致的纯黑铺底，不依赖瞬时计算。
         */
        if (document.body.classList.contains('home-page')) {
            root.style.setProperty('--site-background-fallback', '#181818');
            root.style.setProperty('--site-background-underlay', '#181818');
            root.style.setProperty('--site-background-image', 'none');
            root.style.setProperty('background-color', '#181818');
            root.style.removeProperty('--site-scroll-y');
            root.style.removeProperty('--site-bg-doc-height');
            return;
        }

        const bodyStyles = window.getComputedStyle(document.body);
        const backgroundFallback = bodyStyles.getPropertyValue('--site-background-fallback').trim();
        const backgroundUnderlay = bodyStyles.getPropertyValue('--site-background-underlay').trim();
        /** 以「实际画在 body 上的 background-image」为准，避免 body 已 none 但变量里仍挂着旧渐变导致 html token 错位 */
        const paintedBg = (bodyStyles.backgroundImage || '').trim();
        const specifiedVar = bodyStyles.getPropertyValue('--site-background-image').trim();

        if (backgroundUnderlay) {
            root.style.setProperty('--site-background-underlay', backgroundUnderlay);
        }

        if (backgroundFallback) {
            root.style.setProperty('--site-background-fallback', backgroundFallback);
        }

        if (paintedBg && paintedBg !== 'none') {
            if (specifiedVar) root.style.setProperty('--site-background-image', specifiedVar);
        } else {
            root.style.setProperty('--site-background-image', 'none');
        }

        root.style.removeProperty('--site-scroll-y');
        root.style.removeProperty('--site-bg-doc-height');
    }

    let syncScheduled = false;
    function scheduleSyncSiteBackgroundTokens() {
        if (syncScheduled) return;
        syncScheduled = true;
        requestAnimationFrame(function () {
            syncScheduled = false;
            syncSiteBackgroundTokens();
        });
    }

    function init() {
        syncSiteBackgroundTokens();

        window.addEventListener('load', syncSiteBackgroundTokens, { passive: true });
        window.addEventListener('resize', scheduleSyncSiteBackgroundTokens, { passive: true });

        if (typeof window.matchMedia === 'function') {
            const mq = window.matchMedia('(min-width: 768px)');
            mq.addEventListener('change', scheduleSyncSiteBackgroundTokens);
        }
    }

    init();

    window.__syncSiteBackgroundLayout = scheduleSyncSiteBackgroundTokens;
})();
