# Mock 种子数据参考（给数据库 / 测试数据）

> 导出日期：2026-10-28  
> 用途：供数据库专家按前端现有 Mock 形态生成入库测试数据。  
> 源码位置：`src/services/mock/*`（页面层主数据）+ `src/services/contracts/mock.js`（契约层 fixture）+ `src/features/business/account-rank.js`（等级价目）。  
> **重要**：以下金额字段在旧 Mock 中多为**分（整数）**；新对接文档区分 `Yuan` / `Cents`，入库前请与后端字段单位书面对齐。

---

## 1. 数据源索引

| 域 | 文件 | 主要内容 |
|---|---|---|
| 账号 / 登录 | `src/services/api.js`、`auth.js` | 演示账号 `VIP0001`、验证码 `123456` |
| 个人资料 / 绑定门店 | `mock/profile.js` | 昵称、邀请码、绑定门店 |
| 家庭学员 | `mock/family.js` | 学员、年级/性别字典、课时 |
| 学习体系 | `mock/learning.js` | 10 个等级、章节、公告、激活码规则 |
| 商城 | `mock/commerce.js` | 分类、商品、SKU、门店、优惠券、样例订单 |
| 经营上下文 | `mock/business.js` | 批发/合店/代理上下文、团队、收益、提现、门店工作台 |
| 批发 | `mock/wholesale.js` | 名额、升级方案、业绩、全球奖样例 |
| 合伙人价目 | `features/business/account-rank.js` | 等级码、拿货价、VIP 名额单价 |
| 甄选 / 合店申请 | `mock/exclusive.js`、`agency-application.js` | 合店门店选项、代理申请费用 |
| 培训 / 转店 | `mock/training.js` | 课时、反馈、可转入门店 |
| 素材 | `mock/partner.js` | 图文/视频素材列表 |
| 收益明细展示 | `mock/income-detail.js` | 划拨选项与展示样例 |
| 契约 fixture | `contracts/mock.js` | 邀请码、权益费演示值等 |

本地 Storage key（仅前端会话态，非 DB）：`naoshang-session`、`naoshang-mock-family:*`、`naoshang-mock-commerce-v1:*`、`naoshang-mock-business-v2:*`、`naoshang-mock-exclusive-v2:*`、`naoshang-mock-grants:*`。

---

## 2. 演示账号与鉴权

| 字段 | 值 |
|---|---|
| user.id / displayId | `VIP0001`（旧 `LC0001` 会映射成此值） |
| name | `脑商体验官` |
| role | `家长` |
| token（Mock） | `demo-local-token` |
| 短信验证码（Mock） | `123456` |
| 默认邀请码 | `LXYA023` |

账号等级由 `displayId` 前缀推导（见 §4）。

---

## 3. 门店（Stores）

| id | name | number | address | manager | phone |
|---|---|---|---|---|---|
| `shop-1` / `demo-store-1` | 脑商训练营梧桐街店 | NO.001 | 河南省郑州市管城回族区航海东路与中州大道交叉口西美景龙堂3c-1 | 李志远 | 19919988991 |
| `shop-2` / `demo-store-2` | 脑商训练营文化路店 | NO.002 | 郑州市文化路成长中心 | 李老师 | （空） |
| `demo-store-1`（代理单店） | 脑商训练营桐柏路店 | NO.001 | 河南省郑州市中原区桐柏北路xxx… | — | — |
| `demo-store-2`（代理单店） | 脑商线下桐柏路店 | NO.002 | 同上 | — | — |
| `hq-service` / `headquarters` | 总部服务 / 总部交付 | — | — | — | — |

合店月费样例：`69800` 分；合店老板数展示文案：`当前已有8位合店老板` / `3位`。

常用人物：

| name | phone | 用途 |
|---|---|---|
| 李志远 | 19919988991 | 门店经理、团队成员、收益对方 |
| 王好梦 | 19919988991 | 推荐人、健脑官反馈作者 |
| 张大伟 | — | 转店申请人 / 店长样例 |
| 张小伟 | 19900000001 | 收货人样例 |

---

## 4. 合伙人等级与价目（分）

来源：`account-rank.js`。

| code 前缀 | levelName | partner | benefits（名额台阶） | price（等级标价） |
|---|---|---|---|---|
| VIP | VIP合伙人 | true | 1 | 998000 |
| QZ | 普通用户 | false | 0 | 0 |
| TS | 天使合伙人 | true | 3 | 2980000 |
| SD | 私董合伙人 | true | 6 | 5980000 |
| LC | 联创合伙人 | true | 24 | 23980000 |

