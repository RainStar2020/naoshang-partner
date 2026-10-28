import { normalizeUploadIntent, isUploadReady } from './upload-contract'
import {config} from '../config'
import {request,getSession} from './api'
import {mockProfileState} from './mock/profile'
// TODO(API): local preview paths are accepted only in this explicitly mocked upload branch.
export async function uploadTrainingAsset(file,kind){const s=getSession();if(!s?.user?.id)throw new Error('请先登录');const ext=String(file.name||file.path||'').split('.').pop().toLowerCase(),mime={pdf:'application/pdf',mp4:'video/mp4'};if(!['file','video'].includes(kind)||!mime[ext]||(kind==='file'&&ext!=='pdf')||(kind==='video'&&ext!=='mp4')||!file.path||!Number.isFinite(file.size)||file.size<=0||file.size>30*1024*1024)throw new Error('支持30MB以内的PDF文件或MP4视频');let result
  if(config.useMock){const state=mockProfileState(s.user),assetId=`mock-training-${state.nextAsset++}`;result={assetId,kind,name:file.name||`附件.${ext}`,size:file.size,previewUrl:file.path};state.assets.set(assetId,{purpose:`training-${kind}`,...result})}
  else{const intent=normalizeUploadIntent(await request('/assets/upload-intents',{method:'POST',data:{purpose:`training-${kind}`,size:file.size,mimeType:mime[ext],fileName:file.name}}));if(!intent?.assetId||!/^https:\/\//.test(intent.uploadUrl)||intent.mode!=='multipart')throw new Error('上传暂不可用');await new Promise((resolve,reject)=>uni.uploadFile({url:intent.uploadUrl,filePath:file.path,name:intent.fileField||'file',header:intent.headers||{},formData:intent.fields||{},success:r=>r.statusCode>=200&&r.statusCode<300?resolve():reject(new Error('附件上传失败')),fail:reject}));const ready=await request(`/assets/${encodeURIComponent(intent.assetId)}/completions`,{method:'POST'});if(!isUploadReady(ready))throw new Error('附件尚未处理完成');result={assetId:intent.assetId,kind,name:file.name,size:file.size,previewUrl:ready.previewUrl}}
  if(getSession()?.token!==s.token||getSession()?.user?.id!==s.user.id)throw new Error('账号已变化');return result
}
