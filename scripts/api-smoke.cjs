// Read-only business checks through the actual frontend service layer.
// API_TEST_PHONE / API_TEST_PASSWORD are supplied at runtime, never saved.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
async function main() {
  const phone = process.env.API_TEST_PHONE, password = process.env.API_TEST_PASSWORD
  if (!phone || !password) throw new Error('Set API_TEST_PHONE and API_TEST_PASSWORD')
  const baseURL = process.env.API_TEST_URL || 'http://localhost:3000'
  const storage = new Map(), cache = new Map()
  const context = vm.createContext({ console, URL, URLSearchParams, setTimeout, clearTimeout, uni: {
    getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: key => storage.delete(key), reLaunch: () => {},
    request: async options => {
      try {
        const url = new URL(options.url), method = options.method || 'GET'
        if (method === 'GET') for (const [key, value] of Object.entries(options.data || {})) if (value != null) url.searchParams.set(key, value)
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...options.header },
          body: method === 'GET' ? undefined : JSON.stringify(options.data), signal: AbortSignal.timeout(15000) })
        options.success({ statusCode: res.status, data: await res.json() })
      } catch (error) { options.fail(error) }
    },
  } })
  function get(file) {
    if (cache.has(file)) return cache.get(file)
    const mod = file.endsWith('/config')
      ? new vm.SyntheticModule(['config'], function () { this.setExport('config', { useMock: false, baseURL, timeout: 15000 }) }, { context })
      : new vm.SourceTextModule(fs.readFileSync(file + '.js', 'utf8'), { context, identifier: file })
    cache.set(file, mod)
    return mod
  }
  async function load(name) {
    const mod = get(path.resolve(__dirname, '../src/services', name).replaceAll('\\', '/'))
    if (mod.status === 'unlinked') await mod.link((s, p) => get(path.resolve(path.dirname(p.identifier), s).replaceAll('\\', '/')))
    if (mod.status === 'linked') await mod.evaluate()
    return mod.namespace
  }
  const api = await load('api'), learning = await load('learning'), business = await load('business'), profile = await load('profile')
  const report = []
  for (const suffix of (process.env.API_TEST_SUFFIXES || phone.slice(-1)).split(',')) {
    const account = phone.slice(0, -1) + suffix, row = { account, checks: [] }
    async function check(name, fn) {
      try { const result = await fn(); row.checks.push({ name, ok: true }); return result }
      catch (error) { row.checks.push({ name, ok: false, error: error.message }); return null }
    }
    const session = await check('login', () => api.login({ channel: 'parent', phone: account, password }))
    if (session) {
      row.name = session.user.name
      await check('profile', () => profile.getMyProfile())
      const identities = await check('learning identities', () => learning.getLearningIdentities())
      for (const identity of identities || []) await check('levels: ' + identity.mode, () => learning.getLearningLevels(identity))
      await check('announcements', () => api.request('/announcements'))
      await check('products', () => api.request('/products'))
      await check('orders', () => profile.getMyOrders())
      const bootstrap = await check('bootstrap', () => api.request('/me/bootstrap'))
      row.businessContexts = bootstrap?.businessContexts
      await check('frontend business contexts', async () => {
        const rows = await business.getBusinessContexts()
        if (rows.length !== bootstrap.businessContexts.length) throw new Error('后端经营模块名称不受前端支持，身份被过滤')
        return rows
      })
    }
    report.push(row)
  }
  console.log(JSON.stringify(report, null, 2))
  if (report.some(row => row.checks.some(check => !check.ok))) process.exitCode = 1
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
