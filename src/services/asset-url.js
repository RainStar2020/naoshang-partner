import {config} from '../config'
import {getSession} from './api'

export function isAssetPath(value){return typeof value==='string'&&/^\/assets\/[A-Za-z0-9_-]+\/file$/.test(value.trim())}
function origin(){
  // #ifdef H5
  return typeof location!=='undefined'?location.origin:''
  // #endif
  // #ifndef H5
  return ''
  // #endif
}
export function apiUrl(value){
  const path=String(value||'').trim()
  if(!path||/^https?:\/\//i.test(path))return path
  const base=String(config.baseURL||'').replace(/\/+$/,'')
  if(!base)return path
  const suffix=path.startsWith('/')?path:`/${path}`
  return base.startsWith('/')&&origin()?`${origin()}${base}${suffix}`:`${base}${suffix}`
}
export function assetUrl(value){
  const path=String(value||'').trim()
  if(!isAssetPath(path))return path
  const url=apiUrl(path),token=getSession()?.token
  return token?`${url}${url.includes('?')?'&':'?'}token=${encodeURIComponent(token)}`:url
}
