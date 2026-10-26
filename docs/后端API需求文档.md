# 脑商合伙人前端 API 需求文档

> 2026-10-26补充：本文件为2026-10-23旧草案。会员等级整体激活、任务晋升3/9/18、名额消耗1/3/6/24、永久活动名额、合店先付后审、转店双审、总部后台范围等，以[总部后台功能需求与小程序页面映射](./总部后台功能需求与小程序页面映射.md)及其第5节接口修订为准；本文未列的新路径仍需联调确认。

编制日期：2026-10-23。用途：供后端开发、业务确认及前后端联调。

## 1. 范围与依据

本文依据当前工作区 `src/pages.json`、`src/pages/`、`src/components/`、`src/services/`、经营功能目录及已有领域模型文档整理。无需额外提供目录截图，已直接核对源码。

当前 `src/config/index.js` 启用 Mock，文中接口是需求契约草案，不代表服务端已实现。Mock 中的价格、比例、额度、期限、演示账号和激活码均不能作为正式业务规则。只新增本文档，不修改页面与服务逻辑。

路径默认相对于 API 基础地址，不预设网关版本前缀。优先沿用已有语义明确的资源路径；少数动作接口改为 RESTful 子资源，均在第 16 节列明。未标注“建议新增”的接口均有当前服务层或功能目录依据；返回字段说明包含页面所需核心字段，不是完整 Swagger。

主要页面与服务分组：

- 登录注册：`pages/login`、`register`、`forgot-password`；`services/auth.js`、`api.js`。
- 我的与专属功能：`pages/profile`、`settings`、`address`、`coupon`、`support`、`application`；`profile.js`、`exclusive.js`。
- 学习与家庭会员：`pages/member`、`learning`、`members`；`learning.js`、`lesson.js`、`members.js`。
- 商城交易：`pages/selection`、`product`、`order`、`payment`、`column`；`commerce.js`。
- 联营经营：`pages/partners`、`partner`、`costore`、`agency`、`income`、`wallet`；`business.js`、`business-operations.js`。
- 门店与健脑官：`pages/store`、`coach`、`feedback`；`business-store.js`、`training.js`。
- 素材：`pages/partner/materials`、`material-edit`；`materials.js`、`training-assets.js`。

## 2. 全局约定

### 2.1 参数位置、身份与权限

下文 `{id}` 等路径参数均必填；GET 参数放 Query；POST/PATCH/PUT 参数放 JSON Body；上传文件按签名配置使用 multipart。

除登录、短信、注册、找回密码、微信授权及公开协议外，接口默认要求 `Authorization: Bearer <token>`。是否开放商品目录、公告等匿名浏览由业务确认，当前前端按登录后调用。

参数标记：**必填**为每次请求都要提供；**条件必填**须满足对应场景；**可选**可不传。公共参数如下：

- `contextId`：当前身份编号；经营接口必填，家庭管理接口按现有服务传入账户身份，学习接口依具体说明传入。
- `memberId`：孩子/学员编号，不能与登录账号 ID 混用。
- `assignmentId`：代理委任编号；代理场景条件必填。
- `contractId`：合店合同编号；合店场景条件必填。
- `version`：上次读取的数据版本；有版本控制的修改、审批、订单操作必填。
- `idempotencyKey`：一次业务意图的唯一编号；创建订单、支付、激活、申请、反馈及经营提交必填。重试复用原 key，修改参数后换 key。
- `cursor`：分页游标，可选，首屏不传；`pageSize`：每页数量，可选，当前多数服务传 20，服务端限制最大值。

登录主体 Account、孩子 Member、学习权益、合伙等级、年度权益、代理委任、门店任职、合店合同必须分别建模。同一账号可有多个经营身份。后端须检查 token、context 归属、资源归属、能力权限及有效期；不能信任前端传入的角色、金额或页面按钮。前端预览开关不能授予正式权限。

### 2.2 响应、金额与时间

当前 `request()` 直接返回响应 JSON，建议联调阶段保持正文直接为业务 DTO。如果后端统一返回 `{code,data,message}`，需集中修改请求适配层解包。

列表结构统一为：

```json
{"items":[],"nextCursor":null,"hasMore":false}
```

`hasMore=true` 时必须返回有效 `nextCursor`。汇总数据应针对完整筛选结果计算，不是当前页求和；空列表保留必要的汇总、权限和分页字段。

金额统一为人民币整数分；比例字段 `rateBps` / `shareBps` 使用万分比，10000 表示 100%。零值有效，未知值用 null。报价、库存、手续费、优惠、分红及权益到期由后端计算。

当前商城报价与订单使用带时区 ISO 时间；经营报价、合店报价的 `expiresAt` / `serverTime` 要求毫秒时间戳。这是现有适配器差异，联调时可统一格式，但须同步修改适配器。月筛选为 `YYYY-MM`；建议统计按 Asia/Shanghai，最终由业务确认。

错误响应建议：

```json
{"code":"VERSION_CONFLICT","message":"数据已更新，请刷新后重试","requestId":"req-001","fieldErrors":{"version":"版本已过期"}}
```

建议 HTTP：400/422 参数错误，401 登录失效，403 无权限，404 不存在，409 版本或状态冲突，429 限流。报价拒绝建议区分 `QUOTE_EXPIRED`、`INVALID_QUOTE`、`ADDRESS_INVALID`、`OUT_OF_STOCK`、`COUPON_UNAVAILABLE`、`INSUFFICIENT_BALANCE`、`VERSION_CONFLICT`。确定拒绝应保证未产生新交易；网络超时不能视为提交失败后重新创建。

## 3. 认证、注册与身份初始化

