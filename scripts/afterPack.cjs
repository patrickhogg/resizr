// electron-builder afterPack hook: ad-hoc sign the macOS app for internal use.
//
// electron-builder only signs when a real Developer ID is present, so without
// this the packaged bundle keeps Electron's stale ad-hoc signature and fails
// `codesign --verify` — which shows up as "app is damaged" on Apple Silicon.
// Here we re-sign every nested Mach-O (native .node/.dylib) and then the whole
// bundle with the ad-hoc identity ("-"), giving a valid signature with no
// certificate or Apple account. Gatekeeper still quarantines a downloaded copy
// on other Macs (right-click > Open, or `xattr -cr`), but the app runs cleanly.
const { execFileSync } = require('node:child_process')
const path = require('node:path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appName = context.packager.appInfo.productFilename
  const appId = context.packager.appInfo.id
  const appPath = path.join(context.appOutDir, `${appName}.app`)

  const sign = (target, extraArgs = []) =>
    execFileSync('codesign', ['--force', '--sign', '-', ...extraArgs, target], { stdio: 'pipe' })

  // 1. Sign nested Mach-O binaries first (native addons live in asar.unpacked).
  const machO = execFileSync('find', [appPath, '-type', 'f', '(', '-name', '*.node', '-o', '-name', '*.dylib', ')'])
    .toString()
    .split('\n')
    .filter(Boolean)
  for (const bin of machO) sign(bin)

  // 2. Seal and sign the whole bundle (inner-to-outer) with our identifier.
  sign(appPath, ['--deep', '--identifier', appId])

  // 3. Fail the build loudly if the result isn't valid.
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'pipe' })
  console.log(`  • ad-hoc signed & verified ${appName}.app (${context.arch === 1 ? 'x64' : 'arm64'})`)
}
