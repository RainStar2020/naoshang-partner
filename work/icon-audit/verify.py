from pathlib import Path
from PIL import Image
import json,re,hashlib,csv
repo=Path('.'); manifest=json.loads((repo/'docs/design-assets/icon-manifest.json').read_text(encoding='utf8'))
missing=[]; refs={}
for p in (repo/'src').rglob('*'):
 if p.suffix not in ['.vue','.js','.css','.json']:continue
 text=p.read_text(encoding='utf-8-sig')
 for asset in set(re.findall(r'(?:/)?static/[a-zA-Z0-9_/.-]+\.png',text)):
  asset=asset.lstrip('/');path=repo/'src'/asset
  if not path.exists():missing.append({'file':p.as_posix(),'path':asset})
  refs.setdefault(('src/'+asset),[]).append(p.as_posix())
for p in (repo/'src/static/tabs').glob('*.png'):refs.setdefault(p.as_posix(),[]).append('src/components/AppTabBar.vue (dynamic)')
for p in (repo/'src/static/common').glob('icon-lv*.png'):refs.setdefault(p.as_posix(),[]).append('src/pages/member/index.vue (dynamic)')
for row in manifest['assets']:
 p=repo/row['destination']
 if hashlib.sha256(p.read_bytes()).hexdigest()!=row['sha256']:raise RuntimeError('Hash mismatch '+row['id'])
 row['referencedBy']=refs.get(row['runtimePath'],[]) if row['runtimePath'] else []
assets=[]
for p in (repo/'src/static').rglob('*.png'):
 if not p.name.startswith('icon-') and p.parent.name!='tabs':continue
 im=Image.open(p);asset=p.as_posix()
 assets.append({'path':asset,'width':im.width,'height':im.height,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'referencedBy':refs.get(asset,[]),'formattedName':bool(re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*[.]png',p.name))})
assert not missing,missing
assert all(a['formattedName'] for a in assets)
manifest['verification']={'all176HashesMatch':True,'sourceDirectoryEmpty':not any(Path(manifest['source']).iterdir()),'staticReferencesMissing':missing,'runtimeIconFiles':len(assets),'runtimeIconsReferenced':sum(bool(a['referencedBy']) for a in assets),'format':'lowercase-kebab-case.png','selectionActiveVariant':'source has gray only; active state uses white CSS tint'}
(repo/'docs/design-assets/icon-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
(repo/'docs/design-assets/runtime-icon-inventory.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2),encoding='utf8')
with (repo/'docs/design-assets/icon-name-map.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.writer(f);w.writerow(['id','originalName','destination','runtimePath','canonicalId','duplicate','sha256','referencedBy'])
 for r in manifest['assets']:w.writerow([r['id'],r['name'],r['destination'],r['runtimePath'],r['canonicalId'],r['duplicate'],r['sha256'],';'.join(r['referencedBy'])])
print(json.dumps(manifest['verification']))
