import { esc, getCurrentPresetName, getCurrentPrompts } from "./core.js";

function openPromptOrder() {
    const presetName = getCurrentPresetName();
    const allPrompts = getCurrentPrompts();
    const prompts = allPrompts.filter(p => p.identifier);

    // 分组: 相对位置的按原序，深度注入的单独列出
    const relative = [];
    const depthItems = [];
    prompts.forEach((p, idx) => {
        const inj = p.injection_position;
        if (inj === 1) {
            depthItems.push({ ...p, _origIdx: idx });
        } else {
            relative.push({ ...p, _origIdx: idx });
        }
    });
    // 深度注入按 depth 排序
    depthItems.sort((a, b) => (a.injection_depth || 0) - (b.injection_depth || 0));

    const overlay = document.createElement('div'); overlay.className = 'pee-overlay'; document.body.appendChild(overlay);
    const panel = document.createElement('div'); panel.className = 'pee-panel pee-lg';
    const cl = () => { overlay.remove(); panel.remove(); };
    overlay.onclick = e => { if (e.target === overlay) cl(); };

    const head = document.createElement('div'); head.className = 'pee-head';
    head.innerHTML = `<h3><i class="fa-solid fa-arrow-down-1-9"></i> 发送顺序预览 — ${esc(presetName)}</h3>`;
    const closeX = document.createElement('button'); closeX.className = 'pee-close'; closeX.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeX.onclick = cl; head.appendChild(closeX); panel.appendChild(head);

    const body = document.createElement('div'); body.className = 'pee-body';

    function renderSection(title, items) {
        if (!items.length) return;
        const sec = document.createElement('div'); sec.style.cssText = 'margin-bottom:12px;';
        const hdr = document.createElement('div'); hdr.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--SmartThemeQuoteColor,#888);padding:4px 0;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:4px;';
        hdr.textContent = title;
        sec.appendChild(hdr);

        items.forEach((p, i) => {
            const row = document.createElement('div'); row.className = 'pee-order-row';
            row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 6px;border-bottom:1px solid rgba(255,255,255,.03);font-size:12px;';
            if (p.enabled === false) row.style.opacity = '.35';

            const num = document.createElement('span'); num.style.cssText = 'color:var(--SmartThemeQuoteColor,#666);font-size:10px;min-width:20px;text-align:right;';
            num.textContent = String(i + 1);
            row.appendChild(num);

            const marker = document.createElement('span');
            if (p.marker) {
                marker.style.cssText = 'font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(255,200,50,.15);color:#ed8;white-space:nowrap;';
                marker.textContent = 'MARKER';
            } else {
                const roleColors = { system: 'rgba(100,100,255,.15)', user: 'rgba(80,200,80,.15)', assistant: 'rgba(200,100,255,.15)' };
                const role = p.role || 'system';
                marker.style.cssText = `font-size:10px;padding:1px 5px;border-radius:3px;background:${roleColors[role] || 'rgba(255,255,255,.08)'};white-space:nowrap;`;
                marker.textContent = role;
            }
            row.appendChild(marker);

            const name = document.createElement('span'); name.style.cssText = 'font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            name.textContent = p.name || p.identifier;
            row.appendChild(name);

            if (p.injection_position === 1) {
                const dep = document.createElement('span'); dep.style.cssText = 'font-size:10px;color:var(--SmartThemeQuoteColor,#888);';
                dep.textContent = `depth=${p.injection_depth ?? '?'}`;
                row.appendChild(dep);
            }

            const len = document.createElement('span'); len.style.cssText = 'font-size:10px;color:var(--SmartThemeQuoteColor,#666);min-width:50px;text-align:right;';
            len.textContent = p.content ? p.content.length.toLocaleString() + 'c' : (p.marker ? '' : '0c');
            row.appendChild(len);

            sec.appendChild(row);
        });
        body.appendChild(sec);
    }

    renderSection(`相对位置 (${relative.length})`, relative);
    renderSection(`深度注入 (${depthItems.length})`, depthItems);

    if (!relative.length && !depthItems.length) {
        body.innerHTML = '<p style="opacity:.6;text-align:center;padding:20px;">当前预设无条目</p>';
    }

    panel.appendChild(body);
    const foot = document.createElement('div'); foot.className = 'pee-foot';
    const closeBtn = document.createElement('div'); closeBtn.className = 'menu_button menu_button_icon';
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i><span>关闭</span>';
    closeBtn.onclick = cl; foot.appendChild(closeBtn);
    panel.appendChild(foot); document.body.appendChild(panel);
}

export { openPromptOrder };
