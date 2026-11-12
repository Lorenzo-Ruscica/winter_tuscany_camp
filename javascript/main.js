




document.addEventListener('DOMContentLoaded', () => {

    
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (header) header.classList.toggle('scrolled', window.scrollY > 50);
    });

    
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');

    
    function toggleMenu() {
        
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        
        
        if (overlay) overlay.classList.toggle('active');

        
        
        if (mobileMenu.classList.contains('active')) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
    }

    if (hamburger && mobileMenu) {
        
        hamburger.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            toggleMenu(); 
        });

        
        if (overlay) {
            overlay.addEventListener('click', toggleMenu);
        }

        
        const mobileLinks = document.querySelectorAll('.mobile-links-container a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                
                if (mobileMenu.classList.contains('active')) {
                    toggleMenu();
                }
            });
        });
    }

    
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-animate, .fade-in-up').forEach(el => observer.observe(el));

    
    const copyToClipboard = (elementId, attribute) => {
        const el = document.getElementById(elementId);
        if (el) {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                const text = this.getAttribute(attribute);
                const original = this.innerHTML;
                
                
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(() => {
                        this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        this.style.color = '#00ff00'; 
                        setTimeout(() => { 
                            this.innerHTML = original; 
                            this.style.color = ''; 
                        }, 2000);
                    });
                } else {
                    alert("Copiato: " + text);
                }
            });
        }
    };
    
    copyToClipboard('phone-copy', 'data-number');
    copyToClipboard('email-copy', 'data-email');
});