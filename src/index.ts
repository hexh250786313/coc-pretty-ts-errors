import {
  Diagnostic,
  DiagnosticSeverity,
  ExtensionContext,
  MarkedString,
  Position,
  Range,
  diagnosticManager,
  languages,
  services,
  workspace,
} from 'coc.nvim'
import objectHash from 'object-hash'
import { formatDiagnostic } from 'pretty-ts-errors-markdown'

const NAMESPACE = 'pretty-ts-errors'
const TS_NAMESPACE = 'tsserver'

type DiagnosticHash = string

type formatOptions = {
  showLink: boolean
  codeBlockHighlightType: 'prettytserr' | 'typescript'
}

async function registerRuntimepath(extensionPath: string) {
  const { nvim } = workspace
  const rtp = (await nvim.getOption('runtimepath')) as string
  const paths = rtp.split(',')
  if (!paths.includes(extensionPath)) {
    await nvim.command(
      `execute 'noa set rtp+='.fnameescape('${extensionPath.replace(
        /'/g,
        "''",
      )}')`,
    )
  }
}

/** Replace backticks in text, but not in code blocks */
function replaceBackticksExceptCodeBlocks(text: string) {
  const codeBlockRegex = /```[\s\S]*?```/g
  const backtickRegex = /`([^`]+)`/g

  const codeBlocks: string[] = []
  const textWithPlaceholders = text.replace(codeBlockRegex, (match: string) => {
    codeBlocks.push(match)
    return '\0'
  })

  const replacedText = textWithPlaceholders.replace(
    backtickRegex,
    '\u001b[1;34m$1\u001b[0m',
  )

  const finalText = replacedText.replace(/\0/g, () => codeBlocks.shift() || '')

  return finalText
}

const error = (str: string) => {
  return `\u001b[1;31m${str}\u001b[0m`
}

const warning = (str: string) => {
  return `\u001b[1;32m${str}\u001b[0m`
}

const info = (str: string) => {
  return `\u001b[1;36m${str}\u001b[0m`
}

const renderType = {
  [DiagnosticSeverity.Error]: error,
  [DiagnosticSeverity.Warning]: warning,
  [DiagnosticSeverity.Information]: info,
  [DiagnosticSeverity.Hint]: info,
} as const

const format = (_diagnostics: Diagnostic[], opt: formatOptions) => {
  const diagnostics = _diagnostics.map((diagnostic) => {
    const formatted = replaceBackticksExceptCodeBlocks(
      formatDiagnostic(diagnostic),
    )
      .split('\n')
      .map((line, index) => {
        if (index === 0) {
          line = renderType[diagnostic.severity || DiagnosticSeverity.Error](
            line.substring(3, line.length),
          )
        }
        if (opt.showLink === false) {
          line = line.replace(/^\*@see\*.*/g, '')
        }
        if (opt.codeBlockHighlightType === 'prettytserr') {
          line = line.replace(/(?<=(^\s+```))typescript/, 'prettytserr')
        } else {
          const match = line.match(/^(\s*)```typescript.*/)
          const spaceCount = match?.[1].length || 0
          line = line.replace(
            /(?<=(^\s*```))typescript/,
            `typescript\n${'\u0020'.repeat(spaceCount)}type Type =`,
          )
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
  const codeBlockHighlightType = configuration.get(
    'codeBlockHighlightType',
    'prettytserr',
  )
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
        codeBlockHighlightType,
      })
      setTimeout(() => {
        lastPrettyDiagnostics[uri] = [...formattedDiagnostics]
        modeObj.showInDiagnostic() && collection.set(uri, formattedDiagnostics)
      })
    })
  })

  await registerRuntimepath(context.extensionPath)

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
  let flag = true
  if (pos.line < range.start.line || pos.line > range.end.line) flag = false
  if (pos.line === range.start.line && pos.character < range.start.character)
    flag = false
  if (pos.line === range.end.line && pos.character > range.end.character)
    flag = false
  return flag
}
