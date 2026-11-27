const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
async function setup(useMock = true, request = () => { throw new Error('Unexpected network') }, extraUni = {}, requestPublic) {
  const session = { token: 'demo', user: { id: 'A', name: '演示用户' } }
  const context = vm.createContext({ console, uni: extraUni }), cache = new Map()
  async function load(file) {
    if(cache.has(file)) return cache.get(file)
    let module
    if(file.endsWith('/config')) module = new vm.SyntheticModule(['config'], function(){ this.setExport('config',{useMock}) }, {context})
    else if(file.endsWith('/api')) module = new vm.SyntheticModule(['request','requestPublic','getSession','logout'], function(){ this.setExport('request',request);this.setExport('requestPublic',requestPublic || request);this.setExport('getSession',()=>session);this.setExport('logout',()=>{}); }, {context})
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
  const {material}=await setup(false,async()=>({id:'m1',title:'客户素材',type:'article',allowedOperations:['copy-link'],mediaUrl:'javascript:bad()',shareUrl:'https://shotr.xtdub.com.cn/#/pages/promo-content/article/index?shareId=ps_valid1',content:{version:1,format:'nodes',nodes:[{name:'p',children:[{type:'text',text:'客户上传文字'}]}]}}))
  const row=await material.getMaterial('m1')
  assert.equal(row.mediaUrl,'');assert.equal(row.content.nodes[0].children[0].text,'客户上传文字')
  assert.equal(row.allowedOperations[0],'copy-link')
  assert.equal(row.shareUrl,'https://shotr.xtdub.com.cn/#/pages/promo-content/article/index?shareId=ps_valid1')
  assert.equal(row.contentShareId,'ps_valid1')
})
test('legacy invite shareUrl is not treated as a content page and string article content still loads',async()=>{
  const {material}=await setup(false,async()=>({id:'m2',title:'公告',type:'article',allowedOperations:['upload-qr','copy-link'],shareUrl:'https://h5.naoshang.example.com/#/pages/register/index?inviteCode=ABC',content:'<p>公告正文</p>',qrSlotAtEnd:true,h5RouteReady:false}))
  const row=await material.getMaterial('m2')
  assert.equal(row.shareUrl,'')
  assert.equal(row.inviteUrl,'https://h5.naoshang.example.com/#/pages/register/index?inviteCode=ABC')
  assert.equal(material.copyLinkTarget(row),'')
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
    return {id:'pm_5017',title:'联调测试-平台公告',type:'article',allowedOperations:['upload-qr','create-content-share','copy-link'],inviteUrl:'https://shotr.xtdub.com.cn/#/pages/register/index?inviteCode=ABC',shareUrl:null,mediaUrl:'https://cdn.example.com/art-notice-media.png',content:{version:1,format:'nodes',nodes:[{type:'p',text:'联调测试-平台公告'}]},qrSlotAtEnd:true,h5RouteReady:false}
  })
  const rows=await material.getMaterials('image')
  assert.equal(rows.items[0].coverUrl,'/assets/ast_c3a53ad118aa.png/file?token=demo')
  const detail=await material.getMaterial('pm_5017')
  assert.equal(detail.content.format,'nodes')
  assert.equal(detail.content.nodes[0].name,'p')
  assert.equal(detail.content.nodes[0].children[0].text,'联调测试-平台公告')
  assert.equal(detail.shareUrl,'')
  assert.equal(detail.inviteUrl,'https://shotr.xtdub.com.cn/#/pages/register/index?inviteCode=ABC')
  assert.equal(detail.h5RouteReady,false)
  assert.ok(material.categoriesForType('image').every(item=>['img-poster','img-qr'].includes(item.id)))
  assert.equal(material.categoriesForType('article').map(item=>item.id).join(','),'art-notice,art-course')
  assert.equal(material.categoriesForType('video').map(item=>item.id).join(','),'vid-intro,vid-course')
})
test('job download urls under /assets/*.png/file are treated as success media, not missing results',async()=>{
  const {material}=await setup(false,async()=>({status:'succeeded',downloadUrl:'/assets/ast_result.png/file',shareUrl:'https://h5.naoshang.example.com/#/pages/register/index?inviteCode=ABC'}))
  const result=await material.getMaterialJob('job1')
  assert.equal(result.downloadUrl,'/assets/ast_result.png/file?token=demo')
  assert.equal(result.shareUrl,'https://h5.naoshang.example.com/#/pages/register/index?inviteCode=ABC')
})


