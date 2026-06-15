/**
 * AHMET RIFAT ALBUZ - PERSONAL WEBSITE JAVASCRIPT
 * Interactivity: Typewriter effect, Scroll Reveal, Sticky Navigation, Mobile Menu, Form feedback
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. MOBILE NAVIGATION TOGGLE
    // ==========================================
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (mobileNavToggle && navMenu) {
        mobileNavToggle.addEventListener('click', () => {
            mobileNavToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
            
            // Prevent body scroll when menu is open
            if (navMenu.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
    }

    // Close menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileNavToggle && navMenu) {
                mobileNavToggle.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // ==========================================
    // 2. STICKY HEADER & SCROLL STATE
    // ==========================================
    const header = document.querySelector('.main-header');
    
    const handleScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Run on load to set initial state

    // ==========================================
    // 3. SCROLL REVEAL (INTERSECTION OBSERVER)
    // ==========================================
    const revealElements = document.querySelectorAll('.scroll-reveal');
    
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: Unobserve after revealing to prevent repeated triggers
                observer.unobserve(entry.target);
            }
        });
    };

    const revealOptions = {
        root: null,
        threshold: 0.15, // Trigger when 15% of the element is visible
        rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver(revealCallback, revealOptions);
    revealElements.forEach(el => revealObserver.observe(el));

    // ==========================================
    // 4. ACTIVE NAV LINK HIGHLIGHT ON SCROLL
    // ==========================================
    const sections = document.querySelectorAll('section[id]');
    
    const activeLinkObserverCallback = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }
        });
    };

    const activeLinkObserver = new IntersectionObserver(activeLinkObserverCallback, {
        root: null,
        threshold: 0.5, // Trigger when section is 50% in viewport
        rootMargin: '-80px 0px -40% 0px'
    });
    
    sections.forEach(sec => activeLinkObserver.observe(sec));

    // ==========================================
    // 5. TYPEWRITER EFFECT (HERO SUBTITLE)
    // ==========================================
    const typewriterElement = document.querySelector('.typewriter-text');
    
    if (typewriterElement) {
        const words = JSON.parse(typewriterElement.getAttribute('data-words'));
        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let txt = '';
        
        const type = () => {
            const currentWord = words[wordIndex];
            
            if (isDeleting) {
                txt = currentWord.substring(0, charIndex - 1);
                charIndex--;
            } else {
                txt = currentWord.substring(0, charIndex + 1);
                charIndex++;
            }
            
            typewriterElement.textContent = txt;
            
            let typeSpeed = isDeleting ? 40 : 80;
            
            if (!isDeleting && charIndex === currentWord.length) {
                // Wait at the end of the word
                typeSpeed = 2000;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                // Move to next word
                wordIndex = (wordIndex + 1) % words.length;
                typeSpeed = 500;
            }
            
            setTimeout(type, typeSpeed);
        };
        
        // Start the typewriter loop
        setTimeout(type, 800);
    }

    // ==========================================
    // 6. CONTACT FORM HANDLING & FEEDBACK
    // ==========================================
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');
    const formSubmitBtn = document.getElementById('form-submit-btn');

    if (contactForm && formStatus) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Disable button during submission state
            formSubmitBtn.disabled = true;
            formSubmitBtn.innerHTML = 'Gönderiliyor... <i class="fas fa-spinner fa-spin"></i>';
            
            // Simulate API request delay
            setTimeout(() => {
                const name = document.getElementById('name').value;
                
                // Reset status styling
                formStatus.className = 'form-status success';
                formStatus.innerHTML = `<i class="fas fa-check-circle"></i> Teşekkürler ${name}! Mesajınız başarıyla gönderildi.`;
                
                // Clear input fields
                contactForm.reset();
                
                // Restore button state
                formSubmitBtn.disabled = false;
                formSubmitBtn.innerHTML = 'Gönder <i class="fas fa-paper-plane"></i>';
                
                // Fade out success message after 5 seconds
                setTimeout(() => {
                    formStatus.style.transition = 'opacity 1s ease';
                    formStatus.style.opacity = '0';
                    setTimeout(() => {
                        formStatus.innerHTML = '';
                        formStatus.style.opacity = '1';
                    }, 1000);
                }, 5000);
                
            }, 1500);
        });
    }
});
