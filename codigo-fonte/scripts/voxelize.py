import sys, json, math
from PIL import Image, ImageFilter
src, out, prev = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert('RGB')
W, H = im.size
px = im.load()
def isbg(p):
    r, g, b = p
    return r > 140 and g < 90 and b < 90 and r - g > 90
mask = [[not isbg(px[x, y]) for x in range(W)] for y in range(H)]
# flood fill from borders to define outside (keeps interior reds like lips)
outside = [[False]*W for _ in range(H)]
stack = [(x, y) for x in range(W) for y in (0, H-1)] + [(x, y) for y in range(H) for x in (0, W-1)]
while stack:
    x, y = stack.pop()
    if 0 <= x < W and 0 <= y < H and not outside[y][x] and not mask[y][x]:
        outside[y][x] = True
        stack += [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]
inside = [[not outside[y][x] for x in range(W)] for y in range(H)]
def lum(p): return 0.3*p[0]+0.59*p[1]+0.11*p[2]
def sat(p): return max(p)-min(p)
# peel the white sticker outline (whitish, touching the outside), plus jpeg fringe
for it in range(4):
    rm = []
    for y in range(H):
        for x in range(W):
            if not inside[y][x]: continue
            nb = [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]
            edge = any(not (0<=a<W and 0<=b<H) or not inside[b][a] for a,b in nb)
            p = px[x, y]
            if edge and ((lum(p) > 185 and sat(p) < 70) or (p[0] > 150 and p[1] < 110 and p[0]-p[1] > 70) or (p[0]-p[1] > 45 and abs(p[1]-p[2]) < 28)):
                rm.append((x, y))
    for x, y in rm: inside[y][x] = False
# keep largest component
seen=set(); comps=[]
for y in range(H):
    for x in range(W):
        if inside[y][x] and (x,y) not in seen:
            c=[];st=[(x,y)];seen.add((x,y))
            while st:
                a,b=st.pop();c.append((a,b))
                for n in ((a+1,b),(a-1,b),(a,b+1),(a,b-1)):
                    if 0<=n[0]<W and 0<=n[1]<H and inside[n[1]][n[0]] and n not in seen: seen.add(n);st.append(n)
            comps.append(c)
keep=set(max(comps,key=len))
pts=sorted(keep, key=lambda t:(t[1],t[0]))
xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
cx,cy=(x0+x1)/2,(y0+y1)/2; rx,ry=(x1-x0)/2+1,(y1-y0)/2+1
# distance to silhouette edge (chamfer)
INF=1e9
D={p:INF for p in keep}
for p in keep:
    a,b=p
    if any(n not in keep for n in ((a+1,b),(a-1,b),(a,b+1),(a,b-1))): D[p]=1
changed=True
while changed:
    changed=False
    for p in pts:
        a,b=p
        for n,c in (((a+1,b),1),((a-1,b),1),((a,b+1),1),((a,b-1),1),((a+1,b+1),1.414),((a-1,b-1),1.414),((a+1,b-1),1.414),((a-1,b+1),1.414)):
            if n in D and D[n]+c<D[p]: D[p]=D[n]+c; changed=True
maxd=max(D.values())
def region(p, x, y):
    L=lum(p)
    if L < 55: return 'glass'
    r,g,b=p
    if y < cy-4 and L > 150 and r > 170 and g > 140 and b < 170: return 'hair'
    if y < cy-10 and L > 120 and b < 150: return 'hair'
    return 'skin'
# glasses band rows: rows where many dark pixels
reg={}
for (x,y) in pts: reg[(x,y)]=region(px[x,y],x,y)
# glasses = largest dark component, column-filled so lens highlights stay on the lens
dark={p for p in pts if reg[p]=='glass'}
seen=set(); best=[]
for p in dark:
    if p in seen: continue
    c=[];st=[p];seen.add(p)
    while st:
        a,b=st.pop();c.append((a,b))
        for n in ((a+1,b),(a-1,b),(a,b+1),(a,b-1),(a+1,b+1),(a-1,b-1),(a+1,b-1),(a-1,b+1)):
            if n in dark and n not in seen: seen.add(n);st.append(n)
    if len(c)>len(best): best=c
cols={}
for a,b in best: cols.setdefault(a,[]).append(b)
glass=set()
for a,bs in cols.items():
    for b in range(min(bs),max(bs)+1):
        if (a,b) in keep: glass.add((a,b))
for p in pts:
    if reg[p]=='glass' and p not in glass: reg[p]='skin'
    if p in glass: reg[p]='glass'
# majority filter hair/skin to remove jpeg speckle
for _ in range(2):
    nr=dict(reg)
    for (a,b) in pts:
        if reg[(a,b)]=='glass': continue
        n=[reg.get((a+i,b+j)) for i in (-1,0,1) for j in (-1,0,1) if (i or j)]
        h=n.count('hair'); k=n.count('skin')
        if h>=5: nr[(a,b)]='hair'
        elif k>=5: nr[(a,b)]='skin'
    reg=nr
vox=[]
dep=Image.new('L',(W,H),0)
for (x,y) in pts:
    p=px[x,y]
    nx=(x-cx)/rx; ny=(y-cy)/ry
    dome=math.sqrt(max(0.0,1-nx*nx*0.85-ny*ny*0.7))
    dn=min(1.0,D[(x,y)]/(maxd*0.75))
    zf=0.55*dome+0.45*math.sqrt(dn)
    # nose: soft forward bulge in the centre-lower face (volume only, no new detail)
    zf+=0.10*math.exp(-(((x-(cx+2))/6)**2+((y-(cy+10))/7)**2))
    rg=reg[(x,y)]
    if rg=='glass':
        # lenses sit ~in front of the face, flatter
        zf=max(zf,0.0)+0.16
    elif rg=='hair':
        zf+=0.06
    zb=-(0.35+0.5*dome)
    vox.append([x-cx, cy-y, p[0], p[1], p[2], round(zf*12,2), round(zb*12,2), {'skin':0,'hair':1,'glass':2}[rg]])
    dep.putpixel((x,y),int(min(255,zf*190)))
json.dump({'w':W,'h':H,'span':[x1-x0+1,y1-y0+1],'v':vox},open(out,'w'),separators=(',',':'))
dep.resize((400,400),Image.NEAREST).save(prev)
print(len(vox), (x0,x1,y0,y1), maxd)
if len(sys.argv) > 4:
    cut = Image.new('RGBA', (x1-x0+1, y1-y0+1), (0,0,0,0))
    for (x,y) in pts: cut.putpixel((x-x0, y-y0), px[x,y] + (255,))
    cut.resize((cut.width*8, cut.height*8), Image.NEAREST).save(sys.argv[4], optimize=True)