业务场景：手机号密码登录、微信绑定注册、密码找回，以及切换家长、孩子、经营身份。来源：`auth.js`、`api.js`、`learning.js`、`business.js`。

- **POST `/auth/sessions`**：创建登录会话。`password`、`channel` 必填；channel=parent 时 `phone` 必填，channel=coach 时 `loginAccount` 必填（4–32 位字母数字下划线短横线），两个登录标识按入口择一提交。返回 `{token,user:{id,name,role},accountType,expiresAt?}`；accountType 为 `parent` 或 `coach`。现有路径 `/auth/login`。
- **POST `/auth/sms-challenges`**：发送短信。`phone`、`purpose` 必填，purpose 为 `register` 或 `reset-password`。返回 `{retryAfter,expiresAt?}`，retryAfter 单位秒。现有 `/auth/sms/send`。
- **POST `/auth/registrations`**：注册。`phone`、`code`、`password`、`regionCodes` 必填；regionCodes 为三级行政区编码；`region`、`inviteCode` 可选；微信注册时 `wechatTicket` 条件必填。返回登录会话结构。密码确认字段只在前端校验，不提交。现有 `/auth/register`。
- **POST `/auth/password-reset-verifications`**：`phone`、`code` 必填；返回 `{resetTicket,expiresAt?}`。现有 `/auth/password/verify`。
- **POST `/auth/password-resets`**：`resetTicket`、`password` 必填；返回 `{success:true}`。现有 `/auth/password/reset`。
- **POST `/me/password-changes`**：`oldPassword`、`newPassword` 必填；返回 `{changed:true}`。现有 `/auth/password/change`。
- **POST `/auth/wechat/authorizations`**：H5 微信授权。`redirectUri` 必填，`inviteCode` 可选；返回 `{url,state}`。现有 `/auth/wechat/authorize`。
- **POST `/auth/wechat/exchanges`**：`code`、`platform` 必填，platform 为 `h5` / `mp-weixin`；H5 的 `state` 条件必填，`inviteCode` 可选。返回 `{registrationTicket,expiresAt?}`，前端注册时映射为 wechatTicket。现有 `/auth/wechat/exchange`。
- **GET `/me/bootstrap`**：无业务参数，返回下面的身份集合。

```json
{
  "contexts":[
    {"id":"parent-1","accountId":"account-1","mode":"parent","name":"家长"},
    {"id":"child-1","accountId":"account-1","mode":"child","memberId":"member-1","name":"学员","displayId":"M001","badge":"VIP"}
  ],
  "businessContexts":[
    {"id":"agency-1","accountId":"account-1","module":"agency","label":"市级代理","agencyType":"CITY","assignmentId":"assignment-1","capabilities":["agency:team","agency:income"],"validUntil":"2027-10-23T00:00:00+08:00"}
  ]
}
```

经营 module 为 `wholesale` / `costore` / `agency`；合店身份必须有 storeId、contractId，代理身份必须有 assignmentId、agencyType（STORE/COUNTY/CITY/PROVINCE）。健脑官使用专门工作台与真实任职授权，不从普通家长身份推导。

特殊逻辑：手机号与短信用途绑定、服务端限流、验证码/票据一次性消费；邀请码校验邀请关系且禁止自绑。微信重定向地址须校验白名单，授权 state 绑定会话。目前微信前端流程只接收注册票据，已绑定微信是否直接登录需要确认并补适配。密码前端要求 6–32 位、无空格；服务端仍独立校验。当前退出仅清本地会话；**建议新增 DELETE `/auth/sessions/current`** 撤销当前 token，返回 `{success:true}`。

## 4. 个人中心、地址、优惠券与客服

业务场景：展示账号资料、门店与订单数量，维护资料和收货地址，查询优惠券、提交意见。来源：`profile.js`、`exclusive.js`。

- **GET `/me`**：无参数。返回 `profile:{id,nickname,avatarUrl,phone?,regionCodes,regionNames,version}`、`store`、`orderCounts:{pendingPayment,waitingShipment,waitingReceipt,completed}`、`support:{phone,description}`、`exclusiveAccess:{accountId,contextId,capabilities}`。
- **PATCH `/me`**：`nickname`、`version` 必填；`regionCodes`、`avatarAssetId` 可选；返回 `{profile:{...}}`。昵称 1–24 字，地区修改须为三级编码。
- **GET `/addresses`**：分页参数可选；返回地址列表。
- **GET `/addresses/{id}`**：无额外参数；返回 `{address:{id,recipient,phone,regionCodes,regionNames,detail,isDefault,version}}`。
- **POST `/addresses`** / **PATCH `/addresses/{id}`**：`recipient`、`phone`、`regionCodes`、`regionNames`、`detail` 必填；`isDefault` 可选；修改时 `version` 必填。返回 `{address:{...}}`。
- **PUT `/addresses/default`**：`addressId`、`version` 必填；返回 `{defaultAddressId}`。
- **DELETE `/addresses/{id}`**：`version` 必填；返回 `{success:true}`。现有实现放 Body，需确认网关支持 DELETE Body，否则迁移到条件请求头。
- **GET `/coupons`**：`status` 必填，为 available/used/void；分页可选。返回列表项 `id,title,discountAmount,thresholdText,validUntilLabel,scopeLabel,status,expiresAt`；建议同时提供机器可读门槛及适用品类，结算可用性仍由报价判断。
- **GET `/support/config`**：无参数；返回 `{phone,description,feedback:{maxImages}}`。
- **POST `/support/feedback`**：`content`、`idempotencyKey` 必填；`imageAssetIds` 可选。返回 `{feedbackId}`。内容 1–500 字，当前最多 3 张图片。
- **GET `/agreements/{type}`**：type 为 user/privacy；返回 `{title,version,content}`，正文格式见第 14 节。

