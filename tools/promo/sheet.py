# contact sheet: python sheet.py dir out.png [cols] [thumb_w] -> tiles every png in dir with its frame / time label
import sys, os
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
tw = int(sys.argv[4]) if len(sys.argv) > 4 else 320
files = sorted(f for f in os.listdir(d) if f.endswith('.png'))
th = tw * 9 // 16
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 14)), (20, 10, 30))
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(os.path.join(d, f)).convert('RGB').resize((tw, th), Image.BILINEAR)
    x, y = (i % cols) * tw, (i // cols) * (th + 14)
    sheet.paste(im, (x, y + 14))
    n = int(f[1:6])
    dr.text((x + 3, y + 1), f"{n}  {n/60:.2f}s", fill=(255, 220, 120))
sheet.save(out)
print(out, len(files))
