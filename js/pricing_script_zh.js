/**
 * 中文页面特定的价格表脚本
 * 基于pricing_script.js，但针对中文页面进行了优化
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('价格页面已加载，初始化功能');
    
    // 确保所有卡片都处于冻结状态
    const allCards = document.querySelectorAll('.pricing-card');
    if (allCards.length > 0) {
        console.log(`发现${allCards.length}张价格卡片，初始化为冻结状态`);
        allCards.forEach(card => {
            card.classList.add('frozen');
        });
    }
    
    // 初始化卡片和模态窗口交互
    initCardModalInteraction();
    
    // 初始化导航菜单
    initNavMenu();
    
    // 初始化条款按钮
    initTermsButton();
    
    // 初始化支付图标
    initPaymentIcons();
    
    // 初始化标签页切换
    initTabsSystem();
    
    // 初始化FAQ手风琴
    initAccordion();
    
    // 添加平滑滚动
    initSmoothScroll();
    
    // 初始化滚动到顶部按钮
    initScrollToTop();
});

/**
 * 初始化卡片和模态窗口交互
 */
function initCardModalInteraction() {
    // 修改为选择所有卡片容器
    const cardContainers = document.querySelectorAll('.card-wrapper'); 
    const modalContainer = document.getElementById('modal-container');
    let lastModalOpenTime = 0;

    // 通过ID打开模态窗口
    function openModalById(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex'; 
            document.body.style.overflow = 'hidden'; 
            setTimeout(() => { 
                modal.classList.add('is-visible');
            }, 10); 
            lastModalOpenTime = Date.now(); 
        } else {
            console.warn(`找不到ID为${modalId}的模态窗口。`);
        }
    }

    // 关闭指定模态窗口
    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('is-visible');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300); 
            document.body.style.overflow = ''; 
        }
    }

    // 冻结指定卡片
    function freezeCard(card) {
        if (card && !card.classList.contains('frozen')) {
            // 检查相关模态窗口是否打开，如果打开则不冻结
            const modalTarget = card.dataset.modalTarget;
            const modal = modalTarget ? document.getElementById(modalTarget) : null; 
            const isModalVisible = modal && modal.classList.contains('is-visible');
            
            if (!isModalVisible) {
                card.classList.add('frozen');
            }
        }
    }

    // 解冻指定卡片
    function unfreezeCard(card) {
        if (card && card.classList.contains('frozen')) {
            card.classList.remove('frozen');
        }
    }

    // 检查是否为大屏幕桌面设备
    function isLargeDesktop() {
        // 简单检查：宽度 > 1680px。如果需要，可以考虑添加触摸检测。
        return window.innerWidth > 1680; 
    }

    // 获取所有卡片
    function getAllCards() {
        const cards = [];
        cardContainers.forEach(container => {
            cards.push(...container.querySelectorAll('.pricing-card'));
        });
        return cards;
    }

    // 初始设置：确保所有卡片冻结，并有条件地添加悬停效果
    const allCards = getAllCards();
    if (allCards.length > 0) {
        allCards.forEach(card => {
            card.classList.add('frozen');

            // 仅为大屏幕桌面设备添加鼠标悬停监听器
            card.addEventListener('mouseenter', () => {
                if (isLargeDesktop()) { 
                    unfreezeCard(card);
                }
            });
            card.addEventListener('mouseleave', () => {
                if (isLargeDesktop()) { 
                    freezeCard(card); // freezeCard 会检查模态框是否打开
                }
            });
        });
    }

    // 处理卡片点击/触摸事件
    cardContainers.forEach(container => {
        container.addEventListener('click', (event) => { 
            const clickedCard = event.target.closest('.pricing-card');
            if (!clickedCard) return;

            const modalTarget = clickedCard.dataset.modalTarget;
            const isFrozen = clickedCard.classList.contains('frozen');

            if (isFrozen) {
                // 第一次点击冻结卡片：解冻当前卡片，冻结其他卡片
                allCards.forEach(card => {
                    if (card === clickedCard) {
                        unfreezeCard(card);
                    } else {
                        freezeCard(card);
                    }
                });
            } else {
                // 第二次点击解冻卡片：打开模态框
                if (modalTarget) {
                    // 中文版直接使用 modalTarget
                    openModalById(modalTarget); 
                } else {
                    console.warn('卡片缺少data-modal-target属性');
                }
            }
        });
    });

    // 处理模态窗口关闭逻辑
    if (modalContainer) {
        modalContainer.addEventListener('click', (event) => {
            // 检查是否点击了关闭按钮或背景
            const modal = event.target.closest('.modal'); 
            if (!modal) return; 

            const isCloseButton = event.target.matches('.close-modal') || event.target.closest('.close-modal');
            const isOverlay = event.target === modal && (Date.now() - lastModalOpenTime > 300);
            
            if (isCloseButton || isOverlay) {
                // 关闭模态窗口
                modal.classList.remove('is-visible');
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300); 
                document.body.style.overflow = '';
                
                // 恢复卡片状态
                const modalId = modal.id;
                const correspondingCard = document.querySelector(`[data-modal-target="${modalId}"]`);
                
                if (correspondingCard) {
                    // 确保模态窗口关闭时卡片被冻结，无论悬停状态如何
                    if (!correspondingCard.classList.contains('frozen')) {
                        correspondingCard.classList.add('frozen');
                    }
                }
            }
        });
    }
    
    // 设置模态窗口的初始值
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (!modal.style.display) {
            modal.style.display = 'none';
        }
    });
}

