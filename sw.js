// 缓存版本号
const CACHE_VERSION = 'v1';
const CACHE_NAME = `calvinsuals-${CACHE_VERSION}`;

// 需要缓存的资源
const CACHE_URLS = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './js/imageLoader.js',
    './components/comparison/comparison.css',
    './components/comparison/comparison.js',
    // 缓存对比区域的图片
    './images/comparison/图片_20250329072452_before.jpg',
    './images/comparison/图片_20250329072458_after.jpg',
    // 缓存其他可能需要的图片
    './images/automotive/portfolio/图片_20250329063023.jpg',
    './images/automotive/portfolio/图片_20250329062945.jpg'
];

// Service Worker 安装时缓存资源
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('预缓存资源中...');
                return cache.addAll(CACHE_URLS);
            })
            .then(() => {
                console.log('预缓存完成');
                return self.skipWaiting();
            })
    );
});

// Service Worker 激活时清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name.startsWith('calvinsuals-') && name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => {
                console.log('旧缓存已清理');
                return self.clients.claim();
            })
    );
});

// 处理资源请求
self.addEventListener('fetch', event => {
    // 只处理 GET 请求
    if (event.request.method !== 'GET') return;

    // 针对图片请求的特殊处理
    if (event.request.url.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        event.respondWith(
            caches.match(event.request)
                .then(cached => {
                    // 优先返回缓存
                    if (cached) {
                        // 在后台更新缓存
                        fetch(event.request)
                            .then(response => {
                                if (response.ok) {
                                    caches.open(CACHE_NAME)
                                        .then(cache => cache.put(event.request, response));
                                }
                            });
                        return cached;
                    }
                    
                    // 如果没有缓存，从网络加载
                    return fetch(event.request)
                        .then(response => {
                            if (!response.ok) throw new Error('Network response was not ok');
                            
                            // 缓存新的响应
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, responseToCache));
                            
                            return response;
                        });
                })
                .catch(() => {
                    console.log('图片加载失败:', event.request.url);
                })
        );
        return;
    }

    // 其他资源的处理
    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) return cached;

                return fetch(event.request)
                    .then(response => {
                        if (!response.ok) throw new Error('Network response was not ok');

                        // 缓存新的响应
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, responseToCache));

                        return response;
                    });
            })
            .catch(() => {
                console.log('资源加载失败:', event.request.url);
            })
    );
});
