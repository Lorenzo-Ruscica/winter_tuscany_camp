




document.addEventListener('DOMContentLoaded', async () => {

    
    const elDays = document.getElementById('days');

    
    if (elDays) {

        
        let targetDateString = "2026-05-23T09:00:00";

        
        if (window.supabase) {
            try {
                const { data, error } = await window.supabase
                    .from('site_settings')
                    .select('value')
                    .eq('key', 'countdown_end')
                    .maybeSingle();

                if (data && data.value) {
                    targetDateString = data.value;
                }
            } catch (err) {
                console.warn("⚠️ Errore lettura Timer (Uso default):", err);
            }
        }

        
        const eventDate = new Date(targetDateString).getTime();
        let timer;

        const updateTimer = () => {
            const now = new Date().getTime();
            const diff = eventDate - now;

            const currDays = document.getElementById('days');
            const currHours = document.getElementById('hours');
            const currMinutes = document.getElementById('minutes');
            const currSeconds = document.getElementById('seconds');
            const countdownContainer = document.getElementById('countdown');

            
            if (diff < 0) {
                if (timer) clearInterval(timer);
                if (countdownContainer) {
                    countdownContainer.innerHTML = "<h3 style='color:var(--color-hot-pink); text-align:center; margin-top:10px;'>EVENT STARTED!</h3>";
                }
                return;
            }

            
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            
            if (currDays) currDays.innerText = d < 10 ? "0" + d : d;
            if (currHours) currHours.innerText = h < 10 ? "0" + h : h;
            if (currMinutes) currMinutes.innerText = m < 10 ? "0" + m : m;
            if (currSeconds) currSeconds.innerText = s < 10 ? "0" + s : s;
        };

        
        updateTimer();
        timer = setInterval(updateTimer, 1000);
    }

    
    
    if (document.getElementById('home-date-days') || document.getElementById('home-date-month')) {
        let heroDaysText = "23 &bull; 24";
        let heroMonthText = "MAY 2026";

        if (window.supabase) {
            try {
                const { data } = await window.supabase
                    .from('site_settings')
                    .select('value')
                    .eq('key', 'hero_dates')
                    .maybeSingle();

                if (data && data.value) {
                    const parsed = JSON.parse(data.value);
                    if (parsed.days) heroDaysText = parsed.days;
                    if (parsed.month) heroMonthText = parsed.month;
                }
            } catch (err) {
                console.warn("⚠️ Errore lettura Hero Dates:", err);
            }
        }

        
        const applyHeroDates = () => {
            const elDays = document.getElementById('home-date-days');
            const elMonth = document.getElementById('home-date-month');

            
            if (elDays && elDays.innerHTML !== heroDaysText) elDays.innerHTML = heroDaysText;
            if (elMonth && elMonth.innerHTML !== heroMonthText) elMonth.innerHTML = heroMonthText;
        };

        
        applyHeroDates();

        
        const heroInterval = setInterval(applyHeroDates, 200);
        
        setTimeout(() => clearInterval(heroInterval), 5000);
    }

    
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
                    document.body.style.overflow = "hidden"; 
                }
            });
        });

        const closeL = () => { lightbox.style.display = "none"; document.body.style.overflow = ""; };

        if (closeBtn) closeBtn.addEventListener('click', closeL);
        lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeL(); });
    }
});