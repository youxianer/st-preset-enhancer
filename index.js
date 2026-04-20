// Preset Editor Enhancer v2.0
const MODULE_NAME = 'preset_enhancer';
const extensionFolderPath = `scripts/extensions/third-party/st-preset-enhancer`;
const LOG = (...a) => console.log('[PEE]', ...a);

const MACRO_DB = [
    {m:'{{original}}',d:'全局提示',c:'角色卡'},{m:'{{input}}',d:'用户输入',c:'角色卡'},
    {m:'{{charPrompt}}',d:'角色主提示覆盖',c:'角色卡'},{m:'{{charJailbreak}}',d:'角色越狱提示覆盖',c:'角色卡'},
    {m:'{{description}}',d:'角色描述',c:'角色卡'},{m:'{{personality}}',d:'人物性格',c:'角色卡'},
    {m:'{{scenario}}',d:'场景',c:'角色卡'},{m:'{{persona}}',d:'当前角色描述',c:'角色卡'},
    {m:'{{mesExamples}}',d:'对话示例',c:'角色卡'},{m:'{{mesExamplesRaw}}',d:'未格式化对话示例',c:'角色卡'},
    {m:'{{user}}',d:'用户名',c:'角色卡'},{m:'{{char}}',d:'角色名',c:'角色卡'},
    {m:'{{char_version}}',d:'角色版本号',c:'角色卡'},{m:'{{group}}',d:'群组成员名',c:'角色卡'},
    {m:'{{model}}',d:'当前模型名',c:'LLM'},
    {m:'{{lastMessage}}',d:'最新消息',c:'聊天记录'},{m:'{{lastUserMessage}}',d:'最后用户消息',c:'聊天记录'},
    {m:'{{lastCharMessage}}',d:'最后角色消息',c:'聊天记录'},{m:'{{lastMessageId}}',d:'最新消息ID',c:'聊天记录'},
    {m:'{{summary}}',d:'聊天摘要',c:'聊天记录'},
    {m:'{{time}}',d:'当前时间',c:'时间'},{m:'{{date}}',d:'当前日期',c:'时间'},{m:'{{weekday}}',d:'星期',c:'时间'},
    {m:'{{isotime}}',d:'ISO时间',c:'时间'},{m:'{{isodate}}',d:'ISO日期',c:'时间'},{m:'{{idle_duration}}',d:'空闲时长',c:'时间'},
    {m:'{{roll:1d6}}',d:'掷骰子',c:'随机'},{m:'{{random:a,b,c}}',d:'随机选择',c:'随机'},{m:'{{pick::a::b::c}}',d:'固定随机',c:'随机'},
    {m:'{{setvar::名字::值}}',d:'设置局部变量',c:'变量'},{m:'{{getvar::}}',d:'获取局部变量',c:'变量'},
    {m:'{{addvar::名字::增量}}',d:'增加局部变量',c:'变量'},{m:'{{incvar::}}',d:'局部+1',c:'变量'},{m:'{{decvar::}}',d:'局部-1',c:'变量'},
    {m:'{{setglobalvar::名字::值}}',d:'设置全局变量',c:'变量'},{m:'{{getglobalvar::}}',d:'获取全局变量',c:'变量'},
    {m:'{{incglobalvar::}}',d:'全局+1',c:'变量'},{m:'{{decglobalvar::}}',d:'全局-1',c:'变量'},
    {m:'{{var::name}}',d:'作用域变量',c:'变量'},
    {m:'{{pipe}}',d:'上一条命令结果',c:'其他'},{m:'{{newline}}',d:'换行',c:'其他'},{m:'{{trim}}',d:'修剪换行',c:'其他'},
    {m:'{{noop}}',d:'空操作',c:'其他'},{m:'{{//备注}}',d:'注释(不发送)',c:'其他'},{m:'{{isMobile}}',d:'是否移动端',c:'其他'},
    {m:'{{maxPrompt}}',d:'最大token数',c:'高级'},{m:'{{systemPrompt}}',d:'主系统提示',c:'高级'},{m:'{{instructStop}}',d:'停止序列',c:'高级'},
];

// 只保留你要的快捷按钮
const QUICK_MACROS = [
    {text:'<char>',insert:'<char>',tip:'角色名'},
    {text:'<user>',insert:'<user>',tip:'用户名'},
    {text:'trim',insert:'{{trim}}',tip:'修剪换行'},
    null,
    {text:'setvar::',insert:'{{setvar::::}}',tip:'设置局部变量'},
    {text:'getvar::',insert:'{{getvar::}}',tip:'获取局部变量'},
    {text:'setglobalvar::',insert:'{{setglobalvar::::}}',tip:'设置全局变量'},
    {text:'getglobalvar::',insert:'{{getglobalvar::}}',tip:'获取全局变量'},
    null,
    {text:'lastMessage',insert:'{{lastMessage}}',tip:'最新消息'},
    {text:'lastCharMessage',insert:'{{lastCharMessage}}',tip:'最后角色消息'},
    null,
    {text:'[ ]',insert:'[]',tip:'方括号',cursor:-1},
    {text:'( )',insert:'()',tip:'圆括号',cursor:-1},
    {text:'< >',insert:'<>',tip:'尖括号',cursor:-1},
    {text:'` `',insert:'``',tip:'行内代码',cursor:-1},
    {text:'** **',insert:'****',tip:'加粗',cursor:-2},
    {text:'{{//}}',insert:'{{//}}',tip:'注释',cursor:-2},
    {text:'自定义1',insert:'',tip:'短按插入，长按清空',customIndex:0},
    {text:'自定义2',insert:'',tip:'短按插入，长按清空',customIndex:1},
    {text:'自定义3',insert:'',tip:'短按插入，长按清空',customIndex:2},
];

