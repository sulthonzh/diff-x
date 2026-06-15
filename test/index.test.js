/**
 * Test runner for diff-x — Myers' diff algorithm implementation
 */

import { test } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';

import {
  myersDiff,
  diffLines,
  diffChars,
  diffWords,
  diffJson,
  unifiedDiff,
  createPatch,
  applyPatch,
  diffStats,
  diffHunks,
  lcsLength,
  longestCommonSubsequence,
  similarity,
  colorize,
} from '../src/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Myers' diff algorithm tests
// ─────────────────────────────────────────────────────────────────────────────

test('myersDiff - equal sequences', () => {
  const ops = myersDiff(3, 3, (a, b) => a === b);
  deepStrictEqual(ops, [
    { type: 'eq', a: 0, b: 0 },
    { type: 'eq', a: 1, b: 1 },
    { type: 'eq', a: 2, b: 2 },
  ]);
});

test('myersDiff - insertions at beginning', () => {
  const ops = myersDiff(3, 5, (a, b) => a === b);
  deepStrictEqual(ops, [
    { type: 'ins', a: 0, b: 0 },
    { type: 'ins', a: 0, b: 1 },
    { type: 'eq', a: 0, b: 2 },
    { type: 'eq', a: 1, b: 3 },
    { type: 'eq', a: 2, b: 4 },
  ]);
});

test('myersDiff - deletions at beginning', () => {
  const ops = myersDiff(5, 3, (a, b) => a === b);
  deepStrictEqual(ops, [
    { type: 'del', a: 0, b: 0 },
    { type: 'del', a: 1, b: 0 },
    { type: 'eq', a: 2, b: 0 },
    { type: 'eq', a: 3, b: 1 },
    { type: 'eq', a: 4, b: 2 },
  ]);
});

test('myersDiff - empty sequences', () => {
  strictEqual(myersDiff(0, 0, () => false).length, 0);
});

test('myersDiff - only insertions', () => {
  const ops = myersDiff(0, 3, (a, b) => a === b);
  deepStrictEqual(ops, [
    { type: 'ins', a: 0, b: 0 },
    { type: 'ins', a: 0, b: 1 },
    { type: 'ins', a: 0, b: 2 },
  ]);
});

