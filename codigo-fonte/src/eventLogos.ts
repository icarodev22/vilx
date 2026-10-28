// Logos dos eventos citados na página "Eventos" do release oficial.
// Arquivos gerados por scripts/prep_events.py (altura 240 px, fundo transparente).
import carvalheira from './assets/events/carvalheira-na-ladeira.webp'
import esbornia from './assets/events/esbornia.webp'
import kosmos from './assets/events/kosmos.webp'
import senteAGinga from './assets/events/sente-a-ginga.webp'
import oboe from './assets/events/oboe.webp'
import weDo from './assets/events/we-do.webp'
import pegaVareta from './assets/events/pega-vareta.webp'
import luanCity from './assets/events/luan-city.webp'
import sambaDoBarcha from './assets/events/samba-do-barcha.webp'
import type { MarqueeLogo } from './components/LogoMarquee/LogoMarquee'

// scale: ajuste óptico para todos pesarem parecido na faixa
export const eventLogos: MarqueeLogo[] = [
  { src: carvalheira, alt: 'Carvalheira na Ladeira', w: 462, h: 240, scale: 1.05 },
  { src: esbornia, alt: 'Esbórnia', w: 1398, h: 240, scale: 0.46 },
  { src: kosmos, alt: 'Kosmos', w: 437, h: 240, scale: 1.2 },
  { src: senteAGinga, alt: 'Sente a Ginga', w: 575, h: 240, scale: 0.86 },
  { src: oboe, alt: 'Oboé', w: 499, h: 240, scale: 0.68 },
  { src: weDo, alt: 'We Do', w: 261, h: 240, scale: 0.86 },
  { src: pegaVareta, alt: 'Pega Vareta', w: 199, h: 240, scale: 1.22 },
  { src: luanCity, alt: 'Luan City Festival', w: 283, h: 240, scale: 1.08 },
  { src: sambaDoBarcha, alt: 'Samba do Barcha', w: 337, h: 240, scale: 1.08 },
]