test('content page urls and invite urls stay separated, including stale pm_247 invite shareUrl',async()=>{
  const articleUrl='https://shotr.xtdub.com.cn/#/pages/promo-content/article/index?shareId=ps_8f3a2c1e0b764d21'
  const inviteUrl='https://shotr.xtdub.com.cn/#/pages/register/index?inviteCode=8FZZH5'
  const {material}=await setup(false,async()=>({
    id:'pm_247',title:'真实流程测试-平台公告',type:'article',allowedOperations:['upload-qr','create-content-share','copy-link'],
    inviteUrl,shareUrl:inviteUrl,contentShareId:null,qrSlotAtEnd:true,h5RouteReady:false,
  }))
  const row=await material.getMaterial('pm_247')
  assert.equal(row.shareUrl,'')
  assert.equal(row.inviteUrl,inviteUrl)
  assert.equal(row.contentShareId,null)
  assert.equal(material.copyLinkTarget(row),'')
  assert.equal(material.isInviteRegisterUrl(inviteUrl),true)
  assert.equal(material.isContentShareUrl(inviteUrl),false)
  assert.equal(material.isContentShareUrl(articleUrl),true)
  assert.equal(material.isContentShareUrl(articleUrl+'&inviteCode=8FZZH5'),false)
  assert.equal(material.isContentShareUrl('https://shotr.xtdub.com.cn/#/pages/promo-content/article/index?materialId=pm_247'),false)
  assert.equal(material.keepContentShareUrl(articleUrl),articleUrl)
  const ready=await setup(false,async()=>({id:'pm_x',title:'课程介绍',type:'article',allowedOperations:['copy-link'],shareUrl:articleUrl,inviteUrl,contentShareId:'ps_8f3a2c1e0b764d21',qrSlotAtEnd:true}))
  const ok=await ready.material.getMaterial('pm_x')
  assert.equal(ok.shareUrl,articleUrl)
  assert.equal(ok.inviteUrl,inviteUrl)
  assert.equal(ready.material.copyLinkTarget(ok),articleUrl)
  assert.notEqual(ready.material.copyLinkTarget(ok),inviteUrl)
})

test('copy-link helpers never copy the invite register url, even when backend still puts it in shareUrl',async()=>{
  const {material}=await setup(false,async()=>({items:[{id:'pm_251',title:'真实流程测试-平台介绍视频',type:'video',categoryId:'vid-intro',coverUrl:'https://cdn.example.com/cover.png',shareUrl:'https://shotr.xtdub.com.cn/#/pages/register/index?inviteCode=8FZZH5',inviteUrl:'https://shotr.xtdub.com.cn/#/pages/register/index?inviteCode=8FZZH5'}],hasMore:false,nextCursor:null}))
  const rows=await material.getMaterials('video')
  assert.equal(rows.items[0].shareUrl,'')
  assert.equal(rows.items[0].inviteUrl,'https://shotr.xtdub.com.cn/#/pages/register/index?inviteCode=8FZZH5')
  assert.equal(material.copyLinkTarget(rows.items[0]),'')
})

