#!/usr/bin/env node
/**
 * diff-x CLI — Diff text files and print unified diff output
 */
import { createPatch, diffStrings, diffSummary, levenshtein, similarity } from './index';
import * as fs from 'fs';

function main(): void {
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
    console.log(levenshtein(args[1] || '', args[2] || ''));
    return;
  }

  if (cmd === '--similarity') {
    const r = similarity(args[1] || '', args[2] || '');
    console.log(r.toFixed(4));
    return;
  }

  // File diff mode
  let mode = 'unified';
  let noHeaders = false;
  let context = 3;
  const files: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--inline') mode = 'inline';
    else if (args[i] === '--summary') mode = 'summary';
    else if (args[i] === '--no-headers') noHeaders = true;
    else if (args[i] === '--context') context = parseInt(args[++i]) || 3;
    else if (!args[i].startsWith('-')) files.push(args[i]);
  }

  if (files.length < 2) {
    console.error('Error: need two inputs');
    process.exit(1);
  }

  const oldStr = files[0] === '-' ? readStdin() : fs.readFileSync(files[0], 'utf-8');
  const newStr = files[1] === '-' ? readStdin() : fs.readFileSync(files[1], 'utf-8');

  if (mode === 'inline') {
    const changes = diffStrings(oldStr, newStr);
    for (const c of changes) {
      const prefix = c.type === 'added' ? '+' : c.type === 'removed' ? '-' : ' ';
      const ln = c.oldLineNumber ?? c.newLineNumber ?? '';
      console.log(`${prefix} ${ln ? String(ln).padStart(4) : '    '} | ${c.value}`);
    }
  } else if (mode === 'summary') {
    const changes = diffStrings(oldStr, newStr);
    const s = diffSummary(changes);
    console.log(`+ ${s.additions} additions`);
    console.log(`- ${s.removals} removals`);
    console.log(`  ${s.unchanged} unchanged`);
    console.log(`  ${s.changed ? 'CHANGED' : 'IDENTICAL'}`);
  } else {
    const oldName = noHeaders ? '' : (files[0] === '-' ? 'stdin' : `a/${files[0]}`);
    const newName = noHeaders ? '' : (files[1] === '-' ? 'stdin' : `b/${files[1]}`);
    const patch = createPatch(oldStr, newStr, oldName, newName, context);
    if (patch) console.log(patch);
    else console.log('Files are identical');
  }
}

function readStdin(): string {
  return fs.readFileSync(0, 'utf-8');
}

function demo(): void {
  const oldText = `The quick brown fox
jumps over the lazy dog.
It was the best of times.
It was the worst of times.`;

  const newText = `The quick brown fox
leaps over the lazy dog.
It was the best of times.
It was the age of wisdom.`;

  console.log('=== UNIFIED DIFF ===\n');
  console.log(createPatch(oldText, newText, 'old.txt', 'new.txt'));
  console.log('\n=== INLINE ===\n');

  const changes = diffStrings(oldText, newText);
  for (const c of changes) {
    const sym = c.type === 'added' ? '+' : c.type === 'removed' ? '-' : ' ';
    console.log(`${sym} ${c.value}`);
  }

  console.log('\n=== SUMMARY ===\n');
  const s = diffSummary(changes);
  console.log(`+${s.additions} -${s.removals} (${s.unchanged} unchanged)`);

  console.log('\n=== LEVENSHTEIN ===\n');
  console.log(`jumps→leaps: distance=${levenshtein('jumps', 'leaps')}, similarity=${similarity('jumps', 'leaps').toFixed(3)}`);
  console.log(`worst→wisdom: distance=${levenshtein('worst', 'wisdom')}, similarity=${similarity('worst', 'wisdom').toFixed(3)}`);
}

main();
