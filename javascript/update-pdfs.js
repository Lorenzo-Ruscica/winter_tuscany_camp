document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabase) return;

    try {
        const { data: settings } = await window.supabase
            .from('site_settings')
            .select('*')
            .in('key', ['pdf_program_url', 'pdf_packages_url']);

        if (!settings) return;

        const progObj = settings.find(s => s.key === 'pdf_program_url');
        const packObj = settings.find(s => s.key === 'pdf_packages_url');

        if (progObj && progObj.value) {
            const btn = document.getElementById('link-pdf-program');
            if (btn) btn.href = progObj.value;
        }

        if (packObj && packObj.value) {
            const btn = document.getElementById('link-pdf-packages');
            if (btn) btn.href = packObj.value;
        }

    } catch (e) {
        console.warn("PDF dynamic update failed:", e);
    }
});
