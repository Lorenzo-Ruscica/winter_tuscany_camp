// ============================================================
// FILE: js/admin.js - COMPLETE VERSION (With Delete Entry)
// ============================================================

// 1. VARIABILI GLOBALI
let teacherSelectAvail;
let teacherSelectPrint;

document.addEventListener('DOMContentLoaded', async () => {

    // --- A. CONTROLLO SICUREZZA (WHITELIST) ---
    const { data: { session } } = await window.supabase.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // LISTA EMAIL AMMINISTRATORI
    const allowedAdmins = [
        'admin@tuscanycamp.com',
        'mirko@gozzoli.com',
        'lorenzo.ruscica@outlook.it'
    ];

    const userEmail = session.user.email;

    if (!allowedAdmins.includes(userEmail)) {
        alert("ACCESSO NEGATO: Non sei un amministratore autorizzato.");
        window.location.href = 'index.html';
        return;
    }

    console.log("Admin loggato:", userEmail);

    // --- B. INIZIALIZZAZIONE ELEMENTI ---
    teacherSelectAvail = document.getElementById('avail-teacher');
    teacherSelectPrint = document.getElementById('print-teacher');

    // --- C. CARICAMENTO DATI INIZIALI ---
    loadTeachers();
    loadActiveShifts();
});

// ============================================================
// 2. FUNZIONI GLOBALI
// ============================================================

// --- GESTIONE TAB ---
// --- GESTIONE TAB CLASSICHE (Dashboard) ---
window.showTab = (tabId) => {
    // A. Gestione Sezioni Principali
    const dashboardSection = document.getElementById('section-dashboard');
    const timerSection = document.getElementById('section-timer');

    // Mostra Dashboard, Nascondi Timer
    if (dashboardSection) dashboardSection.style.display = 'block';
    if (timerSection) timerSection.style.display = 'none';

    // B. Gestione Bottoni Menu Laterale
    // Rimuove 'active' da TUTTI i bottoni
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    // Aggiunge 'active' al bottone cliccato
    // (Usa event.currentTarget perché l'onclick è inline nell'HTML)
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    // C. Gestione Contenuto Tab
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const tab = document.getElementById('tab-' + tabId);
    if (tab) tab.classList.add('active');

    // D. Caricamento Dati Specifici
    if (tabId === 'accounting') loadAllBookings();
    if (tabId === 'messages') loadMessages();
    if (tabId === 'registrations') loadRegistrations();
    if (tabId === 'teachers-mgmt') loadTeachersList();
    if (tabId === 'users-system') loadSystemUsers();
    if (tabId === 'settings') loadGlobalSettings();
    if (tabId === 'availability') {
        loadActiveShifts();
        loadSpecialBookings();
    }
    if (tabId === 'balances') loadBalances();
    if (tabId === 'guest-teachers') loadGuestTeachersSettings();
    if (tabId === 'pdf-mgmt') loadPDFSettings();
};

// --- LOGOUT ---
window.logout = async () => {
    await window.supabase.auth.signOut();
    window.location.href = 'index.html';
};

// --- GESTIONE DISPONIBILITÀ ---
window.loadTeachers = async () => {
    const { data: teachers } = await window.supabase.from('teachers').select('*').order('full_name');
    if (!teachers) return;

    let html = '<option value="">Seleziona...</option>';
    teachers.forEach(t => {
        html += `<option value="${t.id}">${t.full_name}</option>`;
    });

    if (teacherSelectAvail) teacherSelectAvail.innerHTML = html;
    if (teacherSelectPrint) teacherSelectPrint.innerHTML = html;

    const specialSelect = document.getElementById('special-teacher');
    if (specialSelect) specialSelect.innerHTML = html;
};

window.addAvailability = async () => {
    const teacherId = teacherSelectAvail.value;
    const date = document.getElementById('avail-date').value;
    const start = document.getElementById('avail-start').value;
    const end = document.getElementById('avail-end').value;

    if (!teacherId || !date) return alert("Compila tutti i campi");

    const { error } = await window.supabase.from('teacher_availability').insert({
        teacher_id: teacherId, available_date: date, start_hour: start, end_hour: end
    });

    if (error) alert("Errore: " + error.message);
    else { alert("Turno aggiunto!"); loadActiveShifts(); }
};

window.addSpecialBooking = async () => {
    const teacherId = document.getElementById('special-teacher').value;
    const date = document.getElementById('special-date').value;
    const startStr = document.getElementById('special-start').value;
    const duration = parseInt(document.getElementById('special-duration').value) || 45;
    const type = document.getElementById('special-type').value;
    const pay = document.getElementById('special-pay').value;

    if (!teacherId || !date || !startStr) return alert("Compila i campi obbligatori");

    // 1. Calcola Tempi (minuti)
    const startMin = timeToMinutes(startStr);
    const endMin = startMin + duration;
    const startObj = new Date(); startObj.setHours(Math.floor(startMin / 60), startMin % 60, 0); const fullStartTime = `${String(startObj.getHours()).padStart(2, '0')}:${String(startObj.getMinutes()).padStart(2, '0')}:00`;
    const endObj = new Date(); endObj.setHours(Math.floor(endMin / 60), endMin % 60, 0); const fullEndTime = `${String(endObj.getHours()).padStart(2, '0')}:${String(endObj.getMinutes()).padStart(2, '0')}:00`;

    // 2. Fetch Disponibilità
    const { data: availabilities } = await window.supabase
        .from('teacher_availability')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('available_date', date);

    if (!availabilities || availabilities.length === 0) {
        return alert("Questo insegnante non ha disponibilità per questa data.");
    }

    // 3. Controlla se rientra in un blocco
    let fitsInBlock = false;
    availabilities.forEach(block => {
        const blockStart = timeToMinutes(block.start_hour);
        const blockEnd = timeToMinutes(block.end_hour);
        if (startMin >= blockStart && endMin <= blockEnd) fitsInBlock = true;
    });

    if (!fitsInBlock) {
        return alert("Orario non valido: deve rientrare nelle disponibilità (Turni) dell'insegnante.");
    }

    // 4. Controlla sovrapposizioni con altre lezioni (Bookings)
    const { data: conflicts } = await window.supabase
        .from('bookings')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('lesson_date', date)
        .neq('status', 'cancelled');

    let isConflict = false;
    if (conflicts) {
        conflicts.forEach(b => {
            const bStart = timeToMinutes(b.start_time);
            const bEnd = timeToMinutes(b.end_time);
            // Logica sovrapposizione: (StartA < EndB) && (EndA > StartB)
            if (startMin < bEnd && endMin > bStart) isConflict = true;
        });
    }

    if (isConflict) {
        return alert("Errore: Orario sovrapposto a un'altra prenotazione esistente.");
    }

    // 5. Inserisci
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) return alert("Sessione scaduta.");

    const { error } = await window.supabase.from('bookings').insert({
        user_id: session.user.id,
        teacher_id: teacherId,
        lesson_date: date,
        start_time: fullStartTime,
        end_time: fullEndTime,
        lesson_price: 0,
        admin_notes: type + " (Admin)",
        staff_pay: pay ? parseFloat(pay) : null, // Override Paga Staff
        lesson_type: type.toLowerCase(), // 'lecture' or 'group lesson'
        status: 'confirmed'
    });

    if (error) alert("Errore DB: " + error.message);
    else {
        alert("Slot bloccato con successo!");
        // loadAllBookings(); // Opzionale
    }
};

window.loadActiveShifts = async () => {
    const { data: shifts } = await window.supabase
        .from('teacher_availability')
        .select('*, teachers(full_name)')
        .order('available_date', { ascending: true })
        .limit(20);

    const list = document.getElementById('avail-list');
    if (list) {
        list.innerHTML = '';
        if (shifts) {
            shifts.forEach(s => {
                list.innerHTML += `
                    <div class="shift-card">
                        <strong>${s.teachers.full_name}</strong><br>
                        ${s.available_date}<br>${s.start_hour.slice(0, 5)} - ${s.end_hour.slice(0, 5)}
                        <button class="btn-delete-mini" onclick="deleteShift(${s.id})">&times;</button>
                    </div>`;
            });
        }
    }
};

window.deleteShift = async (id) => {
    if (!confirm("Eliminare turno?")) return;
    await window.supabase.from('teacher_availability').delete().eq('id', id);
    loadActiveShifts();
};

// --- STAMPA E PDF ---
window.loadSchedule = async () => {
    const teacherId = teacherSelectPrint.value;
    const date = document.getElementById('print-date').value;

    if (!teacherId || !date) return;

    const teacherName = teacherSelectPrint.options[teacherSelectPrint.selectedIndex].text;
    document.getElementById('sheet-teacher-name').innerText = teacherName;
    document.getElementById('sheet-date').innerText = "Data: " + date.split('-').reverse().join('/');

    const { data: bookings, error } = await window.supabase
        .from('bookings')
        .select('*, registrations(full_name)')
        .eq('teacher_id', teacherId)
        .eq('lesson_date', date)
        .neq('status', 'cancelled')
        .order('start_time');

    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = '';

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Nessuna lezione.</td></tr>';
        return;
    }

    bookings.forEach(b => {
        let coupleName = "Utente non trovato";
        if (b.registrations && b.registrations.full_name) coupleName = b.registrations.full_name;
        else if (b.user_id) coupleName = "ID: " + b.user_id.slice(0, 5);

        tbody.innerHTML += `
            <tr>
                <td>${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)}</td>
                <td><strong>${coupleName}</strong></td>
                <td>${b.admin_notes || 'Sala A'}</td> 
                <td></td>
            </tr>`;
    });
};

