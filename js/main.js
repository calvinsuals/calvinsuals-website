// 函数定义区域
// (确保所有函数定义都在这里)

async function loadGalleryImages(containerId, navId, jsonPath, imageFolderPath, count = Infinity) {
   // ... (完整函数体 - 从下面复制代码) ...
   const container = document.getElementById(containerId);
    const nav = navId ? document.getElementById(navId) : null;
    
    if (!container) {
        console.error(`Error: Container element with ID '${containerId}' not found.`);
        return; 
    }
    if (navId && !nav) {
         console.warn(`Warning: Navigation element with ID '${navId}' not found.`);
    }
    
    container.innerHTML = '';
    if (nav) nav.innerHTML = '';
    
    try {
        const response = await fetch(`${jsonPath}?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let images;
        const jsonData = await response.json();

        // 检查 jsonData 是否为对象，且包含 images 数组
        if (typeof jsonData === 'object' && jsonData !== null && Array.isArray(jsonData.images)) {
             console.warn('Detected object structure with images array.');
             images = jsonData.images;
        } 
        // 检查是否为简单数组 (之前的逻辑)
        else if (Array.isArray(jsonData)) {
             // 尝试处理之前的嵌套结构
             if (jsonData.length > 0 && jsonData[0] && Array.isArray(jsonData[0].images)) {
                  console.warn('Detected nested array structure, using images from the first object.');
                  images = jsonData[0].images;
             } else {
                 // 假设是简单数组
                 console.warn('Assuming simple array structure.');
                 images = jsonData; 
             }
        } 
        // 否则抛出错误
        else {
            throw new Error('JSON does not contain a valid image array in expected formats.');
        }
        
        images.sort((a, b) => {
            const numA = parseInt(a.match(/(\d+)(?!.*\d)[^.]*$/)?.[1] || '9999');
            const numB = parseInt(b.match(/(\d+)(?!.*\d)[^.]*$/)?.[1] || '9999');
            return numA - numB;
        });
        
        if (count !== Infinity) {
           images = images.slice(0, count);
        }
        
        if (images.length === 0) {
             container.innerHTML = '<p style="color: white; text-align: center;">No images found in list.</p>';
             console.warn(`No image filenames listed in ${jsonPath}`);
             return;
        }
        
        images.forEach((image, index) => {
            const slide = document.createElement('div');
            slide.className = 'gallery-slide';
            if (typeof image === 'string' && /\.(jpe?g|png|gif|webp)$/i.test(image)) {
               slide.style.backgroundImage = `url('${imageFolderPath}/${image}')`; 
            } else {
               console.warn(`Skipping invalid entry '${image}' from ${jsonPath}.`);
               slide.textContent = `Invalid: ${image}`;
               slide.style.display = 'flex';
               slide.style.alignItems = 'center';
               slide.style.justifyContent = 'center';
               slide.style.color = 'red';
               slide.style.backgroundColor = '#eee';
               slide.style.minHeight = '100px';
            }
            container.appendChild(slide);
            
            if (nav) {
                const dot = document.createElement('div');
                dot.className = index === 0 ? 'gallery-dot active' : 'gallery-dot';
                dot.dataset.index = index;
                nav.appendChild(dot);
            }
        });
        
         if (navId) {
             initializeGallerySlider(containerId, navId);
         }
         console.log(`Successfully loaded ${images.length} images into ${containerId} from ${jsonPath}`);
        
    } catch (error) {
        console.error(`Error loading images for ${containerId} from ${jsonPath}:`, error);
        container.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">无法加载图片列表。请检查 '${jsonPath}' 文件是否存在且格式正确。</p>`;
    }
}

function initializeComparison() {
    const comparisonWrappers = document.querySelectorAll('.comparison-wrapper');
    
    comparisonWrappers.forEach(wrapper => {
        const handle = wrapper.querySelector('.slider-handle');
        const afterImage = wrapper.querySelector('.after');
        let isResizing = false;
        let animationFrameId = null;

        // --- 鼠标事件 --- 
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            wrapper.classList.add('active');
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(() => {
                const rect = wrapper.getBoundingClientRect(); 
                const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
                const percent = (x / rect.width) * 100;
                const clampedPercent = Math.max(0, Math.min(100, percent));
                handle.style.left = `${clampedPercent}%`;
                afterImage.style.clipPath = `inset(0 ${100 - clampedPercent}% 0 0)`;
            });
        });
        
        document.addEventListener('mouseup', () => {
            if (!isResizing) return;
            isResizing = false;
            wrapper.classList.remove('active');
            cancelAnimationFrame(animationFrameId);
        });
        
        // --- 触摸事件 --- 
        handle.addEventListener('touchstart', (e) => {
            isResizing = true;
            wrapper.classList.add('active');
            e.preventDefault();
        }, { passive: false }); 
        
        document.addEventListener('touchmove', (e) => {
            if (!isResizing) return;
            cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(() => {
                const touch = e.touches[0];
                const rect = wrapper.getBoundingClientRect();
                const x = Math.min(Math.max(0, touch.clientX - rect.left), rect.width);
                const percent = (x / rect.width) * 100;
                const clampedPercent = Math.max(0, Math.min(100, percent));
                handle.style.left = `${clampedPercent}%`;
                afterImage.style.clipPath = `inset(0 ${100 - clampedPercent}% 0 0)`;
             });
        }, { passive: false }); 
        
        document.addEventListener('touchend', () => {
            if (!isResizing) return;
            isResizing = false;
            wrapper.classList.remove('active');
             cancelAnimationFrame(animationFrameId);
        });
    });
}

