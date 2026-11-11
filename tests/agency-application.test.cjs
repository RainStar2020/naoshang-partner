const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')

const CODE='A7K3M9P2Q'

async function loadApplication({useMock=false, remote}={}){
  const session={token:'demo',user:{id:'A',name:'测试家长',phone:'13800138000'}}
  const storage=new Map()
  const context=vm.createContext({console,uni:{getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,value),removeStorageSync:key=>storage.delete(key)}})
  const cache=new Map()
  async function load(file){
    if(cache.has(file))return cache.get(file)
    let module
    if(file==='china-area-data')module=new vm.SyntheticModule(['default'],function(){this.setExport('default',{'86':{}})},{context})
    else if(file.endsWith('/config'))module=new vm.SyntheticModule(['config'],function(){this.setExport('config',{useMock,previewAllExclusiveFeatures:true})},{context})
    else if(file.endsWith('/api'))module=new vm.SyntheticModule(['getSession','request','getCachedMyInviteCode'],function(){this.setExport('getSession',()=>session);this.setExport('request',remote);this.setExport('getCachedMyInviteCode',()=>null)},{context})
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
  return {session,storage,application:await get('services/agency-application'),profile:await get('services/mock/profile')}
}

function storeDraft(overrides={}){
  return {
    agreementAccepted:true,
    promotionCode:CODE,
    name:'申请人姓名',
    phone:'13800138000',
    regionNames:['广西壮族自治区','柳州市','城中区'],
    regionCodes:['450000','450200','450202'],
    address:'柳州螺蛳粉脑商合作店地址',
    storeName:'柳州螺蛳粉脑商合作店',
    storefrontFileId:'sf-1',
    ...overrides,
  }
}

function provinceDraft(overrides={}){
  return {
    agreementAccepted:true,
    promotionCode:CODE,
    name:'申请人姓名',
    phone:'13800138000',
    regionNames:['河南省'],
    regionCodes:['410000'],
    address:'',
    storeName:'不应提交的门店名',
    ...overrides,
  }
}

test('store submit includes trimmed storeName and keeps name/address unchanged',async()=>{
  const calls=[]
  const remote=async(url,options={})=>{
    calls.push({url,options})
    if(url==='/api/hq/region-agents/check')return {available:true,regionType:'store',regionCode:'450202'}
    if(url==='/agency/applications')return {application:{id:'app-store'}}
    throw new Error('unexpected '+url)
  }
  const {application}=await loadApplication({remote})
  const submitted=await application.submitAgencyApplication(
    {agencyType:'STORE',promotionCode:CODE,agreement:{version:'local-agency-v1'}},
    storeDraft({storeName:'  柳州螺蛳粉脑商合作店  '}),
    'k-store'
  )
  assert.equal(submitted.application.id,'app-store')
  const post=calls.find(item=>item.url==='/agency/applications')
  assert.equal(post.options.method,'POST')
  assert.equal(post.options.data.agencyType,'store')
  assert.equal(post.options.data.storeName,'柳州螺蛳粉脑商合作店')
  assert.equal(post.options.data.name,'申请人姓名')
  assert.equal(post.options.data.address,'柳州螺蛳粉脑商合作店地址')
  assert.equal(post.options.data.storefrontFileId,'sf-1')
  assert.equal(post.options.data.phone,'13800138000')
})

