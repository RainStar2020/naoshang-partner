from pathlib import Path
import json,re
p=Path('src/pages.json');doc=json.loads(p.read_text(encoding='utf-8-sig'))
for target in Path('src/pages').rglob('*.vue'):
 s=target.read_text(encoding='utf-8-sig')
 if ':page-query="query"' not in s or 'Business' not in s or 'BusinessPageHeader' in s:continue
 route=target.relative_to('src').with_suffix('').as_posix();entry=next(item for item in doc['pages'] if item['path']==route);title=entry['style']['navigationBarTitleText'];entry['style']['navigationStyle']='custom'
 s=s.replace('<template>','<template><view class="business-page-shell feature-page"><BusinessPageHeader title="'+title+'"/>',1).replace('</template>','</view></template>',1)
 s=s.replace("import {ref} from 'vue'", "import {ref} from 'vue'\nimport BusinessPageHeader from '../../components/BusinessPageHeader.vue'")
 s+='\n<style>.business-page-shell{min-height:100vh;background:#272c47}.business-page-shell>.account-page{min-height:calc(100vh - 3.2em)}</style>\n'
 target.write_text(s,encoding='utf8')
p.write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf8')
