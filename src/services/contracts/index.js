import { callEndpoint } from './client'

/**
 * 开通/续费 200 权益收益费（幂等）
 * POST /me/entitlement-orders
 * 参数：idempotencyKey, channel?(wechat/alipay/bank_card，默认 wechat)
 * 返回：sandbox: status=SUCCEEDED + paymentId + displayId(重算后) + entitlement{...}；live: status=CREATED + payParams
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postMeEntitlementOrders = (input = {}) => callEndpoint("POST /me/entitlement-orders", input)

/**
 * 导出历史收益账单（active/expired 可用；never_paid 返回 403）
 * GET /me/income-export
 * 参数：format?
 * 返回：JSON: {displayId,total,byType,count,items[]}；CSV: 附件下载
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMeIncomeExport = (input = {}) => callEndpoint("GET /me/income-export", input)

/**
 * 撤销代理（admin）
 * POST /api/agent/revoke
 * 参数：partnerId, agentId?/regionType?, reason?
 * 返回：{revoked, displayId(前缀改QZ、编号不变), seq, tierKept}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiAgentRevoke = (input = {}) => callEndpoint("POST /api/agent/revoke", input)

/**
 * 总部批量发激活码（admin）
 * POST /admin/activation-codes
 * 参数：targetType, count≤100, issuedTo?, storeId?, expiresInDays?
 * 返回：{batchId, codes[], records[]}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAdminActivationCodes = (input = {}) => callEndpoint("POST /admin/activation-codes", input)

/**
 * 门店收款发码（agency 上下文，仅 fs/jy）
 * POST /agency/activation-codes
 * 参数：contextId, targetType, count
 * 返回：{batchId, codes[], storeId}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAgencyActivationCodes = (input = {}) => callEndpoint("POST /agency/activation-codes", input)

/**
 * 上级赠码（仅 cj/xn/ys，仅直属下级，码绑定该家长）
 * POST /partner/gift-codes
 * 参数：contextId, targetType, toUserId/toPhone
 * 返回：{batchId, codes[], issuedTo}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerGiftCodes = (input = {}) => callEndpoint("POST /partner/gift-codes", input)

/**
 * 我的支付单列表/详情（未开通权益时亦可查）
 * GET /me/payments
 * 参数：—
 * 返回：{items[]/{payment, payParams?}, paymentMode}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMePayments = (input = {}) => callEndpoint("GET /me/payments", input)

/**
 * 我的支付单列表/详情（未开通权益时亦可查）
 * GET /me/payments/{id}
 * 参数：—
 * 返回：{items[]/{payment, payParams?}, paymentMode}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMePaymentsById = (input = {}) => callEndpoint("GET /me/payments/{id}", input)

/**
 * 渠道异步通知（公开端点，验签入账）
 * POST /payments/notify/{channel}
 * 参数：paymentId, sign(live)
 * 返回：{ok, paymentId, status, newlyPaid, effect}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPaymentsNotifyByChannel = (input = {}) => callEndpoint("POST /payments/notify/{channel}", input)

/**
 * 创建登录会话（parent 手机号 / coach 健脑官 / admin 总部）
 * POST /auth/sessions
 * 参数：password, channel(parent/coach/admin), phone 或 loginAccount
 * 返回：token, user{id,name,role,displayId}, entitlement{state,amount}, accountType, expiresAt?
 * - **POST `/auth/sessions`**：创建登录会话。`password`、`channel` 必填；channel=parent 时 `phone` 必填，channel=coach 时 `loginAccount` 必填（4–32 位字母数字下划线短横线），两个登录标识按入口择一提交。返回 `{token,user:{id,name,role},accountType,expiresAt?}`；accountType 为 `parent` 或 `coach`。现有路径 `/auth/login`。
 * - `/auth/login` → POST `/auth/sessions`；`/auth/register` → POST `/auth/registrations`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAuthSessions = (input = {}) => callEndpoint("POST /auth/sessions", input)

/**
 * 发送短信验证码（注册/找回密码）
 * POST /auth/sms-challenges
 * 参数：phone, purpose(register/reset-password)
 * 返回：retryAfter, expiresAt?, devCode(测试平台回传)
 * - **POST `/auth/sms-challenges`**：发送短信。`phone`、`purpose` 必填，purpose 为 `register` 或 `reset-password`。返回 `{retryAfter,expiresAt?}`，retryAfter 单位秒。现有 `/auth/sms/send`。
 * - `/auth/sms/send` → POST `/auth/sms-challenges`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAuthSmsChallenges = (input = {}) => callEndpoint("POST /auth/sms-challenges", input)

/**
 * 注册新账号（手机号+密码，支持邀请码绑定上级）
 * POST /auth/registrations
 * 参数：phone, password, name?, inviteCode?
 * 返回：登录会话结构 + displayId(QZ 开头) + entitlement{state:'never_paid'}
 * - **POST `/auth/registrations`**：注册。`phone`、`code`、`password`、`regionCodes` 必填；regionCodes 为三级行政区编码；`region`、`inviteCode` 可选；微信注册时 `wechatTicket` 条件必填。返回登录会话结构。密码确认字段只在前端校验，不提交。现有 `/auth/register`。
 * - `/auth/login` → POST `/auth/sessions`；`/auth/register` → POST `/auth/registrations`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAuthRegistrations = (input = {}) => callEndpoint("POST /auth/registrations", input)

/**
 * 校验重置验证码，发重置票据
 * POST /auth/password-reset-verifications
 * 参数：phone, code
 * 返回：resetTicket, expiresAt?
 * - **POST `/auth/password-reset-verifications`**：`phone`、`code` 必填；返回 `{resetTicket,expiresAt?}`。现有 `/auth/password/verify`。
 * - `/auth/password/verify` → POST `/auth/password-reset-verifications`；`/auth/password/reset` → POST `/auth/password-resets`；`/auth/password/change` → POST `/me/password-changes`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAuthPasswordResetVerifications = (input = {}) => callEndpoint("POST /auth/password-reset-verifications", input)

/**
 * 用票据重置密码
 * POST /auth/password-resets
 * 参数：resetTicket, password
 * 返回：{success:true}
 * - **POST `/auth/password-resets`**：`resetTicket`、`password` 必填；返回 `{success:true}`。现有 `/auth/password/reset`。
 * - `/auth/password/verify` → POST `/auth/password-reset-verifications`；`/auth/password/reset` → POST `/auth/password-resets`；`/auth/password/change` → POST `/me/password-changes`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAuthPasswordResets = (input = {}) => callEndpoint("POST /auth/password-resets", input)

/**
 * 登录态下修改密码（门禁豁免）
 * POST /me/password-changes
 * 参数：oldPassword, newPassword
 * 返回：{changed:true}
 * - **POST `/me/password-changes`**：`oldPassword`、`newPassword` 必填；返回 `{changed:true}`。现有 `/auth/password/change`。
 * - `/auth/password/verify` → POST `/auth/password-reset-verifications`；`/auth/password/reset` → POST `/auth/password-resets`；`/auth/password/change` → POST `/me/password-changes`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postMePasswordChanges = (input = {}) => callEndpoint("POST /me/password-changes", input)

/**
 * H5 微信授权，取跳转地址
 * POST /auth/wechat/authorizations
 * 参数：redirectUri, inviteCode?
 * 返回：{url, state}
 * - **POST `/auth/wechat/authorizations`**：H5 微信授权。`redirectUri` 必填，`inviteCode` 可选；返回 `{url,state}`。现有 `/auth/wechat/authorize`。
 * - `/auth/wechat/authorize` → POST `/auth/wechat/authorizations`；`/auth/wechat/exchange` → POST `/auth/wechat/exchanges`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAuthWechatAuthorizations = (input = {}) => callEndpoint("POST /auth/wechat/authorizations", input)

/**
 * 微信 code 换注册票据
 * POST /auth/wechat/exchanges
 * 参数：code, platform(h5/mp-weixin), state?
 * 返回：{registrationTicket, expiresAt?}
 * - **POST `/auth/wechat/exchanges`**：`code`、`platform` 必填，platform 为 `h5` / `mp-weixin`；H5 的 `state` 条件必填，`inviteCode` 可选。返回 `{registrationTicket,expiresAt?}`，前端注册时映射为 wechatTicket。现有 `/auth/wechat/exchange`。
 * - `/auth/wechat/authorize` → POST `/auth/wechat/authorizations`；`/auth/wechat/exchange` → POST `/auth/wechat/exchanges`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAuthWechatExchanges = (input = {}) => callEndpoint("POST /auth/wechat/exchanges", input)

/**
 * 拉取当前账号经营身份 + **对外编号 + 权益门禁状态**
 * GET /me/bootstrap
 * 参数：无
 * 返回：displayId, entitlement{state,amount,expiresAt,frozen,canExportBills}, contexts[], businessContexts[]
 * - **GET `/me/bootstrap`**：无业务参数，返回下面的身份集合。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMeBootstrap = (input = {}) => callEndpoint("GET /me/bootstrap", input)

/**
 * 撤销当前 token（门禁豁免）
 * DELETE /auth/sessions/current
 * 参数：无
 * 返回：{success:true}
 * 特殊逻辑：手机号与短信用途绑定、服务端限流、验证码/票据一次性消费；邀请码校验邀请关系且禁止自绑。微信重定向地址须校验白名单，授权 state 绑定会话。目前微信前端流程只接收注册票据，已绑定微信是否直接登录需要确认并补适配。密码前端要求 6–32 位、无空格；服务端仍独立校验。当前退出仅清本地会话；**建议新增 DELETE `/auth/sessions/current`** 撤销当前 token，返回 `{success:true}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const deleteAuthSessionsCurrent = (input = {}) => callEndpoint("DELETE /auth/sessions/current", input)

/**
 * 账号资料、门店/订单数、客服入口、专属权限
 * GET /me
 * 参数：无
 * 返回：profile, store, orderCounts, support, exclusiveAccess
 * - **GET `/me`**：无参数。返回 `profile:{id,nickname,avatarUrl,phone?,regionCodes,regionNames,version}`、`store`、`orderCounts:{pendingPayment,waitingShipment,waitingReceipt,completed}`、`support:{phone,description}`、`exclusiveAccess:{accountId,contextId,capabilities}`。
 * - **PATCH `/me`**：`nickname`、`version` 必填；`regionCodes`、`avatarAssetId` 可选；返回 `{profile:{...}}`。昵称 1–24 字，地区修改须为三级编码。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMe = (input = {}) => callEndpoint("GET /me", input)

/**
 * 修改昵称/地区/头像
 * PATCH /me
 * 参数：nickname, version, regionCodes?, avatarAssetId?
 * 返回：{profile}
 * - **GET `/me`**：无参数。返回 `profile:{id,nickname,avatarUrl,phone?,regionCodes,regionNames,version}`、`store`、`orderCounts:{pendingPayment,waitingShipment,waitingReceipt,completed}`、`support:{phone,description}`、`exclusiveAccess:{accountId,contextId,capabilities}`。
 * - **PATCH `/me`**：`nickname`、`version` 必填；`regionCodes`、`avatarAssetId` 可选；返回 `{profile:{...}}`。昵称 1–24 字，地区修改须为三级编码。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const patchMe = (input = {}) => callEndpoint("PATCH /me", input)

/**
 * 收货地址列表
 * GET /addresses
 * 参数：cursor, pageSize?
 * 返回：地址列表
 * - **GET `/addresses`**：分页参数可选；返回地址列表。
 * - **POST `/addresses`** / **PATCH `/addresses/{id}`**：`recipient`、`phone`、`regionCodes`、`regionNames`、`detail` 必填；`isDefault` 可选；修改时 `version` 必填。返回 `{address:{...}}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAddresses = (input = {}) => callEndpoint("GET /addresses", input)

/**
 * 单个地址详情
 * GET /addresses/{id}
 * 参数：—
 * 返回：address{recipient,phone,regionCodes,detail,isDefault,version}
 * - **GET `/addresses/{id}`**：无额外参数；返回 `{address:{id,recipient,phone,regionCodes,regionNames,detail,isDefault,version}}`。
 * - **POST `/addresses`** / **PATCH `/addresses/{id}`**：`recipient`、`phone`、`regionCodes`、`regionNames`、`detail` 必填；`isDefault` 可选；修改时 `version` 必填。返回 `{address:{...}}`。
 * - **DELETE `/addresses/{id}`**：`version` 必填；返回 `{success:true}`。现有实现放 Body，需确认网关支持 DELETE Body，否则迁移到条件请求头。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAddressesById = (input = {}) => callEndpoint("GET /addresses/{id}", input)

/**
 * 新增地址
 * POST /addresses
 * 参数：recipient, phone, regionCodes, regionNames, detail
 * 返回：{address}
 * - **GET `/addresses`**：分页参数可选；返回地址列表。
 * - **POST `/addresses`** / **PATCH `/addresses/{id}`**：`recipient`、`phone`、`regionCodes`、`regionNames`、`detail` 必填；`isDefault` 可选；修改时 `version` 必填。返回 `{address:{...}}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAddresses = (input = {}) => callEndpoint("POST /addresses", input)

/**
 * 修改地址
 * PATCH /addresses/{id}
 * 参数：version + 上述字段
 * 返回：{address}
 * - **GET `/addresses/{id}`**：无额外参数；返回 `{address:{id,recipient,phone,regionCodes,regionNames,detail,isDefault,version}}`。
 * - **POST `/addresses`** / **PATCH `/addresses/{id}`**：`recipient`、`phone`、`regionCodes`、`regionNames`、`detail` 必填；`isDefault` 可选；修改时 `version` 必填。返回 `{address:{...}}`。
 * - **DELETE `/addresses/{id}`**：`version` 必填；返回 `{success:true}`。现有实现放 Body，需确认网关支持 DELETE Body，否则迁移到条件请求头。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const patchAddressesById = (input = {}) => callEndpoint("PATCH /addresses/{id}", input)

/**
 * 设置默认地址
 * PUT /addresses/default
 * 参数：addressId, version
 * 返回：{defaultAddressId}
 * - **PUT `/addresses/default`**：`addressId`、`version` 必填；返回 `{defaultAddressId}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const putAddressesDefault = (input = {}) => callEndpoint("PUT /addresses/default", input)

/**
 * 删除地址
 * DELETE /addresses/{id}
 * 参数：version
 * 返回：{success:true}
 * - **GET `/addresses/{id}`**：无额外参数；返回 `{address:{id,recipient,phone,regionCodes,regionNames,detail,isDefault,version}}`。
 * - **POST `/addresses`** / **PATCH `/addresses/{id}`**：`recipient`、`phone`、`regionCodes`、`regionNames`、`detail` 必填；`isDefault` 可选；修改时 `version` 必填。返回 `{address:{...}}`。
 * - **DELETE `/addresses/{id}`**：`version` 必填；返回 `{success:true}`。现有实现放 Body，需确认网关支持 DELETE Body，否则迁移到条件请求头。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const deleteAddressesById = (input = {}) => callEndpoint("DELETE /addresses/{id}", input)

/**
 * 我的优惠券（可用/已用/作废）
 * GET /coupons
 * 参数：status(available/used/void), cursor?
 * 返回：优惠券列表
 * - **GET `/coupons`**：`status` 必填，为 available/used/void；分页可选。返回列表项 `id,title,discountAmount,thresholdText,validUntilLabel,scopeLabel,status,expiresAt`；建议同时提供机器可读门槛及适用品类，结算可用性仍由报价判断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getCoupons = (input = {}) => callEndpoint("GET /coupons", input)

/**
 * 客服配置（电话/反馈上限）
 * GET /support/config
 * 参数：无
 * 返回：{phone, description, feedback}
 * - **GET `/support/config`**：无参数；返回 `{phone,description,feedback:{maxImages}}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getSupportConfig = (input = {}) => callEndpoint("GET /support/config", input)

/**
 * 提交意见反馈
 * POST /support/feedback
 * 参数：content, idempotencyKey, imageAssetIds?
 * 返回：{feedbackId}
 * - **POST `/support/feedback`**：`content`、`idempotencyKey` 必填；`imageAssetIds` 可选。返回 `{feedbackId}`。内容 1–500 字，当前最多 3 张图片。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postSupportFeedback = (input = {}) => callEndpoint("POST /support/feedback", input)

/**
 * 用户/隐私协议正文
 * GET /agreements/{type}
 * 参数：type(user/privacy)
 * 返回：{title, version, content}
 * - **GET `/agreements/{type}`**：type 为 user/privacy；返回 `{title,version,content}`，正文格式见第 14 节。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAgreementsByType = (input = {}) => callEndpoint("GET /agreements/{type}", input)

/**
 * 年级/性别选项
 * GET /members/options
 * 参数：无
 * 返回：{grades[], genders[]}
 * - **GET `/members/options`**：无参数；返回 `{grades:[{code,label}],genders:[{code,label}]}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMembersOptions = (input = {}) => callEndpoint("GET /members/options", input)

/**
 * 家庭成员列表
 * GET /members
 * 参数：scope=family, contextId
 * 返回：成员列表(id,name,grade,gender,displayId,memberLevel,memberLevelName,badge…)
 * - **GET `/members`**：`scope=family`、`contextId` 必填；分页可选。列表项包含 `id,contextId,displayId,name,avatarUrl,gradeCode,gradeLabel,genderCode,genderLabel,badge,levels,training,version`。
 * - **POST `/members`** / **PATCH `/members/{id}`**：`name`、`gradeCode`、`genderCode`、`contextId` 必填；`avatarAssetId` 可选；新增 `idempotencyKey` 必填，修改 `version` 必填。返回 `{member:{...}}`。姓名 1–24 字。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMembers = (input = {}) => callEndpoint("GET /members", input)

/**
 * 新增孩子
 * POST /members
 * 参数：name, gradeCode, genderCode, contextId, idempotencyKey
 * 返回：{member}（默认普通会员 QZ+序号）
 * - **GET `/members`**：`scope=family`、`contextId` 必填；分页可选。列表项包含 `id,contextId,displayId,name,avatarUrl,gradeCode,gradeLabel,genderCode,genderLabel,badge,levels,training,version`。
 * - **POST `/members`** / **PATCH `/members/{id}`**：`name`、`gradeCode`、`genderCode`、`contextId` 必填；`avatarAssetId` 可选；新增 `idempotencyKey` 必填，修改 `version` 必填。返回 `{member:{...}}`。姓名 1–24 字。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postMembers = (input = {}) => callEndpoint("POST /members", input)

/**
 * 编辑孩子
 * PATCH /members/{id}
 * 参数：version + 上述
 * 返回：{member}
 * - **POST `/members`** / **PATCH `/members/{id}`**：`name`、`gradeCode`、`genderCode`、`contextId` 必填；`avatarAssetId` 可选；新增 `idempotencyKey` 必填，修改 `version` 必填。返回 `{member:{...}}`。姓名 1–24 字。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const patchMembersById = (input = {}) => callEndpoint("PATCH /members/{id}", input)

/**
 * 激活前预览（不消耗码）
 * POST /activations/preview
 * 参数：code, memberId, targetType?, targetId?
 * 返回：预览对象/等级/会员等级/是否已激活
 * - **POST `/activations/preview`**：`code`、`memberId` 必填；家庭管理传 `contextId`；从指定等级页进入时 `targetType=level`、`targetId` 条件必填。返回 `{code,memberId,targetType,targetId,levelId?,levelName?,alreadyActivated?,...}`，需足以显示实际激活对象并供确认提交。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postActivationsPreview = (input = {}) => callEndpoint("POST /activations/preview", input)

/**
 * 提交激活（原子消费码+发权益）
 * POST /activations
 * 参数：code, targetType, targetId(等级码可空), idempotencyKey, memberId?
 * 返回：{unlocked:true,…}
 * - **POST `/activations`**：`code`、`targetType`、`targetId`、`idempotencyKey` 必填；等级激活 `memberId` 必填，管理场景传 contextId。返回 `{unlocked:true,memberId?,targetType?,targetId?}`，成功后重新读取权益。
 * - **POST `/activations`**：专栏激活提交 `targetType=column`、`targetId`、`code`、`idempotencyKey`，均必填；返回 `{unlocked:true}`。专栏权益当前按购买账号归属，是否支持孩子分配待确认。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postActivations = (input = {}) => callEndpoint("POST /activations", input)

/**
 * 我收到的激活码（绑定我的赠码）
 * GET /me/activation-codes
 * 参数：—
 * 返回：{items[]{code,targetType,status,uses}}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMeActivationCodes = (input = {}) => callEndpoint("GET /me/activation-codes", input)

/**
 * 孩子的订单列表
 * GET /members/{id}/orders
 * 参数：contextId, cursor?
 * 返回：订单列表
 * - **GET `/members/{id}/orders`**：`contextId` 必填，分页可选；返回订单列表，结构见第 8 节。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMembersByIdOrders = (input = {}) => callEndpoint("GET /members/{id}/orders", input)

/**
 * 孩子训练反馈列表
 * GET /members/{id}/training-feedback
 * 参数：contextId, kind(training/self-study/camp)
 * 返回：反馈列表
 * - **GET `/members/{id}/training-feedback`**：家庭读取 `contextId`、`kind` 必填，kind 为 training/self-study/camp；分页可选。返回反馈列表，结构见第 13 节。
 * - **GET `/members/{id}/training-feedback`**：门店入口 contextId 必填，kind 可选，分页参数建议支持；返回 `{items:[],hasMore,nextCursor,allowedActions:[]}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMembersByIdTrainingFeedback = (input = {}) => callEndpoint("GET /members/{id}/training-feedback", input)

/**
 * 反馈详情
 * GET /training-feedback/{id}
 * 参数：memberId, contextId?
 * 返回：反馈详情(含图片/附件)
 * - **GET `/training-feedback/{id}`**：`memberId` 必填；管理入口 `contextId` 条件必填；返回反馈详情。
 * - **GET `/training-feedback/{id}`**：memberId 必填，门店管理 contextId 条件必填；返回 `{id,memberId,memberName,title,kind,coachName,createdAt,content,images:[],attachments:[{assetId,kind,name,size,previewUrl}]}`，附件 kind 为 file/video。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getTrainingFeedbackById = (input = {}) => callEndpoint("GET /training-feedback/{id}", input)

/**
 * 板块导航（仅介绍，不暴露权益）
 * GET /learning/levels
 * 参数：memberId?
 * 返回：{levels[]{section,requireMemberLevel,unlocked}, memberLevelName?}
 * - **GET `/learning/levels`**：无参数；返回 `{levels:[{id,name,unlocked:false,...}]}`，只展示等级导航，不返回任意孩子权益。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getLearningLevels = (input = {}) => callEndpoint("GET /learning/levels", input)

/**
 * 某孩子已解锁等级与进度
 * GET /members/{memberId}/levels
 * 参数：—
 * 返回：{levels[]{unlocked,progress,requireMemberLevel}, memberLevelName}
 * - **GET `/members/{memberId}/levels`**：无额外参数；返回 `{levels:[{id,name,unlocked,progress?,...}]}`，按该孩子计算。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMembersByMemberIdLevels = (input = {}) => callEndpoint("GET /members/{memberId}/levels", input)

/**
 * 等级详情（章节）
 * GET /learning/levels/{levelId}
 * 参数：memberId?
 * 返回：{chapters[]{accessible,progress}, requireMemberLevel}
 * - **GET `/learning/levels/{levelId}`**：`memberId` 可选；孩子场景必填。返回 `{id,name,summary,covers:[],content,unlocked,chapters:[{id,title,type,accessible,progress}]}`；type 为 article/video。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getLearningLevelsByLevelId = (input = {}) => callEndpoint("GET /learning/levels/{levelId}", input)

/**
 * 公告列表
 * GET /announcements
 * 参数：cursor?
 * 返回：公告列表
 * - **GET `/announcements`**：分页可选；返回列表项 `id,title,summary?,publishedAt`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAnnouncements = (input = {}) => callEndpoint("GET /announcements", input)

/**
 * 公告详情
 * GET /announcements/{id}
 * 参数：—
 * 返回：{title, publishedAt, content}
 * - **GET `/announcements/{id}`**：无额外参数；返回 `{id,title,publishedAt,content}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAnnouncementsById = (input = {}) => callEndpoint("GET /announcements/{id}", input)

/**
 * 章节内容（图文/视频）
 * GET /lessons/{chapterId}
 * 参数：contextId&levelId 或 columnId
 * 返回：{content, videoUrl?, posterUrl?, requireMemberLevel}
 * - **GET `/lessons/{chapterId}`**：等级课程 `contextId`、`levelId` 条件必填；专栏课程 `columnId` 条件必填，二者按入口择一。返回 `{id,title,type,content,videoUrl?,posterUrl?}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getLessonsByChapterId = (input = {}) => callEndpoint("GET /lessons/{chapterId}", input)

/**
 * 上报学习进度
 * PUT /members/{memberId}/learning-progress
 * 参数：contextId, levelId, chapterId, positionSeconds…
 * 返回：保存后的进度字段
 * - **PUT `/members/{memberId}/learning-progress`**：`contextId`、`levelId`、`chapterId` 必填；`positionSeconds`、`durationSeconds`、`completed`、`ended` 为当前服务提交字段，应提供默认值。返回保存后的进度字段，例如 `{positionSeconds:120,durationSeconds:600,completed:false}`，具体外层待冻结。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const putMembersByMemberIdLearningProgress = (input = {}) => callEndpoint("PUT /members/{memberId}/learning-progress", input)

/**
 * 商品分类与摘要列表
 * GET /catalog
 * 参数：无
 * 返回：{categories[], items[]}
 * - **GET `/catalog`**：无参数；返回 `{categories:[{id,label}],items:[商品摘要]}`。当前页面按返回目录筛选；大目录分页或后端分类筛选为后续扩展。
 * - 原 `/member/levels`、`/partners`、`/products` 的简易演示读取函数仍存在；主流程使用学习新接口、经营 bootstrap 和 `/catalog`。旧路径不作为重复实现需求，应核对引用后清理或兼容。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getCatalog = (input = {}) => callEndpoint("GET /catalog", input)

/**
 * 商品详情（规格/价格/会员价）
 * GET /products/{id}
 * 参数：—
 * 返回：商品详情
 * - **GET `/products/{id}`**：无额外参数；返回商品详情，核心结构如下。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getProductsById = (input = {}) => callEndpoint("GET /products/{id}", input)

/**
 * 结算可选项（门店/会员/地址/券）
 * GET /checkout/options
 * 参数：无
 * 返回：{stores[], members[], addresses[], coupons[]}
 * - **GET `/checkout/options`**：无参数；返回 `{stores:[],members:[],addresses:[],coupons:[]}`。门店含 id/name/number/address，其他对象与对应模块一致；只给当前用户可用选项。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getCheckoutOptions = (input = {}) => callEndpoint("GET /checkout/options", input)

/**
 * 结算报价（最终价/优惠由后端算）
 * POST /checkout/quotes
 * 参数：productKey/productId, quantity, level?, memberId?
 * 返回：{id, goodsAmount, discountAmount, payableAmount, expiresAt, serverTime, ruleVersion}
 * - **POST `/checkout/quotes`**：`productId`、`skuId`、`quantity`、`storeId` 必填；实物 `addressId` 条件必填；商品 requiresMember=true 时 `memberId` 条件必填；`couponId`、`remark` 可选。数量 1–99，备注最多 200 字。返回 `{id,goodsAmount,discountAmount,payableAmount,expiresAt,serverTime,ruleVersion,store,memberId?,memberName?,address?}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postCheckoutQuotes = (input = {}) => callEndpoint("POST /checkout/quotes", input)

/**
 * 从报价创建订单（原子校验）
 * POST /orders
 * 参数：productKey, payableAmount, buyerId?
 * 返回：{order}
 * - **POST `/orders`**：`quoteId`、`idempotencyKey` 必填；返回 `{order:订单}`。
 * - **GET `/orders`**：分页、`keyword`、`status`、`fulfillmentStatus` 可选；现有另一适配器还会提交 `filter`，建议统一状态字段。返回订单列表。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postOrders = (input = {}) => callEndpoint("POST /orders", input)

/**
 * 订单列表（筛选/分页）
 * GET /orders
 * 参数：status, fulfillmentStatus, keyword?
 * 返回：订单列表
 * - **POST `/orders`**：`quoteId`、`idempotencyKey` 必填；返回 `{order:订单}`。
 * - **GET `/orders`**：分页、`keyword`、`status`、`fulfillmentStatus` 可选；现有另一适配器还会提交 `filter`，建议统一状态字段。返回订单列表。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getOrders = (input = {}) => callEndpoint("GET /orders", input)

/**
 * 订单详情
 * GET /orders/{id}
 * 参数：contextId?(经营只读)
 * 返回：{order, serverTime}
 * - **GET `/orders/{id}`**：买家读取无额外参数；经营只读入口 `contextId` 条件必填。返回 `{order:订单,serverTime}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getOrdersById = (input = {}) => callEndpoint("GET /orders/{id}", input)

/**
 * 取消订单（释放预占）
 * POST /orders/{id}/cancellations
 * 参数：version, idempotencyKey
 * 返回：{order}
 * - **POST `/orders/{id}/cancellations`**：`version`、`idempotencyKey` 必填；返回 `{order:订单}`。现有 `/orders/{id}/cancel`。
 * - `/orders/{id}/cancel` → POST `/orders/{id}/cancellations`；`/orders/{id}/confirm-receipt` → POST `/orders/{id}/receipts`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postOrdersByIdCancellations = (input = {}) => callEndpoint("POST /orders/{id}/cancellations", input)

/**
 * 确认收货
 * POST /orders/{id}/receipts
 * 参数：version, idempotencyKey
 * 返回：{order}
 * - **POST `/orders/{id}/receipts`**：`version`、`idempotencyKey` 必填；返回 `{order:订单}`。现有 `/orders/{id}/confirm-receipt`。
 * - `/orders/{id}/cancel` → POST `/orders/{id}/cancellations`；`/orders/{id}/confirm-receipt` → POST `/orders/{id}/receipts`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postOrdersByIdReceipts = (input = {}) => callEndpoint("POST /orders/{id}/receipts", input)

/**
 * 该订单可用支付渠道
 * GET /orders/{id}/payment-channels
 * 参数：—
 * 返回：{items[]{id,label,kind}}
 * - **GET `/orders/{id}/payment-channels`**：无额外参数；返回 `{items:[{id,label,kind}]}`，按订单和运行平台给出真正可用渠道。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getOrdersByIdPaymentChannels = (input = {}) => callEndpoint("GET /orders/{id}/payment-channels", input)

/**
 * 发起支付（商品订单）
 * POST /payments/attempts
 * 参数：orderId, channel, idempotencyKey
 * 返回：{id, orderId, status, channel}
 * - **POST `/payments/attempts`**：`orderId`、`channel`、`idempotencyKey` 必填；返回 `{id,orderId,status,channel}`。**正式支付还需补充平台调用参数或跳转地址，字段与前端平台支付适配需共同确认**。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPaymentsAttempts = (input = {}) => callEndpoint("POST /payments/attempts", input)

/**
 * 支付结果查询
 * GET /payments/attempts/{id}
 * 参数：—
 * 返回：{status: PROCESSING/SUCCEEDED/FAILED/CANCELLED}
 * - **GET `/payments/attempts/{id}`**：无额外参数；返回 `{id,orderId,status,channel,order?}`。status 为 PROCESSING/SUCCEEDED/FAILED/CANCELLED。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPaymentsAttemptsById = (input = {}) => callEndpoint("GET /payments/attempts/{id}", input)

/**
 * 专栏详情与解锁状态
 * GET /columns/{id}
 * 参数：memberId?
 * 返回：{product, unlocked, chapters[]}
 * - **GET `/columns/{id}`**：id 当前为专栏商品 ID；返回 `{product,unlocked,chapters:[{id,title,type}]}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getColumnsById = (input = {}) => callEndpoint("GET /columns/{id}", input)

/**
 * 批发（合伙人）工作台概览
 * GET /partner/overview
 * 参数：contextId
 * 返回：等级/余额/权益/统计
 * - **`/partner/overview`**：批发工作台；返回 `accountId,contextId,levelName,partnerStatus,annualRemainingDays,rankDescription,experience,experienceTarget,benefits` 及余额等展示字段。现有 `partner.js` 还存在无 contextId 的账户视角调用，需与经营视角统一。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerOverview = (input = {}) => callEndpoint("GET /partner/overview", input)

/**
 * 合店老板工作台概览
 * GET /costore/overview
 * 参数：contextId, contractId
 * 返回：门店/场景/分账/分红池
 * - **`/costore/overview`** / **`/agency/overview`**：返回 `accountId,contextId,benefits` 及所选门店/区域、当前等级、经营统计、权益有效期等字段。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getCostoreOverview = (input = {}) => callEndpoint("GET /costore/overview", input)

/**
 * 区域代理工作台概览
 * GET /agency/overview
 * 参数：contextId, assignmentId
 * 返回：区域/等级/统计
 * - **`/costore/overview`** / **`/agency/overview`**：返回 `accountId,contextId,benefits` 及所选门店/区域、当前等级、经营统计、权益有效期等字段。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAgencyOverview = (input = {}) => callEndpoint("GET /agency/overview", input)

/**
 * 合伙人收益列表
 * GET /partner/income
 * 参数：contextId, keyword?
 * 返回：{available, metrics, items[]}
 * - **`/partner/income`**：管理收益；keyword 可选。返回 `available,metrics,items`，items 含收益条目及 sourceName/details；详情见第 11 节。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerIncome = (input = {}) => callEndpoint("GET /partner/income", input)

/**
 * 我的上级信息
 * GET /partner/superior
 * 参数：contextId
 * 返回：{superior{name,phone,levelLabel}}
 * - **`/partner/superior`**：返回列表空壳及 `superior:{name,phone,levelLabel,scopeLabel}`，未绑定为 null。
 * - **POST `/partner/superior-bindings`**：contextId、inviteCode 必填；返回 `{superior:{...}}`；现有 POST `/partner/superior`。
 * - POST `/partner/superior` → POST `/partner/superior-bindings`；GET `/partner/superior` 保留读取。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerSuperior = (input = {}) => callEndpoint("GET /partner/superior", input)

/**
 * 我的推广码/海报/分享链接
 * GET /promotion/share-code
 * 参数：contextId
 * 返回：{inviteCode, qrUrl, posterUrl, shareUrl}
 * - **`/promotion/share-code`**：返回列表空壳及 `accountId,contextId,promotionId,inviteCode,qrUrl,posterUrl,shareUrl`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPromotionShareCode = (input = {}) => callEndpoint("GET /promotion/share-code", input)

/**
 * 全球奖明细与池
 * GET /partner/global-awards
 * 参数：contextId, month?
 * 返回：{eligibilityLabel, metrics, summary, items[]}
 * - **`/partner/global-awards`**：month 可选，默认月份规则待确认。返回 `eligibilityLabel,metrics,summary,columns,items`；明细含 month/eligibility/amount/weightedAmount/performanceAmount/salesAmount/shareBps/people/poolAmount。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerGlobalAwards = (input = {}) => callEndpoint("GET /partner/global-awards", input)

/**
 * 晋升任务进度
 * GET /partner/promotion-tasks
 * 参数：contextId
 * 返回：{promotion{…}}
 * - **`/partner/promotion-tasks`**：返回列表空壳及 `promotion:{beforeName,afterName,beforeQuota,afterQuota,paidAmount,standardAmount,differenceAmount,taskDescription,progress,target,statusLabel,validUntil}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerPromotionTasks = (input = {}) => callEndpoint("GET /partner/promotion-tasks", input)

/**
 * 经验台账
 * GET /partner/experience-ledger
 * 参数：contextId, filter?
 * 返回：{promotionExperience, productExperience, items[]}
 * - **`/partner/experience-ledger`**：filter 为 promotion/products；返回 `promotionExperience,productExperience,items:[{id,name,title,amount,initialLevel?,quotaUsed?,createdAt}]`。这里 amount 的语义为经验数值，不能套用金额格式，建议后续重命名 experienceValue 并同步适配。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerExperienceLedger = (input = {}) => callEndpoint("GET /partner/experience-ledger", input)

/**
 * 我的团队成员
 * GET /partner/team
 * 参数：contextId, keyword?
 * 返回：成员列表
 * - **`/partner/team`**：keyword 可选；返回团队成员 id/name/displayId/phone/avatarUrl/levelLabel/storeName/joinedAt/quotaRemaining/performance/upgradePlans/version。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerTeam = (input = {}) => callEndpoint("GET /partner/team", input)

/**
 * 名额台账（余额）
 * GET /partner/quota-ledger
 * 参数：contextId
 * 返回：{standardRemaining, activityRemaining, items[]}
 * - **`/partner/quota-ledger`**：返回 `standardRemaining,activityRemaining,items:[{id,title,quantity,activityQuantity?,targetName?,targetDisplayId?,targetLevel?,createdAt}]`。进货与划转目前共用路径但未传区分参数，建议新增 query `direction=in|out` 或 `kind=purchase|transfer|upgrade` 并修改适配器，不能仅凭数量正负区分划转和升级。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerQuotaLedger = (input = {}) => callEndpoint("GET /partner/quota-ledger", input)

/**
 * 活动名额批次
 * GET /partner/quotas
 * 参数：contextId
 * 返回：批次列表
 * - **`/partner/quotas`**：活动名额批次列表，项含 id/title/type?/grantedAt/expiresAt/total/used/reserved/remaining/validityLabel。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerQuotas = (input = {}) => callEndpoint("GET /partner/quotas", input)

/**
 * 收益条目（全身份）
 * GET /income/entries
 * 参数：contextId, filter(pending?), keyword?
 * 返回：{metrics, items[]}
 * - **`/income/entries`**：合店/代理收益；filter=pending 表示待分配，keyword 可选；返回 metrics 和收益列表。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getIncomeEntries = (input = {}) => callEndpoint("GET /income/entries", input)

/**
 * 合店卡项分红
 * GET /costore/card-dividends
 * 参数：contextId, month?, keyword?
 * 返回：{metrics, items[]}
 * - **`/costore/card-dividends`** / **`/costore/promotion-dividends`**：month、keyword 可选；返回 metrics 及分红列表，条目至少 id/title/amount/createdAt/sourceOrder，相关会员/门店或推广对象和规则说明由后端按业务补充。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getCostoreCardDividends = (input = {}) => callEndpoint("GET /costore/card-dividends", input)

/**
 * 合店推广分红
 * GET /costore/promotion-dividends
 * 参数：contextId, month?, keyword?
 * 返回：{metrics, items[]}
 * - **`/costore/card-dividends`** / **`/costore/promotion-dividends`**：month、keyword 可选；返回 metrics 及分红列表，条目至少 id/title/amount/createdAt/sourceOrder，相关会员/门店或推广对象和规则说明由后端按业务补充。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getCostorePromotionDividends = (input = {}) => callEndpoint("GET /costore/promotion-dividends", input)

/**
 * 代理授权区域团队树
 * GET /agency/team
 * 参数：contextId, assignmentId, keyword?
 * 返回：团队节点
 * - **`/agency/team`**：keyword 可选；返回授权区域内的团队树节点列表，含 id/name/roleLabel/parentId?/store?/regionLabel?/performance 等页面展示字段。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAgencyTeam = (input = {}) => callEndpoint("GET /agency/team", input)

/**
 * 团队节点详情
 * GET /agency/team/{id}
 * 参数：contextId, assignmentId
 * 返回：节点+成员+门店
 * - **`/agency/team/{id}`**：contextId、assignmentId 必填；返回该节点详情及人员、门店、业绩统计。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAgencyTeamById = (input = {}) => callEndpoint("GET /agency/team/{id}", input)

/**
 * 代理授权门店列表
 * GET /stores
 * 参数：contextId, assignmentId, keyword?
 * 返回：门店列表
 * - **`/stores`**：contextId、assignmentId 必填，keyword、分页可选；返回授权门店列表，项含 id/name/address/contact/version 及页面统计信息。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getStores = (input = {}) => callEndpoint("GET /stores", input)

/**
 * 绑定上级（inviteCode）
 * POST /partner/superior-bindings
 * 参数：contextId, inviteCode
 * 返回：{superior}
 * - **POST `/partner/superior-bindings`**：contextId、inviteCode 必填；返回 `{superior:{...}}`；现有 POST `/partner/superior`。
 * - POST `/partner/superior` → POST `/partner/superior-bindings`；GET `/partner/superior` 保留读取。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerSuperiorBindings = (input = {}) => callEndpoint("POST /partner/superior-bindings", input)

/**
 * 划拨名额-可选项
 * GET /partner/quota-transfer-options
 * 参数：contextId
 * 返回：{fields, balances, 候选成员}
 * - **划拨名额**：GET `/partner/quota-transfer-options`，POST `/partner/quota-transfer-quotes`，POST `/partner/quota-transfers`。报价 `targetAccountId`、`quantity` 必填；options 返回合法受益成员、标准余额；报价返回划拨数量与剩余余额。quantity 为 1–9999 的整数。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerQuotaTransferOptions = (input = {}) => callEndpoint("GET /partner/quota-transfer-options", input)

/**
 * 划拨名额-报价
 * POST /partner/quota-transfer-quotes
 * 参数：targetAccountId, quantity
 * 返回：{数量, 划转后余额}
 * - **划拨名额**：GET `/partner/quota-transfer-options`，POST `/partner/quota-transfer-quotes`，POST `/partner/quota-transfers`。报价 `targetAccountId`、`quantity` 必填；options 返回合法受益成员、标准余额；报价返回划拨数量与剩余余额。quantity 为 1–9999 的整数。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerQuotaTransferQuotes = (input = {}) => callEndpoint("POST /partner/quota-transfer-quotes", input)

/**
 * 划拨名额-提交
 * POST /partner/quota-transfers
 * 参数：quoteId
 * 返回：{status, operationId, balances}
 * - **划拨名额**：GET `/partner/quota-transfer-options`，POST `/partner/quota-transfer-quotes`，POST `/partner/quota-transfers`。报价 `targetAccountId`、`quantity` 必填；options 返回合法受益成员、标准余额；报价返回划拨数量与剩余余额。quantity 为 1–9999 的整数。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerQuotaTransfers = (input = {}) => callEndpoint("POST /partner/quota-transfers", input)

/**
 * 购买VIP名额-可选项
 * GET /partner/quota-purchase-options
 * 参数：contextId
 * 返回：{unitAmount, purchaseMode, allowedPaymentChannelIds=['unionpay'], paymentMode}
 * - **购买 VIP 名额**：GET `/partner/quota-purchase-options`，POST `/partner/quota-purchase-quotes`，POST `/partner/quota-orders`。报价 quantity 必填；options 返回 unitAmount、purchaseMode、pricingLabel、allowedPaymentChannelIds、allowedActions。purchaseMode 为 PAYMENT/CALCULATION_ONLY；只试算身份不得创建订单。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerQuotaPurchaseOptions = (input = {}) => callEndpoint("GET /partner/quota-purchase-options", input)

/**
 * 购买VIP名额-报价
 * POST /partner/quota-purchase-quotes
 * 参数：quantity
 * 返回：{金额, 模式}
 * - **购买 VIP 名额**：GET `/partner/quota-purchase-options`，POST `/partner/quota-purchase-quotes`，POST `/partner/quota-orders`。报价 quantity 必填；options 返回 unitAmount、purchaseMode、pricingLabel、allowedPaymentChannelIds、allowedActions。purchaseMode 为 PAYMENT/CALCULATION_ONLY；只试算身份不得创建订单。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerQuotaPurchaseQuotes = (input = {}) => callEndpoint("POST /partner/quota-purchase-quotes", input)

/**
 * 购买VIP名额-提交下单
 * POST /partner/quota-orders
 * 参数：quoteId, channel?(默认 unionpay), idempotencyKey
 * 返回：{status, paymentId, balances}
 * - **购买 VIP 名额**：GET `/partner/quota-purchase-options`，POST `/partner/quota-purchase-quotes`，POST `/partner/quota-orders`。报价 quantity 必填；options 返回 unitAmount、purchaseMode、pricingLabel、allowedPaymentChannelIds、allowedActions。purchaseMode 为 PAYMENT/CALCULATION_ONLY；只试算身份不得创建订单。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerQuotaOrders = (input = {}) => callEndpoint("POST /partner/quota-orders", input)

/**
 * 开通/升级-可选项
 * GET /partner/upgrade-options
 * 参数：contextId
 * 返回：{members, upgradePlans, 余额}
 * - **开通/升级**：GET `/partner/upgrade-options`，POST `/partner/upgrade-quotes`，POST `/partner/upgrades`。报价 targetAccountId、targetLevel 必填；standardQuantity、activityQuantity 按名额组合条件必填，均为 0–9999 的整数。options 返回 members、upgradePlans、standardRemaining、activityRemaining；报价返回所需总名额、消耗组合、服务费用。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerUpgradeOptions = (input = {}) => callEndpoint("GET /partner/upgrade-options", input)

/**
 * 开通/升级-报价
 * POST /partner/upgrade-quotes
 * 参数：targetAccountId, targetLevel
 * 返回：{金额}
 * - **开通/升级**：GET `/partner/upgrade-options`，POST `/partner/upgrade-quotes`，POST `/partner/upgrades`。报价 targetAccountId、targetLevel 必填；standardQuantity、activityQuantity 按名额组合条件必填，均为 0–9999 的整数。options 返回 members、upgradePlans、standardRemaining、activityRemaining；报价返回所需总名额、消耗组合、服务费用。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerUpgradeQuotes = (input = {}) => callEndpoint("POST /partner/upgrade-quotes", input)

/**
 * 开通/升级-提交
 * POST /partner/upgrades
 * 参数：quoteId
 * 返回：{status, operationId, orderId}
 * - **开通/升级**：GET `/partner/upgrade-options`，POST `/partner/upgrade-quotes`，POST `/partner/upgrades`。报价 targetAccountId、targetLevel 必填；standardQuantity、activityQuantity 按名额组合条件必填，均为 0–9999 的整数。options 返回 members、upgradePlans、standardRemaining、activityRemaining；报价返回所需总名额、消耗组合、服务费用。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerUpgrades = (input = {}) => callEndpoint("POST /partner/upgrades", input)

/**
 * 年度权益-可选项
 * GET /partner/entitlement-options
 * 参数：contextId
 * 返回：{套餐, 费用, 期限, 当前有效期, allowedPaymentChannelIds}
 * - **年度权益**：GET `/partner/entitlement-options`，POST `/partner/entitlement-quotes`，POST `/partner/entitlement-orders`。报价 planId 必填；options 返回可用套餐、费用、期限及当前有效期；报价返回服务端计算的新有效期/续期说明。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerEntitlementOptions = (input = {}) => callEndpoint("GET /partner/entitlement-options", input)

/**
 * 年度权益-报价
 * POST /partner/entitlement-quotes
 * 参数：planId
 * 返回：{金额, 期限}
 * - **年度权益**：GET `/partner/entitlement-options`，POST `/partner/entitlement-quotes`，POST `/partner/entitlement-orders`。报价 planId 必填；options 返回可用套餐、费用、期限及当前有效期；报价返回服务端计算的新有效期/续期说明。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerEntitlementQuotes = (input = {}) => callEndpoint("POST /partner/entitlement-quotes", input)

/**
 * 年度权益-提交
 * POST /partner/entitlement-orders
 * 参数：quoteId, channel?, idempotencyKey
 * 返回：{status, paymentId, orderId, validUntil}
 * - **年度权益**：GET `/partner/entitlement-options`，POST `/partner/entitlement-quotes`，POST `/partner/entitlement-orders`。报价 planId 必填；options 返回可用套餐、费用、期限及当前有效期；报价返回服务端计算的新有效期/续期说明。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerEntitlementOrders = (input = {}) => callEndpoint("POST /partner/entitlement-orders", input)

/**
 * 绑定门店-可选项
 * GET /partner/store-binding-options
 * 参数：contextId
 * 返回：{成员, stores, headquarters}
 * - **绑定门店**：GET `/partner/store-binding-options`，POST `/partner/store-binding-quotes`，POST `/partner/store-bindings`。报价 targetAccountId、storeId 必填；options 返回可操作成员、stores、headquarters；支持总部服务时必须为合法候选 ID。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerStoreBindingOptions = (input = {}) => callEndpoint("GET /partner/store-binding-options", input)

/**
 * 绑定门店-报价
 * POST /partner/store-binding-quotes
 * 参数：targetAccountId, storeId
 * 返回：{金额}
 * - **绑定门店**：GET `/partner/store-binding-options`，POST `/partner/store-binding-quotes`，POST `/partner/store-bindings`。报价 targetAccountId、storeId 必填；options 返回可操作成员、stores、headquarters；支持总部服务时必须为合法候选 ID。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerStoreBindingQuotes = (input = {}) => callEndpoint("POST /partner/store-binding-quotes", input)

/**
 * 绑定门店-提交
 * POST /partner/store-bindings
 * 参数：quoteId
 * 返回：{status, operationId, agent}
 * - **绑定门店**：GET `/partner/store-binding-options`，POST `/partner/store-binding-quotes`，POST `/partner/store-bindings`。报价 targetAccountId、storeId 必填；options 返回可操作成员、stores、headquarters；支持总部服务时必须为合法候选 ID。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerStoreBindings = (input = {}) => callEndpoint("POST /partner/store-bindings", input)

/**
 * 单笔收益详情（来源/受益人/状态）
 * GET /income/entries/{id}
 * 参数：contextId
 * 返回：{baseAmount, rateBps, amount, allocationStatus, beneficiaryName…}
 * - **GET `/income/entries/{id}`**：contextId 必填；返回 `id,sourceOrder,title,category,channel,paymentTypeLabel,identityLabel,baseAmount,rateBps,amount,createdAt,allocationKind,allocationStatus,settlementStatus,beneficiaryName,recommended,buyer,store,allowedActions,version`。recommended/buyer/store 为相应人员及门店摘要；敏感字段按权限脱敏。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getIncomeEntriesById = (input = {}) => callEndpoint("GET /income/entries/{id}", input)

/**
 * 分配前可选项
 * GET /income/entries/{id}/allocation-options
 * 参数：contextId
 * 返回：{fields, balances, 候选目标}
 * - **GET `/income/entries/{id}/allocation-options`**：contextId 必填；返回 fields/balances/allowedActions/version，候选目标 targetId 带实际受益人名称；allocationKind 为 sales/inspection。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getIncomeEntriesByIdAllocationOptions = (input = {}) => callEndpoint("GET /income/entries/{id}/allocation-options", input)

/**
 * 销售/巡查提点分配报价
 * POST /income/entries/{id}/allocation-quotes
 * 参数：contextId, targetId, percent?
 * 返回：{最终受益人, 分配类型, 金额}
 * - **POST `/income/entries/{id}/allocation-quotes`**：contextId、targetId 必填；entryId 当前服务也会提交，应与路径一致。返回经营报价及最终受益人、分配类型、金额、结算说明。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postIncomeEntriesByIdAllocationQuotes = (input = {}) => callEndpoint("POST /income/entries/{id}/allocation-quotes", input)

/**
 * 提交分配
 * POST /income/entries/{id}/allocations
 * 参数：contextId, quoteId, idempotencyKey
 * 返回：{status:PENDING_SETTLEMENT, operationId}
 * - **POST `/income/entries/{id}/allocations`**：contextId、quoteId、idempotencyKey 必填；返回 `{status:"PENDING_SETTLEMENT",operationId}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postIncomeEntriesByIdAllocations = (input = {}) => callEndpoint("POST /income/entries/{id}/allocations", input)

/**
 * 提现记录
 * GET /wallet/withdrawals
 * 参数：contextId, cursor?
 * 返回：提现列表(id,amount,fee,netAmount,status)
 * - **GET `/wallet/withdrawals`**：contextId 必填，分页可选；返回列表项 id/title/amount/fee/netAmount/status/accountType/accountName/bankName/maskedBankNumber/createdAt。
 * - **POST `/wallet/withdrawals`**：contextId、quoteId、idempotencyKey 必填；返回 `{status:"PENDING_REVIEW",withdrawalId}` 或含 operationId 的等价回执。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getWalletWithdrawals = (input = {}) => callEndpoint("GET /wallet/withdrawals", input)

/**
 * 提现可选项（限额/手续费/账户）
 * GET /wallet/withdrawal-options
 * 参数：contextId
 * 返回：{余额, 最低100/最高50000, 手续费0.6%(最低1元), 账户候选}
 * - **GET `/wallet/withdrawal-options`**：contextId 必填；返回余额、最低/最高提现金额、手续费说明、账户类型与收款账户候选、allowedActions。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getWalletWithdrawalOptions = (input = {}) => callEndpoint("GET /wallet/withdrawal-options", input)

/**
 * 登记收款账户
 * POST /wallet/payees
 * 参数：contextId, accountType, name, bankName, bankNumber
 * 返回：{payeeToken, maskedBankNumber}
 * - **POST `/wallet/payees`**：contextId、accountType、name、bankName、bankNumber 必填；accountType 为 PERSONAL/COMPANY。返回 `{payeeToken}`，建议附 maskedBankNumber；银行卡号当前校验为 16–19 位。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postWalletPayees = (input = {}) => callEndpoint("POST /wallet/payees", input)

/**
 * 提现报价（算手续费）
 * POST /wallet/withdrawal-quotes
 * 参数：contextId, accountType, payeeToken, amount
 * 返回：{amount, fee, netAmount, 脱敏账户}
 * - **POST `/wallet/withdrawal-quotes`**：contextId、accountType、payeeToken、amount 必填，amount 为整数分；返回经营报价及 amount/fee/netAmount 与脱敏账户信息。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postWalletWithdrawalQuotes = (input = {}) => callEndpoint("POST /wallet/withdrawal-quotes", input)

/**
 * 提交提现（冻结余额）
 * POST /wallet/withdrawals
 * 参数：contextId, quoteId, idempotencyKey
 * 返回：{status:PENDING_REVIEW, withdrawalId}
 * - **GET `/wallet/withdrawals`**：contextId 必填，分页可选；返回列表项 id/title/amount/fee/netAmount/status/accountType/accountName/bankName/maskedBankNumber/createdAt。
 * - **POST `/wallet/withdrawals`**：contextId、quoteId、idempotencyKey 必填；返回 `{status:"PENDING_REVIEW",withdrawalId}` 或含 operationId 的等价回执。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postWalletWithdrawals = (input = {}) => callEndpoint("POST /wallet/withdrawals", input)

/**
 * 创始奖列表（按月）
 * GET /founder-awards
 * 参数：contextId, month
 * 返回：创始奖列表(id,title,amount,createdAt)
 * - **GET `/founder-awards`**：contextId、month 必填；分页可选。返回创始奖列表（id/title/amount/createdAt 及来源说明），月汇总字段按页面需要返回；现有 Mock 为空，正式明细列待确认。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getFounderAwards = (input = {}) => callEndpoint("GET /founder-awards", input)

/**
 * 合店申请可选项（门店/期限/协议）
 * GET /costore/application-options
 * 参数：contextId
 * 返回：{stores[], durations[], benefits, agreement}
 * - **GET `/costore/application-options`**：contextId 必填；返回 `{stores:[{id,name,...}],durations:[{id,label,months}],benefits,agreement:{version,content}}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getCostoreApplicationOptions = (input = {}) => callEndpoint("GET /costore/application-options", input)

/**
 * 合店费用试算
 * POST /costore/application-quotes
 * 参数：storeId, durationId
 * 返回：{payableAmount, store, durationLabel, expiresAt}
 * - **POST `/costore/application-quotes`**：contextId、storeId、durationId 必填；返回 `{id,storeId,durationId,store,durationLabel,payableAmount,currency,expiresAt,serverTime}`，时间为毫秒。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postCostoreApplicationQuotes = (input = {}) => callEndpoint("POST /costore/application-quotes", input)

/**
 * 提交合店申请
 * POST /applications/costore
 * 参数：quoteId, agreementVersion, idempotencyKey
 * 返回：{application}
 * - **POST `/applications/costore`**：contextId、quoteId、agreementVersion、idempotencyKey 必填；返回 `{application:申请}`。正式协议未发布不得提交。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApplicationsCostore = (input = {}) => callEndpoint("POST /applications/costore", input)

/**
 * 我的申请列表
 * GET /applications
 * 参数：contextId, type(COSTORE/ALL)
 * 返回：申请列表
 * - **GET `/applications`**：contextId 必填；type 当前为 COSTORE，分页可选；返回申请列表。若需包含代理与转店，建议 type 可选并统一类型枚举，当前前端只请求 COSTORE，须补适配。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApplications = (input = {}) => callEndpoint("GET /applications", input)

/**
 * 代理推广码/海报
 * GET /promotion/agency-code
 * 参数：contextId, agencyType
 * 返回：{qrUrl, posterUrl, shareUrl}
 * - **GET `/promotion/agency-code`**：contextId、agencyType 必填，agencyType 为 STORE/COUNTY/CITY/PROVINCE；返回 `{accountId,agencyType,promotionId,qrUrl,posterUrl,shareUrl}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPromotionAgencyCode = (input = {}) => callEndpoint("GET /promotion/agency-code", input)

/**
 * 邀请落地页数据
 * GET /promotion/invitations/{promotionId}
 * 参数：—
 * 返回：{agencyType, label, payableAmount, agreement}
 * - **GET `/promotion/invitations/{promotionId}`**：无额外必填参数；返回 `{promotionId,agencyType,label,payableAmount,agreement:{version,content}}`，以后端邀请中类型为准，不信任路由 agencyType。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPromotionInvitationsByPromotionId = (input = {}) => callEndpoint("GET /promotion/invitations/{promotionId}", input)

/**
 * 提交代理申请
 * POST /agency/applications
 * 参数：promotionId, name, phone, regionCodes, address, storefrontAssetId?
 * 返回：{application}
 * - **POST `/agency/applications`**：promotionId、name、phone、regionCodes、regionNames、address、idempotencyKey 必填；STORE 类型 storefrontAssetId 条件必填。返回 `{application:申请}`。若正式申请要求接受协议，建议新增 agreementVersion 并补前端勾选流程，当前未提交该字段。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAgencyApplications = (input = {}) => callEndpoint("POST /agency/applications", input)

/**
 * 代理门店工作台
 * GET /agency/store-workspace
 * 参数：contextId, assignmentId, storeId?
 * 返回：{store, staff[], approvals[], members[], owners[]}
 * - **GET `/agency/store-workspace`**：contextId、assignmentId 必填；单店身份 storeId 条件必填。返回 `{store,staff:[],approvals:[],members:[],owners:[],allowedActions:[]}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAgencyStoreWorkspace = (input = {}) => callEndpoint("GET /agency/store-workspace", input)

/**
 * 修改门店资料
 * PATCH /stores/{id}
 * 参数：contextId, name, address, version
 * 返回：{store}
 * - **PATCH `/stores/{id}`**：contextId、name、address、version 必填，contact 可选；返回 `{store:{id,name,address,contact,version}}`。名称最多 60 字、地址最多 200 字。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const patchStoresById = (input = {}) => callEndpoint("PATCH /stores/{id}", input)

/**
 * 新增健脑官账号
 * POST /stores/{storeId}/coaches
 * 参数：contextId, name, loginAccount, idempotencyKey
 * 返回：{coach{loginAccount,status,invitationStatus}}
 * - **POST `/stores/{storeId}/coaches`** / **PATCH `/stores/{storeId}/coaches/{id}`**：contextId、name、loginAccount 必填；新增 idempotencyKey 必填，修改 version 必填。返回 `{coach:{id,name,loginAccount,status,invitationStatus,version}}`。登录名 4–32 位字母数字下划线短横线；真实账号激活/初始凭证发放方式待确认，不能返回明文密码。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postStoresByStoreIdCoaches = (input = {}) => callEndpoint("POST /stores/{storeId}/coaches", input)

/**
 * 编辑健脑官
 * PATCH /stores/{storeId}/coaches/{id}
 * 参数：version + 上述
 * 返回：{coach}
 * - **POST `/stores/{storeId}/coaches`** / **PATCH `/stores/{storeId}/coaches/{id}`**：contextId、name、loginAccount 必填；新增 idempotencyKey 必填，修改 version 必填。返回 `{coach:{id,name,loginAccount,status,invitationStatus,version}}`。登录名 4–32 位字母数字下划线短横线；真实账号激活/初始凭证发放方式待确认，不能返回明文密码。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const patchStoresByStoreIdCoachesById = (input = {}) => callEndpoint("PATCH /stores/{storeId}/coaches/{id}", input)

/**
 * 审批转店/申请
 * POST /applications/{id}/decisions
 * 参数：contextId, storeId, decision(APPROVE/REJECT), version, reason?
 * 返回：{status, nextStep?}
 * - **POST `/applications/{id}/decisions`**：contextId、storeId、decision、version、idempotencyKey 必填，decision 为 APPROVE/REJECT；拒绝时 reason 必填，最多 200 字。返回 `{status,nextStep?}`。需校验审批人权限与待审状态。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApplicationsByIdDecisions = (input = {}) => callEndpoint("POST /applications/{id}/decisions", input)

/**
 * 健脑官工作台（token 决定任职）
 * GET /coach/workspace
 * 参数：contextId?(代管)
 * 返回：{contextId, store, members[], allowedActions[]}
 * - **GET `/coach/workspace`**：健脑官账号由 token 决定任职，无额外必填参数；代理代管时 contextId 必填。返回 `{contextId,name,store:{id,...},members:[],allowedActions:[]}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getCoachWorkspace = (input = {}) => callEndpoint("GET /coach/workspace", input)

/**
 * 会员门店档案（课时）
 * GET /members/{id}/store-profile
 * 参数：contextId
 * 返回：{member, 课时, allowedActions}
 * - **GET `/members/{id}/store-profile`**：contextId 必填；返回 `{member:{...会员基础资料及课时},allowedActions:[]}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMembersByIdStoreProfile = (input = {}) => callEndpoint("GET /members/{id}/store-profile", input)

/**
 * 修改会员课时
 * PATCH /members/{id}/training
 * 参数：contextId, version, trainingTotal, trainingUsed, specialTotal, specialUsed
 * 返回：{member}
 * - **PATCH `/members/{id}/training`**：contextId、version、trainingTotal、trainingUsed、specialTotal、specialUsed 必填；selfStudyNote、campNote、remark 可选，当前服务按字符串提交。返回 `{member:{...}}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const patchMembersByIdTraining = (input = {}) => callEndpoint("PATCH /members/{id}/training", input)

/**
 * 提交训练反馈
 * POST /training-feedback
 * 参数：contextId, memberId, kind, title, text, idempotencyKey
 * 返回：{id}
 * - **POST `/training-feedback`**：contextId、memberId、kind、title、text、idempotencyKey 必填；imageAssetIds、attachmentAssetIds 可选。kind 为 training/self-study/camp；返回 `{id}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postTrainingFeedback = (input = {}) => callEndpoint("POST /training-feedback", input)

/**
 * 转店可选项
 * GET /store-transfer/options
 * 参数：contextId, memberId, regionCodes?
 * 返回：{currentStore, stores[]}
 * - **GET `/store-transfer/options`**：contextId、memberId 必填；keyword、regionCodes 可选；返回 `{currentStore,stores:[{id,name,address,regionCodes}]}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getStoreTransferOptions = (input = {}) => callEndpoint("GET /store-transfer/options", input)

/**
 * 提交转店申请
 * POST /store-transfer/applications
 * 参数：contextId, memberId, targetStoreId, reason, idempotencyKey
 * 返回：{application{type:TRANSFER,status:PENDING}}
 * - **POST `/store-transfer/applications`**：contextId、memberId、targetStoreId、reason、idempotencyKey 必填；返回 `{application:{id,type:"TRANSFER",memberId,targetStoreId,status:"PENDING",version}}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postStoreTransferApplications = (input = {}) => callEndpoint("POST /store-transfer/applications", input)

/**
 * 申请上传（拿上传地址）
 * POST /assets/upload-intents
 * 参数：purpose, fileName, mimeType, size
 * 返回：{assetId, uploadUrl, fileField, headers, limits}
 * - **POST `/assets/upload-intents`**：purpose、fileName、mimeType、size 必填；返回 `{assetId,mode:"multipart",uploadUrl,fileField,headers,fields,limits:{maxSize}}`。purpose 支持 avatar/member-avatar/feedback/storefront/material-qr/training-file/training-video，按用途独立校验。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAssetsUploadIntents = (input = {}) => callEndpoint("POST /assets/upload-intents", input)

/**
 * 通知上传完成（校验/审核）
 * POST /assets/{id}/completions
 * 参数：无
 * 返回：{status:ready, previewUrl?}
 * - **POST `/assets/{id}/completions`**：无额外业务参数；返回 `{status:"ready",previewUrl?}`。现有路径 `/assets/{id}/complete`。训练附件需要 previewUrl；如有异步转码/审核须补查询与等待逻辑，当前前端只接受 ready。
 * - `/assets/{id}/complete` → POST `/assets/{id}/completions`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAssetsByIdCompletions = (input = {}) => callEndpoint("POST /assets/{id}/completions", input)

/**
 * 素材分类
 * GET /materials/categories
 * 参数：type(image/article/video)
 * 返回：{categories[]}
 * - **GET `/materials/categories`**：type 必填，image/article/video；返回 `{categories:[{id,name}]}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMaterialsCategories = (input = {}) => callEndpoint("GET /materials/categories", input)

/**
 * 素材列表
 * GET /materials
 * 参数：type, categoryId?, cursor?
 * 返回：素材列表
 * - **GET `/materials`**：type 必填，categoryId、分页可选；返回列表项 `{id,title,type,coverUrl,...}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMaterials = (input = {}) => callEndpoint("GET /materials", input)

/**
 * 素材详情
 * GET /materials/{id}
 * 参数：—
 * 返回：{content, mediaUrl, shareUrl, allowedOperations[]}
 * - **GET `/materials/{id}`**：无额外参数；返回 `{id,title,type,content,mediaUrl,shareUrl,allowedOperations:[]}`，需要合成的素材附模板/编辑元信息，具体字段按 material-edit 页面冻结。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMaterialsById = (input = {}) => callEndpoint("GET /materials/{id}", input)

/**
 * 合成个人海报（二维码+模板）
 * POST /materials/{id}/renders
 * 参数：qrAssetId, idempotencyKey
 * 返回：{jobId}
 * - **POST `/materials/{id}/renders`**：qrAssetId、idempotencyKey 必填；返回 `{jobId}`。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postMaterialsByIdRenders = (input = {}) => callEndpoint("POST /materials/{id}/renders", input)

/**
 * 查询合成任务状态/结果
 * GET /jobs/{jobId}
 * 参数：—
 * 返回：{status, downloadUrl?, shareUrl?}
 * - **GET `/jobs/{jobId}`**：无额外参数；返回 `{status,downloadUrl?,shareUrl?,message?}`，状态 queued/processing/succeeded/failed，成功时至少一个结果链接。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getJobsByJobId = (input = {}) => callEndpoint("GET /jobs/{jobId}", input)

/**
 * 模拟渠道通知入账（仅 live 联调有用）
 * POST /me/payments/{id}/sandbox-confirm
 * 参数：—
 * 返回：{payment, effect}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postMePaymentsByIdSandboxConfirm = (input = {}) => callEndpoint("POST /me/payments/{id}/sandbox-confirm", input)

/**
 * 码列表+统计
 * GET /admin/activation-codes
 * 参数：status?/targetType?/channel?/storeId?
 * 返回：{items[], stats{total,active,used,void,expired}}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAdminActivationCodes = (input = {}) => callEndpoint("GET /admin/activation-codes", input)

/**
 * 作废激活码
 * POST /admin/activation-codes/{code}/void
 * 参数：—
 * 返回：{code, status:void}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAdminActivationCodesByCodeVoid = (input = {}) => callEndpoint("POST /admin/activation-codes/{code}/void", input)

/**
 * 本店已发码
 * GET /agency/activation-codes
 * 参数：contextId
 * 返回：{items[], storeId}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAgencyActivationCodes = (input = {}) => callEndpoint("GET /agency/activation-codes", input)

/**
 * 我的赠码记录
 * GET /partner/gift-codes
 * 参数：contextId
 * 返回：{items[]}
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerGiftCodes = (input = {}) => callEndpoint("GET /partner/gift-codes", input)

/**
 * 管理员(password) / 用户(phone) 登录，返回 token
 * POST /api/auth/login
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiAuthLogin = (input = {}) => callEndpoint("POST /api/auth/login", input)

/**
 * 区域 VIP 奖励
 * POST /api/calc/region-vip
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiCalcRegionVip = (input = {}) => callEndpoint("POST /api/calc/region-vip", input)

/**
 * 商品级差
 * POST /api/calc/goods-diff
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiCalcGoodsDiff = (input = {}) => callEndpoint("POST /api/calc/goods-diff", input)

/**
 * 门店履约分配
 * POST /api/calc/store-delivery
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiCalcStoreDelivery = (input = {}) => callEndpoint("POST /api/calc/store-delivery", input)

/**
 * 区域代理月度结算
 * POST /api/calc/region
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiCalcRegion = (input = {}) => callEndpoint("POST /api/calc/region", input)

/**
 * 虚拟交付分成
 * POST /api/calc/virtual-split
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiCalcVirtualSplit = (input = {}) => callEndpoint("POST /api/calc/virtual-split", input)

/**
 * 实物级差
 * POST /api/calc/physical-diff
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiCalcPhysicalDiff = (input = {}) => callEndpoint("POST /api/calc/physical-diff", input)

/**
 * 代理费配置（分成/门槛/价格表）
 * GET /api/calc/agent-fee
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiCalcAgentFee = (input = {}) => callEndpoint("GET /api/calc/agent-fee", input)

/**
 * 商品目录 + 按买家维度的报价
 * GET /api/products
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiProducts = (input = {}) => callEndpoint("GET /api/products", input)

/**
 * 商品单价计算
 * POST /api/calc/product-price
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiCalcProductPrice = (input = {}) => callEndpoint("POST /api/calc/product-price", input)

/**
 * 商品分润计算
 * POST /api/calc/product-commission
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiCalcProductCommission = (input = {}) => callEndpoint("POST /api/calc/product-commission", input)

/**
 * 特色分成计算
 * POST /api/calc/featured-split
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiCalcFeaturedSplit = (input = {}) => callEndpoint("POST /api/calc/featured-split", input)

/**
 * 导出 / 导入种子数据
 * GET /api/seed
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiSeed = (input = {}) => callEndpoint("GET /api/seed", input)

/**
 * 导出 / 导入种子数据
 * POST /api/seed
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiSeed = (input = {}) => callEndpoint("POST /api/seed", input)

/**
 * 恢复默认示例种子
 * POST /api/seed/reset
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiSeedReset = (input = {}) => callEndpoint("POST /api/seed/reset", input)

/**
 * 新增合伙人(用户)
 * POST /api/partner
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiPartner = (input = {}) => callEndpoint("POST /api/partner", input)

/**
 * 修改合伙人字段
 * POST /api/partner/update
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiPartnerUpdate = (input = {}) => callEndpoint("POST /api/partner/update", input)

/**
 * 删除合伙人
 * POST /api/partner/delete
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiPartnerDelete = (input = {}) => callEndpoint("POST /api/partner/delete", input)

/**
 * 创建订单（批发/升级）
 * POST /api/order
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiOrder = (input = {}) => callEndpoint("POST /api/order", input)

/**
 * 修改订单
 * POST /api/order/update
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiOrderUpdate = (input = {}) => callEndpoint("POST /api/order/update", input)

/**
 * 代下单 / 用户端 产品购买
 * POST /api/order/product
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiOrderProduct = (input = {}) => callEndpoint("POST /api/order/product", input)

/**
 * 任命区域代理（省/市/区/门店）
 * POST /api/agent/appoint
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiAgentAppoint = (input = {}) => callEndpoint("POST /api/agent/appoint", input)

/**
 * 修改代理
 * POST /api/agent/update
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiAgentUpdate = (input = {}) => callEndpoint("POST /api/agent/update", input)

/**
 * 新增合店
 * POST /api/costore
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiCostore = (input = {}) => callEndpoint("POST /api/costore", input)

/**
 * 读取 / 更新配置（合店月费、开关等）
 * GET /api/settings
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiSettings = (input = {}) => callEndpoint("GET /api/settings", input)

/**
 * 读取 / 更新配置（合店月费、开关等）
 * POST /api/settings
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiSettings = (input = {}) => callEndpoint("POST /api/settings", input)

/**
 * 发放名额
 * POST /api/quota/issue
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiQuotaIssue = (input = {}) => callEndpoint("POST /api/quota/issue", input)

/**
 * 解绑上级
 * POST /api/relation/unbind
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiRelationUnbind = (input = {}) => callEndpoint("POST /api/relation/unbind", input)

/**
 * 重新绑定上级
 * POST /api/relation/rebind
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiRelationRebind = (input = {}) => callEndpoint("POST /api/relation/rebind", input)

/**
 * 运行结算（月度分账）
 * POST /api/settle
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiSettle = (input = {}) => callEndpoint("POST /api/settle", input)

/**
 * 分账汇总报表
 * GET /api/report
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiReport = (input = {}) => callEndpoint("GET /api/report", input)

/**
 * 用户列表
 * GET /api/users
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiUsers = (input = {}) => callEndpoint("GET /api/users", input)

/**
 * 当前用户档案
 * GET /api/me
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiMe = (input = {}) => callEndpoint("GET /api/me", input)

/**
 * 我的团队
 * GET /api/team
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiTeam = (input = {}) => callEndpoint("GET /api/team", input)

/**
 * 我的分身份收益
 * GET /api/commissions
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiCommissions = (input = {}) => callEndpoint("GET /api/commissions", input)

/**
 * 逐笔收益明细（按 period/type/owner 过滤）
 * GET /api/commissions/all
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiCommissionsAll = (input = {}) => callEndpoint("GET /api/commissions/all", input)

/**
 * 我的身份列表
 * GET /api/identities
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiIdentities = (input = {}) => callEndpoint("GET /api/identities", input)

/**
 * 我的合店记录
 * GET /api/costore
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiCostore = (input = {}) => callEndpoint("GET /api/costore", input)

/**
 * 我的区域代理身份
 * GET /api/agent
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiAgent = (input = {}) => callEndpoint("GET /api/agent", input)

/**
 * 订单列表
 * GET /api/orders/all
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiOrdersAll = (input = {}) => callEndpoint("GET /api/orders/all", input)

/**
 * 门店列表
 * GET /api/stores
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiStores = (input = {}) => callEndpoint("GET /api/stores", input)

/**
 * 区域团队
 * GET /api/region/team
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getApiRegionTeam = (input = {}) => callEndpoint("GET /api/region/team", input)

/**
 * 区域代理月度结算（触发）
 * POST /api/region/month
 * 参数：文档未提供字段定义，联调前确认
 * 返回：文档未提供返回 DTO，联调前确认
 * 
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postApiRegionMonth = (input = {}) => callEndpoint("POST /api/region/month", input)

/**
 * 分红权益与动态门槛
 * GET /partner/dividend-rights
 * 参数：contextId, months?, kind?
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerDividendRights = (input = {}) => callEndpoint("GET /partner/dividend-rights", input)

/**
 * 门店收益规则与独立收入渠道
 * GET /income/store-income-rules
 * 参数：contextId
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getIncomeStoreIncomeRules = (input = {}) => callEndpoint("GET /income/store-income-rules", input)

/**
 * 分配模式：self_assign/fixed
 * GET /partner/allocation-scheme
 * 参数：contextId
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerAllocationScheme = (input = {}) => callEndpoint("GET /partner/allocation-scheme", input)

/**
 * 撤销未生效分配
 * POST /income/entries/{id}/allocations/{allocationId}/revoke
 * 参数：contextId
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postIncomeEntriesByIdAllocationsByAllocationIdRevoke = (input = {}) => callEndpoint("POST /income/entries/{id}/allocations/{allocationId}/revoke", input)

/**
 * 经验汇总（不是金额）
 * GET /partner/experience/summary
 * 参数：contextId
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerExperienceSummary = (input = {}) => callEndpoint("GET /partner/experience/summary", input)

/**
 * L1–L10 成长阶梯
 * GET /partner/ladder
 * 参数：contextId
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerLadder = (input = {}) => callEndpoint("GET /partner/ladder", input)

/**
 * 按 register/agent 查询邀请码
 * GET /me/invite-codes
 * 参数：contextId, type?
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getMeInviteCodes = (input = {}) => callEndpoint("GET /me/invite-codes", input)

/**
 * 生成类型化邀请码
 * POST /me/invite-codes
 * 参数：contextId, type, maxUse?, ttlDays?
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postMeInviteCodes = (input = {}) => callEndpoint("POST /me/invite-codes", input)

/**
 * 专栏列表
 * GET /columns
 * 参数：cursor?, pageSize?
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getColumns = (input = {}) => callEndpoint("GET /columns", input)

/**
 * 账号级专栏学习进度
 * PUT /columns/{id}/learning-progress
 * 参数：chapterId, positionSeconds, durationSeconds, completed
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const putColumnsByIdLearningProgress = (input = {}) => callEndpoint("PUT /columns/{id}/learning-progress", input)

/**
 * 正式支付发起入口（sandbox/live）
 * POST /orders/{id}/payment
 * 参数：channel, idempotencyKey
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postOrdersByIdPayment = (input = {}) => callEndpoint("POST /orders/{id}/payment", input)

/**
 * 本店已支付订单核销
 * POST /stores/{storeId}/orders/{orderNo}/verify
 * 参数：contextId, verifyCode
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postStoresByStoreIdOrdersByOrderNoVerify = (input = {}) => callEndpoint("POST /stores/{storeId}/orders/{orderNo}/verify", input)

/**
 * 代理申请费用、上传与协议要求
 * GET /agency/application-options
 * 参数：agencyType, tierIndex?, promotionCode?
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAgencyApplicationOptions = (input = {}) => callEndpoint("GET /agency/application-options", input)

/**
 * 代理申请报价
 * POST /agency/application-quotes
 * 参数：contextId, agencyType, regionCode, tierIndex（完整必填项仍待确认）
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postAgencyApplicationQuotes = (input = {}) => callEndpoint("POST /agency/application-quotes", input)

/**
 * 上传资源就绪状态
 * GET /assets/{id}
 * 参数：无
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getAssetsById = (input = {}) => callEndpoint("GET /assets/{id}", input)

/**
 * 14 类业务详情与分配角色字典
 * GET /income/biz-types
 * 参数：无额外参数（鉴权照常）
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getIncomeBizTypes = (input = {}) => callEndpoint("GET /income/biz-types", input)

/**
 * 晋升领取状态
 * GET /partner/promotion-claims
 * 参数：contextId
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const getPartnerPromotionClaims = (input = {}) => callEndpoint("GET /partner/promotion-claims", input)

/**
 * 幂等领取晋升资格
 * POST /partner/promotion-claims
 * 参数：contextId（taskId/version/idempotencyKey 的要求未明确）
 * 返回：详见 docs/api/前端对接API文档-2026-10-27.md
 * 2026-10-27 已审阅的增量契约；未定义字段不推断。
 * @param {import("./types").EndpointInput} [input] 路径参数与 query/body 分开传递。
 * @returns {Promise<import("./types").DocumentedResponse>} 具体 DTO 见上方契约；未冻结字段为 unknown。
 */
export const postPartnerPromotionClaims = (input = {}) => callEndpoint("POST /partner/promotion-claims", input)
