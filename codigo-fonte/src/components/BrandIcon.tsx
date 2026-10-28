import { siInstagram, siSpotify, siTiktok, siYoutube } from 'simple-icons'

// Símbolos oficiais das plataformas, do Simple Icons (cada um aponta para o
// guia de marca de origem). Nada é redesenhado aqui: só o path original.
const icons = {
  spotify: siSpotify,
  youtube: siYoutube,
  tiktok: siTiktok,
  instagram: siInstagram,
}

export type Brand = keyof typeof icons

type Props = {
  brand: Brand
  className?: string
  /** decorativo: quando o nome já está no link (aria-label) */
  decorative?: boolean
}

export function BrandIcon({ brand, className, decorative = false }: Props) {
  const icon = icons[brand]
  return (
    <svg
      className={`brand-icon brand-icon--${brand} ${className ?? ''}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...(decorative ? { 'aria-hidden': true, focusable: false } : { role: 'img', 'aria-label': icon.title })}
    >
      {!decorative && <title>{icon.title}</title>}
      <path d={icon.path} />
    </svg>
  )
}
