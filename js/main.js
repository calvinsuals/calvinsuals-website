// *** 函数定义区域 ***

/**
 * 加载图片列表并初始化轮播图或普通图片列表
 * @param {string} containerId - 图片容器元素的 ID
 * @param {string|null} navId - 导航点容器元素的 ID (可选, 用于轮播)
 * @param {string} jsonPath - 要加载的 JSON 文件路径 (现在包含 R2 URL 列表)
 * @param {number} [count=Infinity] - 最多加载多少张图片
 */
async function loadGalleryImages(containerId, navId, jsonPath, count = Infinity) {
    const container = document.getElementById(containerId);
    const nav = navId ? document.getElementById(navId) : null;

    if (!container) {
        console.error(`Error: Container element with ID '${containerId}' not found.`);
        return;
    }
    // 导航点不是必须的
    // if (navId && !nav) {
    //      console.warn(`Warning: Navigation element with ID '${navId}' not found.`);
    // }

    container.innerHTML = ''; // 清空容器
    if (nav) nav.innerHTML = ''; // 清空导航点

    console.log(`[${containerId}] Loading image URLs from: ${jsonPath}`); // 修改日志

    try {
        const response = await fetch(`${jsonPath}?t=${Date.now()}`); // 添加时间戳防止缓存
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // ！！！直接解析为 URL 列表！！！
        const imageUrls = await response.json();

        if (!Array.isArray(imageUrls)) {
             throw new Error(`JSON data from ${jsonPath} is not a valid array of image URLs.`);
        }

        console.log(`[${containerId}] Found ${imageUrls.length} image URLs.`);

        // 按原样使用 R2 返回的顺序或脚本排序后的顺序，不再进行客户端排序
        // imageUrls.sort(...) // 移除客户端排序

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
                preloadImg.onerror = () => { console.warn(`[${containerId}] Failed to preload first image: ${finalImageUrls[0]}`); resolve(); }; // 即使失败也继续
                preloadImg.src = finalImageUrls[0]; // 直接使用 URL
            } else {
                resolve();
            }
        });

        await preloadFirstImage;

        // 创建轮播项
        finalImageUrls.forEach((imgUrl, index) => {
            const slide = document.createElement('div');
            slide.className = 'gallery-slide';

            if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) { // 简单检查是否是 URL
                // 设置数据属性用于懒加载
                slide.dataset.bgImage = imgUrl;

                // 只对前两张图片立即加载背景
                if (index < 2) {
                    slide.style.backgroundImage = `url('${imgUrl}')`;
                    // 异步预加载
                    setTimeout(() => {
                        const img = new Image();
                        img.src = imgUrl;
                    }, 0);
                }
            } else {
               console.warn(`[${containerId}] Skipping invalid URL entry: '${imgUrl}' from ${jsonPath}.`);
               // 可以选择创建一个提示错误的 slide
               slide.textContent = `Invalid URL: ${imgUrl}`;
               // ... (添加错误样式) ...
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

        // 如果是轮播图，初始化轮播逻辑
        if (navId) {
            initializeGallerySlider(containerId, navId);
        }
        console.log(`[${containerId}] Successfully displayed ${finalImageUrls.length} images from ${jsonPath}`);

    } catch (error) {
        console.error(`Error loading images for ${containerId} from ${jsonPath}:`, error);
        container.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">无法加载图片列表。请检查 '${jsonPath}' 文件是否存在且格式正确。</p>`;
    }
}


/**
 * 初始化对比区滑块交互 (保持不变)
 */
