import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import avatar from '../../assets/avatar-voxels.json'

/**
 * Cena da abertura.
 *
 * O avatar não é uma imagem plana girando: cada pixel da arte original vira
 * uma coluna 3D (voxel extrudado). A profundidade de cada coluna vem de um
 * mapa gerado a partir da própria arte (volume da cabeça pela silhueta,
 * óculos projetados à frente do rosto, cabelo numa camada própria). As cores
 * são as cores originais de cada pixel, então o rosto continua sendo o
 * desenho enviado, agora com volume, luz e sombra reais.
 */

type Voxel = [x: number, y: number, r: number, g: number, b: number, zFront: number, zBack: number, region: number]

export type AvatarSceneOptions = {
  canvas: HTMLCanvasElement
  reducedMotion: boolean
  lowPower: boolean
  onAssembled?: () => void
  onContextLost?: () => void
}

const DEPTH = 1.25 // multiplica o mapa de profundidade
const GAP = 0.965 // pequena fresta entre pixels: mantém a leitura de pixel art
const RED = new THREE.Color('#ff2a1f')

const BG_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// Fundo líquido: ruído com domain warping, preto e vermelho, bem contido.
const BG_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uPointer;
uniform float uFade;
uniform float uAspect;

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
  uv.x *= uAspect;
  float t = uTime * 0.045;
  vec2 q = vec2(fbm(uv * 2.2 + t), fbm(uv * 2.2 - t + 3.1));
  vec2 r = vec2(fbm(uv * 1.7 + q * 1.6 + uPointer * 0.15 + t * 1.3), fbm(uv * 1.7 + q * 1.4 - t));
  float f = fbm(uv * 1.5 + r * 1.8);
  float glow = exp(-dot(uv * vec2(1.0, 1.25), uv * vec2(1.0, 1.25)) * 3.2);
  float flow = smoothstep(0.42, 0.92, f) * (0.35 + 0.65 * glow);
  vec3 col = vec3(0.012, 0.004, 0.006);
  col += vec3(0.55, 0.02, 0.015) * flow;
  col += vec3(1.0, 0.16, 0.08) * pow(flow, 3.0) * 0.9;
  col += vec3(0.20, 0.0, 0.01) * glow * 0.55;
  float vig = smoothstep(1.15, 0.25, length(uv * vec2(0.85, 1.1)));
  col *= vig * uFade;
  gl_FragColor = vec4(col, 1.0);
}`

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3)
}

export class AvatarScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 1, 1200)
  private rig = new THREE.Group() // movimento de flutuação/rotação
  private head = new THREE.Group()
  private materials: THREE.MeshStandardMaterial[] = []
  private meshes: THREE.InstancedMesh[] = []
  private bg!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private rings: THREE.Mesh[] = []
  private key!: THREE.DirectionalLight
  private rimA!: THREE.PointLight
  private rimB!: THREE.PointLight
  private orbit!: THREE.PointLight
  private mirror = new THREE.Group()
  private clock = new THREE.Clock()
  private raf = 0
  private active = true
  private disposed = false

  private pointer = new THREE.Vector2()
  private pointerSmooth = new THREE.Vector2()
  private dragYaw = 0
  private dragVel = 0
  private progress = 0
  private assemble = 0
  private assembledFired = false
  private baseDist = 220
  private introDolly = 0
  private frameSamples: number[] = []
  private degraded = false

  constructor(private opts: AvatarSceneOptions) {
    const { canvas, lowPower } = opts
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !lowPower,
      powerPreference: 'high-performance',
      alpha: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 1.75))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setClearColor('#050203')

    canvas.addEventListener('webglcontextlost', this.handleContextLost, false)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.32
    pmrem.dispose()
    this.scene.fog = new THREE.Fog('#050203', 260, 640)

    this.buildBackground()
    this.buildAvatar()
    this.buildLights()
    this.buildFloor()

    this.rig.add(this.head)
    this.scene.add(this.rig)

    if (opts.reducedMotion) {
      // Sem montagem animada: o avatar já aparece formado.
      this.assemble = this.assembleEnd + 1
      this.introDolly = 1
      for (const m of this.materials) m.userData.uniforms.uAssemble.value = this.assemble
    }

    this.resize()
    this.loop()
  }

  // ---------------------------------------------------------------- build

  private buildBackground() {
    const mat = new THREE.ShaderMaterial({
      vertexShader: BG_VERT,
      fragmentShader: BG_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2() },
        uFade: { value: 1 },
        uAspect: { value: 1.6 },
      },
      depthWrite: false,
      fog: false,
    })
    this.bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat)
    this.bg.position.z = -260
    this.bg.renderOrder = -1
    this.scene.add(this.bg)

    // Dois anéis finos atrás da cabeça: referência discreta a vinil/caixa de som.
    const ringMat = new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.85, fog: false })
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(52, 0.22, 6, 220), ringMat)
    const ringB = new THREE.Mesh(
      new THREE.TorusGeometry(60, 0.08, 6, 220),
      new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.35, fog: false }),
    )
    ringA.position.set(0, 2, -42)
    ringB.position.set(0, 2, -58)
    this.rings = [ringA, ringB]
    this.scene.add(ringA, ringB)
  }

  private buildAvatar() {
    const voxels = avatar.v as unknown as Voxel[]
    const groups: Voxel[][] = [[], [], []]
    for (const v of voxels) groups[v[7]].push(v)

    // 0 pele, 1 cabelo, 2 lentes/armação
    const mats = [
      new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.0 }),
      new THREE.MeshStandardMaterial({ roughness: 0.48, metalness: 0.05 }),
      new THREE.MeshPhysicalMaterial({ roughness: 0.1, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.2 }),
    ]

    let maxDelay = 0
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    const lensCenter = new THREE.Vector2(0, 6)

    groups.forEach((list, region) => {
      const geo = new THREE.BoxGeometry(1, 1, 1)
      const delays = new Float32Array(list.length)
      const scatter = new Float32Array(list.length * 3)
      const mesh = new THREE.InstancedMesh(geo, mats[region], list.length)
      list.forEach((v, i) => {
        const [x, y, r, g, b, zf, zb] = v
        const front = zf * DEPTH
        const back = zb * DEPTH
        dummy.position.set(x, y, (front + back) / 2)
        dummy.scale.set(GAP, GAP, Math.max(1, front - back))
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace)
        mesh.setColorAt(i, color)

        // Ordem de montagem: os óculos primeiro, depois o resto em ondas.
        const d = Math.hypot(x - lensCenter.x, y - lensCenter.y) / 45
        const delay = 0.12 + d * 0.75 + Math.random() * 0.35 + (region === 2 ? -0.1 : 0)
        delays[i] = Math.max(0, delay)
        maxDelay = Math.max(maxDelay, delays[i])
        const a = Math.random() * Math.PI * 2
        const rad = 25 + Math.random() * 55
        scatter[i * 3] = Math.cos(a) * rad
        scatter[i * 3 + 1] = Math.sin(a) * rad * 0.7
        scatter[i * 3 + 2] = 60 + Math.random() * 110
      })
      geo.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delays, 1))
      geo.setAttribute('aScatter', new THREE.InstancedBufferAttribute(scatter, 3))
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.castShadow = false // liga depois que o rosto se forma
      mesh.receiveShadow = true
      mesh.frustumCulled = false
      this.patchMaterial(mats[region])
      this.meshes.push(mesh)
      this.head.add(mesh)
    })
    this.materials = mats
    this.assembleEnd = maxDelay + 0.6
    // centraliza o volume no eixo de rotação
    this.head.position.z = -2
    this.head.position.y = -1
  }

  private assembleEnd = 1.6

  private patchMaterial(mat: THREE.MeshStandardMaterial) {
    const uniforms = { uAssemble: { value: this.assemble } }
    mat.userData.uniforms = uniforms
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uAssemble = uniforms.uAssemble
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float aDelay;
          attribute vec3 aScatter;
          uniform float uAssemble;
          varying float vK;`,
        )
        .replace(
          '#include <project_vertex>',
          `vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
            float k = clamp( ( uAssemble - aDelay ) / 0.55, 0.0, 1.0 );
            k = 1.0 - pow( 1.0 - k, 3.0 );
            vec3 c = instanceMatrix[3].xyz;
            mvPosition.xyz = c + ( mvPosition.xyz - c ) * k + aScatter * ( 1.0 - k );
            vK = k;
          #else
            vK = 1.0;
          #endif
          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vK;')
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          totalEmissiveRadiance += vec3( 1.0, 0.07, 0.03 ) * smoothstep( 0.0, 0.25, vK ) * ( 1.0 - vK ) * 2.5;`,
        )
    }
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight('#3a1210', '#000000', 0.7))

    const key = new THREE.DirectionalLight('#ffeee2', 2.4)
    key.position.set(-45, 70, 110)
    key.castShadow = true
    key.shadow.mapSize.set(this.opts.lowPower ? 1024 : 2048, this.opts.lowPower ? 1024 : 2048)
    const sc = key.shadow.camera
    sc.left = -70
    sc.right = 70
    sc.top = 70
    sc.bottom = -70
    sc.near = 10
    sc.far = 400
    key.shadow.bias = -0.0008
    key.shadow.normalBias = 0.4
    key.shadow.radius = 6
    this.key = key
    this.scene.add(key)

    // Contraluz vermelho dos dois lados: recorta a silhueta.
    this.rimA = new THREE.PointLight(RED, 9, 0, 0)
    this.rimA.position.set(75, 25, -35)
    this.rimB = new THREE.PointLight('#ff1408', 6, 0, 0)
    this.rimB.position.set(-80, -10, -25)
    // Luz que orbita devagar: faz o brilho correr pelos óculos e pelo cabelo.
    this.orbit = new THREE.PointLight('#ff4a30', 3.2, 0, 0)
    this.scene.add(this.rimA, this.rimB, this.orbit)
  }

  private buildFloor() {
    const y = -50
    // Piso brilhante que se dissolve nas bordas: sem linha de horizonte.
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128)
    grad.addColorStop(0, '#ebebeb')
    grad.addColorStop(0.5, '#b4b4b4')
    grad.addColorStop(1, '#000000')
    g.fillStyle = grad
    g.fillRect(0, 0, 256, 256)
    const alpha = new THREE.CanvasTexture(c)
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(260, 64),
      new THREE.MeshStandardMaterial({
        color: '#0b0405',
        roughness: 0.32,
        metalness: 0.55,
        transparent: true,
        alphaMap: alpha,
        depthWrite: false,
      }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = y
    floor.receiveShadow = true
    floor.renderOrder = 1
    this.scene.add(floor)

    // Reflexo: uma cópia espelhada do avatar sob o piso translúcido.
    // Usa as mesmas instâncias (sem duplicar dados).
    for (const mesh of this.meshes) {
      const m = new THREE.InstancedMesh(mesh.geometry, mesh.material, mesh.count)
      m.instanceMatrix = mesh.instanceMatrix
      m.instanceColor = mesh.instanceColor
      m.frustumCulled = false
      this.mirror.add(m)
    }
    this.mirror.scale.y = -1
    this.mirror.visible = !this.opts.lowPower
    this.scene.add(this.mirror)
    this.floorY = y
  }

  private floorY = -50
  private frameY = 0

  // ---------------------------------------------------------------- api

  setPointer(x: number, y: number) {
    this.pointer.set(x, y)
  }

  /** Arrasto no toque: gira a cabeça e ela volta sozinha. */
  nudge(dx: number) {
    this.dragVel += dx * 0.004
  }

  setProgress(p: number) {
    this.progress = p
  }

  setActive(active: boolean) {
    if (active === this.active) return
    this.active = active
    if (active) {
      this.clock.getDelta()
      this.loop()
    } else {
      cancelAnimationFrame(this.raf)
    }
  }

  resize() {
    const canvas = this.renderer.domElement
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()

    // Enquadramento: o rosto ocupa a maior parte da tela sem cortar.
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))
    const portrait = w / h < 0.85
    const fracH = portrait ? 0.5 : 0.66
    const fracW = portrait ? 0.74 : 0.5
    const distH = 80 / fracH / (2 * tan)
    const distW = 66 / fracW / (2 * tan * this.camera.aspect)
    this.baseDist = Math.max(distH, distW)
    // empurra o rosto um pouco para cima: a assinatura fica abaixo dele
    this.frameY = -(portrait ? 0.16 : 0.1) * 2 * tan * this.baseDist

    const visH = 2 * tan * 520
    this.bg.scale.set(visH * this.camera.aspect * 1.4, visH * 1.4, 1)
    this.bg.material.uniforms.uAspect.value = this.camera.aspect
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost)
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else m?.dispose()
    })
    this.scene.environment?.dispose()
    this.renderer.dispose()
  }

  // ---------------------------------------------------------------- loop

  private handleContextLost = (e: Event) => {
    e.preventDefault()
    cancelAnimationFrame(this.raf)
    this.opts.onContextLost?.()
  }

  private loop = () => {
    if (this.disposed || !this.active) return
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 1 / 20)
    const t = this.clock.elapsedTime
    this.update(dt, t)
    this.renderer.render(this.scene, this.camera)
    this.watchPerformance(dt)
  }

  private update(dt: number, t: number) {
    const rm = this.opts.reducedMotion
    const damp = (k: number) => 1 - Math.exp(-dt * k)

    // Montagem dos voxels
    if (this.assemble < this.assembleEnd + 0.5) {
      this.assemble += dt
      for (const m of this.materials) m.userData.uniforms.uAssemble.value = this.assemble
    }
    if (!this.assembledFired && this.assemble > this.assembleEnd * 0.8) {
      this.assembledFired = true
      for (const mesh of this.meshes) mesh.castShadow = !this.degraded
      this.opts.onAssembled?.()
    }
    this.introDolly = Math.min(1, this.introDolly + dt / 3.2)
    const dolly = easeOutCubic(this.introDolly)

    this.pointerSmooth.lerp(this.pointer, damp(rm ? 1.5 : 3.2))
    const px = this.pointerSmooth.x
    const py = this.pointerSmooth.y

    // Arrasto (toque) com mola de volta ao centro
    this.dragYaw += this.dragVel
    this.dragVel *= Math.pow(0.86, dt * 60)
    this.dragYaw += (0 - this.dragYaw) * damp(1.6)
    this.dragYaw = THREE.MathUtils.clamp(this.dragYaw, -1.1, 1.1)

    const idleYaw = rm ? 0.18 : Math.sin(t * 0.28) * 0.42 + Math.sin(t * 0.11) * 0.12
    const yaw = (idleYaw + px * 0.5) * (0.3 + 0.7 * dolly) + this.dragYaw
    const pitch = (rm ? 0 : Math.sin(t * 0.37) * 0.05) - py * 0.18
    const roll = rm ? 0 : Math.sin(t * 0.5) * 0.035
    const floatY = rm ? 0 : Math.sin(t * 0.9) * 1.6 + Math.sin(t * 0.43) * 0.6

    const r = this.rig.rotation
    r.y += (yaw - r.y) * damp(2.4)
    r.x += (pitch - r.x) * damp(2.4)
    r.z += (roll - r.z) * damp(2)
    this.rig.position.y = floatY
    this.mirror.position.y = 2 * this.floorY - floatY
    this.mirror.rotation.set(-r.x, r.y, -r.z)
    this.mirror.children.forEach((c) => (c.position.copy(this.head.position)))

    // Câmera: aproximação de entrada + paralaxe + recuo ao rolar
    const p = this.progress
    const dist = this.baseDist * (1.35 - 0.35 * dolly) * (1 + p * 0.55)
    const camX = px * 6
    const camY = 4 - py * 4 + p * 26
    this.camera.position.x += (camX - this.camera.position.x) * damp(2)
    this.camera.position.y += (camY - this.camera.position.y) * damp(3)
    this.camera.position.z = dist
    this.camera.lookAt(0, this.frameY + p * 14, 0)

    // Luzes dinâmicas
    this.orbit.position.set(Math.cos(t * 0.45) * 90, 20 + Math.sin(t * 0.3) * 25, Math.sin(t * 0.45) * 70 + 30)
    this.rimA.intensity = 8.5 + Math.sin(t * 1.3) * 1.2
    this.key.position.x = -45 + px * 30
    this.key.position.y = 70 - py * 20

    for (const [i, ring] of this.rings.entries()) {
      ring.rotation.x = 0.35 + Math.sin(t * 0.2 + i) * 0.08 - py * 0.1
      ring.rotation.y = Math.sin(t * 0.17 + i * 2) * 0.25 + px * 0.15
      ring.position.y = 2 + floatY * 0.4
    }

    const bu = this.bg.material.uniforms
    bu.uTime.value = rm ? 12 : t
    bu.uPointer.value.set(px, py)
    bu.uFade.value = Math.min(1, t / 1.6) * (1 - p * 0.6)
  }

  /** Se o aparelho não sustentar a cena completa, corta o que é mais caro. */
  private watchPerformance(dt: number) {
    if (this.degraded || this.assemble < this.assembleEnd) return
    this.frameSamples.push(dt)
    if (this.frameSamples.length < 90) return
    const avg = this.frameSamples.reduce((a, b) => a + b, 0) / this.frameSamples.length
    this.frameSamples = []
    if (avg > 1 / 40) {
      this.degraded = true
      this.renderer.setPixelRatio(1)
      this.resize()
      this.key.castShadow = false
      for (const mesh of this.meshes) mesh.castShadow = false
      this.mirror.visible = false
    }
  }
}
