// Todo o conteúdo factual vem do "VILX - RELEASE.pdf" (Canva, março/2026).
// Nada aqui é inventado: se um dado não está no release, ele fica de fora
// ou fica como `null` até ser confirmado.

export const artist = {
  name: 'VILX',
  realName: 'João Vilaça',
  origin: 'Recife, Pernambuco',
  tagline: 'VILX, BOLA OUTRA',
}

const whatsappNumber = '5527992464768' // botão "ESCRITÓRIO" do release
const whatsappText = 'Olá! Tenho interesse em contratar o VILX para o meu evento.'

export const links = {
  booking: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`,
  presskit: 'https://drive.google.com/file/d/1GnShK6taXIVuvMrLm2rEED-71ZoocKSd/view?usp=sharing',
  spotifyArtist: 'https://open.spotify.com/artist/5QyuAOyK7AeuaVKsydSwjF',
  instagram: 'https://instagram.com/vilxmsc',
  instagramHandle: '@vilxmsc',
  spotifyTrack: 'https://open.spotify.com/track/0BIrFyis1PrXGJImMs9Vbc',
  spotifyTrackEmbed: 'https://open.spotify.com/embed/track/0BIrFyis1PrXGJImMs9Vbc?utm_source=generator&theme=0',
  // Não consta no release. Preencha quando houver um e-mail oficial e o
  // link aparece automaticamente na seção Contato.
  email: null as string | null,
}

export const story = [
  {
    n: '01',
    title: 'Curadoria',
    text: 'Antes dos palcos, as playlists. Montava a trilha de festas e viagens até os pedidos virarem convite para tocar.',
  },
  {
    n: '02',
    title: 'Eletrônica',
    text: 'Começou no house e no afro house. Já no primeiro ano dividiu palco com Illusionize, Maz, Dub Dogz e Jørd.',
  },
  {
    n: '03',
    title: 'Funk',
    text: 'Batida brasileira com pop e eletrônica na mistura: a sonoridade que o levou aos grandes eventos do Nordeste.',
  },
  {
    n: '04',
    title: 'Estúdio',
    text: 'Na produção, soma mais de 15 milhões de streams com O Prédio Vai Tremer, Toda Nua e Sumir Com VC.',
  },
]

export const stats = [
  { value: '+500K', label: 'ouvintes mensais', platform: 'Spotify' },
  { value: '+5M', label: 'de plays', platform: 'Spotify' },
  { value: '+8M', label: 'de views', platform: 'YouTube' },
  { value: '+100K', label: 'de criações', platform: 'TikTok' },
]

export type Release = {
  title: string
  credits: string | null
  stat: string | null
  cover: string | null
}

export const releases: Release[] = [
  { title: 'O Prédio Vai Tremer', credits: 'VILX, MC Bruninho & Maduff', stat: '+15M de plays', cover: 'capa-o-predio-vai-tremer' },
  { title: 'Toda Nua', credits: 'VILX, MC Bruninho & Maduff', stat: '+1M de plays', cover: 'capa-toda-nua' },
  // Sem capa nos materiais: tratamento tipográfico até o arquivo chegar.
  { title: 'Sumir Com VC', credits: null, stat: null, cover: null },
]
