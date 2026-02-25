// ==========================================
// FILE: js/teacher_dashboard.js (TIMELINE VIEW)
// ==========================================

let currentTeacherId = null;
let allBookings = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkTeacherAuth();
});

// 1. AUTENTICAZIONE
async function checkTeacherAuth() {
    const nameLabel = document.getElementById('teacher-name');
    const container = document.getElementById('schedule-container');

    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) { window.location.href = 'login.html'; return; }

        const userEmail = session.user.email;

        const { data: teacher } = await window.supabase
            .from('teachers')
            .select('*')
            .eq('email', userEmail)
            .maybeSingle();

        if (!teacher) {
            container.innerHTML = `<div style="color:red; text-align:center; margin-top:30px;">Email non associata ad un insegnante.</div>`;
            return;
        }

        currentTeacherId = teacher.id;
        nameLabel.innerText = teacher.full_name;

        await loadMySchedule();

    } catch (err) {
        console.error(err);
        nameLabel.innerText = "Error";
    }
}

// 2. CARICAMENTO DATI
async function loadMySchedule() {
    const container = document.getElementById('schedule-container');

    // Query completa
    const { data: bookings, error } = await window.supabase
        .from('bookings')
        .select(`
            *, 
            registrations ( full_name, phone, man_name, man_surname, woman_name, woman_surname )
        `)
        .eq('teacher_id', currentTeacherId)
        .neq('status', 'cancelled')
        .order('lesson_date', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) {
        container.innerHTML = `<p style="color:red; text-align:center;">Error loading data.</p>`;
        return;
    }

    allBookings = bookings || [];
    renderTimeline(allBookings);
}

// 3. RENDERIZZAZIONE "TIMELINE STYLE"
function renderTimeline(bookingsToRender) {
    const container = document.getElementById('schedule-container');
    container.innerHTML = '';

    if (bookingsToRender.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="far fa-calendar-times"></i><br>
                No lessons found.
            </div>`;
        return;
    }

    // A. RAGGRUPPIAMO LE LEZIONI PER DATA
    // Creiamo un oggetto: { "2026-05-22": [lezione1, lezione2], "2026-05-23": [...] }
    const grouped = {};
    bookingsToRender.forEach(b => {
        if (!grouped[b.lesson_date]) {
            grouped[b.lesson_date] = [];
        }
        grouped[b.lesson_date].push(b);
    });

    // B. ITERIAMO SUI GIORNI
    for (const [date, dayBookings] of Object.entries(grouped)) {

        // 1. Formatta la data header (es. "Venerdì 22 Maggio")
        const dateObj = new Date(date);
        const dateNice = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        const dayName = dateNice.charAt(0).toUpperCase() + dateNice.slice(1); // Maiuscola iniziale

        // 2. Crea il contenitore del giorno
        const dayGroup = document.createElement('div');
        dayGroup.className = 'day-group';

        // 3. Aggiungi Header Data
        let dayHTML = `
            <div class="day-header">
                <i class="far fa-calendar"></i> ${dayName}
            </div>
            <div class="timeline-wrapper">
        `;

        // 4. Aggiungi le lezioni di quel giorno (Time Slots)
        dayBookings.forEach(b => {
            // Default setup per Private Lesson
            let displayName = "Private Lesson";
            let cardStyle = "border-left: 4px solid var(--color-hot-pink);"; // Standard style
            let iconHtml = '<i class="far fa-user"></i>';
            let phone = null;

            const type = (b.lesson_type || 'private').toLowerCase();

            // GESTIONE VISIVA PER TIPO
            if (type === 'lecture') {
                displayName = "LECTURE";
                cardStyle = "border-left: 6px solid #feca57; background: #fff9e6;";
                iconHtml = '<i class="fas fa-chalkboard-teacher" style="color:#feca57"></i>';
            } else if (type === 'group lesson') {
                displayName = "GROUP LESSON";
                cardStyle = "border-left: 6px solid #54a0ff; background: #eaf6ff;";
                iconHtml = '<i class="fas fa-users" style="color:#54a0ff"></i>';
            } else {
                // Standard Booking (Private)
                if (b.registrations) {
                    if (b.registrations.full_name) displayName = b.registrations.full_name;
                    else {
                        const m = b.registrations.man_name || "";
                        const w = b.registrations.woman_name || "";
                        if (m && w) displayName = `${m} & ${w}`;
                        else displayName = m || w || "Private Lesson";
                    }
                    phone = b.registrations.phone;
                }
            }

            // Orario pulito (10:00 - 10:45)
            const timeRange = `${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)}`;

            // Bottoni Azione (Solo se c'è telefono e non è una Lecture generica)
            let btns = '';
            // Se è private e ha telefono mostriamo i tasti.
            // Se è special, magari no, a meno che non ci siano note.
            if (type === 'private' && phone) {
                const p = phone.replace(/\s+/g, '').replace(/-/g, '');
                btns = `
                     <div style="margin-top:10px; display:flex; gap:10px;">
                        <a href="tel:${p}" style="color:#333; text-decoration:none; font-size:0.9rem; border:1px solid #ccc; padding:5px 10px; border-radius:4px;"><i class="fas fa-phone"></i> Call</a>
                        <a href="https://wa.me/${p}" target="_blank" style="color:white; background:#25D366; text-decoration:none; font-size:0.9rem; padding:5px 10px; border-radius:4px;"><i class="fab fa-whatsapp"></i> Chat</a>
                    </div>`;
            }

            // HTML del singolo SLOT
            dayHTML += `
                <div class="time-slot" style="margin-bottom:15px;">
                    <div class="time-label" style="font-weight:bold; color:#666; margin-bottom:5px;">${b.start_time.slice(0, 5)}</div>
                    
                    <div class="lesson-card" style="box-shadow: 0 2px 5px rgba(0,0,0,0.05); padding:15px; border-radius:8px; background:white; ${cardStyle}">
                        <div class="lesson-couple" style="font-size:1.1rem; font-weight:bold; color:#333; margin-bottom:5px;">
                            ${iconHtml} ${displayName}
                        </div>
                        
                        <div class="lesson-details" style="color:#666; font-size:0.9rem;">
                            <span><i class="far fa-clock"></i> ${timeRange}</span>
                            <span style="margin-left:10px;"><i class="fas fa-map-marker-alt"></i> ${b.admin_notes || 'Room A'}</span>
                        </div>
                        
                        ${btns}
                    </div>
                </div>
            `;
        });

        dayHTML += `</div></div>`; // Chiude timeline-wrapper e dayHTML (Wait, loop logic check below)
        dayGroup.innerHTML = dayHTML;
        container.appendChild(dayGroup);
    }
}

// 4. FILTRI
window.filterSchedule = () => {
    const inputDate = document.getElementById('filter-date').value;
    if (!inputDate) { renderTimeline(allBookings); return; }
    const filtered = allBookings.filter(b => b.lesson_date === inputDate);
    renderTimeline(filtered);
};

window.resetFilter = () => {
    document.getElementById('filter-date').value = '';
    renderTimeline(allBookings);
};

window.logoutTeacher = async () => {
    await window.supabase.auth.signOut();
    window.location.href = 'login.html';
};