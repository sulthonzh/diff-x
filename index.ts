/**
 * diff-x — Zero-dependency text and object diff library
 *
 * Myers diff algorithm, LCS, object diff, patch generation, unified diff output.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Change {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffOp {
  type: 'add' | 'remove' | 'equal';
  lines: string[];
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
}

export interface Patch {
  oldFileName: string;
  newFileName: string;
  oldHeader: string;
  newHeader: string;
  hunks: DiffOp[];
}

export interface ObjDiffEntry {
  type: 'added' | 'removed' | 'changed';
  oldValue: unknown;
  newValue: unknown;
}

export type ObjDiff = Record<string, ObjDiffEntry>;

// ─── Myers Diff (line-level) ────────────────────────────────────────────────

/**
 * Compute the Longest Common Subsequence (LCS) table using Myers' algorithm.
 * Returns the backtracking trace.
 */
function myersTrace(a: string[], b: string[]): number[][] {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  // V array: offset by max to handle negative indices
  // Trace stores V arrays at each edit distance for backtracking
  const trace: number[][] = [];
  const v: number[] = new Array(2 * max + 1).fill(0);
  const vOffset = max;

  for (let d = 0; d <= max; d++) {
    // Store a copy of v at this edit distance
    trace.push([...v]);

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[vOffset + k - 1] < v[vOffset + k + 1])) {
        // Down (insertion)
        x = v[vOffset + k + 1];
      } else {
        // Right (deletion)
        x = v[vOffset + k - 1] + 1;
      }
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[vOffset + k] = x;
      if (x >= n && y >= m) {
        return trace;
      }
    }
  }
  return trace;
}

/**
 * Backtrack through the Myers trace to produce the diff.
 */
function backtrack(
  trace: number[][],
  a: string[],
  b: string[]
): Array<{ type: 'add' | 'remove' | 'equal'; value: string }> {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const vOffset = max;

  const result: Array<{ type: 'add' | 'remove' | 'equal'; value: string }> = [];
  let x = n;
  let y = m;

  for (let d = trace.length - 1; d > 0; d--) {
    const v = trace[d];
    const k = x - y;

    let prevK: number;
    if (k === -d || (k !== d && v[vOffset + k - 1] < v[vOffset + k + 1])) {
      prevK = k + 1;
    } else {
      prevK = k - 1;
    }

    const prevX = v[vOffset + prevK];
    const prevY = prevX - prevK;

    // Equal segments (snake)
    while (x > prevX && y > prevY) {
      result.push({ type: 'equal', value: a[x - 1] });
      x--;
      y--;
    }

    if (d > 0) {
      if (x === prevX) {
        // Insertion
        result.push({ type: 'add', value: b[y - 1] });
        y--;
      } else {
        // Deletion
        result.push({ type: 'remove', value: a[x - 1] });
        x--;
      }
    }
  }

  // Handle remaining equal segment at the start
  const v0 = trace[0] || [];
  while (x > 0 && y > 0) {
    result.push({ type: 'equal', value: a[x - 1] });
    x--;
    y--;
  }

  result.reverse();
  return result;
}

/**
 * Diff two arrays of strings (lines) using Myers' algorithm.
 */
export function diffLines(a: string[], b: string[]): Change[] {
  if (a.length === 0 && b.length === 0) return [];
  if (a.length === 0) {
    return b.map((value, i) => ({ type: 'added' as const, value, newLineNumber: i + 1 }));
  }
  if (b.length === 0) {
    return a.map((value, i) => ({ type: 'removed' as const, value, oldLineNumber: i + 1 }));
  }

  const trace = myersTrace(a, b);
  const raw = backtrack(trace, a, b);

  // Build changes with line numbers
  const changes: Change[] = [];
  let oldLn = 0;
  let newLn = 0;

  for (const item of raw) {
    switch (item.type) {
      case 'equal':
        oldLn++;
        newLn++;
        changes.push({ type: 'unchanged', value: item.value, oldLineNumber: oldLn, newLineNumber: newLn });
        break;
      case 'add':
        newLn++;
        changes.push({ type: 'added', value: item.value, newLineNumber: newLn });
        break;
      case 'remove':
        oldLn++;
        changes.push({ type: 'removed', value: item.value, oldLineNumber: oldLn });
        break;
    }
  }

  return changes;
}

