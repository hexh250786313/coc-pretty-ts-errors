import {
  Diagnostic,
  ExtensionContext,
  Position,
  Range,
  diagnosticManager,
  languages,
  services,
  workspace,
} from 'coc.nvim'
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

let lastPrettyDiagnostics: Diagnostic[] = []

export async function activate(context: ExtensionContext) {
  const configuration = workspace.getConfiguration(NAMESPACE)
  const isEnable = configuration.get('enable', true)
  const showLink = configuration.get('showLink', false)
  if (!isEnable) {
    return null
  }
  const ts = services.getService(TS_NAMESPACE)
  ts.onServiceReady(() => {
    const collection = diagnosticManager.create(NAMESPACE)
    diagnosticManager.onDidRefresh(async ({ diagnostics: all, uri }) => {
      if (all.length === 0) {
        lastPrettyDiagnostics = []
        collection.set(uri, [])
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
      if (
        tsDiagnostics.length === existing.length &&
        tsDiagnosticsHashes.every((i) => existingHashes.includes(i))
      ) {
        return
      }
      const formattedDiagnostics = format(tsDiagnostics, {
        showLink,
      })
      setTimeout(() => {
        lastPrettyDiagnostics = [...formattedDiagnostics]
        collection.set(uri, formattedDiagnostics)
      })
    })
  })

  // const selctor: DocumentSelector = null;
  context.subscriptions.push(
    languages.registerHoverProvider(
      [
        {
          language: '*',
        },
      ],
      {
        provideHover: (doc, pos) => {
          console.log('hover', {
            doc,
            pos,
            lastPrettyDiagnostics,
          })
          const res = lastPrettyDiagnostics
            .map((d) => {
              if (isPositionInRange(pos, d.range)) {
                return {
                  language: 'markdown',
                  value: d.message,
                }
              }
              return null
            })
            .filter(Boolean)
          if (res && res.length) {
            return res
          }
          return null
        },
      },
    ),
  )
}

function isPositionInRange(pos: Position, range: Range) {
  return (
    pos.line >= range.start.line &&
    pos.line <= range.end.line &&
    pos.character >= range.start.character &&
    pos.character <= range.end.character
  )
}
