// *** 函数定义区域 ***

/**
 * 加载图片列表并初始化轮播图 (加载 R2 图片)
 */
async function loadGalleryImages(containerId, navId, jsonPath, count = Infinity) {
    const container = document.getElementById(containerId);
    const nav = navId ? document.getElementById(navId) : null;
    if (!container) { console.error(`Error: Container #${containerId} not found.`); return; }
    container.innerHTML = ''; if (nav) nav.innerHTML = '';
    console.log(`[${containerId}] Loading image URLs from: ${jsonPath}`);
    try {
        const response = await fetch(`${jsonPath}?t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const imageUrls = await response.json();
        if (!Array.isArray(imageUrls)) throw new Error(`JSON data from ${jsonPath} is not a valid array.`);
        console.log(`[${containerId}] Found ${imageUrls.length} image URLs.`);
        let finalImageUrls = (count !== Infinity && count > 0) ? imageUrls.slice(0, count) : imageUrls;
        if (finalImageUrls.length === 0) { container.innerHTML = '<p style="color: white; text-align: center;">No images.</p>'; return; }
        const fragment = document.createDocumentFragment();
        finalImageUrls.forEach((imgUrl, index) => {
            const slide = document.createElement('div'); slide.className = 'gallery-slide';
            if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                slide.dataset.bgImage = imgUrl;
                if (index < 2) { slide.style.backgroundImage = `url('${imgUrl}')`; }
            } else { console.warn(`[${containerId}] Invalid URL: '${imgUrl}'`); slide.textContent = `Invalid URL`; /*...*/ }
            fragment.appendChild(slide);
            if (nav) { const dot = document.createElement('div'); dot.className = index === 0 ? 'gallery-dot active' : 'gallery-dot'; dot.dataset.index = index; nav.appendChild(dot); }
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
 * 初始化对比区滑块交互 (在 handle touchstart 中阻止默认行为)
 */
function initializeComparison() {
    console.log("[Comparison] initializeComparison 函数开始执行...");
    const sliderContainer = document.querySelector('.comparison-slider'); // Get slider container
    const comparisonWrappers = document.querySelectorAll('.comparison-wrapper');
    console.log(`[Comparison] 找到 ${comparisonWrappers.length} 个 .comparison-wrapper 元素进行滑块初始化。`);
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
        window.addEventListener('mouseup', endResize); 

        // Touch listeners
        handle.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent default scroll/zoom when starting on handle
            e.stopPropagation(); // Still good practice
            startResize(e);
        } /* Removed passive: true implicitly by calling preventDefault */);
        handle.addEventListener('touchmove', (e) => { 
            if (!isResizing) return;
            // We MUST preventDefault here too, as the touch sequence started on handle
            e.preventDefault(); 
            if (e.touches.length > 0) moveHandler(e.touches[0].clientX); 
        }); 
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
    const container = document.getElementById('comparison-container-dynamic');
    // 创建新的导航容器
    const thumbnailNavContainer = document.createElement('div');
    thumbnailNavContainer.className = 'comparison-thumbnail-nav';
    thumbnailNavContainer.id = 'comparison-thumbnail-nav-dynamic'; // 给个 ID

    if (!container) { console.error('Comparison container not found.'); return; }

    container.innerHTML = ''; // 清空主容器

    console.log(`[Comparison] Loading groups from: ${jsonPath}`);

    try {
        const response = await fetch(`${jsonPath}?t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const comparisonGroupsData = await response.json();
        if (!Array.isArray(comparisonGroupsData)) throw new Error(`JSON not array.`);
        console.log(`[Comparison] Found ${comparisonGroupsData.length} groups.`);
        if (comparisonGroupsData.length === 0) { container.innerHTML = '<p style="color: white; text-align: center;">No comparison groups.</p>'; return; }

        // --- 创建滑动容器 ---
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'comparison-slider';
        console.log("[Comparison] 创建 comparison-slider div.");
        // --- 结束 ---

        console.log("[Comparison] 开始创建对比组占位符和缩略图...");

        const fragment = document.createDocumentFragment();

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

        console.log("[Comparison] 循环结束. 将 slider 和 thumbnail nav 插入页面...");
        if(document.body.contains(container)) {
             sliderContainer.appendChild(fragment);
             container.appendChild(sliderContainer);        // 插入滑动容器
             container.appendChild(thumbnailNavContainer); // 插入缩略图导航容器
             console.log("[Comparison] Slider 和 Thumbnail Nav 已插入页面容器。准备初始化交互...");
        } else { console.error("[Comparison] 主容器已不存在！"); }

        initializeComparison(); // 初始化滑块交互
        initializeThumbnailNav(); // 初始化缩略图导航
        initializeDragScrolling(); // <--- 添加调用：初始化拖动滚动

        console.log(`[Comparison] Placeholder setup complete with horizontal slider and thumbnail nav.`);

    } catch (error) { console.error(`Error in loadAndInitComparison:`, error); if (container) { container.innerHTML = `<p style="color: red;">无法加载对比区。</p>`; } }
}

/**
 * 新增：初始化缩略图导航交互
 */
function initializeThumbnailNav() {
    console.log("[Comparison] initializeThumbnailNav 函数开始执行...");
    const sliderContainer = document.querySelector('.comparison-slider');
    const navContainer = document.getElementById('comparison-thumbnail-nav-dynamic');
    if (!sliderContainer || !navContainer) {
        console.warn("Comparison slider or thumbnail nav container not found for init.");
        return;
    }
    const thumbItems = navContainer.querySelectorAll('.comparison-thumbnail-item');
    console.log(`[Comparison] 找到 ${thumbItems.length} 个缩略图导航项。`);

    thumbItems.forEach((item) => {
        item.removeEventListener('click', handleThumbClick); // 移除旧监听器（如果重复初始化）
        item.addEventListener('click', handleThumbClick);
    });

    function handleThumbClick(event) {
        const clickedItem = event.currentTarget;
        const targetId = clickedItem.dataset.targetId;
        const targetGroup = document.getElementById(targetId);

        if (!targetGroup) {
            console.error(`Target comparison group #${targetId} not found.`);
            return;
        }

        console.log(`Thumbnail clicked, scrolling to ${targetId}`);

        // 使用 scrollIntoView 替代之前的 scrollTo 计算
        targetGroup.scrollIntoView({
            behavior: 'smooth',
            inline: 'center', // 尝试水平居中
            block: 'nearest'   // 保持垂直对齐
        });

        /* // 旧的 scrollTo 计算 - 注释掉
        // 计算滚动位置
        const scrollLeftTarget = targetGroup.offsetLeft - sliderContainer.offsetLeft; // 基本目标位置
        // 可能需要根据 slider 的 padding 和 group 的 margin 调整

        sliderContainer.scrollTo({
            left: scrollLeftTarget,
            behavior: 'smooth'
        });
        */

        // 更新激活状态
        thumbItems.forEach(t => t.classList.remove('active'));
        clickedItem.classList.add('active');
    }

    // 添加滚动监听器，当用户手动滑动 slider 时，更新缩略图的激活状态
    let scrollTimeout;
    sliderContainer.removeEventListener('scroll', handleSliderScroll); // 移除旧监听器
    sliderContainer.addEventListener('scroll', handleSliderScroll);

    function handleSliderScroll() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            // 滚动停止后，找出当前居中的 group
            const sliderRect = sliderContainer.getBoundingClientRect();
            const sliderCenter = sliderRect.left + sliderRect.width / 2;
            let closestGroup = null;
            let minDistance = Infinity;

            document.querySelectorAll('.comparison-group').forEach(group => {
                const groupRect = group.getBoundingClientRect();
                const groupCenter = groupRect.left + groupRect.width / 2;
                const distance = Math.abs(sliderCenter - groupCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestGroup = group;
                }
            });

            if (closestGroup) {
                const activeThumb = navContainer.querySelector(`.comparison-thumbnail-item[data-target-id="${closestGroup.id}"]`);
                if (activeThumb && !activeThumb.classList.contains('active')) {
                    console.log(`Slider scrolled, activating thumbnail for ${closestGroup.id}`);
                    thumbItems.forEach(t => t.classList.remove('active'));
                    activeThumb.classList.add('active');
                }
            }
        }, 150); // 滚动停止后 150ms 再检测
    }
    console.log("[Comparison] Thumbnail nav initialized.");
}