VIP 名额按接收方等级的单价（分）：

| 接收方等级 | unitPrice |
|---|---|
| VIP合伙人 | 798000 |
| 天使合伙人 | 750000 |
| 私董合伙人 | 698000 |
| 联创合伙人 | 650000 |

升级方案 Demo code：`DEMO-VIP` / `DEMO-ANGEL` / `DEMO-BOARD` / `DEMO-FOUNDER`。

合伙人权益费演示：`20000` 分（契约 Mock）；天使年费开通文案对应 ¥200.00。

---

## 5. 家庭学员（Family Members）

默认账号 `user.id = VIP0001` 时：

| id | contextId | displayId | name | grade | gender | badge | training | customHours |
|---|---|---|---|---|---|---|---|---|
| `demo-VIP0001-1` | `child:VIP0001:1` | DEMO001 | 体验学员 | JUNIOR_1 / 初一 | UNDISCLOSED | 三阶羿烁会员 | total20/used6/remain14 | 同左 |
| `demo-VIP0001-2` | `child:VIP0001:2` | DEMO002 | 体验学员二 | JUNIOR_1 / 初一 | UNDISCLOSED | 未激活会员 | 同上 | 同上 |

年级字典：`PRIMARY_1..6`、`JUNIOR_1..3`、`OTHER`。  
性别字典：`MALE` / `FEMALE` / `UNDISCLOSED`。

学习身份：

- 家长：`parent:{userId}`
- 学员：`child:{userId}:{n}`（即 member.contextId）

培训扩展字段默认：`trainingTotal/Used=20/6`，`specialTotal/Used=20/6`。

---

## 6. 学习等级（Levels）

| id | number | name | tier | tierName |
|---|---|---|---|---|
| level-1 | 1 | 超级记忆 | 1 | 一阶菁英会员 |
| level-2..5 | 2–5 | 实用记忆 / 语文系统 / 外语系统 / 百科系统 | 2 | 二阶行能会员 |
| level-6..10 | 6–10 | 导图大师 / 速读大师 / 记忆大师 / 潜能开发 / 未来领袖 | 3 | 三阶羿烁会员 |

默认解锁：仅学员1（`demo-{accountId}-1`）视为已解锁；学员2 需激活码。

激活码规则：

- `DEMO-T1` / `DEMO-T2` / `DEMO-T3` → 对应阶
- 旧格式：`DEMO-L1` … `DEMO-L10`

每等级固定 4 章：`{levelId}-article|video|practice|review`。

公告样例：`notice-learning` / `notice-rights` / `notice-service`（2026.10.20 / 10.08 / 09.18）。

---

## 7. 商城目录

### 7.1 分类

| id | label |
|---|---|
| physical | 脑力核心 |
| software | 软件卡 |
| special | 特色产品 |
| admin | 行政费 |
| column | 专栏产品 |
| coaching | 陪练卡 |
| camp | 训练营 |

### 7.2 商品摘要（金额：分）

| id | title | categoryId | fulfillmentType | requiresMember | standardAmount | activityAmount | 代表 SKU |
|---|---|---|---|---|---|---|---|
| product-physical | 平板 | physical | PHYSICAL | false | 198000 | 158000 | `sku-physical-1` 158000/库存20；`sku-physical-2` 178000/8；`sku-physical-oos` 0 |
| product-software | xxx软件卡 | software | ACTIVATION_CODE | false | 36000 | 30000 | 月卡 30000；年卡 120000 |
| product-special | xxxxxx训练营 | camp（展示） | OFFLINE_SERVICE | true | 128000 | 108000 | 10课时 108000；假期营 168000 |
| product-admin | XXX期训练营行政费 | admin | OFFLINE_SERVICE | true | 20000 | 20000 | 默认 20000；进阶版 25000 |
| product-column | BZ-《记忆基础》 | column | COLUMN_ACCESS | false | 9900 | 7900 | 默认 7900；进阶版 12900 |
| product-coaching | 陪练卡 | coaching | OFFLINE_SERVICE | true | 120000 | 100000 | 10课时 100000；20课时 180000 |
| product-featured | 特色产品 | special | PHYSICAL | false | 10000 | 8000 | 默认 8000 |

会员价档（VIP/天使/私董/联创）与代理角色价（单店/区县/地市/省代）见 `commerce.js` 中 `memberPrices` / `agencyRolePrices`。

### 7.3 优惠券

| id | title | amount | minAmount | status | expiresAt |
|---|---|---|---|---|---|
| coupon-5 | 商品专属福利券 | 500 | 0 | available | 2027-12-31 |
| coupon-10 | 商品专属福利券 | 1000 | 10000 | available | 2027-12-31 |

