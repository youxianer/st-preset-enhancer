const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const indexPath = path.join(__dirname, '..', 'index.js');
const source = fs.readFileSync(indexPath, 'utf8');
const match = source.match(/function validRangeFor\([^)]*\) \{[\s\S]*?\n\}\s*function insertAt\([^)]*\) \{[\s\S]*?\n\}/);

assert(match, '没有找到 insertAt 函数');

const context = { Event: class Event { constructor(type, init) { this.type = type; this.bubbles = !!init?.bubbles; } } };
vm.createContext(context);
vm.runInContext(`${match[0]}; this.insertAt = insertAt;`, context);

function makeTextarea(value, selectionStart, selectionEnd = selectionStart) {
    return {
        value,
        selectionStart,
        selectionEnd,
        events: [],
        focused: false,
        dispatchEvent(event) { this.events.push(event); },
        focus() { this.focused = true; },
    };
}

{
    const ta = makeTextarea('abef', 0);
    context.insertAt(ta, 'cd', undefined, null, { ss: 2, se: 2 });
    assert.strictEqual(ta.value, 'abcdef', '按钮夺走焦点后，快捷宏仍应插入到之前记录的光标处');
    assert.strictEqual(ta.selectionStart, 4);
    assert.strictEqual(ta.selectionEnd, 4);
}

{
    const ta = makeTextarea('abXXef', 0);
    context.insertAt(ta, 'cd', undefined, null, { ss: 2, se: 4 });
    assert.strictEqual(ta.value, 'abcdef', '有选区时应替换之前记录的选区');
    assert.strictEqual(ta.selectionStart, 4);
    assert.strictEqual(ta.selectionEnd, 4);
}

console.log('toolbar insert tests passed');
