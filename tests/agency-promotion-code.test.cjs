const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')

const CODE='A7K3M9P2Q'

async function loadModule(relative, {useMock=true, remote=()=>{throw new Error('Unexpected network')}, session={token:'demo',user:{id:'A',name:'测试家长',inviteCode:'PC96FN'}}, storage=new Map()}={}){
  const context=vm.createContext({console,uni:{getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,value),removeStorageSync:key=>storage.delete(key)}})
  const cache=new Map()
  async function load(file){
    if(cache.has(file))return cache.get(file)
    let module
    if(file==='china-area-data')module=new vm.SyntheticModule(['default'],function(){this.setExport('default',{'86':{}})},{context})
    else if(file.endsWith('/config'))module=new vm.SyntheticModule(['config'],function(){this.setExport('config',{useMock,previewAllExclusiveFeatures:true})},{context})
    else if(file.endsWith('/api'))module=new vm.SyntheticModule(['getSession','request','getCachedMyInviteCode'],function(){this.setExport('getSession',()=>session);this.setExport('request',remote);this.setExport('getCachedMyInviteCode',()=>session.user?.inviteCode?{inviteCode:session.user.inviteCode}:null)},{context})
    else module=new vm.SourceTextModule(fs.readFileSync(file+'.js','utf8'),{context,identifier:file})
    cache.set(file,module);return module
  }
  const rootDir=path.resolve(__dirname,'../src').replaceAll('\\','/')
  function resolve(specifier,parent){
    if(specifier==='china-area-data')return load('china-area-data')
    return load(path.resolve(path.dirname(parent.identifier),specifier).replaceAll('\\','/'))
  }
  async function get(rel){
    const file=rootDir+'/'+rel
    const module=await load(file)
    if(module.status==='unlinked')await module.link(resolve)
    if(module.status!=='evaluated')await module.evaluate()
    return module.namespace
  }
  return {session, storage, codes:await get('services/agency-promotion-code'), me:await get('services/me-context'), exclusive:await get('services/exclusive'), application:await get('services/agency-application'), loginReturn:await get('services/login-return'), link:await get('services/agency-promotion-link')}
}

test('agency promotion helpers accept only A + 8 uppercase codes and reject retired formats',async()=>{
  const {codes}=await loadModule('services/agency-promotion-code')
  assert.equal(codes.normalizeAgencyPromotionCode(' a7k3m9p2q '),CODE)
  assert.equal(codes.normalizeAgencyPromotionCode('PC96FN'),'')
  assert.equal(codes.assertUsableAgencyPromotionCode('a7k3m9p2q'),CODE)
  assert.equal(codes.isRetiredAgencyPromotionCode('PC96FN'),true)
  assert.equal(codes.isRetiredAgencyPromotionCode('local-A-store'),true)
  assert.equal(codes.isRetiredAgencyPromotionCode('local-A-province'),true)
  assert.equal(codes.isRetiredAgencyPromotionCode('promo-A'),true)
  assert.equal(codes.isRetiredAgencyPromotionCode(CODE),false)
  await assert.rejects(()=>Promise.resolve().then(()=>codes.assertUsableAgencyPromotionCode('PC96FN')),/已失效/)
  await assert.rejects(()=>Promise.resolve().then(()=>codes.assertUsableAgencyPromotionCode('local-12-city')),/已失效/)
  await assert.rejects(()=>Promise.resolve().then(()=>codes.assertUsableAgencyPromotionCode('promo-99')),/已失效/)
  await assert.rejects(()=>Promise.resolve().then(()=>codes.assertUsableAgencyPromotionCode('')),/暂无代理推广码|请使用有效/)
})

test('GET /me normalizes top-level and identity.agencyPromotionCode to the same value',async()=>{
  const {codes}=await loadModule('services/agency-promotion-code')
  const fromTop=codes.withNormalizedAgencyPromotionCode({agencyPromotionCode:'a7k3m9p2q',identity:{isPartner:true}})
  assert.equal(fromTop.agencyPromotionCode,CODE)
  assert.equal(fromTop.identity.agencyPromotionCode,CODE)
  assert.equal(fromTop.identity.isPartner,true)
  const fromIdentity=codes.withNormalizedAgencyPromotionCode({identity:{agencyPromotionCode:'A7K3M9P2Q'}})
  assert.equal(fromIdentity.agencyPromotionCode,CODE)
  assert.equal(fromIdentity.identity.agencyPromotionCode,CODE)
  const none=codes.withNormalizedAgencyPromotionCode({agencyPromotionCode:null,identity:{agencyPromotionCode:null},profile:{inviteCode:'PC96FN'}})
  assert.equal(none.agencyPromotionCode,null)
  assert.equal(none.identity.agencyPromotionCode,null)
  assert.equal(none.profile.inviteCode,'PC96FN')
})

test('loadMeContext mirrors agencyPromotionCode from /me and keeps personal invite codes separate',async()=>{
  const remote=async url=>{
    assert.equal(url,'/me')
    return {profile:{id:'A',nickname:'测试',inviteCode:'PC96FN'},identity:{agencyPromotionCode:'a7k3m9p2q'},exclusiveAccess:{accountId:'A',contextId:'partner:A',capabilities:['agency-code:read']}}
  }
  const {me}=await loadModule('services/me-context',{useMock:false,remote})
  const payload=await me.loadMeContext()
  assert.equal(payload.agencyPromotionCode,CODE)
  assert.equal(payload.identity.agencyPromotionCode,CODE)
  assert.equal(payload.profile.inviteCode,'PC96FN')
  const missingRemote=async()=>({profile:{id:'A',nickname:'测试'},agencyPromotionCode:null,identity:{agencyPromotionCode:null}})
  const none=await loadModule('services/me-context',{useMock:false,remote:missingRemote})
  const empty=await none.me.loadMeContext()
  assert.equal(empty.agencyPromotionCode,null)
  assert.equal(empty.identity.agencyPromotionCode,null)
})

