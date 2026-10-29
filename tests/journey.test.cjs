const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const context = vm.createContext({})
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../src/features/learning/journey.js'), 'utf8').replace('export function', 'function'), context)
const unlocked = (number, rows) => context.isJourneyLevelUnlocked({ number, tier: number === 1 ? 1 : number <= 5 ? 2 : 3 }, rows)
test('real API membership sections light every node in their journey tier', () => {
  const rows = ['fs', 'jy', 'cj', 'xn', 'ys'].map((section, index) => ({ id: `L${index + 1}`, section, unlocked: true }))
  for (let number = 1; number <= 10; number++) assert.equal(unlocked(number, rows), true)
  const secondTier = rows.map(row => ({ ...row, unlocked: row.section !== 'ys' }))
  for (let number = 1; number <= 10; number++) assert.equal(unlocked(number, secondTier), number <= 5)
})
test('fan access and locked sections do not grant journey tiers', () => {
  for (let number = 1; number <= 10; number++) {
    assert.equal(unlocked(number, [{ id: 'L1', section: 'fs', unlocked: true }]), false)
    assert.equal(unlocked(number, [{ section: 'ys', unlocked: false }]), false)
    assert.equal(unlocked(number, []), false)
  }
})
test('mock node entitlements retain their original mapping', () => {
  assert.equal(unlocked(6, [{ id: 'level-6', unlocked: true }]), true)
  assert.equal(unlocked(7, [{ id: 'level-6', unlocked: true }]), false)
})