/**
 * 初始化导航菜单
 */
function initNavMenu() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            navMenu.classList.toggle('active');
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', !isExpanded);
        });
        
        // 点击菜单项时关闭菜单
        const menuLinks = navMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', function() {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

/**
 * 初始化条款按钮
 */
function initTermsButton() {
    const termsButton = document.getElementById('terms-button');
    if (termsButton) {
        termsButton.addEventListener('click', function() {
            // 使用前面定义的openModalById函数打开条款模态窗口
            document.getElementById('modal-terms').style.display = 'flex';
            document.body.style.overflow = 'hidden';
            setTimeout(() => { 
                document.getElementById('modal-terms').classList.add('is-visible');
            }, 10);
        });
    } else {
        console.warn('找不到条款按钮(#terms-button)。');
    }
}

/**
 * 初始化支付图标
 */
function initPaymentIcons() {
    const paymentIconFiles = ['支付图标.jpg'];
    const iconBasePath = 'images/pricing icons/';
    const paymentFooters = document.querySelectorAll('.modal-payment-footer');
    
    paymentFooters.forEach(footer => {
        if (!footer || footer.closest('#modal-terms')) {
            return;
        }
        
        if (footer.querySelector('img')) {
            return; // 已经有图片了，不需要再添加
        }
        
        paymentIconFiles.forEach(filename => {
            const img = document.createElement('img');
            img.src = iconBasePath + filename;
            img.alt = '支付方式';
            footer.appendChild(img);
        });
    });
}

/**
 * 初始化标签页系统
 */
function initTabsSystem() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            
            // 移除所有活动类
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 添加活动类到当前按钮和内容
            this.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });
}

/**
 * 初始化FAQ手风琴
 */
function initAccordion() {
    const accordionItems = document.querySelectorAll('.accordion-item');
    
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header');
        const content = item.querySelector('.accordion-content');
        
        header.addEventListener('click', function() {
            // 检查当前项目是否已激活
            const isActive = item.classList.contains('active');
            
            // 关闭所有项目
            accordionItems.forEach(otherItem => {
                otherItem.classList.remove('active');
                otherItem.querySelector('.accordion-content').style.maxHeight = null;
            });
            
            // 如果当前项目未激活，则打开它
            if (!isActive) {
                item.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });
}

/**
 * 初始化平滑滚动
 */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            // 如果是有效的链接（非空或#）
            if (targetId && targetId !== '#') {
                e.preventDefault();
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    // 平滑滚动到目标元素
                    window.scrollTo({
                        top: targetElement.offsetTop - 50, // 上方留出50px空间
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

/**
 * 初始化滚动到顶部按钮
 */
function initScrollToTop() {
    const scrollTopBtn = document.querySelector('.scroll-top');
    
    if (scrollTopBtn) {
        // 监听滚动事件
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                scrollTopBtn.classList.add('show');
            } else {
                scrollTopBtn.classList.remove('show');
            }
        });
        
        // 点击事件
        scrollTopBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
} 