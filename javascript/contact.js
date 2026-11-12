




document.addEventListener('DOMContentLoaded', () => {
    
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            
            const name = document.getElementById('contactName').value;
            const email = document.getElementById('contactEmail').value;
            const subject = document.getElementById('contactSubject').value;
            const message = document.getElementById('contactMessage').value;
            const btn = contactForm.querySelector('button');

            
            const originalText = btn.innerText;
            btn.innerText = "Sending...";
            btn.disabled = true;

            try {
                
                if (!window.supabase) throw new Error("Errore di connessione al database.");

                
                const { error } = await window.supabase
                    .from('contacts') 
                    .insert({ 
                        full_name: name,
                        email: email, 
                        subject: subject, 
                        message: message 
                    });

                if (error) throw error;

                
                if (window.showCustomAlert) {
                    await window.showCustomAlert("Message Sent!", "Thank you for contacting us. We will reply shortly.");
                } else {
                    alert("Message Sent! Thank you.");
                }
                
                
                contactForm.reset();

            } catch (err) {
                console.error("Errore invio:", err);
                if (window.showCustomAlert) {
                    window.showCustomAlert("Error", "Could not send message. Please try again later.");
                } else {
                    alert("Error sending message: " + err.message);
                }
            } finally {
                
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
});