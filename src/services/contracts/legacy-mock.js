// Reuse the existing, tested stateful page mocks. Never let this bridge send HTTP.
import { config } from '../../config'
import * as profile from '../profile'
import * as members from '../members'
import * as materials from '../materials'
import * as training from '../training'
import * as store from '../business-store'
import * as business from '../business'
import * as operations from '../business-operations'
import * as exclusive from '../exclusive'
import * as agency from '../agency-application'
import { getLesson } from '../lesson'
import { businessTools } from '../../features/business/catalog'

export const NO_LEGACY_MOCK = Symbol('NO_LEGACY_MOCK')
export function legacyMock(key, p, d) {
  if (!config.useMock) return NO_LEGACY_MOCK
  const routes = {
    'PATCH /me': () => profile.updateMyProfile(d),
    'POST /addresses': () => profile.saveAddress('', d),
    'PATCH /addresses/{id}': () => profile.saveAddress(p.id, d),
    'DELETE /addresses/{id}': () => profile.deleteAddress(p.id, d.version),
    'PUT /addresses/default': () => profile.setDefaultAddress(d.addressId, d.version),
    'GET /coupons': () => profile.getCoupons(d.status, d.cursor),
    'POST /members': () => members.saveFamilyMember('', d),
    'PATCH /members/{id}': () => members.saveFamilyMember(p.id, d),
    'POST /activations/preview': () => members.previewMemberActivation(d.memberId, d.code),
    'POST /activations': () => members.activateFamilyMember(d.memberId, d, d.idempotencyKey),
    'GET /materials/categories': () => materials.getMaterialCategories(d.type),
    'GET /materials': () => materials.getMaterials(d.type, d),
    'GET /materials/{id}': () => materials.getMaterial(p.id),
    'GET /coach/workspace': () => training.getCoachWorkspace(d.contextId),
    'GET /members/{id}/store-profile': () => training.getStoreMember(d.contextId, p.id),
    'PATCH /members/{id}/training': () => training.updateStoreMember(d.contextId, p.id, d),
    'GET /members/{id}/training-feedback': () => training.getTrainingFeedback(d.contextId, p.id, d.kind),
    'GET /training-feedback/{id}': () => training.getTrainingFeedbackDetail(d.memberId, p.id, d.contextId),
    'POST /training-feedback': () => training.saveTrainingFeedback(d.contextId, d.memberId, d, d.idempotencyKey),
    'GET /store-transfer/options': () => training.getTransferOptions(d.contextId, d.memberId, d),
    'POST /store-transfer/applications': () => training.applyStoreTransfer(d.contextId, d.memberId, d, d.idempotencyKey),
    'GET /agency/store-workspace': () => store.getBusinessStore(d.contextId),
    'PATCH /stores/{id}': () => store.saveBusinessStore(d.contextId, p.id, d),
    'POST /stores/{storeId}/coaches': () => store.saveBusinessCoach(d.contextId, p.storeId, '', d, d.idempotencyKey),
    'PATCH /stores/{storeId}/coaches/{id}': () => store.saveBusinessCoach(d.contextId, p.storeId, p.id, d, d.idempotencyKey),
    'POST /applications/{id}/decisions': () => store.decideBusinessApplication(d.contextId, d.storeId, p.id, d),
    'GET /income/entries/{id}': () => business.getBusinessIncomeDetail(d.contextId, p.id),
    'GET /agency/team/{id}': () => business.getBusinessTeamNode(d.contextId, p.id),
    'GET /wallet/withdrawals': () => business.getBusinessWithdrawals(d.contextId, d.cursor),
    'POST /partner/superior-bindings': () => business.bindBusinessSuperior(d.contextId, d.inviteCode),
    'GET /costore/application-options': () => exclusive.getCostoreOptions(),
    'POST /costore/application-quotes': () => exclusive.quoteCostore(d.storeId, d.durationId),
    'POST /applications/costore': () => exclusive.submitCostoreApplication(d),
    'GET /applications': () => exclusive.getMyApplications(d.cursor),
    'GET /founder-awards': () => exclusive.getFounderAwards(d.month, d.cursor),
    'GET /promotion/agency-code': () => exclusive.getAgencyPromotion(d.agencyType),
    'GET /lessons/{chapterId}': () => getLesson({ ...d, chapterId: p.chapterId }),
    'GET /promotion/invitations/{promotionId}': () => agency.getAgencyApplicationOptions(d.agencyType || 'STORE', p.promotionId),
    'POST /agency/applications': async () => agency.submitAgencyApplication(await agency.getAgencyApplicationOptions(d.agencyType || 'STORE', d.promotionId), d, d.idempotencyKey),
    'POST /wallet/payees': () => operations.registerBusinessPayee(d.contextId, d),
    'POST /partner/quota-transfers': () => operations.commitBusinessOperation('quota-transfer', d.contextId, d.quoteId, d.idempotencyKey),
    'POST /partner/upgrades': () => operations.commitBusinessOperation('upgrade', d.contextId, d.quoteId, d.idempotencyKey),
    'POST /partner/store-bindings': () => operations.commitBusinessOperation('bind-store', d.contextId, d.quoteId, d.idempotencyKey),
    'POST /wallet/withdrawals': () => operations.commitBusinessOperation('withdraw', d.contextId, d.quoteId, d.idempotencyKey),
    'POST /income/entries/{id}/allocations': () => operations.commitBusinessOperation('allocation', d.contextId, d.quoteId, d.idempotencyKey, p.id),
  }
  const report = businessTools.find(tool => `GET ${tool.endpoint}` === key && !['operation', 'store', 'materials'].includes(tool.type))
  if (report) routes[key] = () => business.getBusinessReport(report.module, report.id, d.contextId, d)
  for (const module of ['partner', 'costore', 'agency']) {
    routes[`GET /${module}/overview`] = () => business.getBusinessOverview(module === 'partner' ? 'wholesale' : module, d.contextId)
  }
  const kinds = { 'quota-transfer': 'quota-transfer', 'quota-purchase': 'quota-purchase', upgrade: 'upgrade', entitlement: 'entitlement', 'store-binding': 'bind-store' }
  for (const [prefix, kind] of Object.entries(kinds)) {
    routes[`GET /partner/${prefix}-options`] = () => operations.getBusinessOperationOptions(kind, d.contextId)
    routes[`POST /partner/${prefix}-quotes`] = () => operations.previewBusinessOperation(kind, d.contextId, d)
  }
  routes['GET /wallet/withdrawal-options'] = () => operations.getBusinessOperationOptions('withdraw', d.contextId)
  routes['POST /wallet/withdrawal-quotes'] = () => operations.previewBusinessOperation('withdraw', d.contextId, d)
  routes['GET /income/entries/{id}/allocation-options'] = () => operations.getBusinessOperationOptions('allocation', d.contextId, p.id)
  routes['POST /income/entries/{id}/allocation-quotes'] = () => operations.previewBusinessOperation('allocation', d.contextId, d, p.id)
  return routes[key] ? routes[key]() : NO_LEGACY_MOCK
}
