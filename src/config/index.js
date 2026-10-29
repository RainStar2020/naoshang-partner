let baseURL = 'http://localhost:3000'
// #ifdef H5
// 本地开发走 Vite 代理，避免后端跨域方法限制影响 PUT/PATCH/DELETE。
if (import.meta.env.DEV) baseURL = '/backend-api'
// #endif

export const config = { useMock: false, mockWholesalePartnerStatus: 'NONE', baseURL, timeout: 15000, previewAllExclusiveFeatures: false, previewAllBusinessFeatures: false }