test('agency QR is built from /me agencyPromotionCode and never from retired or personal codes',async()=>{
  const calls=[]
  const remote=async url=>{
    calls.push(url)
    if(url==='/me')return {profile:{id:'A',nickname:'测试',inviteCode:'PC96FN'},agencyPromotionCode:CODE,identity:{agencyPromotionCode:CODE},exclusiveAccess:{accountId:'A',contextId:'partner:A',capabilities:['agency-code:read']}}
    throw new Error('unexpected '+url)
  }
  const {exclusive}=await loadModule('services/exclusive',{useMock:false,remote,session:{token:'demo',user:{id:'A',name:'测试',inviteCode:'PC96FN'}}})
  const result=await exclusive.getAgencyPromotion('STORE')
  assert.equal(result.promotionId,CODE)
  assert.equal(result.agencyPromotionCode,CODE)
  assert.ok(result.localPayload.includes('promotionId='+CODE))
  assert.ok(result.localPayload.includes('/pages/application/agency'))
  assert.ok(result.localPayload.includes('agencyType=STORE'))
  assert.equal(result.shareUrl,result.localPayload)
  assert.equal(result.qrUrl,'')
  assert.deepEqual(calls,['/me'])
  await exclusive.getAgencyPromotion('CITY')
  assert.deepEqual(calls,['/me'])
})

test('missing agencyPromotionCode does not fall back to personal, local- or promo- codes',async()=>{
  const remote=async url=>{
    if(url==='/me')return {profile:{id:'A',nickname:'测试',inviteCode:'PC96FN'},agencyPromotionCode:null,identity:{agencyPromotionCode:null},exclusiveAccess:{accountId:'A',contextId:'partner:A',capabilities:['agency-code:read']}}
    throw new Error('unexpected '+url)
  }
  const {exclusive,session}=await loadModule('services/exclusive',{useMock:false,remote,session:{token:'demo',user:{id:'A',name:'测试',inviteCode:'PC96FN'}}})
  session.user.promoHint='promo-A'
  await assert.rejects(exclusive.getAgencyPromotion('STORE'),/暂无代理推广码/)
})

test('agency application options and submit reject retired codes and send the A-prefixed code',async()=>{
  const calls=[]
  const remote=async(url,options={})=>{
    calls.push({url,options})
    if(url==='/api/hq/region-agents/check')return {available:true,regionType:'province',regionCode:'410000'}
    if(url==='/agency/application-options')return {agencyType:'PROVINCE',payableAmount:2600000}
    if(url==='/agency/applications')return {application:{id:'app-1'}}
    throw new Error('unexpected '+url)
  }
  const {application}=await loadModule('services/agency-application',{useMock:false,remote})
  await assert.rejects(application.getAgencyApplicationOptions('PROVINCE','PC96FN'),/已失效/)
  await assert.rejects(application.getAgencyApplicationOptions('STORE','local-A-store'),/已失效/)
  await assert.rejects(application.getAgencyApplicationOptions('CITY','promo-A'),/已失效/)
  const options=await application.getAgencyApplicationOptions('PROVINCE',CODE)
  assert.equal(options.promotionId,CODE)
  assert.equal(options.promotionCode,CODE)
  await assert.rejects(application.submitAgencyApplication(options,{agreementAccepted:true,promotionCode:'PC96FN',name:'测试',phone:'13800138000',regionNames:['河南省'],regionCodes:['410000']},'k1'),/已失效/)
  await assert.rejects(application.submitAgencyApplication({...options,promotionId:'local-A-province',promotionCode:'local-A-province'},{agreementAccepted:true,name:'测试',phone:'13800138000',regionNames:['河南省'],regionCodes:['410000']},'k2'),/已失效/)
  const submitted=await application.submitAgencyApplication(options,{agreementAccepted:true,promotionCode:CODE,name:'测试',phone:'13800138000',regionNames:['河南省'],regionCodes:['410000']},'k3')
  assert.equal(submitted.application.id,'app-1')
  const post=calls.find(item=>item.url==='/agency/applications')
  assert.equal(post.options.method,'POST')
  assert.equal(post.options.data.promotionCode,CODE)
  assert.equal(post.options.data.promotionId,CODE)
  assert.equal(post.options.data.name,'测试')
  assert.equal(Object.prototype.hasOwnProperty.call(post.options.data,'storeName'),false)
})

test('login return and QR links ignore retired agency codes',async()=>{
  const {loginReturn,link,storage}=await loadModule('services/login-return')
  loginReturn.rememberAgencyReturn({promotionId:'PC96FN',agencyType:'STORE'})
  assert.equal(storage.size,0)
  loginReturn.rememberAgencyReturn({promotionId:'local-A-store',agencyType:'STORE'})
  assert.equal(storage.size,0)
  loginReturn.rememberAgencyReturn({promotionId:CODE,agencyType:'STORE'})
  assert.ok(loginReturn.consumeLoginReturn().includes('promotionId='+CODE))
  assert.ok(link.buildAgencyApplicationUrl(CODE,'CITY').includes('promotionId='+CODE))
  assert.equal(link.buildAgencyApplicationUrl('PC96FN','STORE'),'')
  assert.equal(link.buildAgencyApplicationUrl('promo-A','STORE'),'')
})
