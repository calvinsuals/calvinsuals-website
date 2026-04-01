/**
 * 1) 将 body 上的 --site-background-* 同步到 <html>。
 * 2) 仅在桌面端（min-width: 768px）用 --site-bg-doc-height、--site-scroll-y 驱动 .background-gradient；
 *    移动端用整页 body 渐变，不跑滚动同步，避免与移动端 UI 表现冲突。
 */
(function () {
    const root = document.documentElement;
    const mq = window.matchMedia('(min-width: 768px)');

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

    function clearDesktopVars() {
        root.style.removeProperty('--site-scroll-y');
        root.style.removeProperty('--site-bg-doc-height');
    }

    function updateDocHeight() {
        if (!mq.matches) return;
        const h = Math.max(
            document.documentElement.scrollHeight,
            document.body ? document.body.scrollHeight : 0
        );
        root.style.setProperty('--site-bg-doc-height', h + 'px');
    }

    let scrollRaf = 0;
    function applyScrollY() {
        scrollRaf = 0;
        if (!mq.matches) return;
        root.style.setProperty('--site-scroll-y', window.scrollY + 'px');
    }

    function onScroll() {
        if (!mq.matches) return;
        if (!scrollRaf) {
            scrollRaf = requestAnimationFrame(applyScrollY);
        }
    }

    let heightRaf = 0;
    function scheduleDocHeight() {
        if (!mq.matches) return;
        if (!heightRaf) {
            heightRaf = requestAnimationFrame(function () {
                heightRaf = 0;
                updateDocHeight();
            });
        }
    }

    function applyViewportMode() {
        syncSiteBackgroundTokens();
        if (mq.matches) {
            updateDocHeight();
            applyScrollY();
        } else {
            clearDesktopVars();
        }
    }

    function init() {
        applyViewportMode();

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', scheduleDocHeight, { passive: true });
        window.addEventListener('load', scheduleDocHeight, { passive: true });

        // Safari < 14 / 部分 WebView 的 MediaQueryList 无 addEventListener，会抛错并中断后续 init
        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', applyViewportMode);
        } else if (typeof mq.addListener === 'function') {
            mq.addListener(applyViewportMode);
        }

        if (typeof ResizeObserver !== 'undefined' && document.body) {
            const ro = new ResizeObserver(scheduleDocHeight);
            ro.observe(document.body);
        }
    }

    init();
})();
