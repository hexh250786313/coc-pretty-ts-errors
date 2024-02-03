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

export async function activate() {
  const configuration = workspace.getConfiguration(NAMESPACE)
  const isEnable = configuration.get('enable', true)
  const showLink = configuration.get('showLink', false)
  if (!isEnable) {
    return null
  }
  const collection = diagnosticManager.create(NAMESPACE)
  const ts = services.getService(TS_NAMESPACE)
  ts.onServiceReady(() => {
    diagnosticManager.onDidRefresh(async ({ diagnostics: all }) => {
      const tsDiagnosticsHashes: Array<DiagnosticHash> = []
      const tsDiagnostics = all.filter((i) => {
        if (i.source === TS_NAMESPACE) {
          const hash = objectHash(i)
          tsDiagnosticsHashes.push(hash)
          return true
        }
      })
      const existingHashes: Array<DiagnosticHash> = []
      const existing = all.filter((i) => {
        if (i.source === NAMESPACE) {
          const hash = objectHash(i)
          existingHashes.push(hash)
          return true
        }
      })
      if (
        tsDiagnostics.length === existing.length &&
        tsDiagnosticsHashes.every((i) => existingHashes.includes(i))
      ) {
        return
      }
      const formattedDiagnostics = format(tsDiagnostics, {
        showLink,
      })
      const doc = await workspace.document
      setTimeout(() => {
        collection.set(doc.uri, formattedDiagnostics)
      })
    })
  })
  return null
}
