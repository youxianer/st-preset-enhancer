import { S, done } from "./core.js";
import { onACInput, onACKey, removeDD } from "./autocomplete.js";
import { buildToolbar, buildCounter } from "./toolbar.js";
import { buildHighlight } from "./highlight.js";
import { openVarManager } from "./varmanager.js";
import { openCompare } from "./compare.js";

function enhance(ta) {
    if (done.has(ta)) return; done.add(ta);
    if (S.enableHighlight) buildHighlight(ta);
    ta.addEventListener('input', onACInput); ta.addEventListener('keydown', onACKey); ta.addEventListener('blur', () => setTimeout(removeDD, 150));
    const tb = buildToolbar(ta); if (tb) ta.parentElement.insertBefore(tb, ta.parentElement.querySelector('.pee-hl-backdrop') || ta);
    const ct = buildCounter(ta); if (ct) { if (ta.nextSibling) ta.parentElement.insertBefore(ct, ta.nextSibling); else ta.parentElement.appendChild(ct); }
}

function injectPopupButtons() {
    const saveBtn = document.getElementById('completion_prompt_manager_popup_entry_form_save');
    if (!saveBtn) return;
    const footer = saveBtn.parentElement;
    if (!footer || footer.querySelector('.pee-popup-btn')) return;

    // footer 顺序: close(左) → reset → save(右)
    // 我们要插在 save 前面，这样: close → reset → [变量] → [对比] → save
    const varBtn = document.createElement('a');
    varBtn.className = 'fa-solid fa-list-check menu_button interactable pee-popup-btn';
    varBtn.title = '变量管理器'; varBtn.tabIndex = 0; varBtn.role = 'button';
    varBtn.addEventListener('click', e => { e.preventDefault(); openVarManager(); });

    const cmpBtn = document.createElement('a');
    cmpBtn.className = 'fa-solid fa-code-compare menu_button interactable pee-popup-btn';
    cmpBtn.title = '预设对比'; cmpBtn.tabIndex = 0; cmpBtn.role = 'button';
    cmpBtn.addEventListener('click', e => { e.preventDefault(); openCompare(); });

    footer.insertBefore(cmpBtn, saveBtn);
    footer.insertBefore(varBtn, cmpBtn);
}

function scan() {
    const ta = document.getElementById('completion_prompt_manager_popup_entry_form_prompt');
    if (ta) enhance(ta);
    injectPopupButtons();

export { enhance, injectPopupButtons, scan };
