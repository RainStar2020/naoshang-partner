// TODO(API): MOCK-ONLY. Replace fixtures and remove local state after API integration.
const families = new Map()
export function mockFamily(user) {
  if (!families.has(user.id)) families.set(user.id, { nextId: 3, operations: new Map(), members: [1, 2].map(number => ({
    id: `demo-${user.id}-${number}`, contextId: `child:${user.id}:${number}`, displayId: `DEMO00${number}`, name: number === 1 ? '体验学员' : '体验学员二', gradeCode: 'JUNIOR_1', gradeLabel: '初一', genderCode: 'UNDISCLOSED', genderLabel: '未设置', badge: number === 1 ? '三阶羿烁会员' : '未激活会员', avatarUrl: '', training: null, selfStudyNote: '', campNote: '', remark: '', version: 1,
  })) })
  return families.get(user.id)
}
export const memberDictionaries = {
  grades: [{ code: 'PRIMARY_1', label: '一年级' }, { code: 'PRIMARY_2', label: '二年级' }, { code: 'PRIMARY_3', label: '三年级' }, { code: 'PRIMARY_4', label: '四年级' }, { code: 'PRIMARY_5', label: '五年级' }, { code: 'PRIMARY_6', label: '六年级' }, { code: 'JUNIOR_1', label: '初一' }, { code: 'JUNIOR_2', label: '初二' }, { code: 'JUNIOR_3', label: '初三' }, { code: 'OTHER', label: '其他' }],
  genders: [{ code: 'MALE', label: '男' }, { code: 'FEMALE', label: '女' }, { code: 'UNDISCLOSED', label: '未设置' }],
}
