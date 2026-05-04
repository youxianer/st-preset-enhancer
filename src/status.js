import { esc, toast, LOG, getCurrentPresetName, getCurrentPrompts, getPM } from "./core.js";

function openPromptStatus() {
    const presetName = getCurrentPresetName();
    const allPrompts = getCurrentPrompts();
    const prompts = allPrompts.filter(p => p.identifier); // 包含 marker 的也展示

    const overlay = document.createElement('div'); overlay.className = 'pee-overlay'; document.body.appendChild(overlay);
    const panel = document.createElement('div'); panel.className = 'pee-panel pee-lg';
    const cl = () => { overlay.remove(); panel.remove(); };
    overlay.onclick = e => { if (e.target === overlay) cl(); };

    const head = document.createElement('div'); head.className = 'pee-head';
    head.innerHTML = `<h3><i class="fa-solid fa-toggle-on"></i> 条目状态 — ${esc(presetName)}</h3>`;
    const headR = document.createElement('div'); headR.style.cssText = 'display:flex;gap:4px;align-items:center;';
    const closeX = document.createElement('button'); closeX.className = 'pee-close'; closeX.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeX.onclick = cl; headR.appendChild(closeX); head.appendChild(headR); panel.appendChild(head);

    const body = document.createElement('div'); body.className = 'pee-body';
    const tbl = document.createElement('table'); tbl.className = 'pee-vtbl pee-status-tbl';
    tbl.innerHTML = `<thead><tr><th style="width:30px;">开关</th><th>名称</th><th>identifier</th><th>role</th><th>inject</th><th>字符</th></tr></thead>`;
    const tb = document.createElement('tbody');

    prompts.forEach((p, idx) => {
        const tr = document.createElement('tr');
        if (p.marker) tr.style.opacity = '.45';

        // 开关
        const tdOn = document.createElement('td');
        if (!p.marker) {
            const cb = document.createElement('input'); cb.type = 'checkbox';
            // ST 里 prompt_manager_enabled 默认是 undefined → 视为 enabled；显式 false 才是关
            cb.checked = p.enabled !== false;
            cb.addEventListener('change', () => {
                p.enabled = cb.checked;
                try {
                    const preset = getPM().getCompletionPresetByName(presetName);
                    if (preset && preset.prompts) {
                        const target = preset.prompts.find(x => x.identifier === p.identifier);
                        if (target) target.enabled = cb.checked;
                    }
                    getPM().savePreset(presetName);
                    toast((cb.checked ? '✅ 启用' : '❌ 禁用') + ' ' + (p.name || p.identifier));
                } catch (e) { toast('操作失败'); LOG(e); }
            });
            tdOn.appendChild(cb);
        } else {
            tdOn.textContent = '—';
        }
        tr.appendChild(tdOn);

        // 名称
        const tdName = document.createElement('td'); tdName.style.fontWeight = '600';
        tdName.textContent = p.name || (p.marker ? `[${p.identifier}]` : p.identifier);
        tr.appendChild(tdName);

        // identifier
        const tdId = document.createElement('td');
        tdId.style.cssText = 'font-size:10px;opacity:.7;';
        tdId.textContent = p.identifier || '';
        tr.appendChild(tdId);

        // role
        const tdRole = document.createElement('td');
        tdRole.textContent = p.role || (p.marker ? '—' : 'system');
        tr.appendChild(tdRole);

        // injection position
        const tdInject = document.createElement('td');
        const inj = p.injection_position;
        const depth = p.injection_depth;
        if (inj === 0 || inj === undefined) tdInject.textContent = '相对';
        else if (inj === 1) tdInject.textContent = depth !== undefined ? `深度 ${depth}` : '深度';
        else tdInject.textContent = String(inj);
        tr.appendChild(tdInject);

        // 字符数
        const tdLen = document.createElement('td');
        tdLen.textContent = p.content ? p.content.length.toLocaleString() : (p.marker ? '—' : '0');
        tr.appendChild(tdLen);

        tb.appendChild(tr);
    });

    tbl.appendChild(tb); body.appendChild(tbl); panel.appendChild(body);

    // 底部: 全选/全关 + 统计
    const foot = document.createElement('div'); foot.className = 'pee-foot';
    const allOn = document.createElement('div'); allOn.className = 'menu_button menu_button_icon';
    allOn.innerHTML = '<i class="fa-solid fa-toggle-on"></i><span>全部启用</span>';
    allOn.addEventListener('click', () => { batchToggle(true); });
    foot.appendChild(allOn);
    const allOff = document.createElement('div'); allOff.className = 'menu_button menu_button_icon';
    allOff.innerHTML = '<i class="fa-solid fa-toggle-off"></i><span>全部禁用</span>';
    allOff.addEventListener('click', () => { batchToggle(false); });
    foot.appendChild(allOff);

    function batchToggle(state) {
        let count = 0;
        try {
            const preset = getPM().getCompletionPresetByName(presetName);
            if (!preset || !preset.prompts) { toast('找不到预设'); return; }
            prompts.forEach(p => {
                if (p.marker) return;
                p.enabled = state;
                const target = preset.prompts.find(x => x.identifier === p.identifier);
                if (target) { target.enabled = state; count++; }
            });
            getPM().savePreset(presetName);
        } catch (e) { toast('操作失败'); LOG(e); return; }
        // 刷新 checkbox
        tb.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = state; });
        toast(`已${state ? '启用' : '禁用'} ${count} 个条目`);
    }

    panel.appendChild(foot); document.body.appendChild(panel);
}

export { openPromptStatus };