const DEF = { enableAutocomplete: true, enableToolbar: true, enableCharCount: true };
let S = { ...DEF }, $dd = null, ddIdx = -1, ddList = [];
const done = new WeakSet();
const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
function toast(m, t = 2000) { const e = document.createElement('div'); e.className = 'pee-toast'; e.textContent = m; document.body.appendChild(e); setTimeout(() => e.remove(), t); }
function loadS() { const es = SillyTavern.getContext().extensionSettings; if (!es[MODULE_NAME]) es[MODULE_NAME] = { ...DEF }; S = es[MODULE_NAME]; for (const k of Object.keys(DEF)) if (!(k in S)) S[k] = DEF[k]; }
function saveS() { SillyTavern.getContext().saveSettingsDebounced(); }

// ═══ PRESET API ═══
function getPM() { return SillyTavern.getContext().getPresetManager(); }
function getAllPresetNames() { try { return getPM().getAllPresets(); } catch (e) { return []; } }
function getCurrentPresetName() { try { return getPM().getSelectedPresetName() || '(当前)'; } catch (e) { return '(当前)'; } }
function getPresetPrompts(name) { try { const p = getPM().getCompletionPresetByName(name); if (p && Array.isArray(p.prompts)) return p.prompts; } catch (e) {} return []; }
function getCurrentPrompts() { return getPresetPrompts(getCurrentPresetName()); }
function getRealPrompts(prompts) { return prompts.filter(p => !p.marker && p.identifier); }

// ═══ AUTOCOMPLETE ═══
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
    const acHeader = document.createElement('div'); acHeader.className = 'pee-ac-current-cat';
    matches.forEach(e => {
        if (e.c !== last) { last = e.c; const c = document.createElement('div'); c.className = 'pee-ac-cat'; c.textContent = e.c; dd.appendChild(c); }
        const it = document.createElement('div'); it.className = 'pee-ac-item';
        it.dataset.cat = e.c || '';
        it.innerHTML = `<span class="pee-ac-m">${esc(e.m)}</span><span class="pee-ac-d">${esc(e.d)}</span>`;
        it.addEventListener('mousedown', ev => { ev.preventDefault(); commitAC(ta, e.m); }); dd.appendChild(it);
    });
    acHeader.textContent = matches[0]?.c || '';
    dd.insertBefore(acHeader, dd.firstChild);
    const syncCatHeader = () => {
        const items = dd.querySelectorAll('.pee-ac-item');
        const top = dd.scrollTop;
        let current = matches[0]?.c || '';
        items.forEach(it => {
            if (it.offsetTop - acHeader.offsetHeight <= top) current = it.dataset.cat || current;
        });
        acHeader.textContent = current;
    };
    dd.addEventListener('scroll', syncCatHeader);
    syncCatHeader();
    dd.style.left = Math.min(coords.left, window.innerWidth - 320) + 'px'; dd.style.top = (coords.bottom + 4) + 'px';
    document.body.appendChild(dd); $dd = dd; ddIdx = -1;
}
function highlightDD(i) { if (!$dd) return; const items = $dd.querySelectorAll('.pee-ac-item'); items.forEach(x => x.classList.remove('active')); if (i >= 0 && i < items.length) { items[i].classList.add('active'); items[i].scrollIntoView({ block: 'nearest' }); } ddIdx = i; }
function onACInput(e) { if (!S.enableAutocomplete) { removeDD(); return; } const ta = e.target, v = ta.value, p = ta.selectionStart, s = braceStart(v, p); if (s < 0) { removeDD(); return; } buildDD(filterMacros(v.substring(s, p)), ta, caretCoords(ta)); }
function onACKey(e) { if (!$dd) return; const n = ddList.length; if (e.key === 'ArrowDown') { e.preventDefault(); highlightDD((ddIdx + 1) % n); } else if (e.key === 'ArrowUp') { e.preventDefault(); highlightDD((ddIdx - 1 + n) % n); } else if (e.key === 'Enter' || e.key === 'Tab') { if (ddIdx >= 0 && ddIdx < n) { e.preventDefault(); commitAC(e.target, ddList[ddIdx].m); } } else if (e.key === 'Escape') { e.preventDefault(); removeDD(); } }

// ═══ TOOLBAR + COUNTER ═══
function insertAt(ta, t, cursorOff) { const p = ta.selectionStart, e = ta.selectionEnd, v = ta.value; ta.value = v.substring(0, p) + t + v.substring(e); const pos = typeof cursorOff === 'number' ? p + t.length + cursorOff : p + t.length; ta.selectionStart = ta.selectionEnd = pos; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus(); }
function ensureCustomQuickInputs() {
    if (!Array.isArray(S.customQuickInputs)) S.customQuickInputs = ['', '', ''];
    while (S.customQuickInputs.length < 3) S.customQuickInputs.push('');
    return S.customQuickInputs;
}
function buildToolbar(ta) {
    if (!S.enableToolbar || ta.parentElement?.querySelector('.pee-toolbar')) return null;
    const bar = document.createElement('div'); bar.className = 'pee-toolbar';
    const lbl = document.createElement('span'); lbl.className = 'pee-toolbar-lbl'; lbl.textContent = 'MACROS'; bar.appendChild(lbl);
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
                insertAt(ta, text);
                return;
            }
            insertAt(ta, m.insert, m.cursor);
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

// ═══ ENHANCE + INJECT FOOTER BUTTONS ═══
function enhance(ta) {
    if (done.has(ta)) return; done.add(ta);
    ta.addEventListener('input', onACInput); ta.addEventListener('keydown', onACKey); ta.addEventListener('blur', () => setTimeout(removeDD, 150));
    const tb = buildToolbar(ta); if (tb) ta.parentElement.insertBefore(tb, ta);
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
    injectSnapshotButton();
}