/**
 * Diff two strings (split by newlines).
 */
export function diffStrings(oldStr: string, newStr: string): Change[] {
  const a = oldStr.length === 0 ? [] : oldStr.split('\n');
  const b = newStr.length === 0 ? [] : newStr.split('\n');
  return diffLines(a, b);
}

/**
 * Diff two arrays of tokens (word-level diff).
 */
export function diffWords(oldStr: string, newStr: string): Change[] {
  const a = tokenize(oldStr);
  const b = tokenize(newStr);
  const raw = backtrack(myersTrace(a, b), a, b);

  // Coalesce consecutive same-type tokens
  const changes: Change[] = [];
  let oldIdx = 0;
  let newIdx = 0;

  for (const item of raw) {
    switch (item.type) {
      case 'equal':
        oldIdx++;
        newIdx++;
        changes.push({ type: 'unchanged', value: item.value });
        break;
      case 'add':
        newIdx++;
        changes.push({ type: 'added', value: item.value });
        break;
      case 'remove':
        oldIdx++;
        changes.push({ type: 'removed', value: item.value });
        break;
    }
  }
  return changes;
}

/**
 * Tokenize a string into words and whitespace segments for word-level diff.
 */
function tokenize(str: string): string[] {
  return str.match(/\S+|\s+/g) || [];
}

// ─── LCS (Longest Common Subsequence) ───────────────────────────────────────

/**
 * Compute the length of the LCS of two arrays.
 */
