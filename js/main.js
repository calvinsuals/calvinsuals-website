// *** 函数定义区域 ***
/** 拖对比区竖条时暂停首页展示区轮播，避免与 clip-path 叠化抢 GPU */
let __comparisonHandleDragDepth = 0;
function __notifyComparisonHandleDragStart() {
    __comparisonHandleDragDepth++;
    if (__comparisonHandleDragDepth !== 1) return;
    const regs = window.__displayGalleryControls;
    if (!regs) return;
    Object.values(regs).forEach(function (c) {
        if (c && typeof c.stopAutoPlay === 'function') c.stopAutoPlay();
    });
}
function __notifyComparisonHandleDragEnd() {
    __comparisonHandleDragDepth = Math.max(0, __comparisonHandleDragDepth - 1);
    if (__comparisonHandleDragDepth !== 0) return;
    const regs = window.__displayGalleryControls;
    if (!regs) return;
    Object.values(regs).forEach(function (c) {
        if (c && typeof c.startAutoPlay === 'function') c.startAutoPlay();
    });
}

const __jsonCache = new Map();
const __imageWarmCache = new Set();
const __imageWarmWaiters = new Map();
const __imageObjectCache = new Map();
const __imageReadyCache = new Set();

function __flushWarmWaiters(url) {
    const list = __imageWarmWaiters.get(url);
    if (!list || list.length === 0) return;
    __imageWarmWaiters.delete(url);
    list.forEach((cb) => {
        try {
            cb();
        } catch (e) {
            console.warn('[warmImage] waiter error', e);
        }
    });
}
const __MAX_IMAGE_OBJECT_CACHE = 120;
const __R2_PUBLIC_HOST = 'pub-67b44c34fdd2480e83feffb3cfc185b9.r2.dev';
const __R2_CUSTOM_HOST = 'img.calvinsuals.com';

function normalizeImageUrl(url) {
    if (!url || typeof url !== 'string') return url;
    return url.replace(__R2_PUBLIC_HOST, __R2_CUSTOM_HOST);
}

function keepImageObject(url, img) {
    if (!url || !img || __imageObjectCache.has(url)) return;
    __imageObjectCache.set(url, img);
    if (__imageObjectCache.size > __MAX_IMAGE_OBJECT_CACHE) {
        const oldestKey = __imageObjectCache.keys().next().value;
        if (oldestKey) __imageObjectCache.delete(oldestKey);
    }
}

function warmImage(url, onReady) {
    url = normalizeImageUrl(url);
    if (!url || typeof url !== 'string') return;
    if (__imageReadyCache.has(url)) {
        if (typeof onReady === 'function') {
            if (typeof queueMicrotask === 'function') queueMicrotask(onReady);
            else setTimeout(onReady, 0);
        }
        return;
    }
    if (__imageWarmCache.has(url)) {
        if (typeof onReady === 'function') {
            if (!__imageWarmWaiters.has(url)) __imageWarmWaiters.set(url, []);
            __imageWarmWaiters.get(url).push(onReady);
        }
        return;
    }
    __imageWarmCache.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    keepImageObject(url, img);
    const markReady = () => {
        if (__imageReadyCache.has(url)) return;
        __imageReadyCache.add(url);
        if (typeof onReady === 'function') onReady();
        __flushWarmWaiters(url);
    };
    img.onload = () => {
        if (typeof img.decode === 'function') {
            img.decode().then(markReady).catch(markReady);
        } else {
            markReady();
        }
    };
    img.onerror = () => {
        __imageWarmCache.delete(url);
        if (__imageWarmWaiters.has(url)) {
            const list = __imageWarmWaiters.get(url);
            __imageWarmWaiters.delete(url);
            list.forEach((cb) => {
                try {
                    cb();
                } catch (e) {
                    console.warn('[warmImage] waiter error', e);
                }
            });
        }
        if (typeof onReady === 'function') onReady();
    };
    img.src = url;
    if (img.complete) {
        if (typeof img.decode === 'function') {
            img.decode().then(markReady).catch(markReady);
        } else {
            markReady();
        }
    }
}

/** 窄屏：避免一次性 decode 过多大图导致标签页 OOM / 长时间白屏（与桌面「全量预热」策略区分） */
function __isMobileImageWarmProfile() {
    try {
        return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches;
    } catch (e) {
        return false;
    }
}

function warmImagesIdle(urls, eagerCount = 8, scheduleRemainder = true) {
    const valid = (urls || []).filter((u) => typeof u === 'string' && u.startsWith('http'));
    if (valid.length === 0) return;

    valid.slice(0, eagerCount).forEach(warmImage);
    const queue = valid.slice(eagerCount);
    if (!scheduleRemainder || queue.length === 0) return;

    const run = (deadline) => {
        while (queue.length > 0 && (!deadline || deadline.timeRemaining() > 4)) {
            warmImage(queue.shift());
        }
        if (queue.length > 0) {
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(run, { timeout: 1200 });
            } else {
                setTimeout(() => run(), 50);
            }
        }
    };

    if (queue.length > 0) {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(run, { timeout: 1200 });
        } else {
            setTimeout(() => run(), 50);
        }
    }
}

