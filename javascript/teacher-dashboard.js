



let currentTeacherId = null;
let allBookings = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkTeacherAuth();
});


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


async function loadMySchedule() {
    const container = document.getElementById('schedule-container');

    
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

    // ── Helper: convert "HH:MM" or "HH:MM:SS" to minutes ──────────
    function toMins(t) {
        if (!t) return 0;
        const [h, m] = t.split(':');
        return parseInt(h, 10) * 60 + parseInt(m, 10);
    }

    // ── Detect overlapping pairs within a list of bookings ─────────
    function findConflictIds(bookings) {
        const conflictIds = new Set();
        for (let i = 0; i < bookings.length; i++) {
            for (let j = i + 1; j < bookings.length; j++) {
                const aS = toMins(bookings[i].start_time), aE = toMins(bookings[i].end_time);
                const bS = toMins(bookings[j].start_time), bE = toMins(bookings[j].end_time);
                if (aS < bE && aE > bS) {
                    conflictIds.add(bookings[i].id);
                    conflictIds.add(bookings[j].id);
                }
            }
        }
        return conflictIds;
    }

    // Group by date
    const grouped = {};
    bookingsToRender.forEach(b => {
        if (!grouped[b.lesson_date]) grouped[b.lesson_date] = [];
        grouped[b.lesson_date].push(b);
    });

    for (const [date, dayBookings] of Object.entries(grouped)) {
        const dateObj  = new Date(date);
        const dateNice = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        const dayName  = dateNice.charAt(0).toUpperCase() + dateNice.slice(1);

        const conflictIds = findConflictIds(dayBookings);
        const hasConflicts = conflictIds.size > 0;

        const dayGroup = document.createElement('div');
        dayGroup.className = 'day-group';

        let dayHTML = `
            <div class="day-header">
                <i class="far fa-calendar"></i> ${dayName}
            </div>`;

        // ── Conflict warning banner for the day ──────────────────────
        if (hasConflicts) {
            const conflictingTimes = dayBookings
                .filter(b => conflictIds.has(b.id))
                .map(b => `${b.start_time.slice(0,5)}–${b.end_time.slice(0,5)}`)
                .join(', ');
            dayHTML += `
            <div class="teacher-conflict-banner">
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <strong>Schedule conflict detected!</strong><br>
                    <span>The following lessons overlap on this day: <strong>${conflictingTimes}</strong>.
                    Please contact the admin to resolve the conflict.</span>
                </div>
            </div>`;
        }

        dayHTML += `<div class="timeline-wrapper">`;

        dayBookings.forEach(b => {
            let displayName = "Private Lesson";
            let cardStyle   = "border-left: 4px solid var(--color-hot-pink);";
            let iconHtml    = '<i class="far fa-user"></i>';
            let phone       = null;

            const type = (b.lesson_type || 'private').toLowerCase();

            if (type === 'lecture') {
                displayName = "LECTURE";
                cardStyle   = "border-left: 6px solid #feca57; background: #fff9e6;";
                iconHtml    = '<i class="fas fa-chalkboard-teacher" style="color:#feca57"></i>';
            } else if (type === 'group lesson') {
                displayName = "GROUP LESSON";
                cardStyle   = "border-left: 6px solid #54a0ff; background: #eaf6ff;";
                iconHtml    = '<i class="fas fa-users" style="color:#54a0ff"></i>';
            } else {
                if (b.registrations) {
                    if (b.registrations.full_name) displayName = b.registrations.full_name;
                    else {
                        const m = b.registrations.man_name   || "";
                        const w = b.registrations.woman_name || "";
                        if (m && w) displayName = `${m} & ${w}`;
                        else displayName = m || w || "Private Lesson";
                    }
                    phone = b.registrations.phone;
                }
            }

            const timeRange = `${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)}`;

            // Conflict badge on the individual card
            const conflictBadge = conflictIds.has(b.id)
                ? `<div class="teacher-conflict-card-badge">
                       <i class="fas fa-exclamation-triangle"></i> Time overlap!
                   </div>`
                : '';

            const conflictCardBorder = conflictIds.has(b.id)
                ? 'outline: 2px solid #e74c3c; outline-offset: 2px;'
                : '';

            let btns = '';
            if (type === 'private' && phone) {
                const p = phone.replace(/\s+/g, '').replace(/-/g, '');
                btns = `
                    <div style="margin-top:10px; display:flex; gap:10px;">
                        <a href="tel:${p}" style="color:#333; text-decoration:none; font-size:0.9rem; border:1px solid #ccc; padding:5px 10px; border-radius:4px;"><i class="fas fa-phone"></i> Call</a>
                        <a href="https://wa.me/${p}" target="_blank" style="color:white; background:#25D366; text-decoration:none; font-size:0.9rem; padding:5px 10px; border-radius:4px;"><i class="fab fa-whatsapp"></i> Chat</a>
                    </div>`;
            }

            dayHTML += `
                <div class="time-slot" style="margin-bottom:15px;">
                    <div class="time-label" style="font-weight:bold; color:#666; margin-bottom:5px;">${b.start_time.slice(0, 5)}</div>
                    <div class="lesson-card" style="box-shadow: 0 2px 5px rgba(0,0,0,0.05); padding:15px; border-radius:8px; background:white; ${cardStyle} ${conflictCardBorder}">
                        ${conflictBadge}
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

        dayHTML += `</div></div>`;
        dayGroup.innerHTML = dayHTML;
        container.appendChild(dayGroup);
    }
}



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