export function lcsLength<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean = (x, y) => x === y): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (eq(a[i - 1], b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Compute the actual LCS of two arrays.
 */
export function lcs<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean = (x, y) => x === y): T[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (eq(a[i - 1], b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the LCS
  const result: T[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (eq(a[i - 1], b[j - 1])) {
      result.unshift(a[i - 1]);
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

/**
 * Compute LCS of two strings (character-level).
 */
export function lcsString(a: string, b: string): string {
  return lcs(a.split(''), b.split('')).join('');
}

// ─── Patch Generation (Unified Diff) ────────────────────────────────────────

/**
 * Convert a diff into unified diff format hunks.
 */
export function createPatch(
  oldStr: string,
  newStr: string,
  oldFileName: string = '',
  newFileName: string = '',
  contextLines: number = 3
): string {
  const a = oldStr.length === 0 ? [] : oldStr.split('\n');
  const b = newStr.length === 0 ? [] : newStr.split('\n');
  const changes = diffLines(a, b);

  // Build hunks
  const hunks: DiffOp[] = [];
  let currentHunk: DiffOp | null = null;
  let oldStart = 0;
  let newStart = 0;
  let oldCount = 0;
  let newCount = 0;

  const flushHunk = () => {
    if (currentHunk) {
      currentHunk.oldLines = oldCount;
      currentHunk.newLines = newCount;
      hunks.push(currentHunk);
      currentHunk = null;
    }
  };

  // Find change segments and group into hunks with context
  const changeIndices: number[] = [];
  changes.forEach((c, i) => {
    if (c.type !== 'unchanged') changeIndices.push(i);
  });

  if (changeIndices.length === 0) {
    return '';
  }

  let i = 0;
  while (i < changes.length) {
    const change = changes[i];

    if (change.type === 'unchanged') {
      // Check if this is within context range of a change
      const distToNextChange = changes.slice(i).findIndex(c => c.type !== 'unchanged');
      const distFromPrevChange = changeIndices.findIndex(ci => ci > i);
      const prevChangeIdx = changeIndices.filter(ci => ci < i).pop();

      if (currentHunk && distToNextChange >= 0 && distToNextChange <= contextLines) {
        // Still within context of next change
        currentHunk.lines.push(' ' + change.value);
        oldCount++;
        newCount++;
        i++;
        continue;
      }

      if (currentHunk && (!prevChangeIdx || i - prevChangeIdx > contextLines)) {
        // End of context range
        if (distToNextChange === -1 || distToNextChange > contextLines) {
          flushHunk();
        }
      }

      if (!currentHunk) {
        // Skip leading context beyond range
      }
      i++;
      continue;
    }

    // Start new hunk if needed
    if (!currentHunk) {
      // Include leading context
      const contextStart = Math.max(0, i - contextLines);
      let j = contextStart;
      oldStart = 0;
      newStart = 0;
      oldCount = 0;
      newCount = 0;
      const leadLines: string[] = [];
      while (j < i) {
        leadLines.push(' ' + changes[j].value);
        j++;
      }
      // Determine starts from the context
      const firstChange = changes[i];
      oldStart = (firstChange.oldLineNumber || 1) - leadLines.length;
      newStart = (firstChange.newLineNumber || 1) - leadLines.length;
      if (oldStart < 1) oldStart = 1;
      if (newStart < 1) newStart = 1;
      currentHunk = {
        type: 'equal',
        lines: leadLines,
        oldStart,
        oldLines: 0,
        newStart,
        newLines: 0,
      };
      // Count context lines
      for (const _ of leadLines) {
        oldCount++;
        newCount++;
      }
    }

    if (change.type === 'added') {
      currentHunk.lines.push('+' + change.value);
      newCount++;
    } else if (change.type === 'removed') {
      currentHunk.lines.push('-' + change.value);
      oldCount++;
    }
    i++;
  }
  flushHunk();

  // Build unified diff output
  const lines: string[] = [];
  if (oldFileName || newFileName) {
    lines.push(`--- ${oldFileName}`);
    lines.push(`+++ ${newFileName}`);
  }
  for (const hunk of hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
    lines.push(...hunk.lines);
  }
  return lines.join('\n');
}

// ─── Structured Patch ───────────────────────────────────────────────────────

export function structuredPatch(
  oldStr: string,
  newStr: string,
  oldFileName: string = 'Original',
  newFileName: string = 'Modified',
  contextLines: number = 3
): Patch {
  const unified = createPatch(oldStr, newStr, oldFileName, newFileName, contextLines);
  const hunks: DiffOp[] = [];

  if (!unified) {
    return { oldFileName, newFileName, oldHeader: '', newHeader: '', hunks: [] };
  }

  // Parse hunks from unified diff
  const lines = unified.split('\n');
  let i = 0;
  // Skip file headers
  while (i < lines.length && !lines[i].startsWith('@@')) i++;

  while (i < lines.length) {
    const match = lines[i].match(/^@@ -(\d+),(\d+) \+(\d+),(\d+) @@$/);
    if (!match) { i++; continue; }

    const hunk: DiffOp = {
      type: 'equal',
      oldStart: parseInt(match[1]),
      oldLines: parseInt(match[2]),
      newStart: parseInt(match[3]),
      newLines: parseInt(match[4]),
      lines: [],
    };
    i++;
    while (i < lines.length && !lines[i].startsWith('@@')) {
      hunk.lines.push(lines[i]);
      i++;
    }
    hunks.push(hunk);
  }

  return { oldFileName, newFileName, oldHeader: '', newHeader: '', hunks };
}

// ─── Apply Patch ────────────────────────────────────────────────────────────

/**
 * Apply a unified diff patch to a string.
 */
export function applyPatch(oldStr: string, patch: string): string {
  const lines = patch.split('\n');
  const oldLines = oldStr.split('\n');
  const result: string[] = [];
  let oldIdx = 0;

  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(/^@@ -(\d+),?\d* \+(\d+),?\d* @@$/);
    if (!match) { i++; continue; }

    const oldStart = parseInt(match[1]) - 1; // Convert to 0-indexed
    i++;

    // Copy unchanged lines before this hunk
    while (oldIdx < oldStart && oldIdx < oldLines.length) {
      result.push(oldLines[oldIdx]);
      oldIdx++;
    }

    // Apply hunk lines
    while (i < lines.length && !lines[i].startsWith('@@')) {
      const line = lines[i];
      if (line.startsWith('+++') || line.startsWith('---')) {
        i++;
        continue;
      }
      if (line.startsWith('+')) {
        result.push(line.slice(1));
      } else if (line.startsWith('-')) {
        oldIdx++; // Skip old line
      } else if (line.startsWith(' ')) {
        result.push(line.slice(1));
        oldIdx++;
      } else if (line === '') {
        // Empty line in patch = unchanged empty line
        result.push('');
        oldIdx++;
      }
      i++;
    }
  }

  // Copy remaining lines
  while (oldIdx < oldLines.length) {
    result.push(oldLines[oldIdx]);
    oldIdx++;
  }

  return result.join('\n');
}

// ─── Object Diff ────────────────────────────────────────────────────────────

/**
 * Deep diff two objects. Returns a map of paths to change descriptions.
 * Paths use dot notation: "a.b[0].c"
 */
export function objectDiff(oldObj: unknown, newObj: unknown, path: string = ''): ObjDiff {
  const result: ObjDiff = {};

  if (oldObj === newObj) return result;

  // Handle null/undefined
  if (oldObj === null || newObj === null || oldObj === undefined || newObj === undefined) {
    if (oldObj !== newObj) {
      result[path || '<root>'] = { type: 'changed', oldValue: oldObj, newValue: newObj };
    }
    return result;
  }

  // Type mismatch
  const oldType = Object.prototype.toString.call(oldObj);
  const newType = Object.prototype.toString.call(newObj);
  if (oldType !== newType) {
    result[path || '<root>'] = { type: 'changed', oldValue: oldObj, newValue: newObj };
    return result;
  }

  // Arrays
  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    const maxLen = Math.max(oldObj.length, newObj.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = `${path}[${i}]`;
      if (i >= oldObj.length) {
        result[childPath] = { type: 'added', oldValue: undefined, newValue: newObj[i] };
      } else if (i >= newObj.length) {
        result[childPath] = { type: 'removed', oldValue: oldObj[i], newValue: undefined };
      } else {
        Object.assign(result, objectDiff(oldObj[i], newObj[i], childPath));
      }
    }
    return result;
  }

  // Plain objects
  if (oldType === '[object Object]') {
    const oldRecord = oldObj as Record<string, unknown>;
    const newRecord = newObj as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]);

    for (const key of allKeys) {
      const childPath = path ? `${path}.${key}` : key;
      const inOld = Object.prototype.hasOwnProperty.call(oldRecord, key);
      const inNew = Object.prototype.hasOwnProperty.call(newRecord, key);

      if (inOld && !inNew) {
        result[childPath] = { type: 'removed', oldValue: oldRecord[key], newValue: undefined };
      } else if (!inOld && inNew) {
        result[childPath] = { type: 'added', oldValue: undefined, newValue: newRecord[key] };
      } else {
        Object.assign(result, objectDiff(oldRecord[key], newRecord[key], childPath));
      }
    }
    return result;
  }

  // Primitives or other types
  if (oldObj !== newObj) {
    result[path || '<root>'] = { type: 'changed', oldValue: oldObj, newValue: newObj };
  }

  return result;
}

/**
 * Format an object diff for human reading.
 */
export function formatObjectDiff(diff: ObjDiff): string {
  const lines: string[] = [];
  for (const [path, entry] of Object.entries(diff)) {
    const oldVal = typeof entry.oldValue === 'object' ? JSON.stringify(entry.oldValue) : String(entry.oldValue);
    const newVal = typeof entry.newValue === 'object' ? JSON.stringify(entry.newValue) : String(entry.newValue);
    switch (entry.type) {
      case 'added':
        lines.push(`+ ${path}: ${newVal}`);
        break;
      case 'removed':
        lines.push(`- ${path}: ${oldVal}`);
        break;
      case 'changed':
        lines.push(`~ ${path}: ${oldVal} → ${newVal}`);
        break;
    }
  }
  return lines.join('\n');
}

// ─── Levenshtein Distance ───────────────────────────────────────────────────

/**
 * Compute the Levenshtein edit distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use two rows for O(min(m,n)) space
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,    // Insertion
        prev[j] + 1,         // Deletion
        prev[j - 1] + cost   // Substitution
      );
    }
    prev.splice(0, n + 1, ...curr);
  }

  return prev[n];
}

/**
 * Compute similarity ratio (0 to 1) between two strings.
 */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

// ─── Summary ────────────────────────────────────────────────────────────────

/**
 * Summarize a diff: counts of additions, removals, and unchanged lines.
 */
export function diffSummary(changes: Change[]): {
  additions: number;
  removals: number;
  unchanged: number;
  total: number;
  changed: boolean;
} {
  let additions = 0;
  let removals = 0;
  let unchanged = 0;

  for (const c of changes) {
    switch (c.type) {
      case 'added': additions++; break;
      case 'removed': removals++; break;
      case 'unchanged': unchanged++; break;
    }
  }

  return {
    additions,
    removals,
    unchanged,
    total: changes.length,
    changed: additions > 0 || removals > 0,
  };
}
