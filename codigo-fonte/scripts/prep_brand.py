# Prepara as versões do logo para o site (recorte + tamanho de tela).
# Uso: python3 scripts/prep_brand.py reference/brand src/assets/brand public
import sys, os
from PIL import Image, ImageDraw

SRC, OUT, PUB = sys.argv[1], sys.argv[2], sys.argv[3]

def crop_alpha(im, pad=6):
    bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad)))

def fit(im, w):
    return im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)

# 6 → cabeçalho (branco)
w = fit(crop_alpha(Image.open(os.path.join(SRC, 'vilx-logo-branco.png')).convert('RGBA')), 360)
w.save(os.path.join(OUT, 'logo-branco.png'), optimize=True); print('logo-branco', w.size)

# 9 → título do Contato (vermelho com contorno)
r = fit(crop_alpha(Image.open(os.path.join(SRC, 'vilx-logo-vermelho.png')).convert('RGBA')), 900)
r.save(os.path.join(OUT, 'logo-vermelho.png'), optimize=True); print('logo-vermelho', r.size)

# 8 → rodapé (selo); recorta a oval com uma margem do fundo preto
s = Image.open(os.path.join(SRC, 'vilx-logo-selo.jpg')).convert('RGB')
bb = s.convert('L').point(lambda v: 255 if v > 60 else 0).getbbox()
pad = 14
s = s.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(s.width, bb[2] + pad), min(s.height, bb[3] + pad)))
# fundo preto externo -> transparente (preenchimento a partir das bordas,
# então o contorno preto das letras, que fica dentro da oval, é mantido)
s = s.convert('RGBA')
px = s.load()
W, H = s.size
seen = bytearray(W * H)
stack = [(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)]
while stack:
    x, y = stack.pop()
    if x < 0 or y < 0 or x >= W or y >= H or seen[y * W + x]:
        continue
    r_, g_, b_, _ = px[x, y]
    if max(r_, g_, b_) > 70:
        continue
    seen[y * W + x] = 1
    px[x, y] = (0, 0, 0, 0)
    stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
s = fit(s, 480)
s.save(os.path.join(OUT, 'logo-selo.webp'), 'WEBP', quality=90, method=6, exact=True); print('logo-selo', s.size)

# 7 → ícone da aba: logo preto sobre quadrado vermelho arredondado
k = crop_alpha(Image.open(os.path.join(SRC, 'vilx-logo-preto.png')).convert('RGBA'))
for size, name in ((64, 'favicon.png'), (180, 'apple-touch-icon.png')):
    tile = Image.new('RGBA', (size * 4, size * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    d.rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=size * 4 // 5 if name == 'favicon.png' else 0, fill=(255, 45, 31, 255))
    lw = int(size * 4 * 0.84)
    lg = k.resize((lw, round(k.height * lw / k.width)), Image.LANCZOS)
    tile.alpha_composite(lg, ((tile.width - lg.width) // 2, (tile.height - lg.height) // 2))
    tile = tile.resize((size, size), Image.LANCZOS)
    tile.save(os.path.join(PUB, name), optimize=True); print(name, tile.size)
