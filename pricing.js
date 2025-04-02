document.addEventListener('DOMContentLoaded', function() {
    // 获取所需的DOM元素
    const pricingCards = document.querySelectorAll('.pricing-card');
    const pricingContainer = document.querySelector('.pricing-container');
    const overlay = document.querySelector('.pricing-overlay');
    const noticeBtn = document.getElementById('showNoticeBtn');
    const noticeModal = document.getElementById('noticeModal');
    const closeModalBtn = document.getElementById('closeModal');

    // 存储克隆卡片的引用
    let activeClone = null;
    let originalCard = null;
    let isAnimating = false;

    // 显示模态框
    function showModal() {
        noticeModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    // 隐藏模态框
    function hideModal() {
        noticeModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // 创建卡片克隆
    function createCardClone(card) {
        const clone = card.cloneNode(true);
        clone.classList.add('pricing-card-clone');
        document.body.appendChild(clone);
        return clone;
    }

    // 展开卡片动画
    function expandCard(card) {
        if (activeClone) return;

        originalCard = card;
        activeClone = createCardClone(card);
        const rect = card.getBoundingClientRect();
        
        activeClone.style.position = 'fixed';
        activeClone.style.top = rect.top + 'px';
        activeClone.style.left = rect.left + 'px';
        activeClone.style.width = rect.width + 'px';
        activeClone.style.height = rect.height + 'px';

        requestAnimationFrame(() => {
            activeClone.classList.add('moving');
            overlay.style.opacity = '1';
            overlay.style.visibility = 'visible';
            
            if (window.innerWidth <= 768) {
                activeClone.style.top = '10vh';
                activeClone.style.left = '5vw';
                activeClone.style.width = '90vw';
                activeClone.style.height = '80vh';
            } else {
                activeClone.style.top = '50%';
                activeClone.style.left = '50%';
                activeClone.style.transform = 'translate(-50%, -50%)';
            }
            
            activeClone.classList.add('expanded');
        });

        // 添加点击外部关闭功能
        document.addEventListener('click', function(e) {
            if (activeClone && !activeClone.contains(e.target)) {
                closeExpandedCard();
            }
        }, { once: true });
    }

    // 关闭展开的卡片
    function closeExpandedCard() {
        if (!activeClone || !originalCard) return;

        const rect = originalCard.getBoundingClientRect();
        activeClone.classList.add('closing');
        overlay.style.opacity = '0';
        overlay.style.visibility = 'hidden';

        activeClone.style.top = rect.top + 'px';
        activeClone.style.left = rect.left + 'px';
        activeClone.style.width = rect.width + 'px';
        activeClone.style.height = rect.height + 'px';
        activeClone.style.transform = 'none';

        setTimeout(() => {
            if (activeClone && activeClone.parentNode) {
                activeClone.parentNode.removeChild(activeClone);
            }
            activeClone = null;
            originalCard = null;
        }, 300);
    }

    // 关闭卡片函数
    function closeCard(card) {
        if (isAnimating) return;
        isAnimating = true;

        const isMiddleCard = card.classList.contains('pricing-card-middle');
        
        card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        card.style.width = '300px';
        card.style.height = isMiddleCard ? '320px' : '240px';
        card.style.position = 'relative';
        card.style.left = '';
        card.style.top = isMiddleCard ? '-20px' : '20px';

        card.classList.remove('expanded');
        overlay.classList.remove('active');

        card.addEventListener('transitionend', function onTransitionEnd() {
            card.removeEventListener('transitionend', onTransitionEnd);
            card.style.transition = '';
            card.style.width = '';
            card.style.height = '';
            card.style.position = '';
            card.style.left = '';
            card.style.top = '';
            isAnimating = false;
        });
    }

    // 添加关闭按钮点击事件
    document.addEventListener('click', function(e) {
        if (e.target.closest('.expanded-image-container::before')) {
            const card = e.target.closest('.pricing-card');
            if (card) {
                closeCard(card);
            }
        }
    });

    // 添加事件监听器
    pricingCards.forEach(card => {
        card.addEventListener('click', () => expandCard(card));
    });

    overlay.addEventListener('click', closeExpandedCard);

    noticeBtn.addEventListener('click', showModal);
    closeModalBtn.addEventListener('click', hideModal);

    window.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideModal();
            if (activeClone) {
                closeExpandedCard();
            }
        }
    });

    // 处理用户须知的展开/收起
    const noticeItems = document.querySelectorAll('.notice-item');

    // 为每个notice-item添加点击事件
    noticeItems.forEach(item => {
        const title = item.querySelector('.notice-title');
        title.addEventListener('click', () => {
            // 切换当前item的active类
            item.classList.toggle('active');
        });
    });

    // 导航菜单功能
    const menuToggle = document.querySelector('.menu-toggle');
    const menuContent = document.querySelector('.menu-content');
    const menuItems = document.querySelector('.menu-items');

    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        menuContent.classList.toggle('active');
        document.body.classList.toggle('nav-open'); // 添加body类名切换
        document.body.style.overflow = menuContent.classList.contains('active') ? 'hidden' : '';
    });

    // 点击菜单项时关闭菜单
    menuItems.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            menuToggle.classList.remove('active');
            menuContent.classList.remove('active');
            document.body.classList.remove('nav-open'); // 添加body类名切换
            document.body.style.overflow = '';
        }
    });

    // 滚动时处理导航栏
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        const navbar = document.querySelector('.navbar');

        if (currentScroll <= 0) {
            navbar.style.transform = 'translateY(0)';
            return;
        }

        if (currentScroll > lastScroll && !menuContent.classList.contains('active')) {
            // 向下滚动
            navbar.style.transform = 'translateY(-100%)';
        } else {
            // 向上滚动
            navbar.style.transform = 'translateY(0)';
        }

        lastScroll = currentScroll;
    });
});