function initializeComparisonNav() {
    console.log("Attempting to initialize comparison nav...");
    if (window.innerWidth <= 767) {
         const navContainer = document.getElementById('comparison-nav-dynamic'); // Get container
         const navBtns = navContainer ? navContainer.querySelectorAll('.comparison-nav-btn') : []; // Find buttons inside container
         console.log(`Found ${navBtns.length} comparison nav buttons inside #comparison-nav-dynamic.`);
         const groups = document.querySelectorAll('.comparison-group');
         if (navBtns.length > 0) {
             navBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    console.log(`Nav button ${btn.dataset.index} clicked.`); // Log click
                    navBtns.forEach(b => b.classList.remove('active'));
                    groups.forEach(g => g.classList.remove('active'));
                    btn.classList.add('active');
                    const index = parseInt(btn.getAttribute('data-index'));
                    if (groups[index]) { // Check if group exists
                         groups[index].classList.add('active');
                    } else {
                         console.error(`Comparison group with index ${index} not found.`);
                    }
                });
            });
         } else {
             console.warn('No comparison nav buttons found to add listeners to.');
         }
    }
}

 // 窗口大小改变时重新初始化对比区导航 (这个监听器应该放在全局作用域)
window.addEventListener('resize', () => {
    if (window.innerWidth <= 767) {
        initializeComparisonNav();
    } else {
        // 桌面端确保所有组都可见
        document.querySelectorAll('.comparison-group').forEach(group => {
            group.classList.remove('active');
            group.style.display = ''; // 移除可能由移动端添加的 display:none
        });
    }
});

