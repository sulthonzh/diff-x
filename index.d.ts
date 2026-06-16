/**
 * diff-x — Zero-dependency text and object diff library
 *
 * Myers diff algorithm, LCS, object diff, patch generation, unified diff output.
 */
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
/**
 * Diff two arrays of strings (lines) using Myers' algorithm.
 */
export declare function diffLines(a: string[], b: string[]): Change[];
/**
 * Diff two strings (split by newlines).
 */
export declare function diffStrings(oldStr: string, newStr: string): Change[];
/**
 * Diff two arrays of tokens (word-level diff).
 */
export declare function diffWords(oldStr: string, newStr: string): Change[];
/**
 * Compute the length of the LCS of two arrays.
 */
export declare function lcsLength<T>(a: T[], b: T[], eq?: (x: T, y: T) => boolean): number;
/**
 * Compute the actual LCS of two arrays.
 */
export declare function lcs<T>(a: T[], b: T[], eq?: (x: T, y: T) => boolean): T[];
/**
 * Compute LCS of two strings (character-level).
 */
export declare function lcsString(a: string, b: string): string;
/**
 * Convert a diff into unified diff format hunks.
 */
export declare function createPatch(oldStr: string, newStr: string, oldFileName?: string, newFileName?: string, contextLines?: number): string;
export declare function structuredPatch(oldStr: string, newStr: string, oldFileName?: string, newFileName?: string, contextLines?: number): Patch;
/**
 * Apply a unified diff patch to a string.
 */
export declare function applyPatch(oldStr: string, patch: string): string;
/**
 * Deep diff two objects. Returns a map of paths to change descriptions.
 * Paths use dot notation: "a.b[0].c"
 */
export declare function objectDiff(oldObj: unknown, newObj: unknown, path?: string): ObjDiff;
/**
 * Format an object diff for human reading.
 */
export declare function formatObjectDiff(diff: ObjDiff): string;
/**
 * Compute the Levenshtein edit distance between two strings.
 */
export declare function levenshtein(a: string, b: string): number;
/**
 * Compute similarity ratio (0 to 1) between two strings.
 */
export declare function similarity(a: string, b: string): number;
/**
 * Summarize a diff: counts of additions, removals, and unchanged lines.
 */
export declare function diffSummary(changes: Change[]): {
    additions: number;
    removals: number;
    unchanged: number;
    total: number;
    changed: boolean;
};
