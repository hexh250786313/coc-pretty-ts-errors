import { Diagnostic, diagnosticManager, services, workspace } from 'coc.nvim'
import { formatDiagnostic } from 'pretty-ts-errors-lsp'
import objectHash from 'object-hash'

type DiagnosticHash = string

const formatted = (_diagnostics: Diagnostic[]) => {
  const diagnostics = _diagnostics.map((diagnostic) => {
    return {
      ...diagnostic,
      message: formatDiagnostic(diagnostic, (type) => type),
      // message: "this.\u001b[0m\u001b[31m\u001b[1mhistory\u001b[0m.add()\nthis.history.add()\n",
      // message: "hello, world\n```javascript\nconst j = 'hello';\n```\n42",
      filetype: 'markdown',
      source: 'pretty-ts-errors',
    }
  })
  return diagnostics
}

export async function activate() {
  const collection = diagnosticManager.create('pretty-ts-errors')
  const ts = services.getService('tsserver')
  ts.onServiceReady(() => {
    diagnosticManager.onDidRefresh(async ({ diagnostics: all }) => {
      const tsDiagnosticsHashes: Array<DiagnosticHash> = []
      const tsDiagnostics = all.filter((i) => {
        if (i.source === 'tsserver') {
          const hash = objectHash(i)
          tsDiagnosticsHashes.push(hash)
          return true
        }
      })
      const existingHashes: Array<DiagnosticHash> = []
      const existing = all.filter((i) => {
        if (i.source === 'pretty-ts-errors') {
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
      const formattedDiagnostics = formatted(tsDiagnostics)
      const doc = await workspace.document
      collection.set(doc.uri, formattedDiagnostics)
    })
  })
}
