// Only main may ever deploy to Vercel, from any device.
// --ignore: Vercel's Ignored Build Step (exit 0 = skip, 1 = build).
// No flag: prebuild guard, fails the build on Vercel when the branch is not main.
const branch = process.env.VERCEL_GIT_COMMIT_REF
const onVercel = process.env.VERCEL === "1"
const ok = branch === "main"

if (process.argv.includes("--ignore")) {
  console.log(ok ? "Branch main: building." : `Branch ${branch || "unknown"}: only main deploys, skipping.`)
  process.exit(ok ? 1 : 0)
}

if (onVercel && !ok) {
  console.error(`Only main deploys to Vercel. This build is from ${branch || "an unknown branch"}.`)
  process.exit(1)
}