test('content share create and current-share backfill use dedicated endpoints, not renders',async()=>{
  const calls=[]
  const articleUrl='https://shotr.xtdub.com.cn/#/pages/promo-content/article/index?shareId=ps_share1'
  const {material}=await setup(false,async(url,options)=>{
    calls.push({url,options})
    if(url.includes('/content-shares/current')) return {shareId:'ps_share1',shareUrl:articleUrl,qrImageUrl:'https://naoshang.chen1413.com.cn/media/material-qr/ps_share1.png',type:'article',materialId:'pm_247'}
    if(url.includes('/content-shares')) return {shareId:'ps_share1',shareUrl:articleUrl,qrImageUrl:'https://naoshang.chen1413.com.cn/media/material-qr/ps_share1.png',type:'article',materialId:'pm_247'}
    throw new Error('unexpected '+url)
  })
  const created=await material.createContentShare('pm_247',{qrAssetId:'qr1',idempotencyKey:'key-1'})
  assert.equal(created.shareId,'ps_share1')
  assert.equal(created.shareUrl,articleUrl)
  assert.equal(calls[0].url,'/materials/pm_247/content-shares')
  assert.equal(calls[0].options.method,'POST')
  assert.equal(calls[0].options.data.qrAssetId,'qr1')
  assert.equal(calls[0].options.data.idempotencyKey,'key-1')
  const current=await material.getCurrentContentShare('pm_247')
  assert.equal(current.shareUrl,articleUrl)
  assert.ok(calls[1].url.endsWith('/content-shares/current'))
  assert.ok(calls.every(item=>!String(item.url).includes('/renders')))
})

test('createContentShare rejects invite-register payload and surfaces H5_ROUTE_NOT_READY',async()=>{
  const invite='https://shotr.xtdub.com.cn/#/pages/register/index?inviteCode=8FZZH5'
  const bad=await setup(false,async()=>({shareId:'ps_x',shareUrl:invite,type:'article',materialId:'pm_247'}))
  await assert.rejects(bad.material.createContentShare('pm_247',{qrAssetId:'qr1',idempotencyKey:'k1'}),/不是内容页链接/)
  const notReady=await setup(false,async()=>{throw Object.assign(new Error('视频互动 H5 尚未就绪'),{statusCode:409,code:40900,errorCode:'H5_ROUTE_NOT_READY',data:{errorCode:'H5_ROUTE_NOT_READY'}})})
  await assert.rejects(notReady.material.createContentShare('pm_251',{qrAssetId:'qr1',idempotencyKey:'k1'}),/尚未就绪/)
  assert.equal(notReady.material.describeContentShareBlocker({type:'video',allowedOperations:['upload-qr','create-content-share','copy-link'],h5RouteReady:false,videoDeliveryMode:'INTERACTIVE_H5'}),'视频互动页面尚未就绪，暂时无法生成内容页分享')
  assert.equal(notReady.material.describeContentShareBlocker({type:'article',allowedOperations:['upload-qr','create-content-share','copy-link'],qrSlotAtEnd:false}),'该图文未启用文末码位，无法生成内容页分享')
  assert.equal(notReady.material.describeContentShareBlocker({type:'article',allowedOperations:['upload-qr','create-content-share','copy-link'],qrSlotAtEnd:true}),'')
})

