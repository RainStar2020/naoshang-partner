let baseURL = "http://192.168.0.44:3001";
// #ifdef H5
// 本地开发走 Vite 代理，避免后端跨域方法限制影响 PUT/PATCH/DELETE。
if (import.meta.env.DEV) {
  baseURL = "/backend-api";
}
// #endif

export const config = {
  useMock: false,
  mockWholesalePartnerStatus: "NONE",
  baseURL,
  timeout: 15000,
  previewAllExclusiveFeatures: false,
  previewAllBusinessFeatures: false,
  // Absolute H5 origin used when generating scannable agency promotion links (e.g. "https://h5.example.com").
  // Leave empty to use the current browser origin on H5.
  h5PublicOrigin: "",
};
