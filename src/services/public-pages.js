// 未登录可访问的页面。登录守卫（useAuth）遇到这些路由时不得跳转登录或注册。
export const AUTH_WHITELIST_ROUTES = [
  'pages/login/index',
  'pages/register/index',
  'pages/forgot-password/index',
  'pages/settings/agreement',
  'pages/promo-content/article/index',
  'pages/promo-content/video/index',
]

export function normalizeRoute(route) {
  return String(route || '').replace(/^\//, '').split('?')[0]
}

export function isAuthWhitelistedRoute(route) {
  return AUTH_WHITELIST_ROUTES.includes(normalizeRoute(route))
}

export function isPromoContentRoute(route) {
  const value = normalizeRoute(route)
  return value === 'pages/promo-content/article/index' || value === 'pages/promo-content/video/index'
}
