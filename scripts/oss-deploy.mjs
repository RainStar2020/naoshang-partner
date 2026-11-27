#!/usr/bin/env node
/**
 * 已停止使用：本仓库不再通过此脚本把静态站点发布到 OSS。
 *
 * 已移除的目标：
 *   - react --purge  （naoshang-front-react -> 桶 quotient1119，会清空整个桶）
 *   - h5 --purge     （naoshang-partner H5 -> 桶 brain1119，会清空整个桶）
 *   - all --purge    （原先会跑上述目标；react 移除后只剩 H5，现已一并移除）
 *   - --dir <目录> --bucket <桶名> [--purge]
 *
 * 桶 quotient1119 仅存放 H5/媒体文件（含 naoshang-img/）；
 * 桶 brain1119 也不再由此脚本发布或清空。
 * 任何旧命令都会直接退出，不会读取密钥，也不会调用 OSS。
 */
const args = process.argv.slice(2);
const which = args.find((a) => !a.startsWith('--')) || (args.includes('--dir') || args.includes('--bucket') ? 'custom' : 'all');

const messages = {
  react: '已移除 react 目标：不再把 naoshang-front-react 发布到 quotient1119，也不会清空该桶。',
  h5: '已移除 h5 目标：不再把 partner H5 发布到 brain1119，也不会清空该桶。',
  all: '已移除 all 目标：不再发布或清空 quotient1119 / brain1119。',
  custom: '已移除通用 --dir / --bucket / --purge 发布入口，避免误清空 OSS 桶。',
};

console.error(messages[which] || `已移除 OSS 发布脚本入口，不支持目标：${which}。`);
console.error('此脚本不会上传或删除任何 OSS 对象。若需发布，请改用其它方式，且不要整桶 --purge。');
process.exit(1);
