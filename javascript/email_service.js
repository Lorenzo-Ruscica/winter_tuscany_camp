// ============================================================
// FILE: js/email_service.js
// DESCRIZIONE: Gestisce SOLO l'invio delle email
// ============================================================

(function() {
    // 1. Inizializza EmailJS immediatamente
    if (typeof emailjs !== 'undefined') {
        emailjs.init("HvNxuhIR0mdVRUIhR"); // La tua Public Key
        console.log("✅ Email Service Pronto");
    } else {
        console.error("❌ Errore: Libreria EmailJS non caricata nell'HTML");
    }

    // 2. Crea una funzione globale utilizzabile dagli altri file
    window.sendEntryEmail = async function(data) {
        console.log("📧 Tentativo invio email...", data);

        const SERVICE_ID = "service_fik9j1g"; 
        const TEMPLATE_ID = "template_2je1tdk"; 

        // Prepara i parametri (Gestione dei campi vuoti inclusa)
        const templateParams = {
            to_email: data.user_email,
            full_name: data.full_name,
            man_name: data.man_name || "N/A",
            man_surname: data.man_surname || "",
            woman_name: data.woman_name || "N/A",
            woman_surname: data.woman_surname || "",
            country: data.country,
            teacher: data.teacher,
            age_group: data.age_group,
            phone: data.phone,
            package_name: data.package,
            extra_nights: data.extra_nights,
            arrival_date: data.arrival_date || "Not Set",
            arrival_time: data.arrival_time || "--:--",
            departure_date: data.departure_date || "Not Set",
            departure_time: data.departure_time || "--:--",
            total_amount: data.total_amount
        };

        try {
            if (typeof emailjs !== 'undefined') {
                const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
                console.log("✅ Email inviata con successo!", response.status, response.text);
                return true;
            } else {
                console.warn("⚠️ EmailJS non è definito, email non inviata.");
                return false;
            }
        } catch (error) {
            console.error("❌ Errore invio Email:", error);
            return false;
        }
    };
})();