function injectSnapshotButton() {
    const h3 = document.querySelector('h3[data-i18n="prompt_manager_edit"]');
    if (!h3 || h3.querySelector('.pee-snapshot-btn')) return;
    const btnStyle = 'margin-left:6px;font-size:13px;cursor:pointer;display:inline;vertical-align:middle;padding:2px 4px;';

    const snapBtn = document.createElement('a');
    snapBtn.className = 'fa-solid fa-camera menu_button interactable pee-snapshot-btn';
    snapBtn.title = '预设快照'; snapBtn.tabIndex = 0; snapBtn.role = 'button';
    snapBtn.style.cssText = btnStyle;
    snapBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openSnapshot(); });
    h3.appendChild(snapBtn);

    // 收藏选中文本
    if (S.enableSnippets !== false) {
        const saveSelBtn = document.createElement('a');
        saveSelBtn.className = 'fa-solid fa-bookmark menu_button interactable pee-snapshot-btn';
        saveSelBtn.title = '收藏选中文本'; saveSelBtn.tabIndex = 0; saveSelBtn.role = 'button';
        saveSelBtn.style.cssText = btnStyle;
        saveSelBtn.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            const ta = document.getElementById('completion_prompt_manager_popup_entry_form_prompt');
            if (!ta) { toast('请先打开条目编辑框'); return; }
            const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd);
            if (!sel) { toast('请先选中文本'); return; }
            const name = prompt('片段名称:', sel.substring(0, 30));
            if (name === null) return;
            const snippets = getSnippets();
            snippets.push({ name: name || sel.substring(0, 20), text: sel, time: Date.now() });
            saveS();
            toast('已收藏「' + (name || '片段') + '」');
        });
        h3.appendChild(saveSelBtn);

        // 插入片段（弹出快速选择）
        const insBtn = document.createElement('a');
        insBtn.className = 'fa-solid fa-paste menu_button interactable pee-snapshot-btn';
        insBtn.title = '插入收藏片段'; insBtn.tabIndex = 0; insBtn.role = 'button';
        insBtn.style.cssText = btnStyle;
        insBtn.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            const ta = document.getElementById('completion_prompt_manager_popup_entry_form_prompt');
            if (!ta) { toast('请先打开条目编辑框'); return; }
            const snippets = getSnippets();
            if (!snippets.length) { toast('暂无收藏片段'); return; }
            // 弹出一个简单的选择列表
            const existing = document.querySelector('.pee-snippet-quick');
            if (existing) { existing.remove(); return; }
            const dd = document.createElement('div'); dd.className = 'pee-snippet-quick';
            dd.style.cssText = 'position:fixed;z-index:99999;background:var(--SmartThemeBlurTintColor,#1a1a2e);border:1px solid var(--SmartThemeBorderColor,#444);border-radius:6px;max-height:240px;overflow-y:auto;min-width:200px;max-width:400px;box-shadow:0 8px 32px rgba(0,0,0,.45);font-size:12px;backdrop-filter:blur(12px);';
            const rect = insBtn.getBoundingClientRect();
            dd.style.left = Math.min(rect.left, window.innerWidth - 320) + 'px';
            dd.style.top = (rect.bottom + 4) + 'px';
            snippets.forEach((sn, i) => {
                const item = document.createElement('div');
                item.style.cssText = 'padding:6px 10px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04);transition:background .12s;';
                item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,.06)');
                item.addEventListener('mouseleave', () => item.style.background = '');
                item.innerHTML = `<b>${esc(sn.name || '未命名')}</b> <span style="opacity:.5;font-size:10px;">${sn.text.length}c</span>`;
                item.addEventListener('click', () => {
                    const p = ta.selectionStart, v = ta.value;
                    ta.value = v.substring(0, p) + sn.text + v.substring(ta.selectionEnd);
                    ta.selectionStart = ta.selectionEnd = p + sn.text.length;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                    ta.focus();
                    dd.remove();
                    toast('已插入「' + (sn.name || '片段') + '」');
                });
                dd.appendChild(item);
            });
            document.body.appendChild(dd);
            const closeDd = (ev) => { if (!dd.contains(ev.target) && ev.target !== insBtn) { dd.remove(); document.removeEventListener('mousedown', closeDd); } };
            setTimeout(() => document.addEventListener('mousedown', closeDd), 50);
        });
        h3.appendChild(insBtn);
    }
}

