# 脑商合伙人

Vue 3 + Vite + uni-app，面向 H5 与微信小程序。基于 DCloud 官方 vite 模板。

## 本地运行

- `npm install`
- H5：`npm run dev:h5`
- 微信小程序：`npm run dev:mp-weixin`，在微信开发者工具导入 `dist/dev/mp-weixin`。
- 正式构建：`npm run build:h5` / `npm run build:mp-weixin`。
- 微信小程序 AppID 请在 `src/manifest.json` 的 `mp-weixin.appid` 填写自己的 AppID。当前为空，不代表已配置发布环境。

## 局域网 API 联调（2026-10-28）

- 已在 `src/config/index.js` 关闭 Mock 和功能预览，真实后端为 `http://192.168.0.44:3000`，接口路径不加 `/api` 前缀。
- H5 开发请求 `/backend-api`，由 `vite.config.js` 代理到后端，覆盖 GET/POST/PUT/PATCH/DELETE，避免后端当前只允许 GET/POST/OPTIONS 的跨域配置限制。H5 正式构建直接访问后端，部署前需在后端补齐跨域允许方法。
- `npm run dev:h5 -- --port 5173` 启动后，可通过本机局域网地址访问；当前为 `http://192.168.0.43:5173/`。如 localhost 打开其他项目，请使用该局域网地址或 `127.0.0.1`。
- 微信开发者工具本地联调 HTTP/IP 时需在本地设置中关闭合法域名校验；真机需与后端处于可互通网络。正式小程序需 HTTPS 合法域名。
- 已验证：后端及 H5 代理 `/health` 返回成功、未登录 `/me/bootstrap` 返回 401、隐私协议接口返回正文；H5 与微信小程序正式构建通过。
- 原有自动测试 83 项：66 通过、17 失败，与修改前基线一致；新增权益拦截测试及接口相关测试共 8 项通过。已使用末位 1–9 的测试账号完成真实登录和读取测试，发现的问题见 `docs/api/2026-10-28-lan-smoke.json`。未发送短信或创建业务订单。
- 联调脚本：设置 `API_TEST_PHONE`、`API_TEST_PASSWORD`，可选 `API_TEST_SUFFIXES=1,2,3,4,5,6,7,8,9`，执行 `node --experimental-vm-modules scripts/api-smoke.cjs`。默认通过本机 H5 开发代理测试，可用 `API_TEST_URL` 指定后端直连地址。脚本不保存密码或 token；发现接口错误时退出码为 1。
- 首轮发现：`GET /products` 对已开通账号返回 404；bootstrap 经营模块返回 `partner/agent`，前端约定 `wholesale/agency`，且 `capabilities` 全为空；合店身份缺少 `storeId/contractId`，代理身份需补齐 `assignmentId/agencyType`。未开通账号返回 HTTP 200 的 `locked/entitlementState` 拦截，前端已改为展示后端权益提示。
- 复测期间后端出现连接中断、空响应及 token 失效，最终 JSON 保存的是最近一次直连复测结果，包含这些故障；首次九个账号登录均成功，但尚不能认定全链路稳定或上述契约问题已解决，需后端服务稳定后重跑脚本确认。

以下演示范围及“后续 API 接入”为早期开发记录，当前配置以上述联调说明为准。

## 当前演示范围

登录页参考深蓝科技风设计，手机号格式校验、密码长度校验、协议勾选、本地模拟登录、登录状态保持、退出登录及四个原生 tab 页面。演示可输入任意 1 开头的 11 位手机号与至少 6 位密码。手机号和密码不会持久化，模拟 token 无实际认证能力。

会员页展示全部未解锁的 L1–L10 阶梯，可临时切换身份；联营、甄选、我的为演示模型。注册、忘记密码和微信授权后完善资料已接入页面及模拟流程。协议、课程、合作咨询、订单仍为占位弹窗。身份切换仅用于当前页面预览，不保存。

登录页已接入 `src/static/login/login-bg.png`、`src/static/logo.png` 及配套的手机号、密码、勾选和微信图标。会员页背景仍为 CSS 示意效果。没有复制参考截图中的系统状态栏和微信胶囊，平台会自行提供系统 UI。

## 后续 API 接入

`src/config/index.js`：默认 `useMock: true`。后端可用后填写 HTTPS `baseURL`，再将 `useMock` 改为 `false`。

`src/services/api.js`：统一请求、超时、Bearer token、401 返回登录页；当前约定（均待与后端确认）：

- `POST /auth/login`，请求 `{ phone, password }`，响应 `{ token, user: { name, id, role } }`。
- `GET /member/levels`，响应数组，单项 `{ id, name, unlocked }`。
- `GET /partners`，响应数组，单项 `{ title, desc, tag }`。
- `GET /products`，响应数组，单项 `{ title, type, desc }`。

后续若响应有统一包裹结构，在服务层统一适配。真实短信、认证后端、刷新 token、微信应用配置、角色权限、真实协议和业务详情待补充。小程序需配置请求合法域名；H5 后端需允许跨域。页面均经过登录存在性检查，但真实权限必须由服务端校验。

## 目录

- `src/pages/login`：登录
- `src/pages/member`：会员成长阶梯
- `src/pages/partners`：联营
- `src/pages/selection`：甄选
- `src/pages/profile`：我的
- `src/services`：API 服务和本地模拟
- `src/config`：环境配置
- `src/composables`：页面登录检查和演示交互

手机宽度优先，rpx 自适应，原生 tabBar 处理底部安全区域。上线前仍需真机验证及正式视觉素材。

## 本次验证

