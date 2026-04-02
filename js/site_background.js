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
        const backgroundImage = bodyStyles.getPropertyValue('--site-background-image').trim();
        const backgroundFallback = bodyStyles.getPropertyValue('--site-background-fallback').trim();

        if (backgroundImage) {
            root.style.setProperty('--site-background-image', backgroundImage);
        }

        if (backgroundFallback) {
            root.style.setProperty('--site-background-fallback', backgroundFallback);
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