window.downloadPDF = () => {
    if (typeof html2pdf === 'undefined') {
        return alert("Libreria PDF non caricata.");
    }

    const element = document.getElementById('print-area');
    const teacherName = document.getElementById('sheet-teacher-name').innerText;

    if (teacherName === "Nome Insegnante") return alert("Seleziona prima un piano da stampare.");

    const safeName = teacherName.replace(/[^a-zA-Z0-9]/g, '_');
    const opt = {
        margin: 0.3,
        filename: `Schedule_${safeName}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().catch(err => alert("Errore PDF: " + err.message));
};

// --- CONTABILITÀ E MODIFICA (EDIT) ---
let currentBookings = [];

window.loadAllBookings = async () => {
    const { data: bookings } = await window.supabase
        .from('bookings')
        .select('*, teachers(full_name, pay_rate), registrations(full_name)')
        .order('created_at', { ascending: false })
        .limit(100); // Aumentato limit per ricerca migliore

    currentBookings = bookings || [];
    applyBookingFilter();
};

window.searchBookings = () => {
    applyBookingFilter();
};

function applyBookingFilter() {
    const input = document.getElementById('search-booking');
    const term = input ? input.value.toLowerCase() : '';

    const filtered = currentBookings.filter(b => {
        const teacherName = b.teachers?.full_name?.toLowerCase() || '';
        const userName = b.registrations?.full_name?.toLowerCase() || '';
        return teacherName.includes(term) || userName.includes(term);
    });

    // Filtra: Contabilità mostra solo lezioni private (Standard)
    const standardBookings = filtered.filter(b => !b.lesson_type || b.lesson_type === 'private');

    // Render
    renderAccountingTable(standardBookings);
    updateTeacherHours(filtered); // Conta tutte le lezioni (anche speciali) nel numero totale
    updateUserTotals(standardBookings); // I totali utenti considerano solo le private
    updateStaffPay(filtered); // La paga staff considera tutto
}

// ==========================================
// GESTIONE PAGAMENTI / SALDI
// ==========================================
window.__unpaidIdsData = {};

window.loadBalances = async () => {
    const tbody = document.getElementById('balances-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Caricamento...</td></tr>';

    try {
        // 1. Carica lezioni già saldate da site_settings
        const { data: settings } = await window.supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'paid_bookings')
            .maybeSingle();

        let paidBookings = [];
        if (settings && settings.value) {
            paidBookings = JSON.parse(settings.value);
            if (!Array.isArray(paidBookings)) paidBookings = [];
        }

        // 2. Carica tutte le prenotazioni
        const { data: bookings, error } = await window.supabase
            .from('bookings')
            .select('*, registrations(full_name)')
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 3. Elabora dati utente
        const usersData = {};
        window.__unpaidIdsData = {};

        bookings.forEach(b => {
            // Ignoriamo lessons non standard / group lecture senza utente ecc.
            if (b.lesson_type && b.lesson_type !== 'private') return;

            const uid = b.user_id;
            if (!uid) return;

            let name = "Account ID: " + uid.slice(0, 5);
            if (b.registrations && b.registrations.full_name) {
                name = b.registrations.full_name;
            }

            if (!usersData[uid]) {
                usersData[uid] = { name: name, unpaidIds: [], paidCount: 0, unpaidCount: 0, totalOwed: 0 };
            }

            const isPaid = paidBookings.includes(b.id);
            if (isPaid) {
                usersData[uid].paidCount++;
            } else {
                usersData[uid].unpaidCount++;
                usersData[uid].unpaidIds.push(b.id);
                usersData[uid].totalOwed += parseFloat(b.lesson_price) || 0;
            }
        });

        // 4. Mostra nella tabella
        tbody.innerHTML = '';
        let hasData = false;

        for (const uid in usersData) {
            const d = usersData[uid];
            // Nascondiamo chi non ha mai prenotato!
            if (d.paidCount === 0 && d.unpaidCount === 0) continue;
            hasData = true;

            const statusHtml = d.unpaidCount > 0
                ? `<span style="color:#00B4D8; font-weight:bold;"><i class="fas fa-exclamation-triangle"></i> Da Saldare</span>`
                : `<span style="color:#00d2d3; font-weight:bold;"><i class="fas fa-check-circle"></i> Tutto Saldato</span>`;

            let actionsHtml = d.unpaidCount > 0
                ? `<button onclick="markAsPaid('${uid}')" class="btn btn-outline" style="border-color:#00d2d3; color:#00d2d3; padding:5px 10px; font-size:0.9rem;"><i class="fas fa-check"></i> Segna Saldato (€${d.totalOwed})</button>`
                : `<span style="color:#aaa; font-style:italic;">Nessuna azione</span>`;

            // Opzione Extra: Annulla pagamenti utente (per sicurezza)
            if (d.paidCount > 0) {
                actionsHtml += `<br><button onclick="revertAllUserPayments('${uid}')" class="btn btn-outline" style="border-color:#ff9f43; color:#ff9f43; padding:3px 8px; font-size:0.7rem; margin-top:5px; border:none; text-decoration:underline;"><i class="fas fa-undo"></i> Azzera tutti i saldi</button>`;
            }

            // Manteniamo i dati per usarli
            window.__unpaidIdsData[uid] = d.unpaidIds;

            tbody.innerHTML += `
                <tr data-name="${d.name.toLowerCase()}">
                    <td><strong>${d.name}</strong></td>
                    <td><b style="color:var(--color-hot-pink);">${d.unpaidCount}</b> <span style="font-size:0.8rem; color:#aaa;">(Pagate in passato: ${d.paidCount})</span></td>
                    <td style="font-weight:bold; color:var(--color-hot-pink); font-size:1.1rem;">€ ${d.totalOwed}</td>
                    <td>${statusHtml}</td>
                    <td>${actionsHtml}</td>
                </tr>
            `;
        }

        if (!hasData) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nessuna lezione privata trovata.</td></tr>';
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Errore caricamento dati: ' + err.message + '</td></tr>';
    }
};

window.markAsPaid = async (uid) => {
    if (!confirm("Confermi che l'utente / coppia ha SALDATO tutte le sue lezioni attualmente in sospeso?")) return;

    const newPaidIds = window.__unpaidIdsData[uid] || [];
    if (newPaidIds.length === 0) return;

    // 1. Legge database attuale per non sovrascrivere altri
    const { data: settings } = await window.supabase.from('site_settings').select('value').eq('key', 'paid_bookings').maybeSingle();
    let currentPaid = settings && settings.value ? JSON.parse(settings.value) : [];
    if (!Array.isArray(currentPaid)) currentPaid = [];

    // 2. Unisco l'array senza duplicati
    const updatedPaid = [...new Set([...currentPaid, ...newPaidIds])];

    // 3. Salva di nuovo
    const { error } = await window.supabase.from('site_settings').upsert({ key: 'paid_bookings', value: JSON.stringify(updatedPaid) }, { onConflict: 'key' });

    if (error) {
        alert("Errore salvataggio: " + error.message);
    } else {
        alert("Conto saldato con successo!");
        loadBalances();
    }
};

window.revertAllUserPayments = async (uid) => {
    if (!confirm("ATTENZIONE! Vuoi annullare TUTTI i pagamenti registrati per questo utente? Verrà segnato tutto di nuovo come 'Da Saldare'.")) return;

    // Trova tutti gli ID di questo utente
    const { data: userBookings } = await window.supabase.from('bookings').select('id').eq('user_id', uid);
    if (!userBookings || userBookings.length === 0) return;

    const userBookingIds = userBookings.map(b => b.id);

    // Leggi DB attuale
    const { data: settings } = await window.supabase.from('site_settings').select('value').eq('key', 'paid_bookings').maybeSingle();
    let currentPaid = settings && settings.value ? JSON.parse(settings.value) : [];
    if (!Array.isArray(currentPaid)) currentPaid = [];

    // Togli tutti gli ID di questo utente dai pagati
    currentPaid = currentPaid.filter(id => !userBookingIds.includes(id));

    // Salva nel DB
    const { error } = await window.supabase.from('site_settings').upsert({ key: 'paid_bookings', value: JSON.stringify(currentPaid) }, { onConflict: 'key' });

    if (error) {
        alert("Errore: " + error.message);
    } else {
        alert("Resettato con successo.");
        loadBalances();
    }
};

window.filterBalances = () => {
    const input = document.getElementById('search-balance').value.toLowerCase();
    document.querySelectorAll('#balances-body tr').forEach(row => {
        const name = row.getAttribute('data-name') || '';
        row.style.display = name.includes(input) ? '' : 'none';
    });
};

// --- GESTIONE LEZIONI SPECIALI (Disponibilità) ---
window.loadSpecialBookings = async () => {
    const { data: specials } = await window.supabase
        .from('bookings')
        .select('*, teachers(full_name)')
        .in('lesson_type', ['lecture', 'group lesson'])
        .neq('status', 'cancelled')
        .order('lesson_date', { ascending: true });

    const list = document.getElementById('special-bookings-list');
    if (list) {
        list.innerHTML = '';
        if (!specials || specials.length === 0) {
            list.innerHTML = '<p style="color:#666; font-style:italic;">Nessuna lezione speciale attiva.</p>';
            return;
        }

        specials.forEach(s => {
            const payInfo = s.staff_pay ? `€ ${s.staff_pay}` : 'Base';
            list.innerHTML += `
               <div class="shift-card" style="border-left:4px solid #00d2d3; display:flex; justify-content:space-between; align-items:center;">
                   <div>
                       <strong>${s.teachers.full_name}</strong> <span style="font-size:0.8rem; color:#00d2d3; text-transform:uppercase;">${s.lesson_type}</span><br>
                       <span style="color:#ccc"><i class="far fa-calendar"></i> ${s.lesson_date} <i class="far fa-clock" style="margin-left:5px;"></i> ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}</span><br>
                       <small style="color:#aaa">Paga Staff: <span style="color:#feca57">${payInfo}</span></small>
                   </div>
                   <button class="btn-delete-mini" onclick="deleteSpecialBooking(${s.id})">&times;</button>
               </div>`;
        });
    }
};

window.deleteSpecialBooking = async (id) => {
    if (!confirm("Eliminare questa lezione speciale?")) return;
    const { error } = await window.supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    if (error) alert("Errore: " + error.message);
    else {
        loadSpecialBookings();
        // Se siamo anche nella view contabilità ricarichiamo (opzionale)
    }
};

function renderAccountingTable(bookings) {
    const tbody = document.getElementById('accounting-body');
    tbody.innerHTML = '';
    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#aaa;">Nessuna lezione trovata.</td></tr>';
        return;
    }

    bookings.forEach(b => {
        const rowClass = b.status === 'cancelled' ? 'style="opacity:0.5; text-decoration:line-through"' : '';
        const coupleName = b.registrations?.full_name || "N/A";

        const btnEdit = b.status !== 'cancelled' ? `
            <button onclick="openEditModal(${b.id}, '${b.lesson_date}', '${b.start_time}', '${b.end_time}', ${b.lesson_price})" 
                    style="color:#ff9f43; background:none; border:none; cursor:pointer; margin-right:5px;" title="Modifica">
                <i class="fas fa-edit"></i>
            </button>` : '';

        const btnCancel = b.status !== 'cancelled' ? `
            <button onclick="cancelBookingAdmin(${b.id})" 
                    style="color:#00B4D8; background:none; border:none; cursor:pointer; margin-right:5px;" title="Annulla">
                <i class="fas fa-ban"></i>
            </button>` : '<span style="font-size:0.8rem">(Annullato)</span>';

        const btnDelete = `
            <button onclick="deleteBookingPermanent(${b.id})" 
                    style="color:red; background:none; border:none; cursor:pointer;" title="ELIMINA DEL TUTTO">
                <i class="fas fa-trash"></i>
            </button>`;

        tbody.innerHTML += `
            <tr ${rowClass}>
                <td>${b.id}</td>
                <td>${b.lesson_date}<br>${b.start_time.slice(0, 5)}</td>
                <td>${b.teachers.full_name}</td>
                <td>${coupleName}</td>
                <td>€ ${b.lesson_price}</td>
                <td>${b.status}</td>
                <td>${btnEdit} ${btnCancel} ${btnDelete}</td>
            </tr>`;
    });
}

// LOGICA MODALE MODIFICA (CON INVIO EMAIL)
window.openEditModal = (id, date, start, end, price) => {
    document.getElementById('edit-booking-id').value = id;
    document.getElementById('edit-date').value = date;
    document.getElementById('edit-start').value = start.slice(0, 5);
    document.getElementById('edit-end').value = end.slice(0, 5);
    document.getElementById('edit-price').value = price;

    document.getElementById('admin-edit-modal').style.display = 'flex';
};

window.closeEditModal = () => {
    document.getElementById('admin-edit-modal').style.display = 'none';
};

window.saveBookingChanges = async () => {
    const id = document.getElementById('edit-booking-id').value;
    const newDate = document.getElementById('edit-date').value;
    const newStart = document.getElementById('edit-start').value;
    const newEnd = document.getElementById('edit-end').value;
    const newPrice = document.getElementById('edit-price').value;

    if (!newDate || !newStart || !newPrice) return alert("Compila tutto");

    const formattedStart = newStart.length === 5 ? newStart + ":00" : newStart;
    const formattedEnd = newEnd.length === 5 ? newEnd + ":00" : newEnd;

    // 1. UPDATE SU SUPABASE
    const { error } = await window.supabase
        .from('bookings')
        .update({
            lesson_date: newDate, start_time: formattedStart, end_time: formattedEnd,
            lesson_price: newPrice, admin_notes: "Modified by Admin"
        })
        .eq('id', id);

    if (error) {
        alert("Errore: " + error.message);
    } else {
        // 2. RECUPERA DATI PER EMAIL E INVIA NOTIFICA
        const { data: fullBooking } = await window.supabase
            .from('bookings')
            .select('*, registrations(user_email, full_name), teachers(full_name)')
            .eq('id', id)
            .single();

        if (fullBooking && fullBooking.registrations) {
            await sendEmailNotification(
                "MODIFIED BY ADMIN",
                {
                    teacher_name: fullBooking.teachers.full_name,
                    lesson_date: newDate,
                    lesson_time: newStart,
                    price: newPrice
                },
                fullBooking.registrations.user_email,
                fullBooking.registrations.full_name
            );
        }

        alert("Salvato!");
        closeEditModal();
        loadAllBookings();
    }
};

window.cancelBookingAdmin = async (id) => {
    if (!confirm("Annullare la prenotazione? L'utente riceverà una notifica.")) return;

    // 1. RECUPERA DATI PRIMA DI CANCELLARE (per email)
    const { data: bookingData } = await window.supabase
        .from('bookings')
        .select('*, registrations(user_email, full_name), teachers(full_name)')
        .eq('id', id)
        .single();

    // 2. CANCELLA (UPDATE STATUS)
    await window.supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);

    // 3. INVIA EMAIL
    if (bookingData && bookingData.registrations) {
        await sendEmailNotification(
            "CANCELLED BY ADMIN",
            {
                teacher_name: bookingData.teachers.full_name,
                lesson_date: bookingData.lesson_date,
                lesson_time: bookingData.start_time,
                price: bookingData.lesson_price
            },
            bookingData.registrations.user_email,
            bookingData.registrations.full_name
        );
    }

    loadAllBookings();
};

window.deleteBookingPermanent = async (id) => {
    if (!confirm("ATTENZIONE: Eliminare DEFINITIVAMENTE dal database? Non si potrà recuperare.")) return;
    await window.supabase.from('bookings').delete().eq('id', id);
    loadAllBookings();
};

// --- ALTRE TAB (Messaggi) ---
window.loadMessages = async () => {
    const { data: msgs } = await window.supabase.from('contacts').select('*').order('created_at', { ascending: false });
    const tbody = document.getElementById('messages-body');
    tbody.innerHTML = '';
    if (msgs) {
        msgs.forEach(m => {
            const style = m.is_read ? '' : 'font-weight:bold; color:#fff; background:rgba(0, 180, 216, 0.1);';
            const subject = m.subject || '(No Oggetto)';
            tbody.innerHTML += `
                <tr style="${style}">
                    <td>${new Date(m.created_at).toLocaleDateString()}</td>
                    <td>${m.full_name}<br><small>${m.email}</small></td>
                    <td><strong>${subject}</strong><br>${m.message}</td>
                    <td>
                        <button onclick="deleteMessage(${m.id})" style="color:red; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                        ${!m.is_read ? `<button onclick="markAsRead(${m.id})" style="color:#0f0; background:none; border:none; cursor:pointer;"><i class="fas fa-check"></i></button>` : ''}
                    </td>
                </tr>`;
        });
    }
};

window.markAsRead = async (id) => {
    await window.supabase.from('contacts').update({ is_read: true }).eq('id', id);
    loadMessages();
};
window.deleteMessage = async (id) => {
    if (confirm("Eliminare?")) {
        await window.supabase.from('contacts').delete().eq('id', id);
        loadMessages();
    }
};

// ==========================================
// SEZIONE: GESTIONE ISCRIZIONI (REGISTRATIONS)
// ==========================================
window.loadRegistrations = async () => {
    const { data: regs } = await window.supabase.from('registrations').select('*').order('created_at', { ascending: false });
    const tbody = document.getElementById('registrations-body');
    tbody.innerHTML = '';
    let totalMoney = 0, count = 0;

    if (regs) {
        regs.forEach(r => {
            count++;
            totalMoney += Number(r.total_amount) || 0;

            // Generazione Riga con Bottone DELETE
            // Cerca questo pezzo dentro loadRegistrations e AGGIORNALO così:
            tbody.innerHTML += `
    <tr>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td><strong>${r.full_name}</strong><br><small>${r.user_email}</small></td>
        <td>${r.role}</td>
        <td>${r.package}</td>
        <td>€ ${r.total_amount}</td>
        <td><span style="color:#0f0">${r.payment_status}</span></td>
        <td style="text-align: right; white-space: nowrap;">
            <button onclick="viewRegistrationDetails('${r.id}')" 
                    style="color:#00d2d3; background:none; border:none; cursor:pointer; margin-right: 10px;" 
                    title="Vedi Dettagli Completi">
                <i class="fas fa-eye"></i>
            </button>

            <button onclick="deleteEntry('${r.id}')" 
                    style="color:red; background:none; border:none; cursor:pointer;" 
                    title="Elimina Iscrizione">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    </tr>`;
        });
    }

    const countEl = document.getElementById('total-reg-count');
    const moneyEl = document.getElementById('total-reg-money');
    if (countEl) countEl.innerText = count;
    if (moneyEl) moneyEl.innerText = "€ " + totalMoney;
};

// ==========================================
// FUNZIONE CORRETTA: ELIMINAZIONE A CASCATA
// ==========================================
window.deleteEntry = async (id) => {
    const confirmed = confirm("SEI SICURO? \nEliminare questo iscritto cancellerà anche TUTTE le sue prenotazioni e lo storico.\nQuesta azione è irreversibile.");

    if (!confirmed) return;

    try {
        // PASSO 1: Dobbiamo trovare lo user_id collegato a questa registrazione
        const { data: regData, error: fetchError } = await window.supabase
            .from('registrations')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        if (regData && regData.user_id) {
            // PASSO 2: Cancelliamo TUTTE le prenotazioni (bookings) di questo utente
            const { error: bookingError } = await window.supabase
                .from('bookings')
                .delete()
                .eq('user_id', regData.user_id);

            if (bookingError) {
                console.warn("Attenzione: errore cancellazione prenotazioni o nessuna prenotazione trovata.", bookingError);
                // Non blocchiamo, proviamo comunque a cancellare la registrazione
            }
        }

        // PASSO 3: Ora che le prenotazioni sono andate, cancelliamo l'iscrizione
        const { error: regError } = await window.supabase
            .from('registrations')
            .delete()
            .eq('id', id);

        if (regError) throw regError;

        alert("Iscritto e relative prenotazioni eliminati con successo.");
        loadRegistrations(); // Ricarica la tabella

    } catch (error) {
        console.error("Errore cancellazione:", error);
        alert("Errore durante l'eliminazione: " + error.message);
    }
};

window.filterRegistrations = () => {
    const input = document.getElementById('search-reg').value.toLowerCase();
    document.querySelectorAll('#registrations-body tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(input) ? '' : 'none';
    });
};

// --- GESTIONE TEACHERS LIST ---
window.loadTeachersList = async () => {
    const { data: t } = await window.supabase.from('teachers').select('*').order('full_name');
    const tbody = document.getElementById('teachers-list-body');
    tbody.innerHTML = '';

    if (t) {
        t.forEach(teacher => {
            const emailDisplay = teacher.email ? `<br><small style="color:#aaa">${teacher.email}</small>` : '';

            // Escaping per sicurezza nelle stringhe
            const safeName = teacher.full_name.replace(/'/g, "\\'");
            const safeDisc = (teacher.discipline || '').replace(/'/g, "\\'");
            const safeEmail = (teacher.email || '').replace(/'/g, "\\'");

            tbody.innerHTML += `
            <tr>
                <td><strong>${teacher.full_name}</strong>${emailDisplay}</td>
                <td>€ ${teacher.base_price}</td>
                <td style="color:#2ecc71">€ ${teacher.pay_rate || 0}</td>
                <td>${teacher.discipline || '-'}</td>
                <td>
                    <button onclick="openEditTeacherModal('${teacher.id}', '${safeName}', '${safeEmail}', ${teacher.base_price}, '${safeDisc}', ${teacher.pay_rate || 0})" 
                        style="color:#3498db; background:none; border:none; cursor:pointer; font-size:1.1rem; margin-right:10px;" title="Modifica">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteTeacher('${teacher.id}')" 
                        style="color:#e74c3c; background:none; border:none; cursor:pointer; font-size:1.1rem;" title="Elimina">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
    }
};

