import { esc, toast, LOG, getAllPresetNames, getCurrentPresetName, getCurrentPrompts, getRealPrompts, getPresetPrompts, getPM } from "./core.js";

function computeDiff(a, b) {
    const la = a.split('\n'), lb = b.split('\n'), n = la.length, m = lb.length;
    if (n + m > 5000) { const r = [], mx = Math.max(n, m); for (let i = 0; i < mx; i++) { if (i < n && i < m) { if (la[i] === lb[i]) r.push({ t: '=', x: la[i] }); else { r.push({ t: '-', x: la[i] }); r.push({ t: '+', x: lb[i] }); } } else if (i < n) r.push({ t: '-', x: la[i] }); else r.push({ t: '+', x: lb[i] }); } return r; }
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) dp[i][j] = la[i - 1] === lb[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    const r = []; let i = n, j = m;
    while (i > 0 || j > 0) { if (i > 0 && j > 0 && la[i - 1] === lb[j - 1]) { r.unshift({ t: '=', x: la[i - 1] }); i--; j--; } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) { r.unshift({ t: '+', x: lb[j - 1] }); j--; } else { r.unshift({ t: '-', x: la[i - 1] }); i--; } } return r;
}

async function openCompare() {
    const presetNames = getAllPresetNames();
    const currentName = getCurrentPresetName();

    const overlay = document.createElement('div'); overlay.className = 'pee-overlay'; document.body.appendChild(overlay);
    const panel = document.createElement('div'); panel.className = 'pee-panel pee-lg';
    const cl = () => { overlay.remove(); panel.remove(); };
    const head = document.createElement('div'); head.className = 'pee-head';
    head.innerHTML = '<h3><i class="fa-solid fa-code-compare"></i> 预设对比</h3>';
    const closeX = document.createElement('button'); closeX.className = 'pee-close'; closeX.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeX.onclick = cl; overlay.onclick = e => { if (e.target === overlay) cl(); };
    head.appendChild(closeX); panel.appendChild(head);

    const body = document.createElement('div'); body.className = 'pee-body';

    // ── 全局搜索（跨所有预设搜条目名） ──
    const globalSearchRow = document.createElement('div'); globalSearchRow.className = 'pee-cmp-search';
    const globalSearchIn = document.createElement('input'); globalSearchIn.type = 'text'; globalSearchIn.placeholder = '全局搜索条目名（跨所有预设）…'; globalSearchRow.appendChild(globalSearchIn);
    const globalScLbl = document.createElement('label'); globalScLbl.style.cssText = 'font-size:11px;white-space:nowrap;display:flex;align-items:center;gap:3px;color:var(--SmartThemeQuoteColor,#aaa);';
    const globalScCb = document.createElement('input'); globalScCb.type = 'checkbox'; globalScLbl.appendChild(globalScCb); globalScLbl.append(' 搜内容');
    globalSearchRow.appendChild(globalScLbl);
    body.appendChild(globalSearchRow);

    // 全局搜索结果区
    const globalResultDiv = document.createElement('div'); globalResultDiv.style.cssText = 'max-height:180px;overflow-y:auto;margin-bottom:8px;display:none;border:1px solid var(--SmartThemeBorderColor,#333);border-radius:6px;';
    body.appendChild(globalResultDiv);

    function doGlobalSearch() {
        const q = globalSearchIn.value.toLowerCase().trim();
        if (!q) { globalResultDiv.style.display = 'none'; globalResultDiv.innerHTML = ''; return; }
        globalResultDiv.style.display = 'block'; globalResultDiv.innerHTML = '';
        const sc = globalScCb.checked;
        let totalHits = 0;

        presetNames.forEach(pName => {
            const items = getRealPrompts(getPresetPrompts(pName));
            const hits = items.filter(p => {
                const nm = (p.name || p.identifier || '').toLowerCase().includes(q);
                const ct = sc && (p.content || '').toLowerCase().includes(q);
                return nm || ct;
            });
            if (!hits.length) return;
            totalHits += hits.length;

            const sec = document.createElement('div'); sec.style.cssText = 'padding:2px 0;';
            const hdr = document.createElement('div'); hdr.style.cssText = 'font-size:10px;font-weight:700;color:var(--SmartThemeQuoteColor,#888);padding:3px 8px;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.04);';
            hdr.textContent = `${pName} (${hits.length})`;
            sec.appendChild(hdr);

            hits.forEach(p => {
                const row = document.createElement('div'); row.style.cssText = 'font-size:11px;padding:3px 8px;cursor:pointer;transition:background .12s;display:flex;align-items:center;gap:6px;';
                row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,.05)'; });
                row.addEventListener('mouseleave', () => { row.style.background = ''; });
                const nameSpan = document.createElement('span'); nameSpan.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                nameSpan.textContent = p.name || p.identifier;
                row.appendChild(nameSpan);
                const lenSpan = document.createElement('span'); lenSpan.style.cssText = 'font-size:10px;color:var(--SmartThemeQuoteColor,#666);';
                lenSpan.textContent = p.content ? p.content.length + 'c' : '0c';
                row.appendChild(lenSpan);

                // 点击填入 A 栏
                row.title = '点击填入左栏';
                row.addEventListener('click', () => {
                    // 确保 A 栏选中该预设
                    let found = false;
                    Array.from(colA.presetSel.options).forEach(o => { if (o.value === pName) { o.selected = true; found = true; } });
                    if (found) {
                        colA.presetSel.dispatchEvent(new Event('change'));
                        // 延迟选中条目
                        setTimeout(() => {
                            const items = cache[pName];
                            if (items) {
                                const idx = items.findIndex(x => x.identifier === p.identifier);
                                if (idx >= 0) { colA.itemSel.value = String(idx); colA.itemSel.dispatchEvent(new Event('change')); }
                            }
                        }, 50);
                    }
                });
                sec.appendChild(row);
            });
            globalResultDiv.appendChild(sec);
        });

        if (!totalHits) {
            globalResultDiv.innerHTML = '<div style="padding:10px;text-align:center;font-size:11px;opacity:.5;">无匹配</div>';
        }
    }
    globalSearchIn.addEventListener('input', doGlobalSearch);
    globalScCb.addEventListener('change', doGlobalSearch);

    const cols = document.createElement('div'); cols.className = 'pee-cmp-cols';
    const cache = {};

    function makeCol() {
        const col = document.createElement('div'); col.className = 'pee-cmp-col';
        // 栏头：只保留「📥 当前编辑中」按钮，无标题
        const hd = document.createElement('div'); hd.className = 'pee-cmp-col-head';
        const fillBtn = document.createElement('button'); fillBtn.className = 'pee-cmp-fill'; fillBtn.textContent = '📥 当前编辑中'; hd.appendChild(fillBtn);
        col.appendChild(hd);

        const presetSel = document.createElement('select'); presetSel.className = 'pee-cmp-sel';
        presetSel.innerHTML = '<option value="">— 选择预设 —</option>';
        presetNames.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; presetSel.appendChild(o); });
        col.appendChild(presetSel);

        // 栏内搜索（筛选该栏选中预设的条目列表）
        const colSearchIn = document.createElement('input'); colSearchIn.type = 'text'; colSearchIn.placeholder = '搜索条目…';
        colSearchIn.style.cssText = 'width:100%;font-size:11px;padding:4px 8px;border:none;border-bottom:1px solid var(--SmartThemeBorderColor,#333);background:rgba(255,255,255,.02);color:var(--SmartThemeBodyColor,#ccc);outline:none;box-sizing:border-box;';
        col.appendChild(colSearchIn);

        const itemSel = document.createElement('select'); itemSel.className = 'pee-cmp-sel';
        itemSel.innerHTML = '<option value="">— 先选预设 —</option>'; itemSel.disabled = true;
        col.appendChild(itemSel);

        const ta = document.createElement('textarea'); ta.className = 'pee-cmp-ta'; ta.placeholder = '选择预设→条目，或直接粘贴…';
        col.appendChild(ta);

        function populateItems(items, key) {
            cache[key] = items;
            itemSel.innerHTML = `<option value="">— 条目 (${items.length}) —</option>`;
            items.forEach((p, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = p.name || p.identifier || '#' + i; o.dataset.content = p.content || ''; itemSel.appendChild(o); });
            itemSel.disabled = false;
            applyColSearch();
        }

        function applyColSearch() {
            const q = colSearchIn.value.toLowerCase().trim();
            Array.from(itemSel.options).forEach((o, i) => {
                if (i === 0) return;
                const nm = (o.textContent || '').toLowerCase().includes(q);
                const ct = (o.dataset.content || '').toLowerCase().includes(q);
                o.style.display = (!q || nm || ct) ? '' : 'none';
            });
        }
        colSearchIn.addEventListener('input', applyColSearch);

        presetSel.addEventListener('change', () => {
            const pName = presetSel.value;
            itemSel.innerHTML = '<option value="">— 加载中… —</option>'; itemSel.disabled = true; ta.value = ''; colSearchIn.value = '';
            if (!pName) { itemSel.innerHTML = '<option value="">— 先选预设 —</option>'; return; }
            if (cache[pName]) { populateItems(cache[pName], pName); return; }
            populateItems(getRealPrompts(getPresetPrompts(pName)), pName);
        });

        itemSel.addEventListener('change', () => { const idx = parseInt(itemSel.value), k = presetSel.value; if (!isNaN(idx) && cache[k]?.[idx]) ta.value = cache[k][idx].content || ''; });

        fillBtn.addEventListener('click', () => {
            const items = getRealPrompts(getCurrentPrompts()), key = '__current__';
            let has = false; Array.from(presetSel.options).forEach(o => { if (o.value === key) { o.selected = true; has = true; } });
            if (!has) { const o = document.createElement('option'); o.value = key; o.textContent = '★ ' + currentName + ' (当前)'; presetSel.appendChild(o); o.selected = true; }
            populateItems(items, key); toast(currentName + ' — ' + items.length + ' 条');
        });

        return { col, presetSel, itemSel, ta, colSearchIn };
    }

    const colA = makeCol(), colB = makeCol();
    cols.appendChild(colA.col); cols.appendChild(colB.col); body.appendChild(cols);

    const resultDiv = document.createElement('div'); body.appendChild(resultDiv); panel.appendChild(body);
    const foot = document.createElement('div'); foot.className = 'pee-foot';

    // ── 保存/撤回 ──
    const undoStack = [];

    function getColATarget() {
        const pKey = colA.presetSel.value;
        const idx = parseInt(colA.itemSel.value);
        if (!pKey || isNaN(idx) || !cache[pKey]?.[idx]) return null;
        const item = cache[pKey][idx];
        const realPresetName = pKey === '__current__' ? currentName : pKey;
        return { item, presetName: realPresetName, idx };
    }

    // 「保存」
    const saveBtn2 = document.createElement('div'); saveBtn2.className = 'menu_button menu_button_icon';
    saveBtn2.innerHTML = '<i class="fa-solid fa-floppy-disk"></i><span>保存</span>';
    saveBtn2.title = '把左栏文本框的内容保存到左栏选中的条目';
    saveBtn2.addEventListener('click', () => {
        const target = getColATarget();
        if (!target) { toast('请先在左栏选择预设和条目'); return; }
        const newContent = colA.ta.value;
        undoStack.push({ presetName: target.presetName, identifier: target.item.identifier, oldContent: target.item.content || '' });
        try {
            const preset = getPM().getCompletionPresetByName(target.presetName);
            if (!preset || !preset.prompts) { toast('找不到预设'); return; }
            const prompt = preset.prompts.find(p => p.identifier === target.item.identifier);
            if (!prompt) { toast('找不到条目'); return; }
            prompt.content = newContent;
            getPM().savePreset(target.presetName);
            target.item.content = newContent;
            const popupTA = document.getElementById('completion_prompt_manager_popup_entry_form_prompt');
            const popupSave = document.getElementById('completion_prompt_manager_popup_entry_form_save');
            if (popupTA && popupSave) {
                const popupId = popupSave.dataset.pmPrompt;
                if (popupId === target.item.identifier) {
                    popupTA.value = newContent;
                    popupTA.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            toast('已保存「' + (target.item.name || target.item.identifier) + '」');
        } catch (e) {
            LOG('Save error:', e);
            toast('保存失败: ' + e.message);
        }
    });
    foot.appendChild(saveBtn2);

    // 「撤回」
    const undoBtn = document.createElement('div'); undoBtn.className = 'menu_button menu_button_icon';
    undoBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i><span>撤回</span>';
    undoBtn.title = '撤回上一次保存';
    undoBtn.addEventListener('click', () => {
        if (!undoStack.length) { toast('没有可撤回的操作'); return; }
        const backup = undoStack.pop();
        try {
            const preset = getPM().getCompletionPresetByName(backup.presetName);
            if (!preset || !preset.prompts) { toast('找不到预设'); return; }
            const prompt = preset.prompts.find(p => p.identifier === backup.identifier);
            if (!prompt) { toast('找不到条目'); return; }
            prompt.content = backup.oldContent;
            getPM().savePreset(backup.presetName);
            const target = getColATarget();
            if (target && target.item.identifier === backup.identifier) {
                colA.ta.value = backup.oldContent;
                target.item.content = backup.oldContent;
            }
            const popupTA = document.getElementById('completion_prompt_manager_popup_entry_form_prompt');
            const popupSave = document.getElementById('completion_prompt_manager_popup_entry_form_save');
            if (popupTA && popupSave && popupSave.dataset.pmPrompt === backup.identifier) {
                popupTA.value = backup.oldContent;
                popupTA.dispatchEvent(new Event('input', { bubbles: true }));
            }
            toast('已撤回 (剩余 ' + undoStack.length + ')');
        } catch (e) {
            LOG('Undo error:', e);
            toast('撤回失败: ' + e.message);
        }
    });
    foot.appendChild(undoBtn);

    // 分隔
    foot.appendChild(Object.assign(document.createElement('div'), { style: 'width:1px;height:24px;background:var(--SmartThemeBorderColor,#444);margin:0 2px;' }));

    // ── 对比/清空 ──
    const runBtn = document.createElement('div'); runBtn.className = 'menu_button menu_button_icon'; runBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i><span>执行对比</span>';
    runBtn.addEventListener('click', () => {
        const diff = computeDiff(colA.ta.value, colB.ta.value); resultDiv.innerHTML = '';
        const pre = document.createElement('div'); pre.className = 'pee-diff'; let has = false;
        diff.forEach(d => { const ln = document.createElement('div'); ln.className = 'pee-diff-ln'; if (d.t === '+') { ln.classList.add('pee-diff-add'); ln.textContent = '+ ' + d.x; has = true; } else if (d.t === '-') { ln.classList.add('pee-diff-rm'); ln.textContent = '- ' + d.x; has = true; } else { ln.classList.add('pee-diff-eq'); ln.textContent = '  ' + d.x; } pre.appendChild(ln); });
        if (!has) pre.innerHTML = '<div style="text-align:center;padding:16px;opacity:.6;">内容相同</div>'; resultDiv.appendChild(pre);
    }); foot.appendChild(runBtn);
    const clrBtn = document.createElement('div'); clrBtn.className = 'menu_button menu_button_icon'; clrBtn.innerHTML = '<i class="fa-solid fa-trash"></i><span>清空</span>';
    clrBtn.onclick = () => { colA.ta.value = ''; colB.ta.value = ''; colA.presetSel.value = ''; colB.presetSel.value = ''; colA.colSearchIn.value = ''; colB.colSearchIn.value = ''; colA.itemSel.innerHTML = '<option value="">— 先选预设 —</option>'; colB.itemSel.innerHTML = '<option value="">— 先选预设 —</option>'; resultDiv.innerHTML = ''; globalSearchIn.value = ''; globalResultDiv.style.display = 'none'; globalResultDiv.innerHTML = ''; };
    foot.appendChild(clrBtn); panel.appendChild(foot); document.body.appendChild(panel);
}

export { openCompare };
