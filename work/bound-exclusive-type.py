from pathlib import Path
import re
paths=list(Path('src/pages').glob('application/*.vue'))+[Path('src/pages/profile/founder-awards.vue'),Path('src/pages/promotion/agency-code.vue'),*Path('src/pages/members').glob('*.vue'),Path('src/pages/feedback/detail.vue'),Path('src/styles/exclusive.css')]
for p in paths:
 s=p.read_text(encoding='utf-8-sig')
 s=re.sub(r'font-size:\s*([\d.]+)rem',lambda m:f'font-size:calc(var(--feature-font,14px)*{float(m[1])*8/7:.5f})',s)
 if p.name=='exclusive.css':
  s=s.replace('max-width:46.875rem','max-width:calc(var(--feature-font,14px)*50)')
  s+='\n/* uni-app scales the html rem base with viewport width. Bound the local text scale instead. */\n.feature-page{--feature-font:14px;--feature-font:clamp(14px,3.75vw,16px);font-size:var(--feature-font)}\n'
 p.write_text(s,encoding='utf8')
