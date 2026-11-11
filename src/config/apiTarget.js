/**
 * API 目标总开关：改下面这一行即可切换。
 * - online → http://47.96.134.119:3000
 * - local  → http://localhost:3000
 * H5 本地开发仍走 /backend-api（Vite 代理），此开关决定代理目标与非 H5 DEV 的绝对地址。
 * 改完后需重启 H5 开发服务。
 */
export const API_TARGET = "local"; // "online" | "local"

export const API_HOSTS = {
  online: "http://47.96.134.119:3000",
  local: "http://localhost:3000",
};

export function getApiBaseUrl() {
  const key = API_TARGET === "local" ? "local" : "online";
  return API_HOSTS[key];
}