test('non-store submit omits storeName even if the draft has one',async()=>{
  const posts=[]
  const remote=async(url,options={})=>{
    if(url==='/api/hq/region-agents/check')return {available:true,regionType:options?.data?.regionType,regionCode:options?.data?.regionCode}
    if(url==='/agency/applications'){
      posts.push(options.data)
      return {application:{id:'app'}}
    }
    throw new Error('unexpected '+url)
  }
  const {application}=await loadApplication({remote})
  await application.submitAgencyApplication({agencyType:'PROVINCE',promotionCode:CODE},provinceDraft(),'k-prov')
  await application.submitAgencyApplication({agencyType:'CITY',promotionCode:CODE},{
    ...provinceDraft(),
    regionNames:['河南省','郑州市'],
    regionCodes:['410000','410100'],
    cityTierId:'POP_LT_5M',
  },'k-city')
  await application.submitAgencyApplication({agencyType:'COUNTY',promotionCode:CODE},{
    ...provinceDraft(),
    regionNames:['河南省','郑州市','中原区'],
    regionCodes:['410000','410100','410102'],
  },'k-county')
  assert.equal(posts.length,3)
  assert.equal(posts[0].agencyType,'province')
  assert.equal(posts[1].agencyType,'city')
  assert.equal(posts[1].cityTierId,'POP_LT_5M')
  assert.equal(posts[2].agencyType,'district')
  for(const body of posts){
    assert.equal(Object.prototype.hasOwnProperty.call(body,'storeName'),false)
    assert.equal(body.name,'申请人姓名')
    assert.equal(body.address,'')
    assert.equal(body.storefrontFileId,undefined)
  }
})

test('store storeName validation matches backend empty and length messages',async()=>{
  const remote=async url=>{
    throw new Error('unexpected '+url)
  }
  const {application}=await loadApplication({remote})
  const options={agencyType:'STORE',promotionCode:CODE}
  await assert.rejects(application.submitAgencyApplication(options,storeDraft({storeName:''}),'k-empty'),{message:'请填写门店名称'})
  await assert.rejects(application.submitAgencyApplication(options,storeDraft({storeName:'   '}),'k-blank'),{message:'请填写门店名称'})
  await assert.rejects(application.submitAgencyApplication(options,storeDraft({storeName:'甲'.repeat(256)}),'k-long'),{message:'门店名称不能超过 255 个字'})
})

test('store storeName of 255 characters is accepted on the live payload',async()=>{
  const calls=[]
  const storeName='甲'.repeat(255)
  const remote=async(url,options={})=>{
    calls.push({url,options})
    if(url==='/api/hq/region-agents/check')return {available:true,regionType:'store',regionCode:'450202'}
    if(url==='/agency/applications')return {application:{id:'app-255'}}
    throw new Error('unexpected '+url)
  }
  const {application}=await loadApplication({remote})
  await application.submitAgencyApplication({agencyType:'STORE',promotionCode:CODE},storeDraft({storeName}),'k-255')
  const post=calls.find(item=>item.url==='/agency/applications')
  assert.equal(post.options.data.storeName,storeName)
  assert.equal(post.options.data.name,'申请人姓名')
  assert.equal(post.options.data.address,'柳州螺蛳粉脑商合作店地址')
})

test('mock store submit stores storeName separately from applicant name',async()=>{
  const {application,profile,session}=await loadApplication({useMock:true,remote:()=>{throw new Error('Unexpected network')}})
  const state=profile.mockProfileState(session.user)
  state.assets.set('sf-1',{purpose:'storefront'})
  const options=await application.getAgencyApplicationOptions('STORE',CODE)
  const submitted=await application.submitAgencyApplication(options,storeDraft({
    name:'广西省代测试',
    storeName:'柳州螺蛳粉脑商合作店',
    address:'柳州市城中区测试路1号',
  }),'k-mock-store')
  assert.equal(submitted.application.store.name,'柳州螺蛳粉脑商合作店')
  assert.equal(submitted.application.store.address,'柳州市城中区测试路1号')
  assert.equal(submitted.application.agencyType,'STORE')
  await assert.rejects(application.submitAgencyApplication(options,storeDraft({storeName:''}),'k-mock-empty'),{message:'请填写门店名称'})
  await assert.rejects(application.submitAgencyApplication(options,storeDraft({storeName:'甲'.repeat(256)}),'k-mock-long'),{message:'门店名称不能超过 255 个字'})
})
