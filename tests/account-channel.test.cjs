const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
async function setup(useMock=true,response=null){
  const storage=new Map(),context=vm.createContext({uni:{getStorageSync:k=>storage.get(k),setStorageSync:(k,v)=>storage.set(k,v),removeStorageSync:k=>storage.delete(k),request:options=>options.success({statusCode:200,data:response})}}),cache=new Map()
  async function load(file){
    if(cache.has(file))return cache.get(file)
    const m=new vm.SourceTextModule(file.endsWith('/config')?`export const config={useMock:${useMock},baseURL:'https://api.example.com'}`:fs.readFileSync(file+'.js','utf8'),{context,identifier:file})
    cache.set(file,m);await m.link((s,p)=>load(path.resolve(path.dirname(p.identifier),s).replaceAll('\\','/')));return m
  }
  const root=path.resolve(__dirname,'../src/services').replaceAll('\\','/')
  const api=await load(root+'/api');await api.evaluate()
  const channel=await load(root+'/account-channel');await channel.evaluate()
  return {api:api.namespace,channel:channel.namespace,storage}
}
test('normal login resets a saved child selection to parent and never stores the password',async()=>{
  const {api,storage,channel}=await setup();storage.set('naoshang-learning-identity:LC0001','child:LC0001:1')
  const session=await api.login({phone:'13800000000',password:'example-password'})
  assert.equal(session.accountType,'parent');assert.equal(storage.has('naoshang-learning-identity:LC0001'),false)
  assert.equal(channel.accountHome(session),'/pages/member/index')
  assert.equal(JSON.stringify([...storage]).includes('example-password'),false)
  await assert.rejects(api.login({channel:'coach'}),/联系门店/)
})
test('only the server account type selects the restricted coach channel',async()=>{
  const coach={token:'staff-token',accountType:'coach',user:{id:'staff-1',role:'家长'}}
  const {api,channel}=await setup(false,coach),session=await api.login({loginAccount:'coach-1'})
  assert.equal(channel.accountHome(session),'/pages/coach/index')
  for(const route of ['pages/member/index','pages/profile/index','pages/partners/index','pages/selection/index','pages/store/index'])assert.equal(channel.canOpenAccountPage(session,route),false)
  assert.equal(channel.canOpenAccountPage(session,'pages/coach/index'),true)
  assert.equal(channel.canOpenAccountPage(session,'pages/settings/change-password'),true)
  assert.equal(channel.accountHome({user:{role:'健脑官'}}),'/pages/member/index')
})
