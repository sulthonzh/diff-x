/**
 * diff-x — Tests
 * Run: node test.js
 */
const {
  diffLines, diffStrings, diffWords,
  lcs, lcsLength, lcsString,
  createPatch, applyPatch, structuredPatch,
  objectDiff, formatObjectDiff,
  levenshtein, similarity,
  diffSummary,
} = require('./index');

let passed = 0;
let failed = 0;

function assert(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    console.error(`✗ ${name}: ${e.message}`);
  }
}

function eq(a, b, msg) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(`${msg || ''} expected ${sb} got ${sa}`);
}

function ok(v, msg) {
  if (!v) throw new Error(msg || `expected truthy, got ${v}`);
}

// ─── diffLines ──────────────────────────────────────────────────────────────

assert('diffLines: identical strings', () => {
  const r = diffLines(['a', 'b', 'c'], ['a', 'b', 'c']);
  eq(r.length, 3);
  r.forEach(c => eq(c.type, 'unchanged'));
});

assert('diffLines: empty inputs', () => {
  eq(diffLines([], []), []);
});

assert('diffLines: all added', () => {
  const r = diffLines([], ['a', 'b']);
  eq(r.length, 2);
  r.forEach(c => eq(c.type, 'added'));
});

assert('diffLines: all removed', () => {
  const r = diffLines(['a', 'b'], []);
  eq(r.length, 2);
  r.forEach(c => eq(c.type, 'removed'));
});

assert('diffLines: single insertion', () => {
  const r = diffLines(['a', 'b', 'c'], ['a', 'x', 'b', 'c']);
  eq(r.length, 4);
  ok(r[1].type === 'added');
  eq(r[1].value, 'x');
});

assert('diffLines: single deletion', () => {
  const r = diffLines(['a', 'x', 'b', 'c'], ['a', 'b', 'c']);
  ok(r.some(c => c.type === 'removed' && c.value === 'x'));
});

assert('diffLines: line numbers set', () => {
  const r = diffLines(['a', 'b', 'c'], ['a', 'x', 'b', 'c']);
  const added = r.find(c => c.type === 'added');
  ok(added.newLineNumber === 2);
  const unchanged = r.find(c => c.type === 'unchanged' && c.value === 'b');
  ok(unchanged.oldLineNumber === 2);
  ok(unchanged.newLineNumber === 3);
});

// ─── diffStrings ────────────────────────────────────────────────────────────

assert('diffStrings: multi-line diff', () => {
  const r = diffStrings('hello\nworld\nfoo', 'hello\nearth\nfoo');
  ok(r.some(c => c.type === 'removed' && c.value === 'world'));
  ok(r.some(c => c.type === 'added' && c.value === 'earth'));
  ok(r.some(c => c.type === 'unchanged' && c.value === 'hello'));
});

assert('diffStrings: identical', () => {
  const r = diffStrings('same', 'same');
  eq(r.length, 1);
  eq(r[0].type, 'unchanged');
});

// ─── diffWords ──────────────────────────────────────────────────────────────

assert('diffWords: basic word diff', () => {
  const r = diffWords('the quick brown fox', 'the slow brown fox');
  ok(r.some(c => c.type === 'removed' && c.value === 'quick'));
  ok(r.some(c => c.type === 'added' && c.value === 'slow'));
});

assert('diffWords: multiple changes', () => {
  const r = diffWords('a b c d e', 'a x c y e');
  const removed = r.filter(c => c.type === 'removed').map(c => c.value);
  const added = r.filter(c => c.type === 'added').map(c => c.value);
  ok(removed.includes('b'));
  ok(removed.includes('d'));
  ok(added.includes('x'));
  ok(added.includes('y'));
});

// ─── LCS ─────────────────────────────────────────────────────────────────────

assert('lcsLength: basic', () => {
  eq(lcsLength(['A', 'B', 'C', 'D'], ['A', 'C', 'D']), 3);
});

assert('lcsLength: empty', () => {
  eq(lcsLength([], []), 0);
});

assert('lcsLength: no common', () => {
  eq(lcsLength(['A', 'B'], ['X', 'Y']), 0);
});

assert('lcsLength: custom eq', () => {
  eq(lcsLength([1, 2, 3], [4, 5, 6], (a, b) => a % 2 === b % 2), 2);
});

assert('lcs: array', () => {
  const result = lcs(['A', 'B', 'C', 'D', 'E'], ['A', 'C', 'E']);
  eq(result, ['A', 'C', 'E']);
});

assert('lcs: strings', () => {
  const result = lcs(['h', 'e', 'l', 'l', 'o'], ['h', 'l', 'o']);
  eq(result, ['h', 'l', 'o']);
});

// ─── createPatch ─────────────────────────────────────────────────────────────

assert('createPatch: produces unified diff', () => {
  const patch = createPatch(
    'line1\nline2\nline3',
    'line1\nchanged\nline3',
    'old.txt',
    'new.txt'
  );
  ok(patch.includes('--- old.txt'));
  ok(patch.includes('+++ new.txt'));
  ok(patch.includes('-line2'));
  ok(patch.includes('+changed'));
  ok(patch.includes('@@'));
});

assert('createPatch: identical strings = empty', () => {
  const patch = createPatch('same', 'same');
  eq(patch, '');
});

assert('createPatch: round-trip via applyPatch', () => {
  const oldStr = 'line1\nline2\nline3\nline4\nline5';
  const newStr = 'line1\nmodified2\nline3\nadded\nline4\nline5';
  const patch = createPatch(oldStr, newStr, '', '', 3);
  const applied = applyPatch(oldStr, patch);
  eq(applied, newStr, 'applyPatch should reconstruct new string');
});