function initializeComparison() {
    const comparisonWrappers = document.querySelectorAll('.comparison-wrapper');
    comparisonWrappers.forEach(wrapper => {
        const handle = wrapper.querySelector('.slider-handle');
        const afterImage = wrapper.querySelector('.after');
        if (!handle || !afterImage) return; // 添加检查

        let isResizing = false;
        let animationFrameId = null;

        const moveHandler = (clientX) => {
            if (!isResizing) return;
            cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(() => {
                const rect = wrapper.getBoundingClientRect();
                // 确保 rect.width 不是 0 或 NaN
                if(!rect || rect.width <= 0) return;
                const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
                const percent = (x / rect.width) * 100;
                const clampedPercent = Math.max(0, Math.min(100, percent));
                handle.style.left = `${clampedPercent}%`;
                afterImage.style.clipPath = `inset(0 ${100 - clampedPercent}% 0 0)`;
            });
        };

        const startResize = (e) => {
            isResizing = true;
            wrapper.classList.add('active');
            // e.preventDefault(); // 移除对 touch 事件的 preventDefault，可能导致滚动问题
        };

        const endResize = () => {
            if (!isResizing) return;
            isResizing = false;
            wrapper.classList.remove('active');
            cancelAnimationFrame(animationFrameId);
        };

        // 鼠标事件
        handle.addEventListener('mousedown', (e) => {
             e.preventDefault(); // 只在 mousedown 时阻止默认行为（如拖拽图片）
             startResize(e);
        });
        document.addEventListener('mousemove', (e) => moveHandler(e.clientX));
        document.addEventListener('mouseup', endResize);

        // 触摸事件 (passive: true 可提高滚动性能, 但意味着不能 preventDefault)
        handle.addEventListener('touchstart', startResize, { passive: true });
        handle.addEventListener('touchmove', (e) => {
             if (isResizing && e.touches.length > 0) {
                  moveHandler(e.touches[0].clientX);
             }
        }, { passive: true });
        handle.addEventListener('touchend', endResize);
        handle.addEventListener('touchcancel', endResize); // 添加 touchcancel
    });
}

/**
 * 初始化对比区移动端导航点 (保持不变)
 */
function initializeComparisonNav() {
    if (window.innerWidth > 767) return; // 只在移动端执行

    const navContainer = document.getElementById('comparison-nav-dynamic');
    const groups = document.querySelectorAll('#comparison-container-dynamic .comparison-group'); // 确保选择正确的容器
    if (!navContainer || groups.length === 0) {
        console.warn('Comparison nav container or groups not found for mobile nav init.');
        return;
    }

    // 动态创建导航点
    navContainer.innerHTML = ''; // 清空旧点
    groups.forEach((_, index) => {
        const navBtn = document.createElement('button');
        navBtn.className = `comparison-nav-btn${index === 0 ? ' active' : ''}`;
        navBtn.dataset.index = index;
        navBtn.title = `View Comparison ${index + 1}`;
        navBtn.setAttribute('aria-label', `View Comparison ${index + 1}`);
        navContainer.appendChild(navBtn);

        navBtn.addEventListener('click', () => {
            // console.log(`Nav button ${index} clicked.`); // 调试日志
            document.querySelectorAll('#comparison-nav-dynamic .comparison-nav-btn').forEach(b => b.classList.remove('active'));
            groups.forEach(g => g.classList.remove('active'));
            navBtn.classList.add('active');
            if (groups[index]) {
                groups[index].classList.add('active');
            } else {
                console.error(`Comparison group with index ${index} not found.`);
            }
        });
    });
     // 初始显示第一个 group
     if (groups[0]) {
          groups[0].classList.add('active');
     }
}

/**
 * 加载对比区数据并初始化 (重写以适应新 JSON 结构)
 * @param {string} jsonPath - comparison_groups.json 的路径
 */
