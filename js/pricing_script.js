/**
 * 统一的价格页面脚本
 * 适用于中文和英文价格页面
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('统一价格脚本加载，初始化功能');

    initCardModalInteraction(); // 初始化卡片和模态窗口交互
    // REMOVED initNavMenu(); // 导航菜单由 js/navigation.js 初始化
    initTermsButton(); // 初始化条款按钮
    initPaymentIcons(); // 初始化支付图标

    // --- 可选功能初始化 (会检查元素是否存在) ---
    // 这些功能可能只在特定页面存在，脚本会安全处理
    // initTabsSystem(); // 如果页面有标签页系统
    // initAccordion(); // 如果页面有手风琴FAQ
    // initSmoothScroll(); // 如果页面需要内部平滑滚动
    // initScrollToTop(); // 如果页面有返回顶部按钮
    // 注意：js/navigation.js 已处理部分滚动逻辑，检查是否有重叠

});

/**
 * 初始化卡片和模态窗口交互 (新逻辑)
 */
function initCardModalInteraction() {
    const cardContainers = document.querySelectorAll('.card-wrapper'); // 获取所有卡片容器
    const modalContainer = document.getElementById('modal-container');
    let lastModalOpenTime = 0;
    let isTouchDevice = false; // 标记是否为触屏设备

    // --- Helper Functions ---

    // 检查设备类型
    function detectDeviceType() {
        const hasTouchCapability = 'ontouchstart' in window ||
                                 navigator.maxTouchPoints > 0 ||
                                 navigator.msMaxTouchPoints > 0 ||
                                 (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
        isTouchDevice = hasTouchCapability;
        console.log(isTouchDevice ? '检测到触屏设备' : '检测到非触屏设备');
    }

    // 获取所有卡片
    function getAllCards() {
        const cards = [];
        cardContainers.forEach(container => {
            cards.push(...container.querySelectorAll('.pricing-card'));
        });
        return cards;
    }
    
    const allCards = getAllCards();

    // 打开模态窗口
    function openModalById(modalId) {
        // 统一使用 modal- 前缀
        const fullModalId = modalId.startsWith('modal-') ? modalId : `modal-${modalId}`;
        const modal = document.getElementById(fullModalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // 禁止 body 滚动
            setTimeout(() => {
                modal.classList.add('is-visible');
            }, 10);
            lastModalOpenTime = Date.now();
            console.log(`打开模态窗口: ${fullModalId}`);
        } else {
            console.warn(`找不到模态窗口: ${fullModalId}`);
        }
    }

    // 关闭模态窗口
    function closeModal(modal) {
        if (modal) {
            const modalId = modal.id;
            modal.classList.remove('is-visible');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300); // 等待动画完成
            document.body.style.overflow = ''; // 恢复 body 滚动
            console.log(`关闭模态窗口: ${modalId}`);

            // 关闭时重新冻结对应的卡片
            const cardTarget = modalId.replace('modal-', '');
            const correspondingCard = document.querySelector(`.pricing-card[data-modal-target="${cardTarget}"]`);
            if (correspondingCard) {
                freezeCard(correspondingCard);
            }
        }
    }

    // 冻结卡片
    function freezeCard(card) {
        if (card && !card.classList.contains('frozen')) {
             // 检查关联的模态框是否打开，打开则不冻结
             const modalTarget = card.dataset.modalTarget;
             const modalId = modalTarget ? (modalTarget.startsWith('modal-') ? modalTarget : `modal-${modalTarget}`) : null;
             const modal = modalId ? document.getElementById(modalId) : null;
             const isModalVisible = modal && modal.classList.contains('is-visible');

             if (!isModalVisible) {
                 card.classList.add('frozen');
                 // console.log('冻结卡片:', card.dataset.modalTarget);
             }
        }
    }

    // 解冻卡片
    function unfreezeCard(card) {
        if (card && card.classList.contains('frozen')) {
            card.classList.remove('frozen');
            // console.log('解冻卡片:', card.dataset.modalTarget);
        }
    }

    // --- Initialization ---
    detectDeviceType(); // 先检测设备类型

    // 初始化所有卡片为冻结状态
    allCards.forEach(card => card.classList.add('frozen'));

    // --- Event Listeners ---

    // 非触屏设备：添加悬停效果
    if (!isTouchDevice) {
        allCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                unfreezeCard(card);
            });
            card.addEventListener('mouseleave', () => {
                freezeCard(card); // freezeCard 会检查弹窗状态
            });
        });
    }

    // 处理卡片点击/触摸事件 (统一处理)
    cardContainers.forEach(container => {
        container.addEventListener('click', (event) => {
            const clickedCard = event.target.closest('.pricing-card');
            if (!clickedCard) return;

            const modalTarget = clickedCard.dataset.modalTarget;
            const isFrozen = clickedCard.classList.contains('frozen');

            if (isTouchDevice) {
                // 触屏设备逻辑
                if (isFrozen) {
                    // 第一次触摸：解冻当前，冻结其他
                    allCards.forEach(card => {
                        if (card === clickedCard) {
                            unfreezeCard(card);
                        } else {
                            freezeCard(card);
                        }
                    });
                } else {
                    // 第二次触摸（卡片已解冻）：打开弹窗
                    if (modalTarget) {
                        openModalById(modalTarget);
                    } else {
                        console.warn('卡片缺少 data-modal-target 属性');
                    }
                }
            } else {
                // 非触屏设备逻辑 (鼠标)
                if (!isFrozen) {
                    // 点击已解冻（因悬停）的卡片：打开弹窗
                    if (modalTarget) {
                        openModalById(modalTarget);
                    } else {
                        console.warn('卡片缺少 data-modal-target 属性');
                    }
                }
                // 如果点击的是冻结状态的卡片 (frozen overlay)，则不执行任何操作（悬停已处理解冻）
            }
        });
    });

    // 处理模态窗口关闭 (点击关闭按钮或背景)
    if (modalContainer) {
        modalContainer.addEventListener('click', (event) => {
            const modal = event.target.closest('.modal');
            if (!modal) return;

            const isCloseButton = event.target.closest('.close-modal');
            // 点击背景关闭，加延迟判断防止打开时误关
            const isOverlay = event.target === modal && (Date.now() - lastModalOpenTime > 300);

            if (isCloseButton || isOverlay) {
                closeModal(modal);
            }
        });
    }

    // 确保初始时所有模态窗口都是隐藏的
    document.querySelectorAll('.modal').forEach(modal => {
        if (!modal.style.display) {
            modal.style.display = 'none';
        }
    });
}


