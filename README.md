# coc-pretty-ts-errors

Inspired by https://github.com/yoavbls/pretty-ts-errors. This CoC extension is a port of the original extension to work with CoC.

Based on https://github.com/hexh250786313/pretty-ts-errors-markdown.

https://github.com/hexh250786313/coc-pretty-ts-errors/assets/26080416/cae19b18-e4cb-4fee-8739-caec87a588c6

## Features

- Show TypeScript error messages in a more readable format.
- You can choose to use `doHover` or diagnostic floating window to display error message by option `pretty-ts-errors.mode`.
- There are two ways to highlight code blocks, one is to use the highlight group `PrettyTsErrorType` to highlight a single color, and the other is to use ts syntax highlight.
  |`pretty-ts-errors.codeBlockHighlightType` | screenshot | description |
  |---|---|---|
  |`"prettytserr"` | <img width="333" alt="prettier" src="https://github.com/hexh250786313/coc-pretty-ts-errors/assets/26080416/2373045a-1010-456e-a050-de5d90980265"> | Use highlight group `PrettyTsErrorType` to highlight a single color. |
  | `"typescript"` | <img width="333" alt="ts" src="https://github.com/hexh250786313/coc-pretty-ts-errors/assets/26080416/4aa39849-da69-4300-93af-a3293bd86b15"> | Use ts syntax highlight. And for correct syntax highlight it will extra add a `"type Type = "` before type definition in code blocks. |

  ※ Personally, I prefer to use prettytserr to highlight a single color, because it is more readable and does not affect the original code.

## Usage

Make sure you have `coc.nvim` and `coc-tsserver` installed.

And make sure your `coc.nvim` includes the pr https://github.com/neoclide/coc.nvim/commit/9c079ad79d66d4ede7886cc4094a822352559502 which gives diagnostic floating window highlight.

Then run the following command:

```
:CocInstall coc-pretty-ts-errors
```

## Configuration

Here are the available configuration options for coc-pretty-ts-errors:

- `pretty-ts-errors.enable`: (Boolean, default: `true`) Enable or disable the coc-pretty-ts-errors extension.
- `pretty-ts-errors.showLink`: (Boolean, default: `false`) Show ref links in error message.
- `pretty-ts-errors.mode`: (0 | 1 | 2, default: `2`) Display mode of the error message.
- `pretty-ts-errors.codeBlockHighlightType`: ("prettytserr" | "typescript", default: `"prettytserr"`) The way to highlight code block.