test('myersDiff - only deletions', () => {
  const ops = myersDiff(3, 0, (a, b) => a === b);
  deepStrictEqual(ops, [
    { type: 'del', a: 0, b: 0 },
    { type: 'del', a: 1, b: 0 },
    { type: 'del', a: 2, b: 0 },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Line diff tests
// ─────────────────────────────────────────────────────────────────────────────

test('diffLines - identical files', () => {
  const oldText = 'line 1\nline 2\nline 3';
  const newText = 'line 1\nline 2\nline 3';
  const parts = diffLines(oldText, newText);
  deepStrictEqual(parts, [
    { type: 'equal', value: 'line 1', oldLine: 1, newLine: 1 },
    { type: 'equal', value: 'line 2', oldLine: 2, newLine: 2 },
    { type: 'equal', value: 'line 3', oldLine: 3, newLine: 3 },
  ]);
});

test('diffLines - additions and deletions', () => {
  const oldText = 'line 1\nline 2\nline 3';
  const newText = 'line 1\nnew line\nline 2\nline 3';
  const parts = diffLines(oldText, newText);
  deepStrictEqual(parts, [
    { type: 'equal', value: 'line 1', oldLine: 1, newLine: 1 },
    { type: 'added', value: 'new line', newLine: 2 },
    { type: 'equal', value: 'line 2', oldLine: 2, newLine: 3 },
    { type: 'equal', value: 'line 3', oldLine: 3, newLine: 4 },
  ]);
});

test('diffLines - insertion at beginning', () => {
  const oldText = 'line 1\nline 2';
  const newText = 'first line\nline 1\nline 2';
  const parts = diffLines(oldText, newText);
  deepStrictEqual(parts, [
    { type: 'added', value: 'first line', newLine: 1 },
    { type: 'equal', value: 'line 1', oldLine: 1, newLine: 2 },
    { type: 'equal', value: 'line 2', oldLine: 2, newLine: 3 },
  ]);
});

test('diffLines - deletion at end', () => {
  const oldText = 'line 1\nline 2\nline 3';
  const newText = 'line 1\nline 2';
  const parts = diffLines(oldText, newText);
  deepStrictEqual(parts, [
    { type: 'equal', value: 'line 1', oldLine: 1, newLine: 1 },
    { type: 'equal', value: 'line 2', oldLine: 2, newLine: 2 },
    { type: 'removed', value: 'line 3', oldLine: 3 },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Character diff tests
// ─────────────────────────────────────────────────────────────────────────────

test('diffChars - identical strings', () => {
  const oldText = 'hello';
  const newText = 'hello';
  const parts = diffChars(oldText, newText);
  deepStrictEqual(parts, [
    { type: 'equal', value: 'h' },
    { type: 'equal', value: 'e' },
    { type: 'equal', value: 'l' },
    { type: 'equal', value: 'l' },
    { type: 'equal', value: 'o' },
  ]);
});

test('diffChars - insertion in middle', () => {
  const oldText = 'hello';
  const newText = 'hexllo';
  const parts = diffChars(oldText, newText);
  deepStrictEqual(parts, [
    { type: 'equal', value: 'h' },
    { type: 'equal', value: 'e' },
    { type: 'added', value: 'x' },
    { type: 'equal', value: 'l' },
    { type: 'equal', value: 'l' },
    { type: 'equal', value: 'o' },
  ]);
});

test('diffChars - deletion at end', () => {
  const oldText = 'hello';
  const newText = 'hell';
  const parts = diffChars(oldText, newText);
  deepStrictEqual(parts, [
    { type: 'equal', value: 'h' },
    { type: 'equal', value: 'e' },
    { type: 'equal', value: 'l' },
    { type: 'equal', value: 'l' },
    { type: 'removed', value: 'o' },
  ]);
});

test('diffChars - replacement', () => {
  const oldText = 'hello';
  const newText = 'hexlo';
  const parts = diffChars(oldText, newText);
  deepStrictEqual(parts, [
    { type: 'equal', value: 'h' },
    { type: 'equal', value: 'e' },
    { type: 'removed', value: 'l' },
    { type: 'added', value: 'x' },
    { type: 'equal', value: 'l' },
    { type: 'equal', value: 'o' },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Word diff tests
// ─────────────────────────────────────────────────────────────────────────────

test('diffWords - identical texts', () => {
  const oldText = 'hello world';
  const newText = 'hello world';
  const parts = diffWords(oldText, newText);
  deepStrictEqual(parts, [
    { type: 'equal', value: 'hello' },
    { type: 'equal', value: ' ' },
    { type: 'equal', value: 'world' },
  ]);
});

test('diffWords - word replacement', () => {
  const oldText = 'hello world';
  const newText = 'hello there';
  const parts = diffWords(oldText, newText);
  deepStrictEqual(parts, [
    { type: 'equal', value: 'hello' },
    { type: 'equal', value: ' ' },
    { type: 'removed', value: 'world' },
    { type: 'added', value: 'there' },
  ]);
});

test('diffWords - insertion at beginning', () => {
  const oldText = 'hello world';
  const newText = 'greetings hello world';
  const parts = diffWords(oldText, newText);
  deepStrictEqual(parts, [
    { type: 'added', value: 'greetings' },
    { type: 'equal', value: ' ' },
    { type: 'equal', value: 'hello' },
    { type: 'equal', value: ' ' },
    { type: 'equal', value: 'world' },
  ]);
});

test('diffWords - complex case with whitespace', () => {
  const oldText = 'Hello   world!';
  const newText = 'Hello brave   world!';
  const parts = diffWords(oldText, newText);
  deepStrictEqual(parts, [
    { type: 'equal', value: 'Hello' },
    { type: 'equal', value: '   ' },
    { type: 'removed', value: 'world' },
    { type: 'equal', value: '!' },
    { type: 'added', value: ' ' },
    { type: 'added', value: 'brave' },
    { type: 'equal', value: '   ' },
    { type: 'equal', value: 'world' },
    { type: 'equal', value: '!' },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
// JSON diff tests
// ─────────────────────────────────────────────────────────────────────────────

test('diffJson - identical objects', () => {
  const oldVal = { a: 1, b: 2 };
  const newVal = { a: 1, b: 2 };
  const changes = diffJson(oldVal, newVal);
  strictEqual(changes.length, 0);
});

test('diffJson - added property', () => {
  const oldVal = { a: 1 };
  const newVal = { a: 1, b: 2 };
  const changes = diffJson(oldVal, newVal);
  deepStrictEqual(changes, [
    { path: '$.b', type: 'added', oldVal: undefined, newVal: 2 },
  ]);
});

test('diffJson - removed property', () => {
  const oldVal = { a: 1, b: 2 };
  const newVal = { a: 1 };
  const changes = diffJson(oldVal, newVal);
  deepStrictEqual(changes, [
    { path: '$.b', type: 'removed', oldVal: 2, newVal: undefined },
  ]);
});

test('diffJson - property value change', () => {
  const oldVal = { a: 1 };
  const newVal = { a: 2 };
  const changes = diffJson(oldVal, newVal);
  deepStrictEqual(changes, [
    { path: '$.a', type: 'changed', oldVal: 1, newVal: 2 },
  ]);
});

test('diffJson - nested object change', () => {
  const oldVal = { a: { b: 1 } };
  const newVal = { a: { b: 2 } };
  const changes = diffJson(oldVal, newVal);
  deepStrictEqual(changes, [
    { path: '$.a.b', type: 'changed', oldVal: 1, newVal: 2 },
  ]);
});

test('diffJson - array change (add)', () => {
  const oldVal = { arr: [1, 2] };
  const newVal = { arr: [1, 3, 2] };
  const changes = diffJson(oldVal, newVal);
  deepStrictEqual(changes, [
    { path: '$.arr[1]', type: 'added', oldVal: undefined, newVal: 3 },
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────
// Unified diff tests
// ─────────────────────────────────────────────────────────────────────────────

test('unifiedDiff - identical texts', () => {
  const oldText = 'line 1\nline 2\nline 3';
  const newText = 'line 1\nline 2\nline 3';
  const result = unifiedDiff(oldText, newText);
  strictEqual(result, '');
});

test('unifiedDiff - simple addition', () => {
  const oldText = 'line 1\nline 2\nline 3';
  const newText = 'line 1\nline 2\nnew line\nline 3';
  const result = unifiedDiff(oldText, newText);
  strictEqual(result, `--- Original
+++ Modified
@@ -2,1 +2,1 @@
 line 2
+new line
 line 3
`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Patch application tests
// ─────────────────────────────────────────────────────────────────────────────

test('createPatch and applyPatch - simple case', () => {
  const oldText = 'line 1\nline 2\nline 3';
  const newText = 'line 1\nline 2\nnew line\nline 3';
  
  const patch = createPatch(oldText, newText);
  const restored = applyPatch(oldText, patch);
  
  strictEqual(restored, newText);
});

test('applyPatch - empty patch', () => {
  const oldText = 'line 1\nline 2\nline 3';
  const patch = {
    oldHeader: 'Original',
    newHeader: 'Modified',
    hunks: []
  };
  
  const result = applyPatch(oldText, patch);
  strictEqual(result, oldText);
});

// ─────────────────────────────────────────────────────────────────────────────
// Diff statistics tests
// ─────────────────────────────────────────────────────────────────────────────

test('diffStats - identical texts', () => {
  const parts = diffLines('hello\nworld', 'hello\nworld');
  const stats = diffStats(parts);
  deepStrictEqual(stats, {
    additions: 0,
    deletions: 0,
    unchanged: 2,
    changePercent: 0,
  });
});

test('diffStats - additions only', () => {
  const parts = diffLines('hello', 'hello world');
  const stats = diffStats(parts);
  deepStrictEqual(stats, {
    additions: 1,
    deletions: 0,
    unchanged: 1,
    changePercent: 50,
  });
});

test('diffStats - both additions and deletions', () => {
  const parts = diffLines('hello world', 'hello there');
  const stats = diffStats(parts);
  deepStrictEqual(stats, {
    additions: 1,
    deletions: 1,
    unchanged: 1,
    changePercent: 50,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hunk-based diff tests
// ─────────────────────────────────────────────────────────────────────────────

test('diffHunks - identical texts', () => {
  const hunks = diffHunks('line 1\nline 2\nline 3', 'line 1\nline 2\nline 3');
  strictEqual(hunks.length, 0);
});

test('diffHunks - single hunk with context', () => {
  const oldText = 'line 1\nline 2\nline 3\nline 4\nline 5';
  const newText = 'line 1\nnew line\nline 3\nline 4\nline 5';
  const hunks = diffHunks(oldText, newText);
  
  strictEqual(hunks.length, 1);
  deepStrictEqual(hunks[0], {
    changes: [
      { type: 'equal', value: 'line 1', oldLine: 1, newLine: 1 },
      { type: 'removed', value: 'line 2', oldLine: 2 },
      { type: 'added', value: 'new line', newLine: 2 },
      { type: 'equal', value: 'line 3', oldLine: 3, newLine: 3 },
    ],
    oldStart: 1,
    newStart: 1,
    oldEnd: 3,
    newEnd: 3,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LCS utilities tests
// ─────────────────────────────────────────────────────────────────────────────

test('lcsLength - identical strings', () => {
  strictEqual(lcsLength('hello', 'hello'), 5);
});

test('lcsLength - no common subsequence', () => {
  strictEqual(lcsLength('abc', 'xyz'), 0);
});

test('lcsLength - partial match', () => {
  strictEqual(lcsLength('abcdef', 'axcyd'), 3); // a, c, d
});

test('longestCommonSubsequence - identical strings', () => {
  deepStrictEqual(longestCommonSubsequence('hello', 'hello'), ['h', 'e', 'l', 'l', 'o']);
});

test('longestCommonSubsequence - partial match', () => {
  deepStrictEqual(longestCommonSubsequence('abcdef', 'axcyd'), ['a', 'c', 'd']);
});

test('longestCommonSubsequence - empty strings', () => {
  deepStrictEqual(longestCommonSubsequence('', ''), []);
});

// ─────────────────────────────────────────────────────────────────────────────
// Similarity tests
// ─────────────────────────────────────────────────────────────────────────────

test('similarity - identical strings', () => {
  strictEqual(similarity('hello', 'hello'), 1);
});

test('similarity - completely different', () => {
  strictEqual(similarity('abc', 'xyz'), 0);
});

test('similarity - partial match', () => {
  // LCS is 'hel', length 3
  // similarity = (2 * 3) / (5 + 5) = 6/10 = 0.6
  strictEqual(similarity('hello', 'hezzo'), 0.6);
});

test('similarity - empty strings', () => {
  strictEqual(similarity('', ''), 1);
});

test('similarity - one empty', () => {
  strictEqual(similarity('', 'abc'), 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Colorize tests
// ─────────────────────────────────────────────────────────────────────────────

test('colorize - with color', () => {
  const parts = [
    { type: 'equal', value: 'hello' },
    { type: 'added', value: ' world' },
    { type: 'removed', value: '!' },
  ];
  
  const result = colorize(parts);
  
  // Should contain color codes
  strictEqual(typeof result, 'string');
  strictEqual(result.includes('\x1b[31m'), true); // red
  strictEqual(result.includes('\x1b[32m'), true); // green
  strictEqual(result.includes('\x1b[2m'), true); // dim
});

test('colorize - without color', () => {
  const parts = [
    { type: 'equal', value: 'hello' },
    { type: 'added', value: ' world' },
    { type: 'removed', value: '!' },
  ];
  
  const result = colorize(parts, { color: false });
  
  // Should not contain color codes
  strictEqual(result.includes('\x1b['), false);
  strictEqual(result.includes('+ '), true);
  strictEqual(result.includes('- '), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Complex integration tests
// ─────────────────────────────────────────────────────────────────────────────

test('complex diff - multiple insertions and deletions', () => {
  const oldText = 'function old() {\n  return "hello";\n}';
  const newText = 'function new() {\n  return "hello world";\n}';
  
  const parts = diffLines(oldText, newText);
  strictEqual(parts.length, 4);
  strictEqual(parts[0].type, 'equal');
  strictEqual(parts[1].type, 'equal');
  strictEqual(parts[2].type, 'removed');
  strictEqual(parts[3].type, 'added');
});

test('round-trip test - create and apply patch', () => {
  const oldText = `function calculate(a, b) {
  return a + b;
}`;
  const newText = `function calculate(a, b) {
  return a + b;
  console.log("Result:", result);
}`;
  
  const patch = createPatch(oldText, newText);
  const restored = applyPatch(oldText, patch);
  
  strictEqual(restored, newText);
});

test('similarity with realistic text', () => {
  const text1 = 'The quick brown fox jumps over the lazy dog';
  const text2 = 'The quick brown fox jumps over the lazy cat';
  
  const sim = similarity(text1, text2);
  strictEqual(sim, 19/20); // 19 out of 20 characters match
});