test('public promo share is fetched without token, 404 does not fall back to invite pages, and 401 is marked unready',async()=>{
  const calls=[]
  const article={shareId:'ps_ok',type:'article',title:'课程介绍',summary:'',coverUrl:'https://naoshang.chen1413.com.cn/media/promo/cover.png',content:{version:1,format:'nodes',nodes:[{name:'p',children:[{type:'text',text:'正文'}]}]},qrSlotAtEnd:true,qrImageUrl:'https://naoshang.chen1413.com.cn/media/material-qr/ps_ok.png',mediaUrl:null,posterUrl:null,inviteUrl:'https://shotr.xtdub.com.cn/#/pages/register/index?inviteCode=SECRET',inviteCode:'SECRET'}
  const {material}=await setup(false,()=>{throw new Error('authenticated request should not be used')},{},async(url)=>{
    calls.push({url})
    if(url.includes('ps_missing')) throw Object.assign(new Error('NOT_FOUND'),{statusCode:404,code:40400,errorCode:'NOT_FOUND'})
    if(url.includes('ps_unready')) throw Object.assign(new Error('未登录或 token 失效'),{statusCode:401,code:40100})
    return article
  })
  const share=await material.getPublicPromoShare('ps_ok')
  assert.equal(calls[0].url,'/api/public/promo-shares/ps_ok')
  assert.equal(share.title,'课程介绍')
  assert.equal(share.qrSlotAtEnd,true)
  assert.equal(share.qrImageUrl,'https://naoshang.chen1413.com.cn/media/material-qr/ps_ok.png')
  assert.equal(share.inviteUrl,undefined)
  assert.equal(share.inviteCode,undefined)
  assert.equal(material.shouldRenderArticleEndQr(share),true)
  await assert.rejects(material.getPublicPromoShare('ps_missing'),/不存在或内容已下线/)
  await assert.rejects(material.getPublicPromoShare('ps_unready'),/尚未就绪/)
  const missing=await material.getPublicPromoShare('ps_missing').catch(error=>error)
  assert.equal(material.isNotFoundError(missing),true)
  assert.match(missing.message,/不存在或内容已下线/)
  assert.doesNotMatch(missing.message,/邀请注册/)
  const videoShare={type:'video',title:'介绍',qrImageUrl:'https://naoshang.chen1413.com.cn/media/material-qr/ps_v.png',mediaUrl:'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',posterUrl:'https://cdn.example.com/poster.png',h5RouteReady:false,hasH5RouteReadyField:true}
  assert.equal(material.shouldRenderVideoChatQr(videoShare),true)
  assert.match(material.describePublicVideoReadiness(videoShare),/尚未就绪/)
  assert.equal(material.describePublicVideoReadiness({...videoShare,hasH5RouteReadyField:false,h5RouteReady:false}),'')
})

test('promo content pages stay public, put article QR at the end, and never burn QR into the video source',()=>{
  const root=path.resolve(__dirname,'..')
  const pages=JSON.parse(fs.readFileSync(path.join(root,'src/pages.json'),'utf8'))
  const routes=pages.pages.map(item=>item.path)
  assert.ok(routes.includes('pages/promo-content/article/index'))
  assert.ok(routes.includes('pages/promo-content/video/index'))
  assert.ok(!routes.some(item=>item.startsWith('pages/partner/promo-content')))
  const whitelist=fs.readFileSync(path.join(root,'src/services/public-pages.js'),'utf8')
  const auth=fs.readFileSync(path.join(root,'src/composables/useAuth.js'),'utf8')
  assert.match(whitelist,/pages\/promo-content\/article\/index/)
  assert.match(whitelist,/pages\/promo-content\/video\/index/)
  assert.match(auth,/isAuthWhitelistedRoute/)
  assert.match(auth,/if \(isAuthWhitelistedRoute\(route\)\) return/)
  const article=fs.readFileSync(path.join(root,'src/pages/promo-content/article/index.vue'),'utf8')
  const video=fs.readFileSync(path.join(root,'src/pages/promo-content/video/index.vue'),'utf8')
  const editor=fs.readFileSync(path.join(root,'src/pages/partner/material-edit.vue'),'utf8')
  assert.doesNotMatch(article,/useAuth\(/)
  assert.doesNotMatch(video,/useAuth\(/)
  assert.doesNotMatch(article,/pages\/register\/index/)
  assert.doesNotMatch(video,/pages\/register\/index/)
  assert.doesNotMatch(article,/inviteCode/)
  assert.doesNotMatch(video,/inviteCode/)
  const qrIndex=article.indexOf('article-qr-slot')
  const titleIndex=article.indexOf('article-title')
  const contentIndex=Math.max(article.indexOf('article-html'),article.indexOf('ManagedRichContent'))
  assert.ok(qrIndex>contentIndex && contentIndex>titleIndex)
  assert.match(video,/<video[\s\S]*:src="share\.mediaUrl"/)
  assert.doesNotMatch(video,/<video[^>]*qrImageUrl/)
  assert.match(video,/chat-qr/)
  assert.match(editor,/复制内容页链接/)
  assert.match(editor,/复制邀请注册链接/)
  assert.match(editor,/createContentShare/)
  assert.doesNotMatch(editor,/当前还不能生成带二维码的内容访问链接/)
})