/**
 * 初始化条款按钮 (通用)
 */
function initTermsButton() {
    const termsButton = document.getElementById('terms-button');
    if (termsButton) {
        termsButton.addEventListener('click', function() {
            openModalById('modal-terms'); // 使用通用打开函数
        });
    } else {
        console.warn('条款按钮 (#terms-button) 未找到。');
    }
}


/**
 * 初始化支付图标 (通用)
 */
function initPaymentIcons() {
    const paymentIconFiles = ['支付图标.jpg']; // 保持现有图标
    const iconBasePath = 'images/pricing icons/'; // 确保路径正确
    const paymentFooters = document.querySelectorAll('.modal-payment-footer');

    paymentFooters.forEach(footer => {
        // 不在 #modal-terms 中添加图标
        if (!footer || footer.closest('#modal-terms')) {
            return;
        }
        // 如果已经有图片了，不再添加
        if (footer.querySelector('img')) {
            return;
        }
        // 清空可能存在的旧内容
        // footer.innerHTML = ''; // 谨慎使用，如果 footer 可能有其他内容

        paymentIconFiles.forEach(filename => {
            const img = document.createElement('img');
            img.src = iconBasePath + filename;
            // 尝试从文件名生成 alt 文本，或使用通用文本
            const altText = filename.split('.')[0].replace(/[-_]/g, ' ') || 'Payment Methods';
            img.alt = altText;
            footer.appendChild(img);
        });
    });
}


// --- 可选功能区 (带元素检查) ---

/**
 * 初始化标签页系统 (如果存在)
 */
function initTabsSystem() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    if (tabButtons.length > 0 && tabContents.length > 0) {
        console.log('初始化标签页系统');
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const target = this.getAttribute('data-target');
                if (!target) return;

                // 移除所有活动类
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // 添加活动类到当前按钮和目标内容
                this.classList.add('active');
                const targetContent = document.getElementById(target);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
        // 初始状态，默认激活第一个
        if (tabButtons[0] && !tabButtons[0].classList.contains('active')) {
             tabButtons[0].click();
        }
    } else {
        // console.log('未找到标签页元素，跳过初始化。');
    }
}

/**
 * 初始化FAQ手风琴 (如果存在)
 */
function initAccordion() {
    const accordionItems = document.querySelectorAll('.accordion-item');

    if (accordionItems.length > 0) {
        console.log('初始化手风琴系统');
        accordionItems.forEach(item => {
            const header = item.querySelector('.accordion-header');
            const content = item.querySelector('.accordion-content');

            if (header && content) {
                header.addEventListener('click', function() {
                    const isActive = item.classList.contains('active');

                    // 关闭所有其他项目
                    accordionItems.forEach(otherItem => {
                        if (otherItem !== item) {
                             otherItem.classList.remove('active');
                             const otherContent = otherItem.querySelector('.accordion-content');
                             if(otherContent) otherContent.style.maxHeight = null;
                        }
                    });

                    // 切换当前项目
                    item.classList.toggle('active');
                    content.style.maxHeight = item.classList.contains('active') ? content.scrollHeight + "px" : null;
                });
            }
        });
    } else {
         // console.log('未找到手风琴元素，跳过初始化。');
    }
}

/**
 * 初始化平滑滚动 (页面内锚点, 如果存在)
 * 注意: navigation.js 可能已处理部分逻辑
 */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    if (links.length > 0) {
         console.log('初始化页内平滑滚动');
         links.forEach(link => {
            link.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                // 确保不是空锚点或 #
                if (targetId && targetId.length > 1 && targetId.startsWith('#')) {
                    try {
                         const targetElement = document.querySelector(targetId);
                         if (targetElement) {
                             e.preventDefault();
                             const headerOffset = 50; // 顶部偏移量
                             const elementPosition = targetElement.getBoundingClientRect().top;
                             const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                             window.scrollTo({
                                 top: offsetPosition,
                                 behavior: 'smooth'
                             });
                         }
                    } catch (error) {
                         console.warn(`无法滚动到目标 "${targetId}":`, error);
                    }
                }
            });
        });
    } else {
         // console.log('未找到页内锚点链接，跳过平滑滚动初始化。');
    }
}


/**
 * 初始化滚动到顶部按钮 (如果存在)
 */
function initScrollToTop() {
    const scrollTopBtn = document.querySelector('.scroll-top');

    if (scrollTopBtn) {
        console.log('初始化返回顶部按钮');
        window.addEventListener('scroll', function() {
            scrollTopBtn.classList.toggle('show', window.pageYOffset > 300);
        });

        scrollTopBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    } else {
        // console.log('未找到返回顶部按钮，跳过初始化。');
    }
}

// 确保 openModalById 在全局作用域可用（如果其他地方需要直接调用）
// window.openModalById = openModalById; 