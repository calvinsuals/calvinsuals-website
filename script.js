// 注册 Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // 检查是否已经注册
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
            }
            
            // 重新注册
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('Service Worker 注册成功:', registration.scope);
            
            // 强制激活
            if (registration.active) {
                registration.active.postMessage({type: 'SKIP_WAITING'});
            }
        } catch (error) {
            console.error('Service Worker 注册失败:', error);
        }
    });
}

// 对比滑块功能
function initializeComparison() {
    const sliders = document.querySelectorAll('.comparison-wrapper');
    
    sliders.forEach(slider => {
        const handle = slider.querySelector('.slider-handle');
        const afterImage = slider.querySelector('.after');
        let isResizing = false;

        // 初始化滑块位置
        handle.style.left = '50%';
        afterImage.style.clipPath = 'inset(0 50% 0 0)';

        // 鼠标按下事件
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            slider.classList.add('active');
            e.preventDefault();
        });

        // 鼠标移动事件
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const sliderRect = slider.getBoundingClientRect();
            const x = Math.min(Math.max(0, e.clientX - sliderRect.left), sliderRect.width);
            const percent = (x / sliderRect.width) * 100;
            
            requestAnimationFrame(() => {
                handle.style.left = `${percent}%`;
                afterImage.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
            });
        });

        // 鼠标松开事件
        document.addEventListener('mouseup', () => {
            if (!isResizing) return;
            isResizing = false;
            slider.classList.remove('active');
        });

        // 触摸事件支持
        handle.addEventListener('touchstart', (e) => {
            isResizing = true;
            slider.classList.add('active');
            e.preventDefault();
        });

        document.addEventListener('touchmove', (e) => {
            if (!isResizing) return;

            const touch = e.touches[0];
            const sliderRect = slider.getBoundingClientRect();
            const x = Math.min(Math.max(0, touch.clientX - sliderRect.left), sliderRect.width);
            const percent = (x / sliderRect.width) * 100;
            
            requestAnimationFrame(() => {
                handle.style.left = `${percent}%`;
                afterImage.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
            });
        });

        document.addEventListener('touchend', () => {
            if (!isResizing) return;
            isResizing = false;
            slider.classList.remove('active');
        });
    });
}

// 加载图片
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = src;
    });
}

// 导航菜单功能
function initializeNavigation() {
    const menuToggle = document.querySelector('.menu-toggle');
    const menuContent = document.querySelector('.menu-content');
    
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        menuContent.classList.toggle('active');
    });

    // 点击菜单项时关闭菜单
    const menuItems = document.querySelectorAll('.menu-items a');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            menuContent.classList.remove('active');
        });
    });

    // 点击菜单外部时关闭菜单
    document.addEventListener('click', (e) => {
        if (!menuContent.contains(e.target) && !menuToggle.contains(e.target) && menuContent.classList.contains('active')) {
            menuToggle.classList.remove('active');
            menuContent.classList.remove('active');
        }
    });
}

// 轮播图功能
function initializeSliders() {
    document.querySelectorAll('.slider').forEach(slider => {
        const images = slider.querySelectorAll('.slider-image');
        const dots = slider.querySelectorAll('.dot');
        let currentSlide = 0;
        let interval;

        // 显示指定索引的图片
        function showSlide(index) {
            images.forEach(img => img.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            
            images[index].classList.add('active');
            dots[index].classList.add('active');
            currentSlide = index;
        }

        // 显示下一张图片
        function nextSlide() {
            const next = (currentSlide + 1) % images.length;
            showSlide(next);
        }

        // 初始化点击事件
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                clearInterval(interval);
                showSlide(index);
                startAutoSlide();
            });
        });

        // 开始自动轮播
        function startAutoSlide() {
            interval = setInterval(nextSlide, 3000);
        }

        // 鼠标悬停时暂停轮播
        slider.addEventListener('mouseenter', () => clearInterval(interval));
        slider.addEventListener('mouseleave', startAutoSlide);

        // 初始化第一张图片和自动轮播
        showSlide(0);
        startAutoSlide();
    });
}

// 弹窗功能
function initializeModals() {
    const overlay = document.querySelector('.overlay');
    const qrPopup = document.querySelector('.qr-popup');
    const closeBtn = document.querySelector('.close-btn');
    const wechatLink = document.querySelector('.social-link[data-type="wechat"]');
    const xiaohongshuLink = document.querySelector('.social-link[data-type="xiaohongshu"]');
    const copyBtn = document.querySelector('.copy-btn');
    const copyTip = document.querySelector('.copy-tip');
    const wechatContainer = document.querySelector('.wechat-container');
    const xiaohongshuContainer = document.querySelector('.xiaohongshu-container');

    // 显示弹窗
    function showPopup(type) {
        const title = document.querySelector('.qr-popup h3');
        wechatContainer.style.display = 'none';
        xiaohongshuContainer.style.display = 'none';

        if (type === 'wechat') {
            title.textContent = '微信二维码';
            wechatContainer.style.display = 'block';
        } else if (type === 'xiaohongshu') {
            title.textContent = '小红书账号';
            xiaohongshuContainer.style.display = 'flex';
        }

        overlay.classList.add('active');
        qrPopup.classList.add('active');
    }

    // 关闭弹窗
    function closePopup() {
        overlay.classList.remove('active');
        qrPopup.classList.remove('active');
    }

    // 复制微信号
    function copyWechatId() {
        const wechatId = document.getElementById('wechat-id').textContent;
        navigator.clipboard.writeText(wechatId).then(() => {
            copyTip.style.display = 'block';
            setTimeout(() => {
                copyTip.style.display = 'none';
            }, 2000);
        });
    }

    // 添加事件监听器
    wechatLink?.addEventListener('click', () => showPopup('wechat'));
    xiaohongshuLink?.addEventListener('click', () => showPopup('xiaohongshu'));
    closeBtn?.addEventListener('click', closePopup);
    overlay?.addEventListener('click', closePopup);
    copyBtn?.addEventListener('click', copyWechatId);

    // 阻止弹窗内点击事件冒泡
    qrPopup?.addEventListener('click', (e) => e.stopPropagation());
}

// 联系表单功能
function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('消息已发送！我们会尽快回复您。');
        contactForm.reset();
    });
}

// 图片保护功能
function preventImageDownload() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('contextmenu', (e) => e.preventDefault());
        img.addEventListener('dragstart', (e) => e.preventDefault());
    });
}

// 预加载图片
function preloadImages() {
    const images = document.querySelectorAll('.comparison-wrapper img');
    images.forEach(img => {
        if (img.complete) {
            img.style.visibility = 'visible';
        } else {
            img.onload = () => {
                img.style.visibility = 'visible';
            };
        }
    });
}

// 页面加载完成后初始化所有功能
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeSliders();
    initializeComparison();
    initializeModals();
    initializeContactForm();
    preventImageDownload();
    preloadImages();
});