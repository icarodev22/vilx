import { media, src, srcSet, type Media } from '../media'
import { FlexCarousel, type FlexCarouselItem } from '../components/FlexCarousel/FlexCarousel'
import { ScrollReveal } from '../components/ScrollReveal/ScrollReveal'

// Legendas só onde o evento está confirmado (nome do arquivo enviado).
// As fotos sem identificação ficam com uma legenda neutra, sem nome de evento.
const photos: [Media, string | null][] = [
  [media.showEsbornia, 'Esbórnia Recife'],
  [media.showAoVivo2, null],
  [media.showPreReveillon, 'Pré Réveillon BP, Fortaleza'],
  [media.showKaioJorge, 'Aniversário Kaio Jorge'],
  [media.showAoVivo1, null],
  [media.showPrivado, 'Evento privado'],
  [media.showAoVivo3, null],
  [media.showLiveset, 'VILX Liveset'],
]

const items: FlexCarouselItem[] = photos.map(([m, caption]) => ({
  id: m.id,
  src: src(m),
  srcSet: srcSet(m),
  width: m.w,
  height: m.h,
  alt: m.alt,
  caption,
  pos: m.pos,
}))

export function Shows() {
  return (
    <section id="shows" className="section shows" aria-labelledby="shows-title">
      <p className="eyebrow">
        <span className="eyebrow__n">03</span>Shows
      </p>

      <div className="shows__head">
        <ScrollReveal as="h2" id="shows-title" className="t-h2" mode="once" effect="rise" stagger={0.07} baseOpacity={0} accent={['pista']}>
          Da cabine para a pista
        </ScrollReveal>
        <ScrollReveal className="t-lede shows__lede" mode="scrub" splitBy="words" stagger={0.035} baseOpacity={0.12} blurStrength={3} baseOffset={8} smoothing={0.12}>
          Registros de apresentações do VILX. Arraste, use as setas ou deixe as fotos passarem.
        </ScrollReveal>
      </div>

      <div className="shows__carousel">
        <FlexCarousel items={items} label="Fotos de shows do VILX" distortion={0.45} bend={0.5} radius={16} fallbackCaption="Ao vivo" />
      </div>
    </section>
  )
}
