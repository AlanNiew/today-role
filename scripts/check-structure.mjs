#!/usr/bin/env node
/**
 * 小程序结构 + 隐私 + 文案红线检查。
 * 不依赖微信开发者工具，CI / 本地均可跑：npm run check:structure
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const miniRoot = join(root, 'miniprogram');

const errors = [];
const notes = [];

function fail(message) {
  errors.push(message);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`JSON 解析失败：${relative(root, file)}（${error.message}）`);
    return null;
  }
}

function walk(dir, extensions) {
  const result = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      result.push(...walk(full, extensions));
    } else if (extensions.some((ext) => name.endsWith(ext))) {
      result.push(full);
    }
  }
  return result;
}

const appJsonPath = join(miniRoot, 'app.json');
const appJson = existsSync(appJsonPath) ? readJson(appJsonPath) : null;
if (!appJson) {
  fail('缺少 miniprogram/app.json');
}

const pages = Array.isArray(appJson?.pages) ? appJson.pages : [];
if (pages.length === 0) {
  fail('app.json pages 为空');
}
if (new Set(pages).size !== pages.length) {
  fail('app.json pages 有重复项');
}

const requiredSuffixes = ['.ts', '.json', '.wxml', '.wxss'];
for (const page of pages) {
  for (const suffix of requiredSuffixes) {
    const file = join(miniRoot, `${page}${suffix}`);
    if (!existsSync(file)) {
      fail(`页面缺少文件：miniprogram/${page}${suffix}`);
    }
  }
  const pageJsonPath = join(miniRoot, `${page}.json`);
  if (existsSync(pageJsonPath)) {
    const pageJson = readJson(pageJsonPath);
    if (pageJson && !pageJson.navigationBarTitleText) {
      fail(`页面缺少 navigationBarTitleText：${page}.json`);
    }
  }
}

const tabBar = appJson?.tabBar;
if (!tabBar || !Array.isArray(tabBar.list) || tabBar.list.length !== 3) {
  fail('tabBar 应有 3 个入口（记录 / 角色 / 我的）');
} else {
  for (const item of tabBar.list) {
    if (!pages.includes(item.pagePath)) {
      fail(`tabBar 指向未注册页面：${item.pagePath}`);
    }
    if (!item.text) {
      fail(`tabBar 入口缺少文字：${item.pagePath}`);
    }
  }
  const expected = ['pages/index/index', 'pages/weekly/weekly', 'pages/settings/settings'];
  for (const page of expected) {
    if (!tabBar.list.some((item) => item.pagePath === page)) {
      fail(`tabBar 缺少入口：${page}`);
    }
  }
}

if (!existsSync(join(miniRoot, 'sitemap.json'))) {
  fail('缺少 miniprogram/sitemap.json');
}

// 所有 JSON 可解析
for (const file of walk(miniRoot, ['.json'])) {
  readJson(file);
}

// WXML：标签配对、表达式括号、事件处理器存在
const handlerPattern = /bind[a-z]+="([A-Za-z0-9_]+)"/g;
const wxmlFiles = walk(miniRoot, ['.wxml']);
for (const file of wxmlFiles) {
  const content = readFileSync(file, 'utf8');
  const openCount = (content.match(/\{\{/g) ?? []).length;
  const closeCount = (content.match(/\}\}/g) ?? []).length;
  if (openCount !== closeCount) {
    fail(`WXML 表达式括号不配对：${relative(root, file)}（{{ ${openCount} / }} ${closeCount}）`);
  }

  const stack = [];
  let index = 0;
  while (index < content.length) {
    const start = content.indexOf('<', index);
    if (start === -1) {
      break;
    }
    let end = start + 1;
    let quote = null;
    while (end < content.length) {
      const char = content[end];
      if (quote) {
        if (char === quote) {
          quote = null;
        }
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        break;
      }
      end += 1;
    }
    if (end >= content.length) {
      fail(`WXML 标签未闭合：${relative(root, file)}`);
      break;
    }
    const raw = content.slice(start + 1, end).trim();
    index = end + 1;
    if (raw.startsWith('!--') || raw.startsWith('!')) {
      continue;
    }
    const closing = raw.startsWith('/');
    const selfClosing = raw.endsWith('/');
    const nameMatch = /^\/?\s*([A-Za-z0-9-]+)/.exec(raw);
    if (!nameMatch) {
      continue;
    }
    const name = nameMatch[1];
    if (closing) {
      const last = stack.pop();
      if (last !== name) {
        fail(`WXML 标签不配对：${relative(root, file)}，期望 </${last ?? '?'}>，实际 </${name}>`);
      }
    } else if (!selfClosing) {
      stack.push(name);
    }
  }
  if (stack.length > 0) {
    fail(`WXML 有未闭合标签：${relative(root, file)} → ${stack.join(', ')}`);
  }

  const pageTs = file.replace(/\.wxml$/, '.ts');
  const tsContent = existsSync(pageTs) ? readFileSync(pageTs, 'utf8') : '';
  for (const match of content.matchAll(handlerPattern)) {
    const handler = match[1];
    if (!new RegExp(`\\b${handler}\\s*\\(`).test(tsContent)) {
      fail(`WXML 事件没有对应方法：${relative(root, file)} → ${handler}`);
    }
  }
}

// 源码文案 / 隐私红线
const banned = /抑郁|焦虑|诊断|治疗|人格|障碍|症|药|病|你就是|你属于/;
const networkApis = /wx\.(request|uploadFile|downloadFile|login)\s*\(/;
const sourceFiles = walk(miniRoot, ['.ts', '.wxml']);
for (const file of sourceFiles) {
  const content = readFileSync(file, 'utf8');
  const bannedMatch = banned.exec(content);
  if (bannedMatch) {
    fail(`源码出现文案红线词「${bannedMatch[0]}」：${relative(root, file)}`);
  }
  if (networkApis.test(content)) {
    fail(`源码出现网络 / 登录调用：${relative(root, file)}`);
  }
}

// 设置页必须包含隐私、导出、清空入口
const settingsWxml = join(miniRoot, 'pages/settings/settings.wxml');
if (existsSync(settingsWxml)) {
  const content = readFileSync(settingsWxml, 'utf8');
  for (const keyword of ['隐私说明', '导出 JSON', '清空全部数据']) {
    if (!content.includes(keyword)) {
      fail(`设置页缺少「${keyword}」`);
    }
  }
} else {
  fail('缺少设置页 settings.wxml');
}

// 文档
for (const file of ['README.md', 'docs/manual-test.md', 'docs/project-brief.md']) {
  if (!existsSync(join(root, file))) {
    fail(`缺少文档：${file}`);
  }
}

const projectConfig = existsSync(join(root, 'project.config.json'))
  ? readJson(join(root, 'project.config.json'))
  : null;
if (projectConfig && projectConfig.miniprogramRoot !== 'miniprogram/') {
  fail('project.config.json 的 miniprogramRoot 应为 miniprogram/');
}

notes.push(`页面数：${pages.length}`);
notes.push(`WXML 文件数：${wxmlFiles.length}`);
notes.push(`源码文件数：${sourceFiles.length}`);
notes.push(`tabBar：${tabBar?.list?.map((item) => item.text).join(' / ') ?? '缺失'}`);

if (errors.length > 0) {
  console.error('结构检查失败：');
  for (const error of errors) {
    console.error(`  ✗ ${error}`);
  }
  process.exit(1);
}

console.log('结构检查通过：');
for (const note of notes) {
  console.log(`  ✓ ${note}`);
}
console.log('  ✓ 6 个页面四件套齐全，tabBar / sitemap / JSON 可解析');
console.log('  ✓ WXML 标签与事件绑定、文案红线、隐私入口、无网络调用');
