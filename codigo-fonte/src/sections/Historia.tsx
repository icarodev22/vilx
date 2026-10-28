import { artist, stats, story } from '../content'
import { media, src, srcSet, type Media } from '../media'
import { ScrollReveal } from '../components/ScrollReveal/ScrollReveal'
import { LogoMarquee } from '../components/LogoMarquee/LogoMarquee'
import { eventLogos } from '../eventLogos'

function Photo({ item, className, speed, sizes }: { item: Media; className: string; speed: number; sizes: string }) {
  return (
    <figure className={`photo ${className}`} data-reveal="clip">
      <div className="photo__inner" data-speed={speed}>
        <img
          src={src(item)}
          srcSet={srcSet(item)}
          sizes={sizes}
          width={item.w}
          height={item.h}
          alt={item.alt}
          loading="lazy"
          decoding="async"
          style={{ objectPosition: item.pos }}
        />
      </div>
    </figure>
  )
}

function Chapter({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <article className="chapter">
      <span className="chapter__n serif">{n}</span>
      <ScrollReveal as="h3" className="t-h3 chapter__title" mode="once" effect="rise" stagger={0.06} baseOpacity={0}>
        {title}
      </ScrollReveal>
      <ScrollReveal className="chapter__text" mode="scrub" splitBy="words" stagger={0.035} baseOpacity={0.12} blurStrength={3} baseOffset={8} smoothing={0.12}>
        {text}
      </ScrollReveal>
    </article>
  )
}

export function Historia() {
  const [a, b, c, d] = story
  return (
    <section id="historia" className="section historia" aria-labelledby="historia-title">
      <p className="eyebrow">
        <span className="eyebrow__n">01</span>História
      </p>

      <div className="historia__open">
        <ScrollReveal
          as="h2"
          id="historia-title"
          className="t-display historia__title"
          mode="once"
          effect="rise"
          stagger={0.08}
          baseOpacity={0}
          accent={[artist.name]}
        >
          {`${artist.realName} é ${artist.name}`}
        </ScrollReveal>
        <div className="historia__intro">
          <ScrollReveal className="t-lede" mode="scrub" splitBy="words" stagger={0.035} baseOpacity={0.12} blurStrength={3} baseOffset={8} smoothing={0.12}>
            Artista em ascensão no funk brasileiro e destaque no Nordeste. Cresceu entre o funk, o pop e a música eletrônica, e é essa mistura que sai das caixas.
          </ScrollReveal>
          <p className="t-meta historia__origin">{artist.origin}</p>
        </div>
      </div>

      <div className="historia__grid">
        <Photo item={media.historiaOculos} className="p-oculos" speed={-0.05} sizes="(max-width: 860px) 90vw, 46vw" />
        <div className="historia__chapters c-1">
          <Chapter n={a.n} title={a.title} text={a.text} />
          <Chapter n={b.n} title={b.title} text={b.text} />
        </div>
        <Photo item={media.historiaLua} className="p-lua" speed={0.06} sizes="(max-width: 860px) 62vw, 28vw" />

        <figure className="historia__quote">
          <ScrollReveal as="p" className="serif" mode="scrub" splitBy="words" stagger={0.05} baseOpacity={0.1} blurStrength={3} baseOffset={10} smoothing={0.2}>
            “Foi no funk que encontrou seu verdadeiro caminho.”
          </ScrollReveal>
          <figcaption className="t-meta">Do release oficial do artista</figcaption>
        </figure>

        <Photo item={media.historiaVermelho} className="p-vermelho" speed={-0.04} sizes="(max-width: 860px) 90vw, 40vw" />
        <div className="historia__chapters c-2">
          <Chapter n={c.n} title={c.title} text={c.text} />
          <Chapter n={d.n} title={d.title} text={d.text} />
        </div>
        <Photo item={media.historiaOlhar} className="p-olhar" speed={0.05} sizes="(max-width: 860px) 62vw, 26vw" />
      </div>

      <div className="stages">
        <p className="t-meta stages__label">Palcos por onde passou</p>
        <LogoMarquee logos={eventLogos} label="Eventos e palcos por onde o VILX passou" speed={38} />
      </div>

      <div className="metrics" aria-label="Números do artista">
        <ul>
          {stats.map((s, i) => (
            <li key={s.label + s.platform}>
              <ScrollReveal as="strong" className="metrics__value" mode="once" splitBy="chars" stagger={0.04} baseOpacity={0} baseOffset={18} delay={i * 0.08} blurStrength={2}>
                {s.value}
              </ScrollReveal>
              <span className="metrics__label">{s.label}</span>
              <span className="metrics__platform serif">{s.platform}</span>
            </li>
          ))}
        </ul>
        <p className="t-meta metrics__source">Fonte: release oficial do artista, 2026.</p>
      </div>
    </section>
  )
}
