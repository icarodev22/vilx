import { useEffect, useRef, useState } from 'react'
import { hasWebGL, isCoarsePointer, prefersReducedMotion } from '../lib/env'

const vertex = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`

// A linguagem do fundo da abertura — tinta vermelha líquida sobre preto,
// com domain warping — virou o fundo do site inteiro. A luz principal muda
// de lugar conforme a rolagem e a intensidade cai fora da abertura, para
// manter o texto legível sem caixas opacas atrás do conteúdo.
const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uRes;
uniform float uScroll;   // 0..1 ao longo da página
uniform float uLevel;    // 1 na abertura, menor no conteúdo
uniform vec2 uPointer;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = vUv - 0.5;
  float aspect = uRes.x / uRes.y;
  uv.x *= aspect;
  float t = uTime * 0.04;
  // o campo também desliza com a rolagem: o fundo acompanha a página
  vec2 drift = vec2(0.0, uScroll * 2.4);
  vec2 q = vec2(fbm(uv * 2.0 + drift + t), fbm(uv * 2.0 + drift - t + 3.1));
  vec2 r = vec2(fbm(uv * 1.6 + q * 1.6 + uPointer * 0.12 + t * 1.3), fbm(uv * 1.6 + q * 1.4 - t));
  float f = fbm(uv * 1.4 + r * 1.8 + drift * 0.5);

  // a fonte de luz passeia pelas bordas conforme a seção
  float s = uScroll * 6.2831;
  vec2 lightPos = vec2(sin(s * 1.3) * 0.62 * aspect, cos(s * 0.9) * 0.28 - 0.05);
  float glow = exp(-dot(uv - lightPos, uv - lightPos) * 2.6);
  float heroGlow = exp(-dot(uv * vec2(1.0, 1.25), uv * vec2(1.0, 1.25)) * 3.2);
  glow = mix(glow, heroGlow, smoothstep(0.55, 1.0, uLevel));

  float flow = smoothstep(0.42, 0.92, f) * (0.3 + 0.7 * glow);
  vec3 col = vec3(0.027, 0.012, 0.016);
  col += vec3(0.55, 0.02, 0.015) * flow * uLevel;
  col += vec3(1.0, 0.16, 0.08) * pow(flow, 3.0) * 0.85 * uLevel * uLevel;
  col += vec3(0.2, 0.0, 0.01) * glow * 0.5 * uLevel;
  float vig = smoothstep(1.25, 0.2, length(uv * vec2(0.8, 1.1)));
  col *= mix(0.55, 1.0, vig);
  gl_FragColor = vec4(col, 1.0);
}`

/**
 * Fundo compartilhado do site: uma única camada fixa atrás de tudo.
 * Renderiza em baixa resolução (o campo é suave), a ~30 fps, só com a aba
 * visível; com movimento reduzido o tempo para e só a rolagem atualiza.
 * Sem WebGL, fica o gradiente estático do CSS (.ambient--static).
 */
export function AmbientBackground() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [ok, setOk] = useState(true)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !hasWebGL()) {
      setOk(false)
      return
    }
    let disposed = false
    let cleanup = () => {}
    import('ogl')
      .then(({ Renderer, Program, Mesh, Triangle }) => {
        if (disposed) return
        const reduced = prefersReducedMotion()
        const coarse = isCoarsePointer()
        const renderer = new Renderer({ canvas, dpr: coarse ? 0.35 : 0.5, alpha: false, antialias: false, depth: false })
        const gl = renderer.gl
        const program = new Program(gl, {
          vertex,
          fragment,
          depthTest: false,
          uniforms: {
            uTime: { value: 6 },
            uRes: { value: [1, 1] },
            uScroll: { value: 0 },
            uLevel: { value: 1 },
            uPointer: { value: [0, 0] },
          },
        })
        const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
        const u = program.uniforms

        const target = { scroll: 0, level: 1, px: 0, py: 0 }
        const cur = { ...target }
        let raf = 0
        let last = 0
        let acc = 0

        const readScroll = () => {
          const max = Math.max(1, document.documentElement.scrollHeight - innerHeight)
          target.scroll = scrollY / max
          // intensidade cheia na abertura, mais baixa no conteúdo (legibilidade)
          const h = innerHeight
          target.level = scrollY < h * 0.9 ? 1 : scrollY < h * 1.6 ? 1 - ((scrollY - h * 0.9) / (h * 0.7)) * 0.42 : 0.58
        }

        const draw = () => renderer.render({ scene: mesh })

        // Enquanto a abertura (canvas opaco) cobre a tela inteira, o fundo
        // não aparece: não há por que desenhá-lo. Volta ao rolar.
        const covered = () =>
          scrollY < innerHeight * 0.5 && !!document.querySelector('.intro--3d, .intro--fallback')

        const frame = (now: number) => {
          raf = 0
          if (covered()) {
            last = 0
            return
          }
          const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
          last = now
          const k = 1 - Math.exp(-dt * 3)
          cur.scroll += (target.scroll - cur.scroll) * k
          cur.level += (target.level - cur.level) * k
          cur.px += (target.px - cur.px) * k
          cur.py += (target.py - cur.py) * k
          if (!reduced) u.uTime.value += dt
          // ~30 fps: o fundo é lento, não precisa de 60
          acc += dt
          if (acc >= 1 / 32 || reduced) {
            acc = 0
            u.uScroll.value = cur.scroll
            u.uLevel.value = cur.level
            u.uPointer.value = [cur.px, cur.py]
            draw()
          }
          const settling = Math.abs(target.scroll - cur.scroll) + Math.abs(target.level - cur.level) > 0.0005
          if ((!reduced || settling) && document.visibilityState === 'visible') raf = requestAnimationFrame(frame)
          else last = 0
        }
        const kick = () => {
          if (!raf && document.visibilityState === 'visible') raf = requestAnimationFrame(frame)
        }

        const resize = () => {
          renderer.setSize(innerWidth, innerHeight)
          u.uRes.value = [innerWidth, innerHeight]
          draw()
        }
        const onScroll = () => {
          readScroll()
          kick()
        }
        const onPointer = (e: PointerEvent) => {
          if (e.pointerType !== 'mouse') return
          target.px = (e.clientX / innerWidth) * 2 - 1
          target.py = -((e.clientY / innerHeight) * 2 - 1)
          kick()
        }
        const onVis = () => (document.visibilityState === 'visible' ? kick() : (cancelAnimationFrame(raf), (raf = 0), (last = 0)))
        const onLost = (e: Event) => {
          e.preventDefault()
          setOk(false)
        }

        window.addEventListener('resize', resize)
        window.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('pointermove', onPointer, { passive: true })
        document.addEventListener('visibilitychange', onVis)
        canvas.addEventListener('webglcontextlost', onLost)
        readScroll()
        cur.scroll = target.scroll
        cur.level = target.level
        resize()
        kick()

        cleanup = () => {
          cancelAnimationFrame(raf)
          window.removeEventListener('resize', resize)
          window.removeEventListener('scroll', onScroll)
          window.removeEventListener('pointermove', onPointer)
          document.removeEventListener('visibilitychange', onVis)
          canvas.removeEventListener('webglcontextlost', onLost)
          gl.getExtension('WEBGL_lose_context')?.loseContext()
        }
      })
      .catch(() => setOk(false))
    return () => {
      disposed = true
      cleanup()
    }
  }, [])

  return (
    <div className={`ambient ${ok ? '' : 'ambient--static'}`} aria-hidden="true">
      {ok && <canvas ref={ref} />}
    </div>
  )
}
