# API 请求层与 Mock 使用说明

> 更新日期：2026-10-27  
> 依据：当前 uni-app 工程 `src/config`、`src/services`、`src/services/contracts`、`src/services/mock` 与 `tests/`。  
> 配套文档：[`后端API需求文档.md`](./后端API需求文档.md)（接口需求）；本文件只讲**怎么发请求、怎么开/关 Mock**。

## 目录

1. [两层请求架构](#1-两层请求架构)
2. [全局配置开关](#2-全局配置开关)
3. [双 Mock 开关（务必分清）](#3-双-mock-开关务必分清)
4. [页面请求层 `api.js`](#4-页面请求层-apijs)
5. [契约层 `callEndpoint`](#5-契约层-callendpoint)
6. [Mock 实现与桥接](#6-mock-实现与桥接)
7. [鉴权与本地 session](#7-鉴权与本地-session)
8. [金额单位与幂等键](#8-金额单位与幂等键)
9. [切到真实后端的步骤](#9-切到真实后端的步骤)
10. [自定义 Mock 场景](#10-自定义-mock-场景)
11. [示例组件](#11-示例组件)
12. [相关测试](#12-相关测试)
13. [常见踩坑](#13-常见踩坑)

---

## 1. 两层请求架构

当前前端有**两套并行入口**，不要混用开关：

| 层 | 目录 / 入口 | 谁在用 | Mock 开关 |
|---|---|---|---|
| **页面服务层** | `src/services/*.js`（如 `commerce.js`、`auth.js`、`business.js`）+ `src/services/mock/*` | 现有页面几乎全部走这里 | `config.useMock`（`src/config/index.js`） |
| **契约层** | `src/services/contracts/`（`endpoints.js` ≈ 196 条、`index.js` 具名包装、`client.js`） | 逐页迁移 / 联调新接口；`ApiContractExample.vue` | `contractConfig.useMock`（`contracts/client.js`） |

页面服务层模式（示意）：

```js
// commerce.js 等
const result = config.useMock
  ? mock.mockCatalog()
  : await request('/catalog')
```

契约层模式：

```js
import { getCatalog, postOrders } from '@/services/contracts'
import { createIdempotencyKey } from '@/services/contracts/client'

const catalog = await getCatalog() // 内部 callEndpoint('GET /catalog', input)
```

完整端点清单以 `src/services/contracts/endpoints.js` 为准（约 **196** 条 `method + path`）；需求语义见《后端API需求文档》。

---

## 2. 全局配置开关

文件：`src/config/index.js`（当前默认值）：

```js
export const config = {
  useMock: true,                      // 页面服务层 Mock：默认开
  mockWholesalePartnerStatus: 'NONE', // 批发 Mock 合伙人状态演示值
  baseURL: '',                        // 真实 API 根地址；空则真实请求直接失败
  timeout: 15000,                     // uni.request 超时（毫秒）
  previewAllExclusiveFeatures: true,  // Mock 下预览全部甄选入口
  previewAllBusinessFeatures: true,   // Mock 下预览全部经营工具
}
```

### 各字段含义

| 字段 | 作用 |
|---|---|
| `useMock` | `true`：页面服务走 `src/services/mock/*`，不发 HTTP。`false`：走 `request()`，必须先配 `baseURL`。 |
| `baseURL` | 拼在 path 前面，**不要**再加多余 `/api`（契约 path 已含完整路径，如 `/catalog`、`/auth/sessions`）。为空时真实请求会抛「请先配置 API 地址」。 |
| `timeout` | 传给 `uni.request`。 |
| `previewAllExclusiveFeatures` | 仅当 **同时** `useMock === true` 时，`visibleExclusiveFeatures` 忽略服务端能力，展示全部甄选入口（见 `src/features/exclusive/catalog.js`）。 |
| `previewAllBusinessFeatures` | 仅当 **同时** `useMock === true` 时，`businessPreview` / `visibleBusinessTools` 展示该模块全部工具（见 `src/features/business/catalog.js`）。 |
| `mockWholesalePartnerStatus` | 批发 Mock 概览默认合伙人状态；可被账号 `displayId` 等级或 state 覆盖。 |

> **生产注意**：以上 Mock / preview 当前默认全开。正式构建前必须关掉 `useMock` 与两个 `preview*`，并配置真实 `baseURL`。工程暂无环境变量拆分（无 `.env`），改配置靠改 `src/config/index.js` 或自行接 Vite `import.meta.env`。

---

## 3. 双 Mock 开关（务必分清）

契约层另有独立开关：

```js
// src/services/contracts/client.js
export const contractConfig = { useMock: true, delay: 80 }
```

| 组合 | 行为 |
|---|---|
| `config.useMock = true` 且 `contractConfig.useMock = true` | 页面 Mock + 契约 Mock 都走本地；契约里部分路由通过 `legacy-mock.js` **桥接**回页面服务 Mock（有状态）。 |
| `contractConfig.useMock = true`，`config.useMock = false` | 契约层仍离线；但 `legacyMock` 一进桥接就返回 `NO_LEGACY_MOCK`（桥接强制要求 `config.useMock`），这些路由落到契约自有 fixture / `MOCK_NOT_CONFIGURED`。页面服务则已打真实 HTTP。 |
| 两者皆 `false` | 契约 `callEndpoint` 与页面 `request` 都打 `config.baseURL`；`baseURL` 为空会立刻抛错。 |

**推荐联调顺序**

1. 先只把要迁移的页面改为调契约函数，保持两边 `useMock = true` 验证 UI。  
2. 配好 `baseURL` 后，先关 `contractConfig.useMock`，再逐步关页面层 `config.useMock`。  
3. 两个 `preview*` 在关 `useMock` 后自动失效；接真权限后应依赖服务端 `capabilities`，不要依赖预览开关。

---

## 4. 页面请求层 `api.js`

文件：`src/services/api.js`。

### `request(path, options)`

- URL：`config.baseURL + path`
- Header：若本地 session 有 `token`，自动加 `Authorization: Bearer <token>`
- 超时：`config.timeout`
- `401`：调用 `logout()`（清 session、回登录页）并 reject
- 非 2xx：把 body 的 `error` / `message` / `code` / `requestId` / `fieldErrors` / 验证码锁定字段挂到 Error 上

页面业务文件（`commerce.js`、`business.js`、`auth.js` 等）统一：`config.useMock ? mockXxx(...) : request(...)`。写操作多数要求调用方传入 `idempotencyKey`。

### 登录相关（页面层）

- `login` / `registerAccount` 等在 Mock 下写入本地 session：`token: 'demo-local-token'`，用户 `VIP0001`
- Mock 短信验证码固定 **`123456`**（弹窗提示，不发真短信）
- Mock 下健脑官渠道登录会被拒绝（「请联系门店开通健脑官账号」）
- 微信：Mock 弹窗模拟授权；真机 H5 / 小程序走 `/auth/wechat/*`

---

## 5. 契约层 `callEndpoint`

文件：`src/services/contracts/client.js`。

```js
export async function callEndpoint(key, input = {}) {
  // key 形如 "GET /catalog" / "POST /orders"
  // 1. 查 endpoints 注册表
  // 2. serverOnly（如支付回调）直接拒绝前端调用
  // 3. 用 input.path 替换 {id} 等路径参数（缺参抛错；值会 encodeURIComponent）
  // 4. contractConfig.useMock → 可选 delay → mockEndpoint(...)
  // 5. 否则校验 config.baseURL，再 request(path, { method, data: input.data })
}
```

约定：

- **`input.path`**：仅路径参数  
- **`input.data`**：GET 为 Query，其它方法为 Body  
- 具名导出见 `contracts/index.js`（如 `getProductsById`、`postCheckoutQuotes`、`postOrders`）  
- `createIdempotencyKey()` → ``intent-${Date.now()}-${random}``

适配器（无副作用）：`contracts/v3.js` 提供 `apiTimestamp`、`entitlementGate`、`allocationKind`、`validAllocationQuote`、`paymentNextStep`（区分 sandbox 轮询 / 真实 invoke / 成功完结）。

类型：

- `types.d.ts`：旧页面 / Mock DTO（金额多为**分**）  
- `v3-types.d.ts`：新对接文档 DTO（`Yuan` / `Cents` 显式区分，**禁止全局 ×100**）

---

## 6. Mock 实现与桥接

### 6.1 页面 Mock

目录：`src/services/mock/`（`commerce.js`、`business.js`、`business-operations.js`、`learning.js`、`wholesale.js`、`profile.js`、`training.js` 等）。按账号 / context 有状态，订单、支付、名额等会话内可累积。

### 6.2 契约 Mock

`contracts/mock.js`：

1. 若有 `registerContractMock` 覆盖 → 用覆盖  
2. 否则 `legacy-mock.js` 桥接页面服务（仅当 `config.useMock === true`）  
3. 否则内置 fixture（认证、目录、订单、支付、发码、权益单等）  
4. `/api/*`、`/admin/*` 引擎类无 DTO 的返回 `{ mock:true, result:null, ... }` 占位  
5. 未配置的写操作 → `MOCK_NOT_CONFIGURED`（501），避免假成功入账

支付 / 发码等按 **账号 id** 隔离；带 `idempotencyKey` 的写操作在同会话内可重放，参数不一致则 `IDEMPOTENCY_CONFLICT`（409）。

### 6.3 `legacy-mock.js` 要点

注释写明：**Never let this bridge send HTTP**。桥接覆盖资料、家庭会员、素材、健脑官培训、门店、经营报表 / overview、提现与划拨报价提交、合店申请等。`config.useMock === false` 时整桥关闭。

---

## 7. 鉴权与本地 session

| 项 | 说明 |
|---|---|
| Storage key | `naoshang-session` |
| 结构 | `{ token, user: { id, name, displayId, role, ... }, accountType?: 'parent' \| 'coach' }` |
| 写入 | `api.login`、`auth.registerAccount` / `saveSession`；资料更新可能改写 `user.name` / `region` |
| 读取 | `getSession()`；Mock 下若 id 为 `LC0001` 会映射成 `VIP0001`（兼容旧演示数据） |
| 登出 | `logout()` 清 session、清学习身份缓存、`reLaunch` 登录页 |
| 路由闸门 | `useAuth` → 无 session 回登录；健脑官用 `account-channel` 白名单限页 |
| 真实请求 | Bearer token；**当前无 bootstrap/`/me` 启动校验**，接真后建议启动拉一次服务端身份 |

其它本地 key（节选）：`naoshang-learning-identity:<userId>`、`naoshang-wechat-state`、经营操作进行中的 idempotency 缓存等。

---

## 8. 金额单位与幂等键

### 金额

文档与代码**尚未逐字段冻结**（详见《后端API需求文档》§3.1）：

- 旧 Mock / 商城展示字段常见 **分**（整数）  
- 新对接类型 `v3-types`：业务金额 `Yuan`，展示价 `Cents`  
- `v3.js`：**禁止**对所有数字字段统一 ×100 / ÷100  
- 契约 Mock 权益费演示值：`20000`（分语义）/ 年度 `198000` 等，仅演示

联调前与后端书面确认每个字段单位，并加契约测试，不要在 request 层静默换算。

### 幂等键

- 下单、支付、激活、经营提交、申请类写操作需要 `idempotencyKey`  
- 生成：`createIdempotencyKey()` 或业务侧自建；**同一意图重试必须复用同一 key + 相同参数**  
- Mock：同 key 不同参数 → 409；失败会清掉该 key 以便重试

---

## 9. 切到真实后端的步骤

1. 在 `src/config/index.js` 设置例如：  
   `baseURL: 'https://api.example.com'`（或本地 `http://localhost:3000`），**不要**重复追加 `/api`。  
2. `contractConfig.useMock = false`（若页面已迁契约）。  
3. 页面层改为调真实接口后：`config.useMock = false`。  
4. `previewAllExclusiveFeatures` / `previewAllBusinessFeatures` 设为 `false`（或依赖关 Mock 后自动不预览）。  
5. 用真实账号走登录；确认 session 的 `token` / `accountType` / `displayId` 来自服务端。  
6. 支付：看 `paymentNextStep`——sandbox 只轮询；live 才调起渠道 SDK（前端不得伪造入账通知；`/payments/notify/{channel}` 为 `serverOnly`）。  
7. 跑第 12 节测试 + `npm run build:h5`（及目标小程序 build）。

**构建注意**：无 `.env` 分环境；若用 CI，建议增加「生产禁止 `useMock === true`」断言。H5 / 微信小程序的跨域、合法域名、appid 需在对应平台单独配置，与本 Mock 开关无关。

---

## 10. 自定义 Mock 场景

```js
import { registerContractMock, resetContractMocks } from '@/services/contracts/mock'

const restore = registerContractMock('GET /catalog', () => ({
  locked: true,
  entitlementState: 'expired',
  entitlementAmount: 20000,
  frozen: true,
  canExportBills: true,
  message: '请续费权益',
  displayId: 'QZ0001',
}))

// 模拟错误：
// throw Object.assign(new Error('已更新'), { code: 'VERSION_CONFLICT', statusCode: 409 })

restore()           // 去掉该 key 的覆盖
resetContractMocks() // 清空契约层覆盖 + 支付/发码会话状态（不影响页面 mock 目录里的独立状态）
```

管理 / 引擎接口无 DTO 时，用 `registerContractMock` 注入页面所需 fixture；`result: null` 表示「未确认」，不是「计算结果为零」。

---

## 11. 示例组件

`src/components/ApiContractExample.vue`：调用 `getCatalog` + `getMeBootstrap`，处理 loading / 错误 / `locked:true`。

```vue
<template><ApiContractExample /></template>
<script setup>
import ApiContractExample from '@/components/ApiContractExample.vue'
</script>
```

可嵌现有页，不必改路由。契约函数不依赖组件生命周期，页面 / 组合式函数里可直接 `await`。

---

## 12. 相关测试

`package.json` 未提供统一 `npm test`；按域执行：

```sh
# 契约层：端点加载、路径编码、方法/body、缺参、serverOnly、离线目录/支付幂等与账号隔离
node --experimental-vm-modules --test tests/api-contracts.test.cjs

# 新适配器：错误字段保留、timestamp/gate/allocation/payment、上传
node --experimental-vm-modules --test tests/api-latest.test.cjs

# 鉴权：改密 Mock 不声称真改密、邀请码、注册短信、重置凭证、微信绑定
npm run test:auth

# 其它页面域
npm run test:commerce
npm run test:business
npm run test:exclusive
npm run test:profile
npm run test:materials
npm run test:learning
npm run test:wholesale

npm run build:h5
```

另有 `tests/account-channel.test.cjs`（健脑官路由闸门），可直接用 `node --experimental-vm-modules --test` 跑。

---

## 13. 常见踩坑

1. **只关了 `contractConfig.useMock`，忘了关 `config.useMock`** → 页面仍全 Mock，联调像「半真半假」。  
2. **`baseURL` 为空就关 Mock** → `request` / `callEndpoint` 立即抛配置错误。  
3. **`baseURL` 末尾不要重复加 path 前缀**；端点已是 `/auth/sessions` 这种绝对 path。  
4. **预览开关不能当权限**：`previewAll*` 只在 Mock 下扩入口；生产必须靠服务端 `capabilities`。  
5. **金额不要在客户端统一换算**；按字段对齐 Yuan/Cents。  
6. **支付回调不能从前端调**；`serverOnly` 端点会抛错。  
7. **幂等键不要每次重试都新建**；网络不明时复用原 key。  
8. **`resetContractMocks()` 清不掉** `src/services/mock/*` 里页面状态；两套状态彼此独立。  
9. **鉴权只认本地 session**：关 Mock 后仍应做服务端 bootstrap，支付 / 提现以服务端为准。

---

## 附录：关键文件速查

| 路径 | 用途 |
|---|---|
| `src/config/index.js` | `useMock` / `baseURL` / preview / timeout |
| `src/services/api.js` | `request`、`getSession`、`login`、`logout` |
| `src/services/auth.js` | 注册 / 短信 / 微信 / 改密（页面层） |
| `src/services/contracts/client.js` | `callEndpoint`、`contractConfig`、`createIdempotencyKey` |
| `src/services/contracts/endpoints.js` | ≈196 条端点元数据 |
| `src/services/contracts/index.js` | 具名 API 包装 |
| `src/services/contracts/mock.js` | 契约 Mock + 场景注册 |
| `src/services/contracts/legacy-mock.js` | 桥接页面 Mock（禁 HTTP） |
| `src/services/contracts/v3.js` / `v3-types.d.ts` | 新文档适配与类型 |
| `src/services/mock/*` | 页面有状态 Mock |
| `src/composables/useAuth.js` | 进页鉴权 |
| `src/services/account-channel.js` | parent / coach 首页与路由白名单 |
| `src/components/ApiContractExample.vue` | 契约调用示例 |