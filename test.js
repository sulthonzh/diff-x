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

// ─── Edge cases: empty / boundary inputs ─────────────────────────────────────

assert('diffLines: single element identical', () => {
  const r = diffLines(['x'], ['x']);
  eq(r.length, 1);
  eq(r[0].type, 'unchanged');
  eq(r[0].value, 'x');
});

assert('diffLines: swap two elements', () => {
  const r = diffLines(['a', 'b'], ['b', 'a']);
  const removed = r.filter(c => c.type === 'removed');
  const added = r.filter(c => c.type === 'added');
  ok(removed.length > 0);
  ok(added.length > 0);
});

assert('diffStrings: both empty', () => {
  eq(diffStrings('', ''), []);
});

assert('diffStrings: old empty, new has content', () => {
  const r = diffStrings('', 'a\nb');
  eq(r.length, 2);
  r.forEach(c => eq(c.type, 'added'));
});

assert('diffStrings: new empty, old has content', () => {
  const r = diffStrings('a\nb', '');
  eq(r.length, 2);
  r.forEach(c => eq(c.type, 'removed'));
});

assert('diffWords: identical strings', () => {
  const r = diffWords('hello world', 'hello world');
  r.forEach(c => eq(c.type, 'unchanged'));
});

assert('diffWords: empty strings', () => {
  eq(diffWords('', ''), []);
});

assert('diffWords: completely different', () => {
  const r = diffWords('abc', 'xyz');
  ok(r.some(c => c.type === 'removed'));
  ok(r.some(c => c.type === 'added'));
});

// ─── Edge cases: LCS ───────────────────────────────────────────────────────────

assert('lcs: one empty array', () => {
  eq(lcs(['a', 'b'], []), []);
  eq(lcs([], ['a', 'b']), []);
});

assert('lcs: identical arrays', () => {
  eq(lcs(['a', 'b', 'c'], ['a', 'b', 'c']), ['a', 'b', 'c']);
});

assert('lcsString: empty strings', () => {
  eq(lcsString('', ''), '');
});

assert('lcsString: no common chars', () => {
  eq(lcsString('abc', 'xyz'), '');
});

assert('lcsString: identical strings', () => {
  eq(lcsString('hello', 'hello'), 'hello');
});

assert('lcsLength: identical arrays', () => {
  eq(lcsLength([1, 2, 3], [1, 2, 3]), 3);
});

// ─── Edge cases: createPatch / applyPatch ─────────────────────────────────────

assert('createPatch: completely different strings', () => {
  const patch = createPatch('aaa', 'bbb', 'old', 'new');
  ok(patch.includes('--- old'));
  ok(patch.includes('+++ new'));
  ok(patch.includes('-aaa'));
  ok(patch.includes('+bbb'));
});

assert('createPatch: empty old string', () => {
  const patch = createPatch('', 'new\ncontent', 'old', 'new');
  ok(patch.includes('+new'));
  ok(patch.includes('+content'));
});

assert('createPatch: empty new string', () => {
  const patch = createPatch('old\ncontent', '', 'old', 'new');
  ok(patch.includes('-old'));
  ok(patch.includes('-content'));
});

assert('applyPatch: complex round-trip', () => {
  const oldStr = 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8';
  const newStr = 'line1\nmodified2\nline3\ninserted\nline4\nremoved_line\nline7\nline8';
  const patch = createPatch(oldStr, newStr, '', '', 3);
  const applied = applyPatch(oldStr, patch);
  eq(applied, newStr);
});

assert('applyPatch: no-op patch on identical content', () => {
  const oldStr = 'same\ncontent';
  const patch = createPatch(oldStr, oldStr);
  eq(patch, '');
});

// ─── Edge cases: objectDiff ────────────────────────────────────────────────────

assert('objectDiff: both null', () => {
  const r = objectDiff(null, null);
  eq(Object.keys(r).length, 0);
});

assert('objectDiff: null to object', () => {
  const r = objectDiff(null, { a: 1 });
  eq(r['<root>'].type, 'changed');
});

assert('objectDiff: object to null', () => {
  const r = objectDiff({ a: 1 }, null);
  eq(r['<root>'].type, 'changed');
});

assert('objectDiff: identical primitives', () => {
  const r = objectDiff(42, 42);
  eq(Object.keys(r).length, 0);
});

assert('objectDiff: different primitives', () => {
  const r = objectDiff(42, 100);
  eq(r['<root>'].type, 'changed');
});

assert('objectDiff: empty objects', () => {
  const r = objectDiff({}, {});
  eq(Object.keys(r).length, 0);
});

assert('objectDiff: empty arrays', () => {
  const r = objectDiff([], []);
  eq(Object.keys(r).length, 0);
});