async function fetchJsonCached(jsonPath) {
    if (__jsonCache.has(jsonPath)) return __jsonCache.get(jsonPath);
    /* default：刷新时仍走正常 HTTP 缓存策略；force-cache 在部分 WebKit 上易与磁盘缓存交互异常 */
    const response = await fetch(jsonPath, { cache: 'default' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    __jsonCache.set(jsonPath, data);
    return data;
}

/**
 * 加载图片列表并初始化轮播图 (加载 R2 图片)
 */
async function loadGalleryImages(containerId, navId, jsonPath, count = Infinity) {
    const container = document.getElementById(containerId);
    const nav = navId ? document.getElementById(navId) : null;
    if (!container) { console.error(`Error: Container #${containerId} not found.`); return; }
    if (container.dataset.loadedJsonPath === jsonPath && container.childElementCount > 0) return;
    container.innerHTML = ''; if (nav) nav.innerHTML = '';
    console.log(`[${containerId}] Loading image URLs from: ${jsonPath}`);
    try {
        const imageUrls = await fetchJsonCached(jsonPath);
        if (!Array.isArray(imageUrls)) throw new Error(`JSON data from ${jsonPath} is not a valid array.`);
        console.log(`[${containerId}] Found ${imageUrls.length} image URLs.`);
        let finalImageUrls = (count !== Infinity && count > 0) ? imageUrls.slice(0, count) : imageUrls;
        finalImageUrls = finalImageUrls.map(normalizeImageUrl);
        const isMobileWarm = __isMobileImageWarmProfile();
        if (isMobileWarm && finalImageUrls.length > 4) {
            finalImageUrls = finalImageUrls.slice(0, 4);
        }
        if (finalImageUrls.length === 0) { container.innerHTML = '<p style="color: white; text-align: center;">No images.</p>'; return; }
        const fragment = document.createDocumentFragment();
        /* 桌面：首轮铺满 background + 全量 warm，叠化顺滑；手机：仅首张 + 单 URL eager warm（与 d74c145 一致），防刷新解码/内存尖峰 */
        const initialBgCount = isMobileWarm ? 1 : finalImageUrls.length;
        finalImageUrls.forEach((imgUrl, index) => {
            const slide = document.createElement('div'); slide.className = 'gallery-slide';
            if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                slide.dataset.bgImage = imgUrl;
                if (index < initialBgCount) {
                    slide.style.backgroundImage = `url('${imgUrl}')`;
                    slide.dataset.bgApplied = '1';
                }
            } else { console.warn(`[${containerId}] Invalid URL: '${imgUrl}'`); slide.textContent = `Invalid URL`; /*...*/ }
            fragment.appendChild(slide);
            if (nav) { const dot = document.createElement('div'); dot.className = index === 0 ? 'gallery-dot active' : 'gallery-dot'; dot.dataset.index = index; nav.appendChild(dot); }
        });
        container.appendChild(fragment);
        container.dataset.loadedJsonPath = jsonPath;
        const galEager = isMobileWarm
            ? Math.min(1, finalImageUrls.length)
            : finalImageUrls.length;
        warmImagesIdle(finalImageUrls, galEager, !isMobileWarm);

        // 初始化轮播逻辑 (如果提供了 navId 且有多张图片)
        console.log(`[LoadGalleryImages DEBUG ${containerId}] Checking conditions for calling initializeGallerySlider:`); // 新增
        console.log(`[LoadGalleryImages DEBUG ${containerId}] navId:`, navId); // 新增
        console.log(`[LoadGalleryImages DEBUG ${containerId}] nav element (document.getElementById(navId)):`, nav); // 新增
        console.log(`[LoadGalleryImages DEBUG ${containerId}] finalImageUrls.length:`, finalImageUrls.length); // 新增
        console.log(`[LoadGalleryImages DEBUG ${containerId}] Condition (navId && finalImageUrls.length > 1):`, (navId && finalImageUrls.length > 1)); // 新增

        if (navId && finalImageUrls.length > 1) {
            console.log(`[LoadGalleryImages DEBUG ${containerId}] Conditions MET. Calling initializeGallerySlider...`); // 新增
            initializeGallerySlider(containerId, navId);
        } else if (nav) { // 注意，如果 navId 为空但 nav 存在（理论上不应发生），或图片不足，会进入这里
            console.log(`[LoadGalleryImages DEBUG ${containerId}] Conditions NOT MET for initializeGallerySlider. navId: ${navId}, length: ${finalImageUrls.length}. Hiding nav element if it exists.`); // 新增
             nav.style.display = 'none';
        } else { // navId 和 nav 都为空
             console.log(`[LoadGalleryImages DEBUG ${containerId}] Conditions NOT MET for initializeGallerySlider. navId: ${navId} (nav element also null), length: ${finalImageUrls.length}.`); // 新增
        }
        console.log(`[${containerId}] Successfully displayed ${finalImageUrls.length} images from ${jsonPath}`);

    } catch (error) {
        console.error(`Error loading images for ${containerId} from ${jsonPath}:`, error);
        container.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">无法加载图片列表 (${jsonPath})。</p>`;
    }
}


/**
 * 初始化对比区滑块交互 (在 handle touchstart 中阻止默认行为)
 */
function initializeComparison() {
    console.log("[Comparison] initializeComparison 函数开始执行...");
    const sliderContainer = document.querySelector('.comparison-slider'); // Get slider container
    const comparisonWrappers = document.querySelectorAll('.comparison-wrapper');
    console.log(`[Comparison] 找到 ${comparisonWrappers.length} 个 .comparison-wrapper 元素进行滑块初始化。`);
    comparisonWrappers.forEach(wrapper => {
        const handle = wrapper.querySelector('.slider-handle');
        const afterMask = wrapper.querySelector('.comparison-after-mask');
        const afterImage = afterMask ? afterMask.querySelector('img.after') : wrapper.querySelector('img.after');
        if (!handle || !afterImage) {
            console.warn("Skipping comparison init for wrapper missing handle or after image:", wrapper);
            return;
        }

        let isResizing = false;
        let animationFrameId = null;
        let handleMoveRaf = null;
        let pendingClientX = null;

        const moveHandler = (clientX) => {
            if (!isResizing) return;
            pendingClientX = clientX;
            if (handleMoveRaf != null) return;
            handleMoveRaf = requestAnimationFrame(() => {
                handleMoveRaf = null;
                const cx = pendingClientX;
                pendingClientX = null;
                if (!isResizing || cx == null) return;

                const rect = wrapper.getBoundingClientRect();
                if (!rect || rect.width <= 0) return;

                const sensitivityFactor = 1.2;
                const rawX = cx - rect.left;
                const x = Math.min(Math.max(0, rawX * sensitivityFactor), rect.width);
                const percent = (x / rect.width) * 100;
                const clampedPercent = Math.max(0, Math.min(100, percent));
                const reveal = Math.max(clampedPercent, 0.35);

                handle.style.left = `${clampedPercent}%`;
                if (afterMask) {
                    afterMask.style.width = `${clampedPercent}%`;
                    afterImage.style.width = `${(100 / reveal) * 100}%`;
                } else {
                    afterImage.style.clipPath = `inset(0 ${100 - clampedPercent}% 0 0)`;
                }
            });
        };
        
        // 其余代码保持不变
        const startResize = (e) => { 
            console.log('[Comparison StartResize] Setting isResizing = true');
            isResizing = true; 
            wrapper.classList.add('active');
            __notifyComparisonHandleDragStart();
        };
        const endResize = () => { 
            if (!isResizing) return; 
            console.log('[Comparison EndResize] Setting isResizing = false');
            isResizing = false; 
            wrapper.classList.remove('active'); 
            cancelAnimationFrame(animationFrameId);
            if (handleMoveRaf != null) {
                cancelAnimationFrame(handleMoveRaf);
                handleMoveRaf = null;
            }
            pendingClientX = null;
            __notifyComparisonHandleDragEnd();
        };

        // 清理旧监听器（如果存在）
        handle.removeEventListener('mousedown', startResize);
        document.removeEventListener('mousemove', moveHandler); // 注意：全局监听器移除可能影响其他实例，最好绑定到特定元素或用标志位
        window.removeEventListener('mouseup', endResize);      // 使用 window 捕获释放
        handle.removeEventListener('touchstart', startResize);
        handle.removeEventListener('touchmove', moveHandler);
        window.removeEventListener('touchend', endResize);     // 使用 window 捕获释放
        window.removeEventListener('touchcancel', endResize);  // 使用 window 捕获释放

        // 重新绑定
        handle.addEventListener('mousedown', (e) => { e.preventDefault(); startResize(e); });
        // 将 mousemove 和 mouseup 绑定到 document 可能导致冲突，最好限定范围或在 up 时移除
        // 暂时保留 document 监听，但注意潜在问题
        document.addEventListener('mousemove', (e) => { 
            if(isResizing) moveHandler(e.clientX); 
        });
        window.addEventListener('mouseup', endResize); 

        // Touch listeners
        handle.addEventListener('touchstart', (e) => {
            console.log('[Comparison Handle TouchStart]'); // 添加日志
            if (e.target === handle || handle.contains(e.target)) {
                e.preventDefault(); // 阻止滚动等默认行为
                e.stopPropagation(); 
            startResize(e);
            }
        }, { passive: false }); // <-- 重要：设为 false，因为我们需要调用 preventDefault

        handle.addEventListener('touchmove', (e) => { 
            // console.log('[Comparison TouchMove Listener] isResizing:', isResizing);
            if (!isResizing) return;
            // 移除 preventDefault，依赖 CSS 的 touch-action 属性
            // e.preventDefault(); 
            if (e.touches.length > 0) moveHandler(e.touches[0].clientX); 
        }); 
        // endResize 监听器保持在 window 上

        // --- 设置初始状态 ---
        const initialPercent = 50;
        const reveal0 = Math.max(initialPercent, 0.35);
        handle.style.left = `${initialPercent}%`;
        if (afterMask) {
            afterMask.style.width = `${initialPercent}%`;
            afterImage.style.width = `${(100 / reveal0) * 100}%`;
            afterImage.style.clipPath = '';
        } else {
            afterImage.style.clipPath = `inset(0 ${100 - initialPercent}% 0 0)`;
        }
        const parentGroup = wrapper.closest('.comparison-group');
        const parentGroupId = parentGroup ? parentGroup.id : 'wrapper';
        console.log(`[Comparison Init] Set initial state for ${parentGroupId} to ${initialPercent}%`);
    });
}

/**
 * 初始化对比区移动端导航点
 */
function initializeComparisonNav() {
    console.log("[Comparison] initializeComparisonNav 函数开始执行...");
    if (window.innerWidth > 767) { 
        console.log("[Comparison] 桌面端，跳过移动导航初始化。确保 group 可见。");
        const navContainer = document.getElementById('comparison-nav-dynamic');
        if (navContainer) navContainer.style.display = 'none';
        // 确保桌面端所有 group 都可见
        document.querySelectorAll('#comparison-container-dynamic .comparison-group').forEach(g => {
            g.classList.remove('active'); // 移除 active 类
            g.style.position = ''; // 移除 absolute 定位
            g.style.opacity = '';   // 恢复默认透明度
            g.style.visibility = ''; // 恢复默认可见性
        });
        return;
    }

    // --- 移动端逻辑 ---
    const navContainer = document.getElementById('comparison-nav-dynamic');
    const groups = document.querySelectorAll('#comparison-container-dynamic .comparison-group');
    if (!navContainer || groups.length === 0) {
        console.warn('Comparison nav container or groups not found for mobile nav init.');
        return;
    }

    navContainer.innerHTML = ''; // 清空旧点
    navContainer.style.display = 'flex'; // 确保导航容器可见

    groups.forEach((group, index) => {
        // 移动端需要绝对定位来重叠显示
        group.style.position = 'absolute';
        group.style.opacity = index === 0 ? '1' : '0';
        group.style.visibility = index === 0 ? 'visible' : 'hidden';

        const navBtn = document.createElement('button');
        navBtn.className = `comparison-nav-btn${index === 0 ? ' active' : ''}`;
        navBtn.dataset.index = index;
        navBtn.title = `View Comparison ${index + 1}`;
        navBtn.setAttribute('aria-label', `View Comparison ${index + 1}`);
        navContainer.appendChild(navBtn);

        navBtn.addEventListener('click', () => {
            document.querySelectorAll('#comparison-nav-dynamic .comparison-nav-btn').forEach(b => b.classList.remove('active'));
            groups.forEach(g => {
                g.classList.remove('active');
                g.style.opacity = '0'; // 使用透明度过渡
                g.style.visibility = 'hidden';
            });
            navBtn.classList.add('active');
            if (groups[index]) {
                groups[index].classList.add('active');
                groups[index].style.opacity = '1';
                groups[index].style.visibility = 'visible';
            } else {
                console.error(`Comparison group with index ${index} not found.`);
            }
        });
    });
     if (groups[0]) groups[0].classList.add('active'); // 确保第一个 active
}

/**
 * 对比区延后到接近视口再构建，减轻首屏与双轮播争用解码；直达 #comparison 或 ?section=comparison 仍立即加载。
 * 不增加任何备份文件，恢复上一版可用标签 checkpoint/main-before-smooth-20260402。
 */
function scheduleLoadComparisonWhenNearViewport(jsonPath) {
    const path = jsonPath || 'images/comparison_groups.json';
    const run = () => {
        loadAndInitComparison(path).catch((e) => {
            console.error('[Comparison] 未捕获的初始化失败', e);
        });
    };

    const eager = () => {
        try {
            if (new URLSearchParams(window.location.search).get('section') === 'comparison') return true;
            const h = (window.location.hash || '').replace(/^#/, '');
            if (h === 'comparison') return true;
        } catch (e) {
            /* ignore */
        }
        const el = document.getElementById('comparison');
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight || 0;
        return r.bottom > 0 && r.top < vh * 0.95;
    };

    if (eager()) {
        run();
        return;
    }

    const root = document.getElementById('comparison');
    if (!root || typeof IntersectionObserver !== 'function') {
        run();
        return;
    }

    const io = new IntersectionObserver(
        (entries) => {
            for (let i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    io.disconnect();
                    run();
                    return;
                }
            }
        },
        { root: null, rootMargin: '320px 0px', threshold: 0.01 }
    );
    io.observe(root);
}

/**
 * 加载对比区数据并初始化 (从 comparison_groups.json 加载)
 * @param {string} jsonPath - comparison_groups.json 的路径
 */
async function loadAndInitComparison(jsonPath) {
    const container = document.getElementById('comparison-container-dynamic');
    if (!container) { console.error('Comparison container not found.'); return; }
    if (container.dataset.loadedJsonPath === jsonPath && container.childElementCount > 0) return;

    const thumbnailNavContainer = document.createElement('div');
    thumbnailNavContainer.className = 'comparison-thumbnail-nav';
    thumbnailNavContainer.id = 'comparison-thumbnail-nav-dynamic';

    container.innerHTML = '';

    console.log(`[Comparison] Loading groups from: ${jsonPath}`);

    try {
        const comparisonGroupsData = await fetchJsonCached(jsonPath);
        if (!Array.isArray(comparisonGroupsData)) throw new Error(`JSON not array.`);
        console.log(`[Comparison] Found ${comparisonGroupsData.length} groups.`);
        if (comparisonGroupsData.length === 0) { container.innerHTML = '<p style="color: white; text-align: center;">No comparison groups.</p>'; return; }
        container.dataset.loadedJsonPath = jsonPath;
        const comparisonUrls = [];
        comparisonGroupsData.forEach((g) => {
            if (g && g.before_src) comparisonUrls.push(normalizeImageUrl(g.before_src));
            if (g && g.after_src) comparisonUrls.push(normalizeImageUrl(g.after_src));
        });
        const isMobileWarm = __isMobileImageWarmProfile();
        /* 手机：不做对比区 warm（避免额外 Image()+decode 与 DOM 叠加）；桌面全量 warm */
        if (!isMobileWarm) {
            warmImagesIdle(comparisonUrls, comparisonUrls.length, true);
        }

        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'comparison-slider';
        console.log("[Comparison] 创建 comparison-slider div.");

        const fragment = document.createDocumentFragment();
        const thumbnailFragment = document.createDocumentFragment(); 

        comparisonGroupsData.forEach((groupData, index) => {
            console.log(`[Comparison] ---- 开始处理 group ${index}, ID: ${groupData.id} ----`);
            // 现在需要 before_src 来生成缩略图
            if (!groupData.id || !groupData.before_src || !groupData.after_src) { console.warn(`[Comparison] 跳过无效数据 at index ${index}`); return; }
            try {
                const group = document.createElement('div');
                group.className = `comparison-group`;
                group.id = `comparison-group-${groupData.id}`;
                console.log(`[Comparison ${groupData.id}] Group div 创建成功.`);

                const wrapper = document.createElement('div');
                wrapper.className = `comparison-wrapper`;
                console.log(`[Comparison ${groupData.id}] Wrapper div 创建成功, class: ${wrapper.className}`);

                const imgBefore = document.createElement('img');
                imgBefore.alt = 'Before'; imgBefore.className = 'before';
                imgBefore.loading = 'eager';
                imgBefore.decoding = isMobileWarm ? 'async' : 'sync';
                if (index < 2) imgBefore.fetchPriority = 'high';
                imgBefore.draggable = false; 
                console.log(`[Comparison ${groupData.id}] 设置 Before src: ${groupData.before_src}`);
                const beforeUrl = normalizeImageUrl(groupData.before_src);
                imgBefore.src = beforeUrl;
                imgBefore.onerror = () => { imgBefore.alt='Image not found'; imgBefore.src=''; console.error(`[Comparison ${groupData.id}] 加载 Before 图片失败: ${groupData.before_src}`);};
                console.log(`[Comparison ${groupData.id}] Before img 创建成功.`);

                const imgAfter = document.createElement('img');
                imgAfter.alt = 'After'; imgAfter.className = 'after';
                imgAfter.loading = 'eager';
                imgAfter.decoding = isMobileWarm ? 'async' : 'sync';
                if (index < 2) imgAfter.fetchPriority = 'high';
                imgAfter.draggable = false; 
                console.log(`[Comparison ${groupData.id}] 设置 After src: ${groupData.after_src}`);
                const afterUrl = normalizeImageUrl(groupData.after_src);
                imgAfter.src = afterUrl;
                imgAfter.onerror = () => { imgAfter.alt='Image not found'; imgAfter.src=''; console.error(`[Comparison ${groupData.id}] 加载 After 图片失败: ${groupData.after_src}`);};
                console.log(`[Comparison ${groupData.id}] After img 创建成功.`);

                const sliderHandle = document.createElement('div'); 
                sliderHandle.className = 'slider-handle';
                const sliderLine = document.createElement('span');
                sliderLine.className = 'slider-line';
                sliderHandle.appendChild(sliderLine); 
                console.log(`[Comparison ${groupData.id}] Handle div (with line span) 创建成功.`);

                const afterMask = document.createElement('div');
                afterMask.className = 'comparison-after-mask';
                afterMask.appendChild(imgAfter);

                wrapper.appendChild(imgBefore);
                wrapper.appendChild(afterMask);
                wrapper.appendChild(sliderHandle);
                console.log(`[Comparison ${groupData.id}] 图片和 handle 已附加到 wrapper.`);
                group.appendChild(wrapper);
                console.log(`[Comparison ${groupData.id}] Wrapper 已附加到 group.`);
                
                console.log(`[Comparison ${groupData.id}] 准备将 group 附加到 fragment...`);
                fragment.appendChild(group);
                console.log(`[Comparison ${groupData.id}] Group 已附加到 fragment.`);

                // --- 创建并添加缩略图元素 ---
                const thumbItem = document.createElement('div');
                thumbItem.className = 'comparison-thumbnail-item';
                thumbItem.dataset.targetId = group.id;
                const thumbImg = document.createElement('img');
                const thumbUrl = normalizeImageUrl(groupData.after_src);
                thumbImg.src = thumbUrl;
                thumbImg.alt = `Thumbnail for ${groupData.id}`;
                thumbImg.loading = 'eager';
                thumbImg.decoding = isMobileWarm ? 'async' : 'sync';
                thumbImg.onerror = () => { thumbImg.alt='Thumb not found'; thumbImg.src=''; console.error(`[Comparison ${groupData.id}] 加载 Thumbnail 图片失败: ${groupData.after_src}`); };
                thumbItem.appendChild(thumbImg);
                thumbnailFragment.appendChild(thumbItem); 
                console.log(`[Comparison ${groupData.id}] Thumbnail item 创建并添加到 fragment.`);
                // --- 结束 ---

            } catch (error) {
                 console.error(`[Comparison] 处理 group ${index} (ID: ${groupData.id}) 时发生严重错误:`, error);
                 console.error(error.stack);
            }
            console.log(`[Comparison] ---- 结束处理 group ${index}, ID: ${groupData.id} ----`);
        });

        console.log("[Comparison] 循环结束. 将 slider 和 thumbnail nav 插入页面...");
        if(document.body.contains(container)) {
             sliderContainer.appendChild(fragment);
             thumbnailNavContainer.appendChild(thumbnailFragment); 
             container.appendChild(sliderContainer);        
             container.appendChild(thumbnailNavContainer); 
             console.log("[Comparison] Slider 和 Thumbnail Nav 已插入页面容器。");
        } else { console.error("[Comparison] 主容器已不存在！"); }

        /* 手机：只等 img load，不连环 decode（防崩）；桌面：load + 去重逐帧 decode */
        await Promise.race([
            primeComparisonImages(container, { decode: !isMobileWarm }),
            new Promise((r) => setTimeout(r, isMobileWarm ? 10000 : 14000)),
        ]);

        // --- 初始化交互 --- 
        initializeComparison(); // 初始化滑块交互
        initializeThumbnailNav(sliderContainer, thumbnailNavContainer); // <-- 恢复：不再传递 groups
        initializeDragScrolling(); // 初始化拖动滚动（仅鼠标；触摸走原生 overflow 滚动）

        console.log(`[Comparison] Placeholder setup complete with horizontal slider and thumbnail nav.`);

    } catch (error) { console.error(`Error in loadAndInitComparison:`, error); if (container) { container.innerHTML = `<p style="color: red;">无法加载对比区。</p>`; } }
}

/**
 * 对比区：先等全部 img load；桌面再对唯一 URL 逐帧 decode。
 * @param {{ decode?: boolean }} opts decode 默认 true；手机用 false 避免刷新时 GPU/内存尖峰崩溃。
 */
function primeComparisonImages(comparisonRoot, opts) {
    if (!comparisonRoot) return Promise.resolve();
    const doDecode = !(opts && opts.decode === false);
    const imgs = Array.from(
        comparisonRoot.querySelectorAll('.comparison-wrapper img, .comparison-thumbnail-item img')
    );
    if (imgs.length === 0) return Promise.resolve();

    const waitLoaded = (img) =>
        new Promise((resolve) => {
            const timeoutMs = 20000;
            const t = setTimeout(resolve, timeoutMs);
            const ok = () => {
                clearTimeout(t);
                resolve();
            };
            if (img.complete && img.naturalWidth > 0) ok();
            else {
                img.addEventListener('load', ok, { once: true });
                img.addEventListener(
                    'error',
                    () => {
                        clearTimeout(t);
                        resolve();
                    },
                    { once: true }
                );
            }
        });

    const decodeOne = (img) =>
        new Promise((resolve) => {
            if (typeof img.decode !== 'function') {
                resolve();
                return;
            }
            img.decode().then(resolve).catch(resolve);
        });

    return (async () => {
        try {
            await Promise.all(imgs.map(waitLoaded));
            if (!doDecode) return;
            const seen = new Set();
            const unique = [];
            for (const img of imgs) {
                const key = (img.currentSrc || img.src || '').trim();
                if (!key || seen.has(key)) continue;
                seen.add(key);
                unique.push(img);
            }
            for (const img of unique) {
                await new Promise((r) => requestAnimationFrame(r));
                await decodeOne(img);
            }
        } catch (e) {
            console.warn('[Comparison] primeComparisonImages', e);
        }
    })();
}

/**
 * 缩略图：仅点击滚到对应组；无 .active 高亮框、不与滚动联动（避免与对比条操作抢布局）。
 * 若需恢复「滚动/停稳后高亮跟随」：git revert 本文件对应提交，或检出带标签 comparison-thumb-highlight-follow 的历史。
 */
function initializeThumbnailNav(sliderContainer, navContainer) {
    console.log("[Comparison] Thumbnail nav: click-to-scroll only, no highlight sync.");
    if (!sliderContainer || !navContainer) {
        console.warn("[Comparison] Slider or Nav container not found for init.");
        return;
    }
    const thumbItems = navContainer.querySelectorAll('.comparison-thumbnail-item');
    if (thumbItems.length === 0) return;

    function handleThumbClick(event) {
        const clickedItem = event.currentTarget;
        const targetId = clickedItem.dataset.targetId;
        const targetGroup = document.getElementById(targetId);
        if (!targetGroup) return;
        targetGroup.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
    }

    thumbItems.forEach((item) => {
        item.removeEventListener('click', handleThumbClick);
        item.addEventListener('click', handleThumbClick);
    });
}

/** 桌面端鼠标拖横滚；触摸由原生 overflow-x + touch-action 处理。 */
function initializeDragScrolling() {
    const slider = document.querySelector('.comparison-slider');
    if (!slider) {
        console.warn("Comparison slider not found for drag scrolling init.");
        return;
    }

    let isDown = false;
    let startX, currentX;
    let scrollLeft;
    let isScrolling = false;
    const scrollThreshold = 2;

    slider.addEventListener('mousedown', (e) => {
        if (e.target.closest('.slider-handle')) return;

        isDown = true;
        isScrolling = false;
        slider.classList.add('active-drag');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
        e.preventDefault();
    });
    
    // 优化鼠标离开事件
    slider.addEventListener('mouseleave', () => {
        if (!isDown) return;
        isDown = false;
        slider.classList.remove('active-drag');
    });
    
    // 优化鼠标释放事件
    window.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        slider.classList.remove('active-drag');
    });
    
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;

        if (!isScrolling) {
            currentX = e.pageX - slider.offsetLeft;
            if (Math.abs(currentX - startX) > scrollThreshold) {
                isScrolling = true;
            }
        }
        
        if (isScrolling) {
            e.preventDefault();
            const x = e.pageX - slider.offsetLeft;
            // 保持适中的速度系数
            const walk = (x - startX) * 1.8; // 降低速度系数，从2.2降至1.8
            const targetScrollLeft = scrollLeft - walk;
            
            // 直接设置位置而不是使用动画，提高直接感
            slider.scrollLeft = targetScrollLeft;
        }
    });

    console.log('[Comparison] 横向滑动：触摸=原生滚动；鼠标=拖拽');
}


