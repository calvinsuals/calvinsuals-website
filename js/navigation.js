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