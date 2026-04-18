/**
 * 将 body 上的 --site-background-* 同步到 <html>（供 overscroll / 安全区露边等使用）。
 *
 * 桌面：渐变在 fixed 视口层；窄屏：渐变在 body（见 CSS）。此处仅同步 token。
 */
(function () {
    const root = document.documentElement;

    function syncSiteBackgroundTokens() {
        if (!document.body) return;
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
