const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')

test('agent-benefits uses the H5 API and turns text into renderable, ordered content', async () => {
  const context = vm.createContext({})
  const source = fs.readFileSync(path.resolve(__dirname, '../src/services/agent-benefits.js'), 'utf8')
  const module = new vm.SourceTextModule(source, { context })
  const calls = []
  await module.link(async specifier => {
    if (specifier === '../config') return new vm.SyntheticModule(['config'], function () { this.setExport('config', { useMock: false }) }, { context })
    if (specifier === './api') return new vm.SyntheticModule(['request'], function () {
      this.setExport('request', async path => {
        calls.push(path)
        return { total: 5, items: [
          { agentLevel: 'store', title: '单店代理权益', content: '第一项\n第二项', version: 2 },
          { agentLevel: 'province', title: '省代权益', content: '省级内容', version: 4 },
          { agentLevel: 'city', title: '市代权益', content: '', version: 2 },
          { agentLevel: 'district', title: '区县代理权益', content: '', version: 2 },
          { agentLevel: 'costore_owner', title: '合店老板权益', content: '', version: 2 },
        ] }
      })
    }, { context })
    if (specifier === '../features/content/rich-content') return new vm.SyntheticModule(['emptyContent', 'normalizeContent'], function () {
      this.setExport('emptyContent', () => ({ version: 1, format: 'nodes', nodes: [] }))
      this.setExport('normalizeContent', value => value)
    }, { context })
    throw new Error(`Unexpected import: ${specifier}`)
  })
  await module.evaluate()
  const benefits = await module.namespace.getAgentBenefits()
  const plain = JSON.parse(JSON.stringify(benefits))
  assert.deepEqual(calls, ['/agent-benefits'])
  assert.deepEqual(plain.map(item => item.agentLevel), ['province', 'city', 'district', 'store', 'costore_owner'])
  assert.deepEqual(plain[3].content.nodes, [
    { name: 'p', children: [{ type: 'text', text: '第一项' }] },
    { name: 'p', children: [{ type: 'text', text: '第二项' }] },
  ])
})
