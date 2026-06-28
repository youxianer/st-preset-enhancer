const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const indexPath = path.join(__dirname, '..', 'index.js');
const source = fs.readFileSync(indexPath, 'utf8');
const match = source.match(/function validRangeFor\([^)]*\) \{[\s\S]*?\n\}\s*function validCodeMirrorRange\([^)]*\) \{[\s\S]*?\n\}\s*function findCodeMirrorView\([^)]*\) \{[\s\S]*?\n\}\s*function getActiveCodeMirrorView\([^)]*\) \{[\s\S]*?\n\}\s*function getActiveCodeMirrorContent\([^)]*\) \{[\s\S]*?\n\}\s*function moveActiveSelection\([^)]*\) \{[\s\S]*?\n\}\s*function insertIntoActiveEditor\([^)]*\) \{[\s\S]*?\n\}\s*function insertAt\([^)]*\) \{[\s\S]*?\n\}/);

assert(match, '没有找到 insertAt 函数');

const context = {
    document: {
        activeElement: null,
        execCalls: [],
        execCommand(command, showUI, value) {
            this.execCalls.push({ command, showUI, value });
            return true;
        },
    },
    window: { getSelection() { return null; } },
    Event: class Event { constructor(type, init) { this.type = type; this.bubbles = !!init?.bubbles; } },
};
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

{
    const cmContent = {
        classList: { contains(name) { return name === 'cm-content'; } },
        parentElement: null,
    };
    const view = {
        state: {
            doc: { toString: () => 'abef' },
            selection: { main: { from: 2, to: 2 } },
        },
        focused: false,
        dispatched: null,
        dispatch(spec) {
            this.dispatched = spec;
            this.state.doc = { toString: () => 'abcdef' };
            this.state.selection = { main: { from: 4, to: 4 } };
        },
        focus() { this.focused = true; },
    };
    cmContent.cmView = { rootView: { view } };
    context.document.activeElement = cmContent;

    const ta = makeTextarea('abef', 4);
    context.insertAt(ta, 'cd');

    assert.strictEqual(view.dispatched.changes.from, 2, 'CodeMirror 获得焦点时应使用 CodeMirror 的真实光标');
    assert.strictEqual(view.dispatched.changes.to, 2);
    assert.strictEqual(view.dispatched.changes.insert, 'cd');
    assert.strictEqual(view.dispatched.selection.anchor, 4);
    assert.strictEqual(ta.value, 'abcdef');
    assert.strictEqual(ta.selectionStart, 4);
    assert.strictEqual(ta.selectionEnd, 4);
    assert.strictEqual(view.focused, true);
}

{
    context.document.activeElement = { classList: { contains() { return false; } }, closest() { return null; } };
    const view = {
        state: {
            doc: { toString: () => 'abef' },
            selection: { main: { from: 4, to: 4 } },
        },
        dispatched: null,
        dispatch(spec) {
            this.dispatched = spec;
            this.state.doc = { toString: () => 'abcdef' };
        },
        focus() {},
    };

    const ta = makeTextarea('abef', 4);
    context.insertAt(ta, 'cd', undefined, null, null, { valid: true, view, from: 2, to: 2 });

    assert.strictEqual(view.dispatched.changes.from, 2, '按钮获得焦点时应使用已记录的 CodeMirror 光标');
    assert.strictEqual(view.dispatched.changes.to, 2);
    assert.strictEqual(ta.value, 'abcdef');
    assert.strictEqual(ta.selectionStart, 4);
}

{
    const cmContent = {
        classList: { contains(name) { return name === 'cm-content'; } },
        closest() { return null; },
        focus() { this.focused = true; },
        focused: false,
    };
    context.document.activeElement = cmContent;
    context.document.execCalls = [];

    const ta = makeTextarea('abef', 4);
    context.insertAt(ta, 'cd');

    assert.deepStrictEqual(context.document.execCalls[0], { command: 'insertText', showUI: false, value: 'cd' }, '找不到 CodeMirror view 时应交给当前聚焦编辑器插入');
    assert.strictEqual(cmContent.focused, true);
    assert.strictEqual(ta.value, 'abef', '原生编辑器兜底不应直接改隐藏 textarea 到末尾');
}

console.log('toolbar insert tests passed');
