import { useEffect, useRef, useState } from 'react'
import avatarUrl from '../../assets/vilx-avatar-cutout.png'
import { artist } from '../../content'
import { clamp, hasWebGL, isCoarsePointer, lowPowerDevice, prefersReducedMotion } from '../../lib/env'
import type { AvatarScene } from './AvatarScene'
import './intro.css'

type Mode = 'loading' | '3d' | 'fallback'

/**
 * Abertura em tela cheia. Não é um banner: é um palco fixo (sticky) que
 * acompanha a rolagem. A cena 3D é carregada sob demanda; enquanto isso, ou
 * se o aparelho não tiver WebGL, entra uma versão 2D elegante do avatar.
 */
export function Intro() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<AvatarScene | null>(null)
  const [mode, setMode] = useState<Mode>('loading')
  const [signed, setSigned] = useState(false)

  // Carrega a cena 3D
  useEffect(() => {
    if (!hasWebGL()) {
      setMode('fallback')
      return
    }
    let cancelled = false
    const toFallback = () => {
      sceneRef.current?.dispose()
      sceneRef.current = null
      if (!cancelled) setMode('fallback')
    }
    import('./AvatarScene')
      .then(({ AvatarScene }) => {
        if (cancelled || !canvasRef.current) return
        try {
          sceneRef.current = new AvatarScene({
            canvas: canvasRef.current,
            reducedMotion: prefersReducedMotion(),
            lowPower: isCoarsePointer() || lowPowerDevice(),
            onAssembled: () => setSigned(true),
            onContextLost: toFallback,
          })
          setMode('3d')
        } catch (err) {
          console.warn('[intro] cena 3D indisponível, usando versão 2D', err)
          toFallback()
        }
      })
      .catch(toFallback)
    return () => {
      cancelled = true
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [])

  // A assinatura aparece mesmo que a cena demore ou falhe.
  useEffect(() => {
    if (mode === 'fallback') {
      const id = window.setTimeout(() => setSigned(true), 500)
      return () => clearTimeout(id)
    }
    const id = window.setTimeout(() => setSigned(true), 4000)
    return () => clearTimeout(id)
  }, [mode])

  // Rolagem, ponteiro, toque e redimensionamento
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect()
        const span = rect.height - window.innerHeight
        const p = clamp(span > 0 ? -rect.top / span : 0)
        section.style.setProperty('--p', p.toFixed(4))
        sceneRef.current?.setProgress(p)
        sceneRef.current?.setActive(rect.bottom > 0)
      })
    }
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      sceneRef.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1))
    }
    let lastX: number | null = null
    let lastY = 0
    const onTouchStart = (e: TouchEvent) => {
      lastX = e.touches[0].clientX
      lastY = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      if (lastX === null) return
      const t = e.touches[0]
      const dx = t.clientX - lastX
      const dy = t.clientY - lastY
      // Só gira com gesto horizontal; o vertical continua rolando a página.
      if (Math.abs(dx) > Math.abs(dy)) sceneRef.current?.nudge(dx)
      sceneRef.current?.setPointer(clamp((t.clientX / window.innerWidth) * 2 - 1, -1, 1) * 0.6, 0)
      lastX = t.clientX
      lastY = t.clientY
    }
    const onTouchEnd = () => {
      lastX = null
      sceneRef.current?.setPointer(0, 0)
    }
    const onResize = () => {
      sceneRef.current?.resize()
      onScroll()
    }
    const onLeave = () => sceneRef.current?.setPointer(0, 0)

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    section.addEventListener('touchstart', onTouchStart, { passive: true })
    section.addEventListener('touchmove', onTouchMove, { passive: true })
    section.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      section.removeEventListener('touchstart', onTouchStart)
      section.removeEventListener('touchmove', onTouchMove)
      section.removeEventListener('touchend', onTouchEnd)
    }
  }, [mode])

  const [first, ...rest] = artist.tagline.split(' ')

  return (
    <section ref={sectionRef} className={`intro intro--${mode}`} aria-label="Abertura: avatar do VILX">
      <div className="intro__stage">
        <canvas
          ref={canvasRef}
          className="intro__canvas"
          role="img"
          aria-label="Avatar pixelado do VILX em 3D: cabelo loiro descolorido, óculos escuros e bigode, flutuando em um palco escuro com luz vermelha"
        />

        {mode === 'fallback' && (
          <div className="intro__fallback" aria-hidden="true">
            <div className="intro__fallback-glow" />
            <img src={avatarUrl} alt="" className="intro__fallback-img" width={432} height={512} />
            <div className="intro__fallback-floor" />
          </div>
        )}

        <div className="intro__loader" aria-hidden={mode !== 'loading'}>
          <span />
        </div>

        <div className="intro__meta" aria-hidden="true">
          <span>{artist.realName}</span>
          <span>{artist.origin}</span>
        </div>

        <h1 className={`intro__sign ${signed ? 'is-on' : ''}`}>
          <span className="intro__sign-row">
            <span className="intro__sign-red">{first}</span>
            {rest.map((w, i) => (
              <span key={w}>
                {' '}
                <span className="intro__sign-word serif" style={{ transitionDelay: `${0.18 + i * 0.12}s` }}>
                  {w.toLowerCase()}
                </span>
              </span>
            ))}
          </span>
        </h1>

        <a className="intro__cue" href="#historia">
          <span>Role</span>
          <i aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}