特殊逻辑：地址与上传资源必须属于当前账号；同账号仅一个默认地址，切换默认值需事务处理。订单数量、优惠券状态由后端计算，不能用页面缓存推导；删除默认地址后的处理规则待确认。

## 5. 家庭会员管理与激活

业务场景：家长新增/编辑孩子，选择孩子学习、查看订单和训练记录、激活学习权益。来源：`members.js`、`learning.js`。

- **GET `/members/options`**：无参数；返回 `{grades:[{code,label}],genders:[{code,label}]}`。
- **GET `/members`**：`scope=family`、`contextId` 必填；分页可选。列表项包含 `id,contextId,displayId,name,avatarUrl,gradeCode,gradeLabel,genderCode,genderLabel,badge,levels,training,version`。
- **POST `/members`** / **PATCH `/members/{id}`**：`name`、`gradeCode`、`genderCode`、`contextId` 必填；`avatarAssetId` 可选；新增 `idempotencyKey` 必填，修改 `version` 必填。返回 `{member:{...}}`。姓名 1–24 字。
- **POST `/activations/preview`**：`code`、`memberId` 必填；家庭管理传 `contextId`；从指定等级页进入时 `targetType=level`、`targetId` 条件必填。返回 `{code,memberId,targetType,targetId,levelId?,levelName?,alreadyActivated?,...}`，需足以显示实际激活对象并供确认提交。
- **POST `/activations`**：`code`、`targetType`、`targetId`、`idempotencyKey` 必填；等级激活 `memberId` 必填，管理场景传 contextId。返回 `{unlocked:true,memberId?,targetType?,targetId?}`，成功后重新读取权益。
- **GET `/members/{id}/orders`**：`contextId` 必填，分页可选；返回订单列表，结构见第 8 节。
- **GET `/members/{id}/training-feedback`**：家庭读取 `contextId`、`kind` 必填，kind 为 training/self-study/camp；分页可选。返回反馈列表，结构见第 13 节。
- **GET `/training-feedback/{id}`**：`memberId` 必填；管理入口 `contextId` 条件必填；返回反馈详情。

特殊逻辑：家庭关系决定查看范围，会员管理的权限能力不得只靠前端隐藏按钮。激活预览不消耗码；提交时重新校验适用对象、有效期、使用次数与归属，原子消费激活码和发放权益。重复提交返回原结果，激活码不能跨会员重复使用（是否允许多次使用由码规则决定）。

## 6. 学习等级、公告、课程与学习进度

业务场景：家长浏览等级介绍，孩子查看已解锁课程并学习。来源：`learning.js`、`lesson.js`、`LessonReader.vue`。

- **GET `/learning/levels`**：无参数；返回 `{levels:[{id,name,unlocked:false,...}]}`，只展示等级导航，不返回任意孩子权益。
- **GET `/members/{memberId}/levels`**：无额外参数；返回 `{levels:[{id,name,unlocked,progress?,...}]}`，按该孩子计算。
- **GET `/learning/levels/{levelId}`**：`memberId` 可选；孩子场景必填。返回 `{id,name,summary,covers:[],content,unlocked,chapters:[{id,title,type,accessible,progress}]}`；type 为 article/video。
- **GET `/announcements`**：分页可选；返回列表项 `id,title,summary?,publishedAt`。
- **GET `/announcements/{id}`**：无额外参数；返回 `{id,title,publishedAt,content}`。
- **GET `/lessons/{chapterId}`**：等级课程 `contextId`、`levelId` 条件必填；专栏课程 `columnId` 条件必填，二者按入口择一。返回 `{id,title,type,content,videoUrl?,posterUrl?}`。
- **PUT `/members/{memberId}/learning-progress`**：`contextId`、`levelId`、`chapterId` 必填；`positionSeconds`、`durationSeconds`、`completed`、`ended` 为当前服务提交字段，应提供默认值。返回保存后的进度字段，例如 `{positionSeconds:120,durationSeconds:600,completed:false}`，具体外层待冻结。

特殊逻辑：家长身份只能浏览介绍，孩子身份且权益有效才可获取受保护正文/视频。图文课显式完成时上报 completed；视频上报 ended，服务端结合可信时长和进度判断完成，不能仅凭客户端布尔值发放奖励。进度按会员＋等级＋章节隔离，数值非负；跨设备覆盖、完成状态是否单向保持需确认。当前不支持专栏进度上报。

## 7. 商品目录、详情与结算报价

业务场景：甄选商品、选规格，关联门店/会员/地址/优惠券并询价。来源：`commerce.js`、商品与确认订单页面。

- **GET `/catalog`**：无参数；返回 `{categories:[{id,label}],items:[商品摘要]}`。当前页面按返回目录筛选；大目录分页或后端分类筛选为后续扩展。
- **GET `/products/{id}`**：无额外参数；返回商品详情，核心结构如下。
- **GET `/checkout/options`**：无参数；返回 `{stores:[],members:[],addresses:[],coupons:[]}`。门店含 id/name/number/address，其他对象与对应模块一致；只给当前用户可用选项。
- **POST `/checkout/quotes`**：`productId`、`skuId`、`quantity`、`storeId` 必填；实物 `addressId` 条件必填；商品 requiresMember=true 时 `memberId` 条件必填；`couponId`、`remark` 可选。数量 1–99，备注最多 200 字。返回 `{id,goodsAmount,discountAmount,payableAmount,expiresAt,serverTime,ruleVersion,store,memberId?,memberName?,address?}`。

