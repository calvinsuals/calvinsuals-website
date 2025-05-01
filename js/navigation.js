// 导航控制脚本 - 处理跨页面精确定位
document.addEventListener('DOMContentLoaded', function() {
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