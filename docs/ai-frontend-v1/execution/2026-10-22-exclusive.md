# 专属功能与蓝湖适配：2026-10-22

用户要求：个人中心专属功能后续按不同合伙人身份展示，目前为测试全部展示。随后补充蓝湖静态导出 `D:/下载/脑商` 作为当前及后续模块参考，尺寸不能照搬，需适配多机型。

## 本轮实现

1. `features/exclusive/catalog.js` 集中登记四项入口：创始奖、申请合店、代理推广码、会员管理。`config.previewAllExclusiveFeatures=true`且`useMock=true`才全部展示。页面不按`user.role`猜权限。正式模式按`/me.exclusiveAccess={accountId,contextId,capabilities[]}`筛选，服务层同样检查能力；缺能力显示无权限。后续身份切换应由后台返回当前合法上下文，不能在前端自行构造身份。
2. 创始奖143：月份选择、汇总、本人身份/VIP数量/比例、记录表、分页及错误重试。Mock报表明确为演示，35元与0.1%仅测试夹具，不是正式分红规则。金额为整数分，空值显示—，负数保留负号。
3. 申请合店144/145：门店选择、时长选择、重新试算、报价过期检查、协议展示、提交状态及幂等。Mock门店和每月100元仅在独立Mock服务中，真实报价由服务端返回，前端不计算。协议未发布，Mock仅保存演示申请，正式模式不能签署空协议。权益正文继续为空富文本。
4. 我的申请146：申请、支付、合同、权益分别展示，演示提交为待审核/未付款/未签署/未开通；没有模拟真实审批或支付成功。列表刷新与分页可用。
5. 推广码147：四类代理切换、账号/类型匹配、后端二维码及海报URL适配、过期校验、受allowedActions控制的复制/下载适配。Mock没有真实业务载荷，故显示等待后台提供业务推广码，保存禁用，不生成伪码、不复用注册邀请码。真实生成和导出尚未联调，不能称完整推广流程。
6. 会员管理149—151：列表、添加/编辑弹窗、头像上传适配、年级/性别字典、版本冲突、新增幂等、激活预览/受益会员确认/提交、反馈和会员订单入口。家长的课时、集训营及备注只读，未知课时显示—。Mock家庭数据与学习页共享；新增/编辑姓名会进入学习身份选择，激活会更新学习权益，且不将激活学习权益推断为某个正式会员等级。
7. 补会员记录页（订单/陪练/智习/集训）和富文本反馈详情适配。Mock记录为空；非空订单/反馈、私有PDF及视频附件等复杂内容未联调。未开发代理扫码申请148或教练课时修改。

## 建议契约

所有下述接口/字段均为proposed，未证实已有后端：

- GET /me新增exclusiveAccess，能力为founder-awards:read、costore:apply、agency-code:read、family-members:manage。
- GET /founder-awards，month/cursor/pageSize/contextId；summary与items内金额分、rateBps。
- GET /costore/application-options返回stores/durations/agreement/benefits；POST /costore/application-quotes返回id/payableAmount/expiresAt/serverTime（毫秒）等；POST /applications/costore返回application。正式后端必须再次验证资格、报价、协议版本与幂等键。
- GET /applications按COSTORE分页；本轮只有列表，不宣称申请详情/API-109已完整实现。
- GET /promotion/agency-code按agencyType/contextId，返回accountId/agencyType/promotionId/qrUrl/posterUrl/shareUrl/expiresAt/serverTime/allowedActions。业务载荷和过期由后台保证。
- GET /members/options（新增建议字典端点）；GET/POST /members，PATCH /members/{id}；GET /members/{id}/orders与/members/{id}/training-feedback；GET /training-feedback/{id}带memberId与contextId。后台必须按家庭归属鉴权。
- POST /activations/preview和/activations复用已有接口。预览需返回memberId/code/targetType/targetId/levelName或targetLabel；确认时不能更换会员。新增会员需idempotencyKey，编辑需version；头像上传purpose新增member-avatar。

Mock数据均为内存状态，按账号隔离，刷新/热更新会清空。不调用真实短信、支付或签约。真实接口失败不回退Mock。show-all是演示展示开关，不是生产授权开关。

## 视觉与适配

已查看143、144、146、147、149、150原图，并核对蓝湖142结构、143 response.css、144 rem.css、149 rpx.css。保留卡片、渐变、表格与正式PNG图标；不复制状态栏、微信胶囊、固定整页高度、overflow:hidden和font-weight:NaN。其余模块依08文档继续核对。

内容自然撑高、弹性/百分比布局；弹窗以90vh为上限且可滚动，固定底栏留安全区。发现uni-app根rem随视口放大，因此采用局部clamp(14px,3.75vw,16px)字号基准与比例计算，配合em、rpx、百分比、vh。不支持clamp时回退14px基准；没有修改全局html字号。

## 本轮验证

- 自动化30项全部通过：auth 5、learning 6、materials 6、profile 6、exclusive 7。覆盖测试开关不能绕过正式能力、合店幂等/状态分离、会员版本/归属/字典、学习数据同步、激活对象与幂等、推广码载荷缺失、真实失败及迟到响应拒绝。
- H5、mp-weixin构建通过；28条注册路由需和源码核查。微信开发者工具/真机未验证。
- 浏览器：四入口全部可进入；创始奖报表；切换门店与12个月试算、演示提交并跳转我的申请；会员新增、字典选择、编辑回显、激活预览/提交/权益回显；会员反馈与订单的空状态；代理类别切换。
- 320窄屏及812横屏读DOM未发现横向溢出；375移动尺寸检查页面与弹窗。横屏推广标签字号实测约14.86px，根rem约34px，局部范围避免了横屏字号翻倍。超大系统字体、微信输入键盘/相册/下载权限仍待设备验收。

状态：可测试的本地专属功能；remoteIntegration=not-integrated；h5=browser-tested；mpWeixin=build-passed/device-not-tested。支付审批、正式分红规则、正式权限映射、推广码真实业务载荷、后台CMS及复杂私有媒体未完成。
