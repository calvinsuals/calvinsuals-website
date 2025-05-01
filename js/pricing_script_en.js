// --- Basic Modal Interaction --- 

document.addEventListener('DOMContentLoaded', () => {
    const cardContainer = document.querySelector('.card-wrapper'); 
    const modalContainer = document.getElementById('modal-container');
    const allCards = cardContainer ? cardContainer.querySelectorAll('.pricing-card') : [];
    let lastModalOpenTime = 0;
    // let activeCardElement = null; // Still not strictly needed with this refined hover logic

    // Function to open a modal by ID
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
            console.warn(`Modal with ID ${modalId} not found.`);
        }
    }

    // Function to close a specific modal element
    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('is-visible');
             setTimeout(() => {
                 modal.style.display = 'none';
             }, 300); 
             document.body.style.overflow = ''; 
        }
    }

    // Function to freeze a specific card element
    function freezeCard(card) {
        if (card && !card.classList.contains('frozen')) {
            // Check if the associated modal is open before freezing
            const modalTarget = card.dataset.modalTarget;
            // Ensure modal ID construction matches the openModalById call format
            const modal = modalTarget ? document.getElementById(`modal-${modalTarget}`) : null; 
            const isModalVisible = modal && modal.classList.contains('is-visible');
            
            if (!isModalVisible) { // Only freeze if modal is not visible
               card.classList.add('frozen');
            }
        }
    }

    // Function to unfreeze a specific card element
    function unfreezeCard(card) {
        if (card && card.classList.contains('frozen')) {
            card.classList.remove('frozen');
        }
    }

    // Helper function to check for non-touch device (mouse operation)
    function isLargeDesktop() {
        // 更简化的检测方法：只基于触摸能力检测，不再使用屏幕尺寸
        const hasTouchCapability = 'ontouchstart' in window || 
                        navigator.maxTouchPoints > 0 || 
                        navigator.msMaxTouchPoints > 0 ||
                        (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
                        
        // 返回设备是否没有触摸能力或使用精确指针
        return !hasTouchCapability || 
               (window.matchMedia && window.matchMedia("(pointer: fine)").matches);
    }

    // --- Event Listeners --- 

    // 1. Initial setup: Ensure all cards start frozen & Add hover effects conditionally
    if (allCards.length > 0) {
        allCards.forEach(card => {
            card.classList.add('frozen');

            // Add hover listeners ONLY for large desktops
            card.addEventListener('mouseenter', () => {
                if (isLargeDesktop()) { 
                    unfreezeCard(card);
                }
            });
            card.addEventListener('mouseleave', () => {
                if (isLargeDesktop()) { 
                    freezeCard(card); // freezeCard function checks if modal is open
                }
            });
        });
    }

    // 2. Handle clicks/taps on cards (Unified Logic)
    if (cardContainer) { 
        cardContainer.addEventListener('click', (event) => { 
            const clickedCard = event.target.closest('.pricing-card');
            if (!clickedCard) return;

            const modalTarget = clickedCard.dataset.modalTarget;
            const isFrozen = clickedCard.classList.contains('frozen');

            if (isFrozen) {
                // First click/tap on a frozen card: Unfreeze it, freeze others
                allCards.forEach(card => {
                    if (card === clickedCard) {
                        unfreezeCard(card);
                    } else {
                        // Pass the card element directly to freezeCard
                        freezeCard(card); 
                    }
                });
            } else {
                // Second click/tap on an unfrozen card: Open modal
                if (modalTarget) {
                    // Use the correct modal ID format for English page
                    openModalById(`modal-${modalTarget}`); 
                } else {
                    console.warn('Card is missing data-modal-target attribute.');
                }
            }
            // Removed the isMobile() check and separate desktop/mobile logic blocks
        });
    } else {
         console.warn('Card container (.card-wrapper) not found.');
    }

    // 3. Handle modal closing (Revised Logic to freeze the associated card)
    if (modalContainer) {
        modalContainer.addEventListener('click', (event) => {
            const modal = event.target.closest('.modal'); 
            if (!modal) return; 

            const isCloseButton = event.target.matches('.close-modal');
            const isOverlay = event.target === modal && (Date.now() - lastModalOpenTime > 300);

            if (isCloseButton || isOverlay) {
                 const cardTarget = modal.id.replace('modal-', '');
                 const correspondingCard = cardContainer ? cardContainer.querySelector(`[data-modal-target="${cardTarget}"]`) : null;
                 
                 if (correspondingCard) {
                     // Ensure card is frozen when modal closes, regardless of hover state
                     if (!correspondingCard.classList.contains('frozen')) {
                          correspondingCard.classList.add('frozen');
                     }
                 } 
                 closeModal(modal);
            }
        });
    }

     // --- Terms Button (Keep existing) ---
    const termsButton = document.getElementById('terms-button');
    if (termsButton) {
        termsButton.addEventListener('click', (e) => {
            e.preventDefault();
            openModalById('modal-terms'); 
        });
    }
    
     // --- Initialize Navigation Menu (Keep existing) ---
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu'); 
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            const isExpanded = navToggle.getAttribute('aria-expanded', !isExpanded);
            navToggle.setAttribute('aria-expanded', !isExpanded);
        });
    }
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('active')) {
                navToggle.click();
            }
        });
    });

     // --- Initialize Payment Icons (Keep existing) ---
     const paymentIconFiles = ['支付图标.jpg'];
     const iconBasePath = 'images/pricing icons/'; 
     const paymentFooters = document.querySelectorAll('.modal-payment-footer');
     paymentFooters.forEach(footer => {
        if (!footer) return; 
        const parentModal = footer.closest('#modal-terms');
        if (parentModal) {
            return; 
        }
         footer.innerHTML = ''; 
         paymentIconFiles.forEach(filename => {
             const img = document.createElement('img');
             img.src = iconBasePath + filename;
             const altText = filename.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); 
             img.alt = altText;
             footer.appendChild(img);
         });
     });

}); // End DOMContentLoaded 