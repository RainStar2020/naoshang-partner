const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')

async function loadService(relative, { response, overrides = {}, extraUni = {} } = {}) {
  const context = vm.createContext({ console, uni: { getStorageSync: () => ({token:'t',user:{id:'A'}}), request: options => options.success(response), ...extraUni } })
  const cache = new Map()
  function get(file) {
    if (cache.has(file)) return cache.get(file)
    let mod
    const stub = Object.entries(overrides).find(([suffix]) => file.endsWith(suffix))?.[1]
    if (stub) mod = new vm.SyntheticModule(Object.keys(stub), function() { for (const [key,value] of Object.entries(stub)) this.setExport(key,value) }, {context})
    else if (file.endsWith('/config')) mod = new vm.SyntheticModule(['config'], function() {this.setExport('config',{useMock:false,baseURL:'https://api.example.test',timeout:1000})}, {context})
    else mod = new vm.SourceTextModule(fs.readFileSync(file+'.js','utf8'),{context,identifier:file})
    cache.set(file,mod); return mod
  }
  const root = path.resolve(__dirname,'../src/services',relative).replaceAll('\\','/')
  const mod = get(root)
  await mod.link((s,p) => get(path.resolve(path.dirname(p.identifier),s).replaceAll('\\','/')))
  await mod.evaluate()
  return mod.namespace
}

test('latest API errors retain server text and verification lock fields; 200 invalid data stays inspectable', async () => {
  const api = await loadService('api',{response:{statusCode:400,data:{error:'核销已锁定',verifyFailCount:5,verifyLocked:true}}})
  await assert.rejects(api.request('/stores/s/orders/o/verify'), error => error.message==='核销已锁定'&&error.verifyFailCount===5&&error.verifyLocked===true&&error.statusCode===400)
  const success = await loadService('api',{response:{statusCode:200,data:{valid:false,errors:['比例必须为100']}}})
  assert.equal((await success.request('/income/entries/a/allocation-quotes')).valid,false)
})

test('HTTP 200 entitlement gates surface the server message instead of malformed business data', async () => {
  const api = await loadService('api', { response: { statusCode: 200, data: {
    locked: true, entitlementState: 'never_paid', message: '请开通权益后查看', entitlement: { state: 'never_paid' }
  } } })
  await assert.rejects(api.request('/me'), error => error.message === '请开通权益后查看' && error.code === 'ENTITLEMENT_REQUIRED' && error.entitlementState === 'never_paid')
})

test('timestamp, gate, allocation and payment adapters cover newly documented branches', async () => {
  const api = await loadService('contracts/v3')
  assert.equal(api.apiTimestamp(1793000000000),1793000000000)
  assert.equal(api.apiTimestamp('2026-10-27T00:00:00Z'),Date.parse('2026-10-27T00:00:00Z'))
  assert.equal(api.apiTimestamp(null),null)
  assert.equal(api.entitlementGate({gate:{locked:true,entitlementState:'expired'}}).entitlementState,'expired')
  assert.equal(api.entitlementGate({gate:null}),null)
  assert.equal(api.allocationKind('inspect'),'inspection')
  assert.throws(()=>api.validAllocationQuote({valid:false,errors:['比例错误']}),/比例错误/)
  assert.equal(api.paymentNextStep({id:'p',status:'SUCCEEDED',payParams:{sandbox:true,invoke:{autoPay:true}}}).kind,'complete')
  assert.equal(api.paymentNextStep({id:'p',status:'CREATED',paymentMode:'sandbox',payParams:{invoke:{autoPay:true}}}).kind,'poll')
  const live=api.paymentNextStep({paymentId:'p',status:'CREATED',paymentMode:'live',payParams:{channel:'wechat',invoke:{prepayId:'x'}}})
  assert.equal(live.kind,'invoke');assert.equal(live.invoke.prepayId,'x')
})

