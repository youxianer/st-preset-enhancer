const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const indexPath = path.join(__dirname, '..', 'index.js');
const source = fs.readFileSync(indexPath, 'utf8');
const match = source.match(/function quickMacroVisible\([^)]*\) \{[\s\S]*?\n\}/);

assert(match, '没有找到 quickMacroVisible 函数');

const context = {};
vm.createContext(context);
vm.runInContext(`${match[0]}; this.quickMacroVisible = quickMacroVisible;`, context);

assert.strictEqual(context.quickMacroVisible(null, { enableCustomMacros: false }), true, '分隔线不受自定义宏开关影响');
assert.strictEqual(context.quickMacroVisible({ text: 'trim' }, { enableCustomMacros: false }), true, '普通快捷宏不受自定义宏开关影响');
assert.strictEqual(context.quickMacroVisible({ text: '自定义1', customIndex: 0 }, { enableCustomMacros: false }), false, '关闭自定义宏时应隐藏自定义按钮');
assert.strictEqual(context.quickMacroVisible({ text: '自定义1', customIndex: 0 }, { enableCustomMacros: true }), true, '开启自定义宏时应显示自定义按钮');
assert.strictEqual(context.quickMacroVisible({ text: '自定义1', customIndex: 0 }, {}), true, '旧设置没有该字段时应默认显示自定义按钮');

console.log('custom macros setting tests passed');