```json
{
  "id":"product-1","categoryId":"physical","categoryLabel":"脑力核心",
  "title":"商品名称","summary":"商品简介","coverUrl":"https://media.example.com/product.jpg",
  "fulfillmentType":"PHYSICAL","requiresMember":false,"pricePresentation":"tiered",
  "standardAmount":20000,"activityAmount":18000,
  "memberPrices":[{"label":"VIP","discountLabel":"会员价","amount":16000,"current":true}],
  "skus":[{"id":"sku-1","label":"默认规格","amount":16000,"stock":20}],
  "content":{"format":"nodes","version":1,"nodes":[]}
}
```

特殊逻辑：分类 categoryId 与履约 fulfillmentType 分离。履约包括 PHYSICAL、ACTIVATION_CODE、OFFLINE_SERVICE、COLUMN_ACCESS，经营订单另有 BUSINESS_ENTITLEMENT。最终售价、优惠叠加、运费是否适用、库存与优惠券资格由后端判断。更换规格、数量、门店、会员、地址或券必须重新报价；金额和身份不能由前端直接指定。

## 8. 订单、支付与专栏权益

业务场景：从报价创建订单，支付、查询订单、取消、确认收货，购买并激活专栏。来源：`commerce.js`、`profile.js`、收银台页面。

- **POST `/orders`**：`quoteId`、`idempotencyKey` 必填；返回 `{order:订单}`。
- **GET `/orders`**：分页、`keyword`、`status`、`fulfillmentStatus` 可选；现有另一适配器还会提交 `filter`，建议统一状态字段。返回订单列表。
- **GET `/orders/{id}`**：买家读取无额外参数；经营只读入口 `contextId` 条件必填。返回 `{order:订单,serverTime}`。
- **POST `/orders/{id}/cancellations`**：`version`、`idempotencyKey` 必填；返回 `{order:订单}`。现有 `/orders/{id}/cancel`。
- **POST `/orders/{id}/receipts`**：`version`、`idempotencyKey` 必填；返回 `{order:订单}`。现有 `/orders/{id}/confirm-receipt`。
- **GET `/orders/{id}/payment-channels`**：无额外参数；返回 `{items:[{id,label,kind}]}`，按订单和运行平台给出真正可用渠道。
- **POST `/payments/attempts`**：`orderId`、`channel`、`idempotencyKey` 必填；返回 `{id,orderId,status,channel}`。**正式支付还需补充平台调用参数或跳转地址，字段与前端平台支付适配需共同确认**。
- **GET `/payments/attempts/{id}`**：无额外参数；返回 `{id,orderId,status,channel,order?}`。status 为 PROCESSING/SUCCEEDED/FAILED/CANCELLED。
- **GET `/columns/{id}`**：id 当前为专栏商品 ID；返回 `{product,unlocked,chapters:[{id,title,type}]}`。
- **POST `/activations`**：专栏激活提交 `targetType=column`、`targetId`、`code`、`idempotencyKey`，均必填；返回 `{unlocked:true}`。专栏权益当前按购买账号归属，是否支持孩子分配待确认。

订单核心数据：

```json
{
  "id":"order-1","orderNo":"NS202610230001","version":1,
  "items":[{"id":"item-1","productId":"product-1","skuId":"sku-1","title":"商品名称","specLabel":"默认规格","coverUrl":"https://media.example.com/product.jpg","quantity":1,"unitAmount":16000}],
  "store":{"id":"store-1","name":"门店","number":"NO.001","address":"地址"},
  "memberId":null,"memberName":null,"address":null,"remark":"",
  "goodsAmount":16000,"discountAmount":0,"payableAmount":16000,
  "fulfillmentType":"PHYSICAL","status":"PENDING_PAYMENT","fulfillmentStatus":null,
  "statusLabel":"待付款","allowedActions":["pay","cancel"],
  "createdAt":"2026-10-23T10:00:00+08:00","expiresAt":"2026-10-23T10:30:00+08:00",
  "paidAt":null,"trackingNo":null
}
```

特殊逻辑：订单业务状态 PENDING_PAYMENT/PAID/CANCELLED/COMPLETED，与履约状态 WAIT_SHIP/SHIPPED/DELIVERED 分开。按钮来自 allowedActions，服务端再次检查状态。经营身份查看他人订单仅允许授权只读。

创建订单时原子校验报价未过期、未消费、库存充足、地址与会员仍有效，锁定库存/优惠券；取消或超时关闭释放预占。支付结果以服务端验签通知及主动查询为准，重复通知幂等；查询接口不能像 Mock 一样触发自动成功。支付与关单竞争须在后端处理。专栏已付款与已激活分开，激活是否必须已有购买记录由业务确认。当前没有退款/售后页面，不在本次必需接口内。

## 9. 联营工作台、团队与经营报表

业务场景：批发商、合店老板、区域代理切换工作台，查看收益、团队、等级、任务、活动名额和分享码。来源：`business.js`、`features/business/catalog.js`、`WholesaleReport.vue`、`AgencyReport.vue`。

本节全部 GET；除特别说明外，`contextId` 必填，分页可选；代理传 assignmentId、合店传 contractId，后端核验匹配关系。`month`、`keyword`、`filter` 根据下面场景可选。报表均返回公共列表结构，按需附 metrics、summary、columns，不能只返回数组。

