import { Diagnostic, diagnosticManager, services, workspace } from 'coc.nvim'
import { formatDiagnostic } from 'pretty-ts-errors-markdown'
import objectHash from 'object-hash'

const NAMESPACE = 'pretty-ts-errors'
const TS_NAMESPACE = 'tsserver'

type DiagnosticHash = string

type formatOptions = {
  showLink: boolean
}

const format = (_diagnostics: Diagnostic[], opt: formatOptions) => {
  const diagnostics = _diagnostics.map((diagnostic) => {
    const formatted = formatDiagnostic(diagnostic)
      .split('\n')
      .map((line) => {
        const matches = line.match(/`[^`]+`/g)
        if (matches) {
          matches.forEach((match) => {
            const text = match.slice(1, -1)
            line = line.replace(match, `\u001b[31m${text}\u001b[0m`)
          })
        }
        if (opt.showLink === false) {
          line = line.replace(/^\*@see\*.*/g, '')
        }
        return line
      })
      .join('\n')
    return {
      ...diagnostic,
      message: `${formatted}\n\n`,
      filetype: 'markdown',
      source: NAMESPACE,
    }
  })
  return diagnostics
}

let hidingStep = 0

export async function activate() {
  const configuration = workspace.getConfiguration(NAMESPACE)
  const isEnable = configuration.get('enable', true)
  const showLink = configuration.get('showLink', false)
  const hideSource = configuration.get('hideSource', true)
  if (!isEnable) {
    return null
  }
  const ts = services.getService(TS_NAMESPACE)
  ts.onServiceReady(() => {
    const collection = diagnosticManager.create(NAMESPACE)
    const tsCollection = diagnosticManager.getCollectionByName(TS_NAMESPACE)
    diagnosticManager.onDidRefresh(async ({ diagnostics: all, uri }) => {
      if (all.length === 0) {
        collection.clear()
        return
      }
      const tsDiagnosticsHashes: Array<DiagnosticHash> = []
      const tsDiagnostics = all.filter((i) => {
        if (i.source === TS_NAMESPACE) {
          const hash = objectHash({
            code: i.code,
            range: i.range,
          })
          tsDiagnosticsHashes.push(hash)
          return true
        }
      })
      const existingHashes: Array<DiagnosticHash> = []
      const existing = all.filter((i) => {
        if (i.source === NAMESPACE) {
          const hash = objectHash({
            code: i.code,
            range: i.range,
          })
          existingHashes.push(hash)
          return true
        }
      })
      if (tsDiagnostics?.length) {
        // if there are tsDiagnostics, it means we should turn off hiding source process
        hidingStep = 0
      }
      console.log('next', {
        hidingStep,
        tsDiagnosticsHashes,
        existingHashes,
      })
      // hidingStep > 0 means it is in the process of hiding source
      if (hideSource && hidingStep > 0) {
        hidingStep++
        console.log('step a', hidingStep)
        if (hidingStep === 3) {
          // not to update pretty diagnostics while step 3
          // because there are the two ticks when it is in the hiding process
          // and we should skip the first tick(step 3) and update the pretty diagnostics on the second tick(step 4)
          return
        }
      } else if (
        !hideSource &&
        tsDiagnostics.length === existing.length &&
        tsDiagnosticsHashes.every((i) => existingHashes.includes(i))
      ) {
        return
      }
      const formattedDiagnostics = tsDiagnostics?.length
        ? format(tsDiagnostics, {
            showLink,
          })
        : existing
      setTimeout(() => {
        if (hideSource) {
          if (hidingStep >= 4) {
            console.log('step b', hidingStep)
            hidingStep = 0
          } else {
            tsCollection.set(uri, [])
            hidingStep = 1 // start hiding source
            console.log('hide start', hidingStep)
          }
        }
        collection.set(uri, formattedDiagnostics)
        if (hideSource && hidingStep === 1) {
          hidingStep++ // step 2
          console.log('update pretty', hidingStep)
        }

        // both of collection.set and tsCollection.set could trigger onDidRefresh
        // that is why there are two ticks when hiding source
      })
    })
  })
  return null
}
