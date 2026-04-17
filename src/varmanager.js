import { S, esc, toast, LOG, getCurrentPresetName, getCurrentPrompts, getRealPrompts, getPM } from "./core.js";
import { openSearchReplace } from "./searchreplace.js";

function extractVars(text) {
    const vars = new Map();
    const en = (n, t) => { if (!vars.has(n)) vars.set(n, { sets: [], gets: [], type: t }); return vars.get(n); };
    let m;
    for (m of text.matchAll(/\{\{setvar::([^:}]+)::([^}]*)\}\}/gi)) en(m[1].trim(), 'local').sets.push(m[2].trim());
    for (m of text.matchAll(/\{\{getvar::([^}]+)\}\}/gi)) en(m[1].trim(), 'local').gets.push('get');
    for (m of text.matchAll(/\{\{addvar::([^:}]+)::([^}]*)\}\}/gi)) en(m[1].trim(), 'local').sets.push('+' + m[2].trim());
    for (m of text.matchAll(/\{\{(inc|dec)var::([^}]+)\}\}/gi)) en(m[2].trim(), 'local').gets.push(m[1]);
    for (m of text.matchAll(/\{\{setglobalvar::([^:}]+)::([^}]*)\}\}/gi)) { const v = en(m[1].trim(), 'global'); v.type = 'global'; v.sets.push(m[2].trim()); }
    for (m of text.matchAll(/\{\{getglobalvar::([^}]+)\}\}/gi)) { const v = en(m[1].trim(), 'global'); v.type = 'global'; v.gets.push('get'); }
    for (m of text.matchAll(/\{\{addglobalvar::([^:}]+)::([^}]*)\}\}/gi)) { const v = en(m[1].trim(), 'global'); v.type = 'global'; v.sets.push('+' + m[2].trim()); }
    for (m of text.matchAll(/\{\{(inc|dec)globalvar::([^}]+)\}\}/gi)) { const v = en(m[2].trim(), 'global'); v.type = 'global'; v.gets.push(m[1]); }
    return vars;
}

// ═══ VAR DEPENDENCY (条目依赖检查) ═══
function extractVarsPerPrompt(prompts) {
    // 返回 [{name, identifier, writes:[varName,...], reads:[varName,...]}]
    const result = [];
    prompts.forEach(p => {
        if (!p.content || p.marker) return;
        const writes = new Set(), reads = new Set();
        let m;
        for (m of p.content.matchAll(/\{\{setvar::([^:}]+)::/gi)) writes.add(m[1].trim());
        for (m of p.content.matchAll(/\{\{setglobalvar::([^:}]+)::/gi)) writes.add(m[1].trim());
        for (m of p.content.matchAll(/\{\{addvar::([^:}]+)::/gi)) writes.add(m[1].trim());
        for (m of p.content.matchAll(/\{\{addglobalvar::([^:}]+)::/gi)) writes.add(m[1].trim());
        for (m of p.content.matchAll(/\{\{(inc|dec)var::([^}]+)\}\}/gi)) writes.add(m[2].trim());
        for (m of p.content.matchAll(/\{\{(inc|dec)globalvar::([^}]+)\}\}/gi)) writes.add(m[2].trim());
        for (m of p.content.matchAll(/\{\{getvar::([^}]+)\}\}/gi)) reads.add(m[1].trim());
        for (m of p.content.matchAll(/\{\{getglobalvar::([^}]+)\}\}/gi)) reads.add(m[1].trim());
        if (writes.size || reads.size) {
            result.push({ name: p.name || p.identifier, identifier: p.identifier, writes: [...writes], reads: [...reads] });
        }
    });
    return result;
}

