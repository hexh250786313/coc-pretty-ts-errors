function! prettytserr#pick(color, ground) abort
  let src = synIDattr(synIDtrans(hlID(a:color)), a:ground, 'gui')
  if src != ""
    return src
  else
    return "NONE"
  end
endfunction

function! prettytserr#pick_gui(group) abort
  let output = execute('highlight ' . a:group)
  if output =~ 'link'
    let link = matchstr(output, 'to \zs\S*')
    return prettytserr#pick_gui(link)
  else
    let gui = matchstr(output, 'gui=\zs\S*')
    if gui != ""
      return gui
    else
      return "NONE"
    endif
  endif
endfunction

function! prettytserr#highlight_invalid(group) abort
  let output = execute('hi ' . a:group)
  if output =~ 'link'
    let link = matchstr(output, 'to \zs\S*')
    return prettytserr#highlight_invalid(link)
  endif
  return match(output, 'cleared') != -1
endfunction

function! prettytserr#pick_valid(groups, test_group)
  if len(a:groups) == 0
    return ["NONE", "NONE", "NONE"]
  endif
  let group = remove(a:groups, 0)
  let guifg = prettytserr#pick(group, 'fg')
  let guibg = prettytserr#pick(group, 'bg')
  let gui = prettytserr#pick_gui(group)

  exec 'highlight link ' . a:test_group . ' ' . group
  " exec 'highlight ' . a:test_group
  "   \' guifg=' . guifg .
  "   \' guibg=' . guibg .
  "   \' gui='   . gui

  if prettytserr#highlight_invalid(a:test_group)
    return prettytserr#pick_valid(a:groups, a:test_group)
  endif

  return [ guifg, guibg, gui, group ]
endfunction

function prettytserr#init ()
  highlight def PrettyTsErrorType guifg=NONE guibg=NONE gui=NONE
  if !exists("g:coc_pretty_ts_errors_highlight_inited")
    let g:my_coc_pretty_ts_errors_highlight_inited = 1

    if prettytserr#highlight_invalid('CocMarkdownCode')
      let [inline_guifg, inline_guibg, inline_gui, inline_group] = prettytserr#pick_valid(['markdownCode', '@markup.raw.markdown_inline', '@string', 'String'], 'PrettyTsErrorTypeTest1')
      exec 'highlight link CocMarkdownCode ' . inline_group
      if prettytserr#highlight_invalid('CocMarkdownCode')
        highlight link CocMarkdownCode String
      endif
    endif

    if prettytserr#highlight_invalid('PrettyTsErrorType')
      let [block_guifg, block_guibg, block_gui, block_group] = prettytserr#pick_valid(['@markup.raw.block.markdown'], 'PrettyTsErrorTypeTest2')
      exec 'highlight def link PrettyTsErrorType ' . block_group
      if prettytserr#highlight_invalid('PrettyTsErrorType')
        if &background == "dark"
          highlight def PrettyTsErrorType guifg=#393939 guibg=NONE gui=NONE
        else
          highlight def PrettyTsErrorType guifg=#D0D0D0  guibg=NONE gui=NONE
        endif
      endif
    endif
  endif
endfunction
