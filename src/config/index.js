import { getApiBaseUrl } from "./apiTarget.js";

let baseURL = getApiBaseUrl();
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
  timeout: 30000,
  previewAllExclusiveFeatures: false,
  previewAllBusinessFeatures: false,
  // Prefetch pressure control while APIs/DB are slow.
  // current: warm me + bootstrap only; workspace tools stay minimal.
  // full: also warm catalog + all module overviews + broader tool reports.
  prefetchMode: "current",
  // Absolute H5 origin used when generating scannable agency promotion links (e.g. "https://h5.example.com").
  // Leave empty to use the current browser origin on H5.
  h5PublicOrigin: "",
};
