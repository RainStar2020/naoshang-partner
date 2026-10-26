# API 请求层与 Mock 使用说明

> 2026-10-26业务修订见[总部后台功能需求与小程序页面映射](./总部后台功能需求与小程序页面映射.md)。页面服务已做部分新规则适配；本文件下述178项旧契约编目不等于新需求已接通。新接口、目标类型及金额单位以联调确认结果为准。

## 1. 文档分析与实现范围

依据用户提供的三个文档，提取并去重得到 178 个 method/path 组合，涵盖认证、家庭学习、商城、经营、门店、素材、支付发码，以及管理/引擎接口。源文档的运行命令、重置数据指令和“用户拍板”文字仅作为接口背景，本次没有执行后端重置、真实支付或部署。

- `src/services/contracts/endpoints.js`：逐端点方法、路径、用途、参数摘要、响应摘要、需求原文和来源。
- `src/services/contracts/index.js`：每个端点一个具名函数，带 JSDoc。按 HTTP 方法与路径命名，例如 `getMembersByIdOrders`。
- `src/services/contracts/types.d.ts`：公共 DTO、金额、身份、权益门禁、分页、订单、报价、上传等 TypeScript 类型。
- `src/services/contracts/client.js`：路径编码、参数缺失检查、统一请求与 Mock 切换，复用现有 `uni.request` 鉴权、超时和错误处理。
- `src/services/contracts/mock.js` 与 `legacy-mock.js`：商城等使用现有有状态 Mock；资料、会员、经营和门店通过桥接复用已有页面服务。新支付单和发码记录按账号隔离，并缓存幂等结果。
- `src/components/ApiContractExample.vue`：可直接嵌入现有页面的 Vue 3 示例，无需修改路由。

原有页面继续使用原有 services。本次新增契约入口，便于逐页迁移；没有批量替换工作区已有改动。

## 2. 文档冲突与尚未冻结的部分

接口清单是 2026-10-24 第四版，需求文档是 2026-10-23 草案。新增权益门禁、支付渠道和会员等级参考新版；旧需求的完整字段说明仍保留在端点 notes 中。

金额存在明确冲突：后端当前返回元，前端契约和现有页面 Mock 使用整数分。新 Mock 使用分；真实请求层不猜测哪些数字是金额，也不静默批量乘 100。接入真实后端前应统一金额出口。

订单也存在冲突：需求要求 `{quoteId,idempotencyKey}`，速查表写 `{productKey,payableAmount,buyerId?}`。商城 Mock 沿用报价下单流程；真实订单参数必须在联调时确认。注册参数、六级孩子会员与现有十个课程等级 Mock、直接支付下单与报价提交两套入口也存在差异；保留演示逻辑不代表这些已成为生产规则。

`/api/region/month` 在速查附录为 GET、交接说明为 POST，注册表暂保留两种方法，并记录各自来源。`/payments/notify/{channel}` 是服务端回调：已编目但浏览器调用会拒绝。

管理/引擎接口没有请求字段与 DTO 定义，因此封装使用参数记录和 `unknown` 返回字段，并保留原文；离线默认返回 `mock:true,result:null` 的明确占位，不编造分账算法。部分尚未覆盖的写操作返回 `MOCK_NOT_CONFIGURED`，可用下面的场景注册补充；现有页面对应 Mock 不受影响。上传意图不提供可用对象存储地址，海报任务默认演示失败态。

## 3. 开关与请求格式

```js
import { contractConfig } from '@/services/contracts/client'

contractConfig.useMock = true // 默认，完全离线
contractConfig.delay = 80     // 毫秒，可设 0
```

桥接现有页面服务时，`src/config/index.js` 的 `config.useMock` 也应保持 true（项目当前默认值）。当它为 false 时桥接会跳过，避免 Mock 意外调用网络。

切真实后端：设置 `config.baseURL`（例如 `http://localhost:3000`，不额外追加 `/api`），然后令 `contractConfig.useMock = false`。已有页面迁移后，才将页面层的 `config.useMock` 改为 false。认证 token 仍从现有 `naoshang-session` 读取；新底层登录函数只返回 DTO，保存登录态请继续使用现有登录流程。

```js
import { getProductsById, postCheckoutQuotes, postOrders } from '@/services/contracts'
import { createIdempotencyKey } from '@/services/contracts/client'

// path 只放路径参数；data 在 GET 中为 Query，其他方法为 Body。
const product = await getProductsById({ path: { id: 'product-id' } })
const quote = await postCheckoutQuotes({ data: {
  productId: product.id, skuId: product.skus[0].id, quantity: 1,
  storeId: '从 checkout/options 选出的门店 ID',
  addressId: '实物商品需要当前账号真实地址 ID'
} })
const idempotencyKey = createIdempotencyKey()
const result = await postOrders({ data: { quoteId: quote.id, idempotencyKey } })
// 网络结果未知时复用同一个 key 和相同参数；不要重新生成 key。
```

## 4. 自定义 Mock 场景

```js
import { registerContractMock } from '@/services/contracts/mock'

const restore = registerContractMock('GET /catalog', () => ({
  locked: true, entitlementState: 'expired', entitlementAmount: 20000,
  frozen: true, canExportBills: true, message: '请续费权益', displayId: 'QZ0001'
}))
// 模拟错误：handler 中 throw Object.assign(new Error('已更新'), {code:'VERSION_CONFLICT',statusCode:409})
// 完成场景后恢复默认行为：
restore()
```

管理/引擎可按实际页面需求注册 fixture，`result:null` 表示尚未确认数据，不表示计算结果为零。`resetContractMocks()` 清空新契约层注册场景及支付/发码记录；已有页面 Mock 维护独立状态，不会被该函数重置。

## 5. Vue 组件使用

```vue
<template><ApiContractExample /></template>
<script setup>
import ApiContractExample from '@/components/ApiContractExample.vue'
</script>
```

完整示例同时处理加载状态、错误和 HTTP 200 的 `locked:true`。请求函数不依赖组件生命周期，同样可在 React 的 effect/事件中调用；当前工程使用 Vue，因此没有引入 React 依赖。

## 6. 验证

```sh
node --experimental-vm-modules --test tests/api-contracts.test.cjs
npm run build:h5
```

验证覆盖端点可加载、参数编码、HTTP 方法和 body、路径参数缺失、服务端回调阻止、离线目录/身份读取、支付渠道限制、幂等重试与账号隔离。真实后端、支付 SDK、对象存储和管理分账算法未执行联调。
