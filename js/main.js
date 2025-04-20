// *** 函数定义区域 ***

/**
 * 加载图片列表并初始化轮播图
 * @param {string} containerId - 图片容器元素的 ID
 * @param {string|null} navId - 导航点容器元素的 ID (可选, 用于轮播)
 * @param {string} jsonPath - 要加载的 JSON 文件路径 (包含 R2 URL 列表)
 * @param {number} [count=Infinity] - 最多加载多少张图片
 */
async function loadGalleryImages(containerId, navId, jsonPath, count = Infinity) {
    const container = document.getElementById(containerId);
    const nav = navId ? document.getElementById(navId) : null;

    if (!container) {
        console.error(`Error: Container element with ID '${containerId}' not found.`);
        return;
    }

    container.innerHTML = ''; // 清空容器
    if (nav) nav.innerHTML = ''; // 清空导航点

    console.log(`[${containerId}] Loading image URLs from: ${jsonPath}`);

    try {
        const response = await fetch(`${jsonPath}?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const imageUrls = await response.json();

        if (!Array.isArray(imageUrls)) {
             throw new Error(`JSON data from ${jsonPath} is not a valid array of image URLs.`);
        }

        console.log(`[${containerId}] Found ${imageUrls.length} image URLs.`);

        let finalImageUrls = imageUrls;
        if (count !== Infinity && count > 0) {
           finalImageUrls = imageUrls.slice(0, count);
           console.log(`[${containerId}] Limiting to first ${count} images.`);
        }

        if (finalImageUrls.length === 0) {
             container.innerHTML = '<p style="color: white; text-align: center;">No images found in list.</p>';
             console.warn(`No image URLs listed in ${jsonPath}`);
             return;
        }

        const fragment = document.createDocumentFragment();

        // 预加载第一张图片
        const preloadFirstImage = new Promise((resolve) => {
            if (finalImageUrls[0]) {
                const preloadImg = new Image();
                preloadImg.onload = () => resolve();
                preloadImg.onerror = () => { console.warn(`[${containerId}] Failed to preload first image: ${finalImageUrls[0]}`); resolve(); };
                preloadImg.src = finalImageUrls[0];
            } else {
                resolve();
            }
        });
        await preloadFirstImage;

        // 创建轮播项
        finalImageUrls.forEach((imgUrl, index) => {
            const slide = document.createElement('div');
            slide.className = 'gallery-slide';

            if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                slide.dataset.bgImage = imgUrl; // R2 URL for lazy loading
                if (index < 2) { // Eager load first 2
                    slide.style.backgroundImage = `url('${imgUrl}')`;
                    setTimeout(() => { new Image().src = imgUrl; }, 50);
                }
            } else {
               console.warn(`[${containerId}] Skipping invalid URL entry: '${imgUrl}'`);
               slide.textContent = `Invalid URL`;
               slide.style.color = 'red';
               slide.style.display = 'flex';
               slide.style.alignItems = 'center';
               slide.style.justifyContent = 'center';
            }
            fragment.appendChild(slide);
            if (nav) {
                const dot = document.createElement('div');
                dot.className = index === 0 ? 'gallery-dot active' : 'gallery-dot';
                dot.dataset.index = index;
                nav.appendChild(dot);
            }
        });
        container.appendChild(fragment);

        // 初始化轮播逻辑 (如果提供了 navId 且有多张图片)
        if (navId && finalImageUrls.length > 1) {
            // 传递图片数量给轮播初始化函数
            initializeGallerySlider(containerId, navId, finalImageUrls.length);
        } else if (nav) {
             // 如果只有一张图，隐藏导航点
             nav.style.display = 'none';
        }
        console.log(`[${containerId}] Successfully displayed ${finalImageUrls.length} images from ${jsonPath}`);

    } catch (error) {
        console.error(`Error loading images for ${containerId} from ${jsonPath}:`, error);
        container.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">无法加载图片列表 (${jsonPath})。</p>`;
    }
}


/**
 * 初始化对比区滑块交互
 */
function initializeComparison() {
    console.log("[Comparison] initializeComparison 函数开始执行...");
    const comparisonWrappers = document.querySelectorAll('.comparison-wrapper');
    console.log(`[Comparison] 找到 ${comparisonWrappers.length} 个 .comparison-wrapper 元素。`);
    comparisonWrappers.forEach(wrapper => {
        const handle = wrapper.querySelector('.slider-handle');
        const afterImage = wrapper.querySelector('.after');
        if (!handle || !afterImage) {
            console.warn("Skipping comparison init for wrapper missing handle or after image:", wrapper);
            return;
        }

        let isResizing = false;
        let animationFrameId = null;

        const moveHandler = (clientX) => {
            if (!isResizing) return;
            cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(() => {
                const rect = wrapper.getBoundingClientRect();
                if(!rect || rect.width <= 0) return;
                const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
                const percent = (x / rect.width) * 100;
                const clampedPercent = Math.max(0, Math.min(100, percent));
                handle.style.left = `${clampedPercent}%`;
                afterImage.style.clipPath = `inset(0 ${100 - clampedPercent}% 0 0)`;
            });
        };
        const startResize = (e) => { isResizing = true; wrapper.classList.add('active'); };
        const endResize = () => { if (!isResizing) return; isResizing = false; wrapper.classList.remove('active'); cancelAnimationFrame(animationFrameId); };

        // 清理旧监听器（如果存在）
        handle.removeEventListener('mousedown', startResize);
        document.removeEventListener('mousemove', moveHandler); // 注意：全局监听器移除可能影响其他实例，最好绑定到特定元素或用标志位
        document.removeEventListener('mouseup', endResize);
        handle.removeEventListener('touchstart', startResize);
        handle.removeEventListener('touchmove', moveHandler);
        handle.removeEventListener('touchend', endResize);
        handle.removeEventListener('touchcancel', endResize);

        // 重新绑定
        handle.addEventListener('mousedown', (e) => { e.preventDefault(); startResize(e); });
        // 将 mousemove 和 mouseup 绑定到 document 可能导致冲突，最好限定范围或在 up 时移除
        // 暂时保留 document 监听，但注意潜在问题
        document.addEventListener('mousemove', (e) => { if(isResizing) moveHandler(e.clientX); });
        document.addEventListener('mouseup', endResize);

        handle.addEventListener('touchstart', startResize, { passive: true });
        handle.addEventListener('touchmove', (e) => { if (isResizing && e.touches.length > 0) moveHandler(e.touches[0].clientX); }, { passive: true });
        handle.addEventListener('touchend', endResize);
        handle.addEventListener('touchcancel', endResize);
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
 * 加载对比区数据并初始化 (从 comparison_groups.json 加载)
 * @param {string} jsonPath - comparison_groups.json 的路径
 */
async function loadAndInitComparison(jsonPath) {
    console.log("[Comparison] loadAndInitComparison 函数开始执行...");
    const container = document.getElementById('comparison-container-dynamic');
    const navContainer = document.getElementById('comparison-nav-dynamic');

    if (!container || !navContainer) {
        console.error('Comparison container or nav container not found.');
        if(container) container.innerHTML = '<p style="color: red;">Error: Comparison container missing.</p>';
        return;
    }

    // 预先添加导航容器，清空内容在后面做
    if (!container.contains(navContainer)) {
        container.appendChild(navContainer);
    }
    // 先清空 group 内容，保留 navContainer
    const existingGroups = container.querySelectorAll('.comparison-group');
    existingGroups.forEach(g => container.removeChild(g));
    navContainer.innerHTML = '';

    console.log(`[Comparison] Loading comparison groups from: ${jsonPath}`);

    try {
        console.log("[Comparison] 开始 fetch comparison data...");
        const response = await fetch(`${jsonPath}?t=${Date.now()}`);
        console.log(`[Comparison] Fetch response status: ${response.status}`);
        if (!response.ok) {
            throw new Error(`HTTP error fetching comparison data! status: ${response.status}`);
        }
        const comparisonGroupsData = await response.json();
        console.log("[Comparison] JSON data 解析成功.");

        if (!Array.isArray(comparisonGroupsData)) {
            throw new Error(`Comparison JSON from ${jsonPath} is not a valid array.`);
        }
        console.log(`[Comparison] Found ${comparisonGroupsData.length} comparison groups.`);

        if (comparisonGroupsData.length === 0) {
           container.insertAdjacentHTML('afterbegin', '<p style="color: white; text-align: center;">No comparison groups found.</p>');
           return;
        }

        console.log("[Comparison] 开始预加载第一组图片...");
        const preloadFirstGroup = new Promise((resolve, reject) => {
            if (comparisonGroupsData[0]?.before_src && comparisonGroupsData[0]?.after_src) {
                let loaded = 0;
                const count = 2;
                const onLoaded = () => { if (++loaded === count) { console.log("[Comparison] 第一组图片预加载完成."); resolve(); } };
                const onError = (imgSrc) => { console.warn(`[Comparison] 预加载图片失败: ${imgSrc}`); onLoaded(); };

                const imgBefore = new Image();
                imgBefore.onload = onLoaded;
                imgBefore.onerror = () => onError(comparisonGroupsData[0].before_src);
                console.log(`[Comparison] Preloading Before: ${comparisonGroupsData[0].before_src}`);
                imgBefore.src = comparisonGroupsData[0].before_src;

                const imgAfter = new Image();
                imgAfter.onload = onLoaded;
                imgAfter.onerror = () => onError(comparisonGroupsData[0].after_src);
                console.log(`[Comparison] Preloading After: ${comparisonGroupsData[0].after_src}`);
                imgAfter.src = comparisonGroupsData[0].after_src;

                // 移除超时，让 onerror 处理失败情况
                // setTimeout(resolve, 5000); 
            } else {
                console.log("[Comparison] 第一组数据无效，跳过预加载。.");
                resolve(); 
            }
        });

        try {
            await preloadFirstGroup;
            console.log("[Comparison] 预加载 Promise 完成.");
        } catch (preloadError) {
            console.error("[Comparison] 预加载第一组图片时发生错误:", preloadError);
            // 即使预加载失败，也尝试继续渲染
        }

        const fragment = document.createDocumentFragment();
        console.log("[Comparison] 开始创建对比组元素 (forEach 循环前)...`);

        comparisonGroupsData.forEach((groupData, index) => {
            console.log(`[Comparison] ---- 开始处理 group ${index}, ID: ${groupData.id} ----`); 
            if (!groupData.id || !groupData.before_src || !groupData.after_src) {
                console.warn(`[Comparison] 跳过无效数据 at index ${index}:`, groupData);
                return; 
            }
            try {
                const group = document.createElement('div');
                group.className = `comparison-group${index === 0 ? ' active' : ''}`; 
                group.id = `comparison-group-${groupData.id}`;
                console.log(`[Comparison ${groupData.id}] Group div 创建成功.`);

                const wrapper = document.createElement('div');
                let orientationClass = '';
                if (groupData.id === 'group_01' || groupData.id === 'group_04') {
                    orientationClass = 'portrait';
                } else if (groupData.id === 'group_02' || groupData.id === 'group_03') {
                    orientationClass = 'landscape';
                } else {
                    console.warn(`[Comparison] 未知方向 for group ID: ${groupData.id}`);
                }
                wrapper.className = `comparison-wrapper ${orientationClass}`.trim();
                console.log(`[Comparison ${groupData.id}] Wrapper div 创建成功, class: ${wrapper.className}`);

                const imgBefore = document.createElement('img');
                imgBefore.alt = 'Before'; imgBefore.className = 'before'; imgBefore.loading = 'lazy';
                console.log(`[Comparison ${groupData.id}] 设置 Before src: ${groupData.before_src}`);
                imgBefore.src = groupData.before_src;
                imgBefore.onerror = () => { imgBefore.alt='Image not found'; imgBefore.src=''; console.error(`[Comparison ${groupData.id}] 加载 Before 图片失败: ${groupData.before_src}`);};
                console.log(`[Comparison ${groupData.id}] Before img 创建成功.`);

                const imgAfter = document.createElement('img');
                imgAfter.alt = 'After'; imgAfter.className = 'after'; imgAfter.loading = 'lazy';
                console.log(`[Comparison ${groupData.id}] 设置 After src: ${groupData.after_src}`);
                imgAfter.src = groupData.after_src;
                imgAfter.onerror = () => { imgAfter.alt='Image not found'; imgAfter.src=''; console.error(`[Comparison ${groupData.id}] 加载 After 图片失败: ${groupData.after_src}`);};
                console.log(`[Comparison ${groupData.id}] After img 创建成功.`);

                const sliderHandle = document.createElement('div'); sliderHandle.className = 'slider-handle';
                console.log(`[Comparison ${groupData.id}] Handle div 创建成功.`);

                wrapper.appendChild(imgBefore);
                wrapper.appendChild(imgAfter);
                wrapper.appendChild(sliderHandle);
                console.log(`[Comparison ${groupData.id}] 图片和 handle 已附加到 wrapper.`);
                group.appendChild(wrapper);
                console.log(`[Comparison ${groupData.id}] Wrapper 已附加到 group.`);
                
                console.log(`[Comparison ${groupData.id}] 准备将 group 附加到 fragment...`);
                fragment.appendChild(group);
                console.log(`[Comparison ${groupData.id}] Group 已附加到 fragment.`);
            } catch (error) {
                 console.error(`[Comparison] 处理 group ${index} (ID: ${groupData.id}) 时发生严重错误:`, error);
                 console.error(error.stack);
            }
            console.log(`[Comparison] ---- 结束处理 group ${index}, ID: ${groupData.id} ----`);
        });

        console.log("[Comparison] 循环创建元素结束。准备插入 fragment...");
        if(document.body.contains(container)) { 
             container.insertBefore(fragment, navContainer);
             console.log("[Comparison] Fragment 已插入页面容器。准备初始化交互...");
        } else {
             console.error("[Comparison] 尝试插入 fragment 时发现容器已不存在！")
        }

        initializeComparison(); 
        initializeComparisonNav();

        console.log(`[Comparison] Successfully loaded ${comparisonGroupsData.length} comparison pairs from ${jsonPath}`);

    } catch (error) {
        console.error(`Error loading comparison setup from ${jsonPath}:`, error);
        if (container) {
            container.insertAdjacentHTML('afterbegin', `<p style="color: red; text-align: center; padding: 20px;">无法加载对比图片。</p>`);
        }
    }
}


// --- 画廊轮播逻辑 (Slider) ---
// (保持不变，但确认 initializeGallerySlider 调用时传入了正确的 slideCount)
function initializeGallerySlider(slidesId, dotsId, slideCount) {
    const slidesContainer = document.getElementById(slidesId);
    const dots = document.querySelectorAll(`#${dotsId} .gallery-dot`);
    if (!slidesContainer || !dotsId || dots.length === 0 || slideCount <= 1) {
         if (dots.length > 0) dots.forEach(d => d.style.display = 'none'); // 只有一张图也隐藏点
         console.warn(`Gallery slider #${slidesId} not initialized or only one slide.`);
        return;
    }

    let currentIndex = 0;
    let realIndex = 1;
    let interval;
    let isTransitioning = false;
    const originalSlideCount = slideCount;

    const slideElements = slidesContainer.querySelectorAll('.gallery-slide'); // 获取初始幻灯片

    // --- 克隆 ---
    const firstSlideClone = slideElements[0].cloneNode(true);
    const lastSlideClone = slideElements[originalSlideCount - 1].cloneNode(true);
    slidesContainer.appendChild(firstSlideClone);
    slidesContainer.insertBefore(lastSlideClone, slideElements[0]);
    const allSlides = slidesContainer.querySelectorAll('.gallery-slide'); // 重新获取

    // --- 初始化位置和样式 ---
    slidesContainer.style.transition = 'none';
    slidesContainer.style.transform = `translateX(-100%)`;
    requestAnimationFrame(() => { slidesContainer.style.transition = ''; });
    slidesContainer.style.willChange = 'transform';
    slidesContainer.style.backfaceVisibility = 'hidden';

    // --- 懒加载 ---
    function lazyLoadSlideImages() { /* ... 代码不变 ... */ }

    // --- 显示幻灯片 ---
    function showSlide(targetRealIndex, animate = true) {
        if (isTransitioning && animate) return;
        isTransitioning = true;
        const transitionTime = 800;
        slidesContainer.style.transition = animate ? `transform ${transitionTime}ms cubic-bezier(0.23, 1, 0.32, 1)` : 'none';

        if (allSlides[targetRealIndex]?.dataset.bgImage && !allSlides[targetRealIndex].style.backgroundImage) {
             allSlides[targetRealIndex].style.backgroundImage = `url('${allSlides[targetRealIndex].dataset.bgImage}')`;
        }

        requestAnimationFrame(() => {
             slidesContainer.style.transform = `translateX(-${targetRealIndex * 100}%)`;
             realIndex = targetRealIndex;

             let transitionEndHandler = () => {
                let jumped = false;
                if (realIndex <= 0) {
                    slidesContainer.style.transition = 'none'; realIndex = originalSlideCount;
                    slidesContainer.style.transform = `translateX(-${realIndex * 100}%)`; jumped = true;
                } else if (realIndex >= originalSlideCount + 1) {
                    slidesContainer.style.transition = 'none'; realIndex = 1;
                    slidesContainer.style.transform = `translateX(-${realIndex * 100}%)`; jumped = true;
                }
                currentIndex = realIndex - 1;
                dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
                lazyLoadSlideImages(); isTransitioning = false;
                if (jumped) requestAnimationFrame(() => requestAnimationFrame(() => { slidesContainer.style.transition = ''; }));
                slidesContainer.removeEventListener('transitionend', transitionEndHandler);
             };
             slidesContainer.removeEventListener('transitionend', transitionEndHandler);
             if (animate) slidesContainer.addEventListener('transitionend', transitionEndHandler, { once: true });
             else transitionEndHandler();
        });
    }

    function nextSlide() { showSlide(realIndex + 1); }
    dots.forEach((dot, index) => dot.addEventListener('click', () => { if(isTransitioning) return; clearInterval(interval); showSlide(index + 1); startAutoSlide(); }));
    function startAutoSlide() { clearInterval(interval); interval = setInterval(nextSlide, 8000); }
    lazyLoadSlideImages(); startAutoSlide();
}

// --- 联系表单 ---
function initializeContactForm() { /* ... 代码不变 ... */ }

// --- 弹窗 ---
function showModal(modalId) { /* ... 代码不变 ... */ }
function copyWechatId() { /* ... 代码不变 ... */ }

// --- DOMContentLoaded 事件监听器 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Initializing scripts...");

    // 导航菜单功能
    console.log("查找菜单元素...");
    const menuToggle = document.querySelector('.menu-toggle');
    const menuContent = document.querySelector('.menu-content');
    console.log("Menu Toggle Element:", menuToggle);
    console.log("Menu Content Element:", menuContent);

    if (menuToggle && menuContent) {
        console.log("菜单元素找到，正在添加监听器...");
        menuToggle.addEventListener('click', () => {
            console.log("菜单按钮被点击！");
            menuToggle.classList.toggle('active');
            menuContent.classList.toggle('active');
            menuContent.style.visibility = menuContent.classList.contains('active') ? 'visible' : 'hidden';
        });
        const menuItems = document.querySelectorAll('.menu-items a');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                console.log(`菜单项 '${item.textContent.trim()}' 被点击。`);
                const href = item.getAttribute('href');
                let isExternalLink = !href.startsWith('#') && !href.startsWith('index.html#') && !href.startsWith('/');

                // 只有在移动/平板视图下点击链接才关闭菜单
                if (window.innerWidth <= 1023) {
                     console.log("移动/平板视图，关闭菜单。");
                     menuToggle.classList.remove('active');
                     menuContent.classList.remove('active');
                     menuContent.style.visibility = 'hidden';
                }

                // 如果是页面内锚点链接，阻止默认跳转并平滑滚动
                if (href && href.startsWith('#')) {
                     console.log(`处理锚点链接: ${href}`);
                     e.preventDefault(); // 阻止默认锚点跳转
                     const targetId = href.substring(1);
                     const targetElement = document.getElementById(targetId);
                     if (targetElement) {
                          console.log(`滚动到元素: #${targetId}`);
                          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                     } else {
                          console.warn(`未找到锚点目标元素: #${targetId}`);
                     }
                // 如果是跳转到 index.html 的锚点 (允许默认行为)
                } else if (href && href.startsWith('index.html#')) {
                     console.log(`允许跳转到 index.html 锚点: ${href}`);
                } else if (isExternalLink || href === 'automotive.html' || href === 'portrait.html' || href === 'pricing.html') {
                     console.log(`允许跳转到页面: ${href}`);
                }

            });
        });
        console.log("菜单事件监听器添加完成。");
    } else {
        console.warn('菜单切换按钮或内容未找到，菜单功能可能无法使用。');
    }

    // *** 初始化调用 ***
    console.log("开始加载轮播图和对比区...");
    loadGalleryImages('automotive-slides', 'automotive-nav', 'images/display_automotive.json', 5);
    loadGalleryImages('portrait-slides', 'portrait-nav', 'images/display_portrait.json', 5);
    loadAndInitComparison('images/comparison_groups.json');
    initializeContactForm();

    // 弹窗功能初始化
    const socialLinks = document.querySelectorAll('.social-link[onclick]');
    socialLinks.forEach(link => { /* ... 代码不变 ... */ });
    const closeBtns = document.querySelectorAll('.modal-close');
    closeBtns.forEach(closeBtn => { /* ... 代码不变 ... */ });
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(modal => { /* ... 代码不变 ... */ });
    const copyBtn = document.querySelector('#wechatModal .copy-button');
    if(copyBtn && !copyBtn.dataset.listenerAttached) { /* ... 代码不变 ... */ }

    // 禁用图片右键菜单
    function disableContextMenu(selector) {
        document.addEventListener('contextmenu', function(event) {
            if (event.target.closest(selector)) { event.preventDefault(); }
        });
    }
    disableContextMenu('.gallery-slide');
    disableContextMenu('.comparison-wrapper img');

    // 窗口大小调整时重新初始化移动端对比导航
    window.addEventListener('resize', initializeComparisonNav);
    // 页面加载时也执行一次，确保初始状态正确
    initializeComparisonNav();

    console.log("主 DOMContentLoaded 事件监听器执行完毕。");

}); // DOMContentLoaded 结束
