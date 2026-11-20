#!/usr/bin/env node
/**
 * OSS 静态产物同步脚本（零依赖，Node 内置模块）
 * 用法：
 *   node scripts/oss-deploy.mjs h5 --purge       # partner 的 H5 -> brain1119，先清空桶
 *   node scripts/oss-deploy.mjs react --purge    # naoshang-front-react 的 web -> quotient1119，先清空桶
 *   node scripts/oss-deploy.mjs all --purge      # 两个都同步
 *   node scripts/oss-deploy.mjs --dir <本地目录> --bucket <桶名> [--purge]
 * 凭证：环境变量 OSS_AK / OSS_SK
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const REGION = 'oss-cn-beijing.aliyuncs.com';
const CONCURRENCY = 6;

const TARGETS = {
  // 小程序桶：放 naoshang-partner 的 H5 版本
  h5: { dir: 'dist/build/h5', bucket: 'brain1119' },
  // web 站桶：放 naoshang-front-react 的 web 版本
  react: { dir: 'E:/project/react-web/naoshang-front-react/dist', bucket: 'quotient1119' },
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.bmp': 'image/bmp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
  '.wasm': 'application/wasm',
};

function buildSig(sk, verb, resource, date, contentType = '', contentMd5 = '', headers = {}) {
  const ossHeaders = Object.keys(headers)
    .filter(k => k.toLowerCase().startsWith('x-oss-')).sort()
    .map(k => `${k.toLowerCase()}:${String(headers[k]).trim()}\n`).join('');
  const sts = `${verb}\n${contentMd5}\n${contentType}\n${date}\n${ossHeaders}${resource}`;
  return crypto.createHmac('sha1', sk).update(sts).digest('base64');
}

function httpsRequest({ method, host, reqPath, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = https.request({ method, host, path: reqPath, headers }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

async function listAllKeys(ak, sk, bucket) {
  const keys = [];
  let marker = '';
  do {
    const date = new Date().toUTCString();
    const qp = `/?max-keys=1000${marker ? `&marker=${encodeURIComponent(marker)}` : ''}`;
    const auth = buildSig(sk, 'GET', `/${bucket}/`, date);
    const r = await httpsRequest({ method: 'GET', host: `${bucket}.${REGION}`, reqPath: qp, headers: { Date: date, Authorization: `OSS ${ak}:${auth}` } });
    const xml = r.body.toString();
    const batch = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map(m => m[1]);
    keys.push(...batch);
    const nm = xml.match(/<NextMarker>([^<]+)<\/NextMarker>/);
    marker = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? (nm ? nm[1] : batch[batch.length - 1]) : '';
    if (!batch.length) break;
  } while (marker);
  return keys;
}

async function batchDelete(ak, sk, bucket, keys) {
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>\n<Delete><Quiet>true</Quiet>${chunk.map(k => `<Object><Key>${k}</Key></Object>`).join('')}</Delete>`;
    const body = Buffer.from(xmlBody);
    const md5 = crypto.createHash('md5').update(body).digest('base64');
    const date = new Date().toUTCString();
    const auth = buildSig(sk, 'POST', `/${bucket}/?delete`, date, 'application/xml', md5);
    const r = await httpsRequest({
      method: 'POST', host: `${bucket}.${REGION}`, reqPath: '/?delete',
      headers: { Date: date, 'Content-Type': 'application/xml', 'Content-MD5': md5, 'Content-Length': body.length, Authorization: `OSS ${ak}:${auth}` },
      body,
    });
    if (r.status !== 200) throw new Error(`批量删除失败 HTTP ${r.statusCode} ${r.body.toString().slice(0, 300)}`);
  }
}

async function putObject(ak, sk, bucket, key, body) {
  const contentType = MIME[path.extname(key).toLowerCase()] || 'application/octet-stream';
  const cacheControl = key === 'index.html' ? 'no-cache'
    : key.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
  const md5 = crypto.createHash('md5').update(body).digest('base64');
  const localEtag = crypto.createHash('md5').update(body).digest('hex');
  const date = new Date().toUTCString();
  const auth = buildSig(sk, 'PUT', `/${bucket}/${key}`, date, contentType, md5);
  const r = await httpsRequest({
    method: 'PUT', host: `${bucket}.${REGION}`,
    reqPath: `/${key.split('/').map(encodeURIComponent).join('/')}`,
    headers: { Date: date, 'Content-Type': contentType, 'Content-MD5': md5, 'Content-Length': body.length, 'Cache-Control': cacheControl, Authorization: `OSS ${ak}:${auth}` },
    body,
  });
  if (r.status !== 200) throw new Error(`HTTP ${r.status} ${r.body.toString().slice(0, 200)}`);
  const etag = (r.headers.etag || '').replace(/"/g, '').toLowerCase();
  if (etag !== localEtag) throw new Error(`ETag 校验失败 local=${localEtag} remote=${etag}`);
}

async function runPool(items, worker) {
  let idx = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (idx < items.length) { const cur = idx++; await worker(items[cur], cur); }
  }));
}

async function sync(ak, sk, { dir, bucket, purge }) {
  const root = path.resolve(dir);
  if (!fs.existsSync(root)) throw new Error(`本地产物目录不存在: ${root}`);
  const files = walk(root);
  console.log(`\n=== 同步 -> 桶 ${bucket}，本地 ${files.length} 个文件 (${root})，purge=${purge} ===`);

  if (purge) {
    const existing = await listAllKeys(ak, sk, bucket);
    console.log(`  桶内现有 ${existing.length} 个对象，执行清空...`);
    if (existing.length) await batchDelete(ak, sk, bucket, existing);
    console.log('  清空完成。');
  }

  let ok = 0, failed = 0, bytes = 0;
  const failures = [];
  await runPool(files, async (file) => {
    const key = path.relative(root, file).split(path.sep).join('/');
    const body = fs.readFileSync(file);
    let lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try { await putObject(ak, sk, bucket, key, body); ok++; bytes += body.length; lastErr = null; break; }
      catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 800 * attempt)); }
    }
    if (lastErr) { failed++; failures.push({ key, error: lastErr.message }); }
    process.stdout.write(`\r  上传进度 ${ok + failed}/${files.length}`);
  });
  console.log(`\n  成功 ${ok} / 失败 ${failed} / ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  failures.forEach(f => console.log(`  失败: ${f.key} -> ${f.error}`));
  if (failed) process.exitCode = 1;
}

// 参数解析
const args = process.argv.slice(2);
const flags = { purge: args.includes('--purge') };
const opt = n => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };
const ak = process.env.OSS_AK, sk = process.env.OSS_SK;
if (!ak || !sk) { console.error('缺少环境变量 OSS_AK / OSS_SK'); process.exit(1); }

const dir = opt('dir'), bucket = opt('bucket');
if (dir && bucket) {
  await sync(ak, sk, { dir, bucket, purge: flags.purge });
} else {
  const which = args.find(a => !a.startsWith('--')) || 'all';
  const list = which === 'all' ? Object.keys(TARGETS) : [which];
  if (list.some(x => !TARGETS[x])) { console.error('未知目标，可选: h5 / react / all'); process.exit(1); }
  for (const n of list) await sync(ak, sk, { ...TARGETS[n], purge: flags.purge });
}
console.log('\n同步流程结束。');