// ... (addNewTeacher rimane uguale) ...

// ==========================================
// MODIFICA INSEGNANTE (NUOVO)
// ==========================================
window.openEditTeacherModal = (id, name, email, price, discipline, payRate) => {
    // Popola e apri un modale (lo creiamo al volo o usiamo un prompt evoluto? Meglio un prompt veloce per ora o un modale "rigido")
    // Dato che non ho un modale HTML pronto per Teacher, uso un approccio "Quick Edit" con Prompt a cascata o un modale JS creato al volo.
    // MA l'utente vuole un tasto. Facciamo apparire il modale generico "admin-edit-modal" adattandolo? No, è specifico per booking.
    // Creiamo un modale semplice via JS (Overlay).

    let modal = document.getElementById('teacher-edit-modal');
    if (!modal) {
        // Crea il modale se non esiste
        const div = document.createElement('div');
        div.id = 'teacher-edit-modal';
        div.className = 'modal-overlay';
        div.style.display = 'flex'; // Flex per centrare
        div.innerHTML = `
            <div class="modal-box" style="background:#222; padding:30px; border-radius:10px; border:1px solid #444; width:400px;">
                <h3 style="color:var(--color-hot-pink); margin-top:0;">Modifica Insegnante</h3>
                <input type="hidden" id="edit-teacher-id">
                <div class="form-group">
                    <label>Nome</label>
                    <input type="text" id="edit-teacher-name" style="width:100%; padding:8px; margin-bottom:10px; background:#333; border:1px solid #555; color:white;">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="edit-teacher-email" style="width:100%; padding:8px; margin-bottom:10px; background:#333; border:1px solid #555; color:white;">
                </div>
                <div class="form-row" style="display:flex; gap:10px;">
                    <div class="form-group" style="flex:1;">
                        <label>Prezzo Pubblico</label>
                        <input type="number" id="edit-teacher-price" style="width:100%; padding:8px; margin-bottom:10px; background:#333; border:1px solid #555; color:white;">
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label>Paga Staff</label>
                        <input type="number" id="edit-teacher-pay" style="width:100%; padding:8px; margin-bottom:10px; background:#333; border:1px solid #555; color:white; border-color:#2ecc71;">
                    </div>
                </div>
                 <div class="form-group">
                    <label>Disciplina</label>
                    <input type="text" id="edit-teacher-disc" style="width:100%; padding:8px; margin-bottom:20px; background:#333; border:1px solid #555; color:white;">
                </div>
                <div style="text-align:right; display:flex; justify-content:flex-end; gap:10px;">
                    <button onclick="document.getElementById('teacher-edit-modal').style.display='none'" class="btn-cancel" style="padding:8px 15px; background:#444; color:white; border:none; cursor:pointer;">Annulla</button>
                    <button onclick="saveTeacherChanges()" class="btn-save" style="padding:8px 15px; background:var(--color-hot-pink); color:white; border:none; cursor:pointer;">Salva</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        modal = div;
    }

    // Popola
    document.getElementById('edit-teacher-id').value = id;
    document.getElementById('edit-teacher-name').value = name;
    document.getElementById('edit-teacher-email').value = email;
    document.getElementById('edit-teacher-price').value = price;
    document.getElementById('edit-teacher-pay').value = payRate;
    document.getElementById('edit-teacher-disc').value = discipline;

    modal.style.display = 'flex';
};

window.saveTeacherChanges = async () => {
    const id = document.getElementById('edit-teacher-id').value;
    const name = document.getElementById('edit-teacher-name').value;
    const email = document.getElementById('edit-teacher-email').value;
    const price = document.getElementById('edit-teacher-price').value;
    const pay = document.getElementById('edit-teacher-pay').value;
    const disc = document.getElementById('edit-teacher-disc').value;

    const { error } = await window.supabase
        .from('teachers')
        .update({
            full_name: name,
            email: email,
            base_price: price,
            pay_rate: pay,
            discipline: disc
        })
        .eq('id', id);

    if (error) {
        alert("Errore aggiornamento: " + error.message);
    } else {
        alert("Insegnante aggiornato!");
        document.getElementById('teacher-edit-modal').style.display = 'none';
        loadTeachersList();
        loadTeachers(); // Aggiorna anche le select
    }
};

window.addNewTeacher = async () => {
    const name = document.getElementById('new-teacher-name').value;
    const email = document.getElementById('new-teacher-email').value;
    const price = document.getElementById('new-teacher-price').value;
    const payRate = document.getElementById('new-teacher-pay-rate').value; // NUOVO
    const disc = document.getElementById('new-teacher-discipline').value;

    if (!name) return alert("Nome obbligatorio");

    const { error } = await window.supabase.from('teachers').insert({
        full_name: name,
        email: email.trim(),
        base_price: price,
        pay_rate: payRate || 0, // Salva la Paga
        discipline: disc,
        is_active: true
    });

    if (error) {
        alert("Errore inserimento: " + error.message);
        return;
    }

    alert("Insegnante aggiunto!");
    loadTeachersList();
    loadTeachers();
};
// ==========================================
// FUNZIONE MANCANTE: ELIMINA INSEGNANTE
// ==========================================
window.deleteTeacher = async (id) => {
    // 1. Conferma di sicurezza
    if (!confirm("SEI SICURO?\nEliminare l'insegnante cancellerà anche tutte le sue disponibilità e lezioni future.\nQuesta azione è irreversibile.")) return;

    try {
        // 2. Elimina le disponibilità (Turni) collegate
        const { error: errAvail } = await window.supabase
            .from('teacher_availability')
            .delete()
            .eq('teacher_id', id);

        if (errAvail) console.warn("Errore eliminazione disponibilità:", errAvail);

        // 3. Elimina le lezioni (Bookings) collegate
        const { error: errBook } = await window.supabase
            .from('bookings')
            .delete()
            .eq('teacher_id', id);

        if (errBook) console.warn("Errore eliminazione lezioni:", errBook);

        // 4. Infine elimina l'insegnante
        const { error } = await window.supabase
            .from('teachers')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert("Insegnante eliminato con successo.");

        // 5. Ricarica le liste per aggiornare la pagina
        loadTeachersList();
        loadTeachers();

    } catch (err) {
        console.error(err);
        alert("Errore durante l'eliminazione: " + err.message);
    }
};

// ==========================================
// SEZIONE: GESTIONE ACCOUNT DI SISTEMA
// ==========================================
window.loadSystemUsers = async () => {
    const tbody = document.getElementById('system-users-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Caricamento utenti...</td></tr>';

    const { data: allUsers, error: errAuth } = await window.supabase.rpc('get_system_users');
    const { data: regIds, error: errReg } = await window.supabase.from('registrations').select('user_id');

    if (errAuth || errReg) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center">Errore caricamento. Hai eseguito lo script SQL?</td></tr>';
        return;
    }

    const registeredSet = new Set(regIds.map(r => r.user_id));

    tbody.innerHTML = '';
    let ghosts = 0;

    allUsers.forEach(u => {
        const hasForm = registeredSet.has(u.id);
        if (!hasForm) ghosts++;

        const created = new Date(u.created_at).toLocaleDateString('it-IT');
        const lastSign = u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('it-IT') : 'Mai';

        const statusBadge = hasForm
            ? '<span style="color:#2ecc71; font-weight:bold;">✔ Completo</span>'
            : '<span style="color:#ff9f43; font-weight:bold;">⚠ MANCANTE</span>';

        tbody.innerHTML += `
            <tr>
                <td>${created}</td>
                <td><strong>${u.email}</strong><br><small style="opacity:0.5">ID: ${u.id.slice(0, 6)}...</small></td>
                <td>${lastSign}</td>
                <td>${statusBadge}</td>
                <td>
                    <button onclick="deleteSystemUser('${u.id}')" 
                            style="color:red; background:none; border:none; cursor:pointer;" 
                            title="Elimina Account Definitivamente">
                        <i class="fas fa-trash"></i> Elimina
                    </button>
                </td>
            </tr>`;
    });

    document.getElementById('sys-total-count').innerText = allUsers.length;
    document.getElementById('sys-ghost-count').innerText = ghosts;
};

window.deleteSystemUser = async (uuid) => {
    if (!confirm("ATTENZIONE: Stai cancellando un account di sistema. L'utente non potrà più fare login.")) return;
    await window.supabase.from('bookings').delete().eq('user_id', uuid);
    await window.supabase.from('registrations').delete().eq('user_id', uuid);
    const { error } = await window.supabase.rpc('delete_user_by_id', { target_id: uuid });
    if (error) alert("Errore eliminazione: " + error.message);
    else { alert("Account eliminato."); loadSystemUsers(); }
};

// ==========================================
// FUNZIONE INVIO EMAIL (EMAILJS)
// ==========================================
async function sendEmailNotification(type, bookingData, userEmail, userName) {
    console.log(`Sending email to ${userEmail} for ${type}...`);

    const templateParams = {
        to_email: userEmail,       // Destinatario
        user_name: userName,       // Nome Utente
        action_type: type,         // Es: "MODIFIED BY ADMIN"
        teacher_name: bookingData.teacher_name,
        lesson_date: bookingData.lesson_date,
        lesson_time: bookingData.lesson_time,
        price: bookingData.price
    };

    try {
        const SERVICE_ID = "service_fik9j1g";
        const TEMPLATE_ID = "template_szh5dao";

        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
        console.log("Email sent successfully!");
    } catch (error) {
        console.error("EmailJS Error:", error);
    }
}
// ==========================================
// NUOVE FUNZIONI: DETTAGLI ISCRIZIONE
// ==========================================

window.viewRegistrationDetails = async (id) => {
    // 1. Apri il modale e mostra caricamento
    const modal = document.getElementById('reg-details-modal');
    const content = document.getElementById('reg-details-content');
    modal.style.display = 'flex';
    content.innerHTML = '<p style="text-align:center;">Caricamento dati...</p>';

    try {
        // 2. Prendi TUTTI i dati da Supabase per quell'ID
        const { data: r, error } = await window.supabase
            .from('registrations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // 3. DETERMINA IL TIPO (Logica)
        let typeBadge = '';
        let hasMan = r.man_name && r.man_name.trim() !== '';
        let hasWoman = r.woman_name && r.woman_name.trim() !== '';

        if (hasMan && hasWoman) {
            typeBadge = `<div style="background:#6c5ce7; color:white; padding:8px 15px; border-radius:20px; display:inline-block; font-weight:bold; margin-bottom:15px;">
                            <i class="fas fa-user-friends"></i> COUPLE (x2)
                         </div>`;
        } else if (hasMan && !hasWoman) {
            typeBadge = `<div style="background:#0984e3; color:white; padding:8px 15px; border-radius:20px; display:inline-block; font-weight:bold; margin-bottom:15px;">
                            <i class="fas fa-male"></i> SINGLE MALE
                         </div>`;
        } else if (!hasMan && hasWoman) {
            typeBadge = `<div style="background:#e84393; color:white; padding:8px 15px; border-radius:20px; display:inline-block; font-weight:bold; margin-bottom:15px;">
                            <i class="fas fa-female"></i> SINGLE FEMALE
                         </div>`;
        } else {
            typeBadge = `<div style="background:#555; color:white; padding:8px 15px; border-radius:20px; display:inline-block; font-weight:bold; margin-bottom:15px;">
                            <i class="fas fa-question"></i> UNKNOWN
                         </div>`;
        }

        // 4. Genera l'HTML
        content.innerHTML = `
            <div style="text-align:center;">
                ${typeBadge}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 0.9rem;">
                
                <div style="grid-column: 1 / -1; margin-bottom: 5px;">
                    <strong style="color:white; display:block; border-bottom:1px solid #444; padding-bottom:5px;">1. PARTECIPANTI</strong>
                </div>
                
                <div style="${hasMan ? '' : 'opacity:0.3'}"><span style="color:#888;">Man:</span> <br> <strong>${r.man_name || '-'} ${r.man_surname || '-'}</strong></div>
                <div style="${hasWoman ? '' : 'opacity:0.3'}"><span style="color:#888;">Woman:</span> <br> <strong>${r.woman_name || '-'} ${r.woman_surname || '-'}</strong></div>
                
                <div><span style="color:#888;">Teacher:</span> <br> ${r.teacher || '-'}</div>
                <div><span style="color:#888;">Country:</span> <br> ${r.country || '-'}</div>
                <div><span style="color:#888;">Age Group:</span> <br> ${r.age_group || '-'}</div>

                <div style="grid-column: 1 / -1; margin: 10px 0;">
                    <strong style="color:white; display:block; border-bottom:1px solid #444; padding-bottom:5px;">2. CONTATTI</strong>
                </div>
                <div><span style="color:#888;">Email:</span> <br> ${r.user_email || '-'}</div>
                <div><span style="color:#888;">Phone:</span> <br> ${r.phone || '-'}</div>

                <div style="grid-column: 1 / -1; margin: 10px 0;">
                    <strong style="color:white; display:block; border-bottom:1px solid #444; padding-bottom:5px;">3. PACCHETTO & COSTI</strong>
                </div>
                <div><span style="color:#888;">Package:</span> <br> <span style="color:var(--color-hot-pink); font-weight:bold;">${r.package}</span></div>
                <div><span style="color:#888;">Extra Nights:</span> <br> ${r.extra_nights || '0'}</div>
                <div><span style="color:#888;">Total Paid:</span> <br> € ${r.total_amount}</div>
                <div><span style="color:#888;">Method:</span> <br> ${r.payment_status === 'paid' ? 'Stripe (Card)' : 'Pending'}</div>

                <div style="grid-column: 1 / -1; margin: 10px 0;">
                    <strong style="color:white; display:block; border-bottom:1px solid #444; padding-bottom:5px;">4. LOGISTICA</strong>
                </div>
                <div><span style="color:#888;">Arrival:</span> <br> ${r.arrival_date || 'N/A'} <small>(${r.arrival_time || '--:--'})</small></div>
                <div><span style="color:#888;">Departure:</span> <br> ${r.departure_date || 'N/A'} <small>(${r.departure_time || '--:--'})</small></div>
            </div>
        `;

    } catch (err) {
        console.error(err);
        content.innerHTML = `<p style="color:red;">Errore nel caricamento dati: ${err.message}</p>`;
    }
};

window.closeRegModal = () => {
    document.getElementById('reg-details-modal').style.display = 'none';
};

// Chiudi se clicchi fuori
window.addEventListener('click', (e) => {
    const modal = document.getElementById('reg-details-modal');
    if (e.target === modal) modal.style.display = 'none';
    // ==========================================
    // FUNZIONI MOBILE MENU
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        const mobileBtn = document.getElementById('mobile-toggle-btn');
        const closeBtn = document.getElementById('close-sidebar-btn');
        const sidebar = document.getElementById('adminSidebar');
        const body = document.body;

        // Funzione Apri
        if (mobileBtn) {
            mobileBtn.addEventListener('click', () => {
                sidebar.classList.add('sidebar-open');
                body.classList.add('menu-active');
            });
        }

        // Funzione Chiudi (Click su X)
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                sidebar.classList.remove('sidebar-open');
                body.classList.remove('menu-active');
            });
        }

        // Funzione Chiudi (Click fuori / overlay)
        document.addEventListener('click', (e) => {
            if (body.classList.contains('menu-active') &&
                !sidebar.contains(e.target) &&
                e.target !== mobileBtn) {

                sidebar.classList.remove('sidebar-open');
                body.classList.remove('menu-active');
            }
        });

        // Chiudi menu quando clicchi un link
        const navLinks = document.querySelectorAll('.nav-btn');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 768) {
                    sidebar.classList.remove('sidebar-open');
                    body.classList.remove('menu-active');
                }
            });
        });
    });
    // ==========================================
    // GESTIONE NAVIGAZIONE SCHEDE (Tabs)
    // ==========================================

    window.showSection = (sectionId, btnClicked) => {
        // A. Gestione Sezioni Principali
        const dashboardSection = document.getElementById('section-dashboard');
        const timerSection = document.getElementById('section-timer');

        if (sectionId === 'timer') {
            // Nascondi Dashboard, Mostra Timer
            if (dashboardSection) dashboardSection.style.display = 'none';
            if (timerSection) timerSection.style.display = 'block';
        }
        // (Se in futuro aggiungi altre sezioni, metti qui gli else if)

        // B. Gestione Bottoni Menu Laterale
        // Rimuove 'active' da TUTTI i bottoni (compresi quelli delle tab dashboard)
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        // Aggiunge 'active' SOLO al bottone del Timer
        if (btnClicked) {
            btnClicked.classList.add('active');
        }
    };

    // ... (Lascia qui sotto il codice del Timer saveTimerSettings e loadTimerDate che ti ho dato prima)
});
// --- GESTIONE TIMER ---

// 1. Carica la data attuale all'avvio
document.addEventListener('DOMContentLoaded', async () => {
    // ... (altre funzioni di init se ci sono) ...
    loadCurrentTimer();
});

async function loadCurrentTimer() {
    const { data, error } = await window.supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'countdown_end')
        .single();

    if (data && document.getElementById('timer-date-input')) {
        // Formatta la data per l'input datetime-local
        document.getElementById('timer-date-input').value = data.value;
    }
}

// 2. Funzione per salvare la nuova data (chiamata dal bottone HTML)
window.saveTimerDate = async () => {
    const newVal = document.getElementById('timer-date-input').value;

    if (!newVal) return alert("Please select a date.");

    const btn = document.querySelector('button[onclick="saveTimerDate()"]');
    const oldText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const { error } = await window.supabase
            .from('site_settings')
            .update({ value: newVal })
            .eq('key', 'countdown_end');

        if (error) throw error;
        alert("Timer updated successfully! Check the Home Page.");
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
};
// ==========================================
// CALCOLO ORE INSEGNANTI (CONTABILITÀ)
// ==========================================

function updateTeacherHours(bookings) {
    const container = document.getElementById('teachers-work-summary');
    if (!container) return;

    container.innerHTML = ''; // Pulisce il contenitore

    const teacherStats = {};

    bookings.forEach(booking => {
        // Ignora cancellate
        if (booking.status === 'cancelled') return;

        const teacher = booking.teachers ? booking.teachers.full_name : null;
        if (!teacher) return;

        // Somma al totale dell'insegnante (COUNT invece di DURATION)
        if (!teacherStats[teacher]) {
            teacherStats[teacher] = 0;
        }
        teacherStats[teacher] += 1;
    });

    if (Object.keys(teacherStats).length === 0) {
        container.innerHTML = '<span style="color:#aaa">Nessuna lezione confermata.</span>';
        return;
    }

    // Crea le "Card"
    for (const [name, count] of Object.entries(teacherStats)) {
        const badge = document.createElement('div');
        badge.style.cssText = `
            background: #333; 
            padding: 10px 15px; 
            border-radius: 6px; 
            border: 1px solid #444; 
            min-width: 140px;
            text-align: center;
        `;

        badge.innerHTML = `
            <div style="font-size: 0.8rem; color: #aaa; text-transform: uppercase; margin-bottom: 5px;">${name}</div>
            <div style="font-size: 1.3rem; font-weight: bold; color: var(--color-hot-pink);">${count} Lezioni</div>
        `;

        container.appendChild(badge);
    }
}

// Funzione Helper: converte "10:30" o "10:30:00" in minuti totali (es. 630)
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return (h * 60) + m;
}
// ==========================================
// CALCOLO TOTALI PAGAMENTI UTENTI
// ==========================================

function updateUserTotals(bookings) {
    const container = document.getElementById('users-payment-summary');
    if (!container) return;

    container.innerHTML = ''; // Pulisce

    const userStats = {};

    bookings.forEach(b => {
        // 1. Ignora le cancellate
        if (b.status === 'cancelled') return;

        // 2. Trova il nome (Gestisce sia Booking da Form che Manuali)
        let name = "Sconosciuto";
        if (b.registrations && b.registrations.full_name) {
            name = b.registrations.full_name;
        } else if (b.user_id) {
            name = "ID: " + b.user_id.slice(0, 5);
        }

        // 3. Somma il prezzo
        const price = parseFloat(b.lesson_price) || 0;

        if (!userStats[name]) {
            userStats[name] = 0;
        }
        userStats[name] += price;
    });

    // 4. Se vuoto
    if (Object.keys(userStats).length === 0) {
        container.innerHTML = '<span style="color:#aaa">Nessun importo da calcolare.</span>';
        return;
    }

    // 5. Crea le Card
    for (const [name, total] of Object.entries(userStats)) {

        const badge = document.createElement('div');
        badge.style.cssText = `
            background: #2d3436; 
            padding: 10px 15px; 
            border-radius: 6px; 
            border: 1px solid #00d2d3; 
            min-width: 140px;
            text-align: center;
        `;

        badge.innerHTML = `
            <div style="font-size: 0.8rem; color: #dfe6e9; text-transform: uppercase; margin-bottom: 5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:150px;" title="${name}">${name}</div>
            <div style="font-size: 1.3rem; font-weight: bold; color: #00d2d3;">€ ${total}</div>
        `;

        container.appendChild(badge);
    }

}

// ==========================================
// CALCOLO PAGA STAFF (NUOVO)
// ==========================================
// ==========================================
// CALCOLO PAGA STAFF (NUOVO e AGGIORNATO)
// ==========================================
function updateStaffPay(bookings) {
    const container = document.getElementById('staff-pay-summary');
    if (!container) return;

    container.innerHTML = '';

    const staffStats = {};

    bookings.forEach(b => {
        // Ignora cancellate
        if (b.status === 'cancelled') return;

        const teacher = b.teachers ? b.teachers.full_name : null;
        if (!teacher) return;

        // --- LOGICA DI CALCOLO PAGA ---
        let pay = 0;

        // 1. Se c'è un override specifico per questa lezione (es. Group/Lecture)
        if (b.staff_pay !== null && b.staff_pay !== undefined) {
            pay = parseFloat(b.staff_pay);
        }
        // 2. Altrimenti usa la paga base dell'insegnante (Standard Booking)
        else if (b.teachers.pay_rate > 0) {
            pay = parseFloat(b.teachers.pay_rate);
        }

        if (pay > 0) {
            if (!staffStats[teacher]) staffStats[teacher] = 0;
            staffStats[teacher] += pay;
        }
    });

    if (Object.keys(staffStats).length === 0) {
        container.innerHTML = '<span style="color:#aaa">Nessuna paga staff calcolata (imposta "Paga Staff").</span>';
        return;
    }

    for (const [name, totalPay] of Object.entries(staffStats)) {
        const badge = document.createElement('div');
        badge.style.cssText = `
            background: #333; 
            padding: 10px 15px; 
            border-radius: 6px; 
            border: 1px solid #444; 
            min-width: 140px;
            text-align: center;
        `;
        badge.innerHTML = `
            <div style="font-size: 0.8rem; color: #aaa; text-transform: uppercase; margin-bottom: 5px;">${name}</div>
            <div style="font-size: 1.3rem; font-weight: bold; color: #feca57;">€ ${totalPay}</div>
        `;
        container.appendChild(badge);
    }
}

// ==========================================
// SEZIONE: IMPOSTAZIONI GLOBALI
// ==========================================
window.loadGlobalSettings = async () => {
    // 1. Chiavi che ci aspettiamo
    const keys = ['entry_form', 'book_lesson'];

    // 2. Fetch da Supabase
    // Tabella 'site_settings' (key, value)
    const { data: settings, error } = await window.supabase
        .from('site_settings')
        .select('*')
        .in('key', keys);

    if (error) {
        console.warn("Errore caricamento settings:", error);
        return;
    }

    // 3. Mappa i valori (Default: true se non esiste)
    let entryEnabled = true;
    let bookEnabled = true;

    if (settings) {
        const entryObj = settings.find(s => s.key === 'entry_form');
        const bookObj = settings.find(s => s.key === 'book_lesson');

        // Se il valore nel DB è false, allora è false. Altrimenti true.
        // Gestiamo sia booleani che stringhe
        const isFalse = (val) => val === false || val === 'false';

        if (entryObj && isFalse(entryObj.value)) entryEnabled = false;
        if (bookObj && isFalse(bookObj.value)) bookEnabled = false;
    }

    // 4. Aggiorna UI
    const entryCheck = document.getElementById('toggle-entry-form');
    const bookCheck = document.getElementById('toggle-book-lesson');

    if (entryCheck) entryCheck.checked = entryEnabled;
    if (bookCheck) bookCheck.checked = bookEnabled;
};

window.toggleSetting = async (key) => {
    const checkbox = document.getElementById(key === 'entry_form' ? 'toggle-entry-form' : 'toggle-book-lesson');
    if (!checkbox) return;

    const isEnabled = checkbox.checked;

    // Upsert (Inserisci o Aggiorna)
    const { error } = await window.supabase
        .from('site_settings')
        .upsert({ key: key, value: isEnabled }, { onConflict: 'key' });

    if (error) {
        alert("Errore aggiornamento impostazione: " + error.message);
        // Revert UI se fallisce
        checkbox.checked = !isEnabled;
    } else {
        console.log(`Setting ${key} updated to ${isEnabled}`);
    }
};

// ==========================================
// SEZIONE: GESTIONE GUEST TEACHERS
// ==========================================
window.loadGuestTeachersSettings = async () => {
    // 1. Fetch da site_settings
    const { data: settings, error } = await window.supabase
        .from('site_settings')
        .select('*')
        .in('key', ['guest_list_standard', 'guest_list_latin']);

    if (error) {
        console.error("Errore caricamento guest teachers:", error);
        return;
    }

    const stdArea = document.getElementById('admin-guest-std');
    const latArea = document.getElementById('admin-guest-lat');

    if (settings) {
        const std = settings.find(s => s.key === 'guest_list_standard');
        const lat = settings.find(s => s.key === 'guest_list_latin');

        if (std && stdArea) stdArea.value = std.value || '';
        if (lat && latArea) latArea.value = lat.value || '';
    }
};

window.saveGuestTeachers = async () => {
    const stdVal = document.getElementById('admin-guest-std').value;
    const latVal = document.getElementById('admin-guest-lat').value;

    // Mostra caricamento (opzionale)
    const btn = document.querySelector('button[onclick="saveGuestTeachers()"]');
    const oldText = btn ? btn.innerHTML : "Salva Modifiche";
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';
    }

    // Upsert Standard
    const { error: err1 } = await window.supabase
        .from('site_settings')
        .upsert({ key: 'guest_list_standard', value: stdVal }, { onConflict: 'key' });

    // Upsert Latin
    const { error: err2 } = await window.supabase
        .from('site_settings')
        .upsert({ key: 'guest_list_latin', value: latVal }, { onConflict: 'key' });

    if (err1 || err2) {
        alert("Errore salvataggio: " + (err1?.message || '') + " " + (err2?.message || ''));
    } else {
        alert("Liste Guest Teachers aggiornate con successo!");
    }

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldText;
    }
};

// ==========================================
// SEZIONE: GESTIONE PDF DOWNLOAD
// ==========================================
window.loadPDFSettings = async () => {
    // Fetch settings
    const { data: settings } = await window.supabase
        .from('site_settings')
        .select('*')
        .in('key', ['pdf_program_url', 'pdf_packages_url']);

    // Default Labels
    const progLabel = document.getElementById('current-program-link');
    const packLabel = document.getElementById('current-packages-link');
    if (progLabel) progLabel.innerHTML = 'File attuale: <em>Default</em>';
    if (packLabel) packLabel.innerHTML = 'File attuale: <em>Default</em>';

    if (settings) {
        const prog = settings.find(s => s.key === 'pdf_program_url');
        const pack = settings.find(s => s.key === 'pdf_packages_url');

        if (prog && prog.value && progLabel) {
            progLabel.innerHTML = `File attuale: <a href="${prog.value}" target="_blank" style="color:#00d2d3">Apri PDF</a>`;
        }
        if (pack && pack.value && packLabel) {
            packLabel.innerHTML = `File attuale: <a href="${pack.value}" target="_blank" style="color:#00d2d3">Apri PDF</a>`;
        }
    }
};

window.uploadPDF = async (type) => {
    // 1. Elementi UI
    const fileId = type === 'program' ? 'pdf-program-file' : 'pdf-packages-file';
    const statusId = type === 'program' ? 'pdf-program-status' : 'pdf-packages-status';
    const btnId = type === 'program' ? 'btn-upload-program' : 'btn-upload-packages';

    const fileInput = document.getElementById(fileId);
    const statusLabel = document.getElementById(statusId);
    const btn = document.getElementById(btnId);

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert("Seleziona un file PDF prima di caricare.");
        return;
    }

    const file = fileInput.files[0];
    if (file.type !== 'application/pdf') {
        alert("Il file deve essere un PDF.");
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert("Il file è troppo grande! Max 10MB.");
        return;
    }

    // 2. Blocca UI
    const oldBtnText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Caricamento...';
    statusLabel.innerText = "Caricamento su Supabase Storage...";
    statusLabel.style.color = "#aaa";

    try {
        // 3. Nome File Univoco (timestamp)
        const fileName = `${type}_${Date.now()}.pdf`;
        const bucketName = 'pdf_downloads'; // Assicuro che esista policy pubblica

        // 4. Upload Storage
        const { data, error: uploadError } = await window.supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            // Se errore bucket, proviamo a crearne uno fittizio o mostriamo errore.
            // Supabase client-side non può creare bucket.
            throw new Error("Errore Upload (Bucket 'pdf_downloads' non esiste o permessi negati?): " + uploadError.message);
        }

        // 5. Ottieni URL Pubblico
        const { data: publicURLData } = window.supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        const publicUrl = publicURLData.publicUrl;

        // 6. Salva Link in Settings
        const settingKey = type === 'program' ? 'pdf_program_url' : 'pdf_packages_url';

        const { error: dbError } = await window.supabase
            .from('site_settings')
            .upsert({ key: settingKey, value: publicUrl }, { onConflict: 'key' });

        if (dbError) throw new Error("Errore salvataggio DB: " + dbError.message);

        // Successo
        statusLabel.innerText = "Caricamento completato con successo!";
        statusLabel.style.color = "#00d2d3";
        fileInput.value = ''; // Reset input
        loadPDFSettings(); // Ricarica visualizzazione

    } catch (err) {
        console.error(err);
        statusLabel.innerText = "Errore: " + err.message;
        statusLabel.style.color = "red";
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldText; // Restore original button content (icon + text)
        // Actually oldBtnText might be just text if I read innerHTML before icon change? No, innerHTML includes icon.
        // But let's restore safely.

        if (type === 'program') btn.innerHTML = '<i class="fas fa-upload"></i> Carica & Aggiorna Programma';
        else btn.innerHTML = '<i class="fas fa-upload"></i> Carica & Aggiorna Pacchetti';
    }
};

// ==========================================
// SEZIONE: NEWSLETTER (EmailJS)
// ==========================================

// 1. CARICA STATISTICHE E IMPOSTAZIONI
window.dbNewsletterEmails = [];
window.manualNewsletterEmails = [];

window.loadNewsletterStats = async () => {
    // 0. Carica da Supabase (site_settings: newsletter_manual_emails)
    try {
        const { data: mnSetting } = await window.supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'newsletter_manual_emails')
            .maybeSingle();

        if (mnSetting && mnSetting.value) {
            // Se è JSON, parsalo. Se è stringa raw (non dovrebbe, ma per sicurezza), gestisci.
            // Assumiamo che salviamo JSON.stringify
            try {
                window.manualNewsletterEmails = JSON.parse(mnSetting.value);
            } catch (jsonErr) {
                // Fallback se fosse salvato come stringa CSV o altro
                console.warn("Manual emails not JSON", jsonErr);
                window.manualNewsletterEmails = [];
            }
        } else {
            window.manualNewsletterEmails = [];
        }
    } catch (e) {
        console.error("Errore caricamento email manuali da DB", e);
    }

    // A. Carica Template ID salvato
    const { data: settings } = await window.supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'newsletter_template_id')
        .maybeSingle();

    if (settings && settings.value) {
        document.getElementById('newsletter-template-id').value = settings.value;
    }

    // B. Conta Email Univoche
    const loader = document.getElementById('newsletter-loader');
    const stats = document.getElementById('newsletter-stats');

    loader.style.display = 'block';
    stats.style.display = 'none';

    try {
        let uniqueEmails = [];

        // 1. Tenta di usare la funzione sicura (TUTTI gli account)
        const { data: allUsers, error: rpcError } = await window.supabase.rpc('get_all_user_emails');

        if (!rpcError && allUsers) {
            console.log("Newsletter: fetched via RPC", allUsers.length);
            uniqueEmails = allUsers.map(u => u.email); // La funzione ritorna oggetti {email: "..."}
        } else {
            console.warn("Newsletter: RPC failed, falling back to registrations table.", rpcError);
            // 2. Fallback: Tabella registrations (Solo chi ha compilato il form)
            const { data: regUsers, error: regError } = await window.supabase
                .from('registrations')
                .select('user_email');

            if (regError) throw regError;
            uniqueEmails = regUsers.map(u => u.user_email);
        }

        // Filtra base
        uniqueEmails = [...new Set(uniqueEmails.filter(e => e && e.trim() !== '' && e.includes('@')))];

        // SALVA IN GLOBALE
        window.dbNewsletterEmails = uniqueEmails;

        // UPDATE UI (COMBINA CON MANUALI)
        updateNewsletterList();

    } catch (err) {
        console.error("Errore newsletter stats:", err);
        stats.innerText = "Err";
        const listContainer = document.getElementById('newsletter-email-list');
        if (listContainer) listContainer.innerText = "Errore caricamento: " + err.message;
    } finally {
        loader.style.display = 'none';
        stats.style.display = 'block';
    }
};

window.addManualEmails = async () => {
    const input = document.getElementById('manual-email-input');
    const raw = input.value;
    if (!raw.trim()) return alert("Inserisci delle email.");

    // Split su virgola, spazio o a capo
    const emails = raw.split(/[\s,]+/);
    let addedCount = 0;

    emails.forEach(e => {
        const clean = e.trim();
        // Validazione semplice
        if (clean && clean.includes('@') && clean.includes('.')) {
            if (!window.manualNewsletterEmails.includes(clean)) {
                window.manualNewsletterEmails.push(clean);
                addedCount++;
            }
        }
    });

    if (addedCount > 0) {
        // SALVA IN SUPABASE
        const { error } = await window.supabase
            .from('site_settings')
            .upsert({ key: 'newsletter_manual_emails', value: JSON.stringify(window.manualNewsletterEmails) }, { onConflict: 'key' });

        if (error) {
            alert("Errore salvataggio DB: " + error.message);
        } else {
            input.value = ''; // Pulisci input
            updateNewsletterList();
            alert(`${addedCount} email aggiunte manualmente e salvate su DB.`);
        }
    } else {
        alert("Nessuna email valida trovata o già presenti.");
    }
};

window.removeManualEmail = async (email) => {
    window.manualNewsletterEmails = window.manualNewsletterEmails.filter(e => e !== email);

    // UPDATE SUPABASE
    const { error } = await window.supabase
        .from('site_settings')
        .upsert({ key: 'newsletter_manual_emails', value: JSON.stringify(window.manualNewsletterEmails) }, { onConflict: 'key' });

    if (error) {
        console.error("Errore salvataggio rimozione", error);
        alert("Errore during saving removal: " + error.message);
    }

    updateNewsletterList();
};

window.updateNewsletterList = () => {
    // 1. Combina DB e Manuali
    let combined = [...window.dbNewsletterEmails, ...window.manualNewsletterEmails];

    // 2. Deduplica e Ordina
    combined = [...new Set(combined)];
    combined.sort();

    // 3. Update Globale per invio
    window.cachedNewsletterEmails = combined;

    // 4. Update UI
    const stats = document.getElementById('newsletter-stats');
    const listContainer = document.getElementById('newsletter-email-list');

    if (stats) stats.innerText = combined.length;

    if (listContainer) {
        if (combined.length === 0) {
            listContainer.innerHTML = '<em>Nessuna email trovata o aggiunta.</em>';
        } else {
            // Mostra DB normale, Manuali evidenziati? No, lista unica pulita.
            // Magari indichiamo quali sono manuali? Troppo complesso per ora.
            listContainer.innerHTML = combined.map(email => {
                const isManual = window.manualNewsletterEmails.includes(email) && !window.dbNewsletterEmails.includes(email);

                if (isManual) {
                    return `
                        <div style="display:flex; justify-content:space-between; align-items:center; color:#00d2d3;">
                            <span>${email} (Manuale)</span>
                            <button onclick="removeManualEmail('${email}')" style="background:none; border:none; color:#ff6b6b; cursor:pointer;" title="Rimuovi">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>`;
                } else {
                    return `<div>${email}</div>`;
                }
            }).join('');
        }
    }
};

// 2. SALVA TEMPLATE ID
window.saveNewsletterSettings = async () => {
    const val = document.getElementById('newsletter-template-id').value;
    if (!val) return alert("Inserisci un Template ID valido.");

    const btn = document.querySelector('button[onclick="saveNewsletterSettings()"]');
    const originalText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';

    const { error } = await window.supabase
        .from('site_settings')
        .upsert({ key: 'newsletter_template_id', value: val }, { onConflict: 'key' });

    btn.disabled = false; btn.innerHTML = originalText;

    if (error) alert("Errore salvataggio: " + error.message);
    else alert("Template ID salvato con successo!");
};

// 3. INVIA NEWSLETTER (Test o Tutte)
window.sendNewsletter = async (isTest) => {
    // Controlli preliminari
    const templateId = document.getElementById('newsletter-template-id').value;
    const subject = document.getElementById('newsletter-subject').value;
    const message = document.getElementById('newsletter-message').value;

    if (!templateId) return alert("Manca il Template ID nelle impostazioni!");
    if (!subject) return alert("Inserisci un Oggetto.");
    if (!message) return alert("Inserisci un Messaggio.");

    const SERVICE_ID = "service_fik9j1g"; // Fisso da email_service.js

    // --- MODO TEST ---
    if (isTest) {
        const testEmail = document.getElementById('newsletter-test-email').value;
        if (!testEmail) return alert("Inserisci un'email di test.");

        const btn = document.querySelector('button[onclick="sendNewsletter(true)"]');
        btn.disabled = true; btn.innerHTML = "Invio in corso...";

        try {
            await emailjs.send(SERVICE_ID, templateId, {
                to_email: testEmail,
                subject: subject,
                message: message
            });
            alert("Email di test inviata a: " + testEmail);
        } catch (err) {
            console.error(err);
            alert("Errore invio test: " + JSON.stringify(err));
        } finally {
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Invia Test';
        }
        return;
    }

    // --- MODO TUTTI (BULK) ---
    if (!window.cachedNewsletterEmails || window.cachedNewsletterEmails.length === 0) {
        await loadNewsletterStats(); // Riprova a caricare se vuoto
        if (!window.cachedNewsletterEmails || window.cachedNewsletterEmails.length === 0) {
            return alert("Nessun destinatario trovato.");
        }
    }

    const recipients = window.cachedNewsletterEmails;
    const confirmMsg = `Stai per inviare questa email a ${recipients.length} utenti. Sei sicuro?`;
    if (!confirm(confirmMsg)) return;

    // UI Progress
    const progressContainer = document.getElementById('newsletter-progress-container');
    const progressBar = document.getElementById('newsletter-progress-bar');
    const progressText = document.getElementById('newsletter-progress-text');
    const btnAll = document.getElementById('btn-send-all');

    progressContainer.style.display = 'block';
    btnAll.disabled = true;
    let successCount = 0;
    let failCount = 0;

    // Loop con ritardo (Rate Limiting per evitare blocco browser/API)
    for (let i = 0; i < recipients.length; i++) {
        const email = recipients[i];

        // Aggiorna UI
        const percent = Math.round(((i + 1) / recipients.length) * 100);
        progressBar.style.width = percent + "%";
        progressText.innerText = `Invio ${i + 1}/${recipients.length} (${email})`;

        try {
            await emailjs.send(SERVICE_ID, templateId, {
                to_email: email,
                subject: subject,
                message: message
            });
            successCount++;
        } catch (err) {
            console.error("Errore invio a " + email, err);
            failCount++;
        }

        // Attesa 500ms tra le email
        await new Promise(r => setTimeout(r, 500));
    }

    // Fine
    alert(`Completato!\nInviate con successo: ${successCount}\nErrori: ${failCount}`);
    btnAll.disabled = false;
    progressContainer.style.display = 'none';
};  