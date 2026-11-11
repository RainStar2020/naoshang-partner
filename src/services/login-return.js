import { normalizeAgencyPromotionCode } from './agency-promotion-code'

const key='naoshang-login-return-v1'
// Only this known in-app destination is retained; arbitrary redirect URLs are never followed.
export function rememberAgencyReturn(query){
  const promotionId=normalizeAgencyPromotionCode(query.promotionId||query.promotionCode||'')
  const agencyType=String(query.agencyType||'STORE')
  if(!promotionId||!['STORE','COUNTY','CITY','PROVINCE'].includes(agencyType))return
  uni.setStorageSync(key,{promotionId,agencyType,expiresAt:Date.now()+1800000})
}
export function consumeLoginReturn(){
  const value=uni.getStorageSync(key)
  uni.removeStorageSync(key)
  const promotionId=normalizeAgencyPromotionCode(value&&value.promotionId)
  if(!value||value.expiresAt<=Date.now()||!promotionId||!['STORE','COUNTY','CITY','PROVINCE'].includes(value.agencyType))return null
  return `/pages/application/agency?promotionId=${encodeURIComponent(promotionId)}&agencyType=${value.agencyType}`
}
