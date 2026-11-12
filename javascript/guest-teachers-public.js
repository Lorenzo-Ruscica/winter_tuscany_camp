
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

    
    if (!textContent.trim()) return;

    const lines = textContent.split('\n').filter(line => line.trim() !== '');

    list.innerHTML = ''; 

    lines.forEach(line => {
        let cleanLine = line.trim();

        
        
        cleanLine = cleanLine.replace(/(\([A-Za-z0-9]+\))/g, '<span class="country">$1</span>');

        const li = document.createElement('li');
        li.innerHTML = cleanLine;
        list.appendChild(li);
    });
}
