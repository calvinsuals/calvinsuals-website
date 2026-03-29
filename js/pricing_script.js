/**
 * 统一的价格页面脚本
 * 适用于中文和英文价格页面
 */

/**
 * 弹窗打开时锁定背后页面滚动。
 * 移动端仅用 overflow:hidden 在 iOS 上常无效；短内容时触摸会穿透到底层页面。
 * 使用 position:fixed + 记录 scrollY 是常见可靠做法（类「全屏层」体验）。
 */
function lockPricingPageScroll() {
    if (document.body.dataset.pricingScrollLocked === '1') return;
    document.body.dataset.pricingScrollLocked = '1';
    const scrollY = window.scrollY;
    document.body.dataset.scrollY = String(scrollY);
    document.body.style.overflow = 'hidden';

    const narrow = window.matchMedia && window.matchMedia('(max-width: 875px)').matches;
    if (narrow) {
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
        document.documentElement.style.overflow = 'hidden';
    }
}

function unlockPricingPageScroll() {
    if (document.body.dataset.pricingScrollLocked !== '1') return;
    const scrollY = parseInt(document.body.dataset.scrollY || '0', 10);
    delete document.body.dataset.pricingScrollLocked;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.documentElement.style.overflow = '';
    // 定价页 html/body 使用 scroll-behavior: smooth；关弹窗时若用默认 scrollTo 会触发平滑滚动，体感像页面「弹回」
    const root = document.documentElement;
    const prevInline = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, scrollY);
    root.style.scrollBehavior = prevInline;
}

// 定义全局变量以便于在不同函数间共享
let globalOpenModalFunction;

document.addEventListener('DOMContentLoaded', function() {
    console.log('统一价格脚本加载，初始化功能');

    initCardModalInteraction(); // 初始化卡片和模态窗口交互
    // REMOVED initNavMenu(); // 导航菜单由 js/navigation.js 初始化
    initTermsButton(); // 初始化条款按钮
    initPaymentIcons(); // 初始化支付图标
    preloadModalFooterImages(); // 预先解码弹窗图片，减少首次滚动卡顿
    injectInlineTermsTriggers(); // 价目弹窗右侧悬浮须知（同页面 #floating-terms-button）

    // --- 可选功能初始化 (会检查元素是否存在) ---
    // 这些功能可能只在特定页面存在，脚本会安全处理
    // initTabsSystem(); // 如果页面有标签页系统
    // initAccordion(); // 如果页面有手风琴FAQ
    // initSmoothScroll(); // 如果页面需要内部平滑滚动
    // initScrollToTop(); // 如果页面有返回顶部按钮
    // 注意：js/navigation.js 已处理部分滚动逻辑，检查是否有重叠

});

/**
 * 预先解码弹窗内图片，避免 Safari/macOS 首次滚动时出现解码导致的卡顿
 */
function preloadModalFooterImages() {
    const images = document.querySelectorAll('#modal-container img.modal-moved-footer-image');
    if (!images || images.length === 0) return;

    images.forEach(img => {
        try {
            img.decoding = 'async';
            img.loading = 'eager';
            // 触发 decode 提前完成（decode 不存在时忽略）
            if (typeof img.decode === 'function') {
                img.decode().catch(() => {});
            }
        } catch (e) {
            // ignore
        }
    });
}

/** 价目弹窗内右侧悬浮须知：与页面上 #floating-terms-button 同位置、同观感（在 .modal-content 外） */
function injectInlineTermsTriggers() {
    const modalRoot = document.getElementById('modal-container');
    if (!modalRoot) return;

    const lang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    const label = lang.startsWith('zh') ? '拍摄须知及条款' : 'Terms & Conditions';

    modalRoot.querySelectorAll('.modal:not(#modal-terms)').forEach(function (modal) {
        if (modal.querySelector('.modal-floating-terms-button')) return;
        if (!modal.querySelector('.modal-content')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'modal-floating-terms-button';
        btn.textContent = label;
        btn.setAttribute('aria-label', label);
        const modalId = modal.id;
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (typeof window.openTermsModal === 'function') {
                window.openTermsModal(modalId);
            }
        });

        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.insertAdjacentElement('afterend', btn);
        } else {
            modal.insertBefore(btn, modal.firstChild);
        }
    });
}

/**
 * 初始化卡片和模态窗口交互 (新逻辑)
 */