assert('createPatch: no context overlap', () => {
  const patch = createPatch('a\nb\nc', 'x\ny\nz');
  ok(patch.includes('-a'));
  ok(patch.includes('+x'));
});

// ─── applyPatch ──────────────────────────────────────────────────────────────

assert('applyPatch: insertion only', () => {
  const patch = '@@ -1,2 +1,3 @@\n a\n+new\n b';
  const result = applyPatch('a\nb', patch);
  eq(result, 'a\nnew\nb');
});

assert('applyPatch: deletion only', () => {
  const patch = '@@ -1,3 +1,2 @@\n a\n-b\n c';
  const result = applyPatch('a\nb\nc', patch);
  eq(result, 'a\nc');
});

// ─── objectDiff ──────────────────────────────────────────────────────────────

assert('objectDiff: identical objects', () => {
  const r = objectDiff({ a: 1, b: 2 }, { a: 1, b: 2 });
  eq(Object.keys(r).length, 0);
});

assert('objectDiff: added key', () => {
  const r = objectDiff({ a: 1 }, { a: 1, b: 2 });
  ok(r['b'] && r['b'].type === 'added');
  eq(r['b'].newValue, 2);
});

assert('objectDiff: removed key', () => {
  const r = objectDiff({ a: 1, b: 2 }, { a: 1 });
  ok(r['b'] && r['b'].type === 'removed');
  eq(r['b'].oldValue, 2);
});

assert('objectDiff: changed primitive', () => {
  const r = objectDiff({ a: 1 }, { a: 2 });
  ok(r['a'] && r['a'].type === 'changed');
  eq(r['a'].oldValue, 1);
  eq(r['a'].newValue, 2);
});

assert('objectDiff: nested object', () => {
  const r = objectDiff(
    { user: { name: 'A', age: 20 } },
    { user: { name: 'B', age: 20 } }
  );
  eq(Object.keys(r).length, 1);
  eq(r['user.name'].type, 'changed');
  eq(r['user.name'].oldValue, 'A');
  eq(r['user.name'].newValue, 'B');
});

assert('objectDiff: array diff', () => {
  const r = objectDiff([1, 2, 3], [1, 5, 3, 4]);
  eq(r['[1]'].type, 'changed');
  eq(r['[1]'].oldValue, 2);
  eq(r['[1]'].newValue, 5);
  eq(r['[3]'].type, 'added');
  eq(r['[3]'].newValue, 4);
});

assert('objectDiff: type mismatch', () => {
  const r = objectDiff({ a: 1 }, [1, 2]);
  eq(r['<root>'].type, 'changed');
});

// ─── formatObjectDiff ────────────────────────────────────────────────────────

assert('formatObjectDiff: human readable', () => {
  const r = objectDiff({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 });
  const text = formatObjectDiff(r);
  ok(text.includes('~ b: 2 → 3'));
  ok(text.includes('+ c: 4'));
});

// ─── Levenshtein ─────────────────────────────────────────────────────────────

assert('levenshtein: identical', () => {
  eq(levenshtein('hello', 'hello'), 0);
});

assert('levenshtein: one substitution', () => {
  eq(levenshtein('cat', 'cot'), 1);
});

assert('levenshtein: one insertion', () => {
  eq(levenshtein('cat', 'cats'), 1);
});

assert('levenshtein: one deletion', () => {
  eq(levenshtein('cats', 'cat'), 1);
});

assert('levenshtein: completely different', () => {
  eq(levenshtein('abc', 'xyz'), 3);
});

assert('levenshtein: empty strings', () => {
  eq(levenshtein('', ''), 0);
  eq(levenshtein('', 'abc'), 3);
  eq(levenshtein('abc', ''), 3);
});

assert('levenshtein: kitten to sitting', () => {
  eq(levenshtein('kitten', 'sitting'), 3);
});

// ─── Similarity ──────────────────────────────────────────────────────────────

assert('similarity: identical', () => {
  eq(similarity('hello', 'hello'), 1);
});

assert('similarity: completely different', () => {
  eq(similarity('abc', 'xyz'), 0);
});

assert('similarity: empty strings', () => {
  eq(similarity('', ''), 1);
});

assert('similarity: partial', () => {
  const s = similarity('hello', 'hallo');
  ok(s > 0.7 && s < 1, `expected ~0.8, got ${s}`);
});

// ─── diffSummary ─────────────────────────────────────────────────────────────

assert('diffSummary: counts', () => {
  const changes = [
    { type: 'added', value: 'x' },
    { type: 'added', value: 'y' },
    { type: 'removed', value: 'z' },
    { type: 'unchanged', value: 'a' },
    { type: 'unchanged', value: 'b' },
  ];
  const s = diffSummary(changes);
  eq(s.additions, 2);
  eq(s.removals, 1);
  eq(s.unchanged, 2);
  eq(s.changed, true);
});

assert('diffSummary: no changes', () => {
  const s = diffSummary([{ type: 'unchanged', value: 'same' }]);
  eq(s.changed, false);
});

// ─── structuredPatch ─────────────────────────────────────────────────────────

assert('structuredPatch: returns Patch object', () => {
  const p = structuredPatch('a\nb\nc', 'a\nx\nc');
  ok(p.hunks.length > 0);
  ok(p.oldFileName === 'Original');
  ok(p.newFileName === 'Modified');
});

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('❌ Some tests failed');
  process.exit(1);
} else {
  console.log('✅ All tests passed');
}
