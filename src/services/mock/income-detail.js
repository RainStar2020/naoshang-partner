// MOCK-ONLY presentation for designs 68–92. Amount strings are layout samples, not commission rules.
const phone = '19919988991'
const liAvatar = '/static/agency/avatar-li-zhiyuan.png'
const wangAvatar = '/static/agency/avatar-wang-haomeng.png'
const shop = {
  name: '脑商训练营梧桐街店',
  number: 'NO.001',
  address: '河南省郑州市管城回族区航海东路与中州大道交叉口西美景龙堂3c-1',
  manager: `李志远/${phone}`,
  imageUrl: '/static/agency/store-wutong.png',
}

const inspectionChoices = [
  { value: 'self', label: '本人' },
  { value: 'city', label: '上级市代' },
  { value: 'province', label: '上级省代' },
  { value: 'hq', label: '总部' },
  { value: 'other', label: '其他代理' },
]
const salesChoices = [
  { value: 'self', label: '本店' },
  { value: 'county', label: '上级区代' },
  { value: 'city', label: '上级市代' },
  { value: 'province', label: '上级省代' },
  { value: 'hq', label: '总部' },
  { value: 'other', label: '其他代理' },
]

export function allocationChoices(kind) {
  return kind === 'sales' ? salesChoices : inspectionChoices
}

export function allocationAllowed(targetId) {
  return ['self', 'superior', 'city', 'province', 'hq', 'county', 'other'].includes(targetId)
}

export function allocationBeneficiary(kind, targetId, context, agentId) {
  if (targetId === 'superior') return '授权上级'
  if (targetId === 'other') return agentId || ''
  if (targetId === 'self') return kind === 'sales' ? '本店' : '本人'
  return allocationChoices(kind).find(item => item.value === targetId)?.label || context?.label || ''
}

function roleOf(context) {
  return { COUNTY: '区县代理', CITY: '市代', PROVINCE: '省代', STORE: '单店代理' }[context.agencyType] || context.scopeLabel || context.label || '代理'
}

function person(title, name, badge, avatar, lines) {
  return { title, name, badge, avatarUrl: avatar, lines }
}

function contact(title, name, badge, avatar) {
  return person(title, name, badge, avatar, [`联系方式：${phone}`])
}

const agencyUser = person('用户信息', '李志远', '天使合伙人', liAvatar, [
  '代理详情：单店代理/脑商白金都会店',
  `联系方式：${phone}`,
  '门店地址：河南省洛阳市西工区王城大道白金都会8号楼',
])
const countyReferrer = person('推荐人信息', '王好梦', '私董合伙人', wangAvatar, [
  '代理详情：区县代理/河南省郑州市二七区',
  `联系方式：${phone}`,
])
const productPeople = [
  contact('推荐人信息', '李志远', '私董合伙人', liAvatar),
  contact('购买人信息', '王好梦', '私董合伙人', wangAvatar),
]
const openedStore = { title: '开通门店', ...shop }
const deliveredStore = { title: '交付门店', ...shop }
const boundStore = { title: '绑定门店', ...shop }

function allocationFact(entry, kindLabel) {
  if (entry.allocationStatus !== 'ALLOCATED') return { label: kindLabel, value: '待分配' }
  const value = entry.allocationTarget === 'other' && entry.allocationAgentId
    ? entry.allocationAgentId
    : allocationBeneficiary(entry.allocationKind, entry.allocationTarget, {}, entry.allocationAgentId)
  return { label: kindLabel, value, note: entry.allocationTarget && entry.allocationTarget !== 'self' ? '（已从业务提点中扣除）' : '' }
}

function agencyFee(context) {
  const sample = {
    COUNTY: ['+6000', '15%', '直推代理', '直系下级成为异地代理'],
    CITY: ['+3200', '8%', '区域内成交代理', '异地代理推荐成交本地代理'],
    PROVINCE: ['+24000', '60%', '拓展本区域下级代理', '异地代理推荐成交本地代理'],
  }[context.agencyType] || ['+6000', '15%', '直推代理', '直系下级成为异地代理']
  return {
    amount: sample[0],
    facts: [
      { label: '业务提点', value: sample[1] },
      { label: '业务类型', value: sample[2] },
      { label: '业务详情', value: sample[3] },
    ],
    people: [countyReferrer, agencyUser],
  }
}

