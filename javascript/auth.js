




document.addEventListener('DOMContentLoaded', () => {

    
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const formLogin = document.getElementById('loginForm');
    const formSignup = document.getElementById('signupForm');
    const authMessage = document.getElementById('authMessage');

    
    
    
    if (btnLogin && btnSignup) {
        const switchTab = (showLogin) => {
            btnLogin.classList.toggle('active', showLogin);
            btnSignup.classList.toggle('active', !showLogin);
            formLogin.classList.toggle('active', showLogin);
            formSignup.classList.toggle('active', !showLogin);
            if (authMessage) authMessage.style.display = 'none';
        };

        btnLogin.addEventListener('click', () => switchTab(true));
        btnSignup.addEventListener('click', () => switchTab(false));
    }

    
    
    
    
    if (window.supabase) {
        const currentPage = window.location.pathname;
        
        const isUpdatePasswordPage = currentPage.includes('update-password.html');

        if (!isUpdatePasswordPage) {
            window.supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    
                    
                    if (currentPage.includes('login.html')) {
                        window.location.href = 'index.html';
                    }
                }
            });
        }
    }

    
    
    
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
            if (authMessage) authMessage.style.display = 'none';

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
                setTimeout(() => { if (btnLogin) btnLogin.click(); }, 1500);

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

    
    
    
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const btn = formLogin.querySelector('button');

            
            btn.disabled = true;
            btn.innerText = "Logging in...";
            if (authMessage) authMessage.style.display = 'none';

            try {
                if (!window.supabase) throw new Error("Supabase non connesso.");

                
                const { data, error } = await window.supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                
                
                
                const userEmail = data.user.email;

                // Verifica admin dal database o whitelist
                const fallbackAdmins = ["lorenzo.ruscica@outlook.it", "admin@tuscanycamp.com", "mirko@gozzoli.com", "admin@wintertuscanycamp.it"];
                let isAdmin = fallbackAdmins.includes((userEmail || "").toLowerCase().trim());

                if (!isAdmin) {
                    try {
                        const { data: adminRow } = await window.supabase
                            .from('admins')
                            .select('id')
                            .eq('email', userEmail)
                            .maybeSingle();
                        if (adminRow) isAdmin = true;
                    } catch(e) {}
                }

                if (isAdmin) {
                    window.location.href = 'admin.html';
                    return;
                }

                
                
                const { data: teacherDoc } = await window.supabase
                    .from('teachers')
                    .select('id')
                    .eq('email', userEmail)
                    .maybeSingle();

                if (teacherDoc) {
                    window.location.href = 'teacher-dashboard.html';
                    return; 
                }

                
                
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
                if (redirectUrl) {
                    sessionStorage.removeItem('redirectAfterLogin');
                    window.location.href = redirectUrl;
                } else {
                    window.location.href = "index.html";
                }
                

            } catch (err) {
                
                console.error("Login Error:", err);
                if (authMessage) {
                    authMessage.className = "auth-message error";
                    authMessage.innerText = "Email o Password errati."; 
                    authMessage.style.display = 'block';
                } else {
                    alert("Login Failed: " + err.message);
                }

                
                btn.disabled = false;
                btn.innerText = "LOG IN";
            }
        });
    }
    
    
    
    const forgotLink = document.getElementById('forgot-link');
    const resetModal = document.getElementById('reset-modal');
    const btnCancelReset = document.getElementById('btn-cancel-reset');
    const btnConfirmReset = document.getElementById('btn-confirm-reset');
    const resetEmailInput = document.getElementById('reset-email');

    
    if (forgotLink && resetModal) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            resetModal.style.display = 'flex';
            if (resetEmailInput) {
                resetEmailInput.value = '';
                resetEmailInput.focus();
            }
        });
    }

    
    if (btnCancelReset) {
        btnCancelReset.addEventListener('click', (e) => {
            e.preventDefault();
            if (resetModal) resetModal.style.display = 'none';
        });
    }

    
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
                
                
                const path = window.location.pathname;
                const directory = path.substring(0, path.lastIndexOf('/'));

                
                const redirectUrl = window.location.origin + directory + '/update_password.html';

                
                const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: redirectUrl
                });

                if (error) throw error;

                
                if (resetModal) resetModal.style.display = 'none';

                const msg = "Check your inbox for the password reset link.\nClicking it will let you set a new password.";

                if (window.showCustomAlert) {
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

    
    window.addEventListener('click', (e) => {
        if (resetModal && e.target === resetModal) {
            resetModal.style.display = 'none';
        }
    });

});