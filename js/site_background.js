/**
 * Sync the fixed gradient layer with the visual viewport so mobile browser UI
 * show/hide animations do not reveal the html/body fallback underneath.
 */
(function() {
    function syncSiteBackgroundTokens() {
        const bodyStyles = window.getComputedStyle(document.body);
        const root = document.documentElement;
        const backgroundImage = bodyStyles.getPropertyValue('--site-background-image').trim();
        const backgroundFallback = bodyStyles.getPropertyValue('--site-background-fallback').trim();

        if (backgroundImage) {
            root.style.setProperty('--site-background-image', backgroundImage);
        }

        if (backgroundFallback) {
            root.style.setProperty('--site-background-fallback', backgroundFallback);
        }
    }

    function initSiteBackgroundVisualViewport() {
        const el = document.querySelector('.background-gradient');
        syncSiteBackgroundTokens();

        if (!el || !window.visualViewport) return;

        let ticking = false;

        const apply = () => {
            ticking = false;
            const vv = window.visualViewport;
            const viewportHeight = Math.ceil(Math.max(window.innerHeight, vv.height + vv.offsetTop));

            /*
             * Keep the layer anchored to the layout viewport.
             * Only expand its height when browser UI changes; do not follow
             * visualViewport scroll/offset or it will appear to drift with page scroll.
             */
            el.style.inset = '0';
            el.style.top = '0';
            el.style.left = '0';
            el.style.right = '0';
            el.style.bottom = 'auto';
            el.style.width = '100%';
            el.style.height = `${viewportHeight}px`;
            el.style.minHeight = `${viewportHeight}px`;
        };

        const schedule = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(apply);
        };

        schedule();
        window.visualViewport.addEventListener('resize', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
    }

    window.initSiteBackgroundVisualViewport = initSiteBackgroundVisualViewport;

    document.addEventListener('DOMContentLoaded', () => {
        initSiteBackgroundVisualViewport();
    });
})();