// --- 其他函数 (轮播, 表单, 弹窗, 菜单) ---
function initializeGallerySlider(slidesId, dotsId) {
    console.log(`[FadeSlider DEBUG] initializeGallerySlider called with slidesId: ${slidesId}, dotsId: ${dotsId}`); // 新增

    const slidesContainer = document.getElementById(slidesId);
    console.log(`[FadeSlider DEBUG] slidesContainer (element with ID ${slidesId}):`, slidesContainer); // 新增

    if (!slidesContainer) {
        console.error(`[FadeSlider DEBUG] Gallery container #${slidesId} NOT FOUND. Aborting init.`); // 修改
        return;
    }

    // Ensure the direct parent (.gallery-slider) is positioned relatively
    // This is crucial for the absolute positioning of slides within it.
    const gallerySliderElement = slidesContainer.closest('.gallery-slider');
    if (gallerySliderElement) {
        gallerySliderElement.style.position = 'relative';
    } else {
        console.warn(`[FadeSlider DEBUG] Could not find .gallery-slider parent for #${slidesId}. Ensure it exists and wraps .gallery-slides.`); // 修改
    }

    const slideElements = Array.from(slidesContainer.querySelectorAll('.gallery-slide'));
    console.log(`[FadeSlider DEBUG] Found ${slideElements.length} .gallery-slide elements inside #${slidesId}. First slide element:`, slideElements.length > 0 ? slideElements[0] : 'None'); // 新增


    const dotElements = dotsId ? Array.from(document.querySelectorAll(`#${dotsId} .gallery-dot`)) : [];
    console.log(`[FadeSlider DEBUG] Found ${dotElements.length} .gallery-dot elements for dotsId: ${dotsId}`); // 新增


    if (slideElements.length === 0) {
        console.warn(`[FadeSlider DEBUG] No .gallery-slide elements found in #${slidesId}. Aborting.`); // 新增
        return;
    }

    let currentIndex = 0;
    let intervalId = null;
    let transitionLock = false;
    /* 慢速叠化 + 较长停留，接近屏保感；时长需与下方 CSS .gallery-slide 兜底一致 */
    const transitionDuration = 2200;
    const autoPlayDelay = 9000;
    const easeCrossfade = 'cubic-bezier(0.42, 0, 0.58, 1)';

    const isMobileWarm = __isMobileImageWarmProfile();
    const disableAutoplayOnMobile = false;
    function applySlideBackground(slide) {
        if (!slide || !slide.dataset || !slide.dataset.bgImage) return;
        if (slide.dataset.bgApplied === '1') return;
        slide.style.backgroundImage = `url('${slide.dataset.bgImage}')`;
        slide.dataset.bgApplied = '1';
    }

    // Prepare slides
    slideElements.forEach((slide, index) => {
        slide.style.position = 'absolute';
        slide.style.top = '0';
        slide.style.left = '0';
        slide.style.width = '100%';
        slide.style.height = '100%';
        slide.style.opacity = index === 0 ? '1' : '0';
        slide.style.visibility = index === 0 ? 'visible' : 'hidden';
        slide.style.zIndex = index === 0 ? '2' : '1';
        slide.style.transition = `opacity ${transitionDuration}ms ${easeCrossfade}`;
        slide.style.transform = 'translateZ(0)';
        slide.style.backfaceVisibility = 'hidden';

        if (slide.dataset.bgImage) {
            /* 手机只预贴首张，其余在 showSlide 时再贴，避免与多张大图 decode 叠加 */
            if (!isMobileWarm || index === 0) {
                applySlideBackground(slide);
            }
        } else {
            console.warn(`[FadeSlider DEBUG] Slide ${index} in #${slidesId} is missing data-bgImage attribute.`);
        }
    });
    console.log(`[FadeSlider DEBUG] Slides prepared for #${slidesId}. Current index: ${currentIndex}`); // 新增

    function showSlide(newIndex) {
        if (newIndex === currentIndex || slideElements.length === 0) return;
        if (transitionLock) return;

        const prevIndex = currentIndex;
        const currentSlide = slideElements[prevIndex];
        const nextSlide = slideElements[newIndex];
        const nextUrl = nextSlide.dataset.bgImage;
        if (nextUrl) applySlideBackground(nextSlide);

        /* slide 已在 loadGalleryImages 挂上 background 时，勿因 hidden Image 未进缓存而卡住叠化（否则会「等一下再闪」） */
        const cacheKey = nextUrl && typeof nextUrl === 'string' ? normalizeImageUrl(nextUrl) : '';
        const bgAlreadyOnSlide = nextSlide.dataset.bgApplied === '1';
        if (nextUrl && !bgAlreadyOnSlide && cacheKey && !__imageReadyCache.has(cacheKey)) {
            warmImage(nextUrl, () => showSlide(newIndex));
            const preloadIndex = (newIndex + 1) % slideElements.length;
            const preloadSlide = slideElements[preloadIndex];
            if (preloadSlide && preloadSlide.dataset.bgImage) {
                if (!isMobileWarm) applySlideBackground(preloadSlide);
                warmImage(preloadSlide.dataset.bgImage);
            }
            return;
        }

        if (nextUrl) warmImage(nextUrl);
        const nextIndex = (newIndex + 1) % slideElements.length;
        const nextNextSlide = slideElements[nextIndex];
        if (nextNextSlide && nextNextSlide.dataset.bgImage) {
            if (!isMobileWarm) applySlideBackground(nextNextSlide);
            warmImage(nextNextSlide.dataset.bgImage);
        }

        transitionLock = true;

        nextSlide.style.visibility = 'visible';
        nextSlide.style.zIndex = '3';
        currentSlide.style.zIndex = '2';
        nextSlide.style.opacity = '0';
        void nextSlide.offsetHeight;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                nextSlide.style.opacity = '1';
                currentSlide.style.opacity = '0';
            });
        });

        const onCurrentFadeOut = (e) => {
            if (e.propertyName !== 'opacity') return;
            currentSlide.removeEventListener('transitionend', onCurrentFadeOut);
            currentSlide.style.visibility = 'hidden';
            currentSlide.style.zIndex = '1';
            nextSlide.style.zIndex = '2';
            transitionLock = false;
        };
        currentSlide.addEventListener('transitionend', onCurrentFadeOut);

        window.setTimeout(() => {
            if (!transitionLock) return;
            currentSlide.removeEventListener('transitionend', onCurrentFadeOut);
            currentSlide.style.visibility = 'hidden';
            currentSlide.style.zIndex = '1';
            nextSlide.style.zIndex = '2';
            transitionLock = false;
        }, transitionDuration + 120);

        if (dotElements.length > 0) {
            if (dotElements[prevIndex]) dotElements[prevIndex].classList.remove('active');
            if (dotElements[newIndex]) dotElements[newIndex].classList.add('active');
        }
        currentIndex = newIndex;
        console.log(`[FadeSlider DEBUG #${slidesId}] Crossfade ${prevIndex} -> ${newIndex}.`);
    }

    function next() {
        showSlide((currentIndex + 1) % slideElements.length);
    }

    function prev() {
        showSlide((currentIndex - 1 + slideElements.length) % slideElements.length);
    }

    function startAutoPlay() {
        if (disableAutoplayOnMobile) {
            console.log(`[FadeSlider DEBUG #${slidesId}] Autoplay disabled on mobile safe mode.`);
            return;
        }
        stopAutoPlay(); // Clear existing interval before starting a new one
        if (slideElements.length > 1) { // Only autoplay if there's more than one slide
            intervalId = setInterval(next, autoPlayDelay);
            console.log(`[FadeSlider DEBUG #${slidesId}] Autoplay started. Interval ID: ${intervalId}`); // 新增
        } else {
            console.log(`[FadeSlider DEBUG #${slidesId}] Autoplay not started (only 1 or 0 slides).`); // 新增
        }
    }

    function stopAutoPlay() {
        if (intervalId) {
            clearInterval(intervalId);
            console.log(`[FadeSlider DEBUG #${slidesId}] Autoplay stopped. Cleared interval ID: ${intervalId}`); // 新增
            intervalId = null;
        }
    }

    // Initialize dots and their event listeners
    if (dotElements.length > 0) {
        dotElements.forEach((dot, index) => {
        dot.addEventListener('click', () => {
                console.log(`[FadeSlider DEBUG #${slidesId}] Dot ${index} clicked.`); // 新增
                stopAutoPlay();
                showSlide(index);
                // Optionally restart autoplay after manual interaction, or leave it stopped
                // startAutoPlay(); 
        });
    });
        if (dotElements[currentIndex]) dotElements[currentIndex].classList.add('active');
    }
    
    window.__displayGalleryControls = window.__displayGalleryControls || {};
    window.__displayGalleryControls[slidesId] = { stopAutoPlay: stopAutoPlay, startAutoPlay: startAutoPlay };

    // Initial setup: backgrounds are applied up-front in loadGalleryImages.
    startAutoPlay();
    console.log(`[FadeSlider DEBUG] Initialization complete for slider: ${slidesId}.`); // 新增
}
// function initializeContactForm() { /* ... */ }
// function showModal(modalId) { /* ... */ }
// function copyWechatId() { /* ... */ }

