#!/usr/bin/env node

/**
 * diff-x CLI — Command-line text diffing tool
 *
 * Usage:
 *   diff-x <file1> <file2>              Compare two files (line diff, colored)
 *   diff-x -u <file1> <file2>           Unified diff output
 *   diff-x --char <file1> <file2>       Character-level diff
 *   diff-x --word <file1> <file2>       Word-level diff
 *   diff-x --json <file1> <file2>       JSON output
 *   diff-x --stat <file1> <file2>       Diff statistics only
 *   echo -e "a\nb" | diff-x - <file2>   Read from stdin (first arg)
 *   diff-x --sim "string1" "string2"    Similarity ratio
 */

import { readFileSync } from 'node:fs';
import { diffLines, diffChars, diffWords, unifiedDiff, diffStats, similarity, colorize } from './index.js';

function readInput(arg) {
  if (arg === '-') return readFileSync('/dev/stdin', 'utf-8');
  return readFileSync(arg, 'utf-8');
}

function usage() {
  console.log(`Usage: diff-x [options] <file1> <file2>

Options:
  -u, --unified           Output unified diff (like diff -u)
  -c, --char              Character-level diff
  -w, --word              Word-level diff
  --no-color              Disable colored output
  --json                  Output as JSON
  --stat                  Show diff statistics only
  --sim                   Show similarity ratio (arguments are strings, not files)
  -h, --help              Show this help

Examples:
  diff-x old.txt new.txt
  diff-x -u old.txt new.txt
  diff-x --char old.txt new.txt
  diff-x --json old.txt new.txt
  diff-x --stat old.txt new.txt
  diff-x --sim "hello world" "hello there"`);
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  usage();
  process.exit(0);
}

const opts = {
  unified: false,
  char: false,
  word: false,
  color: true,
  json: false,
  stat: false,
  sim: false,
};

const positional = [];
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '-u':
    case '--unified': opts.unified = true; break;
    case '-c':
    case '--char': opts.char = true; break;
    case '-w':
    case '--word': opts.word = true; break;
    case '--no-color': opts.color = false; break;
    case '--json': opts.json = true; break;
    case '--stat': opts.stat = true; break;
    case '--sim': opts.sim = true; break;
    default: positional.push(args[i]);
  }
}

try {
  if (opts.sim) {
    if (positional.length < 2) {
      console.error('Error: --sim requires two string arguments');
      process.exit(1);
    }
    const sim = similarity(positional[0], positional[1]);
    if (opts.json) {
      console.log(JSON.stringify({ similarity: sim, percent: Math.round(sim * 100) }));
    } else {
      console.log(`Similarity: ${(sim * 100).toFixed(1)}%`);
    }
    process.exit(0);
  }

  if (positional.length < 2) {
    console.error('Error: need two inputs to compare');
    usage();
    process.exit(1);
  }

  const oldStr = readInput(positional[0]);
  const newStr = readInput(positional[1]);

  if (opts.stat) {
    const parts = diffLines(oldStr, newStr);
    const stats = diffStats(parts);
    if (opts.json) {
      console.log(JSON.stringify(stats));
    } else {
      console.log(`+${stats.additions} -${stats.deletions} (${stats.changePercent}% changed, ${stats.unchanged} unchanged)`);
    }
    process.exit(0);
  }

  if (opts.unified) {
    const result = unifiedDiff(oldStr, newStr);
    if (opts.json) {
      console.log(JSON.stringify({ unified: result }));
    } else {
      console.log(result || '(no changes)');
    }
    process.exit(0);
  }

  let parts;
  if (opts.char) parts = diffChars(oldStr, newStr);
  else if (opts.word) parts = diffWords(oldStr, newStr);
  else parts = diffLines(oldStr, newStr);

  if (opts.json) {
    console.log(JSON.stringify(parts, null, 2));
  } else {
    const output = colorize(parts, { color: opts.color });
    if (output.trim()) console.log(output);
    else console.log('(no changes)');
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
