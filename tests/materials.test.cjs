const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
async function setup(useMock = true, request = () => { throw new Error('Unexpected network') }, extraUni = {}) {
  const session = { token: 'demo', user: { id: 'A', name: '演示用户' } }
  const context = vm.createContext({ console, uni: extraUni }), cache = new Map()
  async function load(file) {
    if(cache.has(file)) return cache.get(file)
    let module
    if(file.endsWith('/config')) module = new vm.SyntheticModule(['config'], function(){ this.setExport('config',{useMock}) }, {context})
    else if(file.endsWith('/api')) module = new vm.SyntheticModule(['request','getSession'], function(){ this.setExport('request',request);this.setExport('getSession',()=>session) }, {context})
    else module = new vm.SourceTextModule(fs.readFileSync(file+'.js','utf8'),{context,identifier:file})
    cache.set(file,module)
    await module.link((specifier,parent)=>load(path.resolve(path.dirname(parent.identifier),specifier).replaceAll('\\','/')))
    return module
  }
  const root=path.resolve(__dirname,'../src/services').replaceAll('\\','/')
  const material=await load(root+'/materials');await material.evaluate()
  const partner=await load(root+'/partner');await partner.evaluate()
  return { material:material.namespace, partner:partner.namespace, session }
}
test('customer-managed benefits and material templates stay empty in mock mode',async()=>{
  const { material,partner }=await setup()
  const overview=await partner.getPartnerOverview()
  assert.equal(overview.levelName,'普通用户')
  assert.ok(overview.benefits.every(item=>item.content.nodes.length===0))
  for(const type of ['image','article','video']) {
    assert.equal((await material.getMaterialCategories(type)).length,0)
    const rows=await material.getMaterials(type)
    assert.equal(rows.items.length,0);assert.equal(rows.hasMore,false)
  }
  await assert.rejects(material.getMaterial('invented-template'),/不存在/)
  assert.throws(()=>material.getMaterials('unknown'),/类型/)
})
test('published material rich text and operation capabilities are preserved while unsafe media is rejected',async()=>{
  const {material}=await setup(false,async()=>({id:'m1',title:'客户素材',type:'article',allowedOperations:['copy-link'],mediaUrl:'javascript:bad()',shareUrl:'https://example.com/material/m1',content:{version:1,format:'nodes',nodes:[{name:'p',children:[{type:'text',text:'客户上传文字'}]}]}}))
  const row=await material.getMaterial('m1')
  assert.equal(row.mediaUrl,'');assert.equal(row.content.nodes[0].children[0].text,'客户上传文字')
  assert.equal(row.allowedOperations[0],'copy-link')
})
test('real API errors and invalid pagination are reported rather than converted to empty success',async()=>{
  const {material}=await setup(false,async()=>{throw new Error('service unavailable')})
  await assert.rejects(material.getMaterials('image'),/service unavailable/)
  const malformed=await setup(false,async()=>({items:[],hasMore:true,nextCursor:null}))
  await assert.rejects(malformed.material.getMaterials('image'),/格式异常/)
})
test('late material responses are not returned after an account switch',async()=>{
  let finish
  const pending=new Promise(resolve=>{finish=resolve})
  const {material,session}=await setup(false,()=>pending)
  const result=material.getMaterials('image')
  session.user.id='B';finish({items:[],hasMore:false,nextCursor:null})
  await assert.rejects(result,/账号已变化/)
})
test('render request retains caller idempotency key and handles job statuses explicitly',async()=>{
  const calls=[]
  const {material}=await setup(false,async(url,options)=>{calls.push({url,options});return url.includes('/renders')?{jobId:'job1'}:{status:'succeeded',downloadUrl:'https://example.com/result.png',shareUrl:'javascript:bad()'}})
  await material.renderMaterial('id/1',{qrAssetId:'qr1',idempotencyKey:'same-attempt'})
  assert.equal(calls[0].url,'/materials/id%2F1/renders')
  assert.equal(calls[0].options.data.idempotencyKey,'same-attempt')
  const result=await material.getMaterialJob('job1')
  assert.equal(result.downloadUrl,'https://example.com/result.png');assert.equal(result.shareUrl,'')
  const unknown=await setup(false,async()=>({status:'unknown'}))
  await assert.rejects(unknown.material.getMaterialJob('job1'),/状态异常/)
  const missing=await setup(false,async()=>({status:'succeeded'}))
  await assert.rejects(missing.material.getMaterialJob('job1'),/缺少/)
})
test('unsupported QR upload mode cannot submit a local file to a guessed endpoint',async()=>{
  let uploads=0,completes=0
  const {material}=await setup(false,async(url)=>{
    if(url.includes('/complete'))completes++
    return {assetId:'qr1',uploadUrl:'https://example.com/upload',mode:'put'}
  },{getImageInfo:options=>options.success({type:'png'}),uploadFile:()=>uploads++})
  await assert.rejects(material.uploadMaterialQr({path:'local-test.png',size:500}),/上传方式/)
  assert.equal(uploads,0);assert.equal(completes,0)
})
