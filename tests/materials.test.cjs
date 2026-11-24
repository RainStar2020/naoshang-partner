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
    else if(file.endsWith('/api')) module = new vm.SyntheticModule(['request','getSession','logout'], function(){ this.setExport('request',request);this.setExport('getSession',()=>session);this.setExport('logout',()=>{}) }, {context})
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
    assert.ok((await material.getMaterialCategories(type)).length>=1)
    const rows=await material.getMaterials(type)
    assert.ok(rows.items.length>=1);assert.equal(rows.hasMore,false)
    assert.ok(rows.items.every(item=>item.type===type && item.coverUrl.startsWith('/static/')))
    const detail=await material.getMaterial(rows.items[0].id)
    assert.equal(detail.content.nodes.length,0)
  }
  await assert.rejects(material.getMaterial('invented-template'),/不存在/)
  assert.throws(()=>material.getMaterials('unknown'),/类型/)
})
test('published material rich text and operation capabilities are preserved while unsafe media is rejected',async()=>{
  const {material}=await setup(false,async()=>({id:'m1',title:'客户素材',type:'article',allowedOperations:['copy-link'],mediaUrl:'javascript:bad()',shareUrl:'https://example.com/material/m1',content:{version:1,format:'nodes',nodes:[{name:'p',children:[{type:'text',text:'客户上传文字'}]}]}}))
  const row=await material.getMaterial('m1')
  assert.equal(row.mediaUrl,'');assert.equal(row.content.nodes[0].children[0].text,'客户上传文字')
  assert.equal(row.allowedOperations[0],'copy-link')
  assert.equal(row.shareUrl,'https://example.com/material/m1')
})
test('share urls stay as invite links and string article content does not break detail loading',async()=>{
  const {material}=await setup(false,async()=>({id:'m2',title:'公告',type:'article',allowedOperations:['upload-qr','copy-link'],shareUrl:'https://h5.naoshang.example.com/#/pages/register/index?inviteCode=ABC',content:'<p>公告正文</p>',qrSlotAtEnd:true,h5RouteReady:false}))
  const row=await material.getMaterial('m2')
  assert.equal(row.shareUrl,'https://h5.naoshang.example.com/#/pages/register/index?inviteCode=ABC')
  assert.equal(row.content.format,'html')
  assert.equal(row.content.html,'<p>公告正文</p>')
  assert.equal(row.content.nodes.length,0)
  assert.equal(row.qrSlotAtEnd,true)
  assert.equal(row.h5RouteReady,false)
})
test('image compose helpers report missing qrRegion, jpeg bases, and official categories',async()=>{
  const {material}=await setup(false,async()=>({id:'unused',title:'x',type:'image',allowedOperations:['upload-qr']}))
  assert.equal(material.describeComposeBlocker({type:'image',allowedOperations:['upload-qr','copy-link']}),'该素材暂不支持合图保存')
  assert.equal(material.describeComposeBlocker({type:'image',allowedOperations:['upload-qr','render','download']}),'该素材未配置二维码区域，暂时无法保存合图')
  assert.equal(material.describeComposeBlocker({type:'image',allowedOperations:['upload-qr','render','download'],qrRegion:{x:10,y:10,width:80,height:80},mediaUrl:'https://cdn.example.com/poster.jpg'}),'该海报底图为 JPG，当前服务端暂不支持合图，请使用 PNG 模板')
  const region=material.readQrRegion({qrRegion:{x:10,y:20,width:80,height:90}})
  assert.equal(region.x,10);assert.equal(region.y,20);assert.equal(region.width,80);assert.equal(region.height,90)
  assert.ok(material.categoriesForType('image').some(item=>item.id==='img-poster'))
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
test('QR upload does not send a local file to a guessed endpoint when the API is unavailable',async()=>{
  let uploads=0,completes=0
  const {material}=await setup(false,async(url)=>{
    if(url.includes('/complete'))completes++
    return {assetId:'qr1',uploadUrl:'https://example.com/upload',mode:'put'}
  },{getImageInfo:options=>options.success({type:'png'}),uploadFile:()=>uploads++})
  await assert.rejects(material.uploadMaterialQr({path:'local-test.png',size:500}),/服务暂不可用|上传方式/)
  assert.equal(uploads,0);assert.equal(completes,0)
})

test('partner API asset paths with file extensions and type/text article nodes stay usable',async()=>{
  const {material}=await setup(false,async(url)=>{
    if(url==='/materials') return {items:[{id:'pm_5013',title:'联调测试-宣传海报',type:'image',categoryId:'img-poster',coverUrl:'/assets/ast_c3a53ad118aa.png/file'}],hasMore:false,nextCursor:null}
    return {id:'pm_5017',title:'联调测试-平台公告',type:'article',allowedOperations:['upload-qr','copy-link'],shareUrl:'https://h5.naoshang.example.com/#/pages/register/index?inviteCode=ABC',mediaUrl:'https://cdn.example.com/art-notice-media.png',content:{version:1,format:'nodes',nodes:[{type:'p',text:'联调测试-平台公告'}]},qrSlotAtEnd:true,h5RouteReady:false}
  })
  const rows=await material.getMaterials('image')
  assert.equal(rows.items[0].coverUrl,'/assets/ast_c3a53ad118aa.png/file')
  const detail=await material.getMaterial('pm_5017')
  assert.equal(detail.content.format,'nodes')
  assert.equal(detail.content.nodes[0].name,'p')
  assert.equal(detail.content.nodes[0].children[0].text,'联调测试-平台公告')
  assert.equal(detail.shareUrl,'https://h5.naoshang.example.com/#/pages/register/index?inviteCode=ABC')
  assert.equal(detail.h5RouteReady,false)
  assert.ok(material.categoriesForType('image').every(item=>['img-poster','img-qr'].includes(item.id)))
  assert.deepEqual(material.categoriesForType('article').map(item=>item.id),['art-notice','art-course'])
  assert.deepEqual(material.categoriesForType('video').map(item=>item.id),['vid-intro','vid-course'])
})
test('job download urls under /assets/*.png/file are treated as success media, not missing results',async()=>{
  const {material}=await setup(false,async()=>({status:'succeeded',downloadUrl:'/assets/ast_result.png/file',shareUrl:'https://h5.naoshang.example.com/#/pages/register/index?inviteCode=ABC'}))
  const result=await material.getMaterialJob('job1')
  assert.equal(result.downloadUrl,'/assets/ast_result.png/file')
  assert.equal(result.shareUrl,'https://h5.naoshang.example.com/#/pages/register/index?inviteCode=ABC')
})
