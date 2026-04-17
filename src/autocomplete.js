import { MACRO_DB, S, esc } from "./core.js";
let $dd = null, ddIdx = -1, ddList = [];

function removeDD() { if ($dd) { $dd.remove(); $dd = null; ddIdx = -1; ddList = []; } }
function filterMacros(q) { const ql = q.toLowerCase(); return MACRO_DB.filter(e => e.m.toLowerCase().includes(ql) || e.d.toLowerCase().includes(ql)); }
function caretCoords(ta) {
    const m = document.createElement('div'), cs = getComputedStyle(ta);
    for (const p of ['fontFamily','fontSize','fontWeight','letterSpacing','lineHeight','padding','border','boxSizing','whiteSpace','wordWrap','overflowWrap','tabSize']) m.style[p] = cs[p];
    m.style.position = 'absolute'; m.style.visibility = 'hidden'; m.style.whiteSpace = 'pre-wrap'; m.style.wordWrap = 'break-word'; m.style.width = cs.width;
    m.textContent = ta.value.substring(0, ta.selectionStart);
    const sp = document.createElement('span'); sp.textContent = '|'; m.appendChild(sp); document.body.appendChild(m);
    const tR = ta.getBoundingClientRect(), sR = sp.getBoundingClientRect(), mR = m.getBoundingClientRect();
    const r = { left: tR.left + (sR.left - mR.left) - ta.scrollLeft, bottom: tR.top + (sR.bottom - mR.top) - ta.scrollTop };
    m.remove(); return r;
}
function braceStart(v, p) { for (let i = p - 1; i >= Math.max(0, p - 60); i--) if (v[i] === '{' && i > 0 && v[i - 1] === '{' && !v.substring(i + 1, p).includes('}}')) return i - 1; return -1; }
function commitAC(ta, macro) { const v = ta.value, p = ta.selectionStart; let s = braceStart(v, p); if (s < 0) s = p; const b = v.substring(0, s), a = v.substring(p); ta.value = b + macro + a; ta.selectionStart = ta.selectionEnd = b.length + macro.length; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus(); removeDD(); }
function buildDD(matches, ta, coords) {
    removeDD(); if (!matches.length) return; ddList = matches;
    const dd = document.createElement('div'); dd.className = 'pee-ac'; let last = '';
    matches.forEach(e => {
        if (e.c !== last) { last = e.c; const c = document.createElement('div'); c.className = 'pee-ac-cat'; c.textContent = e.c; dd.appendChild(c); }
        const it = document.createElement('div'); it.className = 'pee-ac-item';
        it.innerHTML = `<span class="pee-ac-m">${esc(e.m)}</span><span class="pee-ac-d">${esc(e.d)}</span>`;
        it.addEventListener('mousedown', ev => { ev.preventDefault(); commitAC(ta, e.m); }); dd.appendChild(it);
    });
    dd.style.left = Math.min(coords.left, window.innerWidth - 320) + 'px'; dd.style.top = (coords.bottom + 4) + 'px';
    document.body.appendChild(dd); $dd = dd; ddIdx = -1;
}
function highlightDD(i) { if (!$dd) return; const items = $dd.querySelectorAll('.pee-ac-item'); items.forEach(x => x.classList.remove('active')); if (i >= 0 && i < items.length) { items[i].classList.add('active'); items[i].scrollIntoView({ block: 'nearest' }); } ddIdx = i; }
function onACInput(e) { if (!S.enableAutocomplete) { removeDD(); return; } const ta = e.target, v = ta.value, p = ta.selectionStart, s = braceStart(v, p); if (s < 0) { removeDD(); return; } buildDD(filterMacros(v.substring(s, p)), ta, caretCoords(ta)); }
function onACKey(e) { if (!$dd) return; const n = ddList.length; if (e.key === 'ArrowDown') { e.preventDefault(); highlightDD((ddIdx + 1) % n); } else if (e.key === 'ArrowUp') { e.preventDefault(); highlightDD((ddIdx - 1 + n) % n); } else if (e.key === 'Enter' || e.key === 'Tab') { if (ddIdx >= 0 && ddIdx < n) { e.preventDefault(); commitAC(e.target, ddList[ddIdx].m); } } else if (e.key === 'Escape') { e.preventDefault(); removeDD(); } }

export { removeDD, onACInput, onACKey };
