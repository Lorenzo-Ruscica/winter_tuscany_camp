




let teacherSelectAvail;
let teacherSelectPrint;

const ADMIN_PAGE_SIZE = 28;
window.__lastStandardBookings = [];
window.__balancesAllRows = [];

window.adminPagerState = {
    accounting: { page: 1 },
    balances: { page: 1 },
    messages: { page: 1 },
    registrations: { page: 1 },
    teachers: { page: 1 },
    systemUsers: { page: 1 }
};

function renderPagerUI(containerId, stateKey, page, totalItems) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    const pages = Math.max(1, Math.ceil(totalItems / ADMIN_PAGE_SIZE));
    if (totalItems <= ADMIN_PAGE_SIZE) {
        wrap.hidden = true;
        wrap.innerHTML = '';
        return;
    }
    wrap.hidden = false;
    const start = (page - 1) * ADMIN_PAGE_SIZE + 1;
    const end = Math.min(page * ADMIN_PAGE_SIZE, totalItems);
    wrap.innerHTML = `
        <span>Mostrando ${start}–${end} di ${totalItems}</span>
        <div class="admin-pager__btns">
            <button type="button" ${page <= 1 ? 'disabled' : ''} onclick="adminPagerGo('${stateKey}', ${page - 1})">Indietro</button>
            <span>Pagina ${page} / ${pages}</span>
            <button type="button" ${page >= pages ? 'disabled' : ''} onclick="adminPagerGo('${stateKey}', ${page + 1})">Avanti</button>
        </div>
    `;
}

window.adminPagerGo = (stateKey, newPage) => {
    const st = window.adminPagerState[stateKey];
    if (!st) return;

    const totalFor = () => {
        if (stateKey === 'accounting') return (window.__lastStandardBookings || []).length;
        if (stateKey === 'balances') return window.__balancesFilteredCount || 0;
        if (stateKey === 'messages') return (window.__messagesList || []).length;
        if (stateKey === 'registrations') return (window.__registrationsList || []).length;
        if (stateKey === 'teachers') return (window.__teachersList || []).length;
        if (stateKey === 'systemUsers') return (window.__systemUsersList || []).length;
        return 0;
    };

    const total = totalFor();
    const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
    st.page = Math.min(Math.max(1, newPage), pages);

    if (stateKey === 'accounting') applyBookingFilter();
    else if (stateKey === 'balances') renderBalancesTablePage();
    else if (stateKey === 'messages') renderMessagesPage();
    else if (stateKey === 'registrations') renderRegistrationsPage();
    else if (stateKey === 'teachers') renderTeachersPage();
    else if (stateKey === 'systemUsers') renderSystemUsersPage();
};

function initAdminMobileMenu() {
    const mobileBtn = document.getElementById('mobile-toggle-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('adminSidebar');
    const body = document.body;
    if (!sidebar) return;

    if (mobileBtn) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.add('sidebar-open');
            body.classList.add('menu-active');
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('sidebar-open');
            body.classList.remove('menu-active');
        });
    }
    document.addEventListener('click', (e) => {
        if (!body.classList.contains('menu-active')) return;
        if (sidebar.contains(e.target) || e.target === mobileBtn) return;
        sidebar.classList.remove('sidebar-open');
        body.classList.remove('menu-active');
    });
    document.querySelectorAll('.nav-btn').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                sidebar.classList.remove('sidebar-open');
                body.classList.remove('menu-active');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async () => {

    
    const { data: { session } } = await window.supabase.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // Verifica admin dal database o whitelist
    const userEmail = (session.user.email || "").toLowerCase().trim();
    const fallbackAdmins = ["lorenzo.ruscica@outlook.it", "admin@tuscanycamp.com", "mirko@gozzoli.com", "admin@wintertuscanycamp.it"];
    let isAdmin = fallbackAdmins.includes(userEmail);

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

    if (!isAdmin) {
        alert("ACCESSO NEGATO: Non sei un amministratore autorizzato.");
        window.location.href = 'index.html';
        return;
    }


    
    teacherSelectAvail = document.getElementById('avail-teacher');
    teacherSelectPrint = document.getElementById('print-teacher');

    
    initAdminMobileMenu();
    loadTeachers();
    loadActiveShifts();
    loadCurrentTimer();
});







window.showTab = (tabId, el) => {
    const dashboardSection = document.getElementById('section-dashboard');

    if (dashboardSection) dashboardSection.style.display = 'block';

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    if (el && el.classList) {
        el.classList.add('active');
    } else {
        const navBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
        if (navBtn) navBtn.classList.add('active');
    }

    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const tab = document.getElementById('tab-' + tabId);
    if (tab) tab.classList.add('active');

    
    if (tabId === 'accounting') { loadAllBookings(); adminBookingInitUsers(); }
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
    if (tabId === 'timer') loadCurrentTimer();
};


window.logout = async () => {
    await window.supabase.auth.signOut();
    window.location.href = 'index.html';
};


window.loadTeachers = async () => {
    const { data: teachers } = await window.supabase.from('teachers').select('*').order('full_name');
    if (!teachers) return;

    
    window.__allTeachers = teachers;

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

    
    const startMin = timeToMinutes(startStr);
    const endMin = startMin + duration;
    const startObj = new Date(); startObj.setHours(Math.floor(startMin / 60), startMin % 60, 0); const fullStartTime = `${String(startObj.getHours()).padStart(2, '0')}:${String(startObj.getMinutes()).padStart(2, '0')}:00`;
    const endObj = new Date(); endObj.setHours(Math.floor(endMin / 60), endMin % 60, 0); const fullEndTime = `${String(endObj.getHours()).padStart(2, '0')}:${String(endObj.getMinutes()).padStart(2, '0')}:00`;

    
    const { data: availabilities } = await window.supabase
        .from('teacher_availability')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('available_date', date);

    if (!availabilities || availabilities.length === 0) {
        return alert("Questo insegnante non ha disponibilità per questa data.");
    }

    
    let fitsInBlock = false;
    availabilities.forEach(block => {
        const blockStart = timeToMinutes(block.start_hour);
        const blockEnd = timeToMinutes(block.end_hour);
        if (startMin >= blockStart && endMin <= blockEnd) fitsInBlock = true;
    });

    if (!fitsInBlock) {
        return alert("Orario non valido: deve rientrare nelle disponibilità (Turni) dell'insegnante.");
    }

    
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
            
            if (startMin < bEnd && endMin > bStart) isConflict = true;
        });
    }

    if (isConflict) {
        return alert("Errore: Orario sovrapposto a un'altra prenotazione esistente.");
    }

    
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) return alert("Sessione scaduta.");

    
    
    
    const { error } = await window.supabase.from('bookings').insert({
        teacher_id: teacherId,
        lesson_date: date,
        start_time: fullStartTime,
        end_time: fullEndTime,
        lesson_price: 0,
        admin_notes: type + " (Admin)",
        staff_pay: pay ? parseFloat(pay) : null, 
        lesson_type: type.toLowerCase(), 
        status: 'confirmed'
    });

    if (error) alert("Errore DB: " + error.message);
    else {
        alert("Slot bloccato con successo!");
        loadSpecialBookings();
    }
};

window.loadActiveShifts = async () => {
    const { data: shifts } = await window.supabase
        .from('teacher_availability')
        .select('*, teachers(full_name)')
        .order('available_date', { ascending: true })
        .limit(2000);

    const list = document.getElementById('avail-list');
    if (list) {
        list.innerHTML = '';
        if (shifts) {
            shifts.forEach(s => {
                list.innerHTML += `
                    <div class="shift-card">
                        <strong>${s.teachers?.full_name || 'Insegnante non trovato'}</strong><br>
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

// ============================================================
// ADMIN BOOKING — Prenota lezione per conto di un utente
// ============================================================
(function () {
    // Stato interno del pannello
    const ab = {
        userId: null,
        teacherId: null,
        teacherPrice: 0,
        selectedDate: null,
        selectedTime: null,
    };

    // Helpers tempo (identici a booking.js)
    function abTimeToMins(t) { if (!t) return 0; const [h, m] = t.split(':'); return h * 60 + +m; }
    function abMinsToTime(mins) { return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`; }
    function abFormatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    // ── Step 0: Popola select utenti ────────────────────────────
    window.adminBookingInitUsers = async () => {
        const sel = document.getElementById('ab-user-select');
        if (!sel) return;
        sel.innerHTML = '<option value="">Caricamento...</option>';

        const { data: regs } = await window.supabase
            .from('registrations')
            .select('id, user_id, full_name')
            .order('full_name');

        if (!regs || regs.length === 0) {
            sel.innerHTML = '<option value="">Nessun utente registrato</option>';
            return;
        }

        sel.innerHTML = '<option value="">— Scegli coppia / utente —</option>';
        regs.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.user_id || r.id;
            opt.dataset.regId = r.id;
            opt.textContent = r.full_name;
            sel.appendChild(opt);
        });
    };

    // ── Step 1: Utente selezionato → sblocca select insegnante ──
    window.adminBookingOnUserChange = () => {
        const sel = document.getElementById('ab-user-select');
        ab.userId = sel.value || null;
        ab.selectedDate = null;
        ab.selectedTime = null;

        // Reset pannello
        const teachSel = document.getElementById('ab-teacher-select');
        teachSel.disabled = !ab.userId;

        document.getElementById('ab-date-group').style.display = 'none';
        document.getElementById('ab-time-group').style.display = 'none';
        document.getElementById('ab-confirm-btn').style.display = 'none';
        document.getElementById('ab-confirm-label').textContent = '';

        if (!ab.userId) return;

        // Popola insegnanti (dalla cache globale)
        const teachers = window.__allTeachers || [];
        teachSel.innerHTML = '<option value="">— Scegli insegnante —</option>';
        teachers.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.dataset.price = t.base_price || 0;
            opt.textContent = t.full_name;
            teachSel.appendChild(opt);
        });
        teachSel.disabled = false;

        // Abilita prezzo
        document.getElementById('ab-price').disabled = false;
    };

    // ── Step 2: Insegnante selezionato → carica date disponibili ─
    window.adminBookingOnTeacherChange = async () => {
        const sel = document.getElementById('ab-teacher-select');
        ab.teacherId = sel.value || null;
        ab.teacherPrice = parseFloat(sel.selectedOptions[0]?.dataset.price || 0) || 0;
        ab.selectedDate = null;
        ab.selectedTime = null;

        document.getElementById('ab-price').value = ab.teacherPrice || '';
        document.getElementById('ab-date-group').style.display = 'none';
        document.getElementById('ab-time-group').style.display = 'none';
        document.getElementById('ab-confirm-btn').style.display = 'none';
        document.getElementById('ab-confirm-label').textContent = '';

        if (!ab.teacherId) return;

        const datesBox = document.getElementById('ab-dates-container');
        datesBox.innerHTML = '<span class="admin-muted-msg"><i class="fas fa-spinner fa-spin"></i> Caricamento date…</span>';
        document.getElementById('ab-date-group').style.display = 'block';

        const { data: avails } = await window.supabase
            .from('teacher_availability')
            .select('available_date')
            .eq('teacher_id', ab.teacherId)
            .order('available_date', { ascending: true });

        if (!avails || avails.length === 0) {
            datesBox.innerHTML = '<span class="admin-muted-msg" style="color:#00B4D8;">Nessuna data disponibile per questo insegnante.</span>';
            return;
        }

        const uniqueDates = [...new Set(avails.map(a => a.available_date))];
        datesBox.innerHTML = '';
        uniqueDates.forEach(dateStr => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = abFormatDate(dateStr);
            btn.dataset.date = dateStr;
            btn.style.cssText = 'padding:6px 14px; border-radius:999px; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.05); color:#ddd; cursor:pointer; font-size:0.85rem; font-family:inherit; transition:all 0.15s;';
            btn.onmouseover = () => { if (!btn.classList.contains('ab-selected')) btn.style.background = 'rgba(0,210,211,0.15)'; };
            btn.onmouseout = () => { if (!btn.classList.contains('ab-selected')) btn.style.background = 'rgba(255,255,255,0.05)'; };
            btn.onclick = () => abSelectDate(btn, dateStr);
            datesBox.appendChild(btn);
        });
    };

    // ── Step 3: Data selezionata → carica slot ───────────────────
    async function abSelectDate(btn, dateStr) {
        // Deseleziona tutte
        document.querySelectorAll('#ab-dates-container button').forEach(b => {
            b.classList.remove('ab-selected');
            b.style.background = 'rgba(255,255,255,0.05)';
            b.style.color = '#ddd';
            b.style.borderColor = 'rgba(255,255,255,0.2)';
        });
        btn.classList.add('ab-selected');
        btn.style.background = 'var(--admin-cyan)';
        btn.style.color = '#000';
        btn.style.borderColor = 'var(--admin-cyan)';

        ab.selectedDate = dateStr;
        ab.selectedTime = null;
        document.getElementById('ab-confirm-btn').style.display = 'none';
        document.getElementById('ab-confirm-label').textContent = '';

        const slotsBox = document.getElementById('ab-slots-container');
        slotsBox.innerHTML = '<span class="admin-muted-msg"><i class="fas fa-spinner fa-spin"></i> Caricamento slot…</span>';
        document.getElementById('ab-time-group').style.display = 'block';

        // Carica turni + prenotazioni esistenti in parallelo
        const [{ data: shifts }, { data: taken }] = await Promise.all([
            window.supabase.from('teacher_availability').select('*').eq('teacher_id', ab.teacherId).eq('available_date', dateStr),
            window.supabase.from('bookings').select('id, start_time, end_time').eq('teacher_id', ab.teacherId).eq('lesson_date', dateStr).neq('status', 'cancelled'),
        ]);

        slotsBox.innerHTML = '';

        if (!shifts || shifts.length === 0) {
            slotsBox.innerHTML = '<span class="admin-muted-msg">Nessun turno disponibile in questa data.</span>';
            return;
        }

        shifts.forEach(shift => abGenerateSlots(shift.start_hour, shift.end_hour, taken || [], slotsBox));
    }

    function abGenerateSlots(startStr, endStr, takenBookings, container) {
        let current = abTimeToMins(startStr);
        const shiftEnd = abTimeToMins(endStr);
        const duration = 45;
        let hasSlots = false;

        while (current + duration <= shiftEnd) {
            hasSlots = true;
            const timeStr = abMinsToTime(current);
            const slotStart = current;
            const slotEnd = current + duration;

            const isTaken = takenBookings.some(b => {
                const bS = abTimeToMins(b.start_time);
                const bE = abTimeToMins(b.end_time);
                return slotStart < bE && slotEnd > bS;
            });

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = timeStr.slice(0, 5);
            btn.dataset.time = timeStr;

            if (isTaken) {
                btn.style.cssText = 'padding:6px 14px; border-radius:8px; border:1px solid rgba(0, 180, 216,0.3); background:rgba(0, 180, 216,0.08); color:#666; cursor:not-allowed; font-size:0.85rem; font-family:inherit;';
                btn.disabled = true;
                btn.title = 'Slot già occupato';
            } else {
                btn.style.cssText = 'padding:6px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.05); color:#ddd; cursor:pointer; font-size:0.85rem; font-family:inherit; transition:all 0.15s;';
                btn.onmouseover = () => { if (!btn.classList.contains('ab-sel-time')) btn.style.background = 'rgba(0,210,211,0.15)'; };
                btn.onmouseout = () => { if (!btn.classList.contains('ab-sel-time')) btn.style.background = 'rgba(255,255,255,0.05)'; };
                btn.onclick = () => abSelectTime(btn, timeStr);
            }

            container.appendChild(btn);
            current += duration;
        }

        if (!hasSlots) {
            container.innerHTML += '<span class="admin-muted-msg">Nessuno slot generato per questo turno.</span>';
        }
    }

    // ── Step 4: Orario selezionato ───────────────────────────────
    function abSelectTime(btn, timeStr) {
        document.querySelectorAll('#ab-slots-container button:not(:disabled)').forEach(b => {
            b.classList.remove('ab-sel-time');
            b.style.background = 'rgba(255,255,255,0.05)';
            b.style.color = '#ddd';
            b.style.borderColor = 'rgba(255,255,255,0.2)';
        });
        btn.classList.add('ab-sel-time');
        btn.style.background = 'var(--admin-cyan)';
        btn.style.color = '#000';
        btn.style.borderColor = 'var(--admin-cyan)';

        ab.selectedTime = timeStr;

        const price = parseFloat(document.getElementById('ab-price').value) || ab.teacherPrice;
        const endTime = abMinsToTime(abTimeToMins(timeStr) + 45).slice(0, 5);
        document.getElementById('ab-confirm-btn').style.display = 'inline-flex';
        document.getElementById('ab-confirm-label').textContent =
            `${abFormatDate(ab.selectedDate)} · ${timeStr.slice(0,5)}–${endTime} · € ${price}`;
    }

    // ── Step 5: Conferma prenotazione ────────────────────────────
    window.adminBookingConfirm = async () => {
        const btn = document.getElementById('ab-confirm-btn');
        const userSel = document.getElementById('ab-user-select');

        if (!ab.userId || !ab.teacherId || !ab.selectedDate || !ab.selectedTime) {
            alert('Compila tutti i campi prima di confermare.');
            return;
        }

        const price = parseFloat(document.getElementById('ab-price').value);
        if (isNaN(price) || price < 0) {
            alert('Inserisci un prezzo valido.');
            return;
        }

        const endTime = abMinsToTime(abTimeToMins(ab.selectedTime) + 45);

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio…';

        const { error } = await window.supabase.from('bookings').insert({
            user_id: ab.userId,
            teacher_id: ab.teacherId,
            lesson_date: ab.selectedDate,
            start_time: ab.selectedTime,
            end_time: endTime,
            lesson_price: price,
            lesson_type: 'private',
            status: 'confirmed',
            admin_notes: 'Prenotato da Admin',
        });

        if (error) {
            alert('Errore: ' + error.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check"></i> Conferma prenotazione';
            return;
        }

        btn.innerHTML = '<i class="fas fa-check"></i> Prenotato!';
        btn.style.background = '#00b89c';
        document.getElementById('ab-confirm-label').textContent = '✓ Lezione inserita con successo';

        // Reset dopo 2 secondi
        setTimeout(() => {
            ab.userId = null; ab.teacherId = null; ab.selectedDate = null; ab.selectedTime = null;
            document.getElementById('ab-user-select').value = '';
            document.getElementById('ab-teacher-select').innerHTML = '<option value="">Seleziona prima l\'utente…</option>';
            document.getElementById('ab-teacher-select').disabled = true;
            document.getElementById('ab-price').value = '';
            document.getElementById('ab-price').disabled = true;
            document.getElementById('ab-date-group').style.display = 'none';
            document.getElementById('ab-time-group').style.display = 'none';
            btn.style.display = 'none';
            btn.style.background = '';
            btn.innerHTML = '<i class="fas fa-check"></i> Conferma prenotazione';
            btn.disabled = false;
            document.getElementById('ab-confirm-label').textContent = '';
            // Ricarica contabilità
            loadAllBookings();
        }, 2000);
    };
})();


