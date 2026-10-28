import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl'

const vertex = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uVelocity;
uniform float uStrength;
uniform float uBend;
uniform float uViewportW;
varying vec2 vUv;
varying float vShade;

void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  float half_w = uViewportW * 0.5;
  float nx = world.x / half_w;
  float cx = modelMatrix[3].x / half_w;
  // Curvatura: cada foto se inclina como se a faixa fosse a parede interna
  // de um cilindro. O centro da foto fica no lugar, então a legenda em DOM
  // continua alinhada logo abaixo.
  world.z -= uBend * (nx * nx - cx * cx) * uViewportW * 0.14;
  // Arrasto líquido: o meio da foto "atrasa" em relação às bordas.
  float bow = sin(uv.y * 3.14159265);
  world.x -= bow * uVelocity * uStrength * 46.0;
  world.z -= sin(uv.x * 3.14159265) * abs(uVelocity) * uStrength * 70.0;
  vShade = clamp(1.0 - abs(cx) * 0.28, 0.55, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;
}`

const fragment = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform vec2 uImageSize;
uniform vec2 uPlaneSize;
uniform vec2 uMouse;
uniform float uHover;
uniform float uVelocity;
uniform float uStrength;
uniform float uRadius;
uniform float uAlpha;
uniform float uDim;
uniform float uTime;
varying vec2 vUv;
varying float vShade;

void main() {
  vec2 uv = vUv;
  float v = uVelocity * uStrength;

  // ondulação líquida, só existe enquanto há movimento
  uv.x += sin(uv.y * 8.0 + uTime * 2.2) * 0.014 * v;
  uv.y += sin(uv.x * 6.0 + uTime * 1.7) * 0.01 * abs(v);

  // lente discreta sob o cursor
  vec2 aspect = vec2(uPlaneSize.x / uPlaneSize.y, 1.0);
  vec2 d = uv - uMouse;
  float dist = length(d * aspect);
  float lens = smoothstep(0.42, 0.0, dist) * uHover * uStrength;
  uv -= d * lens * 0.16;

  // object-fit: cover
  float pr = uPlaneSize.x / uPlaneSize.y;
  float ir = uImageSize.x / uImageSize.y;
  vec2 s = pr > ir ? vec2(1.0, ir / pr) : vec2(pr / ir, 1.0);
  vec2 cuv = (uv - 0.5) * s + 0.5;

  float shift = 0.006 * v + lens * 0.004;
  vec3 col;
  col.r = texture2D(tMap, cuv + vec2(shift, 0.0)).r;
  col.g = texture2D(tMap, cuv).g;
  col.b = texture2D(tMap, cuv - vec2(shift, 0.0)).b;
  col *= vShade * mix(1.0, 0.55, uDim);

  // cantos arredondados (SDF)
  vec2 p = (vUv - 0.5) * uPlaneSize;
  vec2 q = abs(p) - (uPlaneSize * 0.5 - uRadius);
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
  float a = 1.0 - smoothstep(-0.75, 0.75, sd);
  gl_FragColor = vec4(col, a * uAlpha);
}`

export type GLLayerOptions = {
  canvas: HTMLCanvasElement
  images: HTMLImageElement[]
  radius: number
  strength: number
  bend: number
  /** textura pronta: peça um novo quadro */
  onReady: () => void
  /** foto desenhada em WebGL pela primeira vez: a versão em DOM pode sair */
  onShown: (index: number) => void
  onLost: () => void
}

export type RenderState = {
  offset: number
  layout: { x: number; y: number; w: number; h: number }[]
  velocity: number
  mouse: { x: number; y: number; inside: boolean }
  active: number
  dt: number
}

export type GLLayer = {
  resize: () => void
  render: (s: RenderState) => boolean
  dispose: () => void
}

