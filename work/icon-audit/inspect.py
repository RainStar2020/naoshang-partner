from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib,json,math
root=Path(r'D:\下载\icon'); repo=Path(r'E:\project\uni\naoshang-partner'); out=repo/'work/icon-audit'
existing={}
for p in (repo/'src/static').rglob('*.png'): existing.setdefault(hashlib.sha256(p.read_bytes()).hexdigest(),[]).append(p.relative_to(repo).as_posix())
rows=[]; groups={}
for n,p in enumerate(sorted(root.glob('*.png')),1):
 im=Image.open(p); h=hashlib.sha256(p.read_bytes()).hexdigest(); row={'id':f'I{n:03}','name':p.name,'sha256':h,'width':im.width,'height':im.height,'bytes':p.stat().st_size,'existing':existing.get(h,[])}; rows.append(row);groups.setdefault(h,[]).append(row)
unique=[v[0] for v in groups.values()]
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',14)
for start in range(0,len(unique),60):
 subset=unique[start:start+60]; sheet=Image.new('RGB',(1200,math.ceil(len(subset)/8)*126),'#e2e5ed'); d=ImageDraw.Draw(sheet)
 for i,row in enumerate(subset):
  x=(i%8)*150;y=(i//8)*126;d.rectangle((x+3,y+3,x+146,y+90),fill='#303750');im=Image.open(root/row['name']).convert('RGBA');im.thumbnail((136,77));sheet.paste(im,(x+75-im.width//2,y+46-im.height//2),im);d.text((x+5,y+93),f"{row['id']} {row['width']}x{row['height']}",font=font,fill='black')
 sheet.save(out/f'contact-{start//60+1}.png')
(out/'inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'files':len(rows),'unique':len(unique),'matchedUnique':sum(bool(r['existing']) for r in unique),'sheets':math.ceil(len(unique)/60)}))
for row in unique: print(row['id'],row['name'],','.join(row['existing']))
