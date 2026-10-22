const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
async function setup(useMock = true, request = () => { throw new Error('Unexpected network') }) {
  let session = { token: 'demo', user: { id: 'A', name: '演示用户' } }
  const context = vm.createContext({ console, uni: { setStorageSync: (_,value) => { session = value } } }), cache = new Map()
  async function load(file) {
    if(cache.has(file)) return cache.get(file)
    let module
    if(file.endsWith('/config')) module = new vm.SyntheticModule(['config'], function(){this.setExport('config',{useMock})},{context})
    else if(file.endsWith('/api')) module = new vm.SyntheticModule(['request','getSession'], function(){this.setExport('request',request);this.setExport('getSession',()=>session)},{context})
    else module = new vm.SourceTextModule(fs.readFileSync(file+'.js','utf8'),{context,identifier:file})
    cache.set(file,module); await module.link((specifier,parent)=>load(path.resolve(path.dirname(parent.identifier),specifier).replaceAll('\\','/'))); return module
  }
  const module = await load(path.resolve(__dirname,'../src/services/profile').replaceAll('\\','/'));await module.evaluate()
  return { api:module.namespace, switchAccount:id=>{session={token:'demo',user:{id,name:id}}}, current:()=>session }
}
const address = {recipient:'测试收件人',phone:'13800000000',regionCodes:['110000','110100','110101'],regionNames:['北京市','市辖区','东城区'],detail:'测试地址',isDefault:false}
test('profile validation, avatar ownership and optimistic version protect local edits',async()=>{
  const {api,current}=await setup(); const first=(await api.getMyProfile()).profile
  await assert.rejects(api.updateMyProfile({nickname:' ',version:first.version}),/昵称/)
  await assert.rejects(api.updateMyProfile({nickname:'测试',version:first.version,avatarAssetId:'missing'}),/头像/)
  const asset=await api.uploadProfileImage({path:'local.png',size:10},'avatar')
  const saved=await api.updateMyProfile({nickname:'测试昵称',version:first.version,avatarAssetId:asset.assetId})
  assert.equal(saved.profile.avatarUrl,'local.png');assert.equal(current().user.name,'测试昵称')
  await assert.rejects(api.updateMyProfile({nickname:'覆盖',version:first.version}),/已更新/)
})
test('addresses validate fields, preserve one default, reject stale versions and isolate accounts',async()=>{
  const {api,switchAccount}=await setup()
  await assert.rejects(api.saveAddress('',{...address,phone:'123'}),/手机号/)
  const a=(await api.saveAddress('',{...address,isDefault:true})).address
  const b=(await api.saveAddress('',address)).address
  await api.setDefaultAddress(b.id,b.version)
  let rows=(await api.getAddresses()).items
  assert.equal(rows.filter(x=>x.isDefault).length,1);assert.equal(rows.find(x=>x.isDefault).id,b.id)
  await assert.rejects(api.saveAddress(a.id,{...address,version:a.version}),/已更新/)
  await assert.rejects(api.deleteAddress(b.id,b.version),/已更新/)
  const latest=rows.find(x=>x.id===b.id);await api.deleteAddress(latest.id,latest.version)
  assert.equal((await api.getAddresses()).items.filter(x=>x.isDefault).length,0)
  switchAccount('B');assert.equal((await api.getAddresses()).items.length,0)
  await assert.rejects(api.getAddress(a.id),/不存在/)
})
test('feedback enforces content and owned image purposes, with retry idempotency',async()=>{
  const {api}=await setup()
  const avatar=await api.uploadProfileImage({path:'avatar.png',size:10},'avatar')
  await assert.rejects(api.submitSupportFeedback({content:'反馈',imageAssetIds:[avatar.assetId],idempotencyKey:'k'}),/图片无效/)
  await assert.rejects(api.submitSupportFeedback({content:'文'.repeat(501),idempotencyKey:'k'}),/500/)
  const image=await api.uploadProfileImage({path:'feedback.png',size:10},'feedback')
  const payload={content:'测试反馈',imageAssetIds:[image.assetId],idempotencyKey:'same'}
  const a=await api.submitSupportFeedback(payload),b=await api.submitSupportFeedback(payload)
  assert.equal(a.feedbackId,b.feedbackId);assert.equal(a.mockOnly,true)
  await assert.rejects(api.submitSupportFeedback({...payload,content:'不同内容'}),/不一致/)
})
test('unpublished agreements stay empty while explicit mock coupons and orders support testing',async()=>{
  const {api}=await setup()
  assert.equal((await api.getAgreement('privacy')).content.nodes.length,0)
  assert.equal((await api.getCoupons('available')).items.length,2);for(const status of ['used','void']) assert.equal((await api.getCoupons(status)).items.length,0)
  assert.ok((await api.getMyOrders()).items.length>=5)
})
test('real API errors and malformed pagination cannot become mock success',async()=>{
  const {api}=await setup(false,async()=>{throw new Error('service unavailable')})
  await assert.rejects(api.getMyProfile(),/service unavailable/)
  await assert.rejects(api.saveAddress('',address),/service unavailable/)
  const malformed=await setup(false,async()=>({items:[],hasMore:true,nextCursor:null}))
  await assert.rejects(malformed.api.getCoupons('available'),/格式异常/)
})
test('late account responses are rejected and fulfillment filters stay explicit',async()=>{
  let finish;const pending=new Promise(resolve=>{finish=resolve})
  const {api,switchAccount}=await setup(false,()=>pending)
  const result=api.getAddresses();switchAccount('B');finish({items:[],hasMore:false,nextCursor:null})
  await assert.rejects(result,/账号已变化/)
  const calls=[];const remote=await setup(false,async(url,options)=>{calls.push(options.data);return {items:[],hasMore:false,nextCursor:null}})
  await remote.api.getMyOrders('waiting-receipt')
  assert.equal(calls[0].status,'PAID');assert.equal(calls[0].fulfillmentStatus,'SHIPPED')
})
