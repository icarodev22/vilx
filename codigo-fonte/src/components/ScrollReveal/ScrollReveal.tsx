import { createElement, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { isCoarsePointer, prefersReducedMotion } from '../../lib/env'
import './ScrollReveal.css'

gsap.registerPlugin(ScrollTrigger)

export type ScrollRevealProps = {
  children: string
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span' | 'div' | 'strong'
  className?: string
  style?: CSSProperties
  id?: string
  /** scrub: acompanha a rolagem; once: revela uma vez ao entrar na tela */
  mode?: 'scrub' | 'once'
  splitBy?: 'words' | 'lines' | 'chars'
  /** fade: opacidade (+ deslocamento); rise: deslocamento maior, para títulos */
  effect?: 'fade' | 'rise'
  stagger?: number
  baseOpacity?: number
  enableBlur?: boolean
  blurStrength?: number
  baseRotation?: number
  baseOffset?: number
  /** suavização do scrub, em segundos (quanto a animação "persegue" a rolagem) */
  smoothing?: number
  /** duração de cada pedaço no modo once */
  duration?: number
  delay?: number
  start?: string
  end?: string
  /** palavras que recebem o acento editorial (classe sr-accent) */
  accent?: string[]
}

/**
 * ScrollReveal — revela texto palavra a palavra (ou por linha/letra)
 * conforme a rolagem, com GSAP + ScrollTrigger.
 *
 * O texto nunca começa escondido por CSS: só o GSAP aplica o estado inicial.
 * Se o script falhar, ou com movimento reduzido, o texto aparece normal.
 */
export function ScrollReveal({
  children,
  as = 'p',
  className,
  style,
  id,
  mode = 'scrub',
  splitBy = 'words',
  effect = 'fade',
  stagger = 0.035,
  baseOpacity = 0.12,
  enableBlur = true,
  blurStrength = 3,
  baseRotation = 0,
  baseOffset = 8,
  smoothing = 0.12,
  duration = 0.9,
  delay = 0,
  start,
  end,
  accent,
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null)

  const words = useMemo(() => children.split(/(\s+)/), [children])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const blur = enableBlur && !isCoarsePointer() ? blurStrength : 0
    const offset = effect === 'rise' ? Math.max(baseOffset, 24) : baseOffset

    let ctx: gsap.Context | null = null
    const build = () => {
      ctx?.revert()
      ctx = gsap.context(() => {
        const pieces = Array.from(el.querySelectorAll<HTMLElement>('[data-sr-piece]'))
        if (!pieces.length) return

        // Por linha: agrupa as palavras pela posição vertical depois do layout.
        let targets: HTMLElement[] | HTMLElement[][] = pieces
        if (splitBy === 'lines') {
          const lines = new Map<number, HTMLElement[]>()
          for (const p of pieces) {
            const top = Math.round(p.offsetTop)
            lines.set(top, [...(lines.get(top) ?? []), p])
          }
          targets = [...lines.values()]
        }

        const from: gsap.TweenVars = {
          opacity: baseOpacity,
          y: offset,
          rotate: baseRotation,
          ...(blur ? { filter: `blur(${blur}px)` } : {}),
        }
        const to: gsap.TweenVars = {
          opacity: 1,
          y: 0,
          rotate: 0,
          ...(blur ? { filter: 'blur(0px)' } : {}),
          ease: mode === 'scrub' ? 'none' : 'power3.out',
          stagger: splitBy === 'lines' ? stagger * 4 : stagger,
          duration: mode === 'scrub' ? 1 : duration,
          delay,
          scrollTrigger:
            mode === 'scrub'
              ? { trigger: el, start: start ?? 'top 88%', end: end ?? 'bottom 58%', scrub: smoothing > 0 ? smoothing : true }
              : { trigger: el, start: start ?? 'top 90%', once: true },
        }

        if (splitBy === 'lines') {
          const tl = gsap.timeline({ scrollTrigger: to.scrollTrigger as ScrollTrigger.Vars })
          ;(targets as HTMLElement[][]).forEach((line, i) => {
            tl.fromTo(line, from, { ...to, scrollTrigger: undefined, stagger: 0, delay: 0 }, i * (stagger * 4) + delay)
          })
        } else {
          gsap.fromTo(targets, from, to)
        }
      }, el)
    }

    build()

    // Por linha: recalcula quando a largura muda (as quebras mudam).
    let ro: ResizeObserver | null = null
    if (splitBy === 'lines' && 'ResizeObserver' in window) {
      let w = el.clientWidth
      let t = 0
      ro = new ResizeObserver(() => {
        if (Math.abs(el.clientWidth - w) < 2) return
        w = el.clientWidth
        clearTimeout(t)
        t = window.setTimeout(build, 150)
      })
      ro.observe(el)
    }

    return () => {
      ro?.disconnect()
      ctx?.revert()
    }
  }, [children, mode, splitBy, effect, stagger, baseOpacity, enableBlur, blurStrength, baseRotation, baseOffset, smoothing, duration, delay, start, end])

  const content =
    splitBy === 'chars' ? (
      <>
        <span className="sr-only">{children}</span>
        <span aria-hidden="true">
          {words.map((w, i) =>
            /^\s+$/.test(w) ? (
              w
            ) : (
              <span key={i} className="sr-word">
                {Array.from(w).map((c, j) => (
                  <span key={j} data-sr-piece className="sr-piece">
                    {c}
                  </span>
                ))}
              </span>
            ),
          )}
        </span>
      </>
    ) : (
      words.map((w, i) =>
        /^\s+$/.test(w) ? (
          w
        ) : (
          <span key={i} data-sr-piece className={`sr-piece${accent?.includes(w.replace(/[.,;:!?]$/, '')) ? ' sr-accent' : ''}`}>
            {w}
          </span>
        ),
      )
    )

  return createElement(as, { ref, id, className: `scroll-reveal ${className ?? ''}`, style }, content)
}
