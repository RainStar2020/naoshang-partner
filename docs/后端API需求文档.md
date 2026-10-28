# 前端 / 当前项目对后端 API 的需求（基于 naoshang-partner uni-app 现状）

> **文档版本**：2026-10-27  
> **整理依据**：本地仓库 `E:\project\uni\naoshang-partner` 当前逻辑（`src/pages.json`、`src/services/`、`src/services/contracts/`、`src/features/`、`src/config/index.js`），并合并了仍准确的《前端对接API文档-2026-10-27》与《2026-10-27-对接复核与同步记录》要点。  
> **用途**：给后端实现与前后端联调的「前端真实需要什么」；不是完整 Swagger，也不是 Mock 演示数据说明。  
> **完整端点清单**：以 `src/services/contracts/endpoints.js`（当前约 **196** 条）为权威库存；本文按业务域归组，只列页面/服务层实际会打到或能力目录强依赖的接口。

---

## 目录

1. [范围与项目快照](#1-范围与项目快照)
2. [全局约定](#2-全局约定)
3. [已知阻塞项（接真后端前必闭合）](#3-已知阻塞项接真后端前必闭合)
4. [认证与会话](#4-认证与会话)
5. [个人中心、资料与客服](#5-个人中心资料与客服)
6. [家庭会员与学习](#6-家庭会员与学习)
7. [商城、订单与支付](#7-商城订单与支付)
8. [联营经营（批发 / 合店 / 代理）](#8-联营经营批发--合店--代理)
9. [专属能力入口](#9-专属能力入口)
10. [门店、健脑官与训练](#10-门店健脑官与训练)
11. [钱包与提现](#11-钱包与提现)
12. [素材库与上传](#12-素材库与上传)
13. [管理端 `/api/*` 说明](#13-管理端-api-说明)
14. [联调验收建议](#14-联调验收建议)

---

## 1. 范围与项目快照

### 1.1 技术栈与入口

| 项 | 现状 |
|---|---|
| 工程 | uni-app（Vue 3 + Vite），目标 H5 / 微信小程序 |
| Tab | 会员 / 联营 / 甄选 / 我的（`pages/member`、`partners`、`selection`、`profile`） |
| 页面数 | `pages.json` 约 70 个路由 |
| 配置 | `src/config/index.js`：`useMock: true`，`previewAllExclusiveFeatures: true`，`previewAllBusinessFeatures: true`，`baseURL: ''` |
| 鉴权门闸 | `composables/useAuth.js`：仅检查本地 `naoshang-session`；健脑官路由白名单在 `account-channel.js` |
| 契约层 | `services/contracts/`（`endpoints.js` / `client.js` / `v3.js` / `v3-types.d.ts` / mock） |
| 业务服务 | `auth`、`commerce`、`learning`、`members`、`business*`、`exclusive`、`profile`、`materials`、`training*` 等 |

### 1.2 服务层 ↔ 页面主映射

| 域 | 主要页面 | 主要服务 |
|---|---|---|
| 登录注册 | `login` / `register` / `forgot-password` | `auth.js`、`api.js` |
| 我的 | `profile`、`settings*`、`address*`、`coupon`、`support` | `profile.js`、`exclusive.js` |
| 学习 / 家庭会员 | `member`、`learning/*`、`members/*`、`column` | `learning.js`、`lesson.js`、`members.js` |
| 商城交易 | `selection`、`product`、`order/*`、`payment/cashier` | `commerce.js` |
| 联营经营 | `partners`、`partner/*`、`costore/*`、`agency/*`、`income/*`、`wallet/*` | `business.js`、`business-operations.js`、`partner.js` |
| 门店 / 健脑官 | `store/*`、`coach`、`feedback/*` | `business-store.js`、`training.js` |
| 素材 | `partner/materials`、`material-edit` | `materials.js`、`training-assets.js` |
| 申请 | `application/costore`、`application/agency`、`application/list` | `exclusive.js`、`agency-application.js` |

### 1.3 能力目录（前端不自行推断权限）

- **专属入口**（`features/exclusive/catalog.js`）：健脑官工作台、创始奖、申请合店、代理推广码、会员管理。可见性 = Mock 预览全开 **或** `exclusiveAccess.capabilities` 命中。
- **经营工具**（`features/business/catalog.js`）：三大模块 `wholesale` / `costore` / `agency`，工具带 `capability`（如 `wholesale:income`）与默认 `endpoint`。可见性 = Mock 预览全开 **或** 当前 `businessContext.capabilities` 命中。批发首页快捷入口还会按 `partnerStatus`（如 ANGEL）裁剪。

后端必须下发真实 `capabilities`；前端预览开关**不能**当作生产授权。

---

## 2. 全局约定

### 2.1 请求与鉴权

- 路径相对 API BaseURL（`config.baseURL`）；不预设网关版本前缀。
- 除登录、短信、注册、找回密码、微信授权、公开协议外，默认 `Authorization: Bearer <token>`。
- GET 参数放 Query；POST/PATCH/PUT 放 JSON Body。
- 经营类接口普遍需要 **`contextId`**（形如 `partner:<userId>` / `costore:<userId>` / `agency:<userId>`；历史文稿偶见 `wholesale`，请与后端统一 module 命名及权限字符串）。
- 写操作普遍需要 **`idempotencyKey`**；带版本资源需要 **`version`**；分页统一 **`{ items, hasMore, nextCursor }`**（`hasMore=true` 时必须有有效 `nextCursor`）。

### 2.2 响应形态

当前 `services/api.js` 的 `request()` **直接把响应 JSON 当业务 DTO**。若后端统一包一层 `{ code, data, message }`，需改适配层解包。错误响应前端已兼容 `{ error }` 与旧 `{ message }`，建议同时带 `code` / `fieldErrors` / `requestId`。

建议 HTTP：400/422 参数错误，401 失效，403 无权限，404 不存在，409 版本/状态/幂等冲突，429 限流。

### 2.3 经营写操作「三段式」

划拨、购买 VIP、升级、年度权益、绑店、提现、提点分配等统一：

1. **options** — 拉可选项 / 规则 / `allowedActions`
2. **quotes** — 服务端试算，返回带过期时间的 `quoteId`
3. **commit** — 提交 `quoteId` + `idempotencyKey`（及必要的 context）

前端已在 `business-operations.js` 固化该模式；**改业务参数必须重新报价**，不能复用旧 quote。

### 2.4 时间

部分字段为毫秒时间戳，部分为 ISO 字符串。客户端 `contracts/v3.js` 已做兼容解析；联调请逐步统一并在字段级注明。月筛选建议 `YYYY-MM`，统计时区建议 Asia/Shanghai。

### 2.5 类型与契约库存

- **权威清单**：`src/services/contracts/endpoints.js`（约 196 条 method+path）。
- **新版类型**：`v3-types.d.ts`（含 `Yuan` / `Cents` 分离、支付分流、分配、门禁、14 类收益 `bizDetail` 等）。
- **旧类型** `types.d.ts`：标注为旧页面 / Mock DTO，**不要**当新契约。
- 契约里仍保留一批 **`/api/*` 管理端** 入口（见第 13 节），小程序业务路径不要混用。

---

## 3. 已知阻塞项（接真后端前必闭合）

以下直接来自 2026-10-27 对接复核，并与当前源码现状对齐。

### 3.1 金额单位未逐字段冻结（全局阻塞）

| 来源 | 说法 |
|---|---|
| 对接文档 §0 | 「金额单位为**元**，前端不要乘 100」 |
| 商品展示特例 | `standardAmount` / `memberPrices` / `rolePrices` / `skus.amount` 为**分**，`prices` 为**元** |
| 前端 Mock / 旧页面 | 商城订单等多处按**分**校验（如 `payableAmount` 整数分）；提现输入有乘 100 习惯 |
| 类型层 | `v3-types.d.ts` 同时定义 `Yuan` 与 `Cents` |

**需求**：为 checkout / order / coupon / withdrawal / metrics / 专栏 price / 支付 amount 等提供**逐字段单位表**，或在响应中带 `moneyUnit`。在未闭合前，**禁止**按「全部改成元」粗暴切真实接口。

### 3.2 Mock / 预览默认全开

`config.useMock`、`previewAllExclusiveFeatures`、`previewAllBusinessFeatures` 当前均为 `true`。Mock 登录任意合法手机号 + ≥6 位密码即可进。生产构建必须强制关闭；权限只能来自服务端 capabilities。

### 3.3 鉴权只认本地 session

`useAuth` / `getSession` 只读本地 storage。接真后启动应调 **`GET /me/bootstrap`**（及必要的 `/me`），校验 token、权益门禁 `gate` / `locked`、经营与家庭 contexts；支付、提现、划拨等**必须以服务端结果为准**。当前退出多半只清本地；契约已列 **`DELETE /auth/sessions/current`**，真后端应支持撤销 token。

### 3.4 其它仍需后端书面确认

1. **下单默认 paid**：对接文称不传 `payLater` 可直接 paid，与生产 live「须渠道回调成功才认付」冲突。前端新建单应明确 `payLater: true`；后端需说明 live 是否禁止免支付建单及状态枚举大小写。
2. **门店与分润归属**：结算页选的 `storeId` 是否仅记录、不参与分润；最终归属字段（region / deliveryStore / storeId）须由后端定义。
3. **报价时间与提交最小字段**：ISO vs 毫秒、带 `quoteId` 是否还要回传业务组合——按端点给出最小必填。
4. **两套「权益」勿串**：合伙年度权益（`/partner/entitlement-*`，历史样例约 1980）vs 个人收益权益（`/me/entitlement-orders`，历史样例约 200）须分 scene。
5. **收益 bizType key**、inspection/inspect 命名、升级服务费样例（活动名额×2000 vs 样例 300）统一。
6. **真实支付 invoke 字段**与**对象存储上传**联调环境（签名方法、完成响应、私有资源访问）。

---

## 4. 认证与会话

**页面**：`pages/login`、`register`、`forgot-password`、`settings/change-password`  
**服务**：`auth.js`、`api.js`（登录）、`invitation.js`（邀请码捕获）

| 方法 | 路径 | 用途 | 前端要点 |
|---|---|---|---|
| POST | `/auth/sessions` | 登录 | `channel`: `parent` 需 `phone`+`password`；`coach` 需 `loginAccount`+`password`。返回 `token`、`user`、`accountType`（`parent`/`coach`）、可选 `entitlement`、`expiresAt` |
| POST | `/auth/sms-challenges` | 发短信 | `purpose`: `register` \| `reset-password`；返回 `retryAfter`（秒） |
| POST | `/auth/registrations` | 注册 | `phone`、`code`、`password`、`regionCodes`；可选 `inviteCode`；微信场景条件必填 `wechatTicket` |
| POST | `/auth/password-reset-verifications` | 校验重置码 | → `resetTicket` |
| POST | `/auth/password-resets` | 重置密码 | `resetTicket` + `password` |
| POST | `/me/password-changes` | 改密 | `oldPassword` + `newPassword` |
| POST | `/auth/wechat/authorizations` | H5 授权入口 | `redirectUri`，可选 `inviteCode` → `{ url, state }` |
| POST | `/auth/wechat/exchanges` | 换票 | `code`、`platform`（`h5`/`mp-weixin`）→ 注册票据（映射为 wechatTicket）；已绑定是否直接登录仍需确认 |
| GET | `/me/bootstrap` | **启动身份集合** | 家庭 contexts + businessContexts + entitlement/gate；经营上下文须含 module、capabilities，合店含 storeId/contractId，代理含 assignmentId/agencyType |
| DELETE | `/auth/sessions/current` | 登出撤销 | 建议实现；前端目前主要清本地 |

**Mock vs 真**：Mock 不校验真实短信/微信；任意合法手机即可登录。真后端需限流、一次性验证码、邀请码防自绑、微信 redirect 白名单。

---

## 5. 个人中心、资料与客服

**页面**：`profile/index`、`settings/*`、`address/*`、`coupon/list`、`support/feedback`  
**服务**：`profile.js`、`exclusive.js`（读 `/me` 拿专属能力）

| 方法 | 路径 | 用途 |
|---|---|---|
| GET/PATCH | `/me` | 资料、门店摘要、订单角标、客服、exclusiveAccess |
| GET/POST/PATCH/DELETE | `/addresses`、`/addresses/{id}` | 地址 CRUD |
| PUT | `/addresses/default` | 设默认 |
| GET | `/coupons` | `status=available\|used\|void` |
| GET | `/support/config` | 客服电话与反馈限制 |
| POST | `/support/feedback` | 意见反馈（内容 + 可选图片 assetId + 幂等键） |
| GET | `/agreements/{type}` | `user` / `privacy` 协议正文 |

**Mock vs 真**：订单角标、优惠券可用性必须以服务端为准；删除默认地址后的规则需后端定义。

---

## 6. 家庭会员与学习

**页面**：`member/index`、`members/list|detail|records`、`learning/*`、`column/detail`  
**服务**：`members.js`、`learning.js`、`lesson.js`、`commerce.js`（专栏）

### 6.1 家庭会员

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/members/options` | 字典（年级等） |
| GET/POST/PATCH | `/members`、`/members/{id}` | 孩子列表与编辑 |
| GET | `/members/{id}/orders` | 孩子相关订单（健脑官/家长视图） |
| GET | `/members/{id}/training-feedback` 等 | 训练反馈入口 |
| POST | `/activations/preview`、`/activations` | 激活码预览与提交（会员 / 等级共用能力） |

### 6.2 学习与公告

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/me/bootstrap` | 学习身份列表（parent/child contexts） |
| GET | `/learning/levels`、`/learning/levels/{levelId}` | 等级与权益详情 |
| GET | `/announcements`、`/announcements/{id}` | 公告榜 / 详情；前端另有已读调用 `/announcements/{id}/read`（若契约未单列，请确认别名或补齐） |
| GET | `/lessons/{chapterId}` | 图文/视频课内容 |
| GET/PUT | `/columns`、`/columns/{id}`、学习进度 | 专栏详情与进度 |
| POST | `/activations`（`targetType: column`） | 专栏激活码 |

**规则提醒**：Account、Member、学习权益必须分模型；`memberId` 不可与登录账号 id 混用。激活、进度写入均需鉴权与归属校验。

**Mock vs 真**：等级解锁、激活码库存与核销状态均为 Mock；接真后预览开关不得绕过未购等级。

---

## 7. 商城、订单与支付

**页面**：`selection/index`、`product/detail`、`order/confirm|list|detail`、`payment/cashier`、`column/detail`  
**服务**：`commerce.js`

### 7.1 浏览与结算

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/catalog` | 分类 + 商品列表 |
| GET | `/products/{id}` | 详情（注意分/元混用展示字段） |
| GET | `/checkout/options` | 可选门店、会员、地址、券 |
| POST | `/checkout/quotes` | 报价（库存/优惠/应付由服务端算） |
| POST | `/orders` | `quoteId` + `idempotencyKey`（建议显式 `payLater: true`） |

前端对订单 DTO 的硬校验（Mock/真共用）：`order.id`、`items[]`、`allowedActions[]`、**`payableAmount` 为非负安全整数**（当前按分语义写的）。单位闭合前不要改校验口径。

### 7.2 订单生命周期

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/orders`、`/orders/{id}` | 列表 / 详情（含 `serverTime`） |
| POST | `/orders/{id}/cancellations` 或服务层现用 `/orders/{id}/cancel` | 取消（`version` + 幂等键） |
| POST | `/orders/{id}/receipts` 或 `/orders/{id}/confirm-receipt` | 确认收货 |
| GET | `/orders/{id}/payment-channels` | 按订单+平台返回可用渠道 |

> 契约倾向 RESTful 子资源名；`commerce.js` 真请求仍可能打 `cancel` / `confirm-receipt`。**联调需约定别名或改服务层对齐**。

### 7.3 支付

| 方法 | 路径 | 用途 |
|---|---|---|
| POST | `/payments/attempts` | `orderId` + `channel` + `idempotencyKey` → attempt；需补齐各平台 `payParams.invoke` |
| GET | `/payments/attempts/{id}` | 状态：`PROCESSING` / `SUCCEEDED` / `FAILED` / `CANCELLED` |
| POST | `/payments/notify/{channel}` | 渠道回调（仅后端） |
| （沙箱） | `/orders/{id}/payment`、`/me/payments/*/sandbox-confirm` | 仅联调；生产必须 `paymentMode: live` |

前端支付态机会本地记住 attempt，换渠道重试有冲突保护；`v3.js` 区分 complete / poll / invoke，**不擅自调 SDK**。

**Mock vs 真**：Mock 可直接成功；真实微信/支付宝字段与取消/失败范例仍缺。

---

## 8. 联营经营（批发 / 合店 / 代理）

**页面**：`partners/index`；批发 `partner/*`；合店 `costore/*`；代理 `agency/*`；收益 `income/*`  
**服务**：`business.js`、`business-operations.js`、`partner.js`、`exclusive.js`（分红只读等）

### 8.1 上下文与总览

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/me/bootstrap` | `businessContexts[]` |
| GET | `/partner/overview` | 批发总览（等级、名额摘要、入口状态等） |
| GET | `/costore/overview` | 合店总览 |
| GET | `/agency/overview` | 代理总览 |

`withBusinessContext` 会校验登录未变、context 归属及 capability，再执行读/写。

### 8.2 批发工具对应接口（与 catalog 对齐）

| 工具 | 页面 | 主接口 |
|---|---|---|
| 收益 | `partner/income` | `GET /partner/income`；明细走 `GET /income/entries` |
| 上级 | `partner/superior` | `GET /partner/superior`；绑定 `POST /partner/superior-bindings` |
| 分享码 | `partner/share` | `GET /promotion/share-code` |
| 素材库 | `partner/materials` | 见第 12 节 |
| 全球奖 | `partner/global-awards` | `GET /partner/global-awards` |
| 晋升任务 | `partner/promotion` | `GET /partner/promotion-tasks`；领取 `GET/POST /partner/promotion-claims` |
| 经验明细 | `partner/experience` | `GET /partner/experience-ledger`（及 summary） |
| 团队 | `partner/team` | `GET /partner/team` |
| 进货/划转明细 | `quota-ledger` / `quota-transfers` | `GET /partner/quota-ledger` |
| 活动 VIP | `quota-batches` | `GET /partner/quotas` |
| 划拨名额 | `quota-transfer` | options → quotes → `POST /partner/quota-transfers` |
| 购买 VIP | `quota-purchase` | options → quotes → `POST /partner/quota-orders`（`purchaseMode=PAYMENT` 才可下单） |
| 开通/升级 | `upgrade` | options → quotes → `POST /partner/upgrades`（支付成功后扣名额授级） |
| 年度权益 | `entitlement` | options → quotes → `POST /partner/entitlement-orders` |
| 绑定门店 | `bind-store` | options → quotes → `POST /partner/store-bindings` |

名额需支持**标准 / 活动双余额**；活动名额升级服务费规则以后端最终口径为准（样例冲突见 §3.4）。

### 8.3 合店 / 代理只读与分红

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/income/entries`、`/income/entries/{id}` | 合店/代理收益账；详情需稳定 `bizType` + 可渲染明细（建议直接给 `detailText`） |
| GET | `/costore/card-dividends`、`/costore/promotion-dividends` | 会员卡/推广分红 |
| GET | `/agency/team`、`/agency/team/{id}` | 区域团队 |
| GET | `/income/biz-types` | 收益类型字典（与详情 key 必须一致） |
| GET | `/income/store-income-rules` | 门店拨比规则（门店收益 ≠ 合店老板收益，两条账） |

### 8.4 提点分配

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/income/entries/{id}/allocation-options` | 可分配对象；`fixed` 方案应隐藏自选入口 |
| POST | `/income/entries/{id}/allocation-quotes` | 试算；识别 HTTP 200 且 `valid:false` |
| POST | `/income/entries/{id}/allocations` | 提交（`quoteId` + 幂等；字段含 agentId/percent/allocationKind/targets 等） |
| POST | `.../allocations/{allocationId}/revoke` | 撤销 |

---

## 9. 专属能力入口

**页面**：`coach/index`、`profile/founder-awards`、`application/costore`、`promotion/agency-code`、`members/list`、`application/list`  
**能力**见 `exclusive/catalog.js`；数据来自 `GET /me` 的 `exclusiveAccess` 或 bootstrap。

| 能力 | 主接口 |
|---|---|
| `founder-awards:read` | `GET /founder-awards` |
| `costore:apply` | `GET /costore/application-options` → `POST /costore/application-quotes` → `POST /applications/costore` |
| `agency-code:read` | `GET /promotion/agency-code` |
| 代理申请页 | `GET /promotion/invitations/{promotionId}` →（可选 quotes）→ `POST /agency/applications` |
| 我的申请 | `GET /applications` |
| `family-members:manage` | 见第 6 节 |
| `coach:read` | 见第 10 节 |

合店申请前端会本地记住 quote + 协议版本 + 幂等键，防重复提交。

---

## 10. 门店、健脑官与训练

**页面**：`store/index`、`store/transfer-apply`、`coach/index`、`feedback/*`、`members/detail`（教练侧）  
**服务**：`business-store.js`、`training.js`；教练路由白名单见 `account-channel.js`

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/agency/store-workspace` | 代理侧门店工作台 |
| GET/PATCH | `/stores`、`/stores/{id}` | 门店信息 |
| POST/PATCH | `/stores/{storeId}/coaches`、`.../coaches/{id}` | 健脑官任命/更新 |
| POST | `/stores/{storeId}/orders/{orderNo}/verify` | 核销（本店授权、已付才可核；失败次数/锁定需可查询） |
| GET | `/coach/workspace` | 健脑官工作台 |
| GET/PATCH | `/members/{id}/store-profile`、`/members/{id}/training` | 学员门店档案与训练 |
| GET/POST | `/training-feedback`、`/training-feedback/{id}` | 反馈列表/详情/新建 |
| GET/POST | `/store-transfer/options`、`/store-transfer/applications` | 转店 |
| POST | `/applications/{id}/decisions` | 门店侧审批申请 |

健脑官使用 `channel: coach` 登录，**不得**从家长角色前端推导任职。

---

## 11. 钱包与提现

**页面**：`wallet/withdraw-apply`、`wallet/withdrawals`  
**服务**：`business-operations.js`（kind=`withdraw`）、`business.js`

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/wallet/withdrawal-options` | 余额、限额、手续费说明、账户类型、`allowedActions` |
| POST | `/wallet/payees` | 登记收款账户 → `payeeToken`（脱敏回显） |
| POST | `/wallet/withdrawal-quotes` | 试算；**契约注释 amount 为整数分**——与「全局元」冲突，必须单独冻结 |
| GET/POST | `/wallet/withdrawals` | 记录列表；提交 `quoteId` + 幂等 → 通常 `PENDING_REVIEW` |

提现、划拨等同属资金敏感操作：前端只展示报价结果，**余额与状态以服务端为准**。

---

## 12. 素材库与上传

**页面**：`partner/materials`、`material-edit`  
**服务**：`materials.js`、`profile.js` / `training-assets.js`（头像与附件同样走上传）

### 12.1 素材

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/materials/categories`、`/materials`、`/materials/{id}` | 分类与列表详情 |
| POST | `/materials/{id}/renders` | 带二维码渲染任务 |
| GET | `/jobs/{jobId}` | 异步任务查询 |

### 12.2 上传三步（不可跳）

1. `POST /assets/upload-intents` → 签名与 `assetId`/`fileId`（二者同值可接受）
2. 按签名 **实际上传字节**（前端按 multipart POST，不猜对象存储方法）
3. `POST /assets/{id}/completions` → 仅 **READY/ready** 后可引用
4. 可选 `GET /assets/{id}` 读回

**Mock vs 真**：Mock 可用 `/static/` 预览；真实上传域名、签名、私有读仍待联调环境。

---

## 13. 管理端 `/api/*` 说明

契约库存中含 `/api/auth/login`、`/api/order*`、`/api/seed*`、`/api/calc*`、`/api/settings` 等，面向**总部后台 / 种子与试算**，不是小程序 Tab 业务主路径。

- App 登录请用 **`POST /auth/sessions`**，不要用 `/api/auth/login`。
- 总部后台功能需求另文维护（下一份文档任务）；本文不把 `/api/*` 当作 C 端必接清单。

---

## 14. 联调验收建议

1. **关 Mock**：`useMock=false`，配置真实 `baseURL`；确认专属/经营预览关闭后入口只跟 capabilities 走。
2. **冷启动**：登录 → `GET /me/bootstrap` → Tab 首页；token 失效应 401 并回登录。
3. **商城闭环**：catalog → 详情 → checkout options/quote → 下单（payLater）→ 支付渠道 → attempt → 轮询 → 订单状态。
4. **经营闭环**：选 context → overview → 任选一个三段式写操作（划拨或提现）→ 列表可查到 PENDING/成功态。
5. **家庭学习**：建孩子 → 激活码 preview/commit → 等级与课程可读。
6. **教练通道**：coach 登录仅可白名单页；核销失败锁定可感知。
7. **金额抽样**：同一笔订单在商品展示、报价、订单、支付回执上的数值与单位一致。

---

## 附：相对旧草案的主要变化

- 标题与范围改为 **当前 uni-app 项目** 对后端的需求，去掉过时「仅草案、不改代码」表述及对已不存在前端工程的引用。
- 按 **2026-10-27 契约层（196 端点）+ 现网服务调用** 重写分域清单；明确 `contracts/endpoints.js` 为库存源。
- 单独置顶 **金额单位 / Mock 预览 / 本地 session** 三大阻塞，并吸收对接复核中仍开放的确认项。
- 经营工具与 `features/business/catalog.js`、专属入口与 `features/exclusive/catalog.js` 对齐。
- 支付、上传、名额双余额、分配意愿、晋升领取等按 10/27 已同步到仓库的确定内容更新；未 closure 的问题明确标为待后端确认。
