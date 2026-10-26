from PIL import Image,ImageDraw
from pathlib import Path
paths=['src/static/common/icon-verification-code.png','src/static/partner/icon-invitation.png','src/static/common/icon-location.png','src/static/tabs/member-active.png']
sheet=Image.new('RGB',(520,120),'#303750'); d=ImageDraw.Draw(sheet)
for i,p in enumerate(paths):
 im=Image.open(p).convert('RGBA');im.thumbnail((80,80));sheet.paste(im,(i*130+20,8),im);d.text((i*130+5,95),str(i+1),fill='white')
sheet.save('work/icon-audit/existing-check.png')