function initializeContactForm() {
   // ... (完整函数体 - 从下面复制代码) ...
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;
        // 更新邮箱地址
        const mailtoLink = `mailto:calvinsuals@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;
        window.location.href = mailtoLink;
        contactForm.reset();
        alert('Your message has been sent!');
    });
}

function initializeGallerySlider(slidesId, dotsId) {
   // ... (完整函数体 - 从下面复制代码) ...
    const slides = document.getElementById(slidesId);
    const dots = document.querySelectorAll(`#${dotsId} .gallery-dot`);
    if (!slides || dots.length === 0) return;
    let currentIndex = 0;
    let interval;

    function showSlide(index) {
        slides.style.transform = `translateX(-${index * 100}%)`;
        dots.forEach(dot => dot.classList.remove('active'));
        // 确保 dots[index] 存在
        if (dots[index]) {
            dots[index].classList.add('active');
        }
        currentIndex = index;
    }

    function nextSlide() {
        const next = (currentIndex + 1) % dots.length;
        showSlide(next);
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            clearInterval(interval);
            showSlide(index);
            startAutoSlide();
        });
    });

    function startAutoSlide() {
        // 清除旧的定时器（如果存在）
        clearInterval(interval);
        interval = setInterval(nextSlide, 3000);
    }

    showSlide(0);
    startAutoSlide();
}

async function loadAndInitComparison(masterJsonPath) {
   // ... (完整函数体 - 从下面复制代码) ...
   const container = document.getElementById('comparison-container-dynamic');
    const navContainer = document.getElementById('comparison-nav-dynamic');

    if (!container || !navContainer) {
        console.error('Comparison container or nav container not found.');
        // 安全起见，不在 container 不存在时写入错误信息
        return;
    }

    // 清空时要小心，确保 navContainer 在 container 内部
    while (container.firstChild && container.firstChild !== navContainer) {
        container.removeChild(container.firstChild);
    }
    navContainer.innerHTML = ''; // 只清空导航点

    try {
        const masterResponse = await fetch(`${masterJsonPath}?t=${Date.now()}`);
        if (!masterResponse.ok) {
            throw new Error(`HTTP error fetching master list! status: ${masterResponse.status}`);
        }
        let galleries = await masterResponse.json();

        if (!Array.isArray(galleries)) {
            throw new Error('Master comparison JSON does not contain a valid JSON array.');
        }

        galleries.sort((a, b) => {
            const numA = parseInt((a.id || '').match(/(\d+)$/)?.[1] || '9999');
            const numB = parseInt((b.id || '').match(/(\d+)$/)?.[1] || '9999');
            return numA - numB;
        });

        if (galleries.length === 0) {
           container.insertAdjacentHTML('afterbegin', '<p style="color: white; text-align: center;">No comparison groups listed in master JSON.</p>');
           return;
        }

        const groupPromises = galleries.map(async (galleryInfo) => {
            if (!galleryInfo.id || !galleryInfo.jsonFile) {
                console.warn('Skipping invalid gallery entry in master list:', galleryInfo);
                return null;
            }

            const groupFolderPath = masterJsonPath.substring(0, masterJsonPath.lastIndexOf('/'));
            const groupJsonPath = `${groupFolderPath}/${galleryInfo.id}/${galleryInfo.jsonFile}`;
            const imageFolderPath = `${groupFolderPath}/${galleryInfo.id}`;

            try {
                const groupResponse = await fetch(`${groupJsonPath}?t=${Date.now()}`);
                if (!groupResponse.ok) {
                    throw new Error(`HTTP error fetching group JSON! status: ${groupResponse.status}`);
                }
                const groupData = await groupResponse.json();

                if (!groupData || !Array.isArray(groupData.images) || groupData.images.length < 2) {
                    throw new Error('Group JSON format is invalid or missing enough images.');
                }

                let sortedImages = [...groupData.images].sort((a, b) => {
                    const numA = parseInt(a.match(/(\d+)(?!.*\d)[^.]*$/)?.[1] || '9999');
                    const numB = parseInt(b.match(/(\d+)(?!.*\d)[^.]*$/)?.[1] || '9999');
                    return numA - numB;
                });

                const beforeImage = sortedImages[0];
                const afterImage = sortedImages[1];
                const orientation = groupData.orientation;

                return {
                    before: `${imageFolderPath}/${beforeImage}`,
                    after: `${imageFolderPath}/${afterImage}`,
                    orientation: orientation || null
                };
            } catch (groupError) {
                console.error(`Error loading group data from ${groupJsonPath}:`, groupError);
                return null;
            }
        });

        const loadedGroups = (await Promise.all(groupPromises)).filter(group => group !== null);

        if (loadedGroups.length === 0) {
             container.insertAdjacentHTML('afterbegin', '<p style="color: red; text-align: center; padding: 20px;">Failed to load details for any comparison group.</p>');
             return;
        }

        console.log("Creating comparison group elements...");
        loadedGroups.forEach((pair, index) => {
            const group = document.createElement('div');
            group.className = `comparison-group${index === 0 ? ' active' : ''}`;
            const wrapper = document.createElement('div');
            wrapper.className = `comparison-wrapper ${pair.orientation ? pair.orientation : ''}`.trim();
            console.log(`Comparison Group ${index}: Setting before image src to: ${pair.before}`);
            console.log(`Comparison Group ${index}: Setting after image src to: ${pair.after}`);
            const imgBefore = document.createElement('img');
            imgBefore.src = pair.before;
            imgBefore.alt = 'Before';
            imgBefore.className = 'before';
            imgBefore.onerror = () => { imgBefore.alt='Image not found'; imgBefore.src=''; };
            const imgAfter = document.createElement('img');
            imgAfter.src = pair.after;
            imgAfter.alt = 'After';
            imgAfter.className = 'after';
            imgAfter.onerror = () => { imgAfter.alt='Image not found'; imgAfter.src=''; };
            const sliderHandle = document.createElement('div');
            sliderHandle.className = 'slider-handle';
            wrapper.appendChild(imgBefore);
            wrapper.appendChild(imgAfter);
            wrapper.appendChild(sliderHandle);
            group.appendChild(wrapper);
            container.insertBefore(group, navContainer);
            
            // 创建导航按钮
            const navBtn = document.createElement('button');
            navBtn.className = `comparison-nav-btn${index === 0 ? ' active' : ''}`;
            navBtn.dataset.index = index;
            navBtn.title = `View Comparison ${index + 1}`;
            navBtn.setAttribute('aria-label', `View Comparison ${index + 1}`);
            console.log(`Appending nav button ${index + 1} to`, navContainer); // Log appending
            navContainer.appendChild(navBtn);
        });
        console.log("Finished creating elements.");
        
       // 确保在元素创建完成后再初始化 
       console.log("Initializing comparison interaction and nav...");
       initializeComparison(); 
       initializeComparisonNav(); 
       console.log(`Successfully loaded ${loadedGroups.length} comparison pairs based on ${masterJsonPath}`);
        
    } catch (error) {
        console.error(`Error loading comparison setup from ${masterJsonPath}:`, error);
        // 安全起见，如果 container 存在再写入错误信息
        if (container) {
            container.insertAdjacentHTML('afterbegin', `<p style="color: red; text-align: center; padding: 20px;">无法加载对比图片列表。请检查主JSON文件及各组JSON文件是否存在且格式正确。</p>`);
        }
    }
}

