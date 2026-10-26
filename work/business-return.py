from pathlib import Path
for p in Path('src/pages').rglob('*.vue'):
 s=p.read_text(encoding='utf-8-sig')
 if ':page-query="query"' not in s or 'Business' not in s:continue
 if 'useBusinessReturn' in s:continue
 s=s.replace("import {useAuth} from '../../composables/useAuth'", "import {useAuth} from '../../composables/useAuth'\nimport {useBusinessReturn} from '../../composables/useBusinessReturn'")
 s=s.replace('useAuth();const page=', 'useAuth();useBusinessReturn();const page=')
 p.write_text(s,encoding='utf8')
