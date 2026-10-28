import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../lib/env'
import { spotifyEmbed, spotifyUrl, type Track } from '../../content'
import './ReleasePlayers.css'

/**
 * Players oficiais do Spotify (um por lançamento).
 *
 * Desktop: os três lado a lado. Celular/tablet: carrossel com um player por
 * vez e os vizinhos aparecendo nas bordas.
 *
 * O carrossel usa a rolagem nativa com scroll-snap: o deslize é o do próprio
 * sistema e funciona mesmo começando o gesto em cima do player (iframe), o
 * que um arrasto feito em JavaScript não conseguiria. O ciclo contínuo vem
 * da reordenação por CSS (`order`): o item visível fica sempre no meio, com
 * o anterior à esquerda e o próximo à direita. Os iframes nunca mudam de
 * lugar no DOM, então nunca recarregam e a música que estiver tocando
 * continua tocando.
 *
 * Não há avanço automático: o carrossel nunca troca de música sozinho.
 * Os controles de reprodução são os do próprio Spotify.
 */
export function ReleasePlayers({ tracks }: { tracks: Track[] }) {
  const n = tracks.length
  const stripRef = useRef<HTMLUListElement>(null)
  const [current, setCurrent] = useState(0)
  const currentRef = useRef(0)
  const [carousel, setCarousel] = useState(false)

  // Celular/tablet = carrossel; desktop = três colunas
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)')
    const on = () => setCarousel(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const mod = (a: number) => ((a % n) + n) % n
  // posição visual de cada item: anterior (0), atual (1), próximo (2)
  const slot = (i: number) => mod(i - current + 1)

  // Mantém o item atual centralizado no slot do meio, sem animação
  const recenter = () => {
    const strip = stripRef.current
    if (!strip) return
    const mid = strip.querySelector<HTMLElement>('[data-slot="1"]')
    if (!mid) return
    strip.scrollLeft = mid.offsetLeft - (strip.clientWidth - mid.offsetWidth) / 2
  }

  // antes da pintura: a reordenação e o recentramento acontecem no mesmo
  // quadro, sem nenhum salto visível
  useLayoutEffect(() => {
    currentRef.current = current
    if (carousel) recenter()
  }, [current, carousel])

  // Quando a rolagem assenta num vizinho, ele vira o atual (e tudo se reordena)
  useEffect(() => {
    const strip = stripRef.current
    if (!strip || !carousel) return
    let t = 0
    const settle = () => {
      const mid = strip.scrollLeft + strip.clientWidth / 2
      let best = 1
      let bd = Infinity
      strip.querySelectorAll<HTMLElement>('[data-slot]').forEach((el) => {
        const c = el.offsetLeft + el.offsetWidth / 2
        const d = Math.abs(c - mid)
        if (d < bd) {
          bd = d
          best = Number(el.dataset.slot)
        }
      })
      if (best !== 1) setCurrent((c) => mod(c + best - 1))
    }
    const onScroll = () => {
      clearTimeout(t)
      t = window.setTimeout(settle, 140)
    }
    const hasScrollEnd = 'onscrollend' in window
    if (hasScrollEnd) strip.addEventListener('scrollend', settle)
    else strip.addEventListener('scroll', onScroll, { passive: true })
    const onResize = () => recenter()
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      strip.removeEventListener('scrollend', settle)
      strip.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [carousel, n])

  // Navegação por botões, indicadores e teclado: rola até o vizinho;
  // ao assentar, o vizinho vira o atual.
  const go = (target: number) => {
    const strip = stripRef.current
    if (!strip || !carousel) return
    const t = mod(target)
    if (t === current) return
    const dir = mod(t - current) === 1 ? 2 : mod(current - t) === 1 ? 0 : null
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
    if (dir === null) {
      setCurrent(t)
      return
    }
    const el = strip.querySelector<HTMLElement>(`[data-slot="${dir}"]`)
    if (!el) return
    strip.scrollTo({ left: el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2, behavior })
    if (behavior === 'auto') setCurrent(t)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (!carousel) return
    if (e.key === 'ArrowRight') go(currentRef.current + 1)
    else if (e.key === 'ArrowLeft') go(currentRef.current - 1)
    else return
    e.preventDefault()
  }

  return (
    <div
      className={`players ${carousel ? 'players--carousel' : ''}`}
      role={carousel ? 'region' : undefined}
      aria-roledescription={carousel ? 'carrossel' : undefined}
      aria-label="Lançamentos do VILX no Spotify"
      onKeyDown={onKey}
    >
      <ul ref={stripRef} className="players__strip" tabIndex={carousel ? 0 : -1}>
        {tracks.map((t, i) => (
          <li
            key={t.id}
            className={`players__item ${carousel && i === current ? 'is-current' : ''}`}
            data-slot={carousel ? slot(i) : undefined}
            style={carousel ? { order: slot(i) } : undefined}
            aria-roledescription={carousel ? 'slide' : undefined}
            aria-label={`${i + 1} de ${n}: ${t.title}`}
          >
            <span className="players__n serif" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="players__frame">
              <iframe
                title={`Player do Spotify: ${t.title}, VILX`}
                src={spotifyEmbed(t)}
                width="100%"
                height="352"
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              />
            </div>
            <a className="players__open" href={spotifyUrl(t)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${t.title} no Spotify`}>
              Abrir no Spotify
            </a>
          </li>
        ))}
      </ul>

      {carousel && (
        <div className="players__nav">
          <button type="button" onClick={() => go(current - 1)} aria-label="Lançamento anterior">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
          <div className="players__dots" role="group" aria-label="Escolher lançamento">
            {tracks.map((t, i) => (
              <button
                key={t.id}
                type="button"
                className={i === current ? 'is-on' : ''}
                aria-label={`Lançamento ${i + 1}: ${t.title}`}
                aria-current={i === current ? 'true' : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button type="button" onClick={() => go(current + 1)} aria-label="Próximo lançamento">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