function showModal(modalId) {
    console.log(`Attempting to show modal: ${modalId}`); // 添加日志
     const modal = document.getElementById(modalId);
     if(modal) { // 检查 modal 是否存在
         modal.style.display = 'flex'; 
         console.log(`Modal ${modalId} display set to flex.`);
     } else {
         console.error(`Modal element with ID ${modalId} not found!`);
     }
}

function copyWechatId() {
    // ... (完整函数体 - 从下面复制代码) ...
    const wechatId = 'itscalvinchan';
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(wechatId).then(() => {
            const successMsg = document.getElementById('copySuccess');
            if (successMsg) {
                successMsg.style.display = 'block';
                setTimeout(() => {
                    successMsg.style.display = 'none';
                }, 2000);
            }
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制: itscalvinchan'); // 提供备选方案
        });
    } else {
         alert('浏览器不支持自动复制，请手动复制: itscalvinchan'); // 不支持 Clipboard API 的情况
    }
}

// DOMContentLoaded 事件监听器
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded. Initializing scripts..."); 
    
    // 导航菜单功能
    const menuToggle = document.querySelector('.menu-toggle');
    const menuContent = document.querySelector('.menu-content');
    if (menuToggle && menuContent) {
         // ... (菜单事件监听 - 从下面复制代码) ...
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            menuContent.classList.toggle('active');
            if (!menuContent.classList.contains('active')) {
                setTimeout(() => { menuContent.style.visibility = 'hidden'; }, 400);
            } else {
                menuContent.style.visibility = 'visible';
            }
        });
        const menuItems = document.querySelectorAll('.menu-items a');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                menuContent.classList.remove('active');
                setTimeout(() => { menuContent.style.visibility = 'hidden'; }, 400);
            });
        });
    } else {
        console.warn('Menu toggle or content not found');
    }

    // *** 所有初始化调用都放在这里 ***

    // 加载轮播区图片 (取消注释)
    loadGalleryImages(
        'automotive-slides', 
        'automotive-nav', 
        'images/display/automotive display/automotive display.json', 
        'images/display/automotive display',
        5
    );
    loadGalleryImages(
        'portrait-slides', 
        'portrait-nav', 
        'images/display/portrait display/portrait display.json',
        'images/display/portrait display',
        5
    );
            
    // 初始化对比区
    initializeComparison(); 
            
    // 初始化联系表单
    initializeContactForm();

    // 加载对比区内容 (保持取消注释状态)
    loadAndInitComparison('images/comparison/comparsion.json');

    // 弹窗功能初始化
    console.log("Initializing modal listeners..."); 
    const socialLinks = document.querySelectorAll('.social-link');
    console.log(`Found ${socialLinks.length} social links.`); 
    socialLinks.forEach(link => {
         link.addEventListener('click', (e) => {
            const platform = link.getAttribute('title');
            console.log(`Social link clicked: ${platform}`); 
            if (platform === '小红书') {
                e.preventDefault();
                showModal('xiaohongshuModal');
            } else if (platform === '微信') {
                e.preventDefault();
                showModal('wechatModal');
            }
        });
    });
    const closeBtns = document.querySelectorAll('.modal-close');
    console.log(`Found ${closeBtns.length} modal close buttons. Are they inside the modal HTML?`); // 强调检查点
    closeBtns.forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal-overlay');
            if (modal) {
                 console.log(`Closing modal: ${modal.id}`);
                 modal.style.display = 'none';
            } else {
                 console.error('Could not find parent modal overlay for close button:', closeBtn);
            }
        });
    });
    const overlays = document.querySelectorAll('.modal-overlay');
    console.log(`Found ${overlays.length} modal overlays.`); 
    overlays.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                 console.log(`Closing modal via overlay click: ${modal.id}`);
                 modal.style.display = 'none';
            }
        });
    });
    console.log("Modal listeners initialized."); 

    // *** 添加禁用图片右键菜单功能 ***
    function disableContextMenu(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                console.log('Right-click disabled on this element.'); // 可选日志
            });
        });
    }

    // 对轮播区和对比区的图片容器应用
    // 注意：loadGalleryImages 和 loadAndInitComparison 需要在 DOMContentLoaded 后执行完才能找到这些元素
    // 因此，我们将禁用操作放在这些函数成功加载内容之后，或者使用 MutationObserver
    // 为了简单起见，我们先尝试在 DOMContentLoaded 末尾执行一次
    // 如果轮播或对比是异步加载很久后才出现，可能需要更复杂的逻辑
    console.log("Attempting to disable context menu...");
    disableContextMenu('.gallery-slide'); // 轮播区幻灯片
    disableContextMenu('.comparison-wrapper img'); // 对比区图片
    console.log("Context menu disabling attempted.");

}); // DOMContentLoaded 结束 