- **`/partner/overview`**：批发工作台；返回 `accountId,contextId,levelName,partnerStatus,annualRemainingDays,rankDescription,experience,experienceTarget,benefits` 及余额等展示字段。现有 `partner.js` 还存在无 contextId 的账户视角调用，需与经营视角统一。
- **`/costore/overview`** / **`/agency/overview`**：返回 `accountId,contextId,benefits` 及所选门店/区域、当前等级、经营统计、权益有效期等字段。
- **`/partner/income`**：管理收益；keyword 可选。返回 `available,metrics,items`，items 含收益条目及 sourceName/details；详情见第 11 节。
- **`/partner/superior`**：返回列表空壳及 `superior:{name,phone,levelLabel,scopeLabel}`，未绑定为 null。
- **`/promotion/share-code`**：返回列表空壳及 `accountId,contextId,promotionId,inviteCode,qrUrl,posterUrl,shareUrl`。
- **`/partner/global-awards`**：month 可选，默认月份规则待确认。返回 `eligibilityLabel,metrics,summary,columns,items`；明细含 month/eligibility/amount/weightedAmount/performanceAmount/salesAmount/shareBps/people/poolAmount。
- **`/partner/promotion-tasks`**：返回列表空壳及 `promotion:{beforeName,afterName,beforeQuota,afterQuota,paidAmount,standardAmount,differenceAmount,taskDescription,progress,target,statusLabel,validUntil}`。
- **`/partner/experience-ledger`**：filter 为 promotion/products；返回 `promotionExperience,productExperience,items:[{id,name,title,amount,initialLevel?,quotaUsed?,createdAt}]`。这里 amount 的语义为经验数值，不能套用金额格式，建议后续重命名 experienceValue 并同步适配。
- **`/partner/team`**：keyword 可选；返回团队成员 id/name/displayId/phone/avatarUrl/levelLabel/storeName/joinedAt/quotaRemaining/performance/upgradePlans/version。
- **`/partner/quota-ledger`**：返回 `standardRemaining,activityRemaining,items:[{id,title,quantity,activityQuantity?,targetName?,targetDisplayId?,targetLevel?,createdAt}]`。进货与划转目前共用路径但未传区分参数，建议新增 query `direction=in|out` 或 `kind=purchase|transfer|upgrade` 并修改适配器，不能仅凭数量正负区分划转和升级。
- **`/partner/quotas`**：活动名额批次列表，项含 id/title/type?/grantedAt/expiresAt/total/used/reserved/remaining/validityLabel。
- **`/income/entries`**：合店/代理收益；filter=pending 表示待分配，keyword 可选；返回 metrics 和收益列表。
- **`/costore/card-dividends`** / **`/costore/promotion-dividends`**：month、keyword 可选；返回 metrics 及分红列表，条目至少 id/title/amount/createdAt/sourceOrder，相关会员/门店或推广对象和规则说明由后端按业务补充。
- **`/agency/team`**：keyword 可选；返回授权区域内的团队树节点列表，含 id/name/roleLabel/parentId?/store?/regionLabel?/performance 等页面展示字段。
- **`/agency/team/{id}`**：contextId、assignmentId 必填；返回该节点详情及人员、门店、业绩统计。
- **`/stores`**：contextId、assignmentId 必填，keyword、分页可选；返回授权门店列表，项含 id/name/address/contact/version 及页面统计信息。
- **POST `/partner/superior-bindings`**：contextId、inviteCode 必填；返回 `{superior:{...}}`；现有 POST `/partner/superior`。

报表展示元数据示例（具体条目字段以对应接口为准）：

```json
{
  "metrics":[{"label":"可提现金额","kind":"money","value":200000}],
  "columns":[{"key":"amount","label":"收益金额","kind":"money"}],
  "items":[{"id":"entry-1","amount":1200,"createdAt":"2026-10-23T10:00:00+08:00"}],
  "hasMore":false,"nextCursor":null
}
```

特殊逻辑：统计、晋升差额、任务进度、分红资格、奖池、经验、额度批次有效期全部后端计算，不能从营销正文推算。上级绑定禁止自绑、循环关系、重复绑定，变更上级流程另议。分享链接必须为正式可访问地址，不能返回 Mock 的 localhost 链接。当前 UI 部分按 metrics.label 查找统计值，返回中文标签要与适配器一致，建议后续增加稳定 key。

## 10. 名额划拨、购买、升级、年度权益与门店绑定

业务场景：经营操作先取可选项，再报价确认，最后提交。来源：`business-operations.js` 与相应页面。

每类操作均按下面三个接口实现；均需 contextId。GET options 无额外必填参数，返回 `{fields,balances,allowedActions,version,...业务候选项}`；POST quotes 的业务参数见各条；提交 POST 请求统一为 `{contextId,quoteId,idempotencyKey}`，全部必填。

- **划拨名额**：GET `/partner/quota-transfer-options`，POST `/partner/quota-transfer-quotes`，POST `/partner/quota-transfers`。报价 `targetAccountId`、`quantity` 必填；options 返回合法受益成员、标准余额；报价返回划拨数量与剩余余额。quantity 为 1–9999 的整数。
- **购买 VIP 名额**：GET `/partner/quota-purchase-options`，POST `/partner/quota-purchase-quotes`，POST `/partner/quota-orders`。报价 quantity 必填；options 返回 unitAmount、purchaseMode、pricingLabel、allowedPaymentChannelIds、allowedActions。purchaseMode 为 PAYMENT/CALCULATION_ONLY；只试算身份不得创建订单。
- **开通/升级**：GET `/partner/upgrade-options`，POST `/partner/upgrade-quotes`，POST `/partner/upgrades`。报价 targetAccountId、targetLevel 必填；standardQuantity、activityQuantity 按名额组合条件必填，均为 0–9999 的整数。options 返回 members、upgradePlans、standardRemaining、activityRemaining；报价返回所需总名额、消耗组合、服务费用。
- **年度权益**：GET `/partner/entitlement-options`，POST `/partner/entitlement-quotes`，POST `/partner/entitlement-orders`。报价 planId 必填；options 返回可用套餐、费用、期限及当前有效期；报价返回服务端计算的新有效期/续期说明。
- **绑定门店**：GET `/partner/store-binding-options`，POST `/partner/store-binding-quotes`，POST `/partner/store-bindings`。报价 targetAccountId、storeId 必填；options 返回可操作成员、stores、headquarters；支持总部服务时必须为合法候选 ID。