async function loadAndInitComparison(jsonPath) {
    const container = document.getElementById('comparison-container-dynamic');
    const navContainer = document.getElementById('comparison-nav-dynamic'); // 导航容器现在是必需的

    if (!container || !navContainer) {
        console.error('Comparison container or nav container not found.');
        if(container) container.innerHTML = '<p style="color: red;">Error: Comparison container missing.</p>'; // 只在 container 存在时显示错误
        return;
    }

    // 清空旧内容，保留 navContainer
    container.innerHTML = '';
    container.appendChild(navContainer); // 重新添加空的导航容器
    navContainer.innerHTML = ''; // 清空导航点

    console.log(`[Comparison] Loading comparison groups from: ${jsonPath}`);

    try {
        const response = await fetch(`${jsonPath}?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`HTTP error fetching comparison data! status: ${response.status}`);
        }
        // !!! 解析包含所有组信息的数组 !!!
        const comparisonGroupsData = await response.json();

        if (!Array.isArray(comparisonGroupsData)) {
            throw new Error(`Comparison JSON from ${jsonPath} is not a valid array.`);
        }

        console.log(`[Comparison] Found ${comparisonGroupsData.length} comparison groups.`);

        if (comparisonGroupsData.length === 0) {
           container.insertAdjacentHTML('afterbegin', '<p style="color: white; text-align: center;">No comparison groups found.</p>');
           return;
        }

        // 预加载第一组图片
        const preloadFirstGroup = new Promise((resolve) => {
            if (comparisonGroupsData[0] && comparisonGroupsData[0].before_src && comparisonGroupsData[0].after_src) {
                let loaded = 0;
                const count = 2;
                const onLoaded = () => { if (++loaded === count) resolve(); };
                const onError = () => { console.warn(`Failed to preload comparison image.`); onLoaded(); }; // 加载失败也继续

                const imgBefore = new Image();
                imgBefore.onload = onLoaded;
                imgBefore.onerror = onError;
                imgBefore.src = comparisonGroupsData[0].before_src;

                const imgAfter = new Image();
                imgAfter.onload = onLoaded;
                imgAfter.onerror = onError;
                imgAfter.src = comparisonGroupsData[0].after_src;

                setTimeout(resolve, 5000); // 5秒超时
            } else {
                resolve();
            }
        });

        await preloadFirstGroup;

        const fragment = document.createDocumentFragment();

        comparisonGroupsData.forEach((groupData, index) => {
            if (!groupData.id || !groupData.before_src || !groupData.after_src) {
                console.warn(`[Comparison] Skipping invalid group data at index ${index}:`, groupData);
                return; // 跳过无效数据
            }

            const group = document.createElement('div');
            // 移动端默认隐藏，第一个加 active
            group.className = `comparison-group${index === 0 ? ' active' : ''}`;
            group.id = `comparison-group-${groupData.id}`; // 添加 ID

            const wrapper = document.createElement('div');
            // 尝试从 ID 或其他地方获取方向信息，如果需要的话
            // 假设方向信息现在可能不再需要，或者需要其他方式确定
            const orientation = ''; // 暂时留空或移除
            wrapper.className = `comparison-wrapper ${orientation}`.trim();

            const imgBefore = document.createElement('img');
            imgBefore.alt = 'Before';
            imgBefore.className = 'before';
            imgBefore.loading = 'lazy';
            imgBefore.src = groupData.before_src; // 使用 R2 URL
            imgBefore.onerror = () => { imgBefore.alt='Image not found'; imgBefore.src=''; console.error(`Failed to load Before image: ${groupData.before_src}`);};

            const imgAfter = document.createElement('img');
            imgAfter.alt = 'After';
            imgAfter.className = 'after';
            imgAfter.loading = 'lazy';
            imgAfter.src = groupData.after_src; // 使用 R2 URL
            imgAfter.onerror = () => { imgAfter.alt='Image not found'; imgAfter.src=''; console.error(`Failed to load After image: ${groupData.after_src}`);};

            const sliderHandle = document.createElement('div');
            sliderHandle.className = 'slider-handle';

            wrapper.appendChild(imgBefore);
            wrapper.appendChild(imgAfter);
            wrapper.appendChild(sliderHandle);
            group.appendChild(wrapper);

            fragment.appendChild(group);

            // 创建导航点（移到 initializeComparisonNav 中动态创建）
        });

        // 将所有 group 添加到 container (放在 navContainer 前面)
        container.insertBefore(fragment, navContainer);

        console.log("[Comparison] Finished creating elements.");

        // 初始化交互和移动端导航
        initializeComparison();
        initializeComparisonNav(); // 现在依赖于 DOM 中已存在的 group 元素

        console.log(`[Comparison] Successfully loaded ${comparisonGroupsData.length} comparison pairs from ${jsonPath}`);

    } catch (error) {
        console.error(`Error loading comparison setup from ${jsonPath}:`, error);
        if (container) {
            container.insertAdjacentHTML('afterbegin', `<p style="color: red; text-align: center; padding: 20px;">无法加载对比图片。请检查 JSON 文件是否存在且格式正确。</p>`);
        }
    }
}


// --- 其他函数 (轮播, 表单, 弹窗, 菜单) ---

function initializeGallerySlider(slidesId, dotsId) {
    const slidesContainer = document.getElementById(slidesId);
    // 确保在尝试访问子元素之前 slidesContainer 存在
    if (!slidesContainer) {
        console.error(`Gallery slides container #${slidesId} not found.`);
        return;
    }
    const slideElements = slidesContainer.querySelectorAll('.gallery-slide');
    const dots = document.querySelectorAll(`#${dotsId} .gallery-dot`);

    // 如果没有幻灯片或没有导航点（对于需要导航的轮播），则不初始化
    if (slideElements.length === 0 || !dotsId || dots.length === 0) {
        console.warn(`Gallery slider #${slidesId} not initialized: No slides or dots found.`);
        return;
    }

    let currentIndex = 0; // 指向当前显示的“逻辑”幻灯片索引（0 到 originalSlideCount-1）
    let realIndex = 1; // 指向实际 DOM 中的幻灯片索引（考虑克隆）
    let interval;
    let isTransitioning = false;
    const originalSlideCount = slideElements.length; // 原始幻灯片数量

    // --- 克隆 ---
    const firstSlideClone = slideElements[0].cloneNode(true);
    const lastSlideClone = slideElements[originalSlideCount - 1].cloneNode(true);
    slidesContainer.appendChild(firstSlideClone);
    slidesContainer.insertBefore(lastSlideClone, slidesContainer.firstChild);
    const allSlides = slidesContainer.querySelectorAll('.gallery-slide'); // 获取包含克隆的完整列表

    // --- 初始化位置和样式 ---
    slidesContainer.style.transition = 'none'; // 先禁用过渡
    slidesContainer.style.transform = `translateX(-100%)`; // 显示第一张实际幻灯片
    slidesContainer.style.willChange = 'transform';
    slidesContainer.style.backfaceVisibility = 'hidden'; // 提升性能
     // requestAnimationFrame(() => { slidesContainer.style.transition = ''; }); // 稍微延迟恢复过渡

    // --- 懒加载函数 ---
    function lazyLoadSlideImages() {
        allSlides.forEach((slide, index) => {
            if (slide.dataset.bgImage && !slide.style.backgroundImage) {
                const proximity = Math.abs(index - realIndex);
                if (proximity <= 1) { // 只加载当前和紧邻的
                    slide.style.backgroundImage = `url('${slide.dataset.bgImage}')`;
                    setTimeout(() => { // 异步预加载
                        const img = new Image();
                        img.src = slide.dataset.bgImage;
                    }, 50); // 稍加延迟
                }
            }
        });
    }

    // --- 显示幻灯片函数 ---
    function showSlide(targetRealIndex, animate = true) {
        if (isTransitioning && animate) return;
        isTransitioning = true;

        const transitionTime = 800; // ms
        slidesContainer.style.transition = animate ? `transform ${transitionTime}ms cubic-bezier(0.23, 1, 0.32, 1)` : 'none';

        // 加载目标幻灯片
        if (allSlides[targetRealIndex] && allSlides[targetRealIndex].dataset.bgImage && !allSlides[targetRealIndex].style.backgroundImage) {
             allSlides[targetRealIndex].style.backgroundImage = `url('${allSlides[targetRealIndex].dataset.bgImage}')`;
        }

        requestAnimationFrame(() => {
             slidesContainer.style.transform = `translateX(-${targetRealIndex * 100}%)`;
             realIndex = targetRealIndex; // 更新实际索引

            // 无缝循环处理
            let transitionEndHandler = () => {
                if (realIndex <= 0) { // 跳到最后一张克隆 (实际是倒数第二张)
                    slidesContainer.style.transition = 'none';
                    realIndex = originalSlideCount; // 对应原始最后一张
                    slidesContainer.style.transform = `translateX(-${realIndex * 100}%)`;
                } else if (realIndex >= originalSlideCount + 1) { // 跳到第一张克隆 (实际是第二张)
                    slidesContainer.style.transition = 'none';
                    realIndex = 1; // 对应原始第一张
                    slidesContainer.style.transform = `translateX(-${realIndex * 100}%)`;
                }
                // 更新逻辑索引
                currentIndex = realIndex - 1;

                 // 更新导航点
                 dots.forEach((dot, i) => {
                     dot.classList.toggle('active', i === currentIndex);
                 });

                lazyLoadSlideImages(); // 加载邻近图片
                isTransitioning = false; // 重置过渡标志
                 // requestAnimationFrame(() => { slidesContainer.style.transition = ''; }); // 恢复过渡（如果需要）
                 slidesContainer.removeEventListener('transitionend', transitionEndHandler); // 移除监听器
            };

             if (animate) {
                  // 确保 transitionend 事件被正确添加和移除
                  slidesContainer.removeEventListener('transitionend', transitionEndHandler);
                  slidesContainer.addEventListener('transitionend', transitionEndHandler, { once: true });
             } else {
                  // 如果不动画，立即执行处理
                  transitionEndHandler();
             }
         });
    }

    function nextSlide() { showSlide(realIndex + 1); }
    function prevSlide() { showSlide(realIndex - 1); } // 虽然没用，但保持完整

    // 导航点事件
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            if (isTransitioning) return;
            clearInterval(interval); // 停止自动播放
            showSlide(index + 1); // 目标实际索引是逻辑索引+1
            startAutoSlide(); // 重启自动播放
        });
    });

    // 自动播放
    function startAutoSlide() {
        clearInterval(interval);
        interval = setInterval(nextSlide, 8000);
    }

    lazyLoadSlideImages(); // 初始加载
    startAutoSlide(); // 开始自动播放
}


