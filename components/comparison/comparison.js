// 对比滑块功能
function initializeComparison() {
    const sliders = document.querySelectorAll('.comp-wrapper');
    
    // 预加载单个图片
    function preloadImage(imgElement) {
        return new Promise((resolve, reject) => {
            if (imgElement.complete) {
                resolve();
            } else {
                imgElement.onload = () => resolve();
                imgElement.onerror = () => reject(new Error(`Failed to load ${imgElement.src}`));
            }
        });
    }

    // 初始化单个滑块
    function initializeSlider(slider) {
        const handle = slider.querySelector('.comp-handle');
        const sliderWidth = slider.offsetWidth;
        let isResizing = false;

        function updatePosition(x) {
            const percent = (x / sliderWidth) * 100;
            handle.style.left = `${x}px`;
            handle.style.transform = 'translate(-50%, -50%)';
            slider.querySelector('.after').style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
        }

        // 鼠标事件
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            slider.classList.add('active');
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const sliderRect = slider.getBoundingClientRect();
            const x = Math.min(Math.max(0, e.clientX - sliderRect.left), sliderWidth);
            updatePosition(x);
        });

        document.addEventListener('mouseup', () => {
            if (!isResizing) return;
            isResizing = false;
            slider.classList.remove('active');
        });

        // 触摸事件
        handle.addEventListener('touchstart', (e) => {
            isResizing = true;
            slider.classList.add('active');
            e.preventDefault();
        });

        document.addEventListener('touchmove', (e) => {
            if (!isResizing) return;
            const touch = e.touches[0];
            const sliderRect = slider.getBoundingClientRect();
            const x = Math.min(Math.max(0, touch.clientX - sliderRect.left), sliderWidth);
            updatePosition(x);
        });

        document.addEventListener('touchend', () => {
            if (!isResizing) return;
            isResizing = false;
            slider.classList.remove('active');
        });

        // 初始化滑块位置
        updatePosition(sliderWidth / 2);
    }

    // 主初始化函数
    async function initialize() {
        try {
            // 收集所有图片并预加载
            const loadPromises = [];
            sliders.forEach(slider => {
                const beforeImg = slider.querySelector('.before');
                const afterImg = slider.querySelector('.after');
                if (beforeImg && afterImg) {
                    loadPromises.push(preloadImage(beforeImg), preloadImage(afterImg));
                }
            });

            // 等待所有图片加载完成
            await Promise.all(loadPromises);

            // 初始化并显示
            sliders.forEach(slider => {
                const beforeImg = slider.querySelector('.before');
                const afterImg = slider.querySelector('.after');
                
                // 显示图片
                beforeImg.classList.add('loaded');
                afterImg.classList.add('loaded');
                
                // 初始化滑块
                initializeSlider(slider);
            });

        } catch (error) {
            console.error('初始化失败:', error);
        }
    }

    // 开始初始化
    initialize();
}

// 确保 DOM 加载完成后立即初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeComparison);
} else {
    initializeComparison();
}
