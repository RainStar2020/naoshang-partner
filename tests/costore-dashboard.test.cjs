const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('choosing a costore closes the store picker after the context is selected', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../src/components/CostoreDashboard.vue'), 'utf8')
  const handler = source.match(/async function chooseContext\(id\)\{[\s\S]*?\nasync function switchModule/)?.[0] || ''
  assert.match(handler, /const selected=await selectBusinessContext\(id\);\s*storesOpen\.value=false;\s*selectedId=selected\.id/)
})
