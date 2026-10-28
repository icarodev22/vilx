import sys, os
from PIL import Image, ImageOps
S, OUT = sys.argv[1], sys.argv[2]
Z = os.path.join(S, 'zip/vilx')
os.makedirs(OUT, exist_ok=True)

def save(im, name, sizes):
    # Nunca amplia: larguras maiores que o original viram a largura original.
    im = ImageOps.exif_transpose(im).convert('RGB')
    done = set()
    for w in sizes:
        w = min(w, im.width)
        if w in done:
            continue
        done.add(w)
        r = im if im.width == w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        r.save(os.path.join(OUT, f'{name}-{w}.webp'), 'WEBP', quality=84, method=6)
        print(name, w, r.size)

# section -> source file
hist = {
  'historia-oculos': 'PART4 VILACAPrancheta 1.jpg',
  'historia-olhar': 'PART1 VILACAPrancheta 2.jpg',
  'historia-vermelho': 'PART2 VILACAPrancheta 1.jpg',
  'historia-lua': 'PART5 VILACAPrancheta 1.jpg',
}
shows = {
  'show-esbornia-recife': 'Esb#U00f3rnia Recife.jpg',
  'show-pre-reveillon-bp-fortaleza': 'Pr#U00e9 R#U00e9veillon BP _ Fortaleza.jpg',
  'show-aniversario-kaio-jorge': 'Anivers#U00e1rio Kaio Jorge.jpg',
  'show-evento-privado': 'Evento Privado.jpg',
  'show-liveset': 'Vilx Liveset.jpg',
  'show-ao-vivo-01': 'SaveClip.App_680763459_18569607754025506_1203103841225504670_n.jpg',
  'show-ao-vivo-02': 'SaveClip.App_723331329_18583822774025506_3507121043668839164_n.jpg',
  'show-ao-vivo-03': 'SaveClip.App_847630209_18107120033522829_7466428019234493679_n.jpg',
}
for k, f in hist.items(): save(Image.open(os.path.join(Z, f)), k, [960, 1600, 2200])
for k, f in shows.items(): save(Image.open(os.path.join(Z, f)), k, [800, 1400])