// ═══ VARIABLE MANAGER ═══
// Helper: find value of a {{setvar::NAME::VALUE}} with balanced {{ }} nesting
function _findBalancedValue(text, startIdx) {
    let depth = 1, i = startIdx;
    while (i < text.length - 1 && depth > 0) {
        if (text[i] === '{' && text[i + 1] === '{') { depth++; i += 2; continue; }
        if (text[i] === '}' && text[i + 1] === '}') { depth--; if (depth === 0) break; i += 2; continue; }
        i++;
    }
    return depth === 0 ? text.substring(startIdx, i) : null;
}
function extractVars(text) {
    const vars = new Map();
    const en = (n, t) => { if (!vars.has(n)) vars.set(n, { sets: [], gets: [], type: t }); return vars.get(n); };
    let m;
    // setvar / setglobalvar — use balanced-brace scanner for value
    const reSet = /\{\{(set(?:global)?var)::([^:}]+)::/gi;
    while ((m = reSet.exec(text)) !== null) {
        const isG = m[1].includes('global');
        const name = m[2].trim();
        const val = _findBalancedValue(text, m.index + m[0].length);
        if (val !== null) { const v = en(name, isG ? 'global' : 'local'); if (isG) v.type = 'global'; v.sets.push(val.trim()); }
    }
    // addvar / addglobalvar — same balanced-brace approach
    const reAdd = /\{\{(add(?:global)?var)::([^:}]+)::/gi;
    while ((m = reAdd.exec(text)) !== null) {
        const isG = m[1].includes('global');
        const name = m[2].trim();
        const val = _findBalancedValue(text, m.index + m[0].length);
        if (val !== null) { const v = en(name, isG ? 'global' : 'local'); if (isG) v.type = 'global'; v.sets.push('+' + val.trim()); }
    }
    // getvar / getglobalvar / inc / dec — no nesting issue (name-only capture)
    for (m of text.matchAll(/\{\{getvar::([^}]+)\}\}/gi)) en(m[1].trim(), 'local').gets.push('get');
    for (m of text.matchAll(/\{\{getglobalvar::([^}]+)\}\}/gi)) { const v = en(m[1].trim(), 'global'); v.type = 'global'; v.gets.push('get'); }
    for (m of text.matchAll(/\{\{(inc|dec)var::([^}]+)\}\}/gi)) en(m[2].trim(), 'local').gets.push(m[1]);
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
        const tbl = document.createElement('table'); tbl.className = 'pee-vtbl pee-vtbl-var';
        tbl.innerHTML = `<thead><tr><th>名称</th><th>类型</th><th>set 值 / 占位符 (点击复制)</th><th>getvar (点击复制)</th></tr></thead>`;
        const tb = document.createElement('tbody');
        for (const [n, info] of vars) {
            const isG = info.type === 'global';
            const getStr = isG ? `{{getglobalvar::${n}}}` : `{{getvar::${n}}}`;
            const setCmd = isG ? 'setglobalvar' : 'setvar';

            // dedupe sets keeping order, label empty vs content
            const seen = new Set();
            const uniqueSets = [];
            for (const raw of info.sets) {
                const key = raw || '';
                if (!seen.has(key)) { seen.add(key); uniqueSets.push(key); }
            }
            // if no sets at all, still push an empty template
            if (!uniqueSets.length) uniqueSets.push('');

            // main row
            const tr = document.createElement('tr');

            // 名称 (rowspan = uniqueSets count)
            const tdName = document.createElement('td'); tdName.style.fontWeight = '600'; tdName.textContent = n;
            if (uniqueSets.length > 1) tdName.rowSpan = uniqueSets.length;
            tr.appendChild(tdName);

            // 类型
            const tdType = document.createElement('td'); tdType.textContent = isG ? '🌐全局' : '📌局部';
            if (uniqueSets.length > 1) tdType.rowSpan = uniqueSets.length;
            tr.appendChild(tdType);

            // first set value
            const _mkSetTd = (val) => {
                const td = document.createElement('td');
                const lbl = document.createElement('span'); lbl.className = 'pee-vtbl-lbl'; lbl.textContent = 'SET ';
                td.appendChild(lbl);
                const fullStr = `{{${setCmd}::${n}::${val || ' '}}}`;
                const code = document.createElement('code');
                if (!val) {
                    code.textContent = fullStr;
                    code.title = '空占位符 — 点击复制';
                    code.style.cssText = 'cursor:pointer;font-size:11px;opacity:.55;';
                } else {
                    code.textContent = fullStr;
                    code.title = '点击复制';
                    code.style.cssText = 'cursor:pointer;font-size:11px;';
                }
                code.addEventListener('click', () => navigator.clipboard.writeText(fullStr).then(() => toast('已复制 ' + fullStr)));
                td.appendChild(code);
                return td;
            };
            tr.appendChild(_mkSetTd(uniqueSets[0]));

            // getvar 列 (rowspan)
            const tdGet = document.createElement('td');
            const getLbl = document.createElement('span'); getLbl.className = 'pee-vtbl-lbl'; getLbl.textContent = 'GET ';
            tdGet.appendChild(getLbl);
            const getCode = document.createElement('code');
            getCode.textContent = getStr;
            getCode.style.cssText = 'cursor:pointer;font-size:11px;';
            getCode.title = '点击复制';
            getCode.addEventListener('click', () => navigator.clipboard.writeText(getStr).then(() => toast('已复制 ' + getStr)));
            tdGet.appendChild(getCode);
            if (uniqueSets.length > 1) tdGet.rowSpan = uniqueSets.length;
            tr.appendChild(tdGet);

            tb.appendChild(tr);

            // extra rows for remaining set values
            for (let si = 1; si < uniqueSets.length; si++) {
                const sr = document.createElement('tr');
                sr.appendChild(_mkSetTd(uniqueSets[si]));
                tb.appendChild(sr);
            }
        }
        tbl.appendChild(tb); body.appendChild(tbl);
    }
    panel.appendChild(body);

    const foot = document.createElement('div'); foot.className = 'pee-foot';
    const fb1 = document.createElement('div'); fb1.className = 'menu_button menu_button_icon';
    fb1.innerHTML = '<i class="fa-solid fa-copy"></i><span>批量复制占位符</span>';
    fb1.onclick = () => { const l = []; for (const [n, i] of vars) l.push(i.type === 'global' ? `{{setglobalvar::${n}:: }}` : `{{setvar::${n}:: }}`); navigator.clipboard.writeText(l.join('\n')).then(() => toast(`已复制 ${l.length} 个`)); };
    foot.appendChild(fb1);
    const fb2 = document.createElement('div'); fb2.className = 'menu_button menu_button_icon';
    fb2.innerHTML = '<i class="fa-solid fa-copy"></i><span>批量复制 getvar</span>';
    fb2.onclick = () => { const l = []; for (const [n, i] of vars) l.push(i.type === 'global' ? `{{getglobalvar::${n}}}` : `{{getvar::${n}}}`); navigator.clipboard.writeText(l.join('\n')).then(() => toast(`已复制 ${l.length} 个`)); };
    foot.appendChild(fb2);
    panel.appendChild(foot); document.body.appendChild(panel);
}

// ═══ SEARCH & REPLACE (全预设搜索替换) ═══
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

// ═══ PROMPT STATUS (条目状态一览) ═══
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

// ═══ PROMPT ORDER (条目顺序预览) ═══
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

// ═══ COMPARE ═══
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