function openVarDeps() {
    const presetName = getCurrentPresetName();
    const prompts = getRealPrompts(getCurrentPrompts());
    const perPrompt = extractVarsPerPrompt(prompts);

    // 构建变量→写入条目、读取条目的映射
    const varMap = new Map(); // varName → {writers:[promptName,...], readers:[promptName,...]}
    perPrompt.forEach(p => {
        p.writes.forEach(v => {
            if (!varMap.has(v)) varMap.set(v, { writers: [], readers: [] });
            varMap.get(v).writers.push(p.name);
        });
        p.reads.forEach(v => {
            if (!varMap.has(v)) varMap.set(v, { writers: [], readers: [] });
            varMap.get(v).readers.push(p.name);
        });
    });

    const overlay = document.createElement('div'); overlay.className = 'pee-overlay'; document.body.appendChild(overlay);
    const panel = document.createElement('div'); panel.className = 'pee-panel pee-lg';
    const cl = () => { overlay.remove(); panel.remove(); };
    overlay.onclick = e => { if (e.target === overlay) cl(); };

    const head = document.createElement('div'); head.className = 'pee-head';
    head.innerHTML = `<h3><i class="fa-solid fa-diagram-project"></i> 变量依赖 — ${esc(presetName)} (${varMap.size} 变量)</h3>`;
    const closeX = document.createElement('button'); closeX.className = 'pee-close'; closeX.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeX.onclick = cl; head.appendChild(closeX); panel.appendChild(head);

    const body = document.createElement('div'); body.className = 'pee-body';

    if (!varMap.size) {
        body.innerHTML = '<p style="opacity:.6;text-align:center;padding:20px;">未检测到变量读写</p>';
    } else {
        // 警告区：只读无写、只写无读
        const warnings = [];
        for (const [v, info] of varMap) {
            if (!info.writers.length) warnings.push({ var: v, type: 'no-write', msg: `⚠️ 「${v}」被读取但从未设置`, readers: info.readers });
            if (!info.readers.length) warnings.push({ var: v, type: 'no-read', msg: `💤 「${v}」被设置但从未读取`, writers: info.writers });
        }

        if (warnings.length) {
            const warnSec = document.createElement('div'); warnSec.style.cssText = 'margin-bottom:12px;padding:8px;border:1px solid rgba(255,200,50,.25);border-radius:6px;background:rgba(255,200,50,.05);';
            const warnH = document.createElement('div'); warnH.style.cssText = 'font-size:11px;font-weight:700;margin-bottom:6px;color:#ed8;';
            warnH.textContent = `检测到 ${warnings.length} 个潜在问题`;
            warnSec.appendChild(warnH);
            warnings.forEach(w => {
                const row = document.createElement('div'); row.style.cssText = 'font-size:11px;padding:2px 0;line-height:1.5;';
                const detail = w.type === 'no-write' ? `读取于: ${w.readers.join(', ')}` : `设置于: ${w.writers.join(', ')}`;
                row.innerHTML = `${esc(w.msg)} <span style="color:var(--SmartThemeQuoteColor,#888);font-size:10px;">(${esc(detail)})</span>`;
                warnSec.appendChild(row);
            });
            body.appendChild(warnSec);
        }

        // 变量依赖表
        const tbl = document.createElement('table'); tbl.className = 'pee-vtbl';
        tbl.innerHTML = `<thead><tr><th>变量</th><th>写入 (set)</th><th>读取 (get)</th></tr></thead>`;
        const tb = document.createElement('tbody');

        // 按变量名排序
        const sorted = [...varMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        sorted.forEach(([v, info]) => {
            const tr = document.createElement('tr');
            const hasIssue = !info.writers.length || !info.readers.length;
            if (hasIssue) tr.style.background = 'rgba(255,200,50,.04)';

            const tdVar = document.createElement('td'); tdVar.style.fontWeight = '600';
            tdVar.textContent = v;
            tr.appendChild(tdVar);

            const tdW = document.createElement('td');
            if (info.writers.length) {
                info.writers.forEach((w, i) => {
                    if (i > 0) tdW.appendChild(document.createTextNode(', '));
                    const sp = document.createElement('span'); sp.style.cssText = 'font-size:11px;color:rgba(80,200,80,.9);';
                    sp.textContent = w; tdW.appendChild(sp);
                });
            } else {
                tdW.innerHTML = '<span style="color:#f88;font-size:11px;">未设置 ⚠️</span>';
            }
            tr.appendChild(tdW);

            const tdR = document.createElement('td');
            if (info.readers.length) {
                info.readers.forEach((r, i) => {
                    if (i > 0) tdR.appendChild(document.createTextNode(', '));
                    const sp = document.createElement('span'); sp.style.cssText = 'font-size:11px;color:rgba(100,160,255,.9);';
                    sp.textContent = r; tdR.appendChild(sp);
                });
            } else {
                tdR.innerHTML = '<span style="color:var(--SmartThemeQuoteColor,#888);font-size:11px;">未读取 💤</span>';
            }
            tr.appendChild(tdR);

            tb.appendChild(tr);
        });
        tbl.appendChild(tb); body.appendChild(tbl);

        // 条目视角
        if (perPrompt.length) {
            const secH = document.createElement('div'); secH.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--SmartThemeQuoteColor,#888);padding:10px 0 4px;border-top:1px solid rgba(255,255,255,.06);margin-top:10px;';
            secH.textContent = '按条目查看';
            body.appendChild(secH);

            perPrompt.forEach(p => {
                const row = document.createElement('div'); row.style.cssText = 'font-size:11px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.03);line-height:1.6;';
                let html = `<b>${esc(p.name)}</b>`;
                if (p.writes.length) html += ` <span style="color:rgba(80,200,80,.8);">写: ${p.writes.map(v => esc(v)).join(', ')}</span>`;
                if (p.reads.length) html += ` <span style="color:rgba(100,160,255,.8);">读: ${p.reads.map(v => esc(v)).join(', ')}</span>`;
                row.innerHTML = html;
                body.appendChild(row);
            });
        }
    }

    panel.appendChild(body);
    const foot = document.createElement('div'); foot.className = 'pee-foot';
    const closeBtn = document.createElement('div'); closeBtn.className = 'menu_button menu_button_icon';
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i><span>关闭</span>';
    closeBtn.onclick = cl; foot.appendChild(closeBtn);
    panel.appendChild(foot); document.body.appendChild(panel);
}

function openVarManager() {
    let allText = '';
    const prompts = getCurrentPrompts();
    prompts.forEach(p => { if (p && p.content) allText += '\n' + p.content; });
    const vars = extractVars(allText);

    const overlay = document.createElement('div'); overlay.className = 'pee-overlay'; document.body.appendChild(overlay);
    const panel = document.createElement('div'); panel.className = 'pee-panel pee-sm';
    const cl = () => { overlay.remove(); panel.remove(); };

    const head = document.createElement('div'); head.className = 'pee-head';
    head.innerHTML = `<h3><i class="fa-solid fa-list-check"></i> 变量管理器 (${vars.size} vars / ${prompts.length} prompts)</h3>`;
    const headR = document.createElement('div'); headR.style.cssText = 'display:flex;gap:4px;align-items:center;flex-shrink:0;';
    const rescan = document.createElement('button'); rescan.className = 'menu_button'; rescan.style.cssText = 'white-space:nowrap;padding:3px 8px;font-size:11px;'; rescan.innerHTML = '<i class="fa-solid fa-rotate"></i> 重扫';
    rescan.addEventListener('click', () => { cl(); openVarManager(); });
    headR.appendChild(rescan);
    const srBtn = document.createElement('button'); srBtn.className = 'menu_button'; srBtn.style.cssText = 'white-space:nowrap;padding:3px 8px;font-size:11px;'; srBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass-arrow-right"></i> 搜索替换';
    srBtn.addEventListener('click', () => { openSearchReplace(); });
    headR.appendChild(srBtn);
    const depBtn = document.createElement('button'); depBtn.className = 'menu_button'; depBtn.style.cssText = 'white-space:nowrap;padding:3px 8px;font-size:11px;'; depBtn.innerHTML = '<i class="fa-solid fa-diagram-project"></i> 依赖';
    depBtn.addEventListener('click', () => { openVarDeps(); });
    headR.appendChild(depBtn);
    const closeX = document.createElement('button'); closeX.className = 'pee-close'; closeX.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeX.onclick = cl; overlay.onclick = cl; headR.appendChild(closeX);
    head.appendChild(headR); panel.appendChild(head);

    const body = document.createElement('div'); body.className = 'pee-body';
    if (!vars.size) {
        body.innerHTML = `<p style="opacity:.6;text-align:center;padding:20px;">未检测到 setvar/getvar<br>预设「${esc(getCurrentPresetName())}」${prompts.length} 条目</p>`;
    } else {
        const tbl = document.createElement('table'); tbl.className = 'pee-vtbl';
        tbl.innerHTML = `<thead><tr><th>名称</th><th>类型</th><th>getvar (点击复制)</th><th>setvar 占位符 (点击复制)</th></tr></thead>`;
        const tb = document.createElement('tbody');
        for (const [n, info] of vars) {
            const isG = info.type === 'global';
            const getStr = isG ? `{{getglobalvar::${n}}}` : `{{getvar::${n}}}`;
            const setStr = isG ? `{{setglobalvar::${n}:: }}` : `{{setvar::${n}:: }}`;
            const tr = document.createElement('tr');

            // 名称
            const tdName = document.createElement('td'); tdName.style.fontWeight = '600'; tdName.textContent = n;
            tr.appendChild(tdName);

            // 类型
            const tdType = document.createElement('td'); tdType.textContent = isG ? '🌐全局' : '📌局部';
            tr.appendChild(tdType);

            // getvar 列
            const tdGet = document.createElement('td');
            const getCode = document.createElement('code');
            getCode.textContent = getStr;
            getCode.style.cssText = 'cursor:pointer;font-size:11px;';
            getCode.title = '点击复制';
            getCode.addEventListener('click', () => navigator.clipboard.writeText(getStr).then(() => toast('已复制 ' + getStr)));
            tdGet.appendChild(getCode);
            tr.appendChild(tdGet);

            // setvar 占位符列
            const tdSet = document.createElement('td');
            const setCode = document.createElement('code');
            setCode.textContent = setStr;
            setCode.style.cssText = 'cursor:pointer;font-size:11px;';
            setCode.title = '点击复制占位符';
            setCode.addEventListener('click', () => navigator.clipboard.writeText(setStr).then(() => toast('已复制 ' + setStr)));
            tdSet.appendChild(setCode);
            tr.appendChild(tdSet);

            tb.appendChild(tr);
        }
        tbl.appendChild(tb); body.appendChild(tbl);
    }
    panel.appendChild(body);

    const foot = document.createElement('div'); foot.className = 'pee-foot';
    const fb1 = document.createElement('div'); fb1.className = 'menu_button menu_button_icon';
    fb1.innerHTML = '<i class="fa-solid fa-copy"></i><span>批量复制 getvar</span>';
    fb1.onclick = () => { const l = []; for (const [n, i] of vars) l.push(i.type === 'global' ? `{{getglobalvar::${n}}}` : `{{getvar::${n}}}`); navigator.clipboard.writeText(l.join('\n')).then(() => toast(`已复制 ${l.length} 个`)); };
    foot.appendChild(fb1);
    const fb2 = document.createElement('div'); fb2.className = 'menu_button menu_button_icon';
    fb2.innerHTML = '<i class="fa-solid fa-copy"></i><span>批量复制占位符</span>';
    fb2.onclick = () => { const l = []; for (const [n, i] of vars) l.push(i.type === 'global' ? `{{setglobalvar::${n}:: }}` : `{{setvar::${n}:: }}`); navigator.clipboard.writeText(l.join('\n')).then(() => toast(`已复制 ${l.length} 个`)); };
    foot.appendChild(fb2);
    panel.appendChild(foot); document.body.appendChild(panel);
}

export { extractVars, extractVarsPerPrompt, openVarDeps, openVarManager };
