import { config } from '../config'
import { getBootstrap, getSession } from './api'
import { loadMeContext } from './me-context'
import { getCatalog } from './commerce'
import { getBusinessContexts, getBusinessOverview, getBusinessReport } from './business'
import { getMaterialCategories, getMaterials } from './materials'
import { getWholesaleBenefitCatalog } from './partner-catalog'

let authPrefetchKey = ''
let authPrefetchPromise = null
const workspacePrefetchKeys = new Set()

export function clearPrefetchState() {
  authPrefetchKey = ''
  authPrefetchPromise = null
  workspacePrefetchKeys.clear()
}

/** @returns {'current' | 'full'} */
export function resolvePrefetchMode() {
  const mode = String(config?.prefetchMode || 'current').toLowerCase()
  return mode === 'full' ? 'full' : 'current'
}

/** Run work when the UI is idle; failures never surface to callers. */
export function scheduleIdle(fn, delayMs = 300) {
  const run = () => {
    try {
      const result = fn()
      if (result && typeof result.then === 'function') {
        result.catch(error => console.warn('[prefetch]', error?.message || error))
      }
    } catch (error) {
      console.warn('[prefetch]', error?.message || error)
    }
  }
  if (typeof globalThis.requestIdleCallback === 'function') {
    globalThis.requestIdleCallback(() => run(), { timeout: 2000 })
    return
  }
  setTimeout(run, delayMs)
}

function stillSameSession(session) {
  const current = getSession()
  return !!(
    session?.user?.id
    && session?.token
    && current?.user?.id === session.user.id
    && current?.token === session.token
  )
}

async function warmAuthShell(session) {
  const mode = resolvePrefetchMode()
  const shellJobs = [
    loadMeContext().catch(() => null),
    getBootstrap().catch(() => null),
  ]
  // Catalog / multi-module overviews are full-mode only (slow DB friendly default).
  if (mode === 'full') shellJobs.push(getCatalog().catch(() => null))

  await Promise.allSettled(shellJobs)
  if (!stillSameSession(session) || mode !== 'full') return

  let contexts = []
  try {
    contexts = await getBusinessContexts()
  } catch (error) {
    console.warn('[prefetch] business contexts skipped:', error?.message || error)
    return
  }
  if (!stillSameSession(session) || !Array.isArray(contexts) || !contexts.length) return

  const firstByModule = new Map()
  for (const context of contexts) {
    if (!context?.module || !context?.id) continue
    if (!firstByModule.has(context.module)) firstByModule.set(context.module, context)
  }

  await Promise.allSettled(['wholesale', 'agency', 'costore'].map(async module => {
    const context = firstByModule.get(module)
    if (!context || !stillSameSession(session)) return
    await getBusinessOverview(module, context.id)
    if (module === 'wholesale' && stillSameSession(session)) {
      await getWholesaleBenefitCatalog().catch(() => null)
    }
  }))
}

/**
 * Warm profile / selection / partner overview caches after login or profile ready.
 * Deduped per session; safe to call repeatedly.
 */
export function prefetchAfterAuth() {
  const session = getSession()
  if (!session?.user?.id || !session?.token) return Promise.resolve()
  if (session.accountType && session.accountType !== 'parent') return Promise.resolve()

  const key = `${session.user.id}:${session.token}:${resolvePrefetchMode()}`
  if (authPrefetchKey === key && authPrefetchPromise) return authPrefetchPromise

  authPrefetchKey = key
  authPrefetchPromise = warmAuthShell(session)
    .catch(error => {
      console.warn('[prefetch] auth warm failed:', error?.message || error)
    })
  return authPrefetchPromise
}

function toolVisible(overview, toolId) {
  const tools = overview?.tools
  if (!Array.isArray(tools) || !tools.length) return true
  return tools.some(item => item?.id === toolId)
}

async function warmWorkspaceTools(overview) {
  const context = overview?.context
  if (!context?.id || !context?.module) return
  const module = context.module
  const mode = resolvePrefetchMode()
  const jobs = []

  const report = (toolId) => () => getBusinessReport(module, toolId, context.id)

  if (module === 'wholesale') {
    // current: only the highest-traffic income report; full keeps superior + materials.
    if (toolVisible(overview, 'income')) jobs.push(report('income'))
    if (mode === 'full') {
      if (toolVisible(overview, 'superior')) jobs.push(report('superior'))
      if (toolVisible(overview, 'materials')) {
        jobs.push(() => getMaterialCategories('image'))
        jobs.push(() => getMaterials('image'))
      }
    }
    // 首页 workspace 已返回全球奖资格；完整明细仅在用户打开“总批补贴”时加载。
  } else if (module === 'agency') {
    if (toolVisible(overview, 'income')) jobs.push(report('income'))
    if (mode === 'full' && toolVisible(overview, 'team')) jobs.push(report('team'))
  } else if (module === 'costore') {
    if (toolVisible(overview, 'income')) jobs.push(report('income'))
    if (mode === 'full') {
      for (const toolId of ['card-dividends', 'promotion-dividends']) {
        if (toolVisible(overview, toolId)) jobs.push(report(toolId))
      }
    }
  }

  await Promise.allSettled(jobs.map(job => job().catch(error => {
    console.warn('[prefetch] tool warm skipped:', error?.message || error)
  })))
}

/**
 * After a partner workspace overview is ready, warm high-frequency read-only tools.
 * Deduped per module+contextId until clearPrefetchState / logout.
 */
export function prefetchPartnerWorkspace(overview) {
  const context = overview?.context
  if (!context?.id || !context?.module) return Promise.resolve()
  const key = `${context.module}:${context.id}:${resolvePrefetchMode()}`
  if (workspacePrefetchKeys.has(key)) return Promise.resolve()
  workspacePrefetchKeys.add(key)

  return warmWorkspaceTools(overview)
    .catch(error => {
      console.warn('[prefetch] workspace warm failed:', error?.message || error)
      workspacePrefetchKeys.delete(key)
    })
}
