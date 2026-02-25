// ============================================================
// FILE: js/contact.js
// DESCRIZIONE: Gestione invio modulo contatti a Supabase
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Ferma il ricaricamento della pagina

            // 1. Prendi i valori
            const name = document.getElementById('contactName').value;
            const email = document.getElementById('contactEmail').value;
            const subject = document.getElementById('contactSubject').value;
            const message = document.getElementById('contactMessage').value;
            const btn = contactForm.querySelector('button');

            // 2. UI Loading (Feedback visivo)
            const originalText = btn.innerText;
            btn.innerText = "Sending...";
            btn.disabled = true;

            try {
                // Controllo sicurezza
                if (!window.supabase) throw new Error("Errore di connessione al database.");

                // 3. Invia a Supabase
                const { error } = await window.supabase
                    .from('contacts') // Nome della tabella creata al Passo 1
                    .insert({ 
                        full_name: name,
                        email: email, 
                        subject: subject, 
                        message: message 
                    });

                if (error) throw error;

                // 4. Successo
                if (window.showCustomAlert) {
                    await window.showCustomAlert("Message Sent!", "Thank you for contacting us. We will reply shortly.");
                } else {
                    alert("Message Sent! Thank you.");
                }
                
                // Pulisci il form
                contactForm.reset();

            } catch (err) {
                console.error("Errore invio:", err);
                if (window.showCustomAlert) {
                    window.showCustomAlert("Error", "Could not send message. Please try again later.");
                } else {
                    alert("Error sending message: " + err.message);
                }
            } finally {
                // Ripristina il bottone
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
});