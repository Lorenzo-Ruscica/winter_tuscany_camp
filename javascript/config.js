// ── Supabase Client (credenziali incapsulate in closure — Winter Tuscany Camp) ──────────────
(function() {
    const _u = [
        'aHR0cHM6Ly9xZHprdGNn',
        'dHhvd3NtcmRmeGVnay5z',
        'dXBhYmFzZS5jbw=='
    ].map(s => atob(s)).join('');

    const _k = [
        'ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5',
        'LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5G',
        'a2VtdDBZMmQwZUc5M2MyMXlaR1o0Wldkcklpd2ljbTlzWlNJ',
        'NkltRnViMjRpTENKcFlYUWlPakUzTnpJd05EZzVORFVzSW1W',
        'NGNDSTZNakE0TnpZeU5EazBOWDAuWmtCR2hzbU5JWnBmVGdm',
        'V09WMndZS3pBWnE2VVJuT1RHUGZfSHRheTRNaw=='
    ].map(s => atob(s)).join('');

    if (window.supabase && window.supabase.createClient) {
        window.supabase = window.supabase.createClient(_u, _k);
    } else {
        console.error("Libreria Supabase non trovata.");
    }
})();







window.showCustomAlert = (title, message) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        if (!modal) {
            alert(message); 
            resolve();
            return;
        }

        
        const mTitle = document.getElementById('modal-title');
        const mMsg = document.getElementById('modal-message');
        const btnOk = document.getElementById('modal-btn-ok');
        const btnCancel = document.getElementById('modal-btn-cancel');

        
        mTitle.innerText = title;
        mMsg.innerText = message;
        btnCancel.style.display = 'none'; 
        btnOk.innerText = "OK";

        modal.style.display = 'flex';

        btnOk.onclick = () => {
            modal.style.display = 'none';
            resolve();
        };
    });
};


window.showCustomConfirm = (title, message, isDanger = false) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        if (!modal) {
            resolve(confirm(message)); 
            return;
        }

        const mTitle = document.getElementById('modal-title');
        const mMsg = document.getElementById('modal-message');
        const btnOk = document.getElementById('modal-btn-ok');
        const btnCancel = document.getElementById('modal-btn-cancel');

        mTitle.innerText = title;
        mMsg.innerText = message;
        btnCancel.style.display = 'block';

        
        if (isDanger) {
            btnOk.classList.add('btn-danger');
            mTitle.style.color = '#dc3545';
        } else {
            btnOk.classList.remove('btn-danger');
            mTitle.style.color = '#00B4D8';
        }

        modal.style.display = 'flex';

        btnOk.onclick = () => { modal.style.display = 'none'; resolve(true); };
        btnCancel.onclick = () => { modal.style.display = 'none'; resolve(false); };
    });
};