test('upload aliases and READY statuses are validated',async()=>{
  const api=await loadService('upload-contract')
  assert.equal(api.normalizeUploadIntent({fileId:'a'}).assetId,'a')
  assert.equal(api.normalizeUploadIntent({assetId:'a'}).fileId,'a')
  assert.throws(()=>api.normalizeUploadIntent({assetId:'a',fileId:'b'}),/编号异常/)
  assert.equal(api.isUploadReady({status:'READY'}),true)
  assert.equal(api.isUploadReady({status:'ready'}),true)
  assert.equal(api.isUploadReady({status:'PENDING'}),false)
})

test('real training upload sends bytes before completions and accepts fileId-only intents',async()=>{
  const events=[]
  const api=await loadService('training-assets',{overrides:{'/api':{
    getSession:()=>({token:'t',user:{id:'A'}}),
    request:async(url)=>{
      events.push(url)
      if(url==='/assets/upload-intents')return {fileId:'ast-1',uploadUrl:'https://upload.example.test/ast-1',mode:'multipart'}
      assert.equal(url,'/assets/ast-1/completions')
      return {status:'READY',previewUrl:'https://cdn.example.test/file.pdf'}
    }
  }},extraUni:{uploadFile:options=>{events.push('file-bytes');options.success({statusCode:200})}}})
  const result=await api.uploadTrainingAsset({path:'file.pdf',name:'file.pdf',size:20},'file')
  assert.deepEqual(events,['/assets/upload-intents','file-bytes','/assets/ast-1/completions'])
  assert.equal(result.assetId,'ast-1')
})

test('agency application sends documented options, quote, consent and ready asset fields', async () => {
  const calls=[]
  const api=await loadService('agency-application',{overrides:{'/api':{
    getSession:()=>({token:'t',user:{id:'A'}}),
    request:async(path,options={})=>{calls.push({path,...options});if(path.startsWith('/promotion/'))return {agencyType:'STORE',promotionCode:'promo-A'};if(path.endsWith('options'))return {agencyTypeLabel:'单店代理',feeBreakdown:{total:80000}};if(path.endsWith('quotes'))return {id:'q1'};return {id:'a1'}}
  }}})
  const options=await api.getAgencyApplicationOptions('STORE','invite')
  assert.equal(options.payableAmount,8000000)
  await assert.rejects(api.submitAgencyApplication(options,{},'key'),/协议/)
  await api.submitAgencyApplication(options,{agreementAccepted:true,storefrontAssetId:'asset1',regionCodes:['1','2','3']},'key')
  const submit=calls.at(-1)
  assert.equal(submit.path,'/agency/applications')
  assert.equal(submit.data.quoteId,'q1')
  assert.equal(submit.data.regionCode,'3')
  assert.deepEqual(JSON.parse(JSON.stringify(submit.data.uploads)),[{key:'storefrontPhoto',fileId:'asset1'}])
  assert.equal(submit.data.agreements[0].accepted,true)
})

test('v2 envelopes preserve null, string error codes, field errors and trace IDs', async () => {
  for (const response of [null, { list: [], total: 0 }]) {
    const api = await loadService('api', { response: { statusCode: 200, data: { status: 1, response } } })
    assert.equal(JSON.stringify(await api.request('/me')), JSON.stringify(response))
  }
  for (const statusCode of [200, 403, 422]) {
    const api = await loadService('api', { response: { statusCode, header: { 'X-Trace-Id': 'trace-test' }, data: {
      status: 0, response: null, code: 'VALIDATION_ERROR', message: 'invalid', errors: [{ field: 'pageSize', message: 'large' }]
    } } })
    await assert.rejects(api.request('/me'), error => error.code === 'VALIDATION_ERROR' && error.traceId === 'trace-test' && error.fieldErrors[0].field === 'pageSize')
  }
  const legacy = await loadService('api', { response: { statusCode: 200, data: { code: 0, data: { id: '001' } } } })
  assert.equal((await legacy.request('/me')).id, '001')
})
