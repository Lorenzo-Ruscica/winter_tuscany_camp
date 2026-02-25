// ============================================================
// FILE: auth.js
// DESCRIZIONE: Login, Signup, Switch Tabs & Password Reset
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // --- ELEMENTI DOM ---
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const formLogin = document.getElementById('loginForm');
    const formSignup = document.getElementById('signupForm');
    const authMessage = document.getElementById('authMessage');

    // ==========================================
    // 1. SWITCH TABS (Login <-> Sign Up)
    // ==========================================
    if (btnLogin && btnSignup) {
        const switchTab = (showLogin) => {
            btnLogin.classList.toggle('active', showLogin);
            btnSignup.classList.toggle('active', !showLogin);
            formLogin.classList.toggle('active', showLogin);
            formSignup.classList.toggle('active', !showLogin);
            if(authMessage) authMessage.style.display = 'none';
        };

        btnLogin.addEventListener('click', () => switchTab(true));
        btnSignup.addEventListener('click', () => switchTab(false));
    }

    // ==========================================
    // 2. REDIRECT SE GIÀ LOGGATO (CORRETTO)
    // ==========================================
    // Questo impedisce che la pagina di reset venga chiusa automaticamente
    if (window.supabase) {
        const currentPage = window.location.pathname;
        // Se siamo sulla pagina di cambio password, NON fare redirect
        const isUpdatePasswordPage = currentPage.includes('update-password.html');

        if (!isUpdatePasswordPage) {
            window.supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    // Se l'utente è loggato e prova ad andare su login, lo mandiamo alla home
                    // Ma se è altrove (es. home, account) lo lasciamo stare
                    if (currentPage.includes('login.html')) {
                        window.location.href = 'index.html';
                    }
                }
            });
        }
    }

    // ==========================================
    // 3. REGISTRAZIONE (Sign Up)
    // ==========================================
    if (formSignup) {
        formSignup.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('regName').value;
            const lastName = document.getElementById('regSurname').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const btn = formSignup.querySelector('button');

            btn.disabled = true;
            btn.innerText = "Creating Account...";
            if(authMessage) authMessage.style.display = 'none';

            try {
                if (!window.supabase) throw new Error("Supabase non connesso.");
                
                const { error } = await window.supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: { 
                        data: { first_name: firstName, last_name: lastName } 
                    }
                });

                if (error) throw error;

                authMessage.className = "auth-message success";
                authMessage.innerText = "Registrazione riuscita! Ora puoi fare il Login.";
                authMessage.style.display = 'block';
                formSignup.reset();
                setTimeout(() => { if(btnLogin) btnLogin.click(); }, 1500);

            } catch (err) {
                authMessage.className = "auth-message error";
                authMessage.innerText = err.message;
                authMessage.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.innerText = "SIGN UP";
            }
        });
    }

// ==========================================
    // 4. LOGIN (Sign In) - CON REINDIRIZZAMENTO INTELLIGENTE
    // ==========================================
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const btn = formLogin.querySelector('button');

            // UI: Disabilita bottone
            btn.disabled = true;
            btn.innerText = "Logging in...";
            if(authMessage) authMessage.style.display = 'none';

            try {
                if (!window.supabase) throw new Error("Supabase non connesso.");
                
                // 1. ESEGUI IL LOGIN
                const { data, error } = await window.supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // ---------------------------------------------------------
                // 2. LOGICA DI REINDIRIZZAMENTO (CHI SI È LOGGATO?)
                // ---------------------------------------------------------
                const userEmail = data.user.email;

                // A. CHECK AMMINISTRATORI
                // Aggiungi qui le email che devono accedere al pannello admin
                const admins = [
                    'admin@tuscanycamp.com', 
                    'mirko@gozzoli.com', 
                    'lorenzo.ruscica@outlook.it'
                ];

                if (admins.includes(userEmail)) {
                    window.location.href = 'admin.html';
                    return; // Stop qui
                }

                // B. CHECK INSEGNANTI (Database)
                // Controlla se questa email esiste nella tabella 'teachers'
                const { data: teacherDoc } = await window.supabase
                    .from('teachers')
                    .select('id')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (teacherDoc) {
                    window.location.href = 'teacher-dashboard.html';
                    return; // Stop qui
                }

                // C. UTENTE NORMALE
                // Se c'era un redirect salvato (es. arrivava dall'entry form) usalo, altrimenti Home
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                if (redirectUrl) {
                    sessionStorage.removeItem('redirectAfterLogin');
                    window.location.href = redirectUrl;
                } else {
                    window.location.href = "index.html"; 
                }
                // ---------------------------------------------------------

            } catch (err) {
                // Gestione Errori
                console.error("Login Error:", err);
                if(authMessage) {
                    authMessage.className = "auth-message error";
                    authMessage.innerText = "Email o Password errati."; // O err.message per dettagli
                    authMessage.style.display = 'block';
                } else {
                    alert("Login Failed: " + err.message);
                }
                
                // Reset Bottone
                btn.disabled = false;
                btn.innerText = "LOG IN";
            }
        });
    }
    // ==========================================
    // 5. LOGICA PASSWORD DIMENTICATA (Reset)
    // ==========================================
    const forgotLink = document.getElementById('forgot-link');
    const resetModal = document.getElementById('reset-modal');
    const btnCancelReset = document.getElementById('btn-cancel-reset');
    const btnConfirmReset = document.getElementById('btn-confirm-reset');
    const resetEmailInput = document.getElementById('reset-email');

    // A. Apri Modale
    if (forgotLink && resetModal) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            resetModal.style.display = 'flex';
            if(resetEmailInput) {
                resetEmailInput.value = '';
                resetEmailInput.focus();
            }
        });
    }

    // B. Chiudi Modale (Annulla)
    if (btnCancelReset) {
        btnCancelReset.addEventListener('click', (e) => {
            e.preventDefault();
            if(resetModal) resetModal.style.display = 'none';
        });
    }

    // C. Invia Richiesta a Supabase
    if (btnConfirmReset) {
        btnConfirmReset.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const email = resetEmailInput.value.trim();
            if (!email) {
                alert("Please enter your email.");
                return;
            }

            const originalText = btnConfirmReset.innerText;
            btnConfirmReset.innerText = "Sending...";
            btnConfirmReset.disabled = true;

            try {
                // 1. CALCOLO URL DINAMICO
                // Recupera il percorso base (es. /tuscany_camp/)
                const path = window.location.pathname;
                const directory = path.substring(0, path.lastIndexOf('/')); 
                
                // NOTA BENE: Assicurati che il file HTML creato prima si chiami ESATTAMENTE 'update_password.html'
                const redirectUrl = window.location.origin + directory + '/update_password.html';

                console.log("Redirect URL generato:", redirectUrl); // Utile per debug

                // 2. CHIAMATA SUPABASE
                const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: redirectUrl
                });

                if (error) throw error;

                // 3. SUCCESSO
                if(resetModal) resetModal.style.display = 'none';
                
                const msg = "Check your inbox for the password reset link.\nClicking it will let you set a new password.";
                
                if(window.showCustomAlert) {
                    await window.showCustomAlert("Email Sent", msg);
                } else {
                    alert(msg);
                }

            } catch (err) {
                console.error("Reset Error:", err);
                alert("Error: " + err.message);
            } finally {
                btnConfirmReset.innerText = originalText;
                btnConfirmReset.disabled = false;
            }
        });
    }

    // D. Chiudi modale cliccando fuori
    window.addEventListener('click', (e) => {
        if (resetModal && e.target === resetModal) {
            resetModal.style.display = 'none';
        }
    });

});