// ═══ CLONE (条目克隆/跨预设复制) ═══
function openClone() {
    const presetNames = getAllPresetNames();
    const currentName = getCurrentPresetName();

    const overlay = document.createElement('div'); overlay.className = 'pee-overlay'; document.body.appendChild(overlay);
    const panel = document.createElement('div'); panel.className = 'pee-panel pee-lg';
    const cl = () => { overlay.remove(); panel.remove(); };
    overlay.onclick = e => { if (e.target === overlay) cl(); };

    const head = document.createElement('div'); head.className = 'pee-head';
    head.innerHTML = '<h3><i class="fa-solid fa-clone"></i> 条目克隆</h3>';
    const closeX = document.createElement('button'); closeX.className = 'pee-close'; closeX.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeX.onclick = cl; head.appendChild(closeX); panel.appendChild(head);

    const body = document.createElement('div'); body.className = 'pee-body';

    // 源预设选择
    const srcRow = document.createElement('div'); srcRow.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;';
    srcRow.innerHTML = '<span style="font-size:11px;font-weight:700;min-width:50px;">源预设:</span>';
    const srcSel = document.createElement('select'); srcSel.className = 'pee-cmp-sel'; srcSel.style.flex = '1';
    srcSel.innerHTML = '<option value="">— 选择源预设 —</option>';
    presetNames.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; srcSel.appendChild(o); });
    srcRow.appendChild(srcSel);
    const srcFill = document.createElement('button'); srcFill.className = 'pee-cmp-fill'; srcFill.textContent = '📥 当前预设';
    srcFill.addEventListener('click', () => { srcSel.value = ''; const o = document.createElement('option'); o.value = '__current__'; o.textContent = '★ ' + currentName; srcSel.appendChild(o); srcSel.value = '__current__'; srcSel.dispatchEvent(new Event('change')); });
    srcRow.appendChild(srcFill);
    body.appendChild(srcRow);

    // 条目列表（多选）
    const listDiv = document.createElement('div'); listDiv.style.cssText = 'max-height:250px;overflow-y:auto;border:1px solid var(--SmartThemeBorderColor,#333);border-radius:6px;margin-bottom:8px;';
    listDiv.innerHTML = '<div style="padding:12px;text-align:center;opacity:.5;font-size:11px;">先选择源预设</div>';
    body.appendChild(listDiv);

    let srcItems = [];
    srcSel.addEventListener('change', () => {
        const pName = srcSel.value;
        if (!pName) { listDiv.innerHTML = '<div style="padding:12px;text-align:center;opacity:.5;font-size:11px;">先选择源预设</div>'; srcItems = []; return; }
        const prompts = getRealPrompts(pName === '__current__' ? getCurrentPrompts() : getPresetPrompts(pName));
        srcItems = prompts;
        listDiv.innerHTML = '';
        if (!prompts.length) { listDiv.innerHTML = '<div style="padding:12px;text-align:center;opacity:.5;font-size:11px;">该预设无条目</div>'; return; }
        prompts.forEach((p, i) => {
            const row = document.createElement('label'); row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:11px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.03);';
            const cb = document.createElement('input'); cb.type = 'checkbox'; cb.dataset.idx = i;
            row.appendChild(cb);
            const name = document.createElement('span'); name.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            name.textContent = p.name || p.identifier;
            row.appendChild(name);
            const role = document.createElement('span'); role.style.cssText = 'font-size:10px;color:var(--SmartThemeQuoteColor,#888);';
            role.textContent = p.role || 'system';
            row.appendChild(role);
            const len = document.createElement('span'); len.style.cssText = 'font-size:10px;color:var(--SmartThemeQuoteColor,#666);min-width:40px;text-align:right;';
            len.textContent = p.content ? p.content.length + 'c' : '0c';
            row.appendChild(len);
            listDiv.appendChild(row);
        });
    });

    // 目标预设
    const dstRow = document.createElement('div'); dstRow.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:4px;flex-wrap:wrap;';
    dstRow.innerHTML = '<span style="font-size:11px;font-weight:700;min-width:50px;">目标预设:</span>';
    const dstSel = document.createElement('select'); dstSel.className = 'pee-cmp-sel'; dstSel.style.flex = '1';
    dstSel.innerHTML = '<option value="">— 选择目标预设 —</option>';
    presetNames.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; dstSel.appendChild(o); });
    dstRow.appendChild(dstSel);
    body.appendChild(dstRow);

    // 插入位置选择
    const posRow = document.createElement('div'); posRow.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:4px;flex-wrap:wrap;';
    posRow.innerHTML = '<span style="font-size:11px;font-weight:700;min-width:50px;">插入位置:</span>';
    const posSel = document.createElement('select'); posSel.className = 'pee-cmp-sel'; posSel.style.flex = '1';
    posSel.innerHTML = '<option value="end">末尾</option><option value="start">开头</option>';
    posRow.appendChild(posSel);
    const posInfo = document.createElement('span'); posInfo.style.cssText = 'font-size:10px;color:var(--SmartThemeQuoteColor,#888);';
    posInfo.textContent = '选择目标预设后可选「在某条目之后」';
    posRow.appendChild(posInfo);
    body.appendChild(posRow);

    // 目标预设变化时更新插入位置下拉
    dstSel.addEventListener('change', () => {
        const dstName = dstSel.value;
        // 保留前两个固定选项
        while (posSel.options.length > 2) posSel.remove(2);
        if (!dstName) return;
        const dstPrompts = getRealPrompts(getPresetPrompts(dstName));
        dstPrompts.forEach((p, i) => {
            const o = document.createElement('option'); o.value = 'after:' + i;
            o.textContent = '在「' + (p.name || p.identifier) + '」之后';
            posSel.appendChild(o);
        });
    });

    panel.appendChild(body);

    const foot = document.createElement('div'); foot.className = 'pee-foot';
    const selAll = document.createElement('div'); selAll.className = 'menu_button menu_button_icon';
    selAll.innerHTML = '<i class="fa-solid fa-check-double"></i><span>全选</span>';
    selAll.onclick = () => listDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    foot.appendChild(selAll);

    const cloneBtn = document.createElement('div'); cloneBtn.className = 'menu_button menu_button_icon';
    cloneBtn.innerHTML = '<i class="fa-solid fa-clone"></i><span>克隆到目标</span>';
    cloneBtn.addEventListener('click', async () => {
        const dstName = dstSel.value;
        if (!dstName) { toast('请选择目标预设'); return; }
        const checked = [...listDiv.querySelectorAll('input[type="checkbox"]:checked')].map(cb => parseInt(cb.dataset.idx));
        if (!checked.length) { toast('请勾选要克隆的条目'); return; }

        try {
            const dstPreset = getPM().getCompletionPresetByName(dstName);
            if (!dstPreset || !dstPreset.prompts) { toast('找不到目标预设'); return; }

            // 确定插入位置
            const posVal = posSel.value;
            let insertIdx;
            if (posVal === 'start') {
                insertIdx = 0;
            } else if (posVal.startsWith('after:')) {
                const afterIdx = parseInt(posVal.split(':')[1]);
                // 找到目标预设中 real prompts 对应的实际 index
                const realPrompts = getRealPrompts(dstPreset.prompts);
                if (afterIdx >= 0 && afterIdx < realPrompts.length) {
                    const targetId = realPrompts[afterIdx].identifier;
                    insertIdx = dstPreset.prompts.findIndex(p => p.identifier === targetId) + 1;
                } else {
                    insertIdx = dstPreset.prompts.length;
                }
            } else {
                insertIdx = dstPreset.prompts.length; // end
            }

            let count = 0;
            checked.forEach((idx, ci) => {
                const src = srcItems[idx];
                if (!src) return;
                const exists = dstPreset.prompts.some(p => p.identifier === src.identifier);
                const clone = JSON.parse(JSON.stringify(src));
                if (exists) {
                    clone.identifier = src.identifier + '_copy_' + Date.now().toString(36).slice(-4);
                    clone.name = (src.name || src.identifier) + ' (副本)';
                }
                dstPreset.prompts.splice(insertIdx + ci, 0, clone);

                // 同步插入 prompt_order
                if (Array.isArray(dstPreset.prompt_order)) {
                    dstPreset.prompt_order.forEach(po => {
                        if (!Array.isArray(po.order)) return;
                        // 找插入位置：insertIdx 对应的 prompts 条目的 identifier
                        let orderIdx = po.order.length; // 默认末尾
                        if (insertIdx + ci > 0) {
                            const refPrompt = dstPreset.prompts[insertIdx + ci - 1];
                            if (refPrompt) {
                                const refPos = po.order.findIndex(o => o.identifier === refPrompt.identifier);
                                if (refPos >= 0) orderIdx = refPos + 1;
                            }
                        } else {
                            orderIdx = 0;
                        }
                        po.order.splice(orderIdx, 0, { identifier: clone.identifier, enabled: true });
                    });
                }
                count++;
            });

            await getPM().savePreset(dstName, dstPreset);
            window.toastr.success(`已克隆 ${count} 个条目到「${dstName}」`);
        } catch (e) {
            LOG('Clone error:', e);
            window.toastr.error('克隆失败: ' + e.message);
        }
    });
    foot.appendChild(cloneBtn);

    const closeBtn = document.createElement('div'); closeBtn.className = 'menu_button menu_button_icon';
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i><span>关闭</span>';
    closeBtn.onclick = cl; foot.appendChild(closeBtn);
    panel.appendChild(foot); document.body.appendChild(panel);
}