经营报价共同返回：

```json
{"id":"quote-1","contextId":"wholesale-1","version":3,"amount":10000,"details":[{"label":"支付金额","kind":"money","value":10000}],"expiresAt":1792721100000,"serverTime":1792720800000}
```

提交返回 `{status,operationId?,orderId?,balances?}`：待支付 `status=PENDING_PAYMENT` 时 orderId 必须存在，进入统一收银台；非待支付须至少提供 operationId/id/withdrawalId 中一个明确回执编号。正式业务使用 APPLIED/SUCCEEDED/COMPLETED 等确认状态，不能返回 Mock 专用 DEMO_APPLIED。

特殊逻辑：报价绑定操作类型、当前账号/身份、参数和规则版本。提交重验余额与报价版本，幂等且原子记账。购买与年度权益支付成功后才能增加名额或续期。升级如需付费，可预占名额，但支付前不授予等级；取消/超时释放预占。活动批次的扣减顺序、到期回收、标准与活动混用、免付费升级条件、购买权限及支付渠道待业务确认，不能照抄 Mock 数值。

## 11. 收益详情、提点分配与提现

业务场景：查看收入来源与受益人，分配销售/巡查提点，登记收款账户并申请提现。来源：`business.js`、`business-operations.js`、收益与钱包页面。

- **GET `/income/entries/{id}`**：contextId 必填；返回 `id,sourceOrder,title,category,channel,paymentTypeLabel,identityLabel,baseAmount,rateBps,amount,createdAt,allocationKind,allocationStatus,settlementStatus,beneficiaryName,recommended,buyer,store,allowedActions,version`。recommended/buyer/store 为相应人员及门店摘要；敏感字段按权限脱敏。
- **GET `/income/entries/{id}/allocation-options`**：contextId 必填；返回 fields/balances/allowedActions/version，候选目标 targetId 带实际受益人名称；allocationKind 为 sales/inspection。
- **POST `/income/entries/{id}/allocation-quotes`**：contextId、targetId 必填；entryId 当前服务也会提交，应与路径一致。返回经营报价及最终受益人、分配类型、金额、结算说明。
- **POST `/income/entries/{id}/allocations`**：contextId、quoteId、idempotencyKey 必填；返回 `{status:"PENDING_SETTLEMENT",operationId}`。
- **GET `/wallet/withdrawals`**：contextId 必填，分页可选；返回列表项 id/title/amount/fee/netAmount/status/accountType/accountName/bankName/maskedBankNumber/createdAt。
- **GET `/wallet/withdrawal-options`**：contextId 必填；返回余额、最低/最高提现金额、手续费说明、账户类型与收款账户候选、allowedActions。
- **POST `/wallet/payees`**：contextId、accountType、name、bankName、bankNumber 必填；accountType 为 PERSONAL/COMPANY。返回 `{payeeToken}`，建议附 maskedBankNumber；银行卡号当前校验为 16–19 位。
- **POST `/wallet/withdrawal-quotes`**：contextId、accountType、payeeToken、amount 必填，amount 为整数分；返回经营报价及 amount/fee/netAmount 与脱敏账户信息。
- **POST `/wallet/withdrawals`**：contextId、quoteId、idempotencyKey 必填；返回 `{status:"PENDING_REVIEW",withdrawalId}` 或含 operationId 的等价回执。

特殊逻辑：收益的待分配、待结算、已结算、提现状态分别记录；分配完成不能直接增加可提现余额。提现提交应冻结余额，失败/拒绝释放，实际打款与提交成功分开；最低金额、手续费、到账周期和审核状态枚举由后端确认。原始银行卡信息只用于登记账户，报价、记录及日志不得回传完整卡号。收益公式、舍入、退款冲回及结算周期由后端管理规则版本。

## 12. 合店申请、代理邀请与申请

业务场景：选择门店与合店期限、费用试算并提交；通过代理推广码提交代理申请。来源：`exclusive.js`、`agency-application.js`、申请页面。

- **GET `/founder-awards`**：contextId、month 必填；分页可选。返回创始奖列表（id/title/amount/createdAt 及来源说明），月汇总字段按页面需要返回；现有 Mock 为空，正式明细列待确认。
- **GET `/costore/application-options`**：contextId 必填；返回 `{stores:[{id,name,...}],durations:[{id,label,months}],benefits,agreement:{version,content}}`。
- **POST `/costore/application-quotes`**：contextId、storeId、durationId 必填；返回 `{id,storeId,durationId,store,durationLabel,payableAmount,currency,expiresAt,serverTime}`，时间为毫秒。
- **POST `/applications/costore`**：contextId、quoteId、agreementVersion、idempotencyKey 必填；返回 `{application:申请}`。正式协议未发布不得提交。
- **GET `/applications`**：contextId 必填；type 当前为 COSTORE，分页可选；返回申请列表。若需包含代理与转店，建议 type 可选并统一类型枚举，当前前端只请求 COSTORE，须补适配。
- **GET `/promotion/agency-code`**：contextId、agencyType 必填，agencyType 为 STORE/COUNTY/CITY/PROVINCE；返回 `{accountId,agencyType,promotionId,qrUrl,posterUrl,shareUrl}`。
- **GET `/promotion/invitations/{promotionId}`**：无额外必填参数；返回 `{promotionId,agencyType,label,payableAmount,agreement:{version,content}}`，以后端邀请中类型为准，不信任路由 agencyType。
- **POST `/agency/applications`**：promotionId、name、phone、regionCodes、regionNames、address、idempotencyKey 必填；STORE 类型 storefrontAssetId 条件必填。返回 `{application:申请}`。若正式申请要求接受协议，建议新增 agreementVersion 并补前端勾选流程，当前未提交该字段。

