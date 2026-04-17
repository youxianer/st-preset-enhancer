// src/core.js — 共享常量、工具函数、设置管理、Preset API
export const MODULE_NAME = 'preset_enhancer';
export const extensionFolderPath = `scripts/extensions/third-party/st-preset-enhancer`;
export const LOG = (...a) => console.log('[PEE]', ...a);

export const MACRO_DB = [
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
    {m:'{{getvar::}}',d:'获取局部变量',c:'变量'},{m:'{{setvar::名字::值}}',d:'设置局部变量',c:'变量'},
    {m:'{{addvar::名字::增量}}',d:'增加局部变量',c:'变量'},{m:'{{incvar::}}',d:'局部+1',c:'变量'},{m:'{{decvar::}}',d:'局部-1',c:'变量'},
    {m:'{{getglobalvar::}}',d:'获取全局变量',c:'变量'},{m:'{{setglobalvar::名字::值}}',d:'设置全局变量',c:'变量'},
    {m:'{{incglobalvar::}}',d:'全局+1',c:'变量'},{m:'{{decglobalvar::}}',d:'全局-1',c:'变量'},
    {m:'{{var::name}}',d:'作用域变量',c:'变量'},
    {m:'{{pipe}}',d:'上一条命令结果',c:'其他'},{m:'{{newline}}',d:'换行',c:'其他'},{m:'{{trim}}',d:'修剪换行',c:'其他'},
    {m:'{{noop}}',d:'空操作',c:'其他'},{m:'{{//备注}}',d:'注释(不发送)',c:'其他'},{m:'{{isMobile}}',d:'是否移动端',c:'其他'},
    {m:'{{maxPrompt}}',d:'最大token数',c:'高级'},{m:'{{systemPrompt}}',d:'主系统提示',c:'高级'},{m:'{{instructStop}}',d:'停止序列',c:'高级'},
];

export const QUICK_MACROS = [
    {text:'<char>',insert:'<char>',tip:'角色名'},
    {text:'<user>',insert:'<user>',tip:'用户名'},
    {text:'trim',insert:'{{trim}}',tip:'修剪换行'},
    null,
    {text:'getvar::',insert:'{{getvar::}}',tip:'获取局部变量'},
    {text:'setvar::',insert:'{{setvar::::}}',tip:'设置局部变量'},
    {text:'getglobalvar::',insert:'{{getglobalvar::}}',tip:'获取全局变量'},
    null,
    {text:'lastMessage',insert:'{{lastMessage}}',tip:'最新消息'},
    {text:'lastCharMessage',insert:'{{lastCharMessage}}',tip:'最后角色消息'},
    null,
    {text:'[ ]',insert:'[]',tip:'方括号',cursor:-1},
    {text:'( )',insert:'()',tip:'圆括号',cursor:-1},
    {text:'** **',insert:'****',tip:'加粗',cursor:-2},
    {text:'{{//}}',insert:'{{//}}',tip:'注释',cursor:-2},
    {text:'自定义1',insert:'',tip:'短按插入，长按清空',customIndex:0},
    {text:'自定义2',insert:'',tip:'短按插入，长按清空',customIndex:1},
    {text:'自定义3',insert:'',tip:'短按插入，长按清空',customIndex:2},
];

export const DEF = { enableAutocomplete: true, enableToolbar: true, enableCharCount: true, enableHighlight: false };
export let S = { ...DEF };
export const done = new WeakSet();

export const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
export function toast(m, t = 2000) { const e = document.createElement('div'); e.className = 'pee-toast'; e.textContent = m; document.body.appendChild(e); setTimeout(() => e.remove(), t); }
export function loadS() { const es = SillyTavern.getContext().extensionSettings; if (!es[MODULE_NAME]) es[MODULE_NAME] = { ...DEF }; S = es[MODULE_NAME]; for (const k of Object.keys(DEF)) if (!(k in S)) S[k] = DEF[k]; }
export function saveS() { SillyTavern.getContext().saveSettingsDebounced(); }

// Preset API
export function getPM() { return SillyTavern.getContext().getPresetManager(); }
export function getAllPresetNames() { try { return getPM().getAllPresets(); } catch (e) { return []; } }
export function getCurrentPresetName() { try { return getPM().getSelectedPresetName() || '(当前)'; } catch (e) { return '(当前)'; } }
export function getPresetPrompts(name) { try { const p = getPM().getCompletionPresetByName(name); if (p && Array.isArray(p.prompts)) return p.prompts; } catch (e) {} return []; }
export function getCurrentPrompts() { return getPresetPrompts(getCurrentPresetName()); }
export function getRealPrompts(prompts) { return prompts.filter(p => !p.marker && p.identifier); }
