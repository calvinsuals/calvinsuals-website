// 图片画廊组件功能
function initializeGallery() {
    const galleryWrappers = document.querySelectorAll('.gallery-wrapper');
    
    galleryWrappers.forEach(wrapper => {
        let isDragging = false;
        let startX;
        let scrollLeft;

        // 创建箭头导航
        const prevArrow = document.createElement('div');
        prevArrow.className = 'gallery-arrow prev';
        const nextArrow = document.createElement('div');
        nextArrow.className = 'gallery-arrow next';

        wrapper.closest('.gallery-container').appendChild(prevArrow);
        wrapper.closest('.gallery-container').appendChild(nextArrow);

        // 鼠标按下事件
        wrapper.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.pageX - wrapper.offsetLeft;
            scrollLeft = wrapper.scrollLeft;
            wrapper.style.cursor = 'grabbing';
            e.preventDefault();
        });

        // 鼠标移动事件
        wrapper.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = e.pageX - wrapper.offsetLeft;
            const walk = (x - startX) * 2;
            wrapper.scrollLeft = scrollLeft - walk;
        });

        // 鼠标松开事件
        wrapper.addEventListener('mouseup', () => {
            isDragging = false;
            wrapper.style.cursor = 'grab';
        });

        // 鼠标离开事件
        wrapper.addEventListener('mouseleave', () => {
            isDragging = false;
            wrapper.style.cursor = 'grab';
        });

        // 触摸事件支持
        wrapper.addEventListener('touchstart', (e) => {
            isDragging = true;
            startX = e.touches[0].pageX - wrapper.offsetLeft;
            scrollLeft = wrapper.scrollLeft;
            e.preventDefault();
        });

        wrapper.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const x = e.touches[0].pageX - wrapper.offsetLeft;
            const walk = (x - startX) * 2;
            wrapper.scrollLeft = scrollLeft - walk;
        });

        wrapper.addEventListener('touchend', () => {
            isDragging = false;
        });

        // 箭头导航事件
        prevArrow.addEventListener('click', () => {
            const firstVisible = wrapper.querySelector('.gallery-item:not([style*="display: none"])');
            if (firstVisible) {
                wrapper.scrollLeft = firstVisible.offsetLeft;
            }
        });

        nextArrow.addEventListener('click', () => {
            const lastVisible = wrapper.querySelector('.gallery-item:not([style*="display: none"])');
            if (lastVisible) {
                wrapper.scrollLeft = lastVisible.offsetLeft + lastVisible.offsetWidth;
            }
        });

        // 隐藏箭头
        function updateArrowVisibility() {
            const scrollLeft = wrapper.scrollLeft;
            const scrollWidth = wrapper.scrollWidth;
            const clientWidth = wrapper.clientWidth;

            prevArrow.style.opacity = scrollLeft > 0 ? '1' : '0';
            nextArrow.style.opacity = scrollLeft < scrollWidth - clientWidth ? '1' : '0';
        }

        // 监听滚动事件
        wrapper.addEventListener('scroll', updateArrowVisibility);
        updateArrowVisibility();
    });
}

// 页面加载完成后初始化画廊
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGallery);
} else {
    initializeGallery();
}
