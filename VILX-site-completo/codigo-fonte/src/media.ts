// Registro único de imagens do site. Cada arquivo de origem aparece aqui uma
// única vez e pertence a uma única seção. O script `npm run audit:images`
// confere esta regra no código e no build final.

export type Media = {
  id: string
  section: 'historia' | 'lancamentos' | 'shows'
  source: string // arquivo original recebido
  w: number
  h: number
  srcset: [string, number][]
  alt: string
  /** enquadramento quando a foto é cortada (object-position) */
  pos: string
}

const base = 'media/' // relativo: funciona servido na raiz ou aberto do disco
// No build de arquivo único (npm run build:single) as fotos vêm embutidas
// como data URIs neste mapa; no site normal ele não existe.
const inlined = (globalThis as { __VILX_MEDIA__?: Record<string, string> }).__VILX_MEDIA__
const url = (file: string) => inlined?.[file] ?? `${base}${file}`

function m(
  id: string,
  section: Media['section'],
  source: string,
  w: number,
  h: number,
  widths: number[],
  alt: string,
  pos = '50% 50%',
): Media {
  return {
    id,
    section,
    source,
    w,
    h,
    // no arquivo único, só as larguras embutidas entram no srcset
    srcset: (inlined ? widths.filter((x) => inlined[`${id}-${x}.webp`]) : widths).map((x) => [url(`${id}-${x}.webp`), x]),
    alt,
    pos,
  }
}

const HIST = [960, 1600, 2200]

export const media = {
  // História — ensaio de estúdio (originais 4000×6000)
  historiaOculos: m('historia-oculos', 'historia', 'PART4 VILACAPrancheta 1.jpg', 4000, 6000, HIST, 'VILX de óculos escuros e camiseta branca, em luz quente', '50% 18%'),
  historiaOlhar: m('historia-olhar', 'historia', 'PART1 VILACAPrancheta 2.jpg', 4000, 6000, HIST, 'VILX em close, com a mão no rosto', '45% 30%'),
  historiaVermelho: m('historia-vermelho', 'historia', 'PART2 VILACAPrancheta 1.jpg', 4000, 6000, HIST, 'VILX sorrindo, sentado diante de uma luz vermelha', '50% 35%'),
  historiaLua: m('historia-lua', 'historia', 'PART5 VILACAPrancheta 1.jpg', 4000, 6000, HIST, 'VILX sentado em uma cadeira diante de um círculo de luz', '50% 55%'),

  // Lançamentos — capas recortadas dos cards do release (maior versão disponível)
  capaPredio: m('capa-o-predio-vai-tremer', 'lancamentos', 'VILX - RELEASE.pdf (p. 4, card O Prédio Vai Tremer)', 360, 360, [360], 'Capa de O Prédio Vai Tremer'),
  capaTodaNua: m('capa-toda-nua', 'lancamentos', 'VILX - RELEASE.pdf (p. 4, card Toda Nua)', 340, 340, [340], 'Capa de Toda Nua'),

  // Shows
  showEsbornia: m('show-esbornia-recife', 'shows', 'Esbórnia Recife.jpg', 2774, 4160, [800, 1400], 'VILX nos decks sob luzes rosa no Esbórnia Recife', '50% 40%'),
  showPreReveillon: m('show-pre-reveillon-bp-fortaleza', 'shows', 'Pré Réveillon BP _ Fortaleza.jpg', 1280, 854, [800, 1280], 'VILX de costas para o público no Pré Réveillon BP, em Fortaleza', '62% 50%'),
  showKaioJorge: m('show-aniversario-kaio-jorge', 'shows', 'Aniversário Kaio Jorge.jpg', 854, 1280, [800, 854], 'VILX em preto e branco no Aniversário Kaio Jorge', '60% 40%'),
  showPrivado: m('show-evento-privado', 'shows', 'Evento Privado.jpg', 854, 1280, [800, 854], 'VILX nos decks em um evento privado', '50% 35%'),
  showLiveset: m('show-liveset', 'shows', 'Vilx Liveset.jpg', 854, 1280, [800, 854], 'VILX com camisa roxa em um liveset noturno', '50% 40%'),
  showAoVivo1: m('show-ao-vivo-01', 'shows', 'SaveClip.App_680763459_….jpg', 1440, 1920, [800, 1400], 'VILX sorrindo no meio do público sob luzes neon', '45% 60%'),
  showAoVivo2: m('show-ao-vivo-02', 'shows', 'SaveClip.App_723331329_….jpg', 3000, 4000, [800, 1400], 'VILX com a mão para o alto no palco, com luzes coloridas', '50% 45%'),
  showAoVivo3: m('show-ao-vivo-03', 'shows', 'SaveClip.App_847630209_….jpg', 1080, 1440, [800, 1080], 'VILX tocando para a pista sob luz vermelha', '40% 50%'),
} satisfies Record<string, Media>

export function srcSet(item: Media) {
  return item.srcset.map(([src, w]) => `${src} ${w}w`).join(', ')
}

export function src(item: Media) {
  return item.srcset[item.srcset.length - 1][0]
}

export const coverById: Record<string, Media> = {
  [media.capaPredio.id]: media.capaPredio,
  [media.capaTodaNua.id]: media.capaTodaNua,
}

if (import.meta.env.DEV) {
  const ids = Object.values(media).map((item) => item.id)
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dup.length) console.error('[media] imagem registrada mais de uma vez:', dup)
}
