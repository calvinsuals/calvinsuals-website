// 图片加载优化
class ImageLoader {
    constructor() {
        this.imageObserver = new IntersectionObserver(
            (entries, observer) => this.handleIntersection(entries, observer),
            {
                root: null,
                rootMargin: '50px',
                threshold: 0.1
            }
        );
    }

    // 初始化图片加载
    init() {
        // 获取所有需要延迟加载的图片
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            // 添加加载中的类
            img.classList.add('loading');
            
            // 存储原始图片路径
            const src = img.getAttribute('src');
            img.setAttribute('data-src', src);
            img.setAttribute('src', ''); // 清空src以防止立即加载
            
            // 观察图片元素
            this.imageObserver.observe(img);
        });
    }

    // 处理图片进入视口
    handleIntersection(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadImage(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }

    // 加载图片
    loadImage(img) {
        const src = img.getAttribute('data-src');
        if (!src) return;

        // 创建新的Image对象来预加载
        const tempImage = new Image();
        tempImage.onload = () => {
            img.src = src;
            img.classList.remove('loading');
            img.classList.add('loaded');
        };
        tempImage.src = src;
    }
}

// 初始化图片加载器
document.addEventListener('DOMContentLoaded', () => {
    const imageLoader = new ImageLoader();
    imageLoader.init();
});
