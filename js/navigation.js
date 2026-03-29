// 导航控制脚本 - 处理跨页面精确定位
document.addEventListener('DOMContentLoaded', function() {
    // --- Menu Toggle Logic --- START ---
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            const isActive = navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            navToggle.setAttribute('aria-expanded', isActive);

            // Optional: Body overflow control (add if needed)
            // document.body.style.overflow = isActive ? 'hidden' : '';
        });

        // 处理菜单链接点击事件
        const menuLinks = navMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
            // 获取链接的href属性
            const href = link.getAttribute('href');
            if (href) {
                // 对所有链接添加点击事件处理
                link.addEventListener('click', function(e) {
                    // 如果不是页内链接或js函数调用，则需特殊处理
                    if (!href.startsWith('#') && !href.startsWith('javascript:')) {
                        // 阻止默认行为
                        e.preventDefault();
                        
                        // 添加hover效果类以触发下划线动画
                        this.classList.add('hover-effect');
                        
                        // 创建一个动画队列，先完成横线动画
                        setTimeout(() => {
                            // 检查菜单是否处于激活状态
                            if (navMenu.classList.contains('active')) {
                                // 关闭菜单(添加菜单滑出动画)
                                navMenu.style.transition = 'transform 0.3s ease-in-out';
                                navMenu.style.transform = 'translateY(-100%)';
                                navToggle.classList.remove('active');
                                navToggle.setAttribute('aria-expanded', 'false');
                                
                                // 等待菜单收起动画完成后再跳转
                                setTimeout(() => {
                                    navMenu.classList.remove('active');
                                    navMenu.style.transform = '';
                                    navMenu.style.transition = '';
                                    // 跳转到目标页面
                                    window.location.href = href;
                                }, 300); // 菜单收起动画时间
                            } else {
                                // 如果菜单未激活，直接跳转
                                window.location.href = href;
                            }
                        }, 350); // 等待横线动画完成（增加到350ms确保完整显示）
                    } else if (href.startsWith('#')) {
                        // 页内导航链接处理
                        e.preventDefault();
                        const targetId = href.substring(1);
                        
                        // 添加hover效果类以触发下划线动画
                        this.classList.add('hover-effect');
                        
                        // 延迟处理，先完成横线动画
                        setTimeout(() => {
                            // 检查菜单是否处于激活状态
                            if (navMenu.classList.contains('active')) {
                                // 关闭菜单(添加菜单滑出动画)
                                navMenu.style.transition = 'transform 0.3s ease-in-out';
                                navMenu.style.transform = 'translateY(-100%)';
                                navToggle.classList.remove('active');
                                navToggle.setAttribute('aria-expanded', 'false');
                                
                                // 等待菜单收起动画完成后再滚动
                                setTimeout(() => {
                                    navMenu.classList.remove('active');
                                    navMenu.style.transform = '';
                                    navMenu.style.transition = '';
                                    // 滚动到目标位置
                                    scrollToElement(targetId);
                                }, 300); // 菜单收起动画时间
                            } else {
                                // 如果菜单未激活，直接滚动
                                scrollToElement(targetId);
                            }
                        }, 350); // 等待横线动画完成（增加到350ms确保完整显示）
                    } else if (href.startsWith('javascript:')) {
                        // JavaScript调用链接处理
                        // 添加hover效果类以触发下划线动画
                        this.classList.add('hover-effect');
                        
                        // 延迟处理，先完成横线动画
                        setTimeout(() => {
                            // 检查菜单是否处于激活状态
                            if (navMenu.classList.contains('active')) {
                                // 关闭菜单(添加菜单滑出动画)
                                navMenu.style.transition = 'transform 0.3s ease-in-out';
                                navMenu.style.transform = 'translateY(-100%)';
                                navToggle.classList.remove('active');
                                navToggle.setAttribute('aria-expanded', 'false');
                                
                                // 等待菜单收起动画完成
                                setTimeout(() => {
                                    navMenu.classList.remove('active');
                                    navMenu.style.transform = '';
                                    navMenu.style.transition = '';
                                }, 300); // 菜单收起动画时间
                            }
                        }, 350); // 等待横线动画完成（增加到350ms确保完整显示）
                    }
                });
            }
        });
    } else {
        // Only log error if *both* elements are expected but not found
        // This prevents errors on pages without this specific nav structure
        if (document.querySelector('.nav-toggle') || document.querySelector('.nav-menu')){
             console.warn("Navigation toggle button (.nav-toggle) or menu (.nav-menu) element not found or mismatched.");
        }
    }
    
    // 添加自定义样式到<head>
    const customStyle = document.createElement('style');
    customStyle.innerHTML = `
        .nav-menu a.hover-effect::after {
            width: calc(100% - 60px) !important;
            transition: width 0.3s ease !important;
        }
        
        /* 添加菜单滑出动画样式 */
        .nav-menu {
            transition: transform 0.3s ease-in-out, opacity 0.3s ease, visibility 0s linear 0.3s !important;
        }
        
        .nav-menu.active {
            transition: transform 0.3s ease-in-out, opacity 0.3s ease, visibility 0s !important;
        }
    `;
    document.head.appendChild(customStyle);
    // --- Menu Toggle Logic --- END ---

    // 检查URL参数中是否包含导航信息
    const urlParams = new URLSearchParams(window.location.search);
    const navigateTo = urlParams.get('section');
    
    if (navigateTo) {
        // 确保页面已完全加载
        if (document.readyState === 'complete') {
            scrollToElement(navigateTo);
        } else {
            // 如果页面还在加载中，等待加载完成
            window.addEventListener('load', function() {
                scrollToElement(navigateTo);
            });
        }
    }
    
    // 处理页面内导航
    setupInPageNavigation();
});

