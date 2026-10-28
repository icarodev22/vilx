import { useEffect, useRef, useState } from 'react'
import { links } from '../content'
import { Arrow } from './Arrow'
import logoBranco from '../assets/brand/logo-branco.png'
import './nav.css'

const items = [
  { id: 'historia', label: 'História' },
  { id: 'lancamentos', label: 'Lançamentos' },
  { id: 'shows', label: 'Shows' },
  { id: 'contato', label: 'Contato' },
]

export function Nav() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [solid, setSolid] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.9)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    items.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => {
      window.removeEventListener('scroll', onScroll)
      io.disconnect()
    }
  }, [])

  // Gaveta aberta: trava a rolagem, Esc fecha, foco fica dentro dela.
  useEffect(() => {
    const drawer = drawerRef.current
    if (!open || !drawer) return
    const focusables = () => Array.from(drawer.querySelectorAll<HTMLElement>('a, button'))
    const t = window.setTimeout(() => focusables()[0]?.focus(), 80)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
      if (e.key === 'Tab') {
        const f = focusables()
        if (!f.length) return
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault()
          f[f.length - 1].focus()
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault()
          f[0].focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = ''
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <header className={`nav ${solid ? 'nav--solid' : ''} ${open ? 'nav--menu' : ''}`}>
        <a href="#top" className="nav__logo" aria-label="VILX, voltar ao início">
          <img src={logoBranco} alt="" width={360} height={192} />
        </a>

        <nav className="nav__links" aria-label="Seções">
          {items.map((it) => (
            <a key={it.id} href={`#${it.id}`} className={active === it.id ? 'is-active' : ''} aria-current={active === it.id ? 'true' : undefined}>
              {it.label}
            </a>
          ))}
        </nav>

        <a className="nav__cta" href={links.booking} target="_blank" rel="noopener noreferrer">
          Contratar
        </a>

        <button
          ref={toggleRef}
          type="button"
          className={`nav__toggle ${open ? 'is-open' : ''}`}
          aria-expanded={open}
          aria-controls="menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="nav__toggle-label">{open ? 'Fechar' : 'Menu'}</span>
          <span className="nav__toggle-lines" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </header>

      <div className={`drawer-scrim ${open ? 'is-open' : ''}`} onClick={close} aria-hidden="true" />
      <div ref={drawerRef} id="menu" className={`drawer ${open ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Menu">
        <nav aria-label="Seções" className="drawer__nav">
          {items.map((it, i) => (
            <a
              key={it.id}
              href={`#${it.id}`}
              onClick={close}
              className={active === it.id ? 'is-active' : ''}
              aria-current={active === it.id ? 'true' : undefined}
              style={{ ['--i' as string]: i }}
            >
              <span className="drawer__n serif">{String(i + 1).padStart(2, '0')}</span>
              {it.label}
            </a>
          ))}
        </nav>
        <div className="drawer__foot" style={{ ['--i' as string]: items.length }}>
          <a className="btn btn--red" href={links.booking} target="_blank" rel="noopener noreferrer" onClick={close}>
            Contratar o VILX <Arrow />
          </a>
          <a className="drawer__social" href={links.instagram} target="_blank" rel="noopener noreferrer" onClick={close}>
            Instagram {links.instagramHandle}
          </a>
        </div>
      </div>
    </>
  )
}
