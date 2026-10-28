import { artist, links } from '../content'
import { Arrow } from '../components/Arrow'
import { FluidField } from '../components/FluidField'
import { BrandIcon, type Brand } from '../components/BrandIcon'
import { ScrollReveal } from '../components/ScrollReveal/ScrollReveal'
import logoVermelho from '../assets/brand/logo-vermelho.png'

export function Contato() {
  // Plataformas: símbolo oficial + nome. Presskit e e-mail são recursos:
  // só o nome.
  type Channel = { label: string; detail: string; href: string; brand?: Brand }
  const channels: Channel[] = [
    { label: 'Presskit', detail: 'Fotos, release e material de divulgação', href: links.presskit },
    { label: 'Spotify', detail: 'Perfil do artista', href: links.spotifyArtist, brand: 'spotify' },
    { label: 'Instagram', detail: links.instagramHandle, href: links.instagram, brand: 'instagram' },
    ...(links.email ? [{ label: 'E-mail', detail: links.email, href: `mailto:${links.email}` }] : []),
  ]
  return (
    <section id="contato" className="contato" aria-labelledby="contato-title">
      <FluidField className="contato__fluid" />
      <div className="contato__inner">
        <p className="eyebrow">
          <span className="eyebrow__n">04</span>Contato
        </p>

        <h2 id="contato-title" className="t-display contato__title">
          <ScrollReveal as="span" mode="once" effect="rise" stagger={0.09} baseOpacity={0}>
            Contrate o
          </ScrollReveal>
          <img className="contato__logo" src={logoVermelho} alt={artist.name} width={858} height={484} data-reveal />
        </h2>

        <div className="contato__row">
          <ScrollReveal className="t-lede contato__lede" mode="once" stagger={0.02} baseOpacity={0} baseOffset={10}>
            Shows, festas e eventos. Fale direto com o escritório do artista para agenda e propostas.
          </ScrollReveal>
          <a className="btn btn--red contato__cta" href={links.booking} target="_blank" rel="noopener noreferrer" data-reveal>
            Falar com o escritório no WhatsApp <Arrow />
          </a>
        </div>

        <ul className="channels">
          {channels.map((c, i) => (
            <li key={c.label} data-reveal style={{ ['--d' as string]: `${i * 0.06}s` }}>
              <a
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className={c.brand ? `channels__link channels__link--${c.brand}` : 'channels__link'}
                aria-label={`${c.label}: ${c.detail} (abre em nova aba)`}
              >
                <span className="channels__label">
                  {c.brand && <BrandIcon brand={c.brand} decorative />}
                  {c.label}
                </span>
                <span className="channels__detail">{c.detail}</span>
                <Arrow />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