### 7.4 样例订单（登录后按账号生成）

订单号形态：`NS20261022000{n}`。状态覆盖：`PENDING_PAYMENT` / `COMPLETED` / `CANCELLED` / `PAID+WAIT_SHIP` / `PAID+SHIPPED`（含快递号 `SF5154445657`）。

---

## 8. 经营上下文（Business Contexts）

同一账号默认同时具备：

1. **批发** `wholesale:{userId}` — levelName 联创合伙人；初始 `available=200000`、`pending=5400`、`quota=20`
2. **合店 ×3** `costore:{userId}:{1..3}` — 绑定梧桐街店，`validUntil=2027-10-22`，`contractId=demo-contract-n`
3. **代理**（多条）  
   - COUNTY：高新区、二七区、中原区  
   - CITY：郑州市  
   - PROVINCE：河南省、安徽省  
   - STORE ×2：桐柏路店 / 线下桐柏路店  

批发团队样例人：

| id | levelLabel | displayId | storeId |
|---|---|---|---|
| demo-person-1 | 普通用户 | QZ0213214 | null |
| demo-person-2 | 普通用户 | QZ0213214 | demo-store-1 |
| demo-person-3 | 天使合伙人 | TS0213214 | demo-store-1（含业绩） |
| demo-person-4 | VIP合伙人 | VIP0213214 | demo-store-1 |

收益类目枚举：`AGENCY_FEE` / `SERVICE_FEE` / `COSTORE_FEE` / `SUPPLY_CHAIN` / `SOFTWARE_CARD` / `SPECIAL_PRODUCT` / `ADMIN_FEE` / `COLUMN`。

提现样例状态：`PENDING_REVIEW` / `SUCCEEDED` / `REJECTED`，金额 `56700` 分。

活动名额批次：`activity-batch-1`，title「后台充值4个活动VIP名额」，total=4。

代理申请应付（分）：

| agencyType | payableAmount | 费用说明（文案） |
|---|---|---|
| STORE | 8000000 | 品牌费4w + 设备费2w + 保证金2w |
| COUNTY | 12000000 | 6w+3w+3w |
| CITY | 20000000 | 10w+5w+5w |
| PROVINCE | 30000000 | 16w+8w+6w |

合店时长选项：`six-months` / `twelve-months`。

---

## 9. 建议入库的最小实体集

若只先造联调可用测试库，建议至少覆盖：

1. **accounts** — `VIP0001` 及若干 QZ/TS/SD/LC 前缀账号  
2. **stores** — 梧桐街、文化路、桐柏路、总部  
3. **family_members** — 每账号 ≥2 学员（一已激活、一未激活）  
4. **learning_levels + chapters** — 10 级 × 4 章  
5. **products + skus + categories** — §7 全表  
6. **coupons** — 2 张样例  
7. **orders** — 覆盖待付/已完成/取消/待发/待收  
8. **partner_ranks + quota_prices** — §4  
9. **business_contexts** — wholesale / costore / agency 各至少 1  
10. **team_members / income_entries / withdrawals** — 各少量样例  
11. **agency_tree** — 市 → 区县 → 单店 → 成员（见 `mockAgencyTree`）  
12. **activation_codes** — `DEMO-T1..T3`  

---

## 10. 使用注意（给 DB 专家）

1. Mock **大量文案是 UI 占位**（重复姓名「李志远」、固定手机号），入库时应换成可区分的真实感数据，但**保留枚举值、金额量级、状态机与 ID 前缀习惯**。  
2. 不要把 Mock 里的提点/分红数字当正式分佣规则；规则以后端为准。  
3. 幂等键、报价过期、库存预占等是会话态逻辑，库表需另有业务表设计，不必照搬前端 Map。  
4. 需要对照接口字段时，优先看：  
   - `docs/后端API需求文档.md`  
   - `docs/api/前端对接API文档-2026-10-27.md`  
   - `src/services/contracts/endpoints.js` / `v3-types.d.ts`  
5. 完整可执行样例仍以源码为准；本文是便于离线阅读的种子摘录。若需某一域的完整 JSON dump，可指定域再导出。

---

## 11. 源文件速查

```
src/services/mock/
  agency-application.js
  business-operations.js
  business.js
  commerce.js
  exclusive.js
  family.js
  income-detail.js
  learning-progress.js
  learning.js
  partner.js
  profile.js
  training.js
  wholesale.js
src/services/contracts/mock.js
src/features/business/account-rank.js
```
