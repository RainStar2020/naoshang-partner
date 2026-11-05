import {normalizeUploadIntent,isUploadReady} from './upload-contract'
import {apiUrl} from './asset-url'
import {request,getSession} from './api'

export async function uploadAsset(file,{purpose,mimeType,fileName}){
  const session=getSession()
  if(!session?.user?.id)throw new Error('请先登录')
  const intent=normalizeUploadIntent(await request('/assets/upload-intents',{method:'POST',data:{purpose,size:file.size,mimeType,fileName}}))
  if(!intent?.assetId||!intent?.uploadUrl||intent.mode!=='multipart')throw new Error('上传配置暂不可用，请稍后重试')
  if(intent.limits?.maxSize&&file.size>intent.limits.maxSize)throw new Error('文件超过允许大小')
  const header={...(intent.headers||{})}
  if(session.token)header.Authorization=`Bearer ${session.token}`
  await new Promise((resolve,reject)=>uni.uploadFile({url:apiUrl(intent.uploadUrl),filePath:file.path,name:intent.fileField||'file',header,formData:intent.fields||{},success:result=>result.statusCode>=200&&result.statusCode<300?resolve():reject(new Error('文件上传失败')),fail:reject}))
  const ready=await request(`/assets/${encodeURIComponent(intent.assetId)}/completions`,{method:'POST'})
  if(!isUploadReady(ready))throw new Error('文件尚未处理完成，请稍后重试')
  if(getSession()?.token!==session.token||getSession()?.user?.id!==session.user.id)throw new Error('账号已变化')
  return {assetId:intent.assetId,fileId:intent.fileId,previewUrl:ready.previewUrl||''}
}
