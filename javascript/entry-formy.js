// ============================================================
// FILE: js/entry_form.js
// DESCRIZIONE: UI Logic + Bank Transfer (No Stripe)
// ============================================================

// --- FUNZIONE GLOBALE WIZARD (STEP 1) ---
window.selectRegistrationStep = function (type) {
    const step1 = document.getElementById('step-1-selection');
    const entryForm = document.getElementById('entryForm');
    const hiddenTypeInput = document.getElementById('registrationType');

    if (hiddenTypeInput) hiddenTypeInput.value = type;

    if (step1) step1.style.display = 'none';
    if (entryForm) {
        entryForm.style.display = 'block';
        document.dispatchEvent(new CustomEvent('registrationTypeSelected', { detail: type }));
    }
};

document.addEventListener('DOMContentLoaded', async () => {

    // --- 0. COLLEGAMENTI ED EVENTI ---
    document.addEventListener('registrationTypeSelected', (e) => {
        updateFormVisibility(e.detail);
        calculateTotal();
        document.getElementById('entryForm').scrollIntoView({ behavior: 'smooth' });
    });

    // --- 1. PROTEZIONE LOGIN ---
    await checkAuthProtection();

    async function checkAuthProtection() {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) {
            const modal = document.getElementById('custom-modal');
            const btnOk = document.getElementById('modal-btn-ok');
            if (modal) {
                document.getElementById('modal-title').innerText = "Login Required";
                document.getElementById('modal-message').innerText = "You must be logged in.";
                document.getElementById('modal-btn-cancel').style.display = 'none';
                if (btnOk) {
                    btnOk.innerText = "GO TO LOGIN";
                    btnOk.onclick = () => window.location.href = 'login.html';
                }
                modal.style.display = 'flex';
            } else {
                window.location.href = 'login.html';
            }
            throw new Error("Stop: Not Logged In");
        }
    }

    // --- 2. GESTIONE NOTTI EXTRA ---
    const nightButtons = document.querySelectorAll('.btn-night');
    const hiddenNightsInput = document.getElementById('extraNights');
    const hiddenTypeInput = document.getElementById('registrationType');

    if (nightButtons.length > 0) {
        nightButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                nightButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (hiddenNightsInput) hiddenNightsInput.value = btn.dataset.value;
                calculateTotal();
            });
        });
    }

    // --- 3. VISIBILITÀ CAMPI ---
    function updateFormVisibility(type) {
        const manSection = document.getElementById('man-fields');
        const womanSection = document.getElementById('woman-fields');
        const manInputs = manSection.querySelectorAll('input');
        const womanInputs = womanSection.querySelectorAll('input');

        manSection.classList.remove('hidden-section');
        womanSection.classList.remove('hidden-section');

        const setRequired = (inputs, isRequired) => {
            inputs.forEach(input => {
                if (isRequired) input.setAttribute('required', 'true');
                else {
                    input.removeAttribute('required');
                    input.value = '';
                }
            });
        };

        if (type === 'couple') {
            setRequired(manInputs, true);
            setRequired(womanInputs, true);
        } else if (type === 'man') {
            womanSection.classList.add('hidden-section');
            setRequired(manInputs, true);
            setRequired(womanInputs, false);
        } else if (type === 'woman') {
            manSection.classList.add('hidden-section');
            setRequired(manInputs, false);
            setRequired(womanInputs, true);
        }
    }

    // --- RIFERIMENTI DOM ---
    const entryForm = document.getElementById('entryForm');
    const paymentModal = document.getElementById('paymentModal');
    const paymentForm = document.getElementById('paymentForm');
    const closeModalBtn = document.querySelector('.close-modal');
    const mainBtn = document.getElementById('btnProceed');
    const successModal = document.getElementById('successModal');
    const closeSuccessBtn = document.getElementById('btn-close-success');
    const radioPackages = document.querySelectorAll('input[name="package"]');

    // Summary
    const summaryPkgName = document.getElementById('summary-pkg-name');
    const summaryPkgPrice = document.getElementById('summary-pkg-price');
    const summaryNightCount = document.getElementById('summary-night-count');
    const summaryNightTotal = document.getElementById('summary-night-total');
    const summaryTotal = document.getElementById('summary-total');
    const modalTotal = document.getElementById('modalTotal');
    const modalPkgName = document.getElementById('modalPkgName');

    let currentBasePrice = 160;
    let currentPkgName = "Silver";
    const NIGHT_PRICE = 70;
    let currentGrandTotal = 0;
    let existingRecordId = null;
    let isRegistrationComplete = false; // Sostituisce isPaid per la logica UI

    // --- 4. CHECK UTENTE ESISTENTE ---
    // --- 4. CHECK UTENTE ESISTENTE & GLOBAL ADMIN CHECK ---
    // --- 4. CHECK UTENTE ESISTENTE & GLOBAL ADMIN CHECK ---
    async function checkExistingRegistration() {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) return;

        // Fetch Parallelo: Registrazione Utente + Impostazione Admin
        const [{ data: reg }, { data: setting }] = await Promise.all([
            window.supabase.from('registrations').select('*').eq('user_id', session.user.id).maybeSingle(),
            // Nota: Se la key non esiste, setting sarà null (che va bene, si considera aperto)
            window.supabase.from('site_settings').select('value').eq('key', 'entry_form').maybeSingle()
        ]);

        const isEntryDisabled = setting && (setting.value === false || setting.value === 'false');

        if (isEntryDisabled) {
            // LOGICA CHIUSURA
            const step1 = document.getElementById('step-1-selection');
            const entryForm = document.getElementById('entryForm');
            if (entryForm) entryForm.style.display = 'none';

            if (step1) {
                // Costruiamo il messaggio base
                let html = `
                    <div style="text-align:center; padding:50px;">
                        <div style="width:80px; height:80px; background:rgba(231, 76, 60, 0.1); border-radius:50%; display:flex; justify-content:center; align-items:center; margin:0 auto 20px;">
                            <i class="fas fa-lock" style="font-size:2rem; color:#e74c3c;"></i>
                        </div>
                        <h2 style="color:white; margin-bottom:10px;">REGISTRATIONS CLOSED</h2>
                        <p style="color:#aaa;">The entry form is currently closed.</p>
                 `;

                // Se l'utente ha già compilato, aggiungiamo il bottone "VEDI MA NON TOCCARE"
                if (reg) {
                    html += `
                        <button id="btn-view-readonly" class="btn btn-outline" style="margin-top:20px; border-color:var(--color-hot-pink); color:white;">
                            <i class="fas fa-eye"></i> VIEW MY REGISTRATION
                        </button>
                     `;
                }

                html += `
                        <br><a href="index.html" class="btn btn-outline" style="margin-top:30px; border-color:#555; color:#ddd;">BACK TO HOME</a>
                    </div>
                 `;

                step1.innerHTML = html;
                step1.style.display = 'block';

                // Attach Event Listener dopo che l'HTML è stato inserito
                setTimeout(() => {
                    const btnView = document.getElementById('btn-view-readonly');
                    if (btnView) {
                        btnView.onclick = () => {
                            // Carica i dati in modalità READ-ONLY (Flag true)
                            loadUserData(reg, true);
                        };
                    }
                }, 0);
            }
            return; // Stop qui, non carichiamo il form normale automaticamente
        }

        // Se APERTO:
        if (reg) {
            loadUserData(reg, false); // false = Modificabile (se pagato diventa "Solo Update")
        }
    }

    function loadUserData(data, isReadOnly = false) {
        document.getElementById('step-1-selection').style.display = 'none';
        document.getElementById('entryForm').style.display = 'block';

        existingRecordId = data.id;

        // Se lo stato è 'paid' OPPURE 'pending' (bonifico fatto), blocchiamo come completato
        isRegistrationComplete = (data.payment_status === 'paid' || data.payment_status === 'pending');

        // Rileva Tipo
        let detectedType = 'couple';
        if (!data.woman_name && data.man_name) detectedType = 'man';
        else if (!data.man_name && data.woman_name) detectedType = 'woman';

        if (hiddenTypeInput) hiddenTypeInput.value = detectedType;
        updateFormVisibility(detectedType);

        // Popola
        setVal('manName', data.man_name); setVal('manSurname', data.man_surname);
        setVal('femaleName', data.woman_name); setVal('femaleSurname', data.woman_surname);
        setVal('country', data.country); setVal('teacherName', data.teacher);
        setVal('ageGroup', data.age_group); setVal('email', data.user_email);
        setVal('arrivalDate', data.arrival_date); setVal('arrivalTime', data.arrival_time);
        setVal('departureDate', data.departure_date); setVal('departureTime', data.departure_time);

        if (document.getElementById('phone')) document.getElementById('phone').value = data.phone || "";

        const targetRadio = document.querySelector(`input[name="package"][value="${data.package}"]`);
        if (targetRadio) targetRadio.checked = true;

        const savedNights = data.extra_nights || 0;
        setVal('extraNights', savedNights);

        const nightBtns = document.querySelectorAll('.btn-night');
        nightBtns.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.value) == savedNights) btn.classList.add('active');

            // Disabilita se paid o se readonly
            if (isRegistrationComplete || isReadOnly) {
                btn.disabled = true;
                btn.style.opacity = "0.5";
            }
        });

        // SE LA REGISTRAZIONE È COMPLETA (MODALITÀ MODIFICA)
        if (isRegistrationComplete) {
            applyCompleteVisuals();
            const changeBox = document.getElementById('change-type-box');
            if (changeBox) changeBox.style.display = 'none';
        }

        // --- MODALITA' READ-ONLY (CHIUSURA ADMIN) ---
        if (isReadOnly) {
            // Disabilita tutto
            const form = document.getElementById('entryForm');
            const elements = form.querySelectorAll('input, select, textarea, button');
            elements.forEach(el => {
                el.disabled = true;
                el.style.opacity = '0.7';
                el.style.cursor = 'not-allowed';
            });

            // Nascondi tasti submit e cambio tipo
            if (mainBtn) mainBtn.style.display = 'none';
            const changeBox = document.getElementById('change-type-box');
            if (changeBox) changeBox.style.display = 'none';

            // Aggiungi un banner se non c'è già
            if (!document.getElementById('readonly-banner')) {
                const banner = document.createElement('div');
                banner.id = 'readonly-banner';
                banner.style.cssText = "background:rgba(231, 76, 60, 0.2); border:1px solid #e74c3c; color:#ffcccc; padding:15px; text-align:center; margin-bottom:20px; border-radius:5px;";
                banner.innerHTML = "<strong>READ ONLY MODE:</strong> Registrations are closed. You can view your data but cannot modify it.";
                form.insertBefore(banner, form.parentElement.querySelector('.booking-grid'));
            }
        }

        calculateTotal();
    }

    function applyCompleteVisuals() {
        const summaryCard = document.querySelector('.summary-card');
        if (summaryCard && !summaryCard.classList.contains('is-paid')) {
            summaryCard.classList.add('is-paid');
            const totalLabel = document.querySelector('.line.total span:first-child');
            if (totalLabel) totalLabel.innerText = "CONFIRMED";

            // Disabilita pacchetti
            radioPackages.forEach(r => {
                r.disabled = true;
                r.parentElement.style.opacity = "0.5";
            });

            // Cambia il tasto in "UPDATE"
            if (summaryCard.contains(mainBtn)) {
                mainBtn.classList.add('update-btn-style');
                mainBtn.innerText = "UPDATE INFORMATION";
                mainBtn.style.backgroundColor = "#2ecc71";
            }
        }

        // 2. MOSTRA IL NUOVO BOX BANCARIO
        const bankBox = document.getElementById('bank-details-box');
        if (bankBox) {
            bankBox.style.display = 'block';
            // Animazione carina di entrata
            bankBox.classList.add('fade-in-up');
        }
    }

    function setVal(id, val) {
        const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
        if (el && val !== null && val !== undefined) el.value = val;
    }

    // --- 5. CALCOLI ---
    function calculateTotal() {
        const selectedRadio = document.querySelector('input[name="package"]:checked');
        if (selectedRadio) {
            currentBasePrice = parseInt(selectedRadio.dataset.price) || 0;
            currentPkgName = selectedRadio.value;
        }

        const nights = parseInt(document.getElementById('extraNights').value) || 0;
        const nightsCost = nights * NIGHT_PRICE;

        let subTotal = currentBasePrice + nightsCost;
        const currentType = hiddenTypeInput ? hiddenTypeInput.value : 'couple';

        let multiplier = 1;
        if (currentType === 'couple') multiplier = 2;

        currentGrandTotal = subTotal * multiplier;

        // UI Update
        if (summaryPkgName) summaryPkgName.innerText = currentPkgName.toUpperCase() + (multiplier === 2 ? " (x2)" : "");
        if (summaryPkgPrice) summaryPkgPrice.innerText = "€ " + (currentBasePrice * multiplier);
        if (summaryNightCount) summaryNightCount.innerText = nights;
        if (summaryNightTotal) summaryNightTotal.innerText = "€ " + (nightsCost * multiplier);
        if (summaryTotal) summaryTotal.innerText = "€ " + currentGrandTotal;

        // Modal Updates
        if (modalTotal) modalTotal.innerText = "€ " + currentGrandTotal;
        if (modalPkgName) modalPkgName.innerText = currentPkgName.toUpperCase() + (multiplier === 2 ? " (Couple)" : " (Single)");
    }

    radioPackages.forEach(radio => radio.addEventListener('change', calculateTotal));

    // --- 6. SUBMIT PRINCIPALE ---
    if (entryForm) {
        entryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!entryForm.checkValidity()) { entryForm.reportValidity(); return; }

            // Se è già completo, è solo un UPDATE
            if (isRegistrationComplete) {
                await updateOnlyInfo();
            } else {
                // Se è nuovo, apri modale Bonifico
                if (paymentModal) paymentModal.style.display = 'flex';
            }
        });
    }

    // --- 7. CONFERMA BONIFICO (Salva e entra in modalità modifica) ---
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payBtn = paymentForm.querySelector('button');
            const originalText = payBtn.innerText;
            payBtn.disabled = true; payBtn.innerHTML = 'Processing...';

            try {
                const { data: { session } } = await window.supabase.auth.getSession();
                const userId = session ? session.user.id : null;

                const formData = getFormData();

                // Salviamo come 'pending' nel DB perché è un bonifico
                // Ma per l'utente sembrerà completato
                const supabaseData = {
                    ...formData,
                    user_id: userId,
                    payment_status: 'pending', // Pending verifica admin
                    created_at: new Date()
                };

                // 1. Inserisci o Aggiorna nel DB
                let result;
                if (existingRecordId) {
                    result = await window.supabase.from('registrations').update(supabaseData).eq('id', existingRecordId).select();
                } else {
                    result = await window.supabase.from('registrations').insert([supabaseData]).select();
                }

                if (result.error) throw result.error;

                // Aggiorna ID se era nuovo inserimento
                if (result.data && result.data.length > 0) {
                    existingRecordId = result.data[0].id;
                }

                // 2. Invia Email
                if (window.sendEntryEmail) {
                    await window.sendEntryEmail(supabaseData);
                }

                // 3. UI Successo
                paymentModal.style.display = 'none';
                showSuccess("Registration Confirmed!", "Thank you. We have received your data.");

                // 4. ATTIVA MODALITÀ MODIFICA
                isRegistrationComplete = true;
                applyCompleteVisuals();
                const changeBox = document.getElementById('change-type-box');
                if (changeBox) changeBox.style.display = 'none';

            } catch (err) {
                console.error(err);
                alert('Error: ' + err.message);
            } finally {
                payBtn.disabled = false;
                payBtn.innerText = originalText;
            }
        });
    }

    // Funzione Update Solo Info (Modalità Modifica)
    async function updateOnlyInfo() {
        mainBtn.disabled = true; mainBtn.innerText = "Updating...";
        try {
            const updates = getFormData();
            // Manteniamo lo stato pagamento esistente, aggiorniamo solo info
            const { error } = await window.supabase.from('registrations').update(updates).eq('id', existingRecordId);
            if (error) throw error;
            showSuccess("Success!", "Information updated successfully.");
        } catch (err) { alert("Error: " + err.message); }
        finally { mainBtn.disabled = false; mainBtn.innerText = "UPDATE INFORMATION"; }
    }

    // --- HELPER ---
    // --- HELPER: getFormData ---
    function getFormData() {
        const type = hiddenTypeInput.value;
        let manN = getValue('manName');
        let manS = getValue('manSurname');
        let womN = getValue('femaleName');
        let womS = getValue('femaleSurname');

        let fullName = "";
        if (type === 'couple') fullName = `${manN} ${manS} & ${womN} ${womS}`;
        else if (type === 'man') { fullName = `${manN} ${manS}`; womN = ''; womS = ''; }
        else if (type === 'woman') { fullName = `${womN} ${womS}`; manN = ''; manS = ''; }

        return {
            full_name: fullName,
            man_name: manN,
            man_surname: manS,
            woman_name: womN,
            woman_surname: womS,
            country: getValue('country'),
            teacher: getValue('teacherName'),
            age_group: getValue('ageGroup'),
            phone: getValue('phone'),

            // --- CORREZIONE QUI SOTTO ---
            // Ho rimosso "email: getValue('email')," che causava l'errore.
            // Lasciamo solo user_email che è il nome giusto della colonna nel DB.
            user_email: getValue('email'),

            package: currentPkgName,
            extra_nights: parseInt(document.getElementById('extraNights').value) || 0,
            arrival_date: getValue('arrivalDate') || null,
            arrival_time: getValue('arrivalTime') || null,
            departure_date: getValue('departureDate') || null,
            departure_time: getValue('departureTime') || null,
            total_amount: currentGrandTotal
        };
    }

    function getValue(id) { const el = document.getElementById(id); return el ? el.value : ''; }

    function showSuccess(title, msg) {
        if (!successModal) { alert(msg); return; }
        const h3 = successModal.querySelector('h3');
        const p = successModal.querySelector('p');
        if (h3) h3.innerText = title;
        if (p) p.innerText = msg;
        successModal.style.display = 'flex';
    }

    // UI Listeners
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => { paymentModal.style.display = 'none'; });
    if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', () => { successModal.style.display = 'none'; });
    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) paymentModal.style.display = 'none';
        if (e.target === successModal) successModal.style.display = 'none';
    });

    // Back Button
    const backBtn = document.getElementById('btnBackToStep1');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (isRegistrationComplete) return;
            document.getElementById('entryForm').style.display = 'none';
            const step1 = document.getElementById('step-1-selection');
            step1.style.display = 'block';
            step1.classList.remove('fade-in-up');
            void step1.offsetWidth;
            step1.classList.add('fade-in-up');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Init
    calculateTotal();
    checkExistingRegistration();
});