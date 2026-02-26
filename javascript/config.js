// ============================================================
// FILE: config.js
// DESCRIZIONE: Configurazione Supabase, Navbar, Protezione Pagine, Modali Globali
// ============================================================

const SUPABASE_URL = 'https://qdzktcgtxowsmrdfxegk.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkemt0Y2d0eG93c21yZGZ4ZWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDg5NDUsImV4cCI6MjA4NzYyNDk0NX0.ZkBGhsmNIZpfTgfWOV2wYKzAZq6URnOTGPf_Htay4Mk';

// 1. Inizializzazione Supabase
if (window.supabase && window.supabase.createClient) {
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.supabase = client;
    console.log("✅ Config: Supabase collegato!");
} else {
    console.error("❌ ERRORE: Libreria Supabase non trovata.");
}

// ============================================================
// --- 2. GESTIONE MODALI GLOBALI (Alert & Confirm) ---
// ============================================================

// Funzione: Alert Personalizzato (Sostituisce alert standard)
window.showCustomAlert = (title, message) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        if (!modal) {
            alert(message); // Fallback se manca l'HTML
            resolve();
            return;
        }

        // Elementi
        const mTitle = document.getElementById('modal-title');
        const mMsg = document.getElementById('modal-message');
        const btnOk = document.getElementById('modal-btn-ok');
        const btnCancel = document.getElementById('modal-btn-cancel');

        // Setup
        mTitle.innerText = title;
        mMsg.innerText = message;
        btnCancel.style.display = 'none'; // Nascondi Annulla
        btnOk.innerText = "OK";

        modal.style.display = 'flex';

        btnOk.onclick = () => {
            modal.style.display = 'none';
            resolve();
        };
    });
};

// Funzione: Confirm Personalizzato (Sostituisce confirm standard)
window.showCustomConfirm = (title, message, isDanger = false) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        if (!modal) {
            resolve(confirm(message)); // Fallback
            return;
        }

        const mTitle = document.getElementById('modal-title');
        const mMsg = document.getElementById('modal-message');
        const btnOk = document.getElementById('modal-btn-ok');
        const btnCancel = document.getElementById('modal-btn-cancel');

        mTitle.innerText = title;
        mMsg.innerText = message;
        btnCancel.style.display = 'block';

        // Stile pericolo
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

// ============================================================
// --- 3. PROTEZIONE PAGINE E NAVBAR ---
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {

    // --- A. PROTEZIONE PAGINE (Entry Form & Booking) ---
    // --- A. PROTEZIONE PAGINE (Versione Fixata per Modale) ---
    // --- A. PROTEZIONE PAGINE (Fix Sfondo Blur) ---
    async function checkPageProtection() {
        // Lista pagine protette
        const protectedPages = ['booking.html', 'entry-form.html'];
        const currentPage = window.location.pathname;

        // Controlla se siamo in una pagina protetta
        const isProtected = protectedPages.some(page => currentPage.includes(page));

        if (isProtected) {
            // Verifica sessione
            const { data: { session } } = await window.supabase.auth.getSession();

            if (!session) {
                // UTENTE NON LOGGATO

                // 1. Nascondiamo il contenuto sensibile, MA LASCIAMO LO SFONDO (.bg-shapes)
                // Selezioniamo specificamente header, footer e le sezioni principali
                const elementsToHide = document.querySelectorAll('header, section, footer, main, .container');

                elementsToHide.forEach(el => {
                    // Controllo di sicurezza: non nascondere il modale e non nascondere lo sfondo
                    if (el.id !== 'custom-modal' && !el.classList.contains('bg-shapes')) {
                        el.style.display = 'none';
                    }
                });

                // 2. Mostriamo l'avviso elegante
                if (window.showCustomAlert) {
                    await window.showCustomAlert("Reserved Area", "You must log in to access this page.");
                } else {
                    alert("Devi effettuare il Login per accedere a questa pagina.");
                }

                // 3. Redirect al login
                window.location.href = 'login.html';
            }
        }
    }

    // Esegui controllo protezione
    if (window.supabase) await checkPageProtection();


    // --- B. AGGIORNAMENTO NAVBAR ---
    function updateNavbar(session) {
        const deskAuthLink = document.getElementById('nav-auth-link');
        const mobAuthLink = document.getElementById('mobile-auth-link');
        const deskBooking = document.getElementById('nav-booking');
        const mobBooking = document.getElementById('mobile-booking');

        if (session) {
            // --- LOGGATO ---
            let initial = "U";
            if (session.user?.user_metadata?.first_name) {
                initial = session.user.user_metadata.first_name.charAt(0);
            }

            const avatarHTML = `<div class="user-avatar">${initial}</div>`;
            const avatarMobile = `<div class="user-avatar">${initial}</div> <span>My Profile</span>`;

            if (deskAuthLink) { deskAuthLink.href = "account.html"; deskAuthLink.innerHTML = avatarHTML; }
            if (mobAuthLink) { mobAuthLink.href = "account.html"; mobAuthLink.innerHTML = avatarMobile; }

            // Sblocca Booking
            if (deskBooking) deskBooking.onclick = null;
            if (mobBooking) mobBooking.onclick = null;

        } else {
            // --- NON LOGGATO ---
            if (deskAuthLink) { deskAuthLink.href = "login.html"; deskAuthLink.innerHTML = '<i class="fas fa-user" style="font-size: 1.2rem;"></i>'; }
            if (mobAuthLink) { mobAuthLink.href = "login.html"; mobAuthLink.innerHTML = '<i class="fas fa-user"></i> <span>Account / Login</span>'; }

            // Azione di Blocco con MODALE INTERNO
            const lockAction = async (e) => {
                e.preventDefault();
                await window.showCustomAlert("Restricted Access", "Log in to book.");
                window.location.href = 'login.html';
            };

            if (deskBooking) deskBooking.onclick = lockAction;
            if (mobBooking && !mobBooking.classList.contains('hamburger')) mobBooking.onclick = lockAction;
        }
    }

    // Monitora stato
    if (window.supabase) {
        window.supabase.auth.onAuthStateChange((event, session) => updateNavbar(session));
        window.supabase.auth.getSession().then(({ data: { session } }) => updateNavbar(session));
    }
});

