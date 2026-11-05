import {config} from '../config'
import {getSession} from './api'
import {uploadAsset} from './asset-upload'
import {mockProfileState} from './mock/profile'
// TODO(API): local preview paths are accepted only in this explicitly mocked upload branch.
export async function uploadTrainingAsset(file,kind){const s=getSession();if(!s?.user?.id)throw new Error('请先登录');const ext=String(file.name||file.path||'').split('.').pop().toLowerCase(),mime={pdf:'application/pdf',mp4:'video/mp4'};if(!['file','video'].includes(kind)||!mime[ext]||(kind==='file'&&ext!=='pdf')||(kind==='video'&&ext!=='mp4')||!file.path||!Number.isFinite(file.size)||file.size<=0||file.size>30*1024*1024)throw new Error('支持30MB以内的PDF文件或MP4视频');let result
  if(config.useMock){const state=mockProfileState(s.user),assetId=`mock-training-${state.nextAsset++}`;result={assetId,kind,name:file.name||`附件.${ext}`,size:file.size,previewUrl:file.path};state.assets.set(assetId,{purpose:`training-${kind}`,...result})}
  else{const ready=await uploadAsset(file,{purpose:`training-${kind}`,mimeType:mime[ext],fileName:file.name||`附件.${ext}`});result={assetId:ready.assetId,kind,name:file.name,size:file.size,previewUrl:ready.previewUrl}}
  if(getSession()?.token!==s.token||getSession()?.user?.id!==s.user.id)throw new Error('账号已变化');return result
}
