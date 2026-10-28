import { useEffect } from 'react'

/**
 * Revela elementos com [data-reveal] quando entram na tela.
 * O conteúdo nunca fica escondido para sempre: sem IntersectionObserver,
 * ou se algo falhar, tudo é revelado depois de um tempo de segurança.
 */
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const show = (el: Element) => el.classList.add('is-in')
    if (!('IntersectionObserver' in window)) {
      els.forEach(show)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show(e.target)
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    els.forEach((el) => io.observe(el))

    // Rede de segurança: se o observer falhar por qualquer motivo, tudo que
    // já está na tela (ou acima dela) é revelado assim mesmo.
    let pending = 0
    const sweep = () => {
      pending = 0
      const vh = window.innerHeight
      els.forEach((el) => {
        if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < vh * 0.95) show(el)
      })
    }
    const onScroll = () => {
      if (!pending) pending = window.setTimeout(sweep, 400)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    const failsafe = window.setTimeout(sweep, 2500)
    return () => {
      io.disconnect()
      clearTimeout(failsafe)
      clearTimeout(pending)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
}
