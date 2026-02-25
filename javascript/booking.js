// ============================================================
// FILE: js/booking.js - COMPLETE VERSION (Auth + 48h Rule + Emails)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {

    // --- 0. PROTEZIONE PAGINA (CUSTOM MODAL) ---
    // Blocca tutto immediatamente se l'utente non è loggato
    await checkAuthProtection();

    // DOM ELEMENTS
    const loader = document.getElementById('access-loader');
    const accessDeniedBox = document.getElementById('access-denied-box');
    const bookingMainContent = document.getElementById('booking-main-content');

    // Form Elements
    const bookingFormArea = document.querySelector('.booking-form-area');
    const teacherSelect = document.getElementById('teacherSelect');
    const datesContainer = document.getElementById('dates-container');
    const dateGroup = document.getElementById('dateGroup');
    const timeGroup = document.getElementById('timeGroup');
    const slotsContainer = document.getElementById('slots-container');
    const confirmBtn = document.getElementById('btn-confirm-booking');

    // List Elements
    const myBookingsList = document.getElementById('my-bookings-list');
    const grandTotalDisplay = document.getElementById('grand-total-display');

    // Modal Elements (Generic Alert/Confirm)
    const modalOverlay = document.getElementById('custom-modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const btnConfirm = document.getElementById('modal-btn-confirm');
    const btnCancel = document.getElementById('modal-btn-cancel');

    // STATE VARIABLES
    let currentUser = null;
    let selectedTeacherId = null;
    let selectedTeacherPrice = 0;
    let selectedDate = null;
    let selectedTime = null;
    let modifyingBookingId = null;

    // ============================================================
    // 0.1 AUTH CHECKER (MODALE BLOCCANTE)
    // ============================================================
    async function checkAuthProtection() {
        const { data: { session } } = await window.supabase.auth.getSession();

        if (!session) {
            // Riferimenti al modale di blocco (quello in fondo all'HTML)
            const modal = document.getElementById('custom-modal');
            const btnOk = document.getElementById('modal-btn-ok');
            const btnCancel = document.getElementById('modal-btn-cancel');
            const title = document.getElementById('modal-title');
            const msg = document.getElementById('modal-message');

            // Nascondi il loader standard se presente
            const l = document.getElementById('access-loader');
            if (l) l.style.display = 'none';

            if (modal) {
                if (title) title.innerText = "Login Required";
                if (msg) msg.innerText = "You must be logged in to book a private lesson.";

                // Nascondi tasto Annulla (Login obbligatorio)
                if (btnCancel) btnCancel.style.display = 'none';

                // Configura tasto Login
                if (btnOk) {
                    btnOk.innerText = "GO TO LOGIN";
                    btnOk.onclick = () => {
                        window.location.href = 'login.html';
                    };
                }
                modal.style.display = 'flex';
            } else {
                window.location.href = 'login.html';
            }

            throw new Error("Stop Script: User not logged in");
        }
    }

    // ============================================================
    // 1. HELPER: SHOW MODAL (ALERT/CONFIRM DINAMICO)
    // ============================================================
    function showModal(message, type = 'alert', title = 'Notice') {
        return new Promise((resolve) => {
            if (!modalOverlay) {
                if (type === 'confirm') {
                    const result = confirm(message);
                    resolve(result);
                } else {
                    alert(message);
                    resolve(true);
                }
                return;
            }

            modalTitle.innerText = title;
            modalMessage.innerText = message;
            modalOverlay.style.display = 'flex';

            if (type === 'alert') {
                btnCancel.style.display = 'none';
                btnConfirm.innerText = "OK";
            } else {
                btnCancel.style.display = 'block';
                btnConfirm.innerText = "Confirm";
                btnCancel.innerText = "Cancel";
            }

            const newConfirm = btnConfirm.cloneNode(true);
            const newCancel = btnCancel.cloneNode(true);
            btnConfirm.parentNode.replaceChild(newConfirm, btnConfirm);
            btnCancel.parentNode.replaceChild(newCancel, btnCancel);

            newConfirm.onclick = () => {
                modalOverlay.style.display = 'none';
                resolve(true);
            };
            newCancel.onclick = () => {
                modalOverlay.style.display = 'none';
                resolve(false);
            };
        });
    }

    // ============================================================
    // 2. CHECK REGISTRATION ACCESS
    // ============================================================
    async function checkAccess() {
        try {
            const { data: { session }, error } = await window.supabase.auth.getSession();
            if (loader) loader.style.display = 'none';

            if (error || !session) return; // Gestito da checkAuthProtection

            currentUser = session.user;

            // Controllo se ha compilato il form (registrazione)
            const { data: regData } = await window.supabase
                .from('registrations')
                .select('id')
                .eq('user_id', currentUser.id)
                .maybeSingle();

            if (!regData) {
                if (bookingMainContent) bookingMainContent.style.display = 'none';
                if (accessDeniedBox) accessDeniedBox.style.display = 'block';
                return;
            }

            // Accesso consentito (base)
            if (accessDeniedBox) accessDeniedBox.style.display = 'none';
            if (bookingMainContent) bookingMainContent.style.display = 'block';

            // Check Settings
            const { data: setting } = await window.supabase
                .from('site_settings')
                .select('value')
                .eq('key', 'book_lesson')
                .maybeSingle();

            const isBookDisabled = setting && (setting.value === false || setting.value === 'false');

            if (isBookDisabled) {
                // Nascondi IL FORM DI PRENOTAZIONE, ma lascia la lista
                const formArea = document.querySelector('.booking-form-area');
                if (formArea) {
                    formArea.style.display = 'none';

                    // Inserisci messaggio "CHIUSO" al posto del form
                    const msgDiv = document.createElement('div');
                    msgDiv.innerHTML = `
                        <div style="text-align:center; padding: 40px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-bottom: 30px;">
                            <div style="font-size: 2rem; color: #e74c3c; margin-bottom: 10px;"><i class="fas fa-lock"></i></div>
                            <h3 style="color: white;">BOOKING CLOSED</h3>
                            <p style="color: #aaa;">Lesson booking is currently disabled. You can still view your scheduled lessons below.</p>
                        </div>
                    `;
                    formArea.parentNode.insertBefore(msgDiv, formArea);
                }
            } else {
                // Se aperto, carica i teachers
                loadTeachers();
            }

            // SEMPRE caricare le mie prenotazioni (anche se chiuso)
            loadMyBookings();

        } catch (err) {
            console.error("Errore checkAccess:", err);
            if (loader) loader.style.display = 'none';
        }
    }

    // ============================================================
    // 3. BOOKING LOGIC (TEACHERS & SLOTS)
    // ============================================================
    async function loadTeachers() {
        const { data: teachers } = await window.supabase
            .from('teachers')
            .select('*')
            .eq('is_active', true)
            .order('full_name');

        if (teacherSelect) {
            teacherSelect.innerHTML = '<option value="" disabled selected>Select a Teacher...</option>';
            if (teachers) {
                teachers.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    opt.textContent = t.full_name;
                    opt.dataset.price = t.base_price;
                    teacherSelect.appendChild(opt);
                });
            }
        }
    }

    if (teacherSelect) {
        teacherSelect.addEventListener('change', async (e) => {
            selectedTeacherId = e.target.value;
            selectedTeacherPrice = parseFloat(e.target.selectedOptions[0].dataset.price);

            if (!modifyingBookingId) {
                selectedDate = null;
                selectedTime = null;
            }
            confirmBtn.style.display = 'none';

            dateGroup.style.opacity = '1';
            dateGroup.style.pointerEvents = 'all';
            datesContainer.innerHTML = '<div class="slot-placeholder">Loading dates...</div>';

            timeGroup.style.opacity = '0.5';
            timeGroup.style.pointerEvents = 'none';
            slotsContainer.innerHTML = '<div class="slot-placeholder">Select a date first</div>';

            const { data: availabilities } = await window.supabase
                .from('teacher_availability')
                .select('available_date')
                .eq('teacher_id', selectedTeacherId)
                .order('available_date', { ascending: true });

            if (!availabilities || availabilities.length === 0) {
                datesContainer.innerHTML = '<div class="slot-placeholder" style="color:red">No dates available.</div>';
                return;
            }

            const uniqueDates = [...new Set(availabilities.map(item => item.available_date))];

            datesContainer.innerHTML = '';
            uniqueDates.forEach(dateStr => {
                const btn = document.createElement('div');
                btn.className = 'date-btn';
                btn.textContent = formatDateNice(dateStr);

                if (modifyingBookingId && dateStr === selectedDate) {
                    btn.classList.add('selected');
                    selectDate(btn, dateStr, true);
                }

                btn.onclick = () => selectDate(btn, dateStr);
                datesContainer.appendChild(btn);
            });
        });
    }

    async function selectDate(btn, dateStr, autoSelect = false) {
        document.querySelectorAll('.date-btn').forEach(el => el.classList.remove('selected'));
        if (btn) btn.classList.add('selected');

        selectedDate = dateStr;
        if (!autoSelect) selectedTime = null;

        confirmBtn.style.display = 'none';

        timeGroup.style.opacity = '1';
        timeGroup.style.pointerEvents = 'all';
        slotsContainer.innerHTML = '<div class="slot-placeholder">Loading slots...</div>';

        const { data: shifts } = await window.supabase
            .from('teacher_availability')
            .select('*')
            .eq('teacher_id', selectedTeacherId)
            .eq('available_date', dateStr);

        let query = window.supabase
            .from('bookings')
            .select('id, start_time, end_time') // Recupera anche end_time per check durata
            .eq('teacher_id', selectedTeacherId)
            .eq('lesson_date', dateStr)
            .neq('status', 'cancelled');

        const { data: takenSlots } = await query;

        // Filtra quella in modifica
        const takenBookings = takenSlots.filter(b => b.id !== modifyingBookingId);

        slotsContainer.innerHTML = '';
        if (shifts.length === 0) {
            slotsContainer.innerHTML = 'No slots.';
            return;
        }

        shifts.forEach(shift => {
            generateTimeSlots(shift.start_hour, shift.end_hour, takenBookings);
        });
    }

    function generateTimeSlots(startStr, endStr, takenBookings) {
        let current = timeToMins(startStr);
        const shiftEnd = timeToMins(endStr);
        const duration = 45;

        while (current + duration <= shiftEnd) {
            const timeString = minsToTime(current);
            const slotStart = current;
            const slotEnd = current + duration;

            // Check Sovrapposizione Reale (inclusi 90 min lectures)
            const isTaken = takenBookings.some(b => {
                const bStart = timeToMins(b.start_time);
                const bEnd = timeToMins(b.end_time);
                // Overlap: (InizioSlot < FineBooking) AND (FineSlot > InizioBooking)
                return slotStart < bEnd && slotEnd > bStart;
            });

            const btn = document.createElement('div');
            btn.className = 'time-slot';
            btn.textContent = timeString;

            if (isTaken) {
                btn.classList.add('taken');
            } else {
                if (modifyingBookingId && timeString === selectedTime.substring(0, 5) + ":00") {
                    btn.classList.add('selected');
                    confirmBtn.style.display = 'block';
                    document.getElementById('price-preview').textContent = selectedTeacherPrice;
                }
                btn.onclick = () => selectSlot(btn, timeString);
            }
            slotsContainer.appendChild(btn);
            current += duration;
        }
    }

    function selectSlot(btn, time) {
        document.querySelectorAll('.time-slot.selected').forEach(el => el.classList.remove('selected'));
        btn.classList.add('selected');
        selectedTime = time;

        confirmBtn.style.display = 'block';
        confirmBtn.innerHTML = modifyingBookingId ?
            `UPDATE BOOKING (€ <span id="price-preview">${selectedTeacherPrice}</span>)` :
            `CONFIRM BOOKING (€ <span id="price-preview">${selectedTeacherPrice}</span>)`;
    }

    // --- PULSANTE CONFERMA (CON EMAIL) ---
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const originalText = confirmBtn.innerText;
            confirmBtn.disabled = true;
            confirmBtn.innerText = "Processing...";

            const startMins = timeToMins(selectedTime);
            const endTime = minsToTime(startMins + 45);
            let result;

            if (modifyingBookingId) {
                // UPDATE
                result = await window.supabase
                    .from('bookings')
                    .update({
                        teacher_id: selectedTeacherId,
                        lesson_date: selectedDate,
                        start_time: selectedTime,
                        end_time: endTime,
                        lesson_price: selectedTeacherPrice,
                        admin_notes: "Modified by User"
                    })
                    .eq('id', modifyingBookingId);
            } else {
                // INSERT
                result = await window.supabase
                    .from('bookings')
                    .insert({
                        user_id: currentUser.id,
                        teacher_id: selectedTeacherId,
                        lesson_date: selectedDate,
                        start_time: selectedTime,
                        end_time: endTime,
                        lesson_price: selectedTeacherPrice
                    });
            }

            if (result.error) {
                await showModal("Error: " + result.error.message, 'alert', 'Error');
            } else {
                // 1. EMAIL
                const teacherName = teacherSelect.options[teacherSelect.selectedIndex].text;
                const actionText = modifyingBookingId ? "LESSON MODIFIED" : "BOOKING CONFIRMED";

                await sendEmailNotification(
                    actionText,
                    {
                        teacher_name: teacherName,
                        lesson_date: selectedDate,
                        lesson_time: selectedTime,
                        price: selectedTeacherPrice
                    },
                    currentUser.email,
                    "Dancer"
                );

                // 2. SUCCESS
                await showModal(
                    modifyingBookingId ? "Lesson Updated Successfully!" : "Lesson Booked Successfully!",
                    'alert',
                    'Success'
                );

                resetForm();
                loadMyBookings();
            }
            confirmBtn.disabled = false;
            confirmBtn.innerText = originalText;
        });
    }

    // ============================================================
    // 4. MY BOOKINGS LIST (CON BLOCCO 48H)
    // ============================================================
    async function loadMyBookings() {
        if (!myBookingsList) return;

        const { data: bookings } = await window.supabase
            .from('bookings')
            .select('*, teachers(full_name)')
            .eq('user_id', currentUser.id)
            .order('lesson_date', { ascending: true });

        myBookingsList.innerHTML = '';
        let total = 0;

        if (!bookings || bookings.length === 0) {
            myBookingsList.innerHTML = '<p style="text-align: center; opacity: 0.6; width:100%; padding: 20px;">No lessons booked yet.</p>';
        } else {
            bookings.forEach(b => {
                // Se non cancellato, somma al totale
                if (b.status !== 'cancelled') total += b.lesson_price;

                // --- GESTIONE CARD CANCELLATA ---
                if (b.status === 'cancelled') {
                    myBookingsList.innerHTML += `
                        <div class="booking-item cancelled" style="opacity:0.5; border:1px solid #333; position:relative;">
                            <h4>${b.teachers.full_name} <span style="color:red; font-size:0.8rem;">(CANCELLED)</span></h4>
                            <div class="details">
                                <i class="far fa-calendar"></i> ${formatDateNice(b.lesson_date)} <br>
                                <i class="far fa-clock"></i> ${b.start_time.substring(0, 5)}
                            </div>
                        </div>`;
                    return;
                }

                // --- LOGICA 48 ORE ---
                const canEdit = isEditable(b.lesson_date, b.start_time);
                let actionButtons = '';

                if (canEdit) {
                    // Pulsanti Attivi
                    actionButtons = `
                        <button class="btn-action-small" onclick="startModifyBooking(${b.id}, ${b.teacher_id}, '${b.lesson_date}', '${b.start_time}')" title="Modify">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-action-small delete" onclick="cancelBooking(${b.id})" title="Cancel">
                            <i class="fas fa-trash"></i> Cancel
                        </button>`;
                } else {
                    // Pulsanti Bloccati
                    actionButtons = `
                        <div style="display:flex; align-items:center; gap:5px; color:#777;">
                            <i class="fas fa-lock"></i> <span style="font-size:0.75rem;">Locked (< 48h)</span>
                            <button class="btn-action-small" disabled style="opacity:0.3; cursor:not-allowed;"><i class="fas fa-edit"></i></button>
                            <button class="btn-action-small" disabled style="opacity:0.3; cursor:not-allowed;"><i class="fas fa-trash"></i></button>
                        </div>`;
                }

                // --- RENDER CARD ATTIVA ---
                myBookingsList.innerHTML += `
                    <div class="booking-item">
                        <h4>${b.teachers.full_name}</h4>
                        <div class="details">
                            <i class="far fa-calendar"></i> ${formatDateNice(b.lesson_date)} <br>
                            <i class="far fa-clock"></i> ${b.start_time.substring(0, 5)} - ${b.end_time.substring(0, 5)}
                        </div>
                        <div class="price">€ ${b.lesson_price}</div>
                        
                        <div class="booking-actions" style="margin-top:10px; display:flex; justify-content:flex-end; gap:10px;">
                            ${actionButtons}
                        </div>
                    </div>`;
            });
        }
        if (grandTotalDisplay) grandTotalDisplay.textContent = "€ " + total;
    }

    // --- HELPER 48 ORE ---
    function isEditable(dateStr, timeStr) {
        const lessonDate = new Date(`${dateStr}T${timeStr}`);
        const now = new Date();
        const diffMs = lessonDate - now;
        const hours48 = 48 * 60 * 60 * 1000;
        return diffMs > hours48;
    }

    // ============================================================
    // 5. MODIFY & CANCEL ACTIONS
    // ============================================================
    window.startModifyBooking = async (id, teacherId, date, startTime) => {
        // Doppio controllo (anche se UI è bloccata, blocchiamo via JS)
        if (!isEditable(date, startTime)) {
            await showModal("Cannot modify: Lesson is in less than 48 hours.", 'alert', 'Locked');
            return;
        }

        await showModal("You are modifying a lesson.\nPlease select a new date/time above.", 'alert', 'Modify Lesson');

        modifyingBookingId = id;
        selectedDate = date;
        selectedTime = startTime;

        bookingFormArea.scrollIntoView({ behavior: 'smooth' });
        bookingFormArea.style.border = "2px solid #ff9f43";
        const formH3 = document.querySelector('.booking-form-area h3');
        if (formH3) formH3.innerHTML = `<i class="fas fa-edit"></i> Modify Lesson`;

        teacherSelect.value = teacherId;
        teacherSelect.dispatchEvent(new Event('change'));
    };

    window.cancelBooking = async (id) => {
        // Nota: Qui servirebbe recuperare la data della lezione per controllare le 48h, 
        // ma ci fidiamo della UI che nasconde il tasto. Per sicurezza suprema bisognerebbe
        // fare una fetch su booking ID e ricontrollare. 

        const userConfirmed = await showModal("Are you sure you want to cancel this lesson?", 'confirm', 'Warning');
        if (!userConfirmed) return;

        // Fetch per dati email e check sicurezza
        const { data: bookingData } = await window.supabase
            .from('bookings')
            .select('*, teachers(full_name)')
            .eq('id', id)
            .single();

        if (bookingData) {
            if (!isEditable(bookingData.lesson_date, bookingData.start_time)) {
                await showModal("Too late to cancel (< 48h).", 'alert', 'Error');
                return;
            }
        }

        // Cancel
        await window.supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);

        // Email
        if (bookingData) {
            await sendEmailNotification(
                "BOOKING CANCELLED",
                {
                    teacher_name: bookingData.teachers.full_name,
                    lesson_date: bookingData.lesson_date,
                    lesson_time: bookingData.start_time,
                    price: bookingData.lesson_price
                },
                currentUser.email,
                "Dancer"
            );
        }

        if (modifyingBookingId === id) resetForm();
        loadMyBookings();
    };

    function resetForm() {
        modifyingBookingId = null;
        selectedDate = null;
        selectedTime = null;

        bookingFormArea.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        const formH3 = document.querySelector('.booking-form-area h3');
        if (formH3) formH3.innerHTML = `<i class="far fa-calendar-alt"></i> New Booking`;

        teacherSelect.value = "";
        slotsContainer.innerHTML = '<div class="slot-placeholder">Select a date</div>';
        datesContainer.innerHTML = '<div class="slot-placeholder">Select teacher first</div>';
        timeGroup.style.opacity = '0.5';
        dateGroup.style.opacity = '0.5';
        confirmBtn.style.display = 'none';
    }

    // ==========================================
    // 6. EMAILJS & UTILS
    // ==========================================
    async function sendEmailNotification(type, bookingData, userEmail, userName) {
        const templateParams = {
            to_email: userEmail,
            user_name: userName,
            action_type: type,
            teacher_name: bookingData.teacher_name,
            lesson_date: bookingData.lesson_date,
            lesson_time: bookingData.lesson_time,
            price: bookingData.price
        };
        try {
            const SERVICE_ID = "service_fik9j1g";
            const TEMPLATE_ID = "template_szh5dao";
            if (typeof emailjs !== 'undefined') await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
        } catch (error) { console.error("EmailJS Error:", error); }
    }

    function timeToMins(t) { if (!t) return 0; const [h, m] = t.split(':'); return h * 60 + +m; }
    function minsToTime(mins) { return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`; }
    function formatDateNice(dateStr) { const date = new Date(dateStr); return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }); }

    // AVVIA
    checkAccess();

});