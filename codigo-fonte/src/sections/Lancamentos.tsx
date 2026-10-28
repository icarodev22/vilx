import { tracks } from '../content'
import { ScrollReveal } from '../components/ScrollReveal/ScrollReveal'
import { ReleasePlayers } from '../components/ReleasePlayers/ReleasePlayers'

export function Lancamentos() {
  return (
    <section id="lancamentos" className="section lancamentos" aria-labelledby="lancamentos-title">
      <p className="eyebrow">
        <span className="eyebrow__n">02</span>Lançamentos
      </p>

      <div className="lanc__head">
        <h2 id="lancamentos-title" className="lanc__title">
          <ScrollReveal as="span" className="lanc__number" mode="once" splitBy="chars" stagger={0.035} baseOpacity={0} baseOffset={24} blurStrength={3}>
            +15 milhões
          </ScrollReveal>
          <ScrollReveal as="span" className="lanc__unit serif" mode="once" stagger={0.08} baseOpacity={0} baseOffset={12} delay={0.25}>
            de streams
          </ScrollReveal>
        </h2>
        <ScrollReveal className="t-lede lanc__lede" mode="scrub" splitBy="words" stagger={0.035} baseOpacity={0.12} blurStrength={3} baseOffset={8} smoothing={0.12}>
          Na produção musical, VILX soma mais de 15 milhões de streams. Ouça os lançamentos:
        </ScrollReveal>
      </div>

      <div data-reveal>
        <ReleasePlayers tracks={tracks} />
      </div>
    </section>
  )
}
