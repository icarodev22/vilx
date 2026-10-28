import { useEffect, useRef, useState } from 'react'
import { hasWebGL, isCoarsePointer, prefersReducedMotion } from '../lib/env'

const vertex = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`

// "Hyper-saturated fluid" à moda do VILX: tinta vermelha densa se movendo
// devagar sobre preto, com faixas quentes onde o fluxo se concentra.
const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uMouseAmt;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash2(i), f), dot(hash2(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
             mix(dot(hash2(i + vec2(0, 1)), f - vec2(0, 1)), dot(hash2(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.0; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 2.2;
  float t = uTime * 0.06;
  vec2 m = (uMouse - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 2.2;
  float md = exp(-dot(p - m, p - m) * 1.8) * uMouseAmt;

  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, -t)));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 1.4 + md), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 2.6 * r);

  float band = smoothstep(0.05, 0.55, f + 0.25 * length(q));
  float hot = pow(smoothstep(0.35, 0.75, f + 0.3 * r.x), 2.0);
  vec3 col = vec3(0.01, 0.003, 0.004);
  col = mix(col, vec3(0.42, 0.015, 0.01), band);
  col = mix(col, vec3(1.0, 0.13, 0.06), hot * 0.85);
  col += vec3(1.0, 0.45, 0.3) * pow(hot, 6.0) * 0.35;
  col += vec3(0.6, 0.05, 0.03) * md * 0.4;
  float vig = smoothstep(1.35, 0.2, length((uv - 0.5) * vec2(1.4, 1.0)));
  col *= 0.35 + 0.65 * vig;
  gl_FragColor = vec4(col, 1.0);
}`

/**
 * Fundo líquido da seção Contato. Renderiza em meia resolução (é um campo
 * suave, não precisa de mais), só enquanto a seção está na tela e com o
 * tempo congelado quando o visitante prefere menos movimento.
 */
export function FluidField({ className }: { className?: string }) {
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
        const renderer = new Renderer({ canvas, dpr: isCoarsePointer() ? 0.5 : 0.6, alpha: false })
        const gl = renderer.gl
        const program = new Program(gl, {
          vertex,
          fragment,
          uniforms: {
            uTime: { value: 8 },
            uRes: { value: [1, 1] },
            uMouse: { value: [0.5, 0.5] },
            uMouseAmt: { value: 0 },
          },
        })
        const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
        const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, amt: 0, tamt: 0 }
        let visible = false
        let raf = 0
        let last = performance.now()

        const resize = () => {
          const w = canvas.parentElement!.clientWidth
          const h = canvas.parentElement!.clientHeight
          renderer.setSize(w, h)
          program.uniforms.uRes.value = [w, h]
          if (!raf) renderer.render({ scene: mesh })
        }
        const frame = (now: number) => {
          raf = visible && !reduced ? requestAnimationFrame(frame) : 0
          const dt = Math.min(0.05, (now - last) / 1000)
          last = now
          if (!reduced) program.uniforms.uTime.value += dt
          const k = 1 - Math.exp(-dt * 3)
          mouse.x += (mouse.tx - mouse.x) * k
          mouse.y += (mouse.ty - mouse.y) * k
          mouse.amt += (mouse.tamt - mouse.amt) * k
          program.uniforms.uMouse.value = [mouse.x, mouse.y]
          program.uniforms.uMouseAmt.value = mouse.amt
          renderer.render({ scene: mesh })
        }
        const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1]
          visible = e.isIntersecting
          if (visible && !raf) {
            last = performance.now()
            raf = requestAnimationFrame(frame)
          }
        })
        io.observe(canvas)
        const onMove = (e: PointerEvent) => {
          const r = canvas.getBoundingClientRect()
          mouse.tx = (e.clientX - r.left) / r.width
          mouse.ty = 1 - (e.clientY - r.top) / r.height
          mouse.tamt = 1
        }
        const onLeave = () => (mouse.tamt = 0)
        const host = canvas.parentElement!
        host.addEventListener('pointermove', onMove, { passive: true })
        host.addEventListener('pointerleave', onLeave)
        const ro = new ResizeObserver(resize)
        ro.observe(canvas.parentElement!)
        const onLost = (e: Event) => {
          e.preventDefault()
          setOk(false)
        }
        canvas.addEventListener('webglcontextlost', onLost)
        resize()
        cleanup = () => {
          cancelAnimationFrame(raf)
          io.disconnect()
          ro.disconnect()
          host.removeEventListener('pointermove', onMove)
          host.removeEventListener('pointerleave', onLeave)
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
    <div className={`fluid ${ok ? '' : 'fluid--static'} ${className ?? ''}`} aria-hidden="true">
      {ok && <canvas ref={ref} />}
    </div>
  )
}