function costore(context) {
  const storeOwner = context.agencyType === 'STORE'
  return {
    amount: '+99999',
    facts: storeOwner
      ? [
          { label: '合店费详情', value: '4188（698*6）' },
          { label: '门店股东数量', value: '2' },
          { label: '业务提点', value: '27.5%' },
          { label: '业务类型', value: '合店费提成' },
          { label: '业务详情', value: '直推下级开通合店老板' },
        ]
      : [
          { label: '业务提点', value: '2%' },
          { label: '业务类型', value: '合店费提成' },
          { label: '合店费详情', value: '4188（698*6）' },
        ],
    people: storeOwner
      ? [
          person('推荐人信息', '李志远', '天使合伙人', liAvatar, [
            '代理详情：单店代理/脑商白金都会店',
            `联系方式：${phone}`,
            '门店地址：河南省洛阳市西工区王城大道白金都会8号楼',
          ]),
          contact('开通人信息', '王好梦', '私董合伙人', wangAvatar),
        ]
      : [
          person('推荐人信息', '李志远', '天使合伙人', liAvatar, [
            '代理详情：单店代理/脑商白金都会店',
            `联系方式：${phone}`,
            '门店地址：河南省洛阳市西工区王城大道白金都会8号楼',
          ]),
          contact('开通人信息', '王好梦', '私董合伙人', wangAvatar),
        ],
    store: openedStore,
  }
}

function special(entry, context) {
  const sales = entry.allocationKind === 'sales'
  const role = roleOf(context)
  const facts = sales
    ? [
        { label: '交付类型', value: '门店交付' },
        { label: '本人身份', value: role },
        { label: '门店股东数量', value: '2' },
        { label: '业务提点', value: '30%' },
        { label: '推荐人复购奖支出', value: '16元' },
        allocationFact(entry, '销售提点分配'),
      ]
    : context.agencyType === 'COUNTY'
      ? [
          { label: '交付类型', value: '门店交付' },
          { label: '本人身份', value: role },
          { label: '业务提点', value: '5%' },
          allocationFact(entry, '巡查提点分配'),
        ]
      : [
          { label: '交付类型', value: '门店交付' },
          { label: '本人身份', value: role },
          { label: '业务提点', value: '2%' },
        ]
  return {
    amount: entry.allocationKind && (context.agencyType === 'COUNTY' || sales) ? '+160' : '+99999',
    notice: entry.allocationStatus === 'PENDING' ? '本单存在待分配提成，收益暂不计入可提现金额' : '',
    facts,
    people: productPeople,
    store: deliveredStore,
  }
}

export function incomePresentation(entry, context) {
  if (context.module !== 'agency') return null
  const role = roleOf(context)
  const storeSide = context.agencyType === 'STORE'
  const layouts = {
    AGENCY_FEE: agencyFee(context),
    SERVICE_FEE: {
      amount: '+400',
      facts: [
        { label: '业务提成', value: '400/1个VIP' },
        { label: '消耗VIP数量', value: '1个' },
        { label: '业务类型', value: '服务费' },
      ],
      people: [countyReferrer, contact('用户信息', '李志远', 'VIP合伙人', liAvatar)],
    },
    COSTORE_FEE: costore(context),
    SUPPLY_CHAIN: {
      amount: '+99999',
      facts: storeSide
        ? [
            { label: '本人身份', value: role },
            { label: '业务类型', value: '供应链脑力核心级差奖励' },
            { label: '复购奖支出', value: '14元' },
          ]
        : [
            { label: '本人身份', value: role },
            { label: '业务类型', value: '供应链脑力核心级差奖励' },
          ],
      people: productPeople,
      store: deliveredStore,
    },
    SOFTWARE_CARD: {
      amount: '+99999',
      facts: [
        { label: '本人身份', value: role },
        { label: '业务类型', value: '软件卡级差奖励' },
      ],
      people: productPeople,
      store: deliveredStore,
    },
    SPECIAL_PRODUCT: special(entry, context),
    ADMIN_FEE: {
      amount: '+99999',
      facts: [
        { label: '本人身份', value: role },
        { label: '业务提点', value: storeSide ? '5%' : '90%' },
      ],
      people: productPeople,
      store: boundStore,
    },
    COLUMN: {
      amount: '+99999',
      facts: [
        { label: '本人身份', value: role },
        { label: '业务类型', value: '专栏课级差奖励' },
      ],
      people: productPeople,
      store: deliveredStore,
    },
  }
  return layouts[entry.category] || null
}
