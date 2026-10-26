// TODO(API): /auth/login returns accountType: 'parent' | 'coach'. Never infer
// staff access from a phone number, display role, or the preview feature flag.
export const isCoachAccount = session => session?.accountType === 'coach'
export const accountHome = session => isCoachAccount(session) ? '/pages/coach/index' : '/pages/member/index'
const coachPages = new Set(['pages/coach/index', 'pages/settings/change-password', 'pages/members/detail', 'pages/order/list', 'pages/order/detail', 'pages/feedback/list', 'pages/feedback/detail', 'pages/feedback/edit', 'pages/store/transfer-apply'])
export const canOpenAccountPage = (session, route) => !isCoachAccount(session) || coachPages.has(route)
