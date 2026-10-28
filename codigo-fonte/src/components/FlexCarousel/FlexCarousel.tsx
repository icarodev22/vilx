import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { clamp, hasWebGL, prefersReducedMotion } from '../../lib/env'
import './FlexCarousel.css'

export type FlexCarouselItem = {
  id: string
  src: string
  srcSet?: string
  width: number
  height: number
  alt: string
  /** Legenda exibida abaixo da foto. `null` = sem legenda de evento. */
  caption: string | null
  /** enquadramento (object-position) */
  pos?: string
}

export type FlexCarouselProps = {
  items: FlexCarouselItem[]
  label: string
  /** Intensidade da distorção líquida (0 a 1). */
  distortion?: number
  /** Curvatura de profundidade da faixa (0 a 1). */
  bend?: number
  /** Raio dos cantos, em px. */
  radius?: number
  /** Texto usado quando a foto não tem legenda confirmada. */
  fallbackCaption?: string
  /** Avanço automático, em ms (0 desliga). Pausa com interação. */
  autoplay?: number
}

/**
 * FlexCarousel (loop contínuo)
 *
 * A faixa em DOM é a fonte da verdade: layout, legendas, teclado e leitores de
 * tela funcionam sem WebGL. Por cima, um canvas OGL redesenha cada foto com
 * curvatura de profundidade, distorção líquida proporcional à velocidade e
 * uma lente sob o cursor.
 *
 * Loop sem clones: cada foto é reposicionada individualmente em módulo do
 * comprimento total da faixa. Uma foto só "dá a volta" quando já saiu
 * inteira da tela, então não há salto nem espaço vazio na emenda, e nenhuma
 * foto aparece duas vezes nem existe em duplicata para o leitor de tela.
 */
