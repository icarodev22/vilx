import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../../lib/env'
import './LogoMarquee.css'

export type MarqueeLogo = {
  src: string
  alt: string
  w: number
  h: number
  /** ajuste óptico de tamanho (1 = altura base) */
  scale?: number
}

type Props = {
  logos: MarqueeLogo[]
  label: string
  /** velocidade em px/s (positivo = para a direita) */
  speed?: number
}

/**
 * Faixa de logos em loop contínuo, sem clones.
 *
 * Cada logo é reposicionado sozinho em módulo do comprimento da faixa e só
 * reaparece do outro lado depois de sair inteiro da tela: nenhum logo é
 * duplicado na tela nem no DOM. Se a tela for larga demais para os logos
 * cobrirem, o espaçamento cresce em vez de repetir logos.
 *
 * Pausa com o mouse em cima, com foco, fora da tela e com a aba oculta.
 * Com movimento reduzido vira uma composição estática centralizada.
 */
export function LogoMarquee({ logos, label, speed = 38 }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const root = rootRef.current!
    const track = trackRef.current!
    if (prefersReducedMotion()) {
      root.classList.add('is-static')
      return
    }
    const items = Array.from(track.children) as HTMLElement[]
    const n = items.length
    let L: number[] = []
    let W: number[] = []
    let total = 1
    let lo = 0
    let offset = 0
    let raf = 0
    let last = 0
    let visible = false
    let paused = false

    const measure = () => {
      // espaçamento base do CSS; cresce se a tela for larga demais
      track.style.removeProperty('gap')
      const vpW = root.clientWidth
      const base = parseFloat(getComputedStyle(track).columnGap) || 0
      W = items.map((el) => el.offsetWidth)
      const sum = W.reduce((a, b) => a + b, 0)
      const maxW = Math.max(...W)
      // para nunca abrir buraco: soma + gap·n >= tela + maior logo + gap
      const gap = n > 1 ? Math.max(base, (vpW + maxW - sum) / (n - 1) + 1) : base
      track.style.gap = `${gap}px`
      L = items.map((el) => el.offsetLeft)
      total = sum + gap * n
      lo = -(maxW + gap)
      render()
    }

    const mod = (a: number, m: number) => ((a % m) + m) % m
    const render = () => {
      for (let i = 0; i < n; i++) {
        const x = mod(L[i] + offset - lo, total) + lo
        items[i].style.transform = `translate3d(${(x - L[i]).toFixed(2)}px,0,0)`
      }
    }

    const tick = (now: number) => {
      raf = 0
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
      last = now
      offset += speed * dt
      render()
      schedule()
    }
    const schedule = () => {
      if (!raf && visible && !paused && document.visibilityState === 'visible') raf = requestAnimationFrame(tick)
      if (!raf) last = 0
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
      last = 0
    }

    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1]
      visible = e.isIntersecting
      if (visible) schedule()
      else stop()
    })
    io.observe(root)

    const pause = () => {
      paused = true
      stop()
    }
    const resume = () => {
      paused = false
      schedule()
    }
    const onVis = () => (document.visibilityState === 'visible' ? schedule() : stop())
    const onPointerEnter = (e: PointerEvent) => e.pointerType === 'mouse' && pause()

    root.addEventListener('pointerenter', onPointerEnter)
    root.addEventListener('pointerleave', resume)
    root.addEventListener('focusin', pause)
    root.addEventListener('focusout', resume)
    document.addEventListener('visibilitychange', onVis)
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    items.forEach((el) => {
      const img = el.querySelector('img')
      if (img && !img.complete) img.addEventListener('load', measure, { once: true })
    })
    measure()

    return () => {
      stop()
      io.disconnect()
      ro.disconnect()
      root.removeEventListener('pointerenter', onPointerEnter)
      root.removeEventListener('pointerleave', resume)
      root.removeEventListener('focusin', pause)
      root.removeEventListener('focusout', resume)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [logos, speed])

  return (
    <div ref={rootRef} className="logo-marquee">
      <ul ref={trackRef} className="logo-marquee__track" aria-label={label}>
        {logos.map((l) => (
          <li key={l.alt} className="logo-marquee__item" style={{ ['--s' as string]: l.scale ?? 1 }}>
            <img src={l.src} alt={l.alt} width={l.w} height={l.h} decoding="async" draggable={false} />
          </li>
        ))}
      </ul>
    </div>
  )
}
