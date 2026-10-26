from pathlib import Path
import re
pages=['profile/founder-awards','application/costore','application/list','promotion/agency-code','members/list','members/records','feedback/detail']
for relative in pages:
 p=Path('src/pages')/(relative+'.vue');s=p.read_text(encoding='utf-8-sig')
 s=s.replace('class="account-page','class="account-page feature-page',1)
 s=s.replace("<style>@import '../../styles/account.css';</style>","<style>@import '../../styles/account.css';@import '../../styles/exclusive.css';</style>")
 # Readable typography independent of the narrow viewport; spacing/icons still use rpx.
 s=re.sub(r'font-size:\s*(\d+)rpx',lambda m:f'font-size:{max(.8125,int(m[1])/32):g}rem',s)
 p.write_text(s,encoding='utf8')
p=Path('src/styles/exclusive.css');s=p.read_text(encoding='utf-8-sig');s=s.replace('max-width:750px','max-width:46.875rem');s=re.sub(r'font-size:\s*(\d+)rpx',lambda m:f'font-size:{max(.8125,int(m[1])/32):g}rem',s)
s+='\n.feature-page{font-size:.9375rem}.feature-page .primary,.feature-page .secondary{font-size:1rem;line-height:2.8;white-space:normal}.feature-page .account-note{font-size:.8125rem;display:block}.feature-page .account-error{font-size:.875rem}.feature-page .account-input{font-size:1rem;min-height:2.75em}.feature-page .account-label{font-size:.9375rem}.feature-sheet{font-size:.9375rem}.feature-note{font-size:.8125rem}\n'
p.write_text(s,encoding='utf8')
p=Path('src/pages/members/list.vue');s=p.read_text(encoding='utf8');s=s.replace('.benefit-title{width:58rpx;', '.benefit-title{width:2.5em;').replace('padding:12rpx 16rpx;line-height:1.3;','padding:.6em .5em;line-height:1.3;').replace('.member-benefit button{width:52rpx;', '.member-benefit button{width:2.5em;').replace('padding:12rpx 14rpx;', 'padding:.6em .5em;');p.write_text(s,encoding='utf8')
