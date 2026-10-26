from pathlib import Path
import json,hashlib,shutil
repo=Path(r'E:\project\uni\naoshang-partner').resolve(); source=Path(r'D:\下载\icon').resolve()
rows=json.loads((repo/'work/icon-audit/inventory.json').read_text(encoding='utf8'))
# Explicit mapping verified against the visual contact sheets; names describe role and state.
common={3:'switch-arrows',4:'remove-image',6:'chevron-right-muted',7:'chevron-right-soft',11:'chevron-right',14:'caret-right-accent',20:'radio-unchecked-small',21:'radio-checked-small',28:'change-password',30:'delete',34:'image',35:'location-accent',44:'search',45:'folder',46:'radio-unchecked',48:'activate',50:'logout',51:'edit',55:'video',56:'radio-checked',57:'store',70:'chevron-right-large',81:'upload-plus'}
profile={83:'referral-code',85:'coupon',87:'founder-award',89:'children',97:'order-completed',101:'order-payment',102:'order-shipping',104:'order-receiving',106:'feedback',110:'address',111:'costore-application',112:'settings',113:'support'}
partner={84:'agency-income',86:'membership-dividend',88:'costore-approval',107:'team',108:'promotion-dividend',115:'store-info'}
order={90:'cancelled',94:'completed',98:'pending-payment',103:'pending-receipt',105:'pending-shipment'}
explicit={f'I{k:03}':f'src/static/common/icon-{v}.png' for k,v in common.items()}
for group,values in [('profile',profile),('partner',partner),('order',order)]:explicit.update({f'I{k:03}':f'src/static/{group}/icon-{v}.png' for k,v in values.items()})
explicit.update({'I023':'src/static/tabs/selection.png','I024':'src/static/tabs/profile-active.png','I025':'src/static/tabs/profile.png','I114':'src/static/tabs/member-active.png','I118':'docs/design-assets/icon-references/system-mini-program-capsule.png','I137':'docs/design-assets/icon-references/sample-member-avatar-large.png','I147':'docs/design-assets/icon-references/sample-member-avatar-small.png','I157':'docs/design-assets/icon-references/sample-member-avatar-upload.png','I158':'docs/design-assets/icon-references/sample-massage-gun.png','I159':'docs/design-assets/icon-references/sample-shirt-product.png','I162':'src/static/common/tab-underline.png','I174':'docs/design-assets/icon-references/sample-material-card.png','I175':'docs/design-assets/icon-references/panel-background.png','I176':'src/static/common/tab-underline-curved.png'})
canonical={}; plan=[]
for row in rows:
 h=row['sha256']; first=canonical.get(h)
 if first:
  dest=f"docs/design-assets/icon-duplicates/{Path(first['destination']).stem}-{row['id'].lower()}.png"; runtime=first['runtimePath']
 else:
  dest=explicit.get(row['id']) or (row['existing'][0] if row['existing'] else None)
  if not dest: raise RuntimeError('Unmapped '+row['id'])
  runtime=dest if dest.startswith('src/static/') else None
 row.update({'source':str(source/row['name']),'destination':dest,'runtimePath':runtime,'duplicate':bool(first),'canonicalId':first['id'] if first else row['id']})
 if not first:canonical[h]=row
 target=(repo/dest).resolve()
 if repo not in target.parents or (source/row['name']).parent.resolve()!=source:raise RuntimeError('Unsafe path')
 if hashlib.sha256((source/row['name']).read_bytes()).hexdigest()!=h:raise RuntimeError('Source changed')
 plan.append((row,target))
for row,target in plan:
 target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()!=row['sha256']:
  previous=repo/'docs/design-assets/icon-previous'/target.relative_to(repo/'src/static');previous.parent.mkdir(parents=True,exist_ok=True);shutil.move(str(target),str(previous))
  row['replacedAssetArchive']=previous.relative_to(repo).as_posix()
 shutil.move(str(source/row['name']),str(target))
 if hashlib.sha256(target.read_bytes()).hexdigest()!=row['sha256']:raise RuntimeError('Destination mismatch')
manifest={'date':'2026-10-22','source':str(source),'sourceFiles':len(rows),'uniqueImages':len(canonical),'duplicateImages':len(rows)-len(canonical),'runtimeUnique':sum(bool(x['runtimePath']) for x in canonical.values()),'policy':'Original bytes preserved. Duplicate exports and sample photos/system chrome archived outside runtime static. Only visually matched assets replace current icons.','assets':rows}
(repo/'docs/design-assets/icon-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
# Correct the legacy typo without modifying pixels.
old=repo/'src/static/common/icon-vefify_code.png'; new=repo/'src/static/common/icon-verification-code.png'
if old.exists():old.rename(new)
print(json.dumps({k:v for k,v in manifest.items() if k not in ['assets','policy']},ensure_ascii=True));print('remaining source files',len(list(source.glob('*'))))