assert('objectDiff: nested arrays in objects', () => {
  const r = objectDiff(
    { items: [1, 2, 3] },
    { items: [1, 2, 4] }
  );
  eq(r['items[2]'].type, 'changed');
  eq(r['items[2]'].oldValue, 3);
  eq(r['items[2]'].newValue, 4);
});

assert('objectDiff: Date objects (treated as non-plain)', () => {
  const d1 = new Date('2024-01-01');
  const d2 = new Date('2024-01-02');
  const r = objectDiff(d1, d2);
  eq(r['<root>'].type, 'changed');
});

assert('objectDiff: deeply nested path', () => {
  const r = objectDiff(
    { a: { b: { c: { d: 1 } } } },
    { a: { b: { c: { d: 2 } } } }
  );
  eq(r['a.b.c.d'].type, 'changed');
  eq(r['a.b.c.d'].oldValue, 1);
  eq(r['a.b.c.d'].newValue, 2);
});

assert('objectDiff: key order independent', () => {
  const r = objectDiff(
    { a: 1, b: 2 },
    { b: 2, a: 1 }
  );
  eq(Object.keys(r).length, 0);
});

// ─── Edge cases: formatObjectDiff ──────────────────────────────────────────────

assert('formatObjectDiff: empty diff', () => {
  eq(formatObjectDiff({}), '');
});

assert('formatObjectDiff: removed key', () => {
  const diff = { key: { type: 'removed', oldValue: 'val', newValue: undefined } };
  const text = formatObjectDiff(diff);
  ok(text.includes('- key: val'));
});

// ─── Edge cases: Levenshtein ───────────────────────────────────────────────────

assert('levenshtein: single char strings', () => {
  eq(levenshtein('a', 'a'), 0);
  eq(levenshtein('a', 'b'), 1);
});

assert('levenshtein: prefix match', () => {
  eq(levenshtein('abc', 'abcdef'), 3);
});

assert('levenshtein: suffix match', () => {
  eq(levenshtein('xyz', 'abcxyz'), 3);
});

// ─── Edge cases: similarity ────────────────────────────────────────────────────

assert('similarity: single char', () => {
  eq(similarity('a', 'a'), 1);
  eq(similarity('a', 'b'), 0);
});

assert('similarity: longer source than target', () => {
  const s = similarity('hello world', 'hello');
  ok(s > 0 && s < 1);
});

// ─── Edge cases: diffSummary ───────────────────────────────────────────────────

assert('diffSummary: empty changes', () => {
  const s = diffSummary([]);
  eq(s.additions, 0);
  eq(s.removals, 0);
  eq(s.unchanged, 0);
  eq(s.total, 0);
  eq(s.changed, false);
});

assert('diffSummary: all added', () => {
  const s = diffSummary([
    { type: 'added', value: 'a' },
    { type: 'added', value: 'b' },
  ]);
  eq(s.additions, 2);
  eq(s.changed, true);
});

assert('diffSummary: all removed', () => {
  const s = diffSummary([
    { type: 'removed', value: 'x' },
  ]);
  eq(s.removals, 1);
  eq(s.changed, true);
});

// ─── Edge cases: structuredPatch ───────────────────────────────────────────────

assert('structuredPatch: identical strings = empty hunks', () => {
  const p = structuredPatch('same', 'same');
  eq(p.hunks.length, 0);
});

assert('structuredPatch: with custom filenames', () => {
  const p = structuredPatch('a\nb', 'a\nc', 'custom-old', 'custom-new');
  eq(p.oldFileName, 'custom-old');
  eq(p.newFileName, 'custom-new');
  ok(p.hunks.length > 0);
});

// ─── Patch parsing edge cases ──────────────────────────────────────────────────

assert('applyPatch: handles empty context lines', () => {
  // Patch with an empty (blank) context line
  const oldStr = 'a\n\nb';
  const newStr = 'a\n\nb';
  const patch = createPatch(oldStr, newStr);
  eq(patch, '');
});

assert('applyPatch: handles multiple hunks', () => {
  const oldStr = 'keep1\nchange1\nkeep2\nkeep3\nkeep4\nchange2\nkeep5';
  const newStr = 'keep1\nmodified1\nkeep2\nkeep3\nkeep4\nmodified2\nkeep5';
  const patch = createPatch(oldStr, newStr, '', '', 1);
  const applied = applyPatch(oldStr, patch);
  eq(applied, newStr);
});

assert('objectDiff: array element removed from end', () => {
  const r = objectDiff([1, 2, 3], [1, 2]);
  eq(r['[2]'].type, 'removed');
  eq(r['[2]'].oldValue, 3);
});

assert('objectDiff: array element added at end', () => {
  const r = objectDiff([1, 2], [1, 2, 3]);
  eq(r['[2]'].type, 'added');
  eq(r['[2]'].newValue, 3);
});

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('❌ Some tests failed');
  process.exit(1);
} else {
  console.log('✅ All tests passed');
}
