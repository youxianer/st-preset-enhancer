import { esc, toast, LOG, getCurrentPresetName, getCurrentPrompts, getRealPrompts, getPM } from "./core.js";

function openSearchReplace() {
    const presetName = getCurrentPresetName();
    const prompts = getRealPrompts(getCurrentPrompts());

    const overlay = document.createElement('div'); overlay.className = 'pee-overlay'; document.body.appendChild(overlay);
    const panel = document.createElement('div'); panel.className = 'pee-panel pee-lg';
    const cl = () => { overlay.remove(); panel.remove(); };
    overlay.onclick = e => { if (e.target === overlay) cl(); };

    const head = document.createElement('div'); head.className = 'pee-head';
    head.innerHTML = `<h3><i class="fa-solid fa-magnifying-glass-arrow-right"></i> 全预设搜索替换 — ${esc(presetName)} (${prompts.length} 条)</h3>`;
    const closeX = document.createElement('button'); closeX.className = 'pee-close'; closeX.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeX.onclick = cl; head.appendChild(closeX); panel.appendChild(head);

    const body = document.createElement('div'); body.className = 'pee-body';

    // 输入区
    const inputRow = document.createElement('div'); inputRow.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:10px;';
    const r1 = document.createElement('div'); r1.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;';
    const findIn = document.createElement('input'); findIn.type = 'text'; findIn.placeholder = '搜索内容…'; findIn.style.cssText = 'flex:1;min-width:120px;font-size:12px;padding:6px 8px;border-radius:5px;border:1px solid var(--SmartThemeBorderColor,#444);background:var(--SmartThemeBlurTintColor,#222);color:var(--SmartThemeBodyColor,#ccc);font-family:var(--monoFontFamily,monospace);';
    r1.appendChild(findIn);
    const caseLbl = document.createElement('label'); caseLbl.style.cssText = 'font-size:11px;white-space:nowrap;display:flex;align-items:center;gap:3px;color:var(--SmartThemeQuoteColor,#aaa);';
    const caseCb = document.createElement('input'); caseCb.type = 'checkbox'; caseLbl.appendChild(caseCb); caseLbl.append('区分大小写');
    r1.appendChild(caseLbl);
    const regLbl = document.createElement('label'); regLbl.style.cssText = caseLbl.style.cssText;
    const regCb = document.createElement('input'); regCb.type = 'checkbox'; regLbl.appendChild(regCb); regLbl.append('正则');
    r1.appendChild(regLbl);
    inputRow.appendChild(r1);

    const r2 = document.createElement('div'); r2.style.cssText = 'display:flex;gap:6px;align-items:center;';
    const replIn = document.createElement('input'); replIn.type = 'text'; replIn.placeholder = '替换为…'; replIn.style.cssText = findIn.style.cssText;
    r2.appendChild(replIn);
    const searchBtn = document.createElement('div'); searchBtn.className = 'menu_button menu_button_icon'; searchBtn.innerHTML = '<i class="fa-solid fa-search"></i><span>搜索</span>';
    r2.appendChild(searchBtn);
    inputRow.appendChild(r2);
    body.appendChild(inputRow);

    // 结果区
    const resultInfo = document.createElement('div'); resultInfo.style.cssText = 'font-size:11px;color:var(--SmartThemeQuoteColor,#888);margin-bottom:6px;';
    body.appendChild(resultInfo);
    const resultDiv = document.createElement('div'); resultDiv.style.cssText = 'max-height:320px;overflow-y:auto;';
    body.appendChild(resultDiv);

    let matches = []; // {promptIdx, name, identifier, lineNum, lineText, matchStart, matchLen}

    function doSearch() {
        const q = findIn.value;
        if (!q) { resultInfo.textContent = ''; resultDiv.innerHTML = ''; matches = []; return; }
        matches = [];
        const isCase = caseCb.checked, isReg = regCb.checked;
        let regex;
        try {
            regex = isReg ? new RegExp(q, 'g' + (isCase ? '' : 'i')) : null;
        } catch (e) { resultInfo.textContent = '正则语法错误: ' + e.message; resultDiv.innerHTML = ''; return; }

        prompts.forEach((p, pi) => {
            if (!p.content) return;
            const lines = p.content.split('\n');
            lines.forEach((line, li) => {
                if (isReg) {
                    regex.lastIndex = 0;
                    let rm;
                    while ((rm = regex.exec(line)) !== null) {
                        matches.push({ promptIdx: pi, name: p.name || p.identifier, identifier: p.identifier, lineNum: li, lineText: line, matchStart: rm.index, matchLen: rm[0].length });
                        if (!regex.global) break;
                    }
                } else {
                    const src = isCase ? line : line.toLowerCase();
                    const tgt = isCase ? q : q.toLowerCase();
                    let pos = 0;
                    while ((pos = src.indexOf(tgt, pos)) !== -1) {
                        matches.push({ promptIdx: pi, name: p.name || p.identifier, identifier: p.identifier, lineNum: li, lineText: line, matchStart: pos, matchLen: q.length });
                        pos += q.length;
                    }
                }
            });
        });

        resultInfo.textContent = `找到 ${matches.length} 处匹配（${new Set(matches.map(m => m.promptIdx)).size} 个条目）`;
        resultDiv.innerHTML = '';
        if (!matches.length) return;

        // 按条目分组显示
        const groups = new Map();
        matches.forEach(m => {
            if (!groups.has(m.promptIdx)) groups.set(m.promptIdx, { name: m.name, items: [] });
            groups.get(m.promptIdx).items.push(m);
        });

        for (const [pi, g] of groups) {
            const sec = document.createElement('div'); sec.style.cssText = 'margin-bottom:8px;';
            const hdr = document.createElement('div'); hdr.style.cssText = 'font-size:11px;font-weight:700;color:var(--SmartThemeQuoteColor,#aaa);padding:3px 0;border-bottom:1px solid rgba(255,255,255,.06);';
            hdr.textContent = `📄 ${g.name} (${g.items.length} 处)`;
            sec.appendChild(hdr);
            // 去重行
            const seenLines = new Set();
            g.items.forEach(m => {
                const key = m.lineNum;
                if (seenLines.has(key)) return;
                seenLines.add(key);
                const row = document.createElement('div'); row.style.cssText = 'font-family:var(--monoFontFamily,monospace);font-size:11px;padding:2px 4px;line-height:1.6;word-break:break-all;';
                const lnSpan = document.createElement('span'); lnSpan.style.cssText = 'color:var(--SmartThemeQuoteColor,#666);margin-right:6px;'; lnSpan.textContent = `L${m.lineNum + 1}`;
                row.appendChild(lnSpan);
                // 高亮匹配
                const lineMatches = g.items.filter(x => x.lineNum === key).sort((a, b) => a.matchStart - b.matchStart);
                let cursor = 0;
                lineMatches.forEach(lm => {
                    if (lm.matchStart > cursor) row.appendChild(document.createTextNode(m.lineText.substring(cursor, lm.matchStart)));
                    const hl = document.createElement('mark'); hl.style.cssText = 'background:rgba(255,200,50,.3);color:inherit;padding:0 1px;border-radius:2px;';
                    hl.textContent = m.lineText.substring(lm.matchStart, lm.matchStart + lm.matchLen);
                    row.appendChild(hl);
                    cursor = lm.matchStart + lm.matchLen;
                });
                if (cursor < m.lineText.length) row.appendChild(document.createTextNode(m.lineText.substring(cursor)));
                sec.appendChild(row);
            });
            resultDiv.appendChild(sec);
        }
    }

    searchBtn.addEventListener('click', doSearch);
    findIn.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

    panel.appendChild(body);

    // 底部
    const foot = document.createElement('div'); foot.className = 'pee-foot';
    const replBtn = document.createElement('div'); replBtn.className = 'menu_button menu_button_icon';
    replBtn.innerHTML = '<i class="fa-solid fa-pen"></i><span>全部替换</span>';
    replBtn.addEventListener('click', () => {
        if (!matches.length) { toast('没有匹配项'); return; }
        const q = findIn.value, r = replIn.value;
        if (!q) return;
        const isCase = caseCb.checked, isReg = regCb.checked;
        let count = 0;
        const touched = new Set();

        prompts.forEach((p, pi) => {
            if (!p.content) return;
            const hasMatch = matches.some(m => m.promptIdx === pi);
            if (!hasMatch) return;

            let newContent;
            if (isReg) {
                try {
                    const regex = new RegExp(q, 'g' + (isCase ? '' : 'i'));
                    newContent = p.content.replace(regex, (...args) => { count++; return r; });
                } catch (e) { return; }
            } else {
                const src = p.content, tgt = q;
                let result = '', pos = 0;
                const searchIn = isCase ? src : src.toLowerCase();
                const searchFor = isCase ? tgt : tgt.toLowerCase();
                while (true) {
                    const idx = searchIn.indexOf(searchFor, pos);
                    if (idx === -1) { result += src.substring(pos); break; }
                    result += src.substring(pos, idx) + r;
                    pos = idx + tgt.length;
                    count++;
                }
                newContent = result;
            }

            if (newContent !== p.content) {
                touched.add(pi);
                // 写入预设
                try {
                    const preset = getPM().getCompletionPresetByName(presetName);
                    if (preset && preset.prompts) {
                        const target = preset.prompts.find(x => x.identifier === p.identifier);
                        if (target) { target.content = newContent; p.content = newContent; }
                    }
                } catch (e) { LOG('SR save error', e); }
            }
        });

        if (touched.size) {
            try { getPM().savePreset(presetName); } catch (e) { LOG('SR preset save error', e); }
            // 同步 popup
            const popupTA = document.getElementById('completion_prompt_manager_popup_entry_form_prompt');
            const popupSave = document.getElementById('completion_prompt_manager_popup_entry_form_save');
            if (popupTA && popupSave) {
                const popupId = popupSave.dataset.pmPrompt;
                const pp = prompts.find(x => x.identifier === popupId);
                if (pp) { popupTA.value = pp.content || ''; popupTA.dispatchEvent(new Event('input', { bubbles: true })); }
            }
        }
        toast(`已替换 ${count} 处（${touched.size} 个条目）`);
        doSearch(); // 刷新结果
    });
    foot.appendChild(replBtn);

    const closeBtn = document.createElement('div'); closeBtn.className = 'menu_button menu_button_icon';
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i><span>关闭</span>';
    closeBtn.onclick = cl;
    foot.appendChild(closeBtn);

    panel.appendChild(foot); document.body.appendChild(panel);
    findIn.focus();
}

export { openSearchReplace };
