import {
  Diagnostic,
  ExtensionContext,
  MarkedString,
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

const lastPrettyDiagnostics: Record<string, Diagnostic[]> = {}

class Mode {
  static readonly Diagnostic = 0
  static readonly Hover = 1
  static readonly Both = 2

  constructor(public readonly value: number) {
    this.value = value
  }

  showInDiagnostic() {
    return this.value === Mode.Diagnostic || this.value === Mode.Both
  }

  showInHover() {
    return this.value === Mode.Hover || this.value === Mode.Both
  }
}

export async function activate(context: ExtensionContext) {
  const configuration = workspace.getConfiguration(NAMESPACE)
  const isEnable = configuration.get('enable', true)
  const showLink = configuration.get('showLink', false)
  const mode = configuration.get('mode', Mode.Both)
  if (!isEnable) {
    return null
  }
  const modeObj = new Mode(mode)
  const ts = services.getService(TS_NAMESPACE)
  ts.onServiceReady(() => {
    const collection = diagnosticManager.create(NAMESPACE)
    diagnosticManager.onDidRefresh(async ({ diagnostics: all, uri }) => {
      if (all.length === 0) {
        lastPrettyDiagnostics[uri] = []
        modeObj.showInDiagnostic() && collection.set(uri, [])
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
        lastPrettyDiagnostics[uri] = [...formattedDiagnostics]
        modeObj.showInDiagnostic() && collection.set(uri, formattedDiagnostics)
      })
    })
  })

  context.subscriptions.push(
    languages.registerHoverProvider(
      [
        {
          language: 'javascript',
        },
        {
          language: 'javascriptreact',
        },
        {
          language: 'javascript.jsx',
        },
        {
          language: 'typescript',
        },
        {
          language: 'typescriptreact',
        },
        {
          language: 'typescript.tsx',
        },
        {
          language: 'typescript.jsx',
        },
        {
          language: 'jsx-tags',
        },
        {
          language: 'jsonc',
        },
      ],
      {
        provideHover: (_doc, pos) => {
          if (!modeObj.showInHover()) {
            return null
          }
          const res = lastPrettyDiagnostics[_doc.uri]
            ?.map((d) => {
              if (isPositionInRange(pos, d.range)) {
                return {
                  language: 'markdown',
                  value: d.message,
                }
              }
              return null
            })
            .filter(Boolean)
          return {
            contents: res as MarkedString[],
          }
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
