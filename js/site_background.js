/**
 * Copy per-page background tokens from body to <html> so --site-background-fallback
 * applies to html (overscroll / safe areas) without duplicating the gradient on html
 * (which would scroll with the document and fight the fixed .background-gradient layer).
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