function initCardModalInteraction() {
    const cardContainers = document.querySelectorAll('.card-wrapper'); // 获取所有卡片容器
    const modalContainer = document.getElementById('modal-container');
    let lastModalOpenTime = 0;
    let isTouchDevice = false; // 标记是否为触屏设备
    const isDesktop = window.matchMedia && window.matchMedia("(min-width: 876px)").matches;

    // --- Helper Functions ---

    // 检查设备类型
    function detectDeviceType() {
        // macOS 触控板/精细指针设备也可能存在 `ontouchstart`，但不应走触摸事件拦截逻辑
        const coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
        const hoverNone = window.matchMedia && window.matchMedia("(hover: none)").matches;
        const hasTouchPoints = navigator.maxTouchPoints > 0;
        isTouchDevice = coarsePointer || (hoverNone && hasTouchPoints);
        console.log(isTouchDevice ? '检测到触屏设备（粗指针）' : '检测到非触屏设备（精细指针）');
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
            lockPricingPageScroll();
            document.body.classList.add('modal-open'); // 暂停背景动画，减少毛玻璃重绘压力

            const activateModal = () => {
                modal.classList.add('is-visible');

                // 添加模态窗口内触摸事件处理
                const modalContent = modal.querySelector('.modal-content');
                const modalBody = modal.querySelector('.modal-body');
                const modalFooter = modal.querySelector('.modal-payment-footer');

                if (modalContent && isTouchDevice) {
                    // 防止模态窗口内的触摸事件冒泡到body
                    modalContent.addEventListener('touchmove', function(e) {
                        // 只允许modal-body区域滚动
                        if (!modalBody.contains(e.target) && !e.target.closest('.modal-body')) {
                            e.preventDefault();
                        }
                    }, { passive: false });
                    
                    // 特别处理底部支付图标区域
                    if (modalFooter) {
                        modalFooter.addEventListener('touchmove', function(e) {
                            e.preventDefault(); // 阻止底部区域的滑动
                        }, { passive: false });
                    }
                }
            };

            if (isDesktop) {
                activateModal(); // 桌面端禁用过渡时序，避免额外重绘
            } else {
                setTimeout(activateModal, 10);
            }

            lastModalOpenTime = Date.now();
            console.log(`打开模态窗口: ${fullModalId}`);
        } else {
            console.warn(`找不到模态窗口: ${fullModalId}`);
        }
    }

    // 关闭模态窗口
    function closeModal(modal) {
        if (!modal) return;

        if (modal.id === 'modal-terms') {
            closeTermsModalFlow();
            return;
        }

        const termsModal = document.getElementById('modal-terms');
        if (termsModal && termsModal.classList.contains('is-visible')) {
            termsModal.classList.remove('is-visible');
            termsModal.style.display = 'none';
            window.__pricingTermsReturnToModalId = null;
        }

        const modalId = modal.id;
        modal.classList.remove('is-visible');

        const modalContent = modal.querySelector('.modal-content');
        if (modalContent && isTouchDevice) {
            const newModalContent = modalContent.cloneNode(true);
            modalContent.parentNode.replaceChild(newModalContent, modalContent);
        }

        const closeDelay = isDesktop ? 0 : 300;
        setTimeout(() => {
            modal.style.display = 'none';
            unlockPricingPageScroll();
            document.body.classList.remove('modal-open');
        }, closeDelay);
        console.log(`关闭模态窗口: ${modalId}`);

        const cardTarget = modalId.replace('modal-', '');
        const correspondingCard = document.querySelector(`.pricing-card[data-modal-target="${cardTarget}"]`);
        if (correspondingCard) {
            freezeCard(correspondingCard);
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

    // 处理模态窗口关闭：移动端可点背景关闭；桌面端仅关闭按钮（避免误触）
    if (modalContainer) {
        modalContainer.addEventListener('click', (event) => {
            const modal = event.target.closest('.modal');
            if (!modal) return;

            const isCloseButton = event.target.closest('.close-modal');
            const allowBackdropClose =
                window.matchMedia && window.matchMedia('(max-width: 875px)').matches;
            const isOverlay =
                allowBackdropClose &&
                event.target === modal &&
                Date.now() - lastModalOpenTime > 300;

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
    
    // 将openModalById函数暴露为全局函数，以便在页面上其他地方调用
    globalOpenModalFunction = openModalById;
    
    // 明确将函数附加到window对象上，确保在所有函数中可用
    window.openModalById = openModalById;
}


/**
 * 初始化条款按钮 (通用)
 */
function initTermsButton() {
    console.log('开始初始化条款按钮');
    const termsButton = document.getElementById('terms-button');
    
    if (termsButton) {
        console.log('找到条款按钮，添加点击事件');
        
        // 使用直接的onclick赋值，而不是addEventListener
        termsButton.onclick = function(event) {
            console.log('条款按钮被点击');
            // 阻止事件冒泡，防止与其他元素的点击事件冲突
            event.stopPropagation();
            event.preventDefault();
            
            // 直接打开条款模态窗口，独立于卡片交互
            const termsModal = document.getElementById('modal-terms');
            
            if (termsModal) {
                console.log('找到条款模态窗口，准备显示');
                
                // 直接显示模态窗口
                termsModal.style.display = 'flex';
                lockPricingPageScroll();
                document.body.classList.add('modal-open'); // 暂停背景动画，减少毛玻璃重绘压力
                
                // 立即添加可见类，不使用setTimeout
                termsModal.classList.add('is-visible');
                
                // 确保弹窗内容可滚动，特别是在移动设备上
                const modalBody = termsModal.querySelector('.modal-body');
                if (modalBody) {
                    modalBody.style.overflowY = 'auto';
                    // 桌面端滚动用更原生的滚动路径；仅在触屏/粗指针设备启用 touch scroller
                    const isCoarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
                    modalBody.style.webkitOverflowScrolling = isCoarsePointer ? 'touch' : 'auto';
                    console.log('已设置模态窗口内容可滚动');
                }
                
                console.log('条款模态窗口已打开');
            } else {
                console.error('找不到条款模态窗口 (#modal-terms)');
            }
            
            return false; // 阻止默认行为
        };
        
        // 添加条款模态窗口的关闭事件
        const termsModal = document.getElementById('modal-terms');
        if (termsModal) {
            console.log('找到条款模态窗口，添加关闭事件');
            
            // 关闭按钮点击事件
            const closeButton = termsModal.querySelector('.close-modal');
            if (closeButton) {
                closeButton.onclick = function(event) {
                    console.log('关闭按钮被点击');
                    event.stopPropagation();
                    if (typeof window.closeTermsModalFlow === 'function') {
                        window.closeTermsModalFlow();
                    }
                    return false;
                };
            }

            termsModal.onclick = function (event) {
                const allowBackdropClose =
                    window.matchMedia && window.matchMedia('(max-width: 875px)').matches;
                if (allowBackdropClose && event.target === termsModal) {
                    console.log('模态窗口背景被点击，关闭窗口');
                    if (typeof window.closeTermsModalFlow === 'function') {
                        window.closeTermsModalFlow();
                    }
                }
            };
        }

        console.log('条款按钮初始化完成');
    } else {
        console.warn('条款按钮 (#terms-button) 未找到。');
    }
    
    // 尝试在文档加载完成后再次初始化以确保按钮可用
    window.addEventListener('load', function() {
        if (termsButton) {
            console.log('页面完全加载后，确认条款按钮已初始化');
        } else {
            console.warn('页面加载完成后仍未找到条款按钮');
        }
    });
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

window.lockPricingPageScroll = lockPricingPageScroll;
window.unlockPricingPageScroll = unlockPricingPageScroll;

/** 从价目弹窗打开须知后，关闭须知时回到该弹窗（null 表示从页面侧栏/悬浮打开） */
window.__pricingTermsReturnToModalId = null;

/**
 * 打开须知弹窗。floating 按钮：openTermsModal()；从价目弹窗内：openTermsModal('modal-rolling')
 * @param {string} [returnToModalId] 关闭须知后要保持打开的价目弹窗 id
 */
window.openTermsModal = function (returnToModalId) {
    const nested = typeof returnToModalId === 'string' && returnToModalId.length > 0;
    window.__pricingTermsReturnToModalId = nested ? returnToModalId : null;

    const termsModal = document.getElementById('modal-terms');
    if (!termsModal) return;

    termsModal.style.display = 'flex';
    if (document.body.dataset.pricingScrollLocked !== '1') {
        lockPricingPageScroll();
    }
    document.body.classList.add('modal-open');

    const isDesktop = window.matchMedia && window.matchMedia('(min-width: 876px)').matches;
    if (isDesktop) {
        termsModal.classList.add('is-visible');
    } else {
        requestAnimationFrame(function () {
            termsModal.classList.add('is-visible');
        });
    }

    const modalBody = termsModal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.style.overflowY = 'auto';
        const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        modalBody.style.webkitOverflowScrolling = coarse ? 'touch' : 'auto';
    }
};

function closeTermsModalFlow() {
    const termsModal = document.getElementById('modal-terms');
    if (!termsModal) return;

    const returnToId = window.__pricingTermsReturnToModalId;
    termsModal.classList.remove('is-visible');

    const isDesktop = window.matchMedia && window.matchMedia('(min-width: 876px)').matches;
    const closeDelay = isDesktop ? 0 : 300;

    setTimeout(function () {
        termsModal.style.display = 'none';
        window.__pricingTermsReturnToModalId = null;

        if (returnToId) {
            const parentModal = document.getElementById(returnToId);
            if (parentModal && parentModal.classList.contains('is-visible')) {
                return;
            }
        }
        unlockPricingPageScroll();
        document.body.classList.remove('modal-open');
    }, closeDelay);
}
window.closeTermsModalFlow = closeTermsModalFlow;