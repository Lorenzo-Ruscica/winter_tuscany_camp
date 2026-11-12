



document.addEventListener('DOMContentLoaded', async () => {
    
    
    const profName = document.getElementById('profName');
    const profSurname = document.getElementById('profSurname');
    const profEmail = document.getElementById('profEmail');
    const profileForm = document.getElementById('profileForm');
    const emailForm = document.getElementById('emailForm');
    const messageBox = document.getElementById('updateMessage');

    
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMsg = document.getElementById('modal-message');
    const btnOk = document.getElementById('modal-btn-ok');
    const btnCancel = document.getElementById('modal-btn-cancel');

    
    window.showCustomAlert = (title, message) => {
        return new Promise((resolve) => {
            modalTitle.innerText = title;
            modalTitle.style.color = '#00B4D8'; 
            modalMsg.innerText = message;
            btnCancel.style.display = 'none';
            btnOk.innerText = "OK";
            btnOk.classList.remove('btn-danger'); 
            modal.style.display = 'flex';

            btnOk.onclick = () => {
                modal.style.display = 'none';
                resolve();
            };
        });
    };

    
    window.showCustomConfirm = (title, message, isDanger = false) => {
        return new Promise((resolve) => {
            modalTitle.innerText = title;
            modalTitle.style.color = isDanger ? '#dc3545' : '#00B4D8';
            modalMsg.innerText = message;
            btnCancel.style.display = 'block'; 
            btnOk.innerText = isDanger ? "ELIMINA" : "Conferma";
            
            
            if(isDanger) btnOk.classList.add('btn-danger'); 
            else btnOk.classList.remove('btn-danger');

            modal.style.display = 'flex';

            
            btnOk.onclick = () => {
                modal.style.display = 'none';
                resolve(true); 
            };

            
            btnCancel.onclick = () => {
                modal.style.display = 'none';
                resolve(false); 
            };
        });
    };

    
    if (window.supabase) {
        const { data: { user } } = await window.supabase.auth.getUser();

        if (user) {
            profEmail.value = user.email;
            if (user.user_metadata) {
                profName.value = user.user_metadata.first_name || '';
                profSurname.value = user.user_metadata.last_name || '';
            }
        } else {
            window.location.href = 'login.html';
        }
    }

    
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = profileForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Saving...";
            btn.disabled = true;

            try {
                const { error } = await window.supabase.auth.updateUser({
                    data: {
                        first_name: profName.value,
                        last_name: profSurname.value
                    }
                });

                if (error) throw error;
                await window.showCustomAlert("Successo", "Profilo aggiornato correttamente!");

            } catch (err) {
                await window.showCustomAlert("Errore", err.message);
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    
    if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newEmail = document.getElementById('newEmail').value;
            if(!newEmail) return;

            const confirmChange = await window.showCustomConfirm(
                "Cambio Email", 
                "Se cambi email, dovrai confermare il link inviato al NUOVO indirizzo per poter accedere di nuovo. Procedere?"
            );

            if(confirmChange) {
                try {
                    const { error } = await window.supabase.auth.updateUser({ email: newEmail });
                    if (error) throw error;
                    await window.showCustomAlert("Email Inviata", "Controlla la tua nuova casella di posta per confermare.");
                } catch (err) {
                    await window.showCustomAlert("Errore", err.message);
                }
            }
        });
    }

    
    window.handleLogout = async function() {
        const confirmLogout = await window.showCustomConfirm("Logout", "Sei sicuro di voler uscire?");
        
        if (confirmLogout) {
            if (window.supabase) {
                const { error } = await window.supabase.auth.signOut();
                if (!error) window.location.href = 'index.html';
            }
        }
    }

    
    window.deleteAccount = async function() {
        
        const firstCheck = await window.showCustomConfirm(
            "Elimina Account", 
            "Sei sicuro? Questa azione cancellerà per sempre il tuo account e le prenotazioni.", 
            true 
        );

        if (!firstCheck) return;

        
        const secondCheck = await window.showCustomConfirm(
            "Sei davvero sicuro?", 
            "Non potrai tornare indietro. Confermi l'eliminazione definitiva?", 
            true
        );

        if (secondCheck) {
            try {
                
                const { error } = await window.supabase.rpc('delete_user');
                
                if (error) throw error;

                
                await window.supabase.auth.signOut();
                await window.showCustomAlert("Account Eliminato", "Il tuo account è stato rimosso correttamente.");
                window.location.href = 'index.html';

            } catch (err) {
                console.error(err);
                await window.showCustomAlert("Errore", "Impossibile eliminare l'account: " + err.message);
            }
        }
    }

    
    window.onclick = function(event) {
        if (event.target == modal) {
            
            
        }
    }
});