window.loadSchedule = async () => {
    const teacherId = teacherSelectPrint.value;
    const date = document.getElementById('print-date').value;

    if (!teacherId || !date) return;

    const teacherName = teacherSelectPrint.options[teacherSelectPrint.selectedIndex].text;
    document.getElementById('sheet-teacher-name').innerText = teacherName;
    document.getElementById('sheet-date').innerText = "Data: " + date.split('-').reverse().join('/');

    const tbody = document.getElementById('schedule-body');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Caricamento…</td></tr>';

    // Fetch shifts AND bookings in parallel
    const [{ data: shifts }, { data: bookings }] = await Promise.all([
        window.supabase
            .from('teacher_availability')
            .select('*')
            .eq('teacher_id', teacherId)
            .eq('available_date', date)
            .order('start_hour'),
        window.supabase
            .from('bookings')
            .select('*, registrations(full_name)')
            .eq('teacher_id', teacherId)
            .eq('lesson_date', date)
            .neq('status', 'cancelled')
            .order('start_time'),
    ]);

    tbody.innerHTML = '';

    if (!shifts || shifts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Nessun turno impostato per questo giorno.</td></tr>';
        return;
    }

    // Helper: "HH:MM" or "HH:MM:SS" → minutes since midnight
    function toMins(t) {
        if (!t) return 0;
        const [h, m] = t.split(':');
        return parseInt(h, 10) * 60 + parseInt(m, 10);
    }
    function fmtTime(mins) {
        return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    }

    const SLOT_DURATION = 45; // minutes

    // Build a map: slotStartMins → booking object (if any)
    const bookingMap = {};
    (bookings || []).forEach(b => {
        const key = toMins(b.start_time);
        bookingMap[key] = b;
    });

    // Track which minutes are "covered" by a booking (to skip mid-booking slots)
    const coveredRanges = (bookings || []).map(b => ({
        start: toMins(b.start_time),
        end:   toMins(b.end_time),
    }));

    function isCoveredMidSlot(slotStart) {
        // Returns true if slotStart falls inside a booking but is NOT the booking's start
        return coveredRanges.some(r => slotStart > r.start && slotStart < r.end);
    }

    let rowsAdded = 0;

    shifts.forEach(shift => {
        const shiftStart = toMins(shift.start_hour);
        const shiftEnd   = toMins(shift.end_hour);

        let cursor = shiftStart;

        while (cursor < shiftEnd) {
            // Skip minutes that fall inside the middle of a longer booking
            if (isCoveredMidSlot(cursor)) {
                cursor += SLOT_DURATION;
                continue;
            }

            const booking = bookingMap[cursor];

            if (booking) {
                // ── Booked slot ─────────────────────────────────────────
                let coupleName = "Utente non trovato";
                if (booking.registrations?.full_name) coupleName = booking.registrations.full_name;
                else if (booking.user_id) coupleName = "ID: " + booking.user_id.slice(0, 5);

                const isSpecialClass = booking.lesson_type === 'lecture' || booking.lesson_type === 'group lesson';
                const displayCouple  = isSpecialClass ? booking.lesson_type.toUpperCase() : coupleName;
                const displayRoom    = isSpecialClass ? 'Hall 1st Floor' : (booking.admin_notes || 'Sala A');

                const bookingDuration = toMins(booking.end_time) - toMins(booking.start_time);
                const slotEnd = fmtTime(toMins(booking.end_time));

                tbody.innerHTML += `
                    <tr>
                        <td>${fmtTime(cursor)} - ${slotEnd}</td>
                        <td><strong>${displayCouple}</strong></td>
                        <td>${displayRoom}</td>
                        <td></td>
                    </tr>`;

                cursor = toMins(booking.end_time);
            } else {
                // ── Free slot ────────────────────────────────────────────
                const slotEnd = Math.min(cursor + SLOT_DURATION, shiftEnd);
                tbody.innerHTML += `
                    <tr class="free-slot-row">
                        <td style="color:#aaa;">${fmtTime(cursor)} - ${fmtTime(slotEnd)}</td>
                        <td style="color:#bbb; font-style:italic; letter-spacing:0.03em;">— Libero —</td>
                        <td style="color:#aaa;"></td>
                        <td></td>
                    </tr>`;

                cursor += SLOT_DURATION;
            }

            rowsAdded++;
        }
    });

    if (rowsAdded === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Nessuno slot nel turno.</td></tr>';
    }
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


let currentBookings = [];

window.loadAllBookings = async () => {
    const { data: bookings } = await window.supabase
        .from('bookings')
        .select('*, teachers(full_name, pay_rate), registrations(full_name)')
        .order('lesson_date', { ascending: false })
        .limit(5000); 

    currentBookings = bookings || [];
    window.adminPagerState.accounting.page = 1;
    applyBookingFilter();
};

window.searchBookings = () => {
    window.adminPagerState.accounting.page = 1;
    applyBookingFilter();
};

function getFilteredBookings() {
    const input = document.getElementById('search-booking');
    const term = input ? input.value.toLowerCase() : '';

    const dateFrom = document.getElementById('filter-date-from')?.value;
    const dateTo = document.getElementById('filter-date-to')?.value;

    return currentBookings.filter(b => {
        const teacherName = b.teachers?.full_name?.toLowerCase() || '';
        const userName = b.registrations?.full_name?.toLowerCase() || '';
        const matchesTerm = teacherName.includes(term) || userName.includes(term);

        let matchesDate = true;
        if (dateFrom && b.lesson_date < dateFrom) matchesDate = false;
        if (dateTo && b.lesson_date > dateTo) matchesDate = false;

        return matchesTerm && matchesDate;
    });
}

function applyBookingFilter() {
    const filtered = getFilteredBookings();

    const standardBookings = filtered.filter(b => !b.lesson_type || b.lesson_type === 'private');
    window.__lastStandardBookings = standardBookings;

    const st = window.adminPagerState.accounting;
    const pages = Math.max(1, Math.ceil(standardBookings.length / ADMIN_PAGE_SIZE));
    if (st.page > pages) st.page = pages;

    renderAccountingTable(standardBookings);
    updateTeacherHours(filtered);
    updateStaffPay(filtered);
}

window.downloadAccountingPDF = () => {
    if (typeof html2pdf === 'undefined') {
        return alert("Libreria PDF non caricata.");
    }

    const filtered = getFilteredBookings();
    const standardBookings = filtered.filter(b => !b.lesson_type || b.lesson_type === 'private');

    if (!standardBookings || standardBookings.length === 0) {
        return alert("Nessuna prenotazione da esportare nel PDF con i filtri attuali.");
    }

    const dateFrom = document.getElementById('filter-date-from')?.value;
    const dateTo = document.getElementById('filter-date-to')?.value;
    const term = document.getElementById('search-booking')?.value || '';

    let filterText = [];
    if (term) filterText.push(`Ricerca: "${term}"`);
    if (dateFrom) filterText.push(`Dal: ${dateFrom.split('-').reverse().join('/')}`);
    if (dateTo) filterText.push(`Al: ${dateTo.split('-').reverse().join('/')}`);
    const filterDisplay = filterText.length > 0 ? filterText.join(' | ') : 'Nessun filtro attivo (Tutti i dati)';

    const printDiv = document.createElement('div');
    printDiv.style.padding = '30px';
    printDiv.style.color = '#333';
    printDiv.style.backgroundColor = '#fff';
    printDiv.style.fontFamily = "'Outfit', 'Helvetica Neue', Arial, sans-serif";

    
    let html = `
        <style>
            .pdf-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            .pdf-table th, .pdf-table td { border: 1px solid #e0e0e0; padding: 10px; text-align: left; }
            .pdf-table th { background-color: #00B4D8; color: white; font-weight: bold; text-transform: uppercase; font-size: 10px;}
            .pdf-table tr { page-break-inside: avoid; }
            .pdf-table tr:nth-child(even) { background-color: #fcfcfc; }
            .pdf-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #00d2d3; padding-bottom: 20px; }
            .pdf-header h1 { color: #00B4D8; margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 1px; }
            .pdf-header h2 { color: #333; margin: 5px 0; font-size: 18px; }
            .pdf-header p { color: #666; margin: 0; font-size: 12px; }
            .pdf-footer { margin-top: 40px; font-size: 10px; color: #888; text-align: right; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
        <div class="pdf-header">
            <h1>Winter Tuscany Camp</h1>
            <h2>Report Contabilità - Lezioni Private</h2>
            <p>${filterDisplay}</p>
        </div>
        <table class="pdf-table">
            <thead>
                <tr>
                    <th width="8%">ID</th>
                    <th width="15%">Data</th>
                    <th width="12%">Ora</th>
                    <th width="25%">Insegnante</th>
                    <th width="25%">Utente / Coppia</th>
                    <th width="10%">Prezzo</th>
                    <th width="5%">Stato</th>
                </tr>
            </thead>
            <tbody>
    `;

    let totaleCosti = 0;

    standardBookings.forEach(b => {
        const coupleName = b.registrations?.full_name || "N/A";
        const teacherName = b.teachers?.full_name || "N/A";
        const dateStr = b.lesson_date ? b.lesson_date.split('-').reverse().join('/') : '';
        const timeStr = b.start_time ? b.start_time.slice(0, 5) : '';
        const price = parseFloat(b.lesson_price) || 0;

        let rowStyle = b.status === 'cancelled' ? 'color: #aaa; text-decoration: line-through;' : '';
        let badgeStyle = '';
        if (b.status === 'confirmed') badgeStyle = 'color: #2ecc71; font-weight: bold;';
        if (b.status === 'cancelled') badgeStyle = 'color: #e74c3c;';

        if (b.status !== 'cancelled') {
            totaleCosti += price;
        }

        html += `
            <tr style="${rowStyle}">
                <td>#${b.id}</td>
                <td><strong>${dateStr}</strong></td>
                <td>${timeStr}</td>
                <td>${teacherName}</td>
                <td style="font-weight: bold; color: #333;">${coupleName}</td>
                <td>€ ${price}</td>
                <td style="${badgeStyle}">${b.status.substring(0, 4)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <div style="margin-top: 20px; text-align: right; padding: 15px; background: #f9f9f9; border-radius: 5px; border: 1px solid #eee;">
            <h3 style="margin: 0; color: #333; font-size: 16px;">
                Totale Registrato: <span style="color: #00B4D8;">€ ${totaleCosti}</span>
            </h3>
            <p style="margin: 5px 0 0 0; font-size: 10px; color: #888;">* I valori sbarrati (annullati) non sono conteggiati</p>
        </div>

        <div class="pdf-footer">
            Generato dal Sistema Admin Winter Tuscany Camp il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}
        </div>
    `;

    printDiv.innerHTML = html;

    const opt = {
        margin: [10, 10, 10, 10],
        filename: 'Report_Contabilita.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(printDiv).save().catch(err => alert("Errore generazione PDF: " + err.message));
};




window.__unpaidIdsData = {};

function renderBalancesTablePage() {
    const tbody = document.getElementById('balances-body');
    if (!tbody || !window.__balancesAllRows) return;

    const term = (document.getElementById('search-balance')?.value || '').toLowerCase();
    const filtered = window.__balancesAllRows.filter(r => r.nameLower.includes(term));
    window.__balancesFilteredCount = filtered.length;

    const st = window.adminPagerState.balances;
    const pages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
    if (st.page > pages) st.page = pages;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nessun risultato.</td></tr>';
        renderPagerUI('balances-pager', 'balances', st.page, 0);
        return;
    }

    const slice = filtered.slice((st.page - 1) * ADMIN_PAGE_SIZE, st.page * ADMIN_PAGE_SIZE);
    tbody.innerHTML = slice.map(r => r.htmlRow).join('');
    renderPagerUI('balances-pager', 'balances', st.page, filtered.length);
}

window.__allUserBookings = {}; 

window.loadBalances = async () => {
    const tbody = document.getElementById('balances-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Caricamento...</td></tr>';

    try {
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

        const { data: bookings, error } = await window.supabase
            .from('bookings')
            .select('*, registrations(full_name), teachers(full_name)')
            .neq('status', 'cancelled')
            .order('lesson_date', { ascending: true });

        if (error) throw error;

        const usersData = {};
        window.__unpaidIdsData = {};
        window.__allUserBookings = {};

        bookings.forEach(b => {
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
            if (!window.__allUserBookings[uid]) {
                window.__allUserBookings[uid] = [];
            }
            window.__allUserBookings[uid].push({ ...b, _isPaid: paidBookings.includes(b.id) });

            const isPaid = paidBookings.includes(b.id);
            if (isPaid) {
                usersData[uid].paidCount++;
            } else {
                usersData[uid].unpaidCount++;
                usersData[uid].unpaidIds.push(b.id);
                usersData[uid].totalOwed += parseFloat(b.lesson_price) || 0;
            }
        });

        window.__balancesAllRows = [];
        let hasData = false;

        for (const uid in usersData) {
            const d = usersData[uid];
            if (d.paidCount === 0 && d.unpaidCount === 0) continue;
            hasData = true;

            const statusHtml = d.unpaidCount > 0
                ? `<span style="color:#00B4D8; font-weight:bold;"><i class="fas fa-exclamation-triangle"></i> Da saldare</span>`
                : `<span style="color:#00d2d3; font-weight:bold;"><i class="fas fa-check-circle"></i> Tutto saldato</span>`;

            const nameEncoded = encodeURIComponent(d.name);
            let actionsHtml = `<button type="button" class="btn-add btn-add--sm" style="background:var(--admin-cyan); color:#000;" onclick="openUserLessons('${uid}', decodeURIComponent('${nameEncoded}'))"><i class="fas fa-list-ul"></i> Vedi lezioni</button>`;

            if (d.unpaidCount > 0) {
                actionsHtml += `<button type="button" class="btn-add btn-add--sm" onclick="markAsPaid('${uid}')"><i class="fas fa-check"></i> Segna saldato (€${d.totalOwed})</button>`;
            } else {
                actionsHtml += `<span style="color:#aaa; font-style:italic; font-size:0.8rem;">Tutto saldato</span>`;
            }

            if (d.paidCount > 0) {
                actionsHtml += `<button type="button" class="btn-cancel btn-add--sm" style="margin-top:2px;" onclick="revertAllUserPayments('${uid}')"><i class="fas fa-undo"></i> Resetta</button>`;
            }

            window.__unpaidIdsData[uid] = d.unpaidIds;

            const htmlRow = `
                <tr data-name="${d.name.toLowerCase()}" data-owed="${d.totalOwed}" data-unpaid-count="${d.unpaidCount}" data-uid="${uid}">
                    <td><strong>${d.name}</strong></td>
                    <td><b style="color:var(--color-hot-pink);">${d.unpaidCount}</b> <span style="font-size:0.8rem; color:#aaa;">(Pagate: ${d.paidCount})</span></td>
                    <td style="font-weight:bold; color:var(--color-hot-pink);">€ ${d.totalOwed}</td>
                    <td>${statusHtml}</td>
                    <td><div style="display: flex; flex-direction: column; gap: 5px; align-items: flex-start;">${actionsHtml}</div></td>
                </tr>`;

            window.__balancesAllRows.push({
                nameLower: d.name.toLowerCase(),
                htmlRow,
                name: d.name,
                unpaidCount: d.unpaidCount,
                totalOwed: d.totalOwed
            });
        }

        if (!hasData) {
            window.__balancesAllRows = [];
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nessuna lezione privata trovata.</td></tr>';
            renderPagerUI('balances-pager', 'balances', 1, 0);
            return;
        }

        window.adminPagerState.balances.page = 1;
        renderBalancesTablePage();
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Errore caricamento dati: ' + err.message + '</td></tr>';
    }
};




window.openUserLessons = (uid, userName) => {
    const modal = document.getElementById('user-lessons-modal');
    const title = document.getElementById('user-lessons-modal-title');
    const body = document.getElementById('user-lessons-modal-body');
    if (!modal) return;

    title.innerHTML = `<i class="fas fa-list-ul" style="margin-right:0.5rem;"></i>Lezioni di <span style="color:#fff;">${userName}</span>`;
    body.innerHTML = '<p class="admin-muted-msg"><i class="fas fa-spinner fa-spin"></i> Caricamento…</p>';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const lessons = (window.__allUserBookings[uid] || []);

    if (lessons.length === 0) {
        body.innerHTML = '<p class="admin-muted-msg">Nessuna lezione trovata per questo utente.</p>';
        return;
    }

    let html = `
        <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
            <thead>
                <tr style="border-bottom:2px solid rgba(255,255,255,0.12);">
                    <th style="text-align:left; padding:8px 10px; color:#aaa; font-weight:600;">Data</th>
                    <th style="text-align:left; padding:8px 10px; color:#aaa; font-weight:600;">Ora</th>
                    <th style="text-align:left; padding:8px 10px; color:#aaa; font-weight:600;">Insegnante</th>
                    <th style="text-align:left; padding:8px 10px; color:#aaa; font-weight:600;">Stato</th>
                    <th style="text-align:right; padding:8px 10px; color:#aaa; font-weight:600;">Prezzo (€)</th>
                    <th style="padding:8px 10px;"></th>
                </tr>
            </thead>
            <tbody>`;

    lessons.forEach(b => {
        const dateStr = b.lesson_date ? b.lesson_date.split('-').reverse().join('/') : '—';
        const timeStr = b.start_time ? b.start_time.slice(0, 5) : '—';
        const endStr = b.end_time ? b.end_time.slice(0, 5) : '';
        const teacherName = b.teachers?.full_name || '—';
        const price = parseFloat(b.lesson_price) ?? 0;
        const paidBadge = b._isPaid
            ? `<span style="color:#00d2d3; font-size:0.78rem; font-weight:700;"><i class="fas fa-check-circle"></i> Pagata</span>`
            : `<span style="color:#00B4D8; font-size:0.78rem; font-weight:700;"><i class="fas fa-clock"></i> In sospeso</span>`;
        const rowBg = b._isPaid ? 'rgba(0,210,211,0.04)' : '';

        html += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.06); background:${rowBg};">
                <td style="padding:10px 10px;"><strong>${dateStr}</strong></td>
                <td style="padding:10px 10px; color:#ccc;">${timeStr}${endStr ? '–' + endStr : ''}</td>
                <td style="padding:10px 10px; color:#ccc;">${teacherName}</td>
                <td style="padding:10px 10px;">${paidBadge}</td>
                <td style="padding:10px 10px; text-align:right;">
                    <input
                        type="number"
                        id="price-input-${b.id}"
                        value="${price}"
                        min="0"
                        step="1"
                        style="width:80px; padding:4px 8px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); border-radius:6px; color:#fff; font-size:0.9rem; text-align:right;"
                    >
                </td>
                <td style="padding:10px 10px;">
                    <button
                        type="button"
                        onclick="saveLessonPrice(${b.id}, '${uid}')"
                        style="background:var(--color-hot-pink); color:#fff; border:none; border-radius:6px; padding:5px 12px; cursor:pointer; font-size:0.8rem; white-space:nowrap;"
                        id="save-btn-${b.id}"
                    ><i class="fas fa-save"></i> Salva</button>
                </td>
            </tr>`;
    });

    html += '</tbody></table>';
    body.innerHTML = html;
};

window.saveLessonPrice = async (bookingId, uid) => {
    const input = document.getElementById(`price-input-${bookingId}`);
    const btn = document.getElementById(`save-btn-${bookingId}`);
    if (!input) return;

    const newPrice = parseFloat(input.value);
    if (isNaN(newPrice) || newPrice < 0) {
        input.style.borderColor = '#00B4D8';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    input.style.borderColor = '';

    const { error } = await window.supabase
        .from('bookings')
        .update({ lesson_price: newPrice })
        .eq('id', bookingId);

    if (error) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Salva';
        input.style.borderColor = '#00B4D8';
        alert('Errore salvataggio: ' + error.message);
        return;
    }

    
    if (window.__allUserBookings[uid]) {
        const bk = window.__allUserBookings[uid].find(b => b.id === bookingId);
        if (bk) bk.lesson_price = newPrice;
    }

    btn.innerHTML = '<i class="fas fa-check"></i> Ok';
    btn.style.background = '#00d2d3';
    btn.style.color = '#000';
    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-save"></i> Salva';
        btn.style.background = '';
        btn.style.color = '';
        btn.disabled = false;
    }, 1800);

    
    loadBalances();
};

window.closeUserLessonsModal = (event) => {
    
    if (event && event.currentTarget && event.target !== event.currentTarget) return;
    const modal = document.getElementById('user-lessons-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

window.downloadBalancesPDF = () => {
    if (typeof html2pdf === 'undefined') {
        return alert("Libreria PDF non caricata.");
    }

    const term = (document.getElementById('search-balance')?.value || '').toLowerCase();
    const validData = (window.__balancesAllRows || [])
        .filter(r => r.nameLower.includes(term) && r.totalOwed > 0)
        .map(r => ({
            name: r.name,
            unpaidCount: String(r.unpaidCount),
            amountStr: `€ ${r.totalOwed}`
        }));

    if (validData.length === 0) {
        return alert("Nessun utente con pagamenti in sospeso da esportare (controlla i filtri).");
    }

    const printDiv = document.createElement('div');
    printDiv.style.padding = '30px';
    printDiv.style.color = '#333';
    printDiv.style.backgroundColor = '#fff';
    printDiv.style.fontFamily = "'Outfit', 'Helvetica Neue', Arial, sans-serif";

    const filterInput = document.getElementById('search-balance')?.value || '';
    const filterText = filterInput ? `Filtro: "${filterInput}"` : 'Tutti i pagamenti in sospeso';

    let html = `
        <style>
            .pdf-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            .pdf-table th, .pdf-table td { border: 1px solid #ddd; padding: 12px; text-align: left; vertical-align: middle; }
            .pdf-table th { background-color: #00d2d3; color: white; font-weight: bold; text-transform: uppercase; font-size: 11px;}
            .pdf-table tr { page-break-inside: avoid; }
            .pdf-table tr:nth-child(even) { background-color: #f9f9f9; }
            .pdf-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #00d2d3; padding-bottom: 20px; }
            .pdf-header h1 { color: #00B4D8; margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 1px; }
            .pdf-header h2 { color: #333; margin: 5px 0; font-size: 18px; }
            .pdf-header p { color: #666; margin: 0; font-size: 12px; }
            .checkbox-box { width: 22px; height: 22px; border: 2px solid #555; border-radius: 4px; display: inline-block; background: white;}
            .pdf-footer { margin-top: 40px; font-size: 10px; color: #888; text-align: right; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
        <div class="pdf-header">
            <h1>Winter Tuscany Camp</h1>
            <h2>Modulo Controllo Pagamenti Lezioni</h2>
            <p>${filterText}</p>
        </div>
        <table class="pdf-table">
            <thead>
                <tr>
                    <th width="45%">Utente / Coppia</th>
                    <th width="15%" style="text-align:center;">Lezioni da Saldare</th>
                    <th width="20%" style="text-align:right;">Importo Totale</th>
                    <th width="20%" style="text-align:center;">Spunta se Saldato</th>
                </tr>
            </thead>
            <tbody>
    `;

    validData.forEach(d => {
        html += `
            <tr>
                <td><strong>${d.name}</strong></td>
                <td style="text-align:center; color: #555;">${d.unpaidCount}</td>
                <td style="text-align:right; font-weight:bold; font-size: 14px; color: #00B4D8;">${d.amountStr}</td>
                <td style="text-align:center;"><div class="checkbox-box"></div></td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <div class="pdf-footer">
            Generato dal Sistema Admin Winter Tuscany Camp il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}
        </div>
    `;

    printDiv.innerHTML = html;

    const opt = {
        margin: [10, 10, 10, 10],
        filename: 'Controllo_Pagamenti.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(printDiv).save().catch(err => alert("Errore generazione PDF: " + err.message));
};

window.markAsPaid = async (uid) => {
    if (!confirm("Confermi che l'utente / coppia ha SALDATO tutte le sue lezioni attualmente in sospeso?")) return;

    const newPaidIds = window.__unpaidIdsData[uid] || [];
    if (newPaidIds.length === 0) return;

    
    const { data: settings } = await window.supabase.from('site_settings').select('value').eq('key', 'paid_bookings').maybeSingle();
    let currentPaid = settings && settings.value ? JSON.parse(settings.value) : [];
    if (!Array.isArray(currentPaid)) currentPaid = [];

    
    const updatedPaid = [...new Set([...currentPaid, ...newPaidIds])];

    
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

    
    const { data: userBookings } = await window.supabase.from('bookings').select('id').eq('user_id', uid);
    if (!userBookings || userBookings.length === 0) return;

    const userBookingIds = userBookings.map(b => b.id);

    
    const { data: settings } = await window.supabase.from('site_settings').select('value').eq('key', 'paid_bookings').maybeSingle();
    let currentPaid = settings && settings.value ? JSON.parse(settings.value) : [];
    if (!Array.isArray(currentPaid)) currentPaid = [];

    
    currentPaid = currentPaid.filter(id => !userBookingIds.includes(id));

    
    const { error } = await window.supabase.from('site_settings').upsert({ key: 'paid_bookings', value: JSON.stringify(currentPaid) }, { onConflict: 'key' });

    if (error) {
        alert("Errore: " + error.message);
    } else {
        alert("Resettato con successo.");
        loadBalances();
    }
};

window.filterBalances = () => {
    window.adminPagerState.balances.page = 1;
    renderBalancesTablePage();
};


window.loadSpecialBookings = async () => {
    const list = document.getElementById('special-bookings-list');
    if (!list) return;

    
    const { data: specials, error } = await window.supabase
        .from('bookings')
        .select('*, teachers(full_name)')
        .is('user_id', null)
        .neq('status', 'cancelled')
        .order('lesson_date', { ascending: true });

    if (error) {
        console.error("loadSpecialBookings ERROR:", JSON.stringify(error));
        list.innerHTML = `<p style="color:red;">Errore caricamento: ${error.message}</p>`;
        return;
    }

    console.log("loadSpecialBookings - specials found:", specials ? specials.length : 0);
    if (specials) specials.forEach(s => console.log("  ->", s.id, s.lesson_type, s.lesson_date));

    list.innerHTML = '';
    if (!specials || specials.length === 0) {
        list.innerHTML = '<p style="color:#666; font-style:italic;">Nessuna lezione speciale attiva.</p>';
        return;
    }

    specials.forEach(s => {
        const payInfo = s.staff_pay ? `€ ${s.staff_pay}` : 'Base';
        list.innerHTML += `
           <div class="shift-card shift-card--special">
               <div>
                   <strong>${s.teachers?.full_name || 'Insegnante non trovato'}</strong>
                   <span style="font-size:0.75rem; color:var(--admin-cyan); text-transform:uppercase;">${s.lesson_type || 'special'}</span><br>
                   <span style="color:#ccc"><i class="far fa-calendar"></i> ${s.lesson_date} <i class="far fa-clock" style="margin-left:5px;"></i> ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}</span><br>
                   <small style="color:#aaa">Paga staff: <span style="color:#feca57">${payInfo}</span></small>
               </div>
               <button type="button" class="btn-delete-mini" onclick="deleteSpecialBooking(${s.id})" aria-label="Elimina">&times;</button>
           </div>`;
    });
};

window.deleteSpecialBooking = async (id) => {
    if (!confirm("Eliminare questa lezione speciale?")) return;
    const { error } = await window.supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    if (error) alert("Errore: " + error.message);
    else {
        loadSpecialBookings();
        
    }
};

function renderAccountingTable(bookings) {
    const tbody = document.getElementById('accounting-body');
    tbody.innerHTML = '';
    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#aaa;">Nessuna lezione trovata.</td></tr>';
        renderPagerUI('accounting-pager', 'accounting', 1, 0);
        return;
    }

    const st = window.adminPagerState.accounting;
    const pageSlice = bookings.slice((st.page - 1) * ADMIN_PAGE_SIZE, st.page * ADMIN_PAGE_SIZE);

    pageSlice.forEach(b => {
        const rowClass = b.status === 'cancelled' ? 'style="opacity:0.5; text-decoration:line-through"' : '';
        const coupleName = b.registrations?.full_name || "N/A";
        const tn = b.teachers?.full_name || '—';

        const btnEdit = b.status !== 'cancelled' ? `
            <button type="button" class="admin-action-btn" onclick="openEditModal(${b.id}, '${b.lesson_date}', '${b.start_time}', '${b.end_time}', ${b.lesson_price}, ${b.teacher_id || 'null'})"
                    title="Modifica">
                <i class="fas fa-edit"></i>
            </button>` : '';

        const btnCancel = b.status !== 'cancelled' ? `
            <button type="button" class="admin-action-btn" onclick="cancelBookingAdmin(${b.id})"
                    title="Annulla">
                <i class="fas fa-ban"></i>
            </button>` : '<span style="font-size:0.8rem">(Annullato)</span>';

        const btnDelete = `
            <button type="button" class="admin-action-btn" onclick="deleteBookingPermanent(${b.id})"
                    title="Elimina definitivamente">
                <i class="fas fa-trash"></i>
            </button>`;

        tbody.innerHTML += `
            <tr ${rowClass}>
                <td>${b.id}</td>
                <td>${b.lesson_date}<br>${b.start_time.slice(0, 5)}</td>
                <td>${tn}</td>
                <td>${coupleName}</td>
                <td>€ ${b.lesson_price}</td>
                <td>${b.status}</td>
                <td>${btnEdit} ${btnCancel} ${btnDelete}</td>
            </tr>`;
    });

    renderPagerUI('accounting-pager', 'accounting', st.page, bookings.length);
}


window.openEditModal = (id, date, start, end, price, teacherId) => {
    document.getElementById('edit-booking-id').value = id;
    document.getElementById('edit-date').value = date;
    document.getElementById('edit-start').value = start.slice(0, 5);
    document.getElementById('edit-end').value = end.slice(0, 5);
    document.getElementById('edit-price').value = price;

    
    const sel = document.getElementById('edit-teacher');
    const teachers = window.__allTeachers || [];
    sel.innerHTML = teachers.map(t =>
        `<option value="${t.id}" ${t.id === teacherId ? 'selected' : ''}>${t.full_name}</option>`
    ).join('');

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

    const newTeacherId = document.getElementById('edit-teacher').value;

    if (!newDate || !newStart || !newPrice) return alert("Compila tutto");

    const formattedStart = newStart.length === 5 ? newStart + ":00" : newStart;
    const formattedEnd = newEnd.length === 5 ? newEnd + ":00" : newEnd;

    
    const updatePayload = {
        lesson_date: newDate, start_time: formattedStart, end_time: formattedEnd,
        lesson_price: newPrice, admin_notes: "Modified by Admin"
    };
    if (newTeacherId) updatePayload.teacher_id = newTeacherId;

    const { error } = await window.supabase
        .from('bookings')
        .update(updatePayload)
        .eq('id', id);

    if (error) {
        alert("Errore: " + error.message);
    } else {
        
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

    
    const { data: bookingData } = await window.supabase
        .from('bookings')
        .select('*, registrations(user_email, full_name), teachers(full_name)')
        .eq('id', id)
        .single();

    
    await window.supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);

    
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


function renderMessagesPage() {
    const tbody = document.getElementById('messages-body');
    const msgs = window.__messagesList || [];
    const st = window.adminPagerState.messages;
    tbody.innerHTML = '';

    if (!msgs.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nessun messaggio.</td></tr>';
        renderPagerUI('messages-pager', 'messages', 1, 0);
        return;
    }

    const pages = Math.max(1, Math.ceil(msgs.length / ADMIN_PAGE_SIZE));
    if (st.page > pages) st.page = pages;
    const slice = msgs.slice((st.page - 1) * ADMIN_PAGE_SIZE, st.page * ADMIN_PAGE_SIZE);

    slice.forEach(m => {
        const style = m.is_read ? '' : 'font-weight:bold; color:#fff; background:rgba(0, 180, 216, 0.1);';
        const subject = m.subject || '(No oggetto)';
        tbody.innerHTML += `
                <tr style="${style}">
                    <td>${new Date(m.created_at).toLocaleDateString()}</td>
                    <td>${m.full_name}<br><small>${m.email}</small></td>
                    <td><strong>${subject}</strong><br>${m.message}</td>
                    <td>
                        <button type="button" class="admin-action-btn" onclick="deleteMessage(${m.id})"><i class="fas fa-trash"></i></button>
                        ${!m.is_read ? `<button type="button" class="admin-action-btn" onclick="markAsRead(${m.id})"><i class="fas fa-check"></i></button>` : ''}
                    </td>
                </tr>`;
    });

    renderPagerUI('messages-pager', 'messages', st.page, msgs.length);
}

window.loadMessages = async () => {
    const { data: msgs } = await window.supabase.from('contacts').select('*').order('created_at', { ascending: false });
    window.__messagesList = msgs || [];
    window.adminPagerState.messages.page = 1;
    renderMessagesPage();
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




function renderRegistrationsPage() {
    const tbody = document.getElementById('registrations-body');
    const all = window.__registrationsList || [];
    const term = (document.getElementById('search-reg')?.value || '').toLowerCase();
    const filtered = !term
        ? all
        : all.filter(r =>
            `${r.full_name} ${r.user_email} ${r.role} ${r.package} ${r.payment_status}`.toLowerCase().includes(term)
        );

    const st = window.adminPagerState.registrations;
    tbody.innerHTML = '';

    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nessun risultato.</td></tr>';
        renderPagerUI('registrations-pager', 'registrations', 1, 0);
        return;
    }

    const pages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
    if (st.page > pages) st.page = pages;
    const slice = filtered.slice((st.page - 1) * ADMIN_PAGE_SIZE, st.page * ADMIN_PAGE_SIZE);

    slice.forEach(r => {
        const isPaid = window.__paidRegistrations && window.__paidRegistrations.includes(r.id) || r.payment_status === 'paid' || r.payment_status === 'Saldato';

        let paymentStatusHtml = '';
        if (isPaid) {
            paymentStatusHtml = `<span style="color:#00d2d3; font-weight:bold;"><i class="fas fa-check-circle"></i> Tutto saldato</span>
                                 <br><button type="button" class="btn-cancel btn-add--sm" style="margin-top:6px;" onclick="revertRegistrationPayment('${r.id}')"><i class="fas fa-undo"></i> Resetta</button>`;
        } else {
            paymentStatusHtml = `<span style="color:#00B4D8; font-weight:bold;"><i class="fas fa-exclamation-triangle"></i> Da saldare</span>
                                 <br><button type="button" class="btn-add btn-add--sm" style="margin-top: 5px;" onclick="markRegistrationPaid('${r.id}')"><i class="fas fa-check"></i> Segna saldato (€${r.total_amount})</button>`;
        }

        tbody.innerHTML += `
    <tr>
        <td>${new Date(r.created_at).toLocaleDateString()}</td>
        <td><strong>${r.full_name}</strong><br><small>${r.user_email}</small></td>
        <td>${r.role}</td>
        <td>${r.package}</td>
        <td id="reg-amount-display-${r.id}">€ ${r.total_amount}</td>
        <td>${paymentStatusHtml}</td>
        <td style="text-align: right; white-space: nowrap;">
            <button type="button" class="admin-action-btn" onclick="openEditRegAmount('${r.id}', ${r.total_amount}, '${(r.full_name || '').replace(/'/g, "\\'")}')"
                    title="Modifica importo" style="color:var(--admin-cyan);">
                <i class="fas fa-euro-sign"></i>
            </button>
            <button type="button" class="admin-action-btn" onclick="viewRegistrationDetails('${r.id}')"
                    title="Dettagli">
                <i class="fas fa-eye"></i>
            </button>
            <button type="button" class="admin-action-btn" onclick="deleteEntry('${r.id}')"
                    title="Elimina">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    </tr>`;
    });

    renderPagerUI('registrations-pager', 'registrations', st.page, filtered.length);
}

window.loadRegistrations = async () => {
    const { data: regs } = await window.supabase.from('registrations').select('*').order('created_at', { ascending: false });
    window.__registrationsList = regs || [];

    const { data: settings } = await window.supabase.from('site_settings').select('value').eq('key', 'paid_registrations').maybeSingle();
    let paidRegs = [];
    if (settings && settings.value) {
        paidRegs = JSON.parse(settings.value);
        if (!Array.isArray(paidRegs)) paidRegs = [];
    }
    window.__paidRegistrations = paidRegs;

    let totalMoney = 0;
    let count = 0;
    window.__registrationsList.forEach(r => {
        count++;
        totalMoney += Number(r.total_amount) || 0;
    });

    const countEl = document.getElementById('total-reg-count');
    const moneyEl = document.getElementById('total-reg-money');
    if (countEl) countEl.innerText = count;
    if (moneyEl) moneyEl.innerText = "€ " + totalMoney;

    window.adminPagerState.registrations.page = 1;
    renderRegistrationsPage();
};




window.openEditRegAmount = (id, currentAmount, name) => {
    const modal = document.getElementById('reg-amount-modal');
    if (!modal) return;
    document.getElementById('reg-amount-modal-title').textContent = name;
    const inp = document.getElementById('reg-amount-input');
    inp.value = currentAmount;
    inp.dataset.regId = id;
    inp.style.borderColor = '';
    document.getElementById('reg-amount-save-btn').innerHTML = '<i class="fas fa-save"></i> Salva';
    document.getElementById('reg-amount-save-btn').disabled = false;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(() => inp.focus(), 80);
};

window.saveRegAmount = async () => {
    const inp = document.getElementById('reg-amount-input');
    const btn = document.getElementById('reg-amount-save-btn');
    const id = inp.dataset.regId;
    const newAmount = parseFloat(inp.value);

    if (isNaN(newAmount) || newAmount < 0) {
        inp.style.borderColor = '#00B4D8';
        return;
    }
    inp.style.borderColor = '';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';

    const { error } = await window.supabase
        .from('registrations')
        .update({ total_amount: newAmount })
        .eq('id', id);

    if (error) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Salva';
        inp.style.borderColor = '#00B4D8';
        alert('Errore salvataggio: ' + error.message);
        return;
    }

    
    const reg = (window.__registrationsList || []).find(r => r.id === id);
    if (reg) reg.total_amount = newAmount;

    btn.innerHTML = '<i class="fas fa-check"></i> Salvato!';
    btn.style.background = '#00d2d3';
    btn.style.color = '#000';

    setTimeout(() => {
        closeRegAmountModal();
        
        loadRegistrations();
    }, 900);
};

window.closeRegAmountModal = () => {
    const modal = document.getElementById('reg-amount-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
};

window.markRegistrationPaid = async (id) => {
    if (!confirm("Confermi di voler segnare questa iscrizione come saldata?")) return;

    let currentPaid = window.__paidRegistrations || [];
    if (!currentPaid.includes(id)) {
        currentPaid.push(id);
    }

    
    const { error: settingsError } = await window.supabase
        .from('site_settings')
        .upsert({ key: 'paid_registrations', value: JSON.stringify(currentPaid) }, { onConflict: 'key' });

    if (settingsError) {
        alert("Errore salvataggio: " + settingsError.message);
        return;
    }

    
    const { error: regError } = await window.supabase
        .from('registrations')
        .update({ payment_status: 'paid' })
        .eq('id', id);

    if (regError) {
        console.warn("Attenzione: impossibile aggiornare payment_status:", regError.message);
        
    }

    
    window.__paidRegistrations = currentPaid;

    alert("Iscrizione segnata come saldata!");
    loadRegistrations();
};

window.revertRegistrationPayment = async (id) => {
    if (!confirm("ATTENZIONE! Vuoi annullare il pagamento registrato per questa iscrizione? Verrà segnata di nuovo come 'Da Saldare'.")) return;

    let currentPaid = window.__paidRegistrations || [];
    currentPaid = currentPaid.filter(paidId => paidId !== id);

    
    const { error: settingsError } = await window.supabase
        .from('site_settings')
        .upsert({ key: 'paid_registrations', value: JSON.stringify(currentPaid) }, { onConflict: 'key' });

    if (settingsError) {
        alert("Errore salvataggio: " + settingsError.message);
        return;
    }

    
    const { error: regError } = await window.supabase
        .from('registrations')
        .update({ payment_status: 'In attesa' })
        .eq('id', id);

    if (regError) {
        console.warn("Attenzione: impossibile aggiornare payment_status:", regError.message);
    }

    
    window.__paidRegistrations = currentPaid;

    alert("Pagamento annullato con successo.");
    loadRegistrations();
};




window.deleteEntry = async (id) => {
    const confirmed = confirm("SEI SICURO? \nEliminare questo iscritto cancellerà anche TUTTE le sue prenotazioni e lo storico.\nQuesta azione è irreversibile.");

    if (!confirmed) return;

    try {
        
        const { data: regData, error: fetchError } = await window.supabase
            .from('registrations')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        if (regData && regData.user_id) {
            
            const { error: bookingError } = await window.supabase
                .from('bookings')
                .delete()
                .eq('user_id', regData.user_id);

            if (bookingError) {
                console.warn("Attenzione: errore cancellazione prenotazioni o nessuna prenotazione trovata.", bookingError);
                
            }
        }

        
        const { error: regError } = await window.supabase
            .from('registrations')
            .delete()
            .eq('id', id);

        if (regError) throw regError;

        alert("Iscritto e relative prenotazioni eliminati con successo.");
        loadRegistrations(); 

    } catch (error) {
        console.error("Errore cancellazione:", error);
        alert("Errore durante l'eliminazione: " + error.message);
    }
};

window.filterRegistrations = () => {
    window.adminPagerState.registrations.page = 1;
    renderRegistrationsPage();
};

window.downloadRegistrationsPDF = async () => {
    if (typeof html2pdf === 'undefined') {
        return alert("Libreria PDF non caricata.");
    }

    const { data: regs, error } = await window.supabase.from('registrations').select('*').order('created_at', { ascending: false });
    if (error) {
        return alert("Errore caricamento dati: " + error.message);
    }

    if (!regs || regs.length === 0) {
        return alert("Nessun iscritto trovato.");
    }

    const term = (document.getElementById('search-reg')?.value || '').toLowerCase();

    const filteredRegs = regs.filter(r => {
        if (!term) return true;
        const searchString = `${r.full_name} ${r.user_email} ${r.role} ${r.package} ${r.payment_status}`.toLowerCase();
        return searchString.includes(term);
    });

    if (filteredRegs.length === 0) {
        return alert("Nessun iscritto trovato con questo filtro.");
    }

    const printDiv = document.createElement('div');
    printDiv.style.padding = '30px';
    printDiv.style.color = '#333';
    printDiv.style.backgroundColor = '#fff';
    printDiv.style.fontFamily = "'Outfit', 'Helvetica Neue', Arial, sans-serif";

    const filterDisplay = term ? `Ricerca: "${term}"` : 'Tutti gli iscritti';

    let html = `
        <style>
            .pdf-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            .pdf-table th, .pdf-table td { border: 1px solid #e0e0e0; padding: 10px; text-align: left; }
            .pdf-table th { background-color: #00d2d3; color: white; font-weight: bold; text-transform: uppercase; font-size: 10px;}
            .pdf-table tr { page-break-inside: avoid; }
            .pdf-table tr:nth-child(even) { background-color: #fcfcfc; }
            .pdf-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0984e3; padding-bottom: 20px; }
            .pdf-header h1 { color: #00d2d3; margin: 0; font-size: 26px; text-transform: uppercase; letter-spacing: 1px; }
            .pdf-header h2 { color: #333; margin: 5px 0; font-size: 18px; }
            .pdf-header p { color: #666; margin: 0; font-size: 12px; }
            .pdf-footer { margin-top: 40px; font-size: 10px; color: #888; text-align: right; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
        <div class="pdf-header">
            <h1>Winter Tuscany Camp</h1>
            <h2>Lista Partecipanti (Entry Form)</h2>
            <p>${filterDisplay}</p>
        </div>
        <table class="pdf-table">
            <thead>
                <tr>
                    <th width="15%">Data</th>
                    <th width="40%">Nome / Email</th>
                    <th width="25%">Pacchetto</th>
                    <th width="10%">Totale</th>
                    <th width="10%">Stato</th>
                </tr>
            </thead>
            <tbody>
    `;

    let totalMoney = 0;

    filteredRegs.forEach(r => {
        totalMoney += Number(r.total_amount) || 0;
        const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
        const paymentColor = r.payment_status === 'Saldato' ? 'color: #2ecc71;' : (r.payment_status === 'In attesa' ? 'color: #f1c40f;' : '');

        html += `
            <tr>
                <td>${dateStr}</td>
                <td><strong>${r.full_name}</strong><br><small style="color:#666;">${r.user_email}</small></td>
                <td>${r.package}</td>
                <td>€ ${r.total_amount}</td>
                <td style="font-weight:bold; ${paymentColor}">${r.payment_status}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <div style="margin-top: 20px; text-align: right; padding: 15px; background: #f9f9f9; border-radius: 5px; border: 1px solid #eee;">
            <h3 style="margin: 0; color: #333; font-size: 16px;">
                Totale Iscritti: <span style="color: #00d2d3;">${filteredRegs.length}</span> | 
                Incasso Totale: <span style="color: #00d2d3;">€ ${totalMoney}</span>
            </h3>
        </div>

        <div class="pdf-footer">
            Generato dal Sistema Admin Winter Tuscany Camp il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}
        </div>
    `;

    printDiv.innerHTML = html;

    const opt = {
        margin: [10, 10, 10, 10],
        filename: 'Lista_Partecipanti.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(printDiv).save().catch(err => alert("Errore generazione PDF: " + err.message));
};


function renderTeachersPage() {
    const tbody = document.getElementById('teachers-list-body');
    const teachers = window.__teachersList || [];
    const st = window.adminPagerState.teachers;
    tbody.innerHTML = '';

    if (!teachers.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nessun insegnante.</td></tr>';
        renderPagerUI('teachers-pager', 'teachers', 1, 0);
        return;
    }

    const pages = Math.max(1, Math.ceil(teachers.length / ADMIN_PAGE_SIZE));
    if (st.page > pages) st.page = pages;
    const slice = teachers.slice((st.page - 1) * ADMIN_PAGE_SIZE, st.page * ADMIN_PAGE_SIZE);

    slice.forEach(teacher => {
        const emailDisplay = teacher.email ? `<br><small style="color:#aaa">${teacher.email}</small>` : '';
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
                    <button type="button" class="admin-action-btn" onclick="openEditTeacherModal('${teacher.id}', '${safeName}', '${safeEmail}', ${teacher.base_price}, '${safeDisc}', ${teacher.pay_rate || 0})"
                        title="Modifica">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="admin-action-btn" onclick="deleteTeacher('${teacher.id}')"
                        title="Elimina">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
    });

    renderPagerUI('teachers-pager', 'teachers', st.page, teachers.length);
}

window.loadTeachersList = async () => {
    const { data: t } = await window.supabase.from('teachers').select('*').order('full_name');
    window.__teachersList = t || [];
    window.adminPagerState.teachers.page = 1;
    renderTeachersPage();
};






window.openEditTeacherModal = (id, name, email, price, discipline, payRate) => {
    
    
    
    

    let modal = document.getElementById('teacher-edit-modal');
    if (!modal) {
        
        const div = document.createElement('div');
        div.id = 'teacher-edit-modal';
        div.className = 'modal-overlay';
        div.style.display = 'flex'; 
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
                    <button type="button" onclick="document.getElementById('teacher-edit-modal').style.display='none'" class="btn-cancel">Annulla</button>
                    <button type="button" onclick="saveTeacherChanges()" class="btn-save">Salva</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        modal = div;
    }

    
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
        loadTeachers(); 
    }
};

window.addNewTeacher = async () => {
    const name = document.getElementById('new-teacher-name').value;
    const email = document.getElementById('new-teacher-email').value;
    const price = document.getElementById('new-teacher-price').value;
    const payRate = document.getElementById('new-teacher-pay-rate').value; 
    const disc = document.getElementById('new-teacher-discipline').value;

    if (!name) return alert("Nome obbligatorio");

    const { error } = await window.supabase.from('teachers').insert({
        full_name: name,
        email: email.trim(),
        base_price: price,
        pay_rate: payRate || 0, 
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



window.deleteTeacher = async (id) => {
    
    if (!confirm("SEI SICURO?\nEliminare l'insegnante cancellerà anche tutte le sue disponibilità e lezioni future.\nQuesta azione è irreversibile.")) return;

    try {
        
        const { error: errAvail } = await window.supabase
            .from('teacher_availability')
            .delete()
            .eq('teacher_id', id);

        if (errAvail) console.warn("Errore eliminazione disponibilità:", errAvail);

        
        const { error: errBook } = await window.supabase
            .from('bookings')
            .delete()
            .eq('teacher_id', id);

        if (errBook) console.warn("Errore eliminazione lezioni:", errBook);

        
        const { error } = await window.supabase
            .from('teachers')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert("Insegnante eliminato con successo.");

        
        loadTeachersList();
        loadTeachers();

    } catch (err) {
        console.error(err);
        alert("Errore durante l'eliminazione: " + err.message);
    }
};




function renderSystemUsersPage() {
    const tbody = document.getElementById('system-users-body');
    const allUsers = window.__systemUsersList || [];
    const registeredSet = window.__registeredUserIdSet || new Set();
    const st = window.adminPagerState.systemUsers;
    tbody.innerHTML = '';

    if (!allUsers.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Nessun utente.</td></tr>';
        renderPagerUI('system-users-pager', 'systemUsers', 1, 0);
        return;
    }

    const pages = Math.max(1, Math.ceil(allUsers.length / ADMIN_PAGE_SIZE));
    if (st.page > pages) st.page = pages;
    const slice = allUsers.slice((st.page - 1) * ADMIN_PAGE_SIZE, st.page * ADMIN_PAGE_SIZE);

    slice.forEach(u => {
        const hasForm = registeredSet.has(u.id);
        const created = new Date(u.created_at).toLocaleDateString('it-IT');
        const lastSign = u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('it-IT') : 'Mai';

        const statusBadge = hasForm
            ? '<span style="color:#2ecc71; font-weight:bold;">Completo</span>'
            : '<span style="color:#ff9f43; font-weight:bold;">Form mancante</span>';

        tbody.innerHTML += `
            <tr>
                <td>${created}</td>
                <td><strong>${u.email}</strong><br><small style="opacity:0.5">ID: ${u.id.slice(0, 6)}…</small></td>
                <td>${lastSign}</td>
                <td>${statusBadge}</td>
                <td>
                    <button type="button" class="btn-cancel btn-add--sm" onclick="deleteSystemUser('${u.id}')"
                            title="Elimina account">
                        <i class="fas fa-trash"></i> Elimina
                    </button>
                </td>
            </tr>`;
    });

    renderPagerUI('system-users-pager', 'systemUsers', st.page, allUsers.length);
}

window.loadSystemUsers = async () => {
    const tbody = document.getElementById('system-users-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Caricamento utenti…</td></tr>';

    const { data: allUsers, error: errAuth } = await window.supabase.rpc('get_system_users');
    const { data: regIds, error: errReg } = await window.supabase.from('registrations').select('user_id');

    if (errAuth || errReg) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center">Errore caricamento. Script SQL eseguito?</td></tr>';
        return;
    }

    window.__registeredUserIdSet = new Set(regIds.map(r => r.user_id));
    window.__systemUsersList = allUsers || [];

    let ghosts = 0;
    window.__systemUsersList.forEach(u => {
        if (!window.__registeredUserIdSet.has(u.id)) ghosts++;
    });

    document.getElementById('sys-total-count').innerText = window.__systemUsersList.length;
    document.getElementById('sys-ghost-count').innerText = ghosts;

    window.adminPagerState.systemUsers.page = 1;
    renderSystemUsersPage();
};

window.deleteSystemUser = async (uuid) => {
    if (!confirm("ATTENZIONE: Stai cancellando un account di sistema. L'utente non potrà più fare login.")) return;
    await window.supabase.from('bookings').delete().eq('user_id', uuid);
    await window.supabase.from('registrations').delete().eq('user_id', uuid);
    const { error } = await window.supabase.rpc('delete_user_by_id', { target_id: uuid });
    if (error) alert("Errore eliminazione: " + error.message);
    else { alert("Account eliminato."); loadSystemUsers(); }
};




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

        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
    } catch (error) {
        console.error("EmailJS Error:", error);
    }
}




window.viewRegistrationDetails = async (id) => {
    const modal = document.getElementById('reg-details-modal');
    const content = document.getElementById('reg-details-content');
    modal.style.display = 'flex';
    content.innerHTML = '<p class="admin-muted-msg">Caricamento dati...</p>';

    try {
        const { data: r, error } = await window.supabase
            .from('registrations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const hasMan = Boolean(r.man_name && r.man_name.trim());
        const hasWoman = Boolean(r.woman_name && r.woman_name.trim());

        let typeLabel = 'Unknown';
        let typeIcon = 'fa-question-circle';
        if (hasMan && hasWoman) {
            typeLabel = 'Couple (x2)';
            typeIcon = 'fa-user-friends';
        } else if (hasMan) {
            typeLabel = 'Single male';
            typeIcon = 'fa-male';
        } else if (hasWoman) {
            typeLabel = 'Single female';
            typeIcon = 'fa-female';
        }

        const paymentMethod = r.payment_status === 'paid' ? 'Stripe (card)' : 'Pending';

        content.innerHTML = `
            <div class="reg-type-badge"><i class="fas ${typeIcon}"></i> ${typeLabel}</div>

            <div class="reg-grid">
                <section class="reg-block" style="grid-column: 1 / -1;">
                    <h4>Partecipanti</h4>
                    <div class="reg-kv">
                        <div class="reg-kv__item ${hasMan ? '' : 'is-muted'}">
                            <span>Man</span>
                            <strong>${r.man_name || '-'} ${r.man_surname || ''}</strong>
                        </div>
                        <div class="reg-kv__item ${hasWoman ? '' : 'is-muted'}">
                            <span>Woman</span>
                            <strong>${r.woman_name || '-'} ${r.woman_surname || ''}</strong>
                        </div>
                        <div class="reg-kv__item">
                            <span>Teacher</span>
                            <p>${r.teacher || '-'}</p>
                        </div>
                        <div class="reg-kv__item">
                            <span>Country</span>
                            <p>${r.country || '-'}</p>
                        </div>
                        <div class="reg-kv__item">
                            <span>Age group</span>
                            <p>${r.age_group || '-'}</p>
                        </div>
                    </div>
                </section>

                <section class="reg-block">
                    <h4>Contatti</h4>
                    <div class="reg-kv">
                        <div class="reg-kv__item">
                            <span>Email</span>
                            <strong>${r.user_email || '-'}</strong>
                        </div>
                        <div class="reg-kv__item">
                            <span>Phone</span>
                            <p>${r.phone || '-'}</p>
                        </div>
                    </div>
                </section>

                <section class="reg-block">
                    <h4>Pacchetto e costi</h4>
                    <div class="reg-kv">
                        <div class="reg-kv__item">
                            <span>Package</span>
                            <strong>${r.package || '-'}</strong>
                        </div>
                        <div class="reg-kv__item">
                            <span>Extra nights</span>
                            <p>${r.extra_nights || '0'}</p>
                        </div>
                        <div class="reg-kv__item">
                            <span>Total paid</span>
                            <strong>€ ${r.total_amount || 0}</strong>
                        </div>
                        <div class="reg-kv__item">
                            <span>Payment method</span>
                            <p>${paymentMethod}</p>
                        </div>
                    </div>
                </section>

                <section class="reg-block" style="grid-column: 1 / -1;">
                    <h4>Logistica</h4>
                    <div class="reg-kv">
                        <div class="reg-kv__item">
                            <span>Arrival</span>
                            <p>${r.arrival_date || 'N/A'} (${r.arrival_time || '--:--'})</p>
                        </div>
                        <div class="reg-kv__item">
                            <span>Departure</span>
                            <p>${r.departure_date || 'N/A'} (${r.departure_time || '--:--'})</p>
                        </div>
                    </div>
                </section>
            </div>
        `;

    } catch (err) {
        console.error(err);
        content.innerHTML = `<p style="color:#8ab4d0;">Errore nel caricamento dati: ${err.message}</p>`;
    }
};

window.closeRegModal = () => {
    document.getElementById('reg-details-modal').style.display = 'none';
};

window.addEventListener('click', (e) => {
    const modal = document.getElementById('reg-details-modal');
    if (e.target === modal) modal.style.display = 'none';
});

async function loadCurrentTimer() {
    
    const { data: timerData } = await window.supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'countdown_end')
        .single();

    if (timerData && document.getElementById('timer-date-input')) {
        document.getElementById('timer-date-input').value = timerData.value;
    }

    
    const { data: heroData } = await window.supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero_dates')
        .single();

    if (heroData && heroData.value) {
        try {
            const parsed = JSON.parse(heroData.value);
            if (document.getElementById('hero-date-days')) document.getElementById('hero-date-days').value = parsed.days || "23 &bull; 24";
            if (document.getElementById('hero-date-month')) document.getElementById('hero-date-month').value = parsed.month || "MAY 2026";
        } catch (e) { console.error("Errore parsing hero_dates", e); }
    } else {
        if (document.getElementById('hero-date-days')) document.getElementById('hero-date-days').value = "23 &bull; 24";
        if (document.getElementById('hero-date-month')) document.getElementById('hero-date-month').value = "MAY 2026";
    }
}


window.saveTimerDate = async () => {
    const newVal = document.getElementById('timer-date-input').value;

    if (!newVal) return alert("Seleziona una data valida.");

    const btn = document.querySelector('button[onclick="saveTimerDate()"]');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';
    btn.disabled = true;

    try {
        const { error } = await window.supabase
            .from('site_settings')
            .update({ value: newVal })
            .eq('key', 'countdown_end');

        if (error) throw error;

        alert("Data del timer salvata con successo!");
    } catch (err) {
        console.error(err);
        alert("Errore durante il salvataggio: " + err.message);
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};

window.saveHeroDates = async () => {
    const days = document.getElementById('hero-date-days').value;
    const month = document.getElementById('hero-date-month').value;

    if (!days || !month) return alert("Compila entrambi i campi.");

    const btn = document.querySelector('button[onclick="saveHeroDates()"]');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';
    btn.disabled = true;

    const jsonValue = JSON.stringify({ days, month });

    try {
        const { error } = await window.supabase
            .from('site_settings')
            .upsert({ key: 'hero_dates', value: jsonValue }, { onConflict: 'key' });

        if (error) throw error;
        alert("Date salvate con successo! Visita la Home per vedere le modifiche.");
    } catch (err) {
        console.error(err);
        alert("Errore di salvataggio: " + err.message);
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};




function updateTeacherHours(bookings) {
    const teacherStats = {};

    
    (window.__allTeachers || []).forEach(t => {
        teacherStats[t.full_name] = 0;
    });

    bookings.forEach(booking => {
        
        if (booking.status === 'cancelled') return;

        
        if (booking.lesson_type === 'break') return;

        const teacher = booking.teachers ? booking.teachers.full_name : null;
        if (!teacher) return;

        if (!teacherStats[teacher]) teacherStats[teacher] = 0;
        teacherStats[teacher] += 1;
    });

    
    window.__teacherHoursData = Object.entries(teacherStats)
        .sort((a, b) => b[1] - a[1]); 

    renderTeacherHours();
}

function renderTeacherHours() {
    const container = document.getElementById('teachers-work-summary');
    if (!container) return;

    const term = (document.getElementById('search-teacher-hours')?.value || '').toLowerCase();
    const data = (window.__teacherHoursData || []).filter(([name]) => name.toLowerCase().includes(term));

    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<p class="admin-muted-msg">Nessuna lezione confermata.</p>';
        return;
    }

    data.forEach(([name, count]) => {
        const badge = document.createElement('div');
        badge.className = 'admin-stat-chip';
        badge.innerHTML = `
            <div class="admin-stat-chip__label">${name}</div>
            <div class="admin-stat-chip__value">${count} lezioni</div>
        `;
        container.appendChild(badge);
    });
}

window.filterTeacherHours = () => renderTeacherHours();


function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return (h * 60) + m;
}










function updateStaffPay(bookings) {
    // Struttura dettagliata per insegnante: private + speciali separate
    const staffDetail = {};

    (window.__allTeachers || []).forEach(t => {
        staffDetail[t.full_name] = {
            private: { count: 0, pay: 0 },
            group:   { count: 0, pay: 0 },
            lecture: { count: 0, pay: 0 },
            other:   { count: 0, pay: 0 },
        };
    });

    bookings.forEach(b => {
        if (b.status === 'cancelled') return;
        if (b.lesson_type === 'break') return;

        const teacher = b.teachers ? b.teachers.full_name : null;
        if (!teacher) return;

        if (!staffDetail[teacher]) {
            staffDetail[teacher] = {
                private: { count: 0, pay: 0 },
                group:   { count: 0, pay: 0 },
                lecture: { count: 0, pay: 0 },
                other:   { count: 0, pay: 0 },
            };
        }

        let pay = 0;
        if (b.staff_pay !== null && b.staff_pay !== undefined) {
            pay = parseFloat(b.staff_pay) || 0;
        } else if (b.teachers?.pay_rate > 0) {
            pay = parseFloat(b.teachers.pay_rate);
        }

        const type = b.lesson_type || 'private';
        if (type === 'private' || !type) {
            staffDetail[teacher].private.count++;
            staffDetail[teacher].private.pay += pay;
        } else if (type === 'group') {
            staffDetail[teacher].group.count++;
            staffDetail[teacher].group.pay += pay;
        } else if (type === 'lecture') {
            staffDetail[teacher].lecture.count++;
            staffDetail[teacher].lecture.pay += pay;
        } else {
            staffDetail[teacher].other.count++;
            staffDetail[teacher].other.pay += pay;
        }
    });

    // Salva dettaglio globale per stampa
    window.__staffPayDetail = staffDetail;

    // Totale per chip UI
    window.__staffPayData = Object.entries(staffDetail)
        .map(([name, d]) => [
            name,
            d.private.pay + d.group.pay + d.lecture.pay + d.other.pay
        ])
        .sort((a, b) => b[1] - a[1]);

    renderStaffPay();
    updatePaySheetTeacherSelect();
}

function updatePaySheetTeacherSelect() {
    const sel = document.getElementById('pay-sheet-teacher-select');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="all">Tutti gli insegnanti</option>';
    (window.__allTeachers || []).forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.full_name;
        opt.textContent = t.full_name;
        sel.appendChild(opt);
    });
    if (currentVal) sel.value = currentVal;
}

function renderStaffPay() {
    const container = document.getElementById('staff-pay-summary');
    if (!container) return;

    const term = (document.getElementById('search-staff-pay')?.value || '').toLowerCase();
    const data = (window.__staffPayData || []).filter(([name]) => name.toLowerCase().includes(term));

    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<p class="admin-muted-msg">Nessuna paga staff calcolata (imposta «Paga staff» sugli insegnanti).</p>';
        return;
    }

    // Load paid state from localStorage
    const paidTeachers = JSON.parse(localStorage.getItem('tc_paid_teachers') || '{}');

    data.forEach(([name, totalPay]) => {
        const isPaid = !!paidTeachers[name];

        const chip = document.createElement('div');
        chip.className = 'admin-stat-chip admin-stat-chip--pay staff-pay-chip' + (isPaid ? ' staff-pay-chip--paid' : '');
        chip.title = isPaid ? 'Clicca per annullare il pagamento' : 'Clicca per segnare come PAGATO';
        chip.dataset.teacher = name;
        chip.innerHTML = `
            <div class="admin-stat-chip__label">${name}</div>
            <div class="admin-stat-chip__value">€ ${totalPay.toFixed(2)}</div>
            <div class="staff-pay-chip__badge">${isPaid ? '✓ Pagato' : 'Segna pagato'}</div>
        `;

        chip.addEventListener('click', () => {
            const current = JSON.parse(localStorage.getItem('tc_paid_teachers') || '{}');
            if (current[name]) {
                delete current[name];
            } else {
                current[name] = { paidAt: new Date().toISOString(), amount: totalPay };
            }
            localStorage.setItem('tc_paid_teachers', JSON.stringify(current));
            renderStaffPay();
        });

        container.appendChild(chip);
    });

    // ── Reset button (shown only when at least one is paid) ──────────
    const anyPaid = data.some(([name]) => !!paidTeachers[name]);
    if (anyPaid) {
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'btn-cancel btn-add--sm';
        resetBtn.style.cssText = 'margin-top:0.5rem; width:100%; font-size:0.78rem;';
        resetBtn.innerHTML = '<i class="fas fa-undo"></i> Azzera tutti i pagamenti';
        resetBtn.onclick = () => {
            if (!confirm('Sei sicuro di voler azzerare tutti i pagamenti segnati?')) return;
            localStorage.removeItem('tc_paid_teachers');
            renderStaffPay();
        };
        container.appendChild(resetBtn);
    }
}

window.filterStaffPay = () => renderStaffPay();


// ============================================================
// STAMPA FOGLIO PAGA INSEGNANTE
// ============================================================
window.printPaySheet = () => {
    const detail = window.__staffPayDetail || {};
    const selVal = document.getElementById('pay-sheet-teacher-select')?.value || 'all';

    let teachersToPrint = Object.keys(detail);
    if (selVal !== 'all') teachersToPrint = [selVal];

    if (teachersToPrint.length === 0) {
        alert('Nessun dato disponibile. Assicurati di essere nella sezione Contabilità con i dati caricati.');
        return;
    }

    const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const buildTeacherBlock = (name) => {
        const d = detail[name];
        if (!d) return '';

        const privateTotal  = d.private.pay;
        const groupTotal    = d.group.pay;
        const lectureTotal  = d.lecture.pay;
        const otherTotal    = d.other.pay;
        const specialTotal  = groupTotal + lectureTotal + otherTotal;
        const grandTotal    = privateTotal + specialTotal;

        let specialRows = '';
        if (d.group.count > 0)   specialRows += `<tr><td>Group lesson</td><td style="text-align:center;">${d.group.count}</td><td style="text-align:right;">€ ${groupTotal.toFixed(2)}</td></tr>`;
        if (d.lecture.count > 0) specialRows += `<tr><td>Lecture</td><td style="text-align:center;">${d.lecture.count}</td><td style="text-align:right;">€ ${lectureTotal.toFixed(2)}</td></tr>`;
        if (d.other.count > 0)   specialRows += `<tr><td>Altro</td><td style="text-align:center;">${d.other.count}</td><td style="text-align:right;">€ ${otherTotal.toFixed(2)}</td></tr>`;
        if (!specialRows)         specialRows = `<tr><td colspan="3" style="color:#aaa;font-style:italic;text-align:center;font-size:12px;">Nessuna lezione speciale</td></tr>`;

        return `<div class="page">
          <div class="header">
            <div><div class="camp-title">WINTER TUSCANY CAMP 2026</div><div class="camp-sub">Foglio Paga Staff</div></div>
            <div style="text-align:right;font-size:12px;color:#555;">Data: <strong>${today}</strong></div>
          </div>
          <div class="teacher-name">${name}</div>

          <div class="sec-title">Lezioni Private</div>
          <table>
            <thead><tr><th>Tipo</th><th style="text-align:center;width:110px;">N° lezioni</th><th style="text-align:right;width:130px;">Importo</th></tr></thead>
            <tbody>
              <tr><td>Lezioni private</td><td style="text-align:center;">${d.private.count}</td><td style="text-align:right;">€ ${privateTotal.toFixed(2)}</td></tr>
            </tbody>
          </table>

          <div class="sec-title" style="margin-top:22px;">Lezioni Speciali (Group / Lecture)</div>
          <table>
            <thead><tr><th>Tipo</th><th style="text-align:center;width:110px;">N° sessioni</th><th style="text-align:right;width:130px;">Importo</th></tr></thead>
            <tbody>
              ${specialRows}
              <tr class="subtotal"><td colspan="2">Totale lezioni speciali</td><td style="text-align:right;">€ ${specialTotal.toFixed(2)}</td></tr>
            </tbody>
          </table>

          <div class="sec-title" style="margin-top:22px;">Travel Expenses</div>
          <table>
            <tbody>
              <tr style="height:40px;"><td>Spese di viaggio</td><td style="text-align:center;width:110px;">—</td><td style="text-align:right;width:130px;border-bottom:1px solid #444;">€ ___________</td></tr>
              <tr style="height:10px;"><td colspan="3" style="font-size:11px;color:#888;font-style:italic;">Note / dettaglio spese (compilare a penna)</td></tr>
              <tr><td colspan="3" style="border-bottom:1px solid #bbb;height:36px;"></td></tr>
              <tr><td colspan="3" style="border-bottom:1px solid #bbb;height:36px;"></td></tr>
            </tbody>
          </table>
        </div>`;
    };

    const blocks = teachersToPrint.map((name, i) => {
        const block = buildTeacherBlock(name);
        return i < teachersToPrint.length - 1 ? block + '<div class="page-break"></div>' : block;
    }).join('');

    const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>Foglio Paga — Winter Tuscany Camp 2026</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:14px;color:#222;background:#fff}
.page{max-width:700px;margin:0 auto;padding:40px 50px}
.page-break{page-break-after:always;height:0;margin:0}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1a1a2e;padding-bottom:14px;margin-bottom:26px}
.camp-title{font-size:22px;font-weight:900;letter-spacing:.08em;color:#1a1a2e}
.camp-sub{font-size:12px;color:#666;letter-spacing:.12em;text-transform:uppercase;margin-top:4px}
.teacher-name{font-size:20px;font-weight:700;color:#1a1a2e;border-left:5px solid #00B4D8;padding-left:14px;margin-bottom:22px}
.sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#00B4D8;margin-bottom:7px}
table{width:100%;border-collapse:collapse;margin-bottom:0}
th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#555;font-weight:600;border-bottom:2px solid #1a1a2e;padding:6px 8px}
td{padding:10px 8px;border-bottom:1px solid #e8e8e8;font-size:13px}
.subtotal td{font-weight:700;border-top:2px solid #1a1a2e;border-bottom:2px solid #1a1a2e;background:#f7f7f7}
.grand-total{display:flex;justify-content:space-between;align-items:center;background:#1a1a2e;color:#fff;padding:14px 18px;border-radius:6px;margin-top:26px;font-size:16px;font-weight:900;letter-spacing:.04em}
.sigs{display:flex;gap:24px;margin-top:48px}
.sig{flex:1;text-align:center}
.sig-line{border-bottom:1.5px solid #333;height:44px;margin-bottom:8px}
.sig-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#666}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:20px 30px}}
</style></head>
<body>${blocks}
<script>window.onload=()=>{setTimeout(()=>window.print(),200)}<\/script>
</body></html>`;

    const w = window.open('', '_blank', 'width=900,height=750');
    if (!w) { alert('Pop-up bloccato dal browser. Consenti i pop-up per questo sito e riprova.'); return; }
    w.document.write(html);
    w.document.close();
};

window.loadGlobalSettings = async () => {
    
    const keys = ['entry_form', 'book_lesson'];

    
    
    const { data: settings, error } = await window.supabase
        .from('site_settings')
        .select('*')
        .in('key', keys);

    if (error) {
        console.warn("Errore caricamento settings:", error);
        return;
    }

    
    let entryEnabled = true;
    let bookEnabled = true;

    if (settings) {
        const entryObj = settings.find(s => s.key === 'entry_form');
        const bookObj = settings.find(s => s.key === 'book_lesson');

        
        
        const isFalse = (val) => val === false || val === 'false';

        if (entryObj && isFalse(entryObj.value)) entryEnabled = false;
        if (bookObj && isFalse(bookObj.value)) bookEnabled = false;
    }

    
    const entryCheck = document.getElementById('toggle-entry-form');
    const bookCheck = document.getElementById('toggle-book-lesson');

    if (entryCheck) entryCheck.checked = entryEnabled;
    if (bookCheck) bookCheck.checked = bookEnabled;
};

window.toggleSetting = async (key) => {
    const checkbox = document.getElementById(key === 'entry_form' ? 'toggle-entry-form' : 'toggle-book-lesson');
    if (!checkbox) return;

    const isEnabled = checkbox.checked;

    
    const { error } = await window.supabase
        .from('site_settings')
        .upsert({ key: key, value: isEnabled }, { onConflict: 'key' });

    if (error) {
        alert("Errore aggiornamento impostazione: " + error.message);
        
        checkbox.checked = !isEnabled;
    }
};




window.loadGuestTeachersSettings = async () => {
    
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

    
    const btn = document.querySelector('button[onclick="saveGuestTeachers()"]');
    const oldText = btn ? btn.innerHTML : "Salva Modifiche";
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvataggio...';
    }

    
    const { error: err1 } = await window.supabase
        .from('site_settings')
        .upsert({ key: 'guest_list_standard', value: stdVal }, { onConflict: 'key' });

    
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




window.loadPDFSettings = async () => {
    
    const { data: settings } = await window.supabase
        .from('site_settings')
        .select('*')
        .in('key', ['pdf_program_url', 'pdf_packages_url']);

    
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

    if (file.size > 10 * 1024 * 1024) { 
        alert("Il file è troppo grande! Max 10MB.");
        return;
    }

    
    const oldBtnText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Caricamento...';
    statusLabel.innerText = "Caricamento su Supabase Storage...";
    statusLabel.style.color = "#aaa";

    try {
        
        const fileName = `${type}_${Date.now()}.pdf`;
        const bucketName = 'pdf_downloads'; 

        
        const { data, error: uploadError } = await window.supabase.storage
            .from(bucketName)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            
            
            throw new Error("Errore Upload (Bucket 'pdf_downloads' non esiste o permessi negati?): " + uploadError.message);
        }

        
        const { data: publicURLData } = window.supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        const publicUrl = publicURLData.publicUrl;

        
        const settingKey = type === 'program' ? 'pdf_program_url' : 'pdf_packages_url';

        const { error: dbError } = await window.supabase
            .from('site_settings')
            .upsert({ key: settingKey, value: publicUrl }, { onConflict: 'key' });

        if (dbError) throw new Error("Errore salvataggio DB: " + dbError.message);

        
        statusLabel.innerText = "Caricamento completato con successo!";
        statusLabel.style.color = "#00d2d3";
        fileInput.value = ''; 
        loadPDFSettings(); 

    } catch (err) {
        console.error(err);
        statusLabel.innerText = "Errore: " + err.message;
        statusLabel.style.color = "red";
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldText; 
        
        

        if (type === 'program') btn.innerHTML = '<i class="fas fa-upload"></i> Carica & Aggiorna Programma';
        else btn.innerHTML = '<i class="fas fa-upload"></i> Carica & Aggiorna Pacchetti';
    }
};






window.dbNewsletterEmails = [];
window.manualNewsletterEmails = [];

window.loadNewsletterStats = async () => {
    
    try {
        const { data: mnSetting } = await window.supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'newsletter_manual_emails')
            .maybeSingle();

        if (mnSetting && mnSetting.value) {
            
            
            try {
                window.manualNewsletterEmails = JSON.parse(mnSetting.value);
            } catch (jsonErr) {
                
                console.warn("Manual emails not JSON", jsonErr);
                window.manualNewsletterEmails = [];
            }
        } else {
            window.manualNewsletterEmails = [];
        }
    } catch (e) {
        console.error("Errore caricamento email manuali da DB", e);
    }

    
    const { data: settings } = await window.supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'newsletter_template_id')
        .maybeSingle();

    if (settings && settings.value) {
        document.getElementById('newsletter-template-id').value = settings.value;
    }

    
    const loader = document.getElementById('newsletter-loader');
    const stats = document.getElementById('newsletter-stats');

    loader.style.display = 'block';
    stats.style.display = 'none';

    try {
        let uniqueEmails = [];

        
        const { data: allUsers, error: rpcError } = await window.supabase.rpc('get_all_user_emails');

        if (!rpcError && allUsers) {
            uniqueEmails = allUsers.map(u => u.email); 
        } else {
            console.warn("Newsletter: RPC failed, falling back to registrations table.", rpcError);
            
            const { data: regUsers, error: regError } = await window.supabase
                .from('registrations')
                .select('user_email');

            if (regError) throw regError;
            uniqueEmails = regUsers.map(u => u.user_email);
        }

        
        uniqueEmails = [...new Set(uniqueEmails.filter(e => e && e.trim() !== '' && e.includes('@')))];

        
        window.dbNewsletterEmails = uniqueEmails;

        
        updateNewsletterList();

    } catch (err) {
        console.error("Errore newsletter stats:", err);
        stats.innerText = "Err";
        const listContainer = document.getElementById('newsletter-db-list');
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

    
    const emails = raw.split(/[\s,]+/);
    let addedCount = 0;

    emails.forEach(e => {
        const clean = e.trim();
        
        if (clean && clean.includes('@') && clean.includes('.')) {
            if (!window.manualNewsletterEmails.includes(clean)) {
                window.manualNewsletterEmails.push(clean);
                addedCount++;
            }
        }
    });

    if (addedCount > 0) {
        
        const { error } = await window.supabase
            .from('site_settings')
            .upsert({ key: 'newsletter_manual_emails', value: JSON.stringify(window.manualNewsletterEmails) }, { onConflict: 'key' });

        if (error) {
            alert("Errore salvataggio DB: " + error.message);
        } else {
            input.value = ''; 
            updateNewsletterList();
            alert(`${addedCount} email aggiunte manualmente e salvate su DB.`);
        }
    } else {
        alert("Nessuna email valida trovata o già presenti.");
    }
};

window.removeManualEmail = async (email) => {
    window.manualNewsletterEmails = window.manualNewsletterEmails.filter(e => e !== email);

    
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
    
    const dbUnique = [...new Set(window.dbNewsletterEmails)].sort();

    
    const manualUnique = [...new Set(window.manualNewsletterEmails.filter(e => !dbUnique.includes(e)))].sort();

    
    let combined = [...dbUnique, ...manualUnique];
    window.cachedNewsletterEmails = combined;

    
    const stats = document.getElementById('newsletter-stats');
    if (stats) stats.innerText = combined.length;

    
    const dbList = document.getElementById('newsletter-db-list');
    const manualList = document.getElementById('newsletter-manual-list');
    const countDb = document.getElementById('count-db-list');
    const countManual = document.getElementById('count-manual-list');

    if (countDb) countDb.innerText = dbUnique.length;
    if (countManual) countManual.innerText = manualUnique.length;

    
    if (dbList) {
        if (dbUnique.length === 0) {
            dbList.innerHTML = '<em style="color:#777;">Nessuna email nel database.</em>';
        } else {
            dbList.innerHTML = dbUnique.map(email => `<div style="padding: 3px 0; border-bottom: 1px solid #333;">${email}</div>`).join('');
        }
    }

    
    if (manualList) {
        if (manualUnique.length === 0) {
            manualList.innerHTML = '<em style="color:#777;">Nessuna email inserita manualmente.</em>';
        } else {
            manualList.innerHTML = manualUnique.map(email => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 3px 0; border-bottom: 1px solid #333; color:#feca57;">
                    <span>${email}</span>
                    <button type="button" class="admin-action-btn" onclick="removeManualEmail('${email}')" title="Rimuovi">
                        <i class="fas fa-times"></i>
                    </button>
                </div>`).join('');
        }
    }
};


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


window.sendNewsletter = async (isTest) => {
    
    const templateId = document.getElementById('newsletter-template-id').value;
    const subject = document.getElementById('newsletter-subject').value;
    const message = document.getElementById('newsletter-message').value;

    if (!templateId) return alert("Manca il Template ID nelle impostazioni!");
    if (!subject) return alert("Inserisci un Oggetto.");
    if (!message) return alert("Inserisci un Messaggio.");

    const SERVICE_ID = "service_fik9j1g"; 

    
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

    
    if (!window.cachedNewsletterEmails || window.cachedNewsletterEmails.length === 0) {
        await loadNewsletterStats(); 
        if (!window.cachedNewsletterEmails || window.cachedNewsletterEmails.length === 0) {
            return alert("Nessun destinatario trovato.");
        }
    }

    const recipients = window.cachedNewsletterEmails;
    const confirmMsg = `Stai per inviare questa email a ${recipients.length} utenti. Sei sicuro?`;
    if (!confirm(confirmMsg)) return;

    
    const progressContainer = document.getElementById('newsletter-progress-container');
    const progressBar = document.getElementById('newsletter-progress-bar');
    const progressText = document.getElementById('newsletter-progress-text');
    const btnAll = document.getElementById('btn-send-all');

    progressContainer.style.display = 'block';
    btnAll.disabled = true;
    let successCount = 0;
    let failCount = 0;

    
    for (let i = 0; i < recipients.length; i++) {
        const email = recipients[i];

        
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

        
        await new Promise(r => setTimeout(r, 500));
    }

    
    alert(`Completato!\nInviate con successo: ${successCount}\nErrori: ${failCount}`);
    btnAll.disabled = false;
    progressContainer.style.display = 'none';
};


// ============================================================
// FINE CAMP — EXPORT ZIP + RESET
// ============================================================

// ── Helpers ──────────────────────────────────────────────────
function toCSVGeneric(headers, mapper, rows) {
    if (!rows) return '\ufeff' + headers.join(';') + '\n';
    const BOM = '\ufeff';
    const headerLine = headers.join(';');
    const lines = [headerLine];
    rows.forEach(row => {
        const vals = mapper(row).map(v => {
            const str = v === null || v === undefined ? '' : String(v);
            return '"' + str.replace(/"/g, '""') + '"';
        });
        lines.push(vals.join(';'));
    });
    return BOM + lines.join('\n');
}

function setZipProgress(pct, label) {
    const bar   = document.getElementById('export-zip-bar');
    const lbl   = document.getElementById('export-zip-label');
    const wrap  = document.getElementById('export-zip-progress');
    if (wrap) wrap.style.display = 'block';
    if (bar)  bar.style.width = pct + '%';
    if (lbl)  lbl.textContent = label;
}

// ── Load counts when tab opens ────────────────────────────────
window.loadFineCampCounts = async () => {
    const tables = [
        { id: 'count-bookings',     table: 'bookings',             label: 'lezioni'    },
        { id: 'count-availability', table: 'teacher_availability',  label: 'turni'      },
        { id: 'count-teachers',     table: 'teachers',              label: 'insegnanti' },
        { id: 'count-registrations',table: 'registrations',         label: 'iscritti'   },
        { id: 'count-messages',     table: 'contacts',              label: 'messaggi'   },
    ];
    for (const t of tables) {
        const el = document.getElementById(t.id);
        if (!el) continue;
        try {
            const { count } = await window.supabase
                .from(t.table)
                .select('*', { count: 'exact', head: true });
            el.textContent = `${count ?? '?'} ${t.label}`;
        } catch {
            el.textContent = '— (errore)';
        }
    }
};

// Auto-load counts when Fine Camp tab becomes active
const _origShowTab = window.showTab;
window.showTab = (tabName, btn) => {
    _origShowTab(tabName, btn);
    if (tabName === 'fine-camp') window.loadFineCampCounts();
};

// ── Export ZIP con Report HTML ─────────────────────────────────
window.exportCampZip = async () => {
    if (typeof JSZip === 'undefined') {
        return alert('Libreria JSZip non caricata. Ricarica la pagina.');
    }

    const btn = document.getElementById('btn-export-zip');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Esportazione...'; }

    try {
        console.log("🚀 INIZIO ESPORTAZIONE BACKUP ZIP");
        const zip  = new JSZip();
        const folderName = 'WinterTuscanyCamp_Backup_' + new Date().toISOString().slice(0, 10);
        const camp = zip.folder(folderName);

        // 1. Carica i dati in sequenza con log di debug per diagnosticare blocchi
        setZipProgress(10, 'Caricamento prenotazioni…');
        console.log("1/5 Richiesta bookings...");
        const resBookings = await window.supabase.from('bookings').select('*, teachers(full_name, pay_rate), registrations(full_name)').limit(20000);
        if (resBookings.error) console.warn("Attenzione errore bookings:", resBookings.error);
        const bookings = (resBookings.data || []).filter(x => x);
        console.log(`-> Caricati ${bookings.length} bookings`);

        setZipProgress(15, 'Caricamento insegnanti…');
        console.log("2/5 Richiesta teachers...");
        const resTeachers = await window.supabase.from('teachers').select('*').limit(2000);
        if (resTeachers.error) console.warn("Attenzione errore teachers:", resTeachers.error);
        const teachers = (resTeachers.data || []).filter(x => x);
        console.log(`-> Caricati ${teachers.length} teachers`);

        setZipProgress(20, 'Caricamento disponibilità…');
        console.log("3/5 Richiesta availability...");
        const resAvailability = await window.supabase.from('teacher_availability').select('*, teachers(full_name)').limit(5000);
        if (resAvailability.error) console.warn("Attenzione errore availability:", resAvailability.error);
        const availability = (resAvailability.data || []).filter(x => x);
        console.log(`-> Caricati ${availability.length} availability`);

        setZipProgress(25, 'Caricamento iscritti…');
        console.log("4/5 Richiesta registrations...");
        const resRegs = await window.supabase.from('registrations').select('*').limit(5000);
        if (resRegs.error) console.warn("Attenzione errore registrations:", resRegs.error);
        const registrations = (resRegs.data || []).filter(x => x);
        console.log(`-> Caricati ${registrations.length} registrations`);

        setZipProgress(30, 'Caricamento messaggi contatti…');
        console.log("5/5 Richiesta contacts...");
        const resMsgs = await window.supabase.from('contacts').select('*').limit(5000);
        if (resMsgs.error) console.warn("Attenzione errore contacts:", resMsgs.error);
        const messages = (resMsgs.data || []).filter(x => x);
        console.log(`-> Caricati ${messages.length} messages`);

        const paidFlagsRaw = localStorage.getItem('tc_paid_teachers') || '{}';
        const paidFlags = JSON.parse(paidFlagsRaw);
        console.log("Dati caricati completati con successo.");

        // 2. Generazione CSV formattati in Italiano
        setZipProgress(40, 'Generazione file CSV…');

        // CSV Bookings
        const csvBookingsData = toCSVGeneric(
            ['ID', 'Nome Cliente', 'Nome Insegnante', 'Data Lezione', 'Ora Inizio', 'Ora Fine', 'Prezzo (€)', 'Tipo Lezione', 'Stato', 'Paga Staff (€)', 'Note Admin', 'Data Prenotazione'],
            (row) => [
                row.id,
                row.registrations ? row.registrations.full_name : (row.user_id || ''),
                row.teachers ? row.teachers.full_name : '',
                row.lesson_date,
                row.start_time ? row.start_time.slice(0, 5) : '',
                row.end_time ? row.end_time.slice(0, 5) : '',
                row.lesson_price !== null && row.lesson_price !== undefined ? row.lesson_price : '',
                row.lesson_type || 'private',
                row.status || 'confirmed',
                row.staff_pay !== null && row.staff_pay !== undefined ? row.staff_pay : '',
                row.admin_notes || '',
                row.created_at ? new Date(row.created_at).toLocaleString('it-IT') : ''
            ],
            bookings
        );
        camp.file('1_prenotazioni_lezioni.csv', csvBookingsData);

        // CSV Teachers
        const csvTeachersData = toCSVGeneric(
            ['ID', 'Nome Insegnante', 'Email', 'Paga Oraria Staff (€)', 'Prezzo Base Lezione (€)', 'Creato il'],
            (row) => [
                row.id,
                row.full_name || '',
                row.email || '',
                row.pay_rate !== null && row.pay_rate !== undefined ? row.pay_rate : '',
                row.base_price !== null && row.base_price !== undefined ? row.base_price : '',
                row.created_at ? new Date(row.created_at).toLocaleString('it-IT') : ''
            ],
            teachers
        );
        camp.file('2_insegnanti.csv', csvTeachersData);

        // CSV Availability
        const csvAvailData = toCSVGeneric(
            ['ID', 'Insegnante', 'Data Disponibilita', 'Ora Inizio', 'Ora Fine'],
            (row) => [
                row.id,
                row.teachers ? row.teachers.full_name : (row.teacher_id || ''),
                row.available_date || '',
                row.start_hour ? row.start_hour.slice(0, 5) : '',
                row.end_hour ? row.end_hour.slice(0, 5) : ''
            ],
            availability
        );
        camp.file('3_turni_disponibilita.csv', csvAvailData);

        // CSV Registrations
        const csvRegsData = toCSVGeneric(
            ['ID', 'Email', 'Nome Completo', 'Ruolo', 'Telefono', 'Citta', 'Nazione', 'Importo Totale (€)', 'Note', 'Data Registrazione'],
            (row) => [
                row.id,
                row.email || '',
                row.full_name || '',
                row.role || '',
                row.phone || '',
                row.city || '',
                row.country || '',
                row.total_amount !== null && row.total_amount !== undefined ? row.total_amount : '',
                row.notes || '',
                row.created_at ? new Date(row.created_at).toLocaleString('it-IT') : ''
            ],
            registrations
        );
        camp.file('4_iscritti_camp.csv', csvRegsData);

        // CSV Contact Messages (contacts)
        const csvMsgsData = toCSVGeneric(
            ['ID', 'Nome', 'Email', 'Oggetto', 'Messaggio', 'Letto', 'Data Ricezione'],
            (row) => [
                row.id,
                row.name || '',
                row.email || '',
                row.subject || '',
                row.message || '',
                row.is_read ? 'Sì' : 'No',
                row.created_at ? new Date(row.created_at).toLocaleString('it-IT') : ''
            ],
            messages
        );
        camp.file('5_messaggi_contatti.csv', csvMsgsData);

        // localStorage paid flags
        camp.file('pagamenti_insegnanti_segnati.json', paidFlagsRaw);

        // 3. Generazione Report HTML Leggibile con lo stile "Winter Tuscany Camp" originale
        setZipProgress(70, 'Creazione report interattivo HTML…');

        // Elaborazione aggregati insegnanti per il report
        const teacherStats = {};
        teachers.forEach(t => {
            teacherStats[t.id] = {
                name: t.full_name,
                email: t.email,
                pay_rate: t.pay_rate || 0,
                private_count: 0,
                group_count: 0,
                lecture_count: 0,
                break_count: 0,
                other_count: 0,
                total_pay: 0,
                paid: paidFlags[t.full_name] ? 'Sì' : 'No'
            };
        });

        bookings.forEach(b => {
            if (b.status === 'cancelled') return;
            const tid = b.teacher_id;
            if (!tid) return;

            if (!teacherStats[tid]) {
                teacherStats[tid] = {
                    name: b.teachers ? b.teachers.full_name : 'Insegnante ' + tid.slice(0, 5),
                    email: '-',
                    pay_rate: 0,
                    private_count: 0,
                    group_count: 0,
                    lecture_count: 0,
                    break_count: 0,
                    other_count: 0,
                    total_pay: 0,
                    paid: '-'
                };
            }

            let pay = 0;
            if (b.staff_pay !== null && b.staff_pay !== undefined) {
                pay = parseFloat(b.staff_pay) || 0;
            } else if (b.teachers?.pay_rate > 0) {
                pay = parseFloat(b.teachers.pay_rate) || 0;
            }

            const type = b.lesson_type || 'private';
            if (type === 'private') {
                teacherStats[tid].private_count++;
                teacherStats[tid].total_pay += pay;
            } else if (type === 'group') {
                teacherStats[tid].group_count++;
                teacherStats[tid].total_pay += pay;
            } else if (type === 'lecture') {
                teacherStats[tid].lecture_count++;
                teacherStats[tid].total_pay += pay;
            } else if (type === 'break') {
                teacherStats[tid].break_count++;
            } else {
                teacherStats[tid].other_count++;
                teacherStats[tid].total_pay += pay;
            }
        });

        // Elaborazione iscritti per il report
        const registrationStats = {};
        registrations.forEach(r => {
            const isPaid = (window.__paidRegistrations && window.__paidRegistrations.includes(r.id)) || r.payment_status === 'paid' || r.payment_status === 'Saldato';
            registrationStats[r.user_id || r.id] = {
                name: r.full_name,
                email: r.user_email || r.email || '',
                phone: r.phone,
                role: r.role,
                package: r.package || '—',
                city: r.city,
                country: r.country,
                total_amount: r.total_amount || 0,
                is_paid: isPaid ? 'Saldato' : 'Da saldare',
                notes: r.notes || '',
                booking_count: 0
            };
        });

        bookings.forEach(b => {
            if (b.status === 'cancelled') return;
            const uid = b.user_id;
            if (uid && registrationStats[uid]) {
                registrationStats[uid].booking_count++;
            }
        });

        // Generazione del file HTML
        const htmlReport = `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Winter Tuscany Camp 2026 — Report Offline</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap');
        
        :root {
            --admin-bg: #000b1a;
            --admin-surface: rgba(255, 255, 255, 0.04);
            --admin-surface-2: #07162c;
            --admin-border: rgba(255, 255, 255, 0.09);
            --admin-border-strong: rgba(0, 180, 216, 0.35);
            --admin-cyan: #00d2d3;
            --admin-text: #f0f0f2;
            --admin-muted: #8b8b96;
            --admin-sidebar-w: 280px;
            --accent: #00B4D8;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: 'Outfit', sans-serif;
            background: var(--admin-bg);
            color: var(--admin-text);
            line-height: 1.5;
            display: flex;
            height: 100vh;
            overflow: hidden;
        }

        /* Gradient background circles */
        .bg-gradient-shapes {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background:
                radial-gradient(ellipse 120% 80% at 100% -20%, rgba(0, 180, 216, 0.1), transparent 50%),
                radial-gradient(ellipse 80% 60% at 0% 100%, rgba(0, 210, 211, 0.06), transparent 45%),
                var(--admin-bg);
            z-index: -1;
            pointer-events: none;
        }

        /* Sidebar */
        .sidebar {
            width: var(--admin-sidebar-w);
            background: linear-gradient(180deg, #020813 0%, #07162c 100%);
            border-right: 1px solid var(--admin-border);
            padding: 1.5rem 1.25rem;
            display: flex;
            flex-direction: column;
            height: 100%;
            flex-shrink: 0;
            z-index: 10;
        }

        .sidebar-header {
            padding-bottom: 1.25rem;
            border-bottom: 1px solid var(--admin-border);
            margin-bottom: 1.5rem;
        }

        .brand-title {
            font-family: 'Outfit', sans-serif;
            font-size: 1.5rem;
            font-weight: 600;
            background: linear-gradient(to right, #fff, var(--accent));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .brand-subtitle {
            font-size: 0.75rem;
            color: var(--admin-muted);
            text-transform: uppercase;
            letter-spacing: 0.15em;
            margin-top: 0.2rem;
        }

        .menu-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }

        .menu-item {
            display: flex;
            align-items: center;
            gap: 0.85rem;
            padding: 0.75rem 1rem;
            color: var(--admin-muted);
            text-decoration: none;
            border-radius: 10px;
            font-size: 0.92rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .menu-item:hover, .menu-item.active {
            color: #fff;
            background: var(--admin-surface);
        }

        .menu-item.active {
            border-left: 3px solid var(--accent);
            border-radius: 0 10px 10px 0;
            background: rgba(0, 180, 216, 0.08);
            color: var(--accent);
        }

        .menu-item i {
            width: 18px;
            text-align: center;
            font-size: 1.1rem;
        }

        /* Content Area */
        .content {
            flex-grow: 1;
            padding: 2.25rem;
            overflow-y: auto;
            height: 100%;
            position: relative;
        }

        .page-head {
            margin-bottom: 2rem;
        }

        .page-title {
            font-family: 'Outfit', sans-serif;
            font-size: 2.2rem;
            font-weight: 600;
            margin-bottom: 0.35rem;
        }

        .page-desc {
            color: var(--admin-muted);
            font-size: 0.95rem;
        }

        /* Stats Dashboard */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2.25rem;
        }

        .card {
            background: var(--admin-surface);
            border: 1px solid var(--admin-border);
            border-radius: 16px;
            padding: 1.5rem;
            position: relative;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }

        .card::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: var(--accent);
            border-radius: 16px 0 0 16px;
        }

        .card.cyan::after { background: var(--admin-cyan); }
        .card.gold::after { background: #feca57; }
        .card.green::after { background: #1dd1a1; }

        .card-label {
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--admin-muted);
            letter-spacing: 0.05em;
        }

        .card-val {
            font-size: 2.2rem;
            font-weight: 700;
            margin-top: 0.25rem;
            font-family: 'Outfit', sans-serif;
        }

        /* Tables & Lists */
        .section-card {
            margin-bottom: 2.5rem;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.25rem;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .section-title {
            font-family: 'Outfit', sans-serif;
            font-size: 1.5rem;
            color: #fff;
        }

        .search-wrapper {
            position: relative;
        }

        .search-wrapper i {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--admin-muted);
            font-size: 0.85rem;
        }

        .search-input {
            padding: 7px 12px 7px 32px;
            border-radius: 10px;
            border: 1px solid var(--admin-border);
            background: rgba(255,255,255,0.05);
            color: #fff;
            font-size: 0.85rem;
            outline: none;
            width: 240px;
            transition: all 0.2s;
        }

        .search-input:focus {
            border-color: var(--accent);
            background: rgba(255,255,255,0.08);
            box-shadow: 0 0 10px rgba(0, 180, 216, 0.2);
        }

        .table-wrap {
            width: 100%;
            overflow-x: auto;
            border-radius: 12px;
            border: 1px solid var(--admin-border);
            background: var(--admin-surface-2);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.9rem;
        }

        th {
            background: rgba(255,255,255,0.02);
            color: #fff;
            font-weight: 600;
            padding: 1rem;
            border-bottom: 1px solid var(--admin-border);
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        td {
            padding: 1rem;
            border-bottom: 1px solid var(--admin-border);
            color: var(--admin-text);
            vertical-align: middle;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover td {
            background: rgba(255,255,255,0.01);
        }

        /* Badges */
        .badge {
            display: inline-flex;
            align-items: center;
            padding: 0.25rem 0.65rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .badge.private { background: rgba(0, 210, 211, 0.12); color: var(--admin-cyan); border: 1px solid rgba(0, 210, 211, 0.2); }
        .badge.group { background: rgba(0, 180, 216, 0.12); color: var(--accent); border: 1px solid rgba(0, 180, 216, 0.2); }
        .badge.lecture { background: rgba(108, 92, 231, 0.12); color: #a29bfe; border: 1px solid rgba(108, 92, 231, 0.2); }
        .badge.break { background: rgba(255, 255, 255, 0.08); color: var(--admin-muted); border: 1px solid var(--admin-border); }

        .badge.yes { background: rgba(29, 209, 161, 0.12); color: #1dd1a1; border: 1px solid rgba(29, 209, 161, 0.2); }
        .badge.no { background: rgba(235, 94, 85, 0.12); color: #ff6b6b; border: 1px solid rgba(235, 94, 85, 0.2); }

        /* Panels */
        .tab-panel {
            display: none;
        }

        .tab-panel.active {
            display: block;
            animation: fadeIn 0.25s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="bg-gradient-shapes"></div>

    <!-- Sidebar fissa come nell'admin originale -->
    <div class="sidebar">
        <div class="sidebar-header">
            <div class="brand-title">Winter Tuscany Camp</div>
            <div class="brand-subtitle">Report Offline 2026</div>
        </div>
        <ul class="menu-list">
            <li><a class="menu-item active" onclick="switchPanel('panel-dashboard', this)"><i class="fas fa-chart-line"></i> Dashboard</a></li>
            <li><a class="menu-item" onclick="switchPanel('panel-bookings', this)"><i class="fas fa-calendar-check"></i> Registro Lezioni</a></li>
            <li><a class="menu-item" onclick="switchPanel('panel-teachers', this)"><i class="fas fa-user-tie"></i> Insegnanti &amp; Paga</a></li>
            <li><a class="menu-item" onclick="switchPanel('panel-registrations', this)"><i class="fas fa-users"></i> Iscritti Camp</a></li>
            <li><a class="menu-item" onclick="switchPanel('panel-messages', this)"><i class="fas fa-envelope"></i> Messaggi Ricevuti</a></li>
        </ul>
    </div>

    <!-- Contenuto principale -->
    <div class="content">
        
        <!-- DASHBOARD TAB -->
        <div id="panel-dashboard" class="tab-panel active">
            <div class="page-head">
                <h2 class="page-title">Panoramica Generale</h2>
                <p class="page-desc">Report aggregato delle attività del camp.</p>
            </div>
            
            <div class="dashboard-grid">
                <div class="card">
                    <div class="card-label">Lezioni Totali</div>
                    <div class="card-val">${bookings.filter(b => b.status !== 'cancelled' && b.lesson_type !== 'break').length}</div>
                    <p style="font-size: 0.8rem; color: var(--admin-muted); margin-top: 0.25rem;">Escluse cancellate e break</p>
                </div>
                <div class="card cyan">
                    <div class="card-label">Coppie / Iscritti</div>
                    <div class="card-val">${registrations.length}</div>
                    <p style="font-size: 0.8rem; color: var(--admin-muted); margin-top: 0.25rem;">Iscritti dal modulo online</p>
                </div>
                <div class="card gold">
                    <div class="card-label">Compensi Staff</div>
                    <div class="card-val">€ ${Object.values(teacherStats).reduce((acc, t) => acc + t.total_pay, 0).toFixed(2)}</div>
                    <p style="font-size: 0.8rem; color: var(--admin-muted); margin-top: 0.25rem;">Totale compensi calcolati</p>
                </div>
                <div class="card green">
                    <div class="card-label">Totale Iscrizioni</div>
                    <div class="card-val">€ ${registrations.reduce((acc, r) => acc + (parseFloat(r.total_amount) || 0), 0).toFixed(2)}</div>
                    <p style="font-size: 0.8rem; color: var(--admin-muted); margin-top: 0.25rem;">Incasso quote di iscrizione</p>
                </div>
            </div>

            <!-- Altri grafici o sintesi utili -->
            <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));">
                <div class="card" style="min-height: 250px;">
                    <div class="card-label" style="margin-bottom: 1.25rem;">Distribuzione Tipologie Lezioni</div>
                    <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                        <div>
                            <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem;">
                                <span>Lezioni Private</span>
                                <strong>${bookings.filter(b => b.status !== 'cancelled' && (b.lesson_type === 'private' || !b.lesson_type)).length} lezioni</strong>
                            </div>
                            <div style="height: 8px; border-radius: 4px; background: rgba(255,255,255,0.05); overflow:hidden;">
                                <div style="width: ${bookings.length ? (bookings.filter(b => b.status !== 'cancelled' && (b.lesson_type === 'private' || !b.lesson_type)).length / bookings.filter(b => b.status !== 'cancelled').length * 100) : 0}%; height:100%; background: var(--admin-cyan);"></div>
                            </div>
                        </div>
                        <div>
                            <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem;">
                                <span>Group Lessons</span>
                                <strong>${bookings.filter(b => b.status !== 'cancelled' && b.lesson_type === 'group').length} sessioni</strong>
                            </div>
                            <div style="height: 8px; border-radius: 4px; background: rgba(255,255,255,0.05); overflow:hidden;">
                                <div style="width: ${bookings.length ? (bookings.filter(b => b.status !== 'cancelled' && b.lesson_type === 'group').length / bookings.filter(b => b.status !== 'cancelled').length * 100) : 0}%; height:100%; background: var(--accent);"></div>
                            </div>
                        </div>
                        <div>
                            <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.25rem;">
                                <span>Lectures</span>
                                <strong>${bookings.filter(b => b.status !== 'cancelled' && b.lesson_type === 'lecture').length} sessioni</strong>
                            </div>
                            <div style="height: 8px; border-radius: 4px; background: rgba(255,255,255,0.05); overflow:hidden;">
                                <div style="width: ${bookings.length ? (bookings.filter(b => b.status !== 'cancelled' && b.lesson_type === 'lecture').length / bookings.filter(b => b.status !== 'cancelled').length * 100) : 0}%; height:100%; background: #6c5ce7;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card" style="min-height: 250px;">
                    <div class="card-label" style="margin-bottom: 1.25rem;">Info di Sistema</div>
                    <div style="display:flex; flex-direction:column; gap:0.65rem; font-size:0.88rem;">
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0.4rem;">
                            <span style="color:var(--admin-muted);">Data creazione report:</span>
                            <strong>${new Date().toLocaleDateString('it-IT')} ore ${new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0.4rem;">
                            <span style="color:var(--admin-muted);">Numero insegnanti in anagrafica:</span>
                            <strong>${teachers.length}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0.4rem;">
                            <span style="color:var(--admin-muted);">Numero turni inseriti:</span>
                            <strong>${availability.length}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span style="color:var(--admin-muted);">Messaggi contatti totali:</span>
                            <strong>${messages.length}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- PRENOTAZIONI TAB -->
        <div id="panel-bookings" class="tab-panel">
            <div class="section-card">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Registro Completo Prenotazioni</h2>
                        <p class="page-desc">Elenco di tutte le lezioni configurate nel sistema.</p>
                    </div>
                    <div class="search-wrapper">
                        <i class="fas fa-search"></i>
                        <input type="text" class="search-input" placeholder="Cerca lezioni…" onkeyup="filterTable('table-bookings', this.value)">
                    </div>
                </div>
                <div class="table-wrap">
                    <table id="table-bookings">
                        <thead>
                            <tr>
                                <th>Studente / Coppia</th>
                                <th>Insegnante</th>
                                <th>Data</th>
                                <th>Orario</th>
                                <th>Tipo</th>
                                <th>Prezzo</th>
                                <th>Paga Staff</th>
                                <th>Stato</th>
                                <th>Note Admin</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bookings.map(b => `
                                <tr>
                                    <td><strong>${b.registrations ? b.registrations.full_name : (b.user_id || '—')}</strong></td>
                                    <td>${b.teachers ? b.teachers.full_name : '—'}</td>
                                    <td>${b.lesson_date ? b.lesson_date.split('-').reverse().join('/') : ''}</td>
                                    <td>${b.start_time ? b.start_time.slice(0, 5) : ''} – ${b.end_time ? b.end_time.slice(0, 5) : ''}</td>
                                    <td><span class="badge ${b.lesson_type || 'private'}">${b.lesson_type || 'private'}</span></td>
                                    <td>€ ${(parseFloat(b.lesson_price) || 0).toFixed(2)}</td>
                                    <td>€ ${(parseFloat(b.staff_pay !== null && b.staff_pay !== undefined ? b.staff_pay : (b.teachers ? b.teachers.pay_rate : 0)) || 0).toFixed(2)}</td>
                                    <td><span style="font-weight:600; color:${b.status === 'cancelled' ? '#ff6b6b' : '#1dd1a1'};">${b.status || 'confirmed'}</span></td>
                                    <td><small style="color:var(--admin-muted);">${b.admin_notes || '—'}</small></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- TEACHERS TAB -->
        <div id="panel-teachers" class="tab-panel">
            <div class="section-card">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Insegnanti &amp; Conteggio Compensi</h2>
                        <p class="page-desc">Visualizza i totali lezioni fatte e le stime di paga staff.</p>
                    </div>
                    <div class="search-wrapper">
                        <i class="fas fa-search"></i>
                        <input type="text" class="search-input" placeholder="Cerca insegnante…" onkeyup="filterTable('table-teachers', this.value)">
                    </div>
                </div>
                <div class="table-wrap">
                    <table id="table-teachers">
                        <thead>
                            <tr>
                                <th>Nome Insegnante</th>
                                <th>Email</th>
                                <th>Paga Oraria</th>
                                <th>Privates</th>
                                <th>Groups</th>
                                <th>Lectures</th>
                                <th>Altro</th>
                                <th>Totale Maturato</th>
                                <th style="text-align:center;">Segnato Pagato</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.values(teacherStats).map(t => `
                                <tr>
                                    <td><strong>${t.name}</strong></td>
                                    <td>${t.email}</td>
                                    <td>€ ${t.pay_rate.toFixed(2)}</td>
                                    <td>${t.private_count}</td>
                                    <td>${t.group_count}</td>
                                    <td>${t.lecture_count}</td>
                                    <td>${t.other_count}</td>
                                    <td style="color:#feca57; font-weight:700;">€ ${t.total_pay.toFixed(2)}</td>
                                    <td style="text-align:center;"><span class="badge ${t.paid === 'Sì' ? 'yes' : 'no'}">${t.paid}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- REGISTRATIONS TAB -->
        <div id="panel-registrations" class="tab-panel">
            <div class="section-card">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Anagrafica Iscritti Camp</h2>
                        <p class="page-desc">Tutti gli iscritti registrati dal modulo entry form.</p>
                    </div>
                    <div class="search-wrapper">
                        <i class="fas fa-search"></i>
                        <input type="text" class="search-input" placeholder="Cerca iscritti…" onkeyup="filterTable('table-registrations', this.value)">
                    </div>
                </div>
                <div class="table-wrap">
                    <table id="table-registrations">
                        <thead>
                            <tr>
                                <th>Nome Completo</th>
                                <th>Email</th>
                                <th>Telefono</th>
                                <th>Ruolo</th>
                                <th>Pacchetto</th>
                                <th>Citta</th>
                                <th>Nazione</th>
                                <th>Lezioni</th>
                                <th>Quota Totale</th>
                                <th style="text-align:center;">Pagamento</th>
                                <th>Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.values(registrationStats).map(r => `
                                <tr>
                                    <td><strong>${r.name}</strong></td>
                                    <td>${r.email}</td>
                                    <td>${r.phone}</td>
                                    <td>${r.role}</td>
                                    <td><span style="color:var(--admin-cyan); font-weight:600;">${r.package}</span></td>
                                    <td>${r.city}</td>
                                    <td>${r.country}</td>
                                    <td>${r.booking_count}</td>
                                    <td style="color:#1dd1a1; font-weight:700;">€ ${(parseFloat(r.total_amount) || 0).toFixed(2)}</td>
                                    <td style="text-align:center;"><span class="badge ${r.is_paid === 'Saldato' ? 'yes' : 'no'}">${r.is_paid}</span></td>
                                    <td><small style="color:var(--admin-muted);">${r.notes || '—'}</small></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- MESSAGES TAB -->
        <div id="panel-messages" class="tab-panel">
            <div class="section-card">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Messaggi Form Contatti</h2>
                        <p class="page-desc">Archivio storico delle richieste di contatto ricevute.</p>
                    </div>
                    <div class="search-wrapper">
                        <i class="fas fa-search"></i>
                        <input type="text" class="search-input" placeholder="Cerca nei messaggi…" onkeyup="filterTable('table-messages', this.value)">
                    </div>
                </div>
                <div class="table-wrap">
                    <table id="table-messages">
                        <thead>
                            <tr>
                                <th style="width: 18%;">Mittente</th>
                                <th style="width: 18%;">Email</th>
                                <th style="width: 18%;">Oggetto</th>
                                <th style="width: 34%;">Messaggio</th>
                                <th style="width: 12%;">Ricevuto il</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${messages.map(m => `
                                <tr>
                                    <td><strong>${m.name || '—'}</strong></td>
                                    <td>${m.email || '—'}</td>
                                    <td><span style="font-weight:600; color:var(--admin-cyan);">${m.subject || '—'}</span></td>
                                    <td><small style="display:block; max-height:80px; overflow-y:auto; color:var(--admin-text);">${m.message || '—'}</small></td>
                                    <td>${m.created_at ? new Date(m.created_at).toLocaleDateString('it-IT') : '—'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    </div>

    <script>
        function switchPanel(panelId, btn) {
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
            document.getElementById(panelId).classList.add('active');
            btn.classList.add('active');
        }

        function filterTable(tableId, query) {
            const q = query.toLowerCase();
            const rows = document.querySelectorAll('#' + tableId + ' tbody tr');
            rows.forEach(r => {
                const text = r.textContent.toLowerCase();
                r.style.display = text.includes(q) ? '' : 'none';
            });
        }
    </script>
</body>
</html>`;

        camp.file('REPORT_GENERALE_CAMP.html', htmlReport);

        // README
        camp.file('LEGGIMI.txt',
            `WINTER TUSCANY CAMP 2026 — ARCHIVIO BACKUP\n` +
            `Generato il: ${new Date().toLocaleString('it-IT')}\n\n` +
            `Questo archivio contiene tutti i dati del Camp esportati in formato leggibile.\n\n` +
            `CONTENUTO:\n` +
            `  REPORT_GENERALE_CAMP.html       — Apri questo file nel browser per vedere un report interattivo elegante di tutto il Camp!\n` +
            `  1_prenotazioni_lezioni.csv       — Registro delle lezioni in formato CSV (compatibile con Excel)\n` +
            `  2_insegnanti.csv                 — Elenco degli insegnanti\n` +
            `  3_turni_disponibilita.csv        — Turni di disponibilita degli insegnanti nel database\n` +
            `  4_iscritti_camp.csv              — Elenco completo degli iscritti al Camp\n` +
            `  5_messaggi_contatti.csv          — Messaggi ricevuti dal form dei contatti (dalla tabella contacts)\n` +
            `  pagamenti_insegnanti_segnati.json— File JSON contenente lo stato dei pagamenti degli insegnanti (da localStorage)\n\n` +
            `NOTA SULLA LETTURA DEI CSV:\n` +
            `  I file CSV utilizzano il separatore punto e virgola (;) ed includono il BOM UTF-8.\n` +
            `  Possono essere aperti direttamente in Excel, Numbers o Calc senza problemi di caratteri accentati.`
        );

        setZipProgress(95, 'Compressione archivio in corso…');
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        setZipProgress(100, 'Download avviato!');

        // Trigger download
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `WinterTuscanyCamp_Backup_${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setTimeout(() => {
            const wrap = document.getElementById('export-zip-progress');
            if (wrap) wrap.style.display = 'none';
        }, 3000);

    } catch (err) {
        alert('Errore durante l\'esportazione: ' + err.message);
        console.error(err);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-download"></i> Scarica ZIP'; }
    }
};

// ── Delete single section ─────────────────────────────────────
const SECTION_LABELS = {
    bookings:             'tutte le prenotazioni lezioni',
    teacher_availability: 'tutti i turni degli insegnanti',
    teachers:             'tutti gli insegnanti (e le loro prenotazioni)',
    registrations:        'tutti gli iscritti al Camp',
    contacts:             'tutti i messaggi di contatto',
};

window.deleteSection = async (table) => {
    const label = SECTION_LABELS[table] || table;
    const keyword = 'ELIMINA';

    const typed = prompt(
        `⚠️ ATTENZIONE — operazione irreversibile!\n\n` +
        `Stai per eliminare: ${label.toUpperCase()}\n\n` +
        `Digita "${keyword}" per confermare:`
    );
    if (typed !== keyword) {
        if (typed !== null) alert('Testo non corretto. Operazione annullata.');
        return;
    }

    try {
        const { error } = await window.supabase.from(table).delete().neq('id', -1);
        if (error) throw error;
        alert(`✓ ${label} eliminat${label.endsWith('i') ? 'i' : 'a'} con successo.`);
        window.loadFineCampCounts();
    } catch (err) {
        alert('Errore: ' + err.message);
        console.error(err);
    }
};

// ── Clear localStorage paid flags ─────────────────────────────
window.clearLocalPaidFlags = () => {
    if (!confirm('Vuoi cancellare i pagamenti staff segnati in questo browser?')) return;
    localStorage.removeItem('tc_paid_teachers');
    alert('✓ Pagamenti segnati azzerati.');
};

// ── Nuclear reset (all except teachers) ──────────────────────
window.resetAllCamp = async () => {
    const keyword = 'RESET CAMP';
    const typed = prompt(
        `🚨 RESET TOTALE — operazione irreversibile!\n\n` +
        `Verranno eliminati:\n` +
        `  • Tutte le prenotazioni\n` +
        `  • Tutti i turni insegnanti\n` +
        `  • Tutti gli iscritti\n` +
        `  • Tutti i messaggi\n\n` +
        `Gli insegnanti NON vengono eliminati.\n\n` +
        `Digita "${keyword}" per confermare:`
    );
    if (typed !== keyword) {
        if (typed !== null) alert('Testo non corretto. Operazione annullata.');
        return;
    }

    const confirm2 = confirm('Ultima conferma: vuoi davvero resettare tutto il Camp?');
    if (!confirm2) return;

    const tablesToReset = ['bookings', 'teacher_availability', 'registrations', 'contacts'];
    const results = [];

    for (const table of tablesToReset) {
        try {
            const { error } = await window.supabase.from(table).delete().neq('id', -1);
            results.push({ table, ok: !error, msg: error?.message });
        } catch (e) {
            results.push({ table, ok: false, msg: e.message });
        }
    }

    localStorage.removeItem('tc_paid_teachers');

    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
        alert('Reset parziale completato. Errori:\n' + failed.map(f => `${f.table}: ${f.msg}`).join('\n'));
    } else {
        alert('✓ Reset totale completato con successo. Il Camp è pronto per una nuova edizione!');
    }

    window.loadFineCampCounts();
};