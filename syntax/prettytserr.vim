syntax match PrettyTsErrorType ".*"

function! s:pick(color, ground) abort
  let src = synIDattr(synIDtrans(hlID(a:color)), a:ground, 'gui')
  if src != ""
    return src
  else
    return "NONE"
  end
endfunction

function! s:pick_gui(group) abort
  let output = execute('highlight ' . a:group)
  if output =~ 'link'
    let link = matchstr(output, 'to \zs\S*')
    return s:pick_gui(link)
  else
    let gui = matchstr(output, 'gui=\zs\S*')
    if gui != ""
      return gui
    else
      return "NONE"
    endif
  endif
endfunction

function! s:highlight_invalid(group) abort
  let output = execute('hi ' . a:group)
  return match(output, 'cleared') != -1
endfunction

let guifg = s:pick('CocMarkdownCode', 'fg')
let guibg = s:pick('CocMarkdownCode', 'bg')
let gui = s:pick_gui('CocMarkdownCode')

exec 'highlight def PrettyTsErrorType' .
  \' guifg=' . guifg .
  \' guibg=' . guibg .
  \' gui='   . gui

if s:highlight_invalid('PrettyTsErrorType')
  if &background == "dark"
    highlight def PrettyTsErrorType guifg=#393939 guibg=NONE gui=NONE
    highlight CocMarkdownCode guifg=#393939 guibg=NONE gui=NONE
  else
    highlight def PrettyTsErrorType guifg=#D0D0D0  guibg=NONE gui=NONE
    highlight CocMarkdownCode guifg=#D0D0D0  guibg=NONE gui=NONE
  endif
endif