// ═══ SNIPPETS (条目片段收藏) ═══
function getSnippets() {
    const es = SillyTavern.getContext().extensionSettings;
    if (!es[MODULE_NAME]) es[MODULE_NAME] = {};
    if (!es[MODULE_NAME].snippets) es[MODULE_NAME].snippets = [];
    return es[MODULE_NAME].snippets;
}

function openSnippets() {
    const snippets = getSnippets();

    const overlay = document.createElement('div'); overlay.className = 'pee-overlay'; document.body.appendChild(overlay);
    const panel = document.createElement('div'); panel.className = 'pee-panel pee-lg';
    const cl = () => { overlay.remove(); panel.remove(); };
    overlay.onclick = e => { if (e.target === overlay) cl(); };

    const head = document.createElement('div'); head.className = 'pee-head';
    head.innerHTML = `<h3><i class="fa-solid fa-bookmark"></i> 片段收藏 (${snippets.length})</h3>`;
    const closeX = document.createElement('button'); closeX.className = 'pee-close'; closeX.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeX.onclick = cl; head.appendChild(closeX); panel.appendChild(head);

    const body = document.createElement('div'); body.className = 'pee-body';

    function render() {
        body.innerHTML = '';
        if (!snippets.length) {
            body.innerHTML = '<p style="opacity:.5;text-align:center;padding:20px;font-size:12px;">暂无收藏片段<br>在编辑框中选中文本后点击工具栏「📌收藏」可添加</p>';
            // 更新标题计数
            head.querySelector('h3').innerHTML = `<i class="fa-solid fa-bookmark"></i> 片段收藏 (0)`;
            return;
        }
        head.querySelector('h3').innerHTML = `<i class="fa-solid fa-bookmark"></i> 片段收藏 (${snippets.length})`;

        snippets.forEach((sn, i) => {
            const card = document.createElement('div'); card.style.cssText = 'border:1px solid var(--SmartThemeBorderColor,#333);border-radius:6px;margin-bottom:6px;overflow:hidden;';

            const cardHead = document.createElement('div'); cardHead.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 8px;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.04);';
            const nameSpan = document.createElement('span'); nameSpan.style.cssText = 'flex:1;font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            nameSpan.textContent = sn.name || '未命名片段';
            nameSpan.title = sn.name;
            cardHead.appendChild(nameSpan);

            const lenSpan = document.createElement('span'); lenSpan.style.cssText = 'font-size:10px;color:var(--SmartThemeQuoteColor,#666);';
            lenSpan.textContent = sn.text.length + 'c';
            cardHead.appendChild(lenSpan);

            // 插入按钮
            const insertBtn = document.createElement('button'); insertBtn.style.cssText = 'font-size:10px;padding:2px 6px;border-radius:3px;border:1px solid var(--SmartThemeBorderColor,#444);background:var(--SmartThemeBlurTintColor,#222);color:var(--SmartThemeBodyColor,#ccc);cursor:pointer;white-space:nowrap;';
            insertBtn.textContent = '📋 插入';
            insertBtn.addEventListener('click', () => {
                const ta = document.getElementById('completion_prompt_manager_popup_entry_form_prompt');
                if (!ta) { toast('请先打开条目编辑框'); return; }
                const p = ta.selectionStart, v = ta.value;
                ta.value = v.substring(0, p) + sn.text + v.substring(ta.selectionEnd);
                ta.selectionStart = ta.selectionEnd = p + sn.text.length;
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                ta.focus();
                toast('已插入「' + (sn.name || '片段') + '」');
            });
            cardHead.appendChild(insertBtn);

            // 复制按钮
            const copyBtn = document.createElement('button'); copyBtn.style.cssText = insertBtn.style.cssText;
            copyBtn.textContent = '📄 复制';
            copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(sn.text).then(() => toast('已复制')); });
            cardHead.appendChild(copyBtn);

            // 删除按钮
            const delBtn = document.createElement('button'); delBtn.style.cssText = insertBtn.style.cssText + 'color:#f88;';
            delBtn.textContent = '✕';
            delBtn.addEventListener('click', () => {
                snippets.splice(i, 1);
                saveS();
                render();
            });
            cardHead.appendChild(delBtn);

            card.appendChild(cardHead);

            // 预览
            const preview = document.createElement('div'); preview.style.cssText = 'font-family:var(--monoFontFamily,monospace);font-size:11px;padding:6px 8px;max-height:80px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;opacity:.7;';
            preview.textContent = sn.text.length > 300 ? sn.text.substring(0, 300) + '…' : sn.text;
            card.appendChild(preview);

            body.appendChild(card);
        });
    }
    render();

    panel.appendChild(body);

    const foot = document.createElement('div'); foot.className = 'pee-foot';

    // 手动添加
    const addBtn = document.createElement('div'); addBtn.className = 'menu_button menu_button_icon';
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i><span>手动添加</span>';
    addBtn.addEventListener('click', () => {
        const name = prompt('片段名称:');
        if (name === null) return;
        const text = prompt('片段内容:');
        if (!text) { toast('内容不能为空'); return; }
        snippets.push({ name: name || '未命名', text, time: Date.now() });
        saveS();
        render();
        toast('已添加片段');
    });
    foot.appendChild(addBtn);

    // 从当前编辑框选中文本添加
    const fromSelBtn = document.createElement('div'); fromSelBtn.className = 'menu_button menu_button_icon';
    fromSelBtn.innerHTML = '<i class="fa-solid fa-text-slash"></i><span>收藏选中文本</span>';
    fromSelBtn.addEventListener('click', () => {
        const ta = document.getElementById('completion_prompt_manager_popup_entry_form_prompt');
        if (!ta) { toast('请先打开条目编辑框'); return; }
        const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd);
        if (!sel) { toast('请先在编辑框中选中文本'); return; }
        const name = prompt('片段名称:', sel.substring(0, 30));
        if (name === null) return;
        snippets.push({ name: name || sel.substring(0, 20), text: sel, time: Date.now() });
        saveS();
        render();
        toast('已收藏');
    });
    foot.appendChild(fromSelBtn);

    // 导出
    const expBtn = document.createElement('div'); expBtn.className = 'menu_button menu_button_icon';
    expBtn.innerHTML = '<i class="fa-solid fa-download"></i><span>导出</span>';
    expBtn.addEventListener('click', () => {
        const json = JSON.stringify(snippets, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pee-snippets.json'; a.click();
        toast('已导出 ' + snippets.length + ' 个片段');
    });
    foot.appendChild(expBtn);

    // 导入
    const impBtn = document.createElement('div'); impBtn.className = 'menu_button menu_button_icon';
    impBtn.innerHTML = '<i class="fa-solid fa-upload"></i><span>导入</span>';
    impBtn.addEventListener('click', () => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
        input.addEventListener('change', () => {
            const file = input.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const arr = JSON.parse(reader.result);
                    if (!Array.isArray(arr)) throw new Error('不是数组');
                    let count = 0;
                    arr.forEach(sn => {
                        if (sn && typeof sn.text === 'string') { snippets.push({ name: sn.name || '导入', text: sn.text, time: Date.now() }); count++; }
                    });
                    saveS(); render();
                    toast('已导入 ' + count + ' 个片段');
                } catch (e) { toast('导入失败: ' + e.message); }
            };
            reader.readAsText(file);
        });
        input.click();
    });
    foot.appendChild(impBtn);

    const closeBtn = document.createElement('div'); closeBtn.className = 'menu_button menu_button_icon';
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i><span>关闭</span>';
    closeBtn.onclick = cl; foot.appendChild(closeBtn);
    panel.appendChild(foot); document.body.appendChild(panel);
}

