export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function isCoarsePointer() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

let webglCache: boolean | null = null

export function hasWebGL() {
  if (webglCache !== null) return webglCache
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    webglCache = !!gl
    ;(gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webglCache = false
  }
  return webglCache
}

/** Heurística simples de capacidade: usada para reduzir efeitos em aparelhos modestos. */
export function lowPowerDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency || 4
  const mem = nav.deviceMemory || 4
  return cores <= 4 || mem <= 2
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
