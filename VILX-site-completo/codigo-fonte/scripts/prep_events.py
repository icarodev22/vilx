# Logos dos eventos para a faixa da História.
# Origem: página 5 do "VILX - RELEASE.pdf" (imagens com máscara de
# transparência extraídas com pdfimages; Kosmos é vetorial no PDF e foi
# renderizado a 300 dpi).
# Uso: python3 scripts/prep_events.py reference/events src/assets/events
import os, sys
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
H = 240  # altura de saída (a faixa mostra ~60–90 px: sobra para telas 2x/3x)

def trim(im, thr=12, pad=4):
    bb = im.getchannel('A').point(lambda v: 255 if v > thr else 0).getbbox()
    return im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad)))

def save(im, name):
    im = trim(im)
    if im.height != H:
        im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    im.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=92, method=6, exact=True)
    print(name, im.size)

L = lambda k: Image.open(os.path.join(SRC, f'logo-{k}.png')).convert('RGBA')

save(L(0), 'carvalheira-na-ladeira')
save(L(1), 'esbornia')
save(L(2), 'sente-a-ginga')
save(L(3), 'oboe')
save(L(4), 'we-do')
# Pega Vareta: no PDF são duas camadas sobrepostas (silhueta branca + ilustração)
pv = L(5)
pv.alpha_composite(L(6))
save(pv, 'pega-vareta')
save(L(7), 'luan-city')
save(L(8), 'samba-do-barcha')

# Kosmos: logo branco sobre fundo escuro -> transparência pela luminância
k = Image.open(os.path.join(SRC, 'kosmos-render-300dpi.png')).convert('RGB')
k = k.crop((150, 0, k.width, k.height))
lum = k.convert('L').point(lambda v: max(0, min(255, round((v - 55) * 255 / (235 - 55)))))
kk = Image.new('RGBA', k.size, (255, 255, 255, 0))
kk.putalpha(lum)
save(kk, 'kosmos')
