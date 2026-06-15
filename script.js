/**
 * AHMET RIFAT ALBUZ - PERSONAL WEBSITE JAVASCRIPT
 * Interactivity: Language switching, Typewriter effect, Scroll Reveal, Sticky Navigation, Mobile Menu, Form feedback
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
                observer.unobserve(entry.target);
            }
        });
    };

    const revealOptions = {
        root: null,
        threshold: 0.15,
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
        threshold: 0.5,
        rootMargin: '-80px 0px -40% 0px'
    });
    
    sections.forEach(sec => activeLinkObserver.observe(sec));

    // ==========================================
    // 5. TYPEWRITER EFFECT (HERO SUBTITLE)
    // ==========================================
    let typewriterTimeout;
    const typewriterElement = document.querySelector('.typewriter-text');
    
    const startTypewriter = (lang) => {
        if (!typewriterElement) return;
        
        // Clear any running timeout
        if (typewriterTimeout) {
            clearTimeout(typewriterTimeout);
        }
        
        const wordsAttr = lang === 'en' ? 'data-words-en' : 'data-words-tr';
        const words = JSON.parse(typewriterElement.getAttribute(wordsAttr));
        
        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let txt = '';
        
        const type = () => {
            if (wordIndex >= words.length) wordIndex = 0;
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
                typeSpeed = 2000;
                isDeleting = true;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                typeSpeed = 500;
            }
            
            typewriterTimeout = setTimeout(type, typeSpeed);
        };
        
        type();
    };

    // ==========================================
    // 6. LANGUAGE SWITCHER LOGIC
    // ==========================================
    const langBtns = document.querySelectorAll('.lang-btn');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const subjectInput = document.getElementById('subject');
    const messageInput = document.getElementById('message');

    const updatePlaceholders = (lang) => {
        if (!nameInput) return;
        if (lang === 'en') {
            nameInput.placeholder = 'John Doe';
            emailInput.placeholder = 'john@example.com';
            subjectInput.placeholder = 'Collaboration Request';
            messageInput.placeholder = 'Write your message here...';
        } else {
            nameInput.placeholder = 'Ahmet Yılmaz';
            emailInput.placeholder = 'ahmet@example.com';
            subjectInput.placeholder = 'İş Birliği Talebi';
            messageInput.placeholder = 'Mesajınızı buraya yazın...';
        }
    };

    const setLanguage = (lang) => {
        document.body.className = 'lang-' + lang;
        localStorage.setItem('lang', lang);
        
        // Update switcher buttons UI
        langBtns.forEach(btn => {
            if (btn.getAttribute('data-lang') === lang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update input placeholders
        updatePlaceholders(lang);
        
        // Restart typewriter
        startTypewriter(lang);
    };

    // Click handler for switcher buttons
    langBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            setLanguage(lang);
        });
    });

    // Initialize default or saved language
    const savedLang = localStorage.getItem('lang') || 'tr';
    setLanguage(savedLang);

    // ==========================================
    // 7. CONTACT FORM HANDLING & FEEDBACK
    // ==========================================
    const contactForm = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');
    const formSubmitBtn = document.getElementById('form-submit-btn');

    if (contactForm && formStatus) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const isEn = document.body.classList.contains('lang-en');
            
            // Disable button during submission state
            formSubmitBtn.disabled = true;
            formSubmitBtn.innerHTML = isEn 
                ? 'Sending... <i class="fas fa-spinner fa-spin"></i>'
                : 'Gönderiliyor... <i class="fas fa-spinner fa-spin"></i>';
            
            // Simulate API request delay
            setTimeout(() => {
                const name = document.getElementById('name').value;
                
                // Reset status styling
                formStatus.className = 'form-status success';
                formStatus.innerHTML = isEn
                    ? `<i class="fas fa-check-circle"></i> Thank you ${name}! Your message has been sent successfully.`
                    : `<i class="fas fa-check-circle"></i> Teşekkürler ${name}! Mesajınız başarıyla gönderildi.`;
                
                // Clear input fields
                contactForm.reset();
                
                // Restore button state
                formSubmitBtn.disabled = false;
                formSubmitBtn.innerHTML = isEn
                    ? 'Send <i class="fas fa-paper-plane"></i>'
                    : 'Gönder <i class="fas fa-paper-plane"></i>';
                
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
