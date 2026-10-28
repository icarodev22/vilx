import { useEffect } from 'react'
import { prefersReducedMotion } from '../lib/env'

/** Paralaxe discreta para elementos com [data-speed]. Só mexe no que está na tela. */
export function useParallax() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-speed]'))
    const visible = new Set<HTMLElement>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // observa a moldura (o elemento móvel pode estar recortado)
          const el = (e.target as HTMLElement).querySelector<HTMLElement>('[data-speed]') ?? (e.target as HTMLElement)
          if (e.isIntersecting) visible.add(el)
          else visible.delete(el)
        }
        schedule()
      },
      { rootMargin: '20% 0px' },
    )
    els.forEach((el) => io.observe(el.parentElement ?? el))
    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      visible.forEach((el) => {
        const r = el.parentElement!.getBoundingClientRect()
        const offset = (r.top + r.height / 2 - vh / 2) * Number(el.dataset.speed)
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`
      })
    }
    function schedule() {
      if (!raf) raf = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])
}
