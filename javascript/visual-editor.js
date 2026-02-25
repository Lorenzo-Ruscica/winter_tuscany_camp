// Visual Editor Script
let siteTexts = window.__dynamicSiteTexts || {};
let activeElement = null;

const editorUI = document.createElement('div');
editorUI.id = 'visual-editor-ui';
editorUI.innerHTML = `
    <div style="background:#2d3436; color:white; padding:15px; border-radius:8px; border:2px solid var(--color-hot-pink); box-shadow:0 10px 30px rgba(0,0,0,0.5); display:flex; flex-direction:column; gap:10px;">
        <h3 style="margin:0; font-size:1.2rem; color:var(--color-hot-pink); display:flex; justify-content:space-between; align-items:center;">
            <span><i class="fas fa-paint-brush"></i> Editor Testi</span>
        </h3>
        <p style="margin:0; font-size:0.8rem; color:#ccc;">Clicca qualsiasi testo per modificarlo.</p>
        
        <div style="display:flex; gap:10px;">
            <select id="ve-page-nav" style="background:#111; color:white; border:1px solid #555; padding:8px; border-radius:4px; flex:1;">
                <option value="index.html">Home</option>
                <option value="programma.html">Program</option>
                <option value="guest-teachers.html">Guest Teachers</option>
                <option value="packages.html">Packages</option>
                <option value="entry-form.html">Entry Form</option>
                <option value="booking.html">Book Lesson</option>
                <option value="photogallery.html">Photogallery</option>
                <option value="contatti.html">Contact</option>
            </select>
            <button id="ve-go-btn" class="btn btn-outline" style="padding:8px; background:#444; border:none; color:white; cursor:pointer;">Vai</button>
        </div>

        <button id="ve-save-btn" class="btn btn-primary" style="padding:10px; background:#00d2d3; color:black; font-weight:bold; border:none; cursor:pointer;"><i class="fas fa-save"></i> Salva Modifiche</button>
        <button id="ve-exit-btn" class="btn btn-outline" style="padding:10px; border:1px solid #ff6b6b; color:#ff6b6b; background:transparent; cursor:pointer;"><i class="fas fa-sign-out-alt"></i> Esci</button>
    </div>
`;
editorUI.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    font-family: 'Outfit', sans-serif;
`;
document.body.appendChild(editorUI);

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const selectNav = document.getElementById('ve-page-nav');
Array.from(selectNav.options).forEach(opt => {
    if (opt.value === currentPage) opt.selected = true;
});

document.getElementById('ve-go-btn').addEventListener('click', () => {
    const page = document.getElementById('ve-page-nav').value;
    window.location.href = page + '?visualEditor=true';
});

document.getElementById('ve-save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('ve-save-btn');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    if (activeElement) activeElement.blur();

    const settingKey = 'texts_' + currentPage;

    try {
        const { error } = await window.supabase
            .from('site_settings')
            .upsert({ key: settingKey, value: JSON.stringify(siteTexts) }, { onConflict: 'key' });

        if (error) throw error;
        alert("Modifiche salvate con successo per questa pagina!");
    } catch (err) {
        console.error(err);
        alert("Errore nel salvataggio: " + err.message);
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
});

document.getElementById('ve-exit-btn').addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('visualEditor');
    window.location.href = 'admin.html';
});

document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && !editorUI.contains(link) && link.href && !link.href.startsWith('javascript') && !link.href.includes('#')) {
        e.preventDefault();
        const url = new URL(link.href);
        url.searchParams.set('visualEditor', 'true');
        window.location.href = url.href;
    }
});

function getCssPath(el) {
    if (!(el instanceof Element)) return;
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
        let selector = el.nodeName.toLowerCase();
        if (el.id && !el.id.includes('tmp') && !el.id.includes('ve-')) {
            selector += `#${el.id}`;
            path.unshift(selector);
            break;
        } else {
            let sib = el, nth = 1;
            while (sib.previousElementSibling) {
                sib = sib.previousElementSibling;
                if (sib.nodeName.toLowerCase() === selector) nth++;
            }
            if (nth !== 1) selector += `:nth-of-type(${nth})`;
        }
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(' > ');
}

const validTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'LI', 'BUTTON', 'LABEL', 'STRONG', 'EM', 'TH', 'TD', 'DIV'];

document.addEventListener('mouseover', (e) => {
    if (editorUI.contains(e.target)) return;
    if (validTags.includes(e.target.tagName)) {
        if (e.target.tagName === 'DIV' && e.target.children.length > 2) return;
        e.target.classList.add('ve-hover');
    }
});

document.addEventListener('mouseout', (e) => {
    if (e.target.classList) {
        e.target.classList.remove('ve-hover');
    }
});

document.addEventListener('click', (e) => {
    if (editorUI.contains(e.target)) return;
    if (validTags.includes(e.target.tagName)) {
        if (e.target.tagName === 'DIV' && e.target.children.length > 2) return;

        e.preventDefault();
        e.stopPropagation();

        if (activeElement && activeElement !== e.target) {
            activeElement.removeAttribute('contenteditable');
            activeElement.classList.remove('ve-editing');
        }

        activeElement = e.target;
        activeElement.setAttribute('contenteditable', 'true');
        activeElement.classList.add('ve-editing');
        activeElement.focus();
    }
}, true);

document.addEventListener('input', (e) => {
    if (e.target === activeElement) {
        const path = getCssPath(activeElement);
        if (path) {
            siteTexts[path] = activeElement.innerHTML;
        }
    }
});