export function FlexCarousel({
  items,
  label,
  distortion = 0.5,
  bend = 0.5,
  radius = 16,
  fallbackCaption = 'Ao vivo',
  autoplay = 5200,
}: FlexCarouselProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLUListElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stepRef = useRef<(d: number) => void>(() => {})
  const [index, setIndex] = useState(0)
  const [near, setNear] = useState(false)
  const [gl, setGl] = useState(false)
  const uid = useId()
  const n = items.length

  // Só baixa as fotos quando a seção se aproxima da tela.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setNear(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1]
        if (e.isIntersecting) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: '1200px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!near) return
    const root = rootRef.current!
    const viewport = viewportRef.current!
    const track = trackRef.current!
    const canvas = canvasRef.current!
    const reduced = prefersReducedMotion()
    const strength = reduced ? 0 : distortion

    const itemEls = Array.from(track.querySelectorAll<HTMLElement>('[data-flex-item]'))
    const frames = itemEls.map((el) => el.querySelector<HTMLElement>('[data-flex-frame]')!)
    const imgs = itemEls.map((el) => el.querySelector<HTMLImageElement>('img')!)

    // ---- geometria (medida sem transformações: offsetLeft ignora transform)
    let vpW = 0
    let total = 1
    let lo = 0
    let L: number[] = []
    let W: number[] = []
    let Y: number[] = []
    let H: number[] = []

    const measure = () => {
      vpW = viewport.clientWidth
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0
      L = itemEls.map((el) => el.offsetLeft)
      W = frames.map((f) => f.offsetWidth)
      H = frames.map((f) => f.offsetHeight)
      const vpTop = viewport.getBoundingClientRect().top
      Y = frames.map((f) => f.getBoundingClientRect().top - vpTop)
      total = Math.max(1, L[n - 1] + W[n - 1] + gap - L[0])
      // faixa de posições válidas: a foto só reaparece do outro lado quando
      // já está inteira fora da tela
      lo = -(Math.max(...W) + gap)
      glLayer?.resize()
      dirty = true
      render()
    }

    const mod = (a: number, m: number) => ((a % m) + m) % m
    const wrapX = (i: number, off: number) => mod(L[i] + off - lo, total) + lo
    const centerAt = (i: number, off: number) => wrapX(i, off) + W[i] / 2

    const nearestAt = (off: number) => {
      let best = 0
      let bd = Infinity
      for (let i = 0; i < n; i++) {
        const d = Math.abs(centerAt(i, off) - vpW / 2)
        if (d < bd) {
          bd = d
          best = i
        }
      }
      return best
    }

    // ---- estado de movimento
    let current = 0
    let target = 0
    let ease = 11
    let velocity = 0
    let visible = false
    let raf = 0
    let last = performance.now()
    let activeIndex = 0
    let dirty = true
    let disposed = false

    const centerOn = (i: number, from = target) => from + (vpW / 2 - centerAt(i, from))

    const goTo = (i: number, soft = false) => {
      target = centerOn(mod(i, n))
      ease = soft ? 3.4 : 9
      if (reduced) current = target
      dirty = true
      kick()
    }
    stepRef.current = (d) => {
      touch()
      goTo(activeIndex + d)
    }

    // ---- interação e avanço automático
    let lastInteraction = 0
    let hovering = false
    const touch = () => (lastInteraction = performance.now())

    const autoTimer = window.setInterval(() => {
      if (!autoplay || reduced || !visible || dragging || hovering) return
      if (document.visibilityState !== 'visible') return
      if (root.contains(document.activeElement)) return
      if (performance.now() - lastInteraction < autoplay * 1.4) return
      goTo(activeIndex + 1, true)
    }, autoplay || 1e9)

    // ---- arrasto (mouse e toque)
    let dragging = false
    let pointerId = -1
    let startX = 0
    let startY = 0
    let startOff = 0
    let lastMoveX = 0
    let lastMoveT = 0
    let dragVel = 0
    let axis: 'x' | 'y' | null = null
    let moved = false

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      touch()
      dragging = true
      pointerId = e.pointerId
      startX = lastMoveX = e.clientX
      startY = e.clientY
      startOff = target = current
      lastMoveT = performance.now()
      dragVel = 0
      axis = e.pointerType === 'mouse' ? 'x' : null
      moved = false
      if (axis === 'x') viewport.setPointerCapture(pointerId)
      root.classList.add('is-dragging')
    }

    const onMove = (e: PointerEvent) => {
      updateMouse(e)
      if (!dragging || e.pointerId !== pointerId) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (!axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
        if (axis === 'y') {
          // gesto vertical: devolve para a rolagem da página
          dragging = false
          root.classList.remove('is-dragging')
          return
        }
        viewport.setPointerCapture(pointerId)
      }
      if (Math.abs(dx) > 4) moved = true
      const now = performance.now()
      const dt = Math.max(1, now - lastMoveT)
      dragVel = dragVel * 0.6 + ((e.clientX - lastMoveX) / dt) * 0.4
      lastMoveX = e.clientX
      lastMoveT = now
      // resposta 1:1 ao dedo, sem atraso
      target = current = startOff + dx
      touch()
      dirty = true
      kick()
    }

    const onUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return
      dragging = false
      root.classList.remove('is-dragging')
      if (viewport.hasPointerCapture(pointerId)) viewport.releasePointerCapture(pointerId)
      // inércia curta: projeta ~180ms à frente e encaixa na foto mais próxima
      const projected = current + clamp(dragVel, -4, 4) * 180
      target = projected
      goTo(nearestAt(projected))
      touch()
    }

    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault()
        e.stopPropagation()
        moved = false
      }
    }

    let wheelTimer = 0
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      touch()
      target -= e.deltaX
      ease = 11
      dirty = true
      kick()
      clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => goTo(nearestAt(target)), 140)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(activeIndex + 1)
      else if (e.key === 'ArrowLeft') goTo(activeIndex - 1)
      else if (e.key === 'Home') goTo(0)
      else if (e.key === 'End') goTo(n - 1)
      else return
      touch()
      e.preventDefault()
    }

    // ---- lente sob o cursor
    const mouse = { x: 0, y: 0, inside: false }
    function updateMouse(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
      mouse.inside = true
      dirty = true
      kick()
    }
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') hovering = true
    }
    const onLeave = () => {
      hovering = false
      mouse.inside = false
      dirty = true
      kick()
    }

    viewport.addEventListener('pointerdown', onDown)
    viewport.addEventListener('pointermove', onMove)
    viewport.addEventListener('pointerup', onUp)
    viewport.addEventListener('pointercancel', onUp)
    viewport.addEventListener('pointerenter', onEnter)
    viewport.addEventListener('pointerleave', onLeave)
    viewport.addEventListener('click', onClick, true)
    viewport.addEventListener('wheel', onWheel, { passive: false })
    root.addEventListener('keydown', onKey)

    // ---- camada WebGL (opcional)
    let glLayer: GLLayer | null = null
    const glFailed = () => {
      glLayer?.dispose()
      glLayer = null
      root.classList.remove('is-gl')
      itemEls.forEach((el) => el.classList.remove('has-tex'))
      setGl(false)
    }
    if (hasWebGL()) {
      import('./glLayer')
        .then(({ createGLLayer }) => {
          if (disposed) return
          glLayer = createGLLayer({
            canvas,
            images: imgs,
            radius,
            strength,
            bend: reduced ? bend * 0.6 : bend,
            onReady: () => {
              dirty = true
              kick()
            },
            onShown: (i) => itemEls[i].classList.add('has-tex'),
            onLost: glFailed,
          })
          root.classList.add('is-gl')
          setGl(true)
          measure()
          kick()
        })
        .catch(glFailed)
    }

    // ---- desenho: posiciona cada foto (DOM + WebGL) para o deslocamento atual
    const layout: { x: number; y: number; w: number; h: number }[] = []
    let animating = false
    function render(dt = 0) {
      for (let i = 0; i < n; i++) {
        const x = wrapX(i, current)
        itemEls[i].style.transform = `translate3d(${(x - L[i]).toFixed(2)}px,0,0)`
        layout[i] = { x, y: Y[i], w: W[i], h: H[i] }
      }
      const idx = nearestAt(current)
      if (idx !== activeIndex) {
        activeIndex = idx
        setIndex(idx)
      }
      animating = glLayer ? glLayer.render({ offset: 0, layout, velocity, mouse, active: activeIndex, dt }) : false
    }

    // ---- loop: só roda enquanto há movimento e a seção está visível
    function kick() {
      if (!raf && visible && !disposed) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }

    function tick(now: number) {
      raf = 0
      const dt = Math.min(64, now - last) / 1000
      last = now
      const prev = current
      if (!dragging) {
        const k = reduced ? 1 : 1 - Math.exp(-dt * ease)
        current += (target - current) * k
        if (Math.abs(target - current) < 0.05) current = target
      }
      const frameVel = (current - prev) / Math.max(dt * 60, 0.001) // px por frame a 60fps
      velocity += (clamp(frameVel / 60, -1, 1) - velocity) * (1 - Math.exp(-dt * 10))
      if (Math.abs(velocity) < 0.0005) velocity = 0

      render(dt)

      const moving = current !== target || dragging || velocity !== 0
      if (moving || animating || dirty) {
        dirty = false
        if (moving || animating) raf = requestAnimationFrame(tick)
      }
    }

    const vio = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1]
      visible = e.isIntersecting
      if (visible) {
        dirty = true
        kick()
      } else if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    })
    vio.observe(root)

    const ro = new ResizeObserver(() => {
      measure()
      target = current = centerOn(activeIndex, current)
      render()
    })
    ro.observe(viewport)
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', measure, { once: true })
    })
    measure()
    target = current = centerOn(0, 0)
    render()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      clearTimeout(wheelTimer)
      clearInterval(autoTimer)
      vio.disconnect()
      ro.disconnect()
      viewport.removeEventListener('pointerdown', onDown)
      viewport.removeEventListener('pointermove', onMove)
      viewport.removeEventListener('pointerup', onUp)
      viewport.removeEventListener('pointercancel', onUp)
      viewport.removeEventListener('pointerenter', onEnter)
      viewport.removeEventListener('pointerleave', onLeave)
      viewport.removeEventListener('click', onClick, true)
      viewport.removeEventListener('wheel', onWheel)
      root.removeEventListener('keydown', onKey)
      glLayer?.dispose()
    }
  }, [near, items, n, distortion, bend, radius, autoplay])

  const go = useCallback((d: number) => stepRef.current(d), [])
  const current = items[index]

  return (
    <div
      ref={rootRef}
      className={`flex-carousel ${gl ? 'is-gl' : ''}`}
      role="region"
      aria-roledescription="carrossel"
      aria-label={label}
      tabIndex={0}
    >
      <div ref={viewportRef} className="flex-carousel__viewport">
        <canvas ref={canvasRef} className="flex-carousel__gl" aria-hidden="true" />
        <ul ref={trackRef} className="flex-carousel__track" id={`${uid}-track`}>
          {items.map((it, i) => (
            <li
              key={it.id}
              data-flex-item
              className={`flex-carousel__item ${i === index ? 'is-active' : ''}`}
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${n}`}
              aria-current={i === index ? 'true' : undefined}
            >
              <figure>
                <div data-flex-frame className="flex-carousel__frame" style={{ aspectRatio: `${it.width} / ${it.height}` }}>
                  <img
                    src={near ? it.src : undefined}
                    srcSet={near ? it.srcSet : undefined}
                    sizes="(max-width: 720px) 80vw, 46vw"
                    width={it.width}
                    height={it.height}
                    alt={it.alt}
                    draggable={false}
                    decoding="async"
                    style={{ objectPosition: it.pos }}
                  />
                </div>
                <figcaption>
                  <span className="flex-carousel__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className={it.caption ? 'flex-carousel__cap' : 'flex-carousel__cap is-muted'}>{it.caption ?? fallbackCaption}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-carousel__controls">
        <button type="button" onClick={() => go(-1)} aria-controls={`${uid}-track`} aria-label="Foto anterior">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </button>
        <p className="flex-carousel__status" aria-live="polite">
          <span className="flex-carousel__count">
            {String(index + 1).padStart(2, '0')}
            <span className="flex-carousel__of"> / {String(n).padStart(2, '0')}</span>
          </span>
          <span className="flex-carousel__now">{current?.caption ?? fallbackCaption}</span>
        </p>
        <button type="button" onClick={() => go(1)} aria-controls={`${uid}-track`} aria-label="Próxima foto">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

type GLLayer = import('./glLayer').GLLayer
