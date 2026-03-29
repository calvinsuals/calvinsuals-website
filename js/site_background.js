/**
 * 1) 将 body 上的 --site-background-* 同步到 <html>（兜底色与渐变变量）。
 * 2) 用 --site-bg-doc-height、--site-scroll-y 驱动 .background-gradient 的 transform，
 *    等价于整页 body 渐变随滚动，但以合成层位移为主，减轻快速滚动时的 repaint。
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
    }

    function updateDocHeight() {
        const h = Math.max(
            document.documentElement.scrollHeight,
            document.body ? document.body.scrollHeight : 0
        );
        root.style.setProperty('--site-bg-doc-height', h + 'px');
    }

    let scrollRaf = 0;
    function applyScrollY() {
        scrollRaf = 0;
        root.style.setProperty('--site-scroll-y', window.scrollY + 'px');
    }

    function onScroll() {
        if (!scrollRaf) {
            scrollRaf = requestAnimationFrame(applyScrollY);
        }
    }

    let heightRaf = 0;
    function scheduleDocHeight() {
        if (!heightRaf) {
            heightRaf = requestAnimationFrame(function () {
                heightRaf = 0;
                updateDocHeight();
            });
        }
    }

    function init() {
        syncSiteBackgroundTokens();
        updateDocHeight();
        applyScrollY();

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', scheduleDocHeight, { passive: true });
        window.addEventListener('load', scheduleDocHeight, { passive: true });

        if (typeof ResizeObserver !== 'undefined' && document.body) {
            const ro = new ResizeObserver(scheduleDocHeight);
            ro.observe(document.body);
        }
    }

    init();
})();
