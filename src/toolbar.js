import { S, QUICK_MACROS, saveS, toast } from "./core.js";

function insertAt(ta, t, cursorOff, commit) {
    if (commit) commit();
    const p = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    ta.value = v.substring(0, p) + t + v.substring(e);
    const pos = typeof cursorOff === 'number' ? p + t.length + cursorOff : p + t.length;
    ta.selectionStart = ta.selectionEnd = pos;
    ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
}
function ensureCustomQuickInputs() {
    if (!Array.isArray(S.customQuickInputs)) S.customQuickInputs = ['', '', ''];
    while (S.customQuickInputs.length < 3) S.customQuickInputs.push('');
    return S.customQuickInputs;
}
function buildToolbar(ta) {
    if (!S.enableToolbar || ta.parentElement?.querySelector('.pee-toolbar')) return null;
    const bar = document.createElement('div'); bar.className = 'pee-toolbar';
    const lbl = document.createElement('span'); lbl.className = 'pee-toolbar-lbl'; lbl.textContent = 'MACROS'; bar.appendChild(lbl);
    const snap = { valid: false, value: '', ss: 0, se: 0 };
    let debounceTimer = null;
    const commitSnap = () => {
        if (debounceTimer !== null) { window.clearTimeout(debounceTimer); debounceTimer = null; }
        snap.value = ta.value; snap.ss = ta.selectionStart; snap.se = ta.selectionEnd; snap.valid = true;
        undoBtn.disabled = false;
    };
    ta.addEventListener('input', () => {
        if (debounceTimer !== null) window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => { debounceTimer = null; commitSnap(); }, 1000);
        undoBtn.disabled = false;
    });
    const undoBtn = document.createElement('button'); undoBtn.type = 'button'; undoBtn.className = 'pee-toolbar-btn pee-toolbar-undo'; undoBtn.textContent = '↩'; undoBtn.title = '撤回'; undoBtn.disabled = true;
    undoBtn.addEventListener('click', () => {
        if (!snap.valid) return;
        if (debounceTimer !== null) { window.clearTimeout(debounceTimer); debounceTimer = null; }
        ta.value = snap.value; ta.selectionStart = snap.ss; ta.selectionEnd = snap.se;
        ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
        snap.valid = false; undoBtn.disabled = true;
    });
    bar.appendChild(undoBtn);
    QUICK_MACROS.forEach(m => {
        if (m === null) { bar.appendChild(Object.assign(document.createElement('div'), { className: 'pee-toolbar-sep' })); return; }
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pee-toolbar-btn';
        btn.textContent = m.text;
        const customIdx = Number.isInteger(m.customIndex) ? m.customIndex : -1;
        const updateCustomTitle = () => {
            if (customIdx < 0) {
                btn.title = `${m.insert} — ${m.tip}`;
                return;
            }
            const cached = ensureCustomQuickInputs()[customIdx] || '';
            btn.title = cached ? `${cached} — ${m.tip}` : `点击设置自定义${customIdx + 1} — ${m.tip}`;
        };
        updateCustomTitle();
        let pressTimer = null;
        let didLongPress = false;
        const startLongPress = () => {
            if (customIdx < 0) return;
            didLongPress = false;
            pressTimer = window.setTimeout(() => {
                didLongPress = true;
                const cache = ensureCustomQuickInputs();
                if (!cache[customIdx]) {
                    toast(`自定义${customIdx + 1}为空`);
                    return;
                }
                cache[customIdx] = '';
                saveS();
                updateCustomTitle();
                toast(`已清空自定义${customIdx + 1}`);
            }, 700);
        };
        const cancelLongPress = () => {
            if (pressTimer !== null) {
                window.clearTimeout(pressTimer);
                pressTimer = null;
            }
        };
        btn.addEventListener('mousedown', startLongPress);
        btn.addEventListener('touchstart', startLongPress, { passive: true });
        btn.addEventListener('mouseup', cancelLongPress);
        btn.addEventListener('mouseleave', cancelLongPress);
        btn.addEventListener('touchend', cancelLongPress);
        btn.addEventListener('touchcancel', cancelLongPress);
        btn.addEventListener('click', ev => {
            ev.preventDefault();
            if (didLongPress) {
                didLongPress = false;
                return;
            }
            if (customIdx >= 0) {
                const cache = ensureCustomQuickInputs();
                let text = cache[customIdx] || '';
                if (!text) {
                    const customText = window.prompt(`输入自定义${customIdx + 1}内容：`, '');
                    if (customText === null || customText === '') return;
                    text = customText;
                    cache[customIdx] = text;
                    saveS();
                    updateCustomTitle();
                    toast(`已保存自定义${customIdx + 1}`);
                }
                insertAt(ta, text, undefined, commitSnap); return;
            }
            insertAt(ta, m.insert, m.cursor, commitSnap);
        });
        bar.appendChild(btn);
    });
    return bar;
}
function buildCounter(ta) {
    if (!S.enableCharCount || ta.parentElement?.querySelector('.pee-counter')) return null;
    const ct = document.createElement('div'); ct.className = 'pee-counter';
    let lastLen = -1;
    const upd = () => {
        const l = ta.value.length;
        if (l === lastLen) return;
        lastLen = l;
        ct.textContent = `${l} chars`;
    };
    ta.addEventListener('input', upd);
    // ST 通过 JS 赋值填充 textarea，不触发 input 事件，所以用轮询兜底
    const poll = setInterval(() => {
        if (!document.body.contains(ta)) { clearInterval(poll); return; }
        upd();
    }, 500);
    upd();
    return ct;
}

export { insertAt, buildToolbar, buildCounter };
