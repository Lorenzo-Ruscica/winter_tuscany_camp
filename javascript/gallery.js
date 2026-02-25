// ============================================================
// FILE: gallery.js
// DESCRIZIONE: Dynamic Countdown (Supabase) + Lightbox Gallery
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. DYNAMIC COUNTDOWN (SUPABASE) ---
    const elDays = document.getElementById('days');
    
    // Eseguiamo la logica timer solo se gli elementi esistono nella pagina (es. Home)
    if(elDays) {
        
        // Data di default (Fallback) se il database non risponde o è vuoto
        let targetDateString = "2026-05-23T09:00:00"; 

        // 1. Tenta di scaricare la data aggiornata da Supabase
        if (window.supabase) {
            try {
                const { data, error } = await window.supabase
                    .from('site_settings')
                    .select('value')
                    .eq('key', 'countdown_end')
                    .maybeSingle();

                if (data && data.value) {
                    targetDateString = data.value;
                    console.log("📅 Timer sincronizzato con Admin:", targetDateString);
                }
            } catch (err) {
                console.warn("⚠️ Errore lettura Timer (Uso default):", err);
            }
        }

        // 2. Avvia il calcolo del tempo
        const eventDate = new Date(targetDateString).getTime();
        const elHours = document.getElementById('hours');
        const elMinutes = document.getElementById('minutes');
        const elSeconds = document.getElementById('seconds');
        const countdownContainer = document.getElementById('countdown');

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const diff = eventDate - now;

            // Se il tempo è scaduto
            if (diff < 0) { 
                clearInterval(timer); 
                if(countdownContainer) {
                    countdownContainer.innerHTML = "<h3 style='color:var(--color-hot-pink); text-align:center; margin-top:10px;'>EVENT STARTED!</h3>";
                }
                return; 
            }

            // Calcoli matematici
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            // Aggiornamento DOM
            if(elDays) elDays.innerText = d < 10 ? "0" + d : d;
            if(elHours) elHours.innerText = h < 10 ? "0" + h : h;
            if(elMinutes) elMinutes.innerText = m < 10 ? "0" + m : m;
            if(elSeconds) elSeconds.innerText = s < 10 ? "0" + s : s;
        }, 1000);
    }

    // --- 2. LIGHTBOX GALLERY (INVARIATO) ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.querySelector('.close-lightbox');
    const galleryItems = document.querySelectorAll('.gallery-item');

    if (lightbox && lightboxImg) {
        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                const img = item.querySelector('img');
                if (img) {
                    lightbox.style.display = "flex"; 
                    lightbox.style.alignItems = "center";
                    lightbox.style.justifyContent = "center";
                    lightboxImg.src = img.src;
                    document.body.style.overflow = "hidden"; // Blocca scroll pagina sotto
                }
            });
        });

        const closeL = () => { lightbox.style.display = "none"; document.body.style.overflow = ""; };
        
        if (closeBtn) closeBtn.addEventListener('click', closeL);
        lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeL(); });
    }
});