import { ExtensionContext } from 'coc.nvim'
import { parse } from '@/parser'
import { formatDiagnostic } from 'pretty-ts-errors-markdown'

export async function activate(context: ExtensionContext) {
  return parse(context, formatDiagnostic)
}
