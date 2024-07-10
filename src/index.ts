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
import { URI } from 'vscode-uri'
import { basename } from 'path'
import { formatDiagnostic } from 'pretty-ts-errors-markdown'

const NAMESPACE = 'pretty-ts-errors'
let TS_NAMESPACE = 'tsserver'

type FormatOptions = {
  showLink: boolean
  codeBlockHighlightType: 'prettytserr' | 'typescript'
  separateDiagnostics?: boolean
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

  const replacedText = textWithPlaceholders
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(backtickRegex, '\u001b[33m$1\u001b[0m')

  const finalText = replacedText.replace(/\0/g, () => codeBlocks.shift() || '')

  return finalText
}

const error = (str: string) => {
  return `\u001b[31m${str}\u001b[0m`
}

const warning = (str: string) => {
  return `\u001b[32m${str}\u001b[0m`
}

const info = (str: string) => {
  return `\u001b[36m${str}\u001b[0m`
}

const renderType = {
  [DiagnosticSeverity.Error]: error,
  [DiagnosticSeverity.Warning]: warning,
  [DiagnosticSeverity.Information]: info,
  [DiagnosticSeverity.Hint]: info,
} as const

const format = (_diagnostics: Diagnostic[], opt: FormatOptions) => {
  const diagnostics = _diagnostics.map((_diagnostic) => {
    let suffix = ''
    const diagnostic = Object.assign({}, _diagnostic)
    if (diagnostic.message.includes('\n\nRelated diagnostics:')) {
      const source = diagnostic.message.split('\n\nRelated diagnostics:')?.[0]
      diagnostic.message = source
    }
    try {
      if (opt.separateDiagnostics && diagnostic.relatedInformation?.length) {
        suffix = `\n\n\u001b[35mRelated diagnostics:\u001b[0m\n`
        for (const info of diagnostic.relatedInformation) {
          const path = URI.parse(info.location.uri).fsPath
          const name = basename(path)
          const line = info.location.range.start.line + 1
          const column = info.location.range.start.character + 1
          suffix = `${suffix}\n  - [${name}#${line},${column}](${path}): ${info.message}`
        }
      }
    } catch (e) {
      // do nothing...
    }
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
        line = line.replace(
          /(\['+)([^' ]+)('+.+?📄\])/g,
          (_match, _p1, target) => `[${target}]`,
        )
        if (opt.showLink === false) {
          line = line.replace(/\[(🔗|🌐)\]\(.*\)/g, '')
        }
        if (opt.codeBlockHighlightType === 'prettytserr') {
          line = line.replace(/(?<=(^\s*```))typescript/, 'prettytserr')
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
      message: `${formatted}${suffix}\n\n`,
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
  const serverName = configuration.get('serverName', TS_NAMESPACE)
  let separateDiagnostics = configuration.get('separateDiagnostics', undefined)
  TS_NAMESPACE = serverName
  if (!isEnable) {
    return null
  }
  const modeObj = new Mode(mode)
  const ts = services.getService(TS_NAMESPACE)
  const filterOriginalTsErrors = configuration.get(
    'experimental.filterOriginalTsErrors',
    true,
  )
  if (!ts) {
    console.error(
      `Tsserver not found: serverName '${TS_NAMESPACE}' is not available.`,
    )
    return null
  }
  ts.onServiceReady(() => {
    if (separateDiagnostics === undefined) {
      // @ts-ignore
      separateDiagnostics = ts?.client?.clientOptions?.separateDiagnostics
    }
    const collection = diagnosticManager.create(NAMESPACE)
    const tsDiagnosticsCollection =
      diagnosticManager.getCollectionByName(serverName)
    // const TS = ts as any
    // TS?.clientHost?.client?.diagnosticsManager?._currentDiagnostics?.onDidDiagnosticsChange(
    ;(tsDiagnosticsCollection as any)?.onDidDiagnosticsChange((uri: string) => {
      const document = workspace.getDocument(uri)
      if (document?.bufnr !== undefined) {
        const diagnosticsBuffers = (diagnosticManager as any).buffers
        const diagnosticsBuffer = diagnosticsBuffers.getItem(document?.bufnr)
        if (diagnosticsBuffer) {
          const diagnostics =
            diagnosticManager.getDiagnostics(diagnosticsBuffer)
          const tsDiagnostics = diagnostics[serverName]
          const formattedDiagnostics = format(tsDiagnostics, {
            showLink,
            codeBlockHighlightType,
            separateDiagnostics,
          })
          setTimeout(() => {
            lastPrettyDiagnostics[uri] = [...formattedDiagnostics]
            if (modeObj.showInDiagnostic()) {
              if (filterOriginalTsErrors) {
                //
                // This part is experimental: hack from source coc.nvim code
                // The purpose is to avoid triggering onDidDiagnosticsChange of tsDiagnosticsCollection, so as to avoid repeated updates
                //
                // hack `delete`: coc.nvim/src/diagnostic/collection.ts
                // hack `onDidDiagnosticsChange`: coc.nvim/src/diagnostic/collection.ts
                //
                ;(tsDiagnosticsCollection as any).diagnosticsMap.delete(uri)
                if (diagnosticsBuffer.config.autoRefresh) {
                  void diagnosticsBuffer.update(serverName, [])
                }
              }
              collection.set(uri, formattedDiagnostics)
            }
          })
        }
      }
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
        {
          language: 'vue',
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