// 处理页面内导航链接
function setupInPageNavigation() {
    const inPageLinks = document.querySelectorAll('a[href^="#"]');
    inPageLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            scrollToElement(targetId);
        });
    });
}

// 精确滚动到指定元素
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // 重置滚动位置，防止之前的滚动影响
    window.scrollTo(0, 0);
    
    // 等待一小段时间确保重置生效
    setTimeout(() => {
        // 计算准确的滚动位置
        const headerOffset = 30; // 导航/头部的高度
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        // 平滑滚动到目标位置
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
        
        // 添加高亮效果帮助用户识别目标区域
        element.classList.add('target-highlight');
        setTimeout(() => {
            element.classList.remove('target-highlight');
        }, 1500);
        
        // 更新URL但不触发新的导航
        history.pushState(null, null, '#' + elementId);
    }, 200);
}

// 导出函数供其他页面使用
window.navigateToMainSection = function(sectionId) {
    // 构建跳转URL，使用查询参数而非锚点，避免默认跳转行为
    window.location.href = 'index.html?section=' + sectionId;
    return false;
};

// #region agent log
(function () {
    var _lastVv = 0;
    var _lastScroll = 0;
    var _vvCount = 0;
    var _vvWindowStart = Date.now();
    var _lastAppVhLog = 0;
    window.__dbg1051ff = window.__dbg1051ff || [];
    function ring(entry) {
        window.__dbg1051ff.push(entry);
        if (window.__dbg1051ff.length > 120) window.__dbg1051ff.shift();
    }
    function send(tag, hypothesisId, extra) {
        var vv = window.visualViewport;
        var doc = document.documentElement;
        var body = document.body;
        var scrollH = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0);
        var data = {
            tag: tag,
            scrollY: Math.round(window.scrollY),
            innerHeight: Math.round(window.innerHeight),
            outerHeight: typeof window.outerHeight === 'number' ? Math.round(window.outerHeight) : null,
            docClientH: Math.round(doc.clientHeight),
            scrollH: Math.round(scrollH),
            vvHeight: vv ? Math.round(vv.height * 1000) / 1000 : null,
            vvOffsetTop: vv ? Math.round(vv.offsetTop * 1000) / 1000 : null,
            vvOffsetLeft: vv ? Math.round(vv.offsetLeft * 1000) / 1000 : null,
            vvScale: vv ? Math.round(vv.scale * 1000) / 1000 : null,
            nearBottom: window.scrollY + window.innerHeight > scrollH - 100,
            appVhCss: doc.style.getPropertyValue('--app-vh') || null
        };
        if (extra && typeof extra === 'object') {
            for (var k in extra) {
                if (Object.prototype.hasOwnProperty.call(extra, k)) data[k] = extra[k];
            }
        }
        ring({ t: Date.now(), tag: tag, hypothesisId: hypothesisId, data: data });
        fetch('http://127.0.0.1:7531/ingest/e2b9650b-9a83-4110-8012-79b2e7492871', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1051ff' },
            body: JSON.stringify({
                sessionId: '1051ff',
                runId: 'iter2',
                hypothesisId: hypothesisId,
                location: 'navigation.js:viewport-debug',
                message: tag,
                data: data,
                timestamp: Date.now()
            })
        }).catch(function () {});
    }
    if (window.visualViewport) {
        window.visualViewport.addEventListener(
            'resize',
            function () {
                var now = Date.now();
                if (now - _lastVv < 100) return;
                _lastVv = now;
                _vvCount++;
                if (now - _vvWindowStart > 1000) {
                    _vvCount = 1;
                    _vvWindowStart = now;
                }
                send('vv_resize', 'A,C,D', { vvResizeBurst1s: _vvCount });
            },
            { passive: true }
        );
        window.visualViewport.addEventListener(
            'scroll',
            function () {
                var now = Date.now();
                if (now - _lastVv < 80) return;
                send('vv_scroll', 'D,E', {});
            },
            { passive: true }
        );
    }
    window.addEventListener(
        'scroll',
        function () {
            var now = Date.now();
            if (now - _lastScroll < 150) return;
            _lastScroll = now;
            var doc = document.documentElement;
            var body = document.body;
            var scrollH = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0);
            var nb = window.scrollY + window.innerHeight > scrollH - 100;
            send(nb ? 'scroll_near_bottom' : 'scroll', 'C,E', { atBottom: nb });
        },
        { passive: true }
    );

    /** Debounced pixel height: avoids 100dvh recomputing every frame during mobile chrome show/hide (H-C). */
    var _appVhTimer;
    function applyAppVh() {
        var vv = window.visualViewport;
        var h = vv ? vv.height : window.innerHeight;
        var px = Math.max(0, Math.round(h)) + 'px';
        document.documentElement.style.setProperty('--app-vh', px);
        var now = Date.now();
        if (now - _lastAppVhLog > 400) {
            _lastAppVhLog = now;
            send('app_vh_set', 'C', { appVhPx: Math.round(h) });
        }
    }
    function scheduleAppVh() {
        clearTimeout(_appVhTimer);
        _appVhTimer = setTimeout(applyAppVh, 80);
    }
    applyAppVh();
    window.addEventListener('resize', scheduleAppVh, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleAppVh, { passive: true });
    }
})();
// #endregion
