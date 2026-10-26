import type { EndpointInput, DocumentedResponse, LoginRequest, Session, Bootstrap, Product, CheckoutRequest, CheckoutQuote, Order, Page, Address, Member, PaymentChannel, PaymentAttempt, UploadIntent, RenderJob, Result } from "./types"

/** 开通/续费 200 权益收益费（幂等） */
export function postMeEntitlementOrders(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 导出历史收益账单（active/expired 可用；never_paid 返回 403） */
export function getMeIncomeExport(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 撤销代理（admin） */
export function postApiAgentRevoke(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 总部批量发激活码（admin） */
export function postAdminActivationCodes(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 门店收款发码（agency 上下文，仅 fs/jy） */
export function postAgencyActivationCodes(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 上级赠码（仅 cj/xn/ys，仅直属下级，码绑定该家长） */
export function postPartnerGiftCodes(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的支付单列表/详情（未开通权益时亦可查） */
export function getMePayments(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的支付单列表/详情（未开通权益时亦可查） */
export function getMePaymentsById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 渠道异步通知（公开端点，验签入账） */
export function postPaymentsNotifyByChannel(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 创建登录会话（parent 手机号 / coach 健脑官 / admin 总部） */
export function postAuthSessions(input: { data: LoginRequest }): Promise<Result<Session>>
/** 发送短信验证码（注册/找回密码） */
export function postAuthSmsChallenges(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 注册新账号（手机号+密码，支持邀请码绑定上级） */
export function postAuthRegistrations(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 校验重置验证码，发重置票据 */
export function postAuthPasswordResetVerifications(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 用票据重置密码 */
export function postAuthPasswordResets(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 登录态下修改密码（门禁豁免） */
export function postMePasswordChanges(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** H5 微信授权，取跳转地址 */
export function postAuthWechatAuthorizations(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 微信 code 换注册票据 */
export function postAuthWechatExchanges(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 拉取当前账号经营身份 + **对外编号 + 权益门禁状态** */
export function getMeBootstrap(input?: EndpointInput): Promise<Result<Bootstrap>>
/** 撤销当前 token（门禁豁免） */
export function deleteAuthSessionsCurrent(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 账号资料、门店/订单数、客服入口、专属权限 */
export function getMe(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 修改昵称/地区/头像 */
export function patchMe(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 收货地址列表 */
export function getAddresses(input?: EndpointInput): Promise<Result<Page<Address>>>
/** 单个地址详情 */
export function getAddressesById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 新增地址 */
export function postAddresses(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 修改地址 */
export function patchAddressesById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 设置默认地址 */
export function putAddressesDefault(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 删除地址 */
export function deleteAddressesById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的优惠券（可用/已用/作废） */
export function getCoupons(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 客服配置（电话/反馈上限） */
export function getSupportConfig(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 提交意见反馈 */
export function postSupportFeedback(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 用户/隐私协议正文 */
export function getAgreementsByType(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 年级/性别选项 */
export function getMembersOptions(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 家庭成员列表 */
export function getMembers(input?: EndpointInput): Promise<Result<Page<Member>>>
/** 新增孩子 */
export function postMembers(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 编辑孩子 */
export function patchMembersById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 激活前预览（不消耗码） */
export function postActivationsPreview(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 提交激活（原子消费码+发权益） */
export function postActivations(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我收到的激活码（绑定我的赠码） */
export function getMeActivationCodes(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 孩子的订单列表 */
export function getMembersByIdOrders(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 孩子训练反馈列表 */
export function getMembersByIdTrainingFeedback(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 反馈详情 */
export function getTrainingFeedbackById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 板块导航（仅介绍，不暴露权益） */
export function getLearningLevels(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 某孩子已解锁等级与进度 */
export function getMembersByMemberIdLevels(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 等级详情（章节） */
export function getLearningLevelsByLevelId(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 公告列表 */
export function getAnnouncements(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 公告详情 */
export function getAnnouncementsById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 章节内容（图文/视频） */
export function getLessonsByChapterId(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 上报学习进度 */
export function putMembersByMemberIdLearningProgress(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 商品分类与摘要列表 */
export function getCatalog(input?: EndpointInput): Promise<Result<{ categories: Array<{id:string;label:string}>; items: Product[] }>>
/** 商品详情（规格/价格/会员价） */
export function getProductsById(input: {path:{id:string}}): Promise<Result<Product>>
/** 结算可选项（门店/会员/地址/券） */
export function getCheckoutOptions(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 结算报价（最终价/优惠由后端算） */
export function postCheckoutQuotes(input: {data:CheckoutRequest}): Promise<Result<CheckoutQuote>>
/** 从报价创建订单（原子校验） */
export function postOrders(input: {data:{quoteId:string;idempotencyKey:string}}): Promise<Result<{order:Order}>>
/** 订单列表（筛选/分页） */
export function getOrders(input?: EndpointInput): Promise<Result<Page<Order>>>
/** 订单详情 */
export function getOrdersById(input: {path:{id:string};data?:{contextId?:string}}): Promise<Result<{order:Order;serverTime:string}>>
/** 取消订单（释放预占） */
export function postOrdersByIdCancellations(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 确认收货 */
export function postOrdersByIdReceipts(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 该订单可用支付渠道 */
export function getOrdersByIdPaymentChannels(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 发起支付（商品订单） */
export function postPaymentsAttempts(input: {data:{orderId:string;channel:PaymentChannel;idempotencyKey:string}}): Promise<Result<PaymentAttempt>>
/** 支付结果查询 */
export function getPaymentsAttemptsById(input: {path:{id:string}}): Promise<Result<PaymentAttempt>>
/** 专栏详情与解锁状态 */
export function getColumnsById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 批发（合伙人）工作台概览 */
export function getPartnerOverview(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 合店老板工作台概览 */
export function getCostoreOverview(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 区域代理工作台概览 */
export function getAgencyOverview(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 合伙人收益列表 */
export function getPartnerIncome(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的上级信息 */
export function getPartnerSuperior(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的推广码/海报/分享链接 */
export function getPromotionShareCode(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 全球奖明细与池 */
export function getPartnerGlobalAwards(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 晋升任务进度 */
export function getPartnerPromotionTasks(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 经验台账 */
export function getPartnerExperienceLedger(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的团队成员 */
export function getPartnerTeam(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 名额台账（余额） */
export function getPartnerQuotaLedger(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 活动名额批次 */
export function getPartnerQuotas(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 收益条目（全身份） */
export function getIncomeEntries(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 合店卡项分红 */
export function getCostoreCardDividends(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 合店推广分红 */
export function getCostorePromotionDividends(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 代理授权区域团队树 */
export function getAgencyTeam(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 团队节点详情 */
export function getAgencyTeamById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 代理授权门店列表 */
export function getStores(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 绑定上级（inviteCode） */
export function postPartnerSuperiorBindings(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 划拨名额-可选项 */
export function getPartnerQuotaTransferOptions(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 划拨名额-报价 */
export function postPartnerQuotaTransferQuotes(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 划拨名额-提交 */
export function postPartnerQuotaTransfers(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 购买VIP名额-可选项 */
export function getPartnerQuotaPurchaseOptions(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 购买VIP名额-报价 */
export function postPartnerQuotaPurchaseQuotes(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 购买VIP名额-提交下单 */
export function postPartnerQuotaOrders(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 开通/升级-可选项 */
export function getPartnerUpgradeOptions(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 开通/升级-报价 */
export function postPartnerUpgradeQuotes(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 开通/升级-提交 */
export function postPartnerUpgrades(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 年度权益-可选项 */
export function getPartnerEntitlementOptions(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 年度权益-报价 */
export function postPartnerEntitlementQuotes(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 年度权益-提交 */
export function postPartnerEntitlementOrders(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 绑定门店-可选项 */
export function getPartnerStoreBindingOptions(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 绑定门店-报价 */
export function postPartnerStoreBindingQuotes(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 绑定门店-提交 */
export function postPartnerStoreBindings(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 单笔收益详情（来源/受益人/状态） */
export function getIncomeEntriesById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 分配前可选项 */
export function getIncomeEntriesByIdAllocationOptions(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 销售/巡查提点分配报价 */
export function postIncomeEntriesByIdAllocationQuotes(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 提交分配 */
export function postIncomeEntriesByIdAllocations(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 提现记录 */
export function getWalletWithdrawals(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 提现可选项（限额/手续费/账户） */
export function getWalletWithdrawalOptions(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 登记收款账户 */
export function postWalletPayees(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 提现报价（算手续费） */
export function postWalletWithdrawalQuotes(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 提交提现（冻结余额） */
export function postWalletWithdrawals(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 创始奖列表（按月） */
export function getFounderAwards(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 合店申请可选项（门店/期限/协议） */
export function getCostoreApplicationOptions(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 合店费用试算 */
export function postCostoreApplicationQuotes(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 提交合店申请 */
export function postApplicationsCostore(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的申请列表 */
export function getApplications(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 代理推广码/海报 */
export function getPromotionAgencyCode(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 邀请落地页数据 */
export function getPromotionInvitationsByPromotionId(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 提交代理申请 */
export function postAgencyApplications(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 代理门店工作台 */
export function getAgencyStoreWorkspace(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 修改门店资料 */
export function patchStoresById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 新增健脑官账号 */
export function postStoresByStoreIdCoaches(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 编辑健脑官 */
export function patchStoresByStoreIdCoachesById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 审批转店/申请 */
export function postApplicationsByIdDecisions(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 健脑官工作台（token 决定任职） */
export function getCoachWorkspace(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 会员门店档案（课时） */
export function getMembersByIdStoreProfile(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 修改会员课时 */
export function patchMembersByIdTraining(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 提交训练反馈 */
export function postTrainingFeedback(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 转店可选项 */
export function getStoreTransferOptions(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 提交转店申请 */
export function postStoreTransferApplications(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 申请上传（拿上传地址） */
export function postAssetsUploadIntents(input: EndpointInput): Promise<Result<UploadIntent>>
/** 通知上传完成（校验/审核） */
export function postAssetsByIdCompletions(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 素材分类 */
export function getMaterialsCategories(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 素材列表 */
export function getMaterials(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 素材详情 */
export function getMaterialsById(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 合成个人海报（二维码+模板） */
export function postMaterialsByIdRenders(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 查询合成任务状态/结果 */
export function getJobsByJobId(input: {path:{jobId:string}}): Promise<Result<RenderJob>>
/** 模拟渠道通知入账（仅 live 联调有用） */
export function postMePaymentsByIdSandboxConfirm(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 码列表+统计 */
export function getAdminActivationCodes(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 作废激活码 */
export function postAdminActivationCodesByCodeVoid(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 本店已发码 */
export function getAgencyActivationCodes(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的赠码记录 */
export function getPartnerGiftCodes(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 管理员(password) / 用户(phone) 登录，返回 token */
export function postApiAuthLogin(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 区域 VIP 奖励 */
export function postApiCalcRegionVip(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 商品级差 */
export function postApiCalcGoodsDiff(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 门店履约分配 */
export function postApiCalcStoreDelivery(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 区域代理月度结算 */
export function postApiCalcRegion(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 虚拟交付分成 */
export function postApiCalcVirtualSplit(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 实物级差 */
export function postApiCalcPhysicalDiff(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 代理费配置（分成/门槛/价格表） */
export function getApiCalcAgentFee(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 商品目录 + 按买家维度的报价 */
export function getApiProducts(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 商品单价计算 */
export function postApiCalcProductPrice(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 商品分润计算 */
export function postApiCalcProductCommission(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 特色分成计算 */
export function postApiCalcFeaturedSplit(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 导出 / 导入种子数据 */
export function getApiSeed(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 导出 / 导入种子数据 */
export function postApiSeed(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 恢复默认示例种子 */
export function postApiSeedReset(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 新增合伙人(用户) */
export function postApiPartner(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 修改合伙人字段 */
export function postApiPartnerUpdate(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 删除合伙人 */
export function postApiPartnerDelete(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 创建订单（批发/升级） */
export function postApiOrder(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 修改订单 */
export function postApiOrderUpdate(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 代下单 / 用户端 产品购买 */
export function postApiOrderProduct(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 任命区域代理（省/市/区/门店） */
export function postApiAgentAppoint(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 修改代理 */
export function postApiAgentUpdate(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 新增合店 */
export function postApiCostore(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 读取 / 更新配置（合店月费、开关等） */
export function getApiSettings(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 读取 / 更新配置（合店月费、开关等） */
export function postApiSettings(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 发放名额 */
export function postApiQuotaIssue(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 解绑上级 */
export function postApiRelationUnbind(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 重新绑定上级 */
export function postApiRelationRebind(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 运行结算（月度分账） */
export function postApiSettle(input: EndpointInput): Promise<Result<DocumentedResponse>>
/** 分账汇总报表 */
export function getApiReport(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 用户列表 */
export function getApiUsers(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 当前用户档案 */
export function getApiMe(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的团队 */
export function getApiTeam(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的分身份收益 */
export function getApiCommissions(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 逐笔收益明细（按 period/type/owner 过滤） */
export function getApiCommissionsAll(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的身份列表 */
export function getApiIdentities(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的合店记录 */
export function getApiCostore(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 我的区域代理身份 */
export function getApiAgent(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 订单列表 */
export function getApiOrdersAll(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 门店列表 */
export function getApiStores(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 区域团队 */
export function getApiRegionTeam(input?: EndpointInput): Promise<Result<DocumentedResponse>>
/** 区域代理月度结算（触发） */
export function postApiRegionMonth(input: EndpointInput): Promise<Result<DocumentedResponse>>
