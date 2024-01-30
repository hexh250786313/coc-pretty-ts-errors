import { Diagnostic, diagnosticManager, services, workspace } from 'coc.nvim'
import { formatDiagnostic } from 'pretty-ts-errors-lsp'

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
      const tsDiagnostics = all.filter((i) => i.source === 'tsserver')
      const tsDiagnosticsCodes = tsDiagnostics.map((i) => i.code)
      const existing = all.filter((i) => i.source === 'pretty-ts-errors')
      const existingCodes = existing.map((i) => i.code)
      if (
        tsDiagnostics.length === existing.length &&
        tsDiagnosticsCodes.every((i) => existingCodes.includes(i))
      ) {
        return
      }
      const formattedDiagnostics = formatted(tsDiagnostics)
      const doc = await workspace.document
      collection.set(doc.uri, formattedDiagnostics)
    })
  })
}
