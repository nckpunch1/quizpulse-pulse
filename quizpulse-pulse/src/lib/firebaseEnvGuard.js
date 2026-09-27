// Environment separation (docs/environment-separation.md): a non-production build
// must never talk to production Firebase. The same guard lives in admin-host,
// Player and the pulse display app.

// Production Firebase projects. Their IDs appear in every production resource
// name: project ID, auth domain, RTDB host and Storage bucket.
export const PRODUCTION_FIREBASE_PROJECTS = ['pulseiqadmin', 'quizpulsebutton']
const FIELDS = ['projectId', 'authDomain', 'databaseURL', 'storageBucket']
const PRODUCTION = new RegExp(`(^|[^a-z0-9-])(${PRODUCTION_FIREBASE_PROJECTS.join('|')})(?![a-z0-9])`, 'i')

// 'production' | 'preview' | 'development' | 'local'. The build defines it (see
// vite.config.js): VITE_DEPLOY_ENV if set, else Vercel's VERCEL_ENV, else local.
export const deployEnvironment = (env = import.meta.env) => env.VITE_DEPLOY_ENV || 'local'
export const isProductionBuild = (env = import.meta.env) => deployEnvironment(env) === 'production'
const isProductionValue = value => typeof value === 'string' && PRODUCTION.test(value)
// Production defaults (legacy fallbacks) apply only to a production build whose
// own primary project is a production project. A Dev deployment that Vercel
// labels "production" (a separate Dev project) never gets them.
export const usesProductionProject = (env = import.meta.env) =>
  isProductionBuild(env) && isProductionValue(env.VITE_FIREBASE_PROJECT_ID)

// Every field of every config that names a production resource.
export function productionReferences(configs) {
  const hits = []
  for (const [name, config] of Object.entries(configs)) {
    for (const field of FIELDS) {
      const value = config?.[field]
      if (isProductionValue(value)) hits.push(`${name}.${field}=${value}`)
    }
  }
  return hits
}

// Call before initializeApp, with the app's own config first (`firebase`).
// - Any non-production build configured with a production resource refuses.
// - A build whose own project is NOT production never gets a production resource
//   either, whatever its label (e.g. a Dev deployment Vercel calls "production").
// - The production build, on its production project, is unaffected.
export function assertFirebaseEnvironment(configs, deployEnv) {
  const hits = productionReferences(configs)
  if (!hits.length) return
  const ownProjectIsProduction = isProductionValue(configs.firebase?.projectId)
  if (deployEnv === 'production' && ownProjectIsProduction) return
  const what = deployEnv === 'production' ? `production-labelled build on a non-production project (${configs.firebase?.projectId ?? 'none'})` : `${deployEnv} build`
  const message = `Refusing to initialise Firebase: this ${what} is configured with production resources (${hits.join(', ')}). Point it at the Dev project (pulseiq-dev-70d82).`
  console.error(message)
  throw new Error(message)
}
