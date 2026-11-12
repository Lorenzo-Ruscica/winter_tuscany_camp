




document.addEventListener('DOMContentLoaded', async () => {

    
    const elDays = document.getElementById('days');

    if (elDays) {
        let targetDateString = localStorage.getItem('wtc_countdown_end') || "2027-01-16T09:00:00";

        if (window.supabase) {
            try {
                const { data, error } = await window.supabase
                    .from('site_settings')
                    .select('value')
                    .eq('key', 'countdown_end')
                    .maybeSingle();

                if (data && data.value) {
                    targetDateString = data.value;
                    localStorage.setItem('wtc_countdown_end', data.value);
                }
            } catch (err) {
                console.warn("⚠️ Errore lettura Timer (Uso default):", err);
            }
        }

        const parseTargetDate = (str) => {
            if (!str) return NaN;
            let t = new Date(str).getTime();
            if (!isNaN(t)) return t;
            // Fallback parsing per formati YYYY-MM-DDTHH:mm
            const parts = str.split(/[-T: ]/);
            if (parts.length >= 3) {
                return new Date(
                    parseInt(parts[0], 10),
                    parseInt(parts[1], 10) - 1,
                    parseInt(parts[2], 10),
                    parseInt(parts[3] || "0", 10),
                    parseInt(parts[4] || "0", 10),
                    parseInt(parts[5] || "0", 10)
                ).getTime();
            }
            return NaN;
        };

        const eventDate = parseTargetDate(targetDateString);
        let timer;

        const updateTimer = () => {
            const now = Date.now();
            const diff = eventDate - now;

            const currDays = document.getElementById('days');
            const currHours = document.getElementById('hours');
            const currMinutes = document.getElementById('minutes');
            const currSeconds = document.getElementById('seconds');

            if (isNaN(diff) || diff <= 0) {
                if (timer) clearInterval(timer);
                if (currDays) currDays.innerText = "00";
                if (currHours) currHours.innerText = "00";
                if (currMinutes) currMinutes.innerText = "00";
                if (currSeconds) currSeconds.innerText = "00";
                return;
            }

            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            if (currDays) currDays.innerText = d < 10 ? "0" + d : String(d);
            if (currHours) currHours.innerText = h < 10 ? "0" + h : String(h);
            if (currMinutes) currMinutes.innerText = m < 10 ? "0" + m : String(m);
            if (currSeconds) currSeconds.innerText = s < 10 ? "0" + s : String(s);
        };

        updateTimer();
        timer = setInterval(updateTimer, 1000);
    }

    if (document.getElementById('home-date-days') || document.getElementById('home-date-month')) {
        let heroDaysText = "16 &bull; 17";
        let heroMonthText = "JANUARY 2027";

        const savedLocalHero = localStorage.getItem('wtc_hero_dates');
        if (savedLocalHero) {
            try {
                const p = JSON.parse(savedLocalHero);
                if (p.days) heroDaysText = p.days;
                if (p.month) heroMonthText = p.month;
            } catch(e) {}
        }

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
                    localStorage.setItem('wtc_hero_dates', data.value);
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