- `npm run build:h5`：通过。
- `npm run build:mp-weixin`：通过。
- 尚未进行微信开发者工具及微信真机验证，也未接入真实后端。
- npm 首次安装报告 99 项依赖安全告警（22 low / 20 moderate / 57 high），来自当前官方模板依赖树；正式上线前应审查升级。未自动执行可能破坏 uni-app 版本配套的 `npm audit fix --force`。

## 渐隐输入框复用

`src/components/GradientInput.vue` 将输入框背景从左侧半透明渐变为右侧全透明，不影响输入文字和右侧操作。支持 `v-model`、`icon`、`type`、`password`、`placeholder`、`maxlength`、`disabled`、`confirmType` 属性，以及 `focus`、`blur`、`confirm` 事件。`suffix` 插槽可放忘记密码、发送验证码等操作。

```vue
<GradientInput v-model="phone" icon="/static/login/icon-phone.png" type="number" :maxlength="11" placeholder="请输入手机号" />
<GradientInput v-model="code" placeholder="请输入验证码">
  <template #suffix><text @click="sendCode">获取验证码</text></template>
</GradientInput>
```

## 认证页面高度约定

登录和后续注册页统一复用 `src/components/AuthLayout.vue`，通过 `brand`、默认、`footer` 插槽放置品牌、表单与底部操作。外层使用 `100vh`，支持时使用 `100dvh` 适应浏览器可见区域；Logo 与间距随可用高度收紧，顶部和底部预留安全区域。不要再设置超过一屏的固定最小高度或大段固定上下留白。极小屏、键盘弹起或注册字段较多时，允许内容区内部滚动，保证操作可达，外层仍保持一屏。

## 注册、找回密码与微信授权

登录页的“新用户注册”“忘记密码”“微信”入口均可使用。

- 注册：手机号、6 位验证码、6–32 位不含空格的密码、确认密码和省市区必填；邀请码选填，可修改或清空。注册成功建立登录态并进入会员页。
- 找回密码：验证手机号与短信验证码后，获取一次性、短时有效的重置凭证；设置新密码时校验两次输入。完成后清除当前登录态并返回登录页。
- 模拟短信：点击获取后才可使用 `123456`，5 分钟内有效；60 秒内禁止重复发送，不发送真实短信。注册和重置密码的验证码互相隔离。
- 模拟微信：明确提示当前为模拟授权，确认后进入注册页，仍需验证手机号、设置密码并选择地区。微信绑定凭证仅在内存中保留 10 分钟，刷新页面需重新授权。
- 当前模拟注册与重置密码均不持久化密码，不创建真实账号；演示登录仍接受任意有效手机号与至少 6 位密码。真实账号逻辑以服务端为准。
- 地区选择使用 `china-area-data@5.0.1` 的离线省市区数据（2019 年来源，演示用），可替换为后端行政区数据。提交地区名称与代码，正式上线需校准最新代码。

`src/services/auth.js` 已预留以下接口约定，实际字段待与后端确认：

- `POST /auth/sms/send`：`{ phone, purpose: 'register' | 'reset-password' }`，响应可包含 `{ retryAfter: 60 }`。
- `POST /auth/register`：`{ phone, code, password, inviteCode, region, regionCodes, wechatTicket? }`，响应 `{ token, user }`。不提交确认密码。
- `POST /auth/password/verify`：`{ phone, code }`，响应 `{ resetTicket }`。
- `POST /auth/password/reset`：`{ password, resetTicket }`；成功返回 2xx。服务端必须验证并消费重置凭证。
- `POST /auth/wechat/authorize`（H5）：`{ redirectUri, inviteCode }`，返回微信授权 `{ url, state }`。后台根据网页/扫码场景生成正确的微信授权链接，配置合法回调域名并验证 state。
- `POST /auth/wechat/exchange`：小程序提交 `{ code, platform: 'mp-weixin', inviteCode }`；H5 回调提交 `{ code, state, platform: 'h5', inviteCode }`。响应 `{ registrationTicket }`，服务端绑定微信身份，注册提交 `wechatTicket`。

关闭模拟后，小程序使用 `uni.login` 获取临时 code，由服务端向微信换取身份；H5 跳转后端提供的微信 HTTPS 授权地址，回调验证 state，再交换注册凭证。AppSecret 只能放在服务端。微信注册页不会跳过手机号和地区验证。真实流程须在配置好的微信环境及后端上联调。

## 邀请码传递

`src/services/invitation.js` 统一处理 App 启动/再次打开、登录页和注册页参数：

- H5 hash 路由示例：`http://localhost:5173/#/pages/login/index?inviteCode=ABC123`，也可直接进入 `/pages/register/index?inviteCode=ABC123`。
- H5 地址普通 query 也支持 `?inviteCode=ABC123`。
- 小程序页面路径可带 `inviteCode=ABC123`；小程序码 `scene` 支持 `inviteCode%3DABC123` 或纯邀请码；普通二维码 `q` 中的 URL 也可带邀请码。
- 兼容参数名 `inviteCode`、`invitationCode`、`invite`、`inviter`，仅接受 1–64 位字母、数字、下划线和短横线；邀请协议可按后端约定统一修改。
- 有效邀请码缓存 7 天，最新明确传入值覆盖旧值；普通页面切换不清空。只有注册成功才清除缓存及当前 H5 地址中的邀请参数，失败或取消授权保留。
- 前端仅负责传递，邀请码真实性、邀请关系归属、短信校验与限流、地区合法性和微信票据验证必须由服务端执行。

验证：`npm run test:auth`，覆盖 URL/扫码邀请参数、注册必填与验证码、密码一致性、重置凭证一次性和过期、微信绑定凭证过期及消费。H5 已手动验证注册成功跳转、省市区选择、验证码倒计时与找回密码步骤切换。