export function createGLLayer(opts: GLLayerOptions): GLLayer {
  const { canvas, images } = opts
  const renderer = new Renderer({
    canvas,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
  })
  const gl = renderer.gl
  gl.clearColor(0, 0, 0, 0)
  const camera = new Camera(gl, { fov: 40, near: 1, far: 8000 })
  const scene = new Transform()
  const geometry = new Plane(gl, { widthSegments: 20, heightSegments: 10 })
  let width = 1
  let height = 1
  let time = 0

  const onLost = (e: Event) => {
    e.preventDefault()
    opts.onLost()
  }
  canvas.addEventListener('webglcontextlost', onLost)

  const planes = images.map((img) => {
    const texture = new Texture(gl, {
      generateMipmaps: renderer.isWebgl2,
      minFilter: renderer.isWebgl2 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
    })
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      uniforms: {
        tMap: { value: texture },
        uImageSize: { value: [img.naturalWidth || img.width || 1, img.naturalHeight || img.height || 1] },
        uPlaneSize: { value: [1, 1] },
        uMouse: { value: [0.5, 0.5] },
        uHover: { value: 0 },
        uVelocity: { value: 0 },
        uStrength: { value: opts.strength },
        uBend: { value: opts.bend },
        uViewportW: { value: 1 },
        uRadius: { value: opts.radius },
        uAlpha: { value: 0 },
        uDim: { value: 0 },
        uTime: { value: 0 },
      },
    })
    const mesh = new Mesh(gl, { geometry, program })
    mesh.setParent(scene)
    mesh.visible = false
    const plane = { mesh, program, texture, ready: false, shown: false, drawn: false, hover: 0, dim: 0 }

    const upload = () => {
      if (plane.ready || !img.naturalWidth) return
      texture.image = img
      program.uniforms.uImageSize.value = [img.naturalWidth, img.naturalHeight]
      plane.ready = true
      opts.onReady()
    }
    const decode = () => {
      if (img.decode) img.decode().then(upload, upload)
      else upload()
    }
    if (img.complete && img.naturalWidth) decode()
    else img.addEventListener('load', decode, { once: true })
    return plane
  })

  function resize() {
    // mede pelo contêiner: o OGL grava o tamanho como estilo inline no canvas
    const host = canvas.parentElement!
    width = host.clientWidth || 1
    height = host.clientHeight || 1
    renderer.setSize(width, height)
    camera.perspective({ aspect: width / height })
    // 1 unidade = 1 px no plano z = 0
    const fov = (camera.fov * Math.PI) / 180
    camera.position.z = height / 2 / Math.tan(fov / 2)
  }

  function render(s: RenderState) {
    time += s.dt
    let animating = false
    planes.forEach((p, i) => {
      const box = s.layout[i]
      p.drawn = false
      if (!box || !p.ready) {
        p.mesh.visible = false
        return
      }
      const x = box.x + s.offset
      // fora da tela: não desenha
      p.mesh.visible = x + box.w > -width * 0.2 && x < width * 1.2
      if (!p.mesh.visible) return

      const inside =
        s.mouse.inside && s.mouse.x > x && s.mouse.x < x + box.w && s.mouse.y > box.y && s.mouse.y < box.y + box.h
      const ease = (cur: number, to: number, k: number) => {
        const n = cur + (to - cur) * (1 - Math.exp(-s.dt * k))
        if (Math.abs(n - to) > 0.002) animating = true
        return Math.abs(n - to) < 0.002 ? to : n
      }
      p.hover = ease(p.hover, inside ? 1 : 0, 6)
      p.dim = ease(p.dim, i === s.active ? 0 : 1, 6)

      const u = p.program.uniforms
      if (inside) u.uMouse.value = [(s.mouse.x - x) / box.w, 1 - (s.mouse.y - box.y) / box.h]
      u.uHover.value = p.hover
      u.uDim.value = p.dim
      u.uAlpha.value = 1
      u.uVelocity.value = s.velocity
      u.uViewportW.value = width
      u.uPlaneSize.value = [box.w, box.h]
      u.uTime.value = time
      p.mesh.scale.set(box.w, box.h, 1)
      p.mesh.position.set(x + box.w / 2 - width / 2, height / 2 - (box.y + box.h / 2), 0)
      p.drawn = true
    })
    try {
      renderer.render({ scene, camera })
    } catch (err) {
      // Ex.: página aberta via file://, onde o navegador não deixa a foto
      // virar textura. O carrossel segue com as fotos em DOM.
      console.warn('[FlexCarousel] WebGL indisponível para estas imagens, usando fotos em DOM', err)
      opts.onLost()
      return false
    }
    // Só agora, com a foto já no canvas, a versão em DOM é escondida:
    // nenhum quadro fica sem imagem.
    planes.forEach((p, i) => {
      if (p.drawn && !p.shown) {
        p.shown = true
        opts.onShown(i)
      }
    })
    return animating
  }

  function dispose() {
    canvas.removeEventListener('webglcontextlost', onLost)
    planes.forEach((p) => {
      p.program.remove()
      gl.deleteTexture(p.texture.texture)
    })
    geometry.remove()
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  resize()
  return { resize, render, dispose }
}
