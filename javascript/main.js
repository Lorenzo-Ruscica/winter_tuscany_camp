// ============================================================
// FILE: main.js
// DESCRIZIONE: UI, Menu Mobile, Animazioni, Scroll
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. HEADER SCROLL ---
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (header) header.classList.toggle('scrolled', window.scrollY > 50);
    });

    // --- 2. MOBILE MENU (CORRETTO PER SCROLL LOCK) ---
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');

    // Funzione unica per aprire/chiudere
    function toggleMenu() {
        // Toggle delle classi grafiche
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        
        // Gestione Overlay (se esiste nel tuo HTML)
        if (overlay) overlay.classList.toggle('active');

        // GESTIONE BLOCCO SCROLL (Fondamentale)
        // Se il menu ha la classe 'active', blocchiamo il body, altrimenti lo sblocchiamo
        if (mobileMenu.classList.contains('active')) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
    }

    if (hamburger && mobileMenu) {
        // Click sull'hamburger
        hamburger.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            toggleMenu(); 
        });

        // Click sull'overlay scuro (chiude il menu)
        if (overlay) {
            overlay.addEventListener('click', toggleMenu);
        }

        // Chiude menu quando clicchi un link dentro il menu
        const mobileLinks = document.querySelectorAll('.mobile-links-container a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                // Chiudiamo solo se è aperto
                if (mobileMenu.classList.contains('active')) {
                    toggleMenu();
                }
            });
        });
    }

    // --- 3. ANIMAZIONI SCROLL ---
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-animate, .fade-in-up').forEach(el => observer.observe(el));

    // --- 4. COPY TO CLIPBOARD ---
    const copyToClipboard = (elementId, attribute) => {
        const el = document.getElementById(elementId);
        if (el) {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                const text = this.getAttribute(attribute);
                const original = this.innerHTML;
                
                // Usa API moderna o fallback
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(() => {
                        this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        this.style.color = '#00ff00'; // Verde feedback
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