申请核心结构：

```json
{"id":"application-1","title":"申请合店","applicationStatus":"PENDING_REVIEW","paymentStatus":"NOT_STARTED","contractStatus":"NOT_SIGNED","entitlementStatus":"NOT_OPEN","store":{"id":"store-1","name":"门店"},"agencyType":null,"payableAmount":60000,"createdAt":"2026-10-23T10:00:00+08:00"}
```

特殊逻辑：申请、审核、支付、合同生效、权益开通分别记录，不得用一个 success 代替全部状态。审核和付款顺序、合同签署、驳回退款、区域独占、代理有效期及审批后生效动作尚未确认，本次前端主要覆盖申请提交与记录；完整签约/开通链路需业务补充。

## 13. 门店、健脑官、会员课时、反馈与转店

业务场景：代理管理授权门店与工作人员，健脑官维护会员课时和训练反馈，提交/审批转店。来源：`business-store.js`、`training.js`。

- **GET `/agency/store-workspace`**：contextId、assignmentId 必填；单店身份 storeId 条件必填。返回 `{store,staff:[],approvals:[],members:[],owners:[],allowedActions:[]}`。
- **PATCH `/stores/{id}`**：contextId、name、address、version 必填，contact 可选；返回 `{store:{id,name,address,contact,version}}`。名称最多 60 字、地址最多 200 字。
- **POST `/stores/{storeId}/coaches`** / **PATCH `/stores/{storeId}/coaches/{id}`**：contextId、name、loginAccount 必填；新增 idempotencyKey 必填，修改 version 必填。返回 `{coach:{id,name,loginAccount,status,invitationStatus,version}}`。登录名 4–32 位字母数字下划线短横线；真实账号激活/初始凭证发放方式待确认，不能返回明文密码。
- **POST `/applications/{id}/decisions`**：contextId、storeId、decision、version、idempotencyKey 必填，decision 为 APPROVE/REJECT；拒绝时 reason 必填，最多 200 字。返回 `{status,nextStep?}`。需校验审批人权限与待审状态。
- **GET `/coach/workspace`**：健脑官账号由 token 决定任职，无额外必填参数；代理代管时 contextId 必填。返回 `{contextId,name,store:{id,...},members:[],allowedActions:[]}`。
- **GET `/members/{id}/store-profile`**：contextId 必填；返回 `{member:{...会员基础资料及课时},allowedActions:[]}`。
- **PATCH `/members/{id}/training`**：contextId、version、trainingTotal、trainingUsed、specialTotal、specialUsed 必填；selfStudyNote、campNote、remark 可选，当前服务按字符串提交。返回 `{member:{...}}`。
- **GET `/members/{id}/training-feedback`**：门店入口 contextId 必填，kind 可选，分页参数建议支持；返回 `{items:[],hasMore,nextCursor,allowedActions:[]}`。
- **POST `/training-feedback`**：contextId、memberId、kind、title、text、idempotencyKey 必填；imageAssetIds、attachmentAssetIds 可选。kind 为 training/self-study/camp；返回 `{id}`。
- **GET `/training-feedback/{id}`**：memberId 必填，门店管理 contextId 条件必填；返回 `{id,memberId,memberName,title,kind,coachName,createdAt,content,images:[],attachments:[{assetId,kind,name,size,previewUrl}]}`，附件 kind 为 file/video。
- **GET `/store-transfer/options`**：contextId、memberId 必填；keyword、regionCodes 可选；返回 `{currentStore,stores:[{id,name,address,regionCodes}]}`。
- **POST `/store-transfer/applications`**：contextId、memberId、targetStoreId、reason、idempotencyKey 必填；返回 `{application:{id,type:"TRANSFER",memberId,targetStoreId,status:"PENDING",version}}`。

特殊逻辑：课时为 0–10000 的整数，已消耗不能超过总课时；剩余课时由后端计算。备注各最多 500 字；反馈标题 1–80 字、正文 1–3000 字、图片最多 6 张、附件最多 6 个。反馈须属于目标会员且可被相应家长/任职人员查看。

同会员不能并存重复待审转店申请；审批通过后何时变更归属、课时与订单历史如何迁移需确认。健脑官入口已独立登录，但若干会员操作仍复用 `agency:store-management` 守卫；正式联调需由后端提供真实 staff context/capabilities，并同步调整前端，不能给健脑官伪造代理身份。

## 14. 上传资源、富文本、素材库与海报生成

业务场景：上传头像、门头、反馈图片/附件及素材二维码；浏览后台素材、合成个人海报。来源：`profile.js`、`materials.js`、`training-assets.js`。

- **POST `/assets/upload-intents`**：purpose、fileName、mimeType、size 必填；返回 `{assetId,mode:"multipart",uploadUrl,fileField,headers,fields,limits:{maxSize}}`。purpose 支持 avatar/member-avatar/feedback/storefront/material-qr/training-file/training-video，按用途独立校验。
- **POST `/assets/{id}/completions`**：无额外业务参数；返回 `{status:"ready",previewUrl?}`。现有路径 `/assets/{id}/complete`。训练附件需要 previewUrl；如有异步转码/审核须补查询与等待逻辑，当前前端只接受 ready。
- **GET `/materials/categories`**：type 必填，image/article/video；返回 `{categories:[{id,name}]}`。
- **GET `/materials`**：type 必填，categoryId、分页可选；返回列表项 `{id,title,type,coverUrl,...}`。
- **GET `/materials/{id}`**：无额外参数；返回 `{id,title,type,content,mediaUrl,shareUrl,allowedOperations:[]}`，需要合成的素材附模板/编辑元信息，具体字段按 material-edit 页面冻结。
- **POST `/materials/{id}/renders`**：qrAssetId、idempotencyKey 必填；返回 `{jobId}`。
- **GET `/jobs/{jobId}`**：无额外参数；返回 `{status,downloadUrl?,shareUrl?,message?}`，状态 queued/processing/succeeded/failed，成功时至少一个结果链接。