document.addEventListener('DOMContentLoaded', async () => {

    
    
    
    async function checkPageProtection() {
        
        const protectedPages = ['booking.html', 'entry-form.html'];
        const currentPage = window.location.pathname;

        
        const isProtected = protectedPages.some(page => currentPage.includes(page));

        if (isProtected) {
            
            const { data: { session } } = await window.supabase.auth.getSession();

            if (!session) {
                

                
                
                const elementsToHide = document.querySelectorAll('header, section, footer, main, .container');

                elementsToHide.forEach(el => {
                    
                    if (el.id !== 'custom-modal' && !el.classList.contains('bg-shapes')) {
                        el.style.display = 'none';
                    }
                });

                
                if (window.showCustomAlert) {
                    await window.showCustomAlert("Reserved Area", "You must log in to access this page.");
                } else {
                    alert("Devi effettuare il Login per accedere a questa pagina.");
                }

                
                window.location.href = 'login.html';
            }
        }
    }

    
    if (window.supabase) await checkPageProtection();


    
    function updateNavbar(session) {
        const deskAuthLink = document.getElementById('nav-auth-link');
        const mobAuthLink = document.getElementById('mobile-auth-link');
        const deskBooking = document.getElementById('nav-booking');
        const mobBooking = document.getElementById('mobile-booking');

        if (session) {
            
            let initial = "U";
            if (session.user?.user_metadata?.first_name) {
                initial = session.user.user_metadata.first_name.charAt(0);
            }

            const avatarHTML = `<div class="user-avatar">${initial}</div>`;
            const avatarMobile = `<div class="user-avatar">${initial}</div> <span>My Profile</span>`;

            if (deskAuthLink) { deskAuthLink.href = "account.html"; deskAuthLink.innerHTML = avatarHTML; }
            if (mobAuthLink) { mobAuthLink.href = "account.html"; mobAuthLink.innerHTML = avatarMobile; }

            
            if (deskBooking) deskBooking.onclick = null;
            if (mobBooking) mobBooking.onclick = null;

        } else {
            
            if (deskAuthLink) { deskAuthLink.href = "login.html"; deskAuthLink.innerHTML = '<i class="fas fa-user" style="font-size: 1.2rem;"></i>'; }
            if (mobAuthLink) { mobAuthLink.href = "login.html"; mobAuthLink.innerHTML = '<i class="fas fa-user"></i> <span>Account / Login</span>'; }

            
            const lockAction = async (e) => {
                e.preventDefault();
                await window.showCustomAlert("Restricted Access", "Log in to book.");
                window.location.href = 'login.html';
            };

            if (deskBooking) deskBooking.onclick = lockAction;
            if (mobBooking && !mobBooking.classList.contains('hamburger')) mobBooking.onclick = lockAction;
        }
    }

    
    if (window.supabase) {
        window.supabase.auth.onAuthStateChange((event, session) => updateNavbar(session));
        window.supabase.auth.getSession().then(({ data: { session } }) => updateNavbar(session));
    }
});


window.handleLogout = async function () {
    const confirmLogout = await window.showCustomConfirm("Logout", "Sei sicuro di voler uscire?");
    if (confirmLogout && window.supabase) {
        await window.supabase.auth.signOut();
        window.location.reload();
    }
}




document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) return;

    let currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (!currentPage || currentPage === '/') currentPage = 'index.html';

    const settingKey = 'texts_' + currentPage;

    
    try {
        const { data, error } = await window.supabase
            .from('site_settings')
            .select('value')
            .eq('key', settingKey)
            .maybeSingle();

        if (data && data.value) {
            let texts = JSON.parse(data.value);

            
            const keysToDelete = [];
            for (const key of Object.keys(texts)) {
                if (key.includes('.hero-right-col') || key.includes('.event-date-box') || key.includes('date-days') || key.includes('date-month') || key.includes('section#home > div > div')) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(k => delete texts[k]);

            window.__dynamicSiteTexts = texts; 

            
            setTimeout(() => {
                for (const [selector, html] of Object.entries(texts)) {
                    try {
                        const el = document.querySelector(selector);
                        if (el) el.innerHTML = html;
                    } catch (e) {
                        console.warn("Selettore non trovato:", selector);
                    }
                }
            }, 100); 
        } else {
            window.__dynamicSiteTexts = {};
        }
    } catch (err) {
        console.error("Errore caricamento testi:", err);
        window.__dynamicSiteTexts = {};
    }

    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('visualEditor') === 'true') {
        const { data: { session } } = await window.supabase.auth.getSession();

        // Verifica admin dal database o whitelist
        const userEmail = (session?.user?.email || "").toLowerCase().trim();
        const fallbackAdmins = ["lorenzo.ruscica@outlook.it", "admin@tuscanycamp.com", "mirko@gozzoli.com", "admin@wintertuscanycamp.it"];
        let isAdmin = fallbackAdmins.includes(userEmail);

        if (session && userEmail && !isAdmin) {
            try {
                const { data: adminRow } = await window.supabase
                    .from('admins')
                    .select('id')
                    .eq('email', userEmail)
                    .maybeSingle();
                isAdmin = !!adminRow;
            } catch(e) {}
        }

        if (isAdmin) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/visual-editor.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'javascript/visual-editor.js';
            document.body.appendChild(script);
        } else {
            alert("Accesso negato all'editor visivo. Solo gli admin possono accedere.");
            const newUrl = window.location.pathname;
            window.location.href = newUrl;
        }
    }
});