// --- DOMContentLoaded 事件监听器 ---
document.addEventListener('DOMContentLoaded', () => {
    try {
    console.log("DOM Loaded. Initializing scripts...");
    // 导航菜单功能 (使用 automotive.html 的逻辑，包含 setTimeout)
    // const menuToggle = document.querySelector('.nav-toggle');
    // const menuContent = document.querySelector('.nav-menu');
    // console.log("Menu Toggle Element:", menuToggle);
    // console.log("Menu Content Element:", menuContent);
    // if (menuToggle && menuContent) {
    //      console.log("菜单元素找到，正在添加监听器 (带 setTimeout 逻辑)...");
    //      menuToggle.addEventListener('click', () => { 
    //          menuToggle.classList.toggle('active');
    //          menuContent.classList.toggle('active');
    //          // Add visibility control with setTimeout
    //          if (!menuContent.classList.contains('active')) {
    //              setTimeout(() => {
    //                  // Check again in case it was quickly reopened
    //                  if (!menuContent.classList.contains('active')) {
    //                      menuContent.style.visibility = 'hidden';
    //                  }
    //              }, 400); // Match CSS transition duration
    //          } else {
    //              menuContent.style.visibility = 'visible';
    //          }
    //      });
    //      const menuItems = menuContent.querySelectorAll('a');
    //      menuItems.forEach(item => { 
    //          item.addEventListener('click', (e) => { 
    //              const targetHref = item.getAttribute('href');
    //              // Only close menu immediately for internal links or same-page links
    //              if (targetHref.startsWith('#') || targetHref === window.location.pathname || targetHref === 'index.html' || item.onclick) {
    //                  // Close the menu
    //                  menuToggle.classList.remove('active');
    //                  menuContent.classList.remove('active');
    //                  // Add setTimeout for visibility
    //                  setTimeout(() => {
    //                      // Check again before hiding
    //                      if (!menuContent.classList.contains('active')) {
    //                         menuContent.style.visibility = 'hidden';
    //                      }
    //                  }, 400);
    //                  // Prevent page reload only for same-page links (not anchor links) AND not for onclick handlers
    //                  if (!targetHref.startsWith('#') && !item.onclick) {
    //                      e.preventDefault(); 
    //                  }
    //              } 
    //              // For external links, let the browser navigate. The menu will be closed on the new page load.
    //          }); 
    //      });
    //      console.log("菜单事件监听器添加完成 (带 setTimeout 逻辑)。");
    // } else { console.warn('菜单切换按钮或内容未找到...'); }

    // *** 初始化调用 ***
    console.log("开始加载轮播图和对比区...");
    loadGalleryImages('automotive-slides', 'automotive-nav', 'images/display_automotive.json').catch((e) =>
        console.error('[Gallery] automotive init failed', e)
    );
    loadGalleryImages('portrait-slides', 'portrait-nav', 'images/display_portrait.json').catch((e) =>
        console.error('[Gallery] portrait init failed', e)
    );
    scheduleLoadComparisonWhenNearViewport('images/comparison_groups.json');
    // initializeContactForm(); // Commented out - function not defined

    // 弹窗功能初始化
    const socialLinks = document.querySelectorAll('.social-link[onclick]'); /* ... */
    const closeBtns = document.querySelectorAll('.modal-close'); /* ... */
    const overlays = document.querySelectorAll('.modal-overlay'); /* ... */
    const copyBtn = document.querySelector('#wechatModal .copy-button'); /* ... */

    // 禁用图片右键菜单
    function disableContextMenu(selector) { /* ... */ }
    disableContextMenu('.gallery-slide');
    disableContextMenu('.comparison-wrapper img');
    disableContextMenu('.placeholder-box'); // 对占位符也禁用

    // 窗口大小调整事件 - 不再需要处理对比区导航
    // window.addEventListener('resize', initializeComparisonNav);

    console.log("主 DOMContentLoaded 事件监听器执行完毕。");
    } catch (err) {
        console.error('[main] DOMContentLoaded init error', err);
    }
}); // DOMContentLoaded 结束