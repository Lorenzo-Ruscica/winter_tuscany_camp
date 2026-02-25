// Carica la lista dei Guest Teachers da Supabase
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) return;

    try {
        const { data: settings } = await window.supabase
            .from('site_settings')
            .select('*')
            .in('key', ['guest_list_standard', 'guest_list_latin']);

        if (!settings) return;

        const stdSetting = settings.find(s => s.key === 'guest_list_standard');
        const latSetting = settings.find(s => s.key === 'guest_list_latin');

        if (stdSetting && stdSetting.value) {
            renderList('list-standard', stdSetting.value);
        }
        if (latSetting && latSetting.value) {
            renderList('list-latin', latSetting.value);
        }

    } catch (e) {
        console.error("Error loading guest teachers:", e);
    }
});

function renderList(elementId, textContent) {
    const list = document.getElementById(elementId);
    if (!list) return;

    // Se il contenuto è vuoto, non fare nulla (lascia il fallback o vuoto)
    if (!textContent.trim()) return;

    const lines = textContent.split('\n').filter(line => line.trim() !== '');

    list.innerHTML = ''; // Pulisce la lista hardcoded

    lines.forEach(line => {
        let cleanLine = line.trim();

        // Esempio: "Valdis Skutans (LAT)" -> "Valdis Skutans <span class="country">(LAT)</span>"
        // Cerca parentesi con testo dentro
        cleanLine = cleanLine.replace(/(\([A-Za-z0-9]+\))/g, '<span class="country">$1</span>');

        const li = document.createElement('li');
        li.innerHTML = cleanLine;
        list.appendChild(li);
    });
}
