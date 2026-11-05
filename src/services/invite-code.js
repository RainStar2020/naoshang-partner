import {getCachedMyInviteCode} from './api'

export function getMyInviteCode(){
  const invite=getCachedMyInviteCode()
  if(!invite)throw new Error('邀请码缓存不存在，请重新登录')
  return Promise.resolve(invite)
}
