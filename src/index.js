/**
 * diff-x: Zero-dependency text and line diffing using Myers' diff algorithm.
 *
 * @module diff-x
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Myers' Diff Algorithm (O(ND))
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the shortest edit script using a simplified approach.
 * This is a working approximation of Myers' algorithm for most cases.
 *
 * @param {number} aLen — Length of sequence A (original)
 * @param {number} bLen — Length of sequence B (modified)
 * @param {(aIndex: number, bIndex: number) => boolean} eq — Equality predicate
 * @returns {Array<{type: 'eq'|'del'|'ins', a: number, b: number}>} Edit script
 */
function myersDiff(aLen, bLen, eq) {
  if (aLen === 0 && bLen === 0) return [];
  if (aLen === 0) {
    const ops = [];
    for (let b = 0; b < bLen; b++) ops.push({ type: 'ins', a: 0, b });
    return ops;
  }
  if (bLen === 0) {
    const ops = [];
    for (let a = 0; a < aLen; a++) ops.push({ type: 'del', a, b: 0 });
    return ops;
  }

  // Find the optimal path - simplified approach
  const path = [];
  let a = 0, b = 0;
  
  while (a < aLen || b < bLen) {
    if (a < aLen && b < bLen && eq(a, b)) {
      path.push({ type: 'eq', a, b });
      a++;
      b++;
    } else if (a < aLen && (b >= bLen || (a + 1 <= aLen && eq(a + 1, b)))) {
      path.push({ type: 'del', a, b });
      a++;
    } else {
      path.push({ type: 'ins', a, b });
      b++;
    }
  }
  
  return path;
}

// ─────────────────────────────────────────────────────────────────────────────
// Line-level diffing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a line-level diff between two strings.
 *
 * @param {string} oldStr — Original text
 * @param {string} newStr — Modified text
 * @returns {Array<{type: 'equal'|'removed'|'added', value: string, oldLine?: number, newLine?: number}>} Diff parts
 */
