/* eslint-disable @typescript-eslint/no-var-requires */
const chokidar = require('chokidar')
const esbuild = require('esbuild')
const child_process = require('child_process')
const rimraf = require('rimraf')
const fs = require('fs')
const path = require('path')

function getAllTsFiles(dir) {
  const files = []

  function traverse(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        traverse(fullPath)
      } else if (entry.isFile() && fullPath.endsWith('.ts')) {
        files.push(fullPath)
      }
    }
  }

  traverse(dir)
  return files
}

async function buildLib() {
  return esbuild
    .build({
      entryPoints: getAllTsFiles('src/lib'),
      // bundle: true,
      minify: process.env.NODE_ENV === 'production',
      sourcemap: process.env.NODE_ENV === 'development',
      mainFields: ['module', 'main'],
      platform: 'node',
      target: 'node14.14',
      outdir: 'node_modules/.esbuild-cache/lib',
      plugins: [],
    })
    .catch((e) => {
      console.error(e)
    })
    .then(() => {
      try {
        child_process.execSync(
          'rsync -avz --delete ./node_modules/.esbuild-cache/lib ./',
        )
        console.log('Rsync lib completed successfully.')
      } catch (error) {
        console.error('Error occurred while running rsync lib:', error.message)
      }
      getAllTsFiles('src/lib').map((path) => {
        child_process.exec(
          `npx tsc --emitDeclarationOnly --esModuleInterop --outDir "./lib" -d ${path}`,
          (err, stdout, stderr) => {
            if (err || stderr || stdout) {
              console.error(
                'Error occurred while generating declaration files:',
                stdout || stderr,
              )
              return
            }
          },
        )
      })
    })
}

async function buildIndex() {
  return esbuild
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
        console.log('Rsync index.js completed successfully.')
      } catch (error) {
        console.error(
          'Error occurred while running rsync index.js:',
          error.message,
        )
      }
    })
}

async function start() {
  await buildLib()
  await buildIndex()
}

function deleteBuild() {
  return rimraf.sync('./node_modules/.esbuild-cache/build')
}

function deleteLib() {
  return rimraf.sync('./node_modules/.esbuild-cache/lib')
}

deleteBuild()
deleteLib()
start()

if (process.argv.length > 2 && process.argv[2] === '--watch') {
  const watcher = chokidar.watch(['src/**/*.*', 'yalc.lock'], {
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