function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;
        const mailtoLink = `mailto:calvinsuals@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
        // 尝试在新标签页打开 mailto 链接，避免页面跳转
        window.open(mailtoLink, '_blank');
        contactForm.reset();
        // 可以提供一个更友好的提示，而不是 alert
        // alert('Your message client should have opened!');
        // 例如，在表单旁边显示一个“邮件客户端已尝试打开”的消息
    });
}


function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.style.display = 'flex';
    } else {
        console.error(`Modal element with ID ${modalId} not found!`);
    }
}

function copyWechatId() {
    const wechatId = 'itscalvinchan';
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(wechatId).then(() => {
            const successMsg = document.getElementById('copySuccess');
            if (successMsg) {
                successMsg.style.display = 'block';
                setTimeout(() => { successMsg.style.display = 'none'; }, 2000);
            }
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制: itscalvinchan');
        });
    } else {
         // 对于不支持 Clipboard API 或 HTTPS 的情况，提供备选
         try {
              const textArea = document.createElement("textarea");
              textArea.value = wechatId;
              textArea.style.position = "fixed"; // 防止滚动条跳动
              textArea.style.left = "-9999px";
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);

              const successMsg = document.getElementById('copySuccess');
              if (successMsg) {
                 successMsg.style.display = 'block';
                 setTimeout(() => { successMsg.style.display = 'none'; }, 2000);
              }
         } catch (err) {
              alert('浏览器不支持自动复制，请手动复制: itscalvinchan');
         }
    }
}

// --- DOMContentLoaded 事件监听器 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Initializing scripts...");

    // 导航菜单功能
    const menuToggle = document.querySelector('.menu-toggle');
    const menuContent = document.querySelector('.menu-content');
    if (menuToggle && menuContent) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            menuContent.classList.toggle('active');
            menuContent.style.visibility = menuContent.classList.contains('active') ? 'visible' : 'hidden';
            // 注意：直接隐藏可能导致 CSS 过渡无效，但这里简化处理
        });
        const menuItems = document.querySelectorAll('.menu-items a');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 1023) { // 只在移动/平板视图下点击链接关闭菜单
                     menuToggle.classList.remove('active');
                     menuContent.classList.remove('active');
                     menuContent.style.visibility = 'hidden';
                }
                // 对于锚点链接，确保平滑滚动
                const href = item.getAttribute('href');
                if (href && href.startsWith('#')) {
                     const targetElement = document.querySelector(href);
                     if (targetElement) {
                          // e.preventDefault(); // 如果需要阻止默认跳转行为
                          targetElement.scrollIntoView({ behavior: 'smooth' });
                     }
                }
            });
        });
    } else {
        console.warn('Menu toggle or content not found');
    }

    // *** 初始化调用 ***

    // 加载主页轮播图 (现在从新的 JSON 文件加载 R2 URL)
    loadGalleryImages(
        'automotive-slides',          // 轮播图容器 ID
        'automotive-nav',             // 导航点容器 ID
        'images/display_automotive.json', // 新的 JSON 文件路径!
        5                             // 限制最多显示 5 张
    );
    loadGalleryImages(
        'portrait-slides',            // 轮播图容器 ID
        'portrait-nav',               // 导航点容器 ID
        'images/display_portrait.json', // 新的 JSON 文件路径!
        5                             // 限制最多显示 5 张
    );

    // 加载并初始化对比区 (现在从新的 JSON 文件加载 R2 URL)
    loadAndInitComparison('images/comparison_groups.json'); // 新的 JSON 文件路径!

    // 初始化联系表单
    initializeContactForm();

    // 弹窗功能初始化
    const socialLinks = document.querySelectorAll('.social-link');
    socialLinks.forEach(link => {
         link.addEventListener('click', (e) => {
            const platform = link.getAttribute('title');
            if (platform === '小红书' || platform === '微信') {
                e.preventDefault();
                showModal(platform === '小红书' ? 'xiaohongshuModal' : 'wechatModal');
            }
        });
    });
    const closeBtns = document.querySelectorAll('.modal-close');
    closeBtns.forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal-overlay');
            if (modal) modal.style.display = 'none';
        });
    });
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    });
    // 微信复制按钮 (确保只绑定一次)
    const copyBtn = document.querySelector('#wechatModal .copy-button');
    if(copyBtn && !copyBtn.dataset.listenerAttached) { // 防止重复绑定
         copyBtn.addEventListener('click', copyWechatId);
         copyBtn.dataset.listenerAttached = 'true';
    }


    // 禁用图片右键菜单 (保持不变)
    function disableContextMenu(selector) {
        document.querySelectorAll(selector).forEach(element => {
            element.addEventListener('contextmenu', e => e.preventDefault());
        });
    }
    // 延迟执行或使用更可靠的方式确保元素存在
    setTimeout(() => {
         console.log("Attempting to disable context menu on dynamically loaded content...");
         disableContextMenu('.gallery-slide');
         disableContextMenu('.comparison-wrapper img');
         console.log("Context menu disabling attempted.");
    }, 1500); // 延迟 1.5 秒，等待异步加载


    // 窗口大小调整时重新初始化移动端对比导航
     window.addEventListener('resize', initializeComparisonNav);


}); // DOMContentLoaded 结束
