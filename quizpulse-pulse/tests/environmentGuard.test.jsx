// Environment separation: a non-production build of the pulse display app never
// starts Firebase against production, and never redirects to the production admin.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assertFirebaseEnvironment, productionReferences } from '../src/lib/firebaseEnvGuard'

const DEV_PULSE = { projectId: 'pulseiq-dev-70d82', databaseURL: 'https://pulseiq-dev-70d82-pulse.asia-southeast1.firebasedatabase.app' }
// What this app's local .env.local pointed at before the change.
const PROD_ADMIN_RTDB = { projectId: 'pulseiqadmin', databaseURL: 'https://pulseiqadmin-default-rtdb.asia-southeast1.firebasedatabase.app' }
const PROD_PULSE = { projectId: 'quizpulsebutton', databaseURL: 'https://quizpulsebutton-default-rtdb.asia-southeast1.firebasedatabase.app' }

describe('firebaseEnvGuard', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  it.each(['local', 'preview', 'development'])('a %s build on either production database logs and refuses', env => {
    for (const config of [PROD_ADMIN_RTDB, PROD_PULSE]) expect(() => assertFirebaseEnvironment({ firebase: config }, env)).toThrow(/Refusing to initialise Firebase/)
    expect(console.error).toHaveBeenCalled()
  })
  it('Dev passes, and production is unaffected', () => {
    expect(productionReferences({ firebase: DEV_PULSE })).toEqual([])
    expect(() => assertFirebaseEnvironment({ firebase: DEV_PULSE }, 'preview')).not.toThrow()
    expect(() => assertFirebaseEnvironment({ firebase: PROD_PULSE }, 'production')).not.toThrow()
    // Production's own mix of production resources is fine; Dev + production is not.
    expect(() => assertFirebaseEnvironment({ firebase: { ...PROD_ADMIN_RTDB, databaseURL: PROD_PULSE.databaseURL } }, 'production')).not.toThrow()
    expect(console.error).not.toHaveBeenCalled()
  })
})

describe('src/lib/firebase.js', () => {
  const apps = vi.hoisted(() => [])
  vi.mock('firebase/app', () => ({ initializeApp: vi.fn(config => { apps.push(config); return { config } }) }))
  vi.mock('firebase/database', () => ({ getDatabase: vi.fn(app => ({ url: app.config.databaseURL })) }))
  const load = async env => {
    vi.resetModules()
    for (const k of ['VITE_DEPLOY_ENV', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_DATABASE_URL', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_STORAGE_BUCKET']) vi.stubEnv(k, env[k] ?? '')
    return import('../src/lib/firebase')
  }
  beforeEach(() => { apps.length = 0; vi.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => vi.unstubAllEnvs())
  it('a local build on the production RTDB never initialises Firebase', async () => {
    await expect(load({ VITE_DEPLOY_ENV: 'local', VITE_FIREBASE_PROJECT_ID: 'pulseiqadmin', VITE_FIREBASE_DATABASE_URL: PROD_ADMIN_RTDB.databaseURL })).rejects.toThrow(/Refusing/)
    expect(apps).toEqual([])
  })
  it('Dev reads Dev\'s pulse database', async () => {
    const { db } = await load({ VITE_DEPLOY_ENV: 'development', VITE_FIREBASE_PROJECT_ID: DEV_PULSE.projectId, VITE_FIREBASE_DATABASE_URL: DEV_PULSE.databaseURL })
    expect(db.url).toBe(DEV_PULSE.databaseURL)
  })
  it('production starts on production (unaffected)', async () => {
    const { db } = await load({ VITE_DEPLOY_ENV: 'production', VITE_FIREBASE_PROJECT_ID: 'quizpulsebutton', VITE_FIREBASE_DATABASE_URL: PROD_PULSE.databaseURL })
    expect(db.url).toBe(PROD_PULSE.databaseURL)
  })
})

describe('leaderboard redirect', () => {
  const route = async env => {
    vi.resetModules()
    for (const k of ['VITE_DEPLOY_ENV', 'VITE_ADMIN_APP_URL', 'VITE_FIREBASE_PROJECT_ID']) vi.stubEnv(k, env[k] ?? '')
    vi.doMock('@/lib/firebase', () => ({ db: {} }))
    vi.doMock('@/routes/Play', () => ({ default: () => null }))
    vi.doMock('@/routes/Display', () => ({ default: () => null }))
    const replace = vi.fn()
    vi.stubGlobal('location', { ...window.location, replace, pathname: '/leaderboard/s1' })
    window.history.pushState({}, '', '/leaderboard/s1')
    const { render, screen } = await import('@testing-library/react')
    const { default: App } = await import('../src/App')
    render(<App />)
    return { replace, screen }
  }
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
  it('goes to this environment\'s admin app', async () => {
    const { replace } = await route({ VITE_DEPLOY_ENV: 'preview', VITE_ADMIN_APP_URL: 'https://admin-dev.example.test/' })
    expect(replace).toHaveBeenCalledWith('https://admin-dev.example.test/leaderboard/s1')
  })
  it('a non-production build without VITE_ADMIN_APP_URL never goes to production', async () => {
    const { replace, screen } = await route({ VITE_DEPLOY_ENV: 'preview' })
    expect(replace).not.toHaveBeenCalled()
    expect(screen.getByText(/No admin app is configured/)).toBeTruthy()
  })
  it('production (on its production project) keeps the production admin', async () => {
    const { replace } = await route({ VITE_DEPLOY_ENV: 'production', VITE_FIREBASE_PROJECT_ID: 'quizpulsebutton' })
    expect(replace).toHaveBeenCalledWith('https://admin.pulseiq.com.au/leaderboard/s1')
  })
  it('a Dev deployment labelled "production" never goes to the production admin', async () => {
    const { replace } = await route({ VITE_DEPLOY_ENV: 'production', VITE_FIREBASE_PROJECT_ID: 'pulseiq-dev-70d82' })
    expect(replace).not.toHaveBeenCalled()
  })
})
