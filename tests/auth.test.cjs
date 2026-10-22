const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

async function setup() {
  let now = Date.now()
  const storage = new Map()
  const location = new URL('https://demo.local/#/pages/login/index')
  const context = vm.createContext({
    URL, URLSearchParams, console,
    Date: class extends Date { static now() { return now } },
    window: { location, history: { replaceState: (_state, _title, value) => { location.href = value } } },
    uni: {
      getStorageSync: key => storage.get(key), setStorageSync: (key, value) => storage.set(key, value), removeStorageSync: key => storage.delete(key),
      showModal: options => options.success?.({ confirm: true }),
    },
  })
  const cache = new Map()
  async function load(file) {
    if (cache.has(file)) return cache.get(file)
    let source
    if (file.endsWith('/config')) source = 'export const config = { useMock: true }'
    else if (file.endsWith('/api')) source = 'export function request() { throw new Error("Unexpected network request") }'
    else source = fs.readFileSync(file + '.js', 'utf8')
    const module = new vm.SourceTextModule(source, { context, identifier: file })
    cache.set(file, module)
    await module.link((specifier, parent) => load(path.resolve(path.dirname(parent.identifier), specifier).replaceAll('\\', '/')))
    return module
  }
  const base = path.resolve(__dirname, '../src/services').replaceAll('\\', '/')
  const auth = await load(base + '/auth')
  await auth.evaluate()
  const invitation = cache.get(base + '/invitation').namespace
  return { auth: auth.namespace, invitation, storage, location, advance: value => { now += value } }
}

test('password change validates confirmation and mock mode never claims a real credential change', async () => {
  const { auth, storage } = await setup()
  await assert.rejects(auth.changePassword('', 'New-pass1', 'New-pass1'), /原密码/)
  await assert.rejects(auth.changePassword('Old-pass1', 'New-pass1', 'Other-pass'), /一致/)
  await assert.rejects(auth.changePassword('Old-pass1', 'Old-pass1', 'Old-pass1'), /相同/)
  const result = await auth.changePassword('Old-pass1', 'New-pass1', 'New-pass1')
  assert.equal(result.mockOnly, true); assert.equal(result.changed, false)
  assert.equal([...storage.values()].some(value => JSON.stringify(value).includes('New-pass1')), false)
})

test('invitation survives navigation, scans, URL encoding and expires after seven days', async () => {
  const { invitation: inv, location, advance } = await setup()
  location.hash = '#/pages/login/index?inviteCode=LINK_123'
  assert.equal(inv.captureInvitation({}), 'LINK_123')
  location.hash = '#/pages/register/index'
  assert.equal(inv.captureInvitation({}), 'LINK_123')
  assert.equal(inv.captureInvitation({ scene: 'inviteCode%3DSCAN_456' }), 'SCAN_456')
  assert.equal(inv.captureInvitation({ q: encodeURIComponent('https://demo.local/?inviteCode=QR789') }), 'QR789')
  assert.equal(inv.captureInvitation({ inviteCode: '<script>' }), 'QR789')
  advance(7 * 86400000 + 1)
  assert.equal(inv.getInvitation(), '')
})

test('register requires issued, matching, unexpired SMS, region, and matching passwords', async () => {
  const { auth, storage, invitation } = await setup()
  const data = { phone: '13800000000', code: '123456', password: 'demo1234', confirmation: 'demo1234', region: ['北京市', '市辖区', '东城区'], regionCodes: ['110000', '110100', '110101'], inviteCode: 'INVITE123', source: 'phone' }
  await assert.rejects(auth.registerAccount(data), /先获取验证码/)
  await auth.sendSms(data.phone, 'register')
  await assert.rejects(auth.sendSms(data.phone, 'register'), /稍后/)
  await assert.rejects(auth.registerAccount({ ...data, code: '999999' }), /不正确/)
  await assert.rejects(auth.registerAccount({ ...data, confirmation: 'different' }), /不一致/)
  await assert.rejects(auth.registerAccount({ ...data, regionCodes: [] }), /所在地区/)
  invitation.captureInvitation({ inviteCode: data.inviteCode })
  const result = await auth.registerAccount(data)
  assert.equal(result.user.inviteCode, data.inviteCode)
  assert.equal(invitation.getInvitation(), '')
  assert.ok(storage.get('naoshang-session'))
  assert.equal(JSON.stringify([...storage]).includes('demo1234'), false)
  await assert.rejects(auth.registerAccount(data), /先获取验证码/)
})

test('SMS expiry, password reset proof, one time use and timeout are enforced', async () => {
  const { auth, advance } = await setup()
  const phone = '13800000000'
  await assert.rejects(auth.resetPassword('demo1234', 'demo1234'), /验证已过期/)
  await auth.sendSms(phone, 'reset-password')
  advance(5 * 60000 + 1)
  await assert.rejects(auth.verifyReset(phone, '123456'), /已过期/)
  await auth.sendSms(phone, 'reset-password')
  await auth.verifyReset(phone, '123456')
  await assert.rejects(auth.resetPassword('demo1234', 'different'), /不一致/)
  await auth.resetPassword('demo1234', 'demo1234')
  await assert.rejects(auth.resetPassword('demo1234', 'demo1234'), /验证已过期/)
  advance(60001)
  await auth.sendSms(phone, 'reset-password')
  await auth.verifyReset(phone, '123456')
  advance(5 * 60000 + 1)
  await assert.rejects(auth.resetPassword('demo1234', 'demo1234'), /验证已过期/)
})

test('WeChat registration requires a valid authorization and consumes the binding', async () => {
  const { auth, advance } = await setup()
  const data = { phone: '13800000000', code: '123456', password: 'demo1234', confirmation: 'demo1234', region: ['北京市', '市辖区', '东城区'], regionCodes: ['110000', '110100', '110101'], inviteCode: '', source: 'wechat' }
  await assert.rejects(auth.registerAccount(data), /授权已过期/)
  assert.equal(await auth.beginWechat(), true)
  assert.ok(auth.getWechatBinding())
  advance(10 * 60000 + 1)
  assert.equal(auth.getWechatBinding(), null)
  await auth.beginWechat()
  await auth.sendSms(data.phone, 'register')
  await auth.registerAccount(data)
  assert.equal(auth.getWechatBinding(), null)
})