// ═══ SNAPSHOT (预设快照) ═══
function getSnapshots() {
    const es = SillyTavern.getContext().extensionSettings;
    if (!es[MODULE_NAME]) es[MODULE_NAME] = {};
    if (!es[MODULE_NAME].snapshots) es[MODULE_NAME].snapshots = [];
    return es[MODULE_NAME].snapshots;
}

function openSnapshot() {
    const presetName = getCurrentPresetName();
    const snapshots = getSnapshots();

    const overlay = document.createElement('div'); overlay.className = 'pee-overlay'; document.body.appendChild(overlay);
    const panel = document.createElement('div'); panel.className = 'pee-panel pee-lg';
    const cl = () => { overlay.remove(); panel.remove(); };
    overlay.onclick = e => { if (e.target === overlay) cl(); };

    const head = document.createElement('div'); head.className = 'pee-head';
    head.innerHTML = `<h3><i class="fa-solid fa-camera"></i> 预设快照 — ${esc(presetName)}</h3>`;
    const closeX = document.createElement('button'); closeX.className = 'pee-close'; closeX.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeX.onclick = cl; head.appendChild(closeX); panel.appendChild(head);

    const body = document.createElement('div'); body.className = 'pee-body';

    function render() {
        body.innerHTML = '';
        // 只显示当前预设的快照
        const mine = snapshots.filter(s => s.presetName === presetName);
        if (!mine.length) {
            body.innerHTML = '<p style="opacity:.5;text-align:center;padding:20px;font-size:12px;">当前预设暂无快照<br>点击「拍快照」保存当前状态</p>';
            return;
        }

        mine.sort((a, b) => b.time - a.time);
        mine.forEach((snap, mi) => {
            const idx = snapshots.indexOf(snap);
            const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--SmartThemeBorderColor,#333);border-radius:6px;margin-bottom:6px;';

            const info = document.createElement('div'); info.style.cssText = 'flex:1;';
            const nameEl = document.createElement('div'); nameEl.style.cssText = 'font-size:12px;font-weight:600;';
            nameEl.textContent = snap.name || '快照';
            info.appendChild(nameEl);
            const meta = document.createElement('div'); meta.style.cssText = 'font-size:10px;color:var(--SmartThemeQuoteColor,#888);';
            meta.textContent = new Date(snap.time).toLocaleString() + ' · ' + snap.prompts.length + ' 条目';
            info.appendChild(meta);
            row.appendChild(info);

            // 恢复
            const restoreBtn = document.createElement('button'); restoreBtn.style.cssText = 'font-size:10px;padding:3px 8px;border-radius:3px;border:1px solid var(--SmartThemeBorderColor,#444);background:var(--SmartThemeBlurTintColor,#222);color:var(--SmartThemeBodyColor,#ccc);cursor:pointer;white-space:nowrap;';
            restoreBtn.textContent = '🔄 恢复';
            restoreBtn.addEventListener('click', () => {
                if (!confirm('确定要恢复到这个快照？当前预设的所有条目将被覆盖。')) return;
                try {
                    const preset = getPM().getCompletionPresetByName(presetName);
                    if (!preset) { toast('找不到预设'); return; }
                    preset.prompts = JSON.parse(JSON.stringify(snap.prompts));
                    getPM().savePreset(presetName);
                    toast('已恢复快照「' + (snap.name || '快照') + '」');
                } catch (e) {
                    LOG('Restore error:', e);
                    toast('恢复失败: ' + e.message);
                }
            });
            row.appendChild(restoreBtn);

            // 删除
            const delBtn = document.createElement('button'); delBtn.style.cssText = restoreBtn.style.cssText + 'color:#f88;';
            delBtn.textContent = '✕';
            delBtn.addEventListener('click', () => {
                snapshots.splice(idx, 1);
                saveS();
                render();
                toast('已删除快照');
            });
            row.appendChild(delBtn);

            body.appendChild(row);
        });
    }
    render();

    panel.appendChild(body);

    const foot = document.createElement('div'); foot.className = 'pee-foot';
    const snapBtn = document.createElement('div'); snapBtn.className = 'menu_button menu_button_icon';
    snapBtn.innerHTML = '<i class="fa-solid fa-camera"></i><span>拍快照</span>';
    snapBtn.addEventListener('click', () => {
        const name = prompt('快照名称:', presetName + ' ' + new Date().toLocaleString());
        if (name === null) return;
        const prompts = getCurrentPrompts();
        snapshots.push({
            presetName,
            name: name || '快照',
            time: Date.now(),
            prompts: JSON.parse(JSON.stringify(prompts)),
        });
        saveS();
        render();
        toast('已保存快照 (' + prompts.length + ' 条目)');
    });
    foot.appendChild(snapBtn);

    const closeBtn = document.createElement('div'); closeBtn.className = 'menu_button menu_button_icon';
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i><span>关闭</span>';
    closeBtn.onclick = cl; foot.appendChild(closeBtn);
    panel.appendChild(foot); document.body.appendChild(panel);
}

