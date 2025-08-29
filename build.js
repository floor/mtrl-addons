// build.js
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isWatch = process.argv.includes('--watch')
const isProduction =
  process.argv.includes('--production') ||
  process.env.NODE_ENV === 'production'

// Define consistent output paths
const DIST_DIR = join(__dirname, 'dist')
const JS_OUTPUT = join(DIST_DIR, 'index.js')
const MJS_OUTPUT = join(DIST_DIR, 'index.mjs')

// Log build mode
console.log(`Building in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`)

const buildApp = async () => {
  try {
    console.log('┌─────────────────────────────────────────')
    console.log('│ JavaScript Build')
    console.log('│ Mode:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT')
    console.log('│ Minify:', isProduction ? 'Yes' : 'No')
    console.log('│ Sourcemaps:', isProduction ? 'No' : 'Yes (inline)')
    console.log('└─────────────────────────────────────────')

    // Create dist directory if it doesn't exist
    await mkdir(DIST_DIR, { recursive: true })

    // Build CJS version
    const cjsResult = await Bun.build({
      entrypoints: [join(__dirname, 'src/index.ts')],
      outdir: DIST_DIR,
      minify: isProduction,
      sourcemap: isProduction ? 'none' : 'inline',
      format: 'cjs',
      target: 'node',
      external: ['mtrl']
    })

    // Build ESM version
    const esmResult = await Bun.build({
      entrypoints: [join(__dirname, 'src/index.ts')],
      outdir: DIST_DIR,
      minify: isProduction,
      sourcemap: isProduction ? 'none' : 'inline',
      format: 'esm',
      target: 'node',
      naming: {
        entry: 'index.mjs'
      },
      external: ['mtrl']
    })

    if (!cjsResult.success || !esmResult.success) {
      console.error('❌ JavaScript build failed')
      console.error(cjsResult.logs)
      console.error(esmResult.logs)
      return false
    }

    console.log('✓ JavaScript build successful')
    console.log(
      `  CJS bundle: ${((await Bun.file(JS_OUTPUT).size) / 1024).toFixed(2)} KB`
    )
    console.log(
      `  ESM bundle: ${((await Bun.file(MJS_OUTPUT).size) / 1024).toFixed(
        2
      )} KB`
    )

    // Generate type definitions with better error handling
    console.log('Generating TypeScript declarations...')

    try {
      const tscProcess = Bun.spawn(
        ['tsc', '--emitDeclarationOnly', '--outDir', DIST_DIR],
        {
          cwd: __dirname,
          stdio: ['inherit', 'pipe', 'pipe']
        }
      )

      // Capture stdout and stderr
      const stdout = await new Response(tscProcess.stdout).text()
      const stderr = await new Response(tscProcess.stderr).text()

      const tscExitCode = await tscProcess.exited

      if (tscExitCode !== 0) {
        console.error('❌ TypeScript declaration generation failed')
        console.error('Exit code:', tscExitCode)
        if (stdout.trim()) {
          console.error('STDOUT:', stdout)
        }
        if (stderr.trim()) {
          console.error('STDERR:', stderr)
        }

        // Check if tsc is available
        const whichResult = Bun.spawn(['which', 'tsc'], { stdio: ['inherit', 'pipe', 'pipe'] })
        const tscPath = await new Response(whichResult.stdout).text()
        if (!tscPath.trim()) {
          console.error('💡 TypeScript compiler (tsc) not found. Install it with:')
          console.error('   npm install -g typescript')
          console.error('   or')
          console.error('   bun add -g typescript')
        }

        return false
      }

      console.log('✓ TypeScript declarations generated')
      if (stdout.trim()) {
        console.log('TSC output:', stdout)
      }

      return true
    } catch (tscError) {
      console.error('❌ Error running TypeScript compiler:', tscError.message)

      // Check if TypeScript is installed
      try {
        const checkTsc = Bun.spawn(['tsc', '--version'], { stdio: ['inherit', 'pipe', 'pipe'] })
        const versionOutput = await new Response(checkTsc.stdout).text()
        const versionExitCode = await checkTsc.exited

        if (versionExitCode === 0) {
          console.log('TypeScript version:', versionOutput.trim())
        } else {
          console.error('💡 TypeScript compiler not properly installed. Install with:')
          console.error('   npm install -g typescript')
          console.error('   or')
          console.error('   bun add -g typescript')
        }
      } catch (versionError) {
        console.error('💡 TypeScript compiler not found. Install it with:')
        console.error('   npm install -g typescript')
        console.error('   or')
        console.error('   bun add -g typescript')
      }

      return false
    }
  } catch (error) {
    console.error('❌ JavaScript build error:', error)
    console.error(error.stack)
    return false
  }
}

const build = async () => {
  try {
    const startTime = Date.now()

    console.log('┌───────────────────────────────────────────────')
    console.log('│ 🚀 MTRL-Addons Build Process')
    console.log('│ Mode:', isProduction ? '🏭 PRODUCTION' : '🔧 DEVELOPMENT')
    console.log('│ Watch:', isWatch ? '✓ Enabled' : '✗ Disabled')
    console.log('└───────────────────────────────────────────────')
    console.log('')

    // Create output directory
    await mkdir(DIST_DIR, { recursive: true })

    // Build JavaScript
    const jsSuccess = await buildApp()

    const buildTime = ((Date.now() - startTime) / 1000).toFixed(2)

    if (isWatch && !isProduction) {
      console.log('')
      console.log('┌───────────────────────────────────────────────')
      console.log('│ 👀 Watching for changes...')
      console.log('└───────────────────────────────────────────────')

      // Watch implementation would go here
    } else {
      console.log('')
      console.log('┌───────────────────────────────────────────────')
      console.log(`│ ✅ Build completed in ${buildTime}s`)
      if (!jsSuccess) {
        console.log('│ ⚠️ Build completed with some errors')
      }
      console.log('└───────────────────────────────────────────────')

      // Only exit with error code in non-watch mode if there were failures
      if (!isWatch && !jsSuccess) {
        process.exit(1)
      }
    }
  } catch (error) {
    console.error('❌ Build failed with error:', error)
    process.exit(1)
  }
}

build()