// --- C. LOGOUT GLOBALE ---
window.handleLogout = async function () {
    const confirmLogout = await window.showCustomConfirm("Logout", "Sei sicuro di voler uscire?");
    if (confirmLogout && window.supabase) {
        await window.supabase.auth.signOut();
        window.location.reload();
    }
}

// ============================================================
// --- 4. GESTIONE TESTO DINAMICO & VISUAL EDITOR ---
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) return;

    let currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (!currentPage || currentPage === '/') currentPage = 'index.html';

    const settingKey = 'texts_' + currentPage;

    // 1. Carica i testi salvati e applicali al DOM (per tutti gli utenti)
    try {
        const { data, error } = await window.supabase
            .from('site_settings')
            .select('value')
            .eq('key', settingKey)
            .maybeSingle();

        if (data && data.value) {
            const texts = JSON.parse(data.value);
            window.__dynamicSiteTexts = texts; // Passato all'editor se aperto

            // Applica i testi al DOM (assicuriamoci che window loading sia completato)
            setTimeout(() => {
                for (const [selector, html] of Object.entries(texts)) {
                    try {
                        const el = document.querySelector(selector);
                        if (el) el.innerHTML = html;
                    } catch (e) {
                        console.warn("Selettore non trovato:", selector);
                    }
                }
            }, 100); // Piccolo delay per far caricare Navbar ecc. se caricati dinamicamente
        } else {
            window.__dynamicSiteTexts = {};
        }
    } catch (err) {
        console.error("Errore caricamento testi:", err);
        window.__dynamicSiteTexts = {};
    }

    // 2. Controlla attivazione Visual Editor
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('visualEditor') === 'true') {
        const { data: { session } } = await window.supabase.auth.getSession();

        // Controlla se è admin o staff autorizzato
        const allowedAdmins = [
            'admin@tuscanycamp.com',
            'mirko@gozzoli.com',
            'lorenzo.ruscica@outlook.it'
        ];
        const userEmail = session?.user?.email;

        if (session && allowedAdmins.includes(userEmail)) {
            // Carica CSS dell'editor
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/visual-editor.css';
            document.head.appendChild(link);

            // Carica JS dell'editor
            const script = document.createElement('script');
            script.src = 'javascript/visual-editor.js';
            document.body.appendChild(script);
        } else {
            alert("Accesso negato all'editor visivo. Solo gli admin possono accedere.");
            // Rimuovi parametro visualEditor e ricarica
            const newUrl = window.location.pathname;
            window.location.href = newUrl;
        }
    }
});