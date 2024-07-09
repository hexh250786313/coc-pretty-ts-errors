# coc-pretty-ts-errors

Inspired by https://github.com/yoavbls/pretty-ts-errors. This CoC extension is a port of the original extension to work with CoC.

Based on https://github.com/hexh250786313/pretty-ts-errors-markdown.

https://github.com/hexh250786313/coc-pretty-ts-errors/assets/26080416/8fdbf55f-0b4e-4421-b8bf-44d144230355

## Features

- Show TypeScript error messages in a more readable format.
- You can choose to use `doHover` or diagnostic floating window to display error message by option `pretty-ts-errors.mode`.
- There are two ways to highlight code blocks, one is to use the highlight group `PrettyTsErrorType` to highlight a single color, and the other is to use ts syntax highlight.
  |`pretty-ts-errors.codeBlockHighlightType` | screenshot | description |
  |---|---|---|
  |`"prettytserr"` | <img width="333" alt="prettier" src="https://github.com/hexh250786313/coc-pretty-ts-errors/assets/26080416/2373045a-1010-456e-a050-de5d90980265"> | Use highlight group `PrettyTsErrorType` to highlight a single color. |
  | `"typescript"` | <img width="333" alt="ts" src="https://github.com/hexh250786313/coc-pretty-ts-errors/assets/26080416/4aa39849-da69-4300-93af-a3293bd86b15"> | Use ts syntax highlight. And for correct syntax highlight it will extra add a `"type Type = "` before type definition in code blocks. |

  ※ Personally, I prefer to use `prettytserr` to highlight a single color, because it is more readable and does not affect the original code.

## Usage

Make sure you have `coc.nvim` and `coc-tsserver` installed.

And make sure your `coc.nvim` includes the pr https://github.com/neoclide/coc.nvim/commit/9c079ad79d66d4ede7886cc4094a822352559502 which gives diagnostic floating window highlight.

Then run the following command:

```
:CocInstall coc-pretty-ts-errors
```

## Highlight Group

- `CocMarkdownCode` is for inline code.
- `CocMarkdownLink` is for file link.
- `PrettyTsErrorType` is for the code block if you choose `prettytserr` in `pretty-ts-errors.codeBlockHighlightType`. `PrettyTsErrorType` defaults link to `CocMarkdownCode`.

<img src="https://github.com/hexh250786313/coc-pretty-ts-errors/assets/26080416/22224233-eab2-4de4-ba84-9b5da0e97f34" alt="2024-07-09_10-48" width="25%" />

<details>
<summary>Click to see the different ways of highlighting</summary>
<img src="https://github.com/yoavbls/pretty-ts-errors/assets/26080416/7ef4ccfb-5e5a-41d7-ae35-dbe7c9cb8d61" width="30%" alt="demo1" />
<img src="https://github.com/yoavbls/pretty-ts-errors/assets/26080416/13913d30-3dd9-4fce-bf15-3df0c1e169c4" width="30%" alt="demo2" />
<img src="https://github.com/yoavbls/pretty-ts-errors/assets/26080416/64480acb-c92e-4207-a5d7-eb07e1053411" width="30%" alt="demo3" />
</details>

## Configuration

Here are the available configuration options for coc-pretty-ts-errors:

- `pretty-ts-errors.enable`: (Boolean, default: `true`) Enable or disable the coc-pretty-ts-errors extension.
- `pretty-ts-errors.showLink`: (Boolean, default: `false`) Show ref links in error message.
- `pretty-ts-errors.mode`: (0 | 1 | 2, default: `1`) Display mode of the error message.
- `pretty-ts-errors.codeBlockHighlightType`: ("prettytserr" | "typescript", default: `"prettytserr"`) The way to highlight code block.
- `pretty-ts-errors.serverName`: (String, default: `"tsserver"`) The name of the language server. Set it to 'tsserver' if youse coc-tsserver. Otherwise, set it to your customized typescript language server name.
- `pretty-ts-errors.separateDiagnostics`: (Boolean, default: `undefined`) Show related diagnostics or not. If it is `undefined`, it will use the value of `diagnostic.separateRelatedInformationAsDiagnostics`. (And `diagnostic.separateRelatedInformationAsDiagnostics` will respect the value of LS client options' `separateDiagnostics`)
- `pretty-ts-errors.experimental.filterOriginalTsErrors`: (Boolean, default: `false`) **(Experimental)** Filter original (and ugly) ts errors in the diagnostic floating window.

## Q & A

- **Q: When to use `serverName`**

- **A**: Examples:

  - When using [coc-tsserver](https://github.com/neoclide/coc-tsserver) , `serverName` is `"tsserver"`
  - When using a customized typescript `"languageserver"`, you need to modify `serverName` to the corresponding values, such as [typescript-language-server](https://github.com/typescript-language-server/typescript-language-server)

    ```
    // coc-settings.json
    "pretty-ts-errors.serverName": "my-tsserver",
                                   ~~~~~~~~~~~~~          Your customized typescript language server name.
    "languageserver": {
        "my-tsserver": {
        ~~~~~~~~~~~~~          `serverName` is from here.
            "enable": true,
            "command": "typescript-language-server",
            "args": ["--stdio"],

            ...
            ...other options

        }
    }
    ```

  - Some common typescript language server names:
    - coc-tsserver:
      - repository: https://github.com/neoclide/coc-tsserver
      - `"pretty-ts-errors.serverName": "tsserver",` (Default)
    - coc-volar:
      - repository: https://github.com/yaegassy/coc-volar
      - Options are same as coc-tsserver's ones. (coc-volar actually calls coc-tsserver)
    - typescript-language-server:
      - repository: https://github.com/typescript-language-server/typescript-language-server
      - `"pretty-ts-errors.serverName": "xxxxxxxx",` (It depends on your configuration)
    - vtsls:
      - repository: https://github.com/yioneko/vtsls
      - `"pretty-ts-errors.serverName": "xxxxxxxx",` (It depends on your configuration)
