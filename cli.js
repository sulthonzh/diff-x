#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * diff-x CLI — Diff text files and print unified diff output
 */
const index_1 = require("./index");
const fs = __importStar(require("fs"));
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`diff-x — Zero-dependency diff tool

Usage:
  diff-x <old-file> <new-file>          Unified diff (default)
  diff-x --inline <old> <new>           Inline (change-by-change) view
  diff-x --levenshtein <a> <b>          Levenshtein distance
  diff-x --similarity <a> <b>           Similarity ratio (0–1)
  diff-x --summary <old> <new>          Diff summary
  diff-x --demo                          Demo with sample text

Options:
  --no-headers     Skip file headers in unified diff
  --context <n>    Context lines (default: 3)
  --help, -h       Show this help`);
        return;
    }
    const cmd = args[0];
    if (cmd === '--demo') {
        return demo();
    }
    if (cmd === '--levenshtein') {
        console.log((0, index_1.levenshtein)(args[1] || '', args[2] || ''));
        return;
    }
    if (cmd === '--similarity') {
        const r = (0, index_1.similarity)(args[1] || '', args[2] || '');
        console.log(r.toFixed(4));
        return;
    }
    // File diff mode
    let mode = 'unified';
    let noHeaders = false;
    let context = 3;
    const files = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--inline')
            mode = 'inline';
        else if (args[i] === '--summary')
            mode = 'summary';
        else if (args[i] === '--no-headers')
            noHeaders = true;
        else if (args[i] === '--context')
            context = parseInt(args[++i]) || 3;
        else if (!args[i].startsWith('-'))
            files.push(args[i]);
    }
    if (files.length < 2) {
        console.error('Error: need two inputs');
        process.exit(1);
    }
    const oldStr = files[0] === '-' ? readStdin() : fs.readFileSync(files[0], 'utf-8');
    const newStr = files[1] === '-' ? readStdin() : fs.readFileSync(files[1], 'utf-8');
    if (mode === 'inline') {
        const changes = (0, index_1.diffStrings)(oldStr, newStr);
        for (const c of changes) {
            const prefix = c.type === 'added' ? '+' : c.type === 'removed' ? '-' : ' ';
            const ln = c.oldLineNumber ?? c.newLineNumber ?? '';
            console.log(`${prefix} ${ln ? String(ln).padStart(4) : '    '} | ${c.value}`);
        }
    }
    if (mode === 'summary') {
        const changes = (0, index_1.diffStrings)(oldStr, newStr);
        const s = (0, index_1.diffSummary)(changes);
        console.log(`+ ${s.additions} additions`);
        console.log(`- ${s.removals} removals`);
        console.log(`  ${s.unchanged} unchanged`);
        console.log(`  ${s.changed ? 'CHANGED' : 'IDENTICAL'}`);
    }
    else {
        const oldName = noHeaders ? '' : (files[0] === '-' ? 'stdin' : `a/${files[0]}`);
        const newName = noHeaders ? '' : (files[1] === '-' ? 'stdin' : `b/${files[1]}`);
        const patch = (0, index_1.createPatch)(oldStr, newStr, oldName, newName, context);
        if (patch)
            console.log(patch);
        else
            console.log('Files are identical');
    }
}
function readStdin() {
    return fs.readFileSync(0, 'utf-8');
}
function demo() {
    const oldText = `The quick brown fox
jumps over the lazy dog.
It was the best of times.
It was the worst of times.`;
    const newText = `The quick brown fox
leaps over the lazy dog.
It was the best of times.
It was the age of wisdom.`;
    console.log('=== UNIFIED DIFF ===\n');
    console.log((0, index_1.createPatch)(oldText, newText, 'old.txt', 'new.txt'));
    console.log('\n=== INLINE ===\n');
    const changes = (0, index_1.diffStrings)(oldText, newText);
    for (const c of changes) {
        const sym = c.type === 'added' ? '+' : c.type === 'removed' ? '-' : ' ';
        console.log(`${sym} ${c.value}`);
    }
    console.log('\n=== SUMMARY ===\n');
    const s = (0, index_1.diffSummary)(changes);
    console.log(`+${s.additions} -${s.removals} (${s.unchanged} unchanged)`);
    console.log('\n=== LEVENSHTEIN ===\n');
    console.log(`jumps→leaps: distance=${(0, index_1.levenshtein)('jumps', 'leaps')}, similarity=${(0, index_1.similarity)('jumps', 'leaps').toFixed(3)}`);
    console.log(`worst→wisdom: distance=${(0, index_1.levenshtein)('worst', 'wisdom')}, similarity=${(0, index_1.similarity)('worst', 'wisdom').toFixed(3)}`);
}
main();