图片当前支持 PNG/JPG；训练附件支持 30MB 内 PDF/MP4；图片最大尺寸/大小以上传意图返回值为准。上传 URL 必须为 HTTPS，服务端返回 multipart 参数，前端不假设对象存储 PUT。complete 时检查真实文件类型、大小、资源归属、用途、扫描/处理结果；未 ready 的 asset 不得绑定业务。

统一富文本建议：

```json
{"format":"nodes","version":1,"nodes":[]}
```

正文采用白名单节点 JSON，不直接返回任意 HTML；标题、摘要、封面与正文分离。等级权益及素材模板尚未配置时允许空正文，不填虚构营销文案。后端负责内容消毒、发布状态与私有媒体授权，签名地址需有有效期与续签方案。课程正文、素材、权益介绍各自独立鉴权；有正文不等于允许下载/生成。

素材前端是消费与二维码合成入口，不包含客户后台完整素材 CRUD。生成任务必须检查模板发布状态、允许操作、二维码 asset 用途及归属，并隔离账号任务；失败返回可展示原因。

## 15. 后端必须确认的业务规则

1. 登录手机号字段、channel 编码及 token 有效期/撤销方式；已绑定微信账号是否直接登录。
2. 家庭成员数量限制、家长与孩子关系维护、会员和专栏权益的归属与转让规则。
3. 价格等级、优惠叠加、运费、库存预占与订单自动关闭时间；非实物履约的实际交付数据。
4. 支付渠道与各平台拉起参数、通知验签及主动查询方案；当前收银台尚缺正式平台支付适配。
5. VIP 购买资格、标准/活动名额价格、有效期、批次扣减及回收规则；升级补差与服务费。
6. 晋升、经验、全球奖、创始奖、各类分红、销售/巡查提点规则及规则版本、结算周期与退款冲回。
7. 提现限制、手续费、账户认证、审核及打款失败处理，完整提现状态枚举。
8. 合店/代理申请的审核、付款、签约、开通顺序；代理区域独占与邀请有效性；我的申请是否统一展示全部类型。
9. 健脑官任职上下文与操作权限、课时修改审计，转店生效与历史数据归属。
10. 素材可编辑范围、模板合成参数、私有媒体签名有效期、异步处理状态查询方式。

上述内容应由业务和后端给出正式规则；本文只定义前端所需的输入、输出与状态边界，不把演示数据冻结为生产规则。

## 16. 联调命名与现有适配差异

为满足 RESTful 风格，本文将认证动作与订单动作等表示为资源创建。以下为需修改 service 的映射，其他路径优先沿用现有代码：

- `/auth/login` → POST `/auth/sessions`；`/auth/register` → POST `/auth/registrations`。
- `/auth/sms/send` → POST `/auth/sms-challenges`。
- `/auth/password/verify` → POST `/auth/password-reset-verifications`；`/auth/password/reset` → POST `/auth/password-resets`；`/auth/password/change` → POST `/me/password-changes`。
- `/auth/wechat/authorize` → POST `/auth/wechat/authorizations`；`/auth/wechat/exchange` → POST `/auth/wechat/exchanges`。
- `/orders/{id}/cancel` → POST `/orders/{id}/cancellations`；`/orders/{id}/confirm-receipt` → POST `/orders/{id}/receipts`。
- POST `/partner/superior` → POST `/partner/superior-bindings`；GET `/partner/superior` 保留读取。
- `/assets/{id}/complete` → POST `/assets/{id}/completions`。

其他必须同步的契约差异：

- 登录返回当前使用 token，不是 accessToken；H5 微信返回 url，不是 authorizeUrl；如后端采用其他命名，只在 service 映射。
- 注册当前发送 wechatTicket，微信交换返回 registrationTicket，两者同一票据不同适配名。
- 成功响应当前无 envelope；报价时间存在 ISO/毫秒两套要求，见第 2 节。
- 商城报价当前为单 productId/skuId/quantity，不是购物车 items 数组，不能直接接多商品报价契约。
- 报表当前要求 items/hasMore/nextCursor，即使上级/分享码/晋升任务等单对象页面也由通用读取器验证列表外壳。
- 原 `/member/levels`、`/partners`、`/products` 的简易演示读取函数仍存在；主流程使用学习新接口、经营 bootstrap 和 `/catalog`。旧路径不作为重复实现需求，应核对引用后清理或兼容。

## 17. 建议联调验收场景

- 无登录、登录过期、越权 member/context/store/contract/assignment、身份到期均返回明确错误且不泄漏数据。
- 首屏、下一页、空列表与筛选切换正确；汇总不随分页重复累加。
- 并发修改触发版本冲突；同 key 同参数返回原结果，同 key 不同参数拒绝。
- 报价过期、库存不足、地址删除/修改、券被占用后不能创建新订单；请求超时重试不重复下单。
- 支付处理中、取消、失败、成功、重复通知及超时恢复；未支付不发权益，取消释放预占。
- 激活不能跨会员误用；未解锁无法读取私有课文/视频；学习进度按孩子隔离。
- 名额并发扣减、升级预占释放、收益分配与结算分离、提现余额冻结和失败释放均可追溯。
- 资源类型/用途/归属校验、私有链接过期及海报任务失败返回正确；未发布正文可为空。

这些是后续联调验收建议，不表示本次已执行服务端测试。