/**
 * 初始化鼠标和触摸拖动滚动功能 (触摸时延迟阻止默认行为)
 */
function initializeDragScrolling() {
    const slider = document.querySelector('.comparison-slider');
    if (!slider) {
        console.warn("Comparison slider not found for drag scrolling init.");
        return;
    }

    let isDown = false;
    let startX, currentX;
    let startY, currentY;
    let scrollLeft;
    let isScrolling = false; // Flag to track if scrolling has started
    const scrollThreshold = 5; // Minimum pixels moved horizontally to trigger scroll

    // Mouse Events (mostly unchanged)
    slider.addEventListener('mousedown', (e) => {
        if (e.target.closest('.slider-handle')) return; 
        isDown = true;
        isScrolling = false; // Reset scroll flag
        slider.classList.add('active-drag');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
        // No preventDefault here initially for mouse
    });
    slider.addEventListener('mouseleave', () => {
        // No need to check handle-is-dragging here, just state
        if (!isDown) return;
        isDown = false;
        slider.classList.remove('active-drag');
    });
    window.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        slider.classList.remove('active-drag');
    });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        // Prevent default only when actually dragging horizontally
        if (!isScrolling) {
             currentX = e.pageX - slider.offsetLeft;
             const deltaX = Math.abs(currentX - startX);
             if (deltaX > scrollThreshold) { // Start scrolling
                 isScrolling = true;
             }
        }
        if (isScrolling) {
             e.preventDefault(); 
             const x = e.pageX - slider.offsetLeft;
             const walk = (x - startX); 
             slider.scrollLeft = scrollLeft - walk;
        }
    });

    // Touch Events (Revised logic)
    slider.addEventListener('touchstart', (e) => {
        if (e.target.closest('.slider-handle')) return; 
        isDown = true;
        isScrolling = false; // Reset scroll flag
        startX = e.touches[0].pageX - slider.offsetLeft;
        startY = e.touches[0].pageY; // Record start Y
        scrollLeft = slider.scrollLeft;
        // DO NOT preventDefault here - allow vertical scroll initially
    }, { passive: true }); // Keep passive: true for initial touch

    window.addEventListener('touchend', () => {
        if (!isDown) return;
        isDown = false;
        slider.classList.remove('active-drag');
    });
    window.addEventListener('touchcancel', () => {
        if (!isDown) return;
        isDown = false;
        slider.classList.remove('active-drag');
    });

    slider.addEventListener('touchmove', (e) => {
        if (!isDown) return;

        currentX = e.touches[0].pageX - slider.offsetLeft;
        currentY = e.touches[0].pageY;
        const deltaX = Math.abs(currentX - startX);
        const deltaY = Math.abs(currentY - startY);

        if (!isScrolling) {
            // Check if horizontal movement is dominant
            if (deltaX > scrollThreshold && deltaX > deltaY) {
                isScrolling = true;
                slider.classList.add('active-drag'); // Add drag class only when scrolling starts
                // Try to prevent default now that we are scrolling horizontally
                // This might require removing passive: true from touchstart OR
                // listening with passive: false, but that can hurt performance.
                // For now, we rely on the browser potentially allowing scrollLeft modification
                // even with passive listener if the initial intention was horizontal.
                // If vertical scroll still interferes, removing passive from touchstart
                // might be necessary, but should be the last resort.
                 // e.preventDefault(); // Cannot call preventDefault from passive listener
            } else if (deltaY > scrollThreshold) {
                 // If vertical movement is dominant, assume user wants to scroll page, stop tracking
                 isDown = false;
                 return;
            }
        }

        if (isScrolling) {
            // Perform the scroll
            const walk = currentX - startX;
            slider.scrollLeft = scrollLeft - walk;
        }
        // Note: We cannot reliably call preventDefault here if touchstart was passive.
        // We rely on the horizontal scroll logic being sufficient.
    }, { passive: true }); // Keep touchmove passive for performance if possible

    console.log("[Comparison] Drag scrolling initialized with conditional preventDefault logic.");
}


