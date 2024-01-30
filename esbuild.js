/* eslint-disable @typescript-eslint/no-var-requires */
const chokidar = require('chokidar')
const esbuild = require('esbuild')
const child_process = require('child_process')
const rimraf = require('rimraf')

async function start() {
  esbuild
    .build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      minify: process.env.NODE_ENV === 'production',
      sourcemap: process.env.NODE_ENV === 'development',
      mainFields: ['module', 'main'],
      external: ['coc.nvim', 'typescript'],
      platform: 'node',
      target: 'node14.14',
      outfile: 'node_modules/.esbuild-cache/build/index.js',
      plugins: [],
    })
    .catch((e) => {
      console.error(e)
    })
    .then(() => {
      try {
        child_process.execSync(
          'rsync -avz --delete ./node_modules/.esbuild-cache/build ./',
        )
        console.log('rsync completed successfully.')
      } catch (error) {
        console.error('Error occurred while running rsync:', error.message)
      }
    })
}

function deleteBuild() {
  return rimraf.sync('./node_modules/.esbuild-cache/build')
}

deleteBuild()
start()

if (process.argv.length > 2 && process.argv[2] === '--watch') {
  const watcher = chokidar.watch('src/**/*.*', {
    ignoreInitial: true,
  })

  ;['change', 'add', 'unlink'].forEach((event) => {
    watcher.on(event, (path) => {
      console.log(`File ${event}: ${path}`)
      deleteBuild()
      start()
    })
  })
}