// ═══ INIT ═══
jQuery(async () => {
    loadS();
    const html = await jQuery.get(`${extensionFolderPath}/settings.html`);
    jQuery('#extensions_settings2').append(html);
    jQuery('#pee_opt_autocomplete').prop('checked', S.enableAutocomplete).on('change', function () { S.enableAutocomplete = this.checked; saveS(); if (!this.checked) removeDD(); });
    jQuery('#pee_opt_toolbar').prop('checked', S.enableToolbar).on('change', function () { S.enableToolbar = this.checked; saveS(); document.querySelectorAll('.pee-toolbar').forEach(e => e.remove()); if (this.checked) scan(); });
    jQuery('#pee_opt_charcount').prop('checked', S.enableCharCount).on('change', function () { S.enableCharCount = this.checked; saveS(); document.querySelectorAll('.pee-counter').forEach(e => e.remove()); if (this.checked) scan(); });
    jQuery('#pee_opt_snippets').prop('checked', S.enableSnippets !== false).on('change', function () { S.enableSnippets = this.checked; saveS(); });
    jQuery('#pee_btn_varmanager').on('click', openVarManager);
    jQuery('#pee_btn_vardeps').on('click', openVarDeps);
    jQuery('#pee_btn_compare').on('click', openCompare);
    jQuery('#pee_btn_searchreplace').on('click', openSearchReplace);
    jQuery('#pee_btn_status').on('click', openPromptStatus);
    jQuery('#pee_btn_order').on('click', openPromptOrder);
    jQuery('#pee_btn_clone').on('click', openClone);
    jQuery('#pee_btn_snippets').on('click', openSnippets);
    jQuery('#pee_btn_snapshot').on('click', openSnapshot);
    scan();
    new MutationObserver(muts => { for (const mut of muts) for (const node of mut.addedNodes) { if (node.nodeType !== 1) continue; if (node.querySelector?.('#completion_prompt_manager_popup_entry_form_prompt') || node.id === 'completion_prompt_manager_popup_entry_form_prompt') scan(); } }).observe(document.body, { childList: true, subtree: true });
    jQuery(document).on('click', '.completion_prompt_manager_prompt', () => { setTimeout(scan, 200); setTimeout(scan, 600); });
    jQuery(document).on('mousedown', e => { if ($dd && !$dd.contains(e.target)) removeDD(); });
    LOG('v2.0 ✓', getAllPresetNames().length, 'presets');
});