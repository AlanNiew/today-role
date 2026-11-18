#!/usr/bin/env node
/**
 * 跨平台测试入口：递归收集编译后的测试文件，再交给 Node 内置 test runner。
 * 避免 Windows cmd 不展开 glob 的问题。
 */
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const testDir = join(root, '.tmp-test', 'tests');

function collect(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      files.push(...collect(full));
    } else if (name.endsWith('.test.js')) {
      files.push(full);
    }
  }
  return files.sort();
}

const files = collect(testDir);
if (files.length === 0) {
  console.error('没有找到编译后的测试文件，请先运行 tsc -p tsconfig.test.json');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(result.status === null ? 1 : result.status);
