/**
 * Copy per-page background tokens from body to <html> so --site-background-fallback
 * applies to html for overscroll / safe-area gaps.
 * 整页渐变在 body 上（见 css/site_background.css），不再使用 fixed .background-gradient。
 */
(function () {
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

    document.addEventListener('DOMContentLoaded', syncSiteBackgroundTokens);
})();