// --- 其他函数 (轮播, 表单, 弹窗, 菜单) ---
function initializeGallerySlider(slidesContainerId, navContainerId, slideCount) {
    // ... Full function definition from HEAD ...
}
// function initializeContactForm() { /* ... */ }
// function showModal(modalId) { /* ... */ }
// function copyWechatId() { /* ... */ }

// --- DOMContentLoaded 事件监听器 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Initializing scripts...");
    // 导航菜单功能 (使用 automotive.html 的逻辑，包含 setTimeout)
    const menuToggle = document.querySelector('.menu-toggle');
    const menuContent = document.querySelector('.menu-content');
    console.log("Menu Toggle Element:", menuToggle);
    console.log("Menu Content Element:", menuContent);
    if (menuToggle && menuContent) {
         console.log("菜单元素找到，正在添加监听器 (带 setTimeout 逻辑)...");
         menuToggle.addEventListener('click', () => { 
             menuToggle.classList.toggle('active');
             menuContent.classList.toggle('active');
             // Add visibility control with setTimeout
             if (!menuContent.classList.contains('active')) {
                 setTimeout(() => {
                     // Check again in case it was quickly reopened
                     if (!menuContent.classList.contains('active')) {
                         menuContent.style.visibility = 'hidden';
                     }
                 }, 400); // Match CSS transition duration
             } else {
                 menuContent.style.visibility = 'visible';
             }
         });
         const menuItems = document.querySelectorAll('.menu-items a');
         menuItems.forEach(item => { 
             item.addEventListener('click', (e) => { 
                 const targetHref = item.getAttribute('href');
                 // Only close menu immediately for internal links or same-page links
                 if (targetHref.startsWith('#') || targetHref === window.location.pathname || targetHref === 'index.html') {
                     // Close the menu
                     menuToggle.classList.remove('active');
                     menuContent.classList.remove('active');
                     // Add setTimeout for visibility
                     setTimeout(() => {
                         // Check again before hiding
                         if (!menuContent.classList.contains('active')) {
                            menuContent.style.visibility = 'hidden';
                         }
                     }, 400);
                     // Prevent page reload only for same-page links (not anchor links)
                     if (!targetHref.startsWith('#')) {
                         e.preventDefault(); 
                     }
                 } 
                 // For external links, let the browser navigate. The menu will be closed on the new page load.
             }); 
         });
         console.log("菜单事件监听器添加完成 (带 setTimeout 逻辑)。");
    } else { console.warn('菜单切换按钮或内容未找到...'); }

    // *** 初始化调用 ***
    console.log("开始加载轮播图和对比区...");
    loadGalleryImages('automotive-slides', 'automotive-nav', 'images/display_automotive.json', 5);
    loadGalleryImages('portrait-slides', 'portrait-nav', 'images/display_portrait.json', 5);
    loadAndInitComparison('images/comparison_groups.json'); // 加载新的对比区
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

}); // DOMContentLoaded 结束