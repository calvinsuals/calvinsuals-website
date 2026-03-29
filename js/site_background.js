/**
 * Sync the fixed gradient layer with the visual viewport so mobile browser UI
 * show/hide animations do not reveal the html/body fallback underneath.
 */
(function() {
    function initSiteBackgroundVisualViewport() {
        const el = document.querySelector('.background-gradient');
        if (!el || !window.visualViewport) return;

        let ticking = false;

        const apply = () => {
            ticking = false;
            const vv = window.visualViewport;
            el.style.inset = 'auto';
            el.style.top = `${Math.round(vv.offsetTop)}px`;
            el.style.left = `${Math.round(vv.offsetLeft)}px`;
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.width = `${Math.round(vv.width)}px`;
            el.style.height = `${Math.round(vv.height)}px`;
            el.style.minHeight = '';
        };

        const schedule = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(apply);
        };

        schedule();
        window.visualViewport.addEventListener('resize', schedule, { passive: true });
        window.visualViewport.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
    }

    window.initSiteBackgroundVisualViewport = initSiteBackgroundVisualViewport;

    document.addEventListener('DOMContentLoaded', () => {
        initSiteBackgroundVisualViewport();
    });
})();
