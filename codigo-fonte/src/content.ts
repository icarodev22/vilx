import type { Brand } from './components/BrandIcon'

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
const whatsappText = 'Olá, gostaria de consultar a disponibilidade e os valores para contratar o VILX para um evento.'

export const links = {
  booking: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`,
  presskit: 'https://drive.google.com/file/d/1GnShK6taXIVuvMrLm2rEED-71ZoocKSd/view?usp=sharing',
  spotifyArtist: 'https://open.spotify.com/artist/5QyuAOyK7AeuaVKsydSwjF',
  instagram: 'https://instagram.com/vilxmsc',
  instagramHandle: '@vilxmsc',
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

export const stats: { value: string; label: string; platform: string; brand: Brand }[] = [
  // brand: plataforma de origem, conforme o ícone ao lado de cada número no release
  { value: '+500K', label: 'ouvintes mensais', platform: 'Spotify', brand: 'spotify' },
  { value: '+5M', label: 'de plays', platform: 'Spotify', brand: 'spotify' },
  { value: '+8M', label: 'de views', platform: 'YouTube', brand: 'youtube' },
  { value: '+100K', label: 'de criações', platform: 'TikTok', brand: 'tiktok' },
]

// Lançamentos: um player oficial do Spotify por música. O nome, a capa e os
// artistas exibidos vêm do próprio Spotify (dentro do player); `title` aqui é
// só o rótulo acessível e a ordem da seção.
// 01: link enviado especificamente para O Prédio Vai Tremer.
// 02 e 03: os dois links já cadastrados no projeto (álbum e faixa), na ordem
// em que foram enviados. Se estiverem trocados, basta inverter as duas linhas.
export type Track = {
  type: 'track' | 'album'
  id: string
  title: string
}

export const tracks: Track[] = [
  { type: 'track', id: '6qsJjjBx1fSQiwT8k9p2gz', title: 'O Prédio Vai Tremer' },
  { type: 'album', id: '5JjmEbWr52rxs5oh47FJEj', title: 'Toda Nua' },
  { type: 'track', id: '40k6jQcjvctYmgmqEkPkHw', title: 'Sumir Com VC' },
]

export const spotifyUrl = (t: Track) => `https://open.spotify.com/${t.type}/${t.id}`
export const spotifyEmbed = (t: Track) => `https://open.spotify.com/embed/${t.type}/${t.id}?utm_source=generator&theme=0`