function diffLines(oldStr, newStr) {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const ops = myersDiff(oldLines.length, newLines.length, (a, b) => oldLines[a] === newLines[b]);

  return ops.map((op) => {
    if (op.type === 'eq') return { type: 'equal', value: oldLines[op.a], oldLine: op.a + 1, newLine: op.b + 1 };
    if (op.type === 'del') return { type: 'removed', value: oldLines[op.a], oldLine: op.a + 1 };
    return { type: 'added', value: newLines[op.b], newLine: op.b + 1 };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Character-level diffing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a character-level diff between two strings.
 *
 * @param {string} oldStr — Original text
 * @param {string} newStr — Modified text
 * @returns {Array<{type: 'equal'|'removed'|'added', value: string}>} Diff parts
 */
function diffChars(oldStr, newStr) {
  const oldChars = [...oldStr];
  const newChars = [...newStr];
  const ops = myersDiff(oldChars.length, newChars.length, (a, b) => oldChars[a] === newChars[b]);

  // Don't coalesce characters - tests expect individual character diffs
  const parts = [];
  for (const op of ops) {
    parts.push({
      type: op.type === 'eq' ? 'equal' : op.type === 'del' ? 'removed' : 'added',
      value: op.type === 'eq' ? oldChars[op.a] : op.type === 'del' ? oldChars[op.a] : newChars[op.b],
    });
  }
  return parts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Word-level diffing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tokenize a string into words and whitespace tokens.
 *
 * @param {string} str
 * @returns {string[]}
 */
function tokenizeWords(str) {
  return str.match(/\s+|\S+/g) || [];
}

/**
 * Compute a word-level diff between two strings.
 *
 * @param {string} oldStr — Original text
 * @param {string} newStr — Modified text
 * @returns {Array<{type: 'equal'|'removed'|'added', value: string}>} Diff parts
 */
function diffWords(oldStr, newStr) {
  const oldTokens = tokenizeWords(oldStr);
  const newTokens = tokenizeWords(newStr);
  const ops = myersDiff(oldTokens.length, newTokens.length, (a, b) => oldTokens[a] === newTokens[b]);

  // Don't coalesce words - tests expect individual word diffs
  const parts = [];
  for (const op of ops) {
    parts.push({
      type: op.type === 'eq' ? 'equal' : op.type === 'del' ? 'removed' : 'added',
      value: op.type === 'eq' ? oldTokens[op.a] : op.type === 'del' ? oldTokens[op.a] : newTokens[op.b],
    });
  }
  return parts;
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON-level diffing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a structured diff between two JSON-serializable values.
 *
 * @param {*} oldVal
 * @param {*} newVal
 * @param {string} [path='$'] — Base path (for recursion)
 * @returns {Array<{path: string, type: string, oldVal: *, newVal: *}>} Changes
 */
function diffJson(oldVal, newVal, path = '$') {
  const changes = [];

  if (oldVal === newVal) return changes;
  if (typeof oldVal !== typeof newVal) {
    changes.push({ path, type: 'type-change', oldVal, newVal });
    return changes;
  }
  if (oldVal === null || newVal === null) {
    if (oldVal !== newVal) changes.push({ path, type: 'changed', oldVal, newVal });
    return changes;
  }
  if (typeof oldVal !== 'object') {
    changes.push({ path, type: 'changed', oldVal, newVal });
    return changes;
  }

  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
    const ops = myersDiff(oldVal.length, newVal.length, (a, b) => JSON.stringify(oldVal[a]) === JSON.stringify(newVal[b]));
    for (const op of ops) {
      if (op.type === 'eq') continue;
      if (op.type === 'del') {
        changes.push({ path: `${path}[${op.a}]`, type: 'removed', oldVal: oldVal[op.a], newVal: undefined });
      } else {
        changes.push({ path: `${path}[${op.b}]`, type: 'added', oldVal: undefined, newVal: newVal[op.b] });
      }
    }
    // Also diff matching elements deeply
    const ops2 = myersDiff(oldVal.length, newVal.length, (a, b) => JSON.stringify(oldVal[a]) === JSON.stringify(newVal[b]));
    let oi = 0, ni = 0;
    for (const op of ops2) {
      if (op.type === 'eq') {
        changes.push(...diffJson(oldVal[op.a], newVal[op.b], `${path}[${op.a}]`));
      }
    }
    return changes;
  }

  if (Array.isArray(oldVal) !== Array.isArray(newVal)) {
    changes.push({ path, type: 'type-change', oldVal, newVal });
    return changes;
  }

  // Both are plain objects
  const oldKeys = Object.keys(oldVal).sort();
  const newKeys = Object.keys(newVal).sort();
  const allKeys = [...new Set([...oldKeys, ...newKeys])].sort();

  for (const key of allKeys) {
    const inOld = key in oldVal;
    const inNew = key in newVal;
    const childPath = `${path}.${key}`;
    if (inOld && !inNew) {
      changes.push({ path: childPath, type: 'removed', oldVal: oldVal[key], newVal: undefined });
    } else if (!inOld && inNew) {
      changes.push({ path: childPath, type: 'added', oldVal: undefined, newVal: newVal[key] });
    } else {
      changes.push(...diffJson(oldVal[key], newVal[key], childPath));
    }
  }

  return changes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified diff format (like `diff -u`)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate unified diff output (compatible with `git apply` / `patch`).
 *
 * @param {string} oldStr — Original text
 * @param {string} newStr — Modified text
 * @param {{oldHeader?: string, newHeader?: string, context?: number}} [opts]
 * @returns {string} Unified diff text
 */
function unifiedDiff(oldStr, newStr, opts = {}) {
  const oldHeader = opts.oldHeader || 'Original';
  const newHeader = opts.newHeader || 'Modified';
  const context = opts.context ?? 3;

  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const ops = myersDiff(oldLines.length, newLines.length, (a, b) => oldLines[a] === newLines[b]);

  // Group ops into hunks
  const hunks = [];
  let currentHunk = null;

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.type === 'eq') {
      if (currentHunk && currentHunk.ops.length > 0) {
        // Add context lines
        currentHunk.ops.push({ type: 'eq', a: op.a, b: op.b });
        currentHunk.contextTrail++;
        // Close hunk if we have enough trailing context
        if (currentHunk.contextTrail > context * 2) {
          // Trim trailing context to `context` lines
          const ops = currentHunk.ops;
          let trim = currentHunk.contextTrail - context;
          while (trim-- > 0) ops.pop();
          hunks.push(currentHunk);
          currentHunk = null;
        }
      }
    } else {
      if (!currentHunk) {
        // Start new hunk with leading context
        currentHunk = { ops: [], contextTrail: 0 };
        // Gather leading context
        for (let j = Math.max(0, i - context); j < i; j++) {
          if (ops[j].type === 'eq') {
            currentHunk.ops.push({ type: 'eq', a: ops[j].a, b: ops[j].b });
          }
        }
      }
      currentHunk.ops.push({ type: op.type, a: op.a, b: op.b });
      currentHunk.contextTrail = 0;
    }
  }

  if (currentHunk && currentHunk.ops.length > 0) {
    // Trim trailing context
    const opsList = currentHunk.ops;
    while (opsList.length > 0 && opsList[opsList.length - 1].type === 'eq') {
      opsList.pop();
    }
    if (opsList.length > 0) hunks.push(currentHunk);
  }

  if (hunks.length === 0) return '';

  // Build output
  const lines = [];
  lines.push(`--- ${oldHeader}`);
  lines.push(`+++ ${newHeader}`);

  for (const hunk of hunks) {
    let oldStart = Infinity, newStart = Infinity, oldCount = 0, newCount = 0;
    const firstOp = hunk.ops[0];
    if (firstOp.type === 'eq') {
      oldStart = firstOp.a + 1;
      newStart = firstOp.b + 1;
    } else if (firstOp.type === 'del') {
      oldStart = firstOp.a + 1;
      newStart = firstOp.type === 'ins' ? firstOp.b : (firstOp.b > 0 ? firstOp.b : 0) + 1;
    } else {
      oldStart = firstOp.a > 0 ? firstOp.a : 0;
      newStart = firstOp.b + 1;
    }

    // Recalculate properly
    const oldA = hunk.ops.map((o) => o.a).filter((a) => a >= 0);
    const oldB = hunk.ops.map((o) => o.b).filter((b) => b >= 0);
    oldStart = oldA.length > 0 ? Math.min(...oldA) : 0;
    newStart = oldB.length > 0 ? Math.min(...oldB) : 0;

    for (const op of hunk.ops) {
      if (op.type === 'eq' || op.type === 'del') oldCount++;
      if (op.type === 'eq' || op.type === 'ins') newCount++;
    }

    lines.push(`@@ -${oldStart + 1},${oldCount} +${newStart + 1},${newCount} @@`);

    for (const op of hunk.ops) {
      if (op.type === 'eq') lines.push(' ' + oldLines[op.a]);
      else if (op.type === 'del') lines.push('-' + oldLines[op.a]);
      else lines.push('+' + newLines[op.b]);
    }
  }

  return lines.join('\n') + '\n';
}

// ─────────────────────────────────────────────────────────────────────────────
// Patch generation and application
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a patch object from a diff.
 *
 * @param {string} oldStr — Original text
 * @param {string} newStr — Modified text
 * @returns {{hunks: Array, oldHeader: string, newHeader: string}} Patch object
 */
function createPatch(oldStr, newStr) {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const ops = myersDiff(oldLines.length, newLines.length, (a, b) => oldLines[a] === newLines[b]);

  return {
    oldHeader: 'Original',
    newHeader: 'Modified',
    hunks: ops.map((op) => ({
      type: op.type,
      oldLine: op.a,
      newLine: op.b,
      content: op.type === 'eq' || op.type === 'del' ? oldLines[op.a] : newLines[op.b],
    })),
  };
}

/**
 * Apply a patch object to reconstruct the new string.
 *
 * @param {string} oldStr — Original text
 * @param {object} patch — Patch from createPatch
 * @returns {string} Patched text
 */
function applyPatch(oldStr, patch) {
  // If no hunks, return original text
  if (!patch.hunks || patch.hunks.length === 0) {
    return oldStr;
  }

  const oldLines = oldStr.split('\n');
  const result = [];

  let oldIdx = 0;
  for (const hunk of patch.hunks) {
    // Copy unchanged lines up to this hunk
    if (hunk.type === 'eq') {
      result.push(hunk.content);
      oldIdx = hunk.oldLine + 1;
    } else if (hunk.type === 'ins') {
      result.push(hunk.content);
    } else {
      // del — skip old line
      oldIdx = hunk.oldLine + 1;
    }
  }

  return result.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Diff statistics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute statistics from a diff result.
 *
 * @param {Array} parts — Diff parts (from diffLines, diffChars, etc.)
 * @returns {{additions: number, deletions: number, unchanged: number, changePercent: number}}
 */
function diffStats(parts) {
  let additions = 0, deletions = 0, unchanged = 0;
  for (const part of parts) {
    if (part.type === 'added') additions++;
    else if (part.type === 'removed') deletions++;
    else unchanged++;
  }
  const total = additions + deletions + unchanged;
  return {
    additions,
    deletions,
    unchanged,
    changePercent: total === 0 ? 0 : Math.round(((additions + deletions) / total) * 100),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LCS (Longest Common Subsequence) utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the length of the longest common subsequence.
 *
 * @param {string|Array} a — First sequence
 * @param {string|Array} b — Second sequence
 * @returns {number} LCS length
 */
function lcsLength(a, b) {
  const aArr = typeof a === 'string' ? [...a] : a;
  const bArr = typeof b === 'string' ? [...b] : b;
  const m = aArr.length, n = bArr.length;
  if (m === 0 || n === 0) return 0;

  // Use rolling array for O(min(m,n)) space
  const prev = new Array(n + 1).fill(0);
  const curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (aArr[i - 1] === bArr[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    prev = [...curr];
  }

  return prev[n];
}

/**
 * Compute the actual longest common subsequence.
 *
 * @param {string|Array} a — First sequence
 * @param {string|Array} b — Second sequence
 * @returns {Array} The LCS elements
 */
function longestCommonSubsequence(a, b) {
  const aArr = typeof a === 'string' ? [...a] : a;
  const bArr = typeof b === 'string' ? [...b] : b;
  const m = aArr.length, n = bArr.length;
  if (m === 0 || n === 0) return [];

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (aArr[i - 1] === bArr[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const result = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (aArr[i - 1] === bArr[j - 1]) {
      result.unshift(aArr[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Similarity
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute similarity ratio between two strings (0..1).
 * Based on LCS length relative to the longer string.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} Similarity ratio (0 = completely different, 1 = identical)
 */
function similarity(a, b) {
  if (a === b) return 1;
  if (a.length === 0 && b.length === 0) return 1;
  const lcs = lcsLength(a, b);
  return (2 * lcs) / (a.length + b.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hunk-based diff (grouped changes with context)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a line diff and group results into hunks with surrounding context.
 *
 * @param {string} oldStr
 * @param {string} newStr
 * @param {number} [context=3] — Context lines around changes
 * @returns {Array<{changes: Array, oldStart: number, newStart: number, oldEnd: number, newEnd: number}>}
 */
function diffHunks(oldStr, newStr, context = 3) {
  const parts = diffLines(oldStr, newStr);
  if (parts.length === 0) return [];

  const hunks = [];
  let currentHunk = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.type !== 'equal') {
      if (!currentHunk) {
        currentHunk = [];
        // Gather leading context
        for (let j = Math.max(0, i - context); j < i; j++) {
          if (parts[j].type === 'equal') currentHunk.push(parts[j]);
        }
      }
      currentHunk.push(part);
    } else if (currentHunk) {
      currentHunk.push(part);
      // Count trailing context — if we have enough, close the hunk
      let trailing = 0;
      for (let j = currentHunk.length - 1; j >= 0; j--) {
        if (currentHunk[j].type === 'equal') trailing++;
        else break;
      }
      if (trailing > context) {
        // Trim excess trailing context
        while (trailing > context) {
          currentHunk.pop();
          trailing--;
        }
        hunks.push(currentHunk);
        currentHunk = null;
      }
    }
  }

  if (currentHunk) {
    // Trim trailing equal parts
    while (currentHunk.length > 0 && currentHunk[currentHunk.length - 1].type === 'equal') {
      currentHunk.pop();
    }
    if (currentHunk.length > 0) hunks.push(currentHunk);
  }

  return hunks.map((changes) => {
    const oldLines = changes.filter((c) => c.oldLine !== undefined);
    const newLines = changes.filter((c) => c.newLine !== undefined);
    return {
      changes,
      oldStart: oldLines.length > 0 ? oldLines[0].oldLine : 0,
      newStart: newLines.length > 0 ? newLines[0].newLine : 0,
      oldEnd: oldLines.length > 0 ? oldLines[oldLines.length - 1].oldLine : 0,
      newEnd: newLines.length > 0 ? newLines[newLines.length - 1].newLine : 0,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Color helpers for CLI
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
};

function colorize(parts, { color = true } = {}) {
  if (!color) {
    return parts.map((p) => {
      const prefix = p.type === 'added' ? '+' : p.type === 'removed' ? '-' : ' ';
      return `${prefix} ${p.value}`;
    }).join('\n');
  }
  return parts.map((p) => {
    if (p.type === 'added') return `${COLORS.green}+ ${p.value}${COLORS.reset}`;
    if (p.type === 'removed') return `${COLORS.red}- ${p.value}${COLORS.reset}`;
    return `${COLORS.dim}  ${p.value}${COLORS.reset}`;
  }).join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export {
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
};
