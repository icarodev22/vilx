# VILX — site oficial

Portfólio do VILX (João Vilaça, Recife/PE). Vite + React + TypeScript, Three.js na abertura, OGL no carrossel e no fundo líquido, GSAP + ScrollTrigger na revelação de texto.

## Tipografia

- **Bricolage Grotesque** (variável: peso, largura e tamanho óptico) para títulos, texto, navegação e números.
- **Instrument Serif itálica** só como acento editorial (uma palavra em títulos, índices, assinatura).

Fontes auto-hospedadas via Fontsource; sem dependência do Google Fonts.

## ScrollReveal

`src/components/ScrollReveal/`. Revela texto por palavra, linha ou letra com GSAP + ScrollTrigger, em modo `scrub` (acompanha a rolagem) ou `once`. O texto nunca começa escondido por CSS; com movimento reduzido não há animação. A implementação de referência do React Bits não veio junto com o pedido, então a API segue a configuração descrita (`mode`, `splitBy`, `effect`, `stagger`, `baseOpacity`, `enableBlur`, `blurStrength`, `baseRotation`, `baseOffset`, `smoothing`).

```bash
npm install
npm run dev            # desenvolvimento
npm run build          # checagem de tipos + build de produção (dist/)
npm run audit:images   # confere a regra "nenhuma imagem repetida"
```

## Abertura 3D

`src/components/intro/AvatarScene.ts`. O avatar não é uma imagem plana: cada pixel da arte original
(`reference/vilx-avatar-original.jpg`) vira uma coluna 3D com profundidade própria, gerada por
`scripts/voxelize.py` em `src/assets/avatar-voxels.json`:

- fundo vermelho e contorno branco removidos, ficando só a silhueta;
- volume da cabeça a partir da silhueta (domo + distância até a borda);
- óculos projetados à frente do rosto, cabelo numa camada própria;
- cores = cores originais de cada pixel; nenhum traço novo é desenhado.

A cena tem montagem dos voxels na entrada, flutuação, rotação lenta, resposta ao cursor e ao arrasto
no toque, luz-chave com sombra, contraluz vermelho, luz orbitando, lentes com reflexo, piso
translúcido com reflexo espelhado (desligado em aparelhos modestos) e degradação automática se a taxa
de quadros cair. Sem WebGL, ou se o contexto for perdido, entra uma versão 2D com o recorte da arte
(`src/assets/vilx-avatar-cutout.png`, gerado pelo mesmo script).

Para regerar os voxels:

```bash
python3 scripts/voxelize.py reference/vilx-avatar-original.jpg src/assets/avatar-voxels.json /tmp/depth.png src/assets/vilx-avatar-cutout.png
```

## FlexCarousel

`src/components/FlexCarousel/`. A faixa em DOM é a fonte da verdade (layout, legendas, teclado,
leitores de tela); um canvas OGL redesenha cada foto com curvatura de profundidade, distorção líquida
proporcional à velocidade e uma lente sob o cursor. Sem WebGL, as fotos em DOM continuam visíveis.
Mouse, toque (gesto vertical continua rolando a página), roda horizontal, setas, Home/End e botões.

Loop contínuo sem clones: cada foto é reposicionada em módulo do comprimento da faixa e só dá a volta depois de sair inteira da tela. Avança sozinho a cada ~5 s; pausa com mouse em cima, foco, arrasto, aba em segundo plano ou movimento reduzido.

## Logos

Originais em `reference/brand/`; versões de tela geradas por `scripts/prep_brand.py`. Cada versão aparece em um único lugar:

| Versão | Onde |
| --- | --- |
| Branca (`logo-branco.png`) | Cabeçalho |
| Vermelha com contorno (`logo-vermelho.png`) | Título do Contato: "Contrate o [logo]" |
| Selo oval (`logo-selo.webp`, fundo preto removido) | Rodapé |
| Preta (`favicon.png`, `apple-touch-icon.png`) | Ícone da aba, sobre quadrado vermelho |

## Palcos (faixa de logos)

`src/components/LogoMarquee/`. Os 9 logos da página "Eventos" do release (Carvalheira na Ladeira, Esbórnia, Kosmos, Sente a Ginga, Oboé, We Do, Pega Vareta, Luan City Festival, Samba do Barcha) passam em loop contínuo para a direita, sem bordas. Mesmo princípio do carrossel: sem clones; se a tela for larga demais, o espaçamento cresce em vez de repetir logos. Pausa com mouse em cima, foco, fora da tela e aba oculta; com movimento reduzido vira uma composição estática. Arquivos gerados por `scripts/prep_events.py` a partir de `reference/events/` (extraídos do PDF; Kosmos é vetorial no PDF e foi renderizado a 300 dpi). O ajuste óptico de tamanho de cada logo fica em `src/eventLogos.ts`.

## Imagens

Cada imagem é usada uma única vez (`src/media.ts` é o registro; `npm run audit:images` valida).
As fotos foram otimizadas para WebP por `scripts/prep_media.py` (História até 2200 px, Shows até a resolução original de cada arquivo; nada é ampliado).

| Seção | Arquivo | Origem |
| --- | --- | --- |
| Abertura | avatar 3D (voxels) | avatar pixelado |
| História | historia-oculos | PART4 VILACAPrancheta 1.jpg |
| História | historia-lua | PART5 VILACAPrancheta 1.jpg |
| História | historia-vermelho | PART2 VILACAPrancheta 1.jpg |
| História | historia-olhar | PART1 VILACAPrancheta 2.jpg |
| Lançamentos | capa-o-predio-vai-tremer | card do Spotify no release, p. 4 |
| Lançamentos | capa-toda-nua | card do Spotify no release, p. 4 |
| Shows | show-esbornia-recife | Esbórnia Recife.jpg |
| Shows | show-pre-reveillon-bp-fortaleza | Pré Réveillon BP _ Fortaleza.jpg |
| Shows | show-aniversario-kaio-jorge | Aniversário Kaio Jorge.jpg |
| Shows | show-evento-privado | Evento Privado.jpg |
| Shows | show-liveset | Vilx Liveset.jpg |
| Shows | show-ao-vivo-01/02/03 | SaveClip.App_*.jpg (sem evento identificado) |

Não usadas (disponíveis para o futuro): PART1 Prancheta 1 e 3, PART2 Prancheta 2 e 3,
PART3 Prancheta 2, PART5 Prancheta 2, PART6 Prancheta 1 e 5.

## Pendências de conteúdo

- **E-mail de contato**: não consta nos materiais. Preencha `links.email` em `src/content.ts` e o
  canal aparece na seção Contato.
- **Capa de "Sumir Com VC"**: não fornecida; a faixa usa uma arte tipográfica temporária.
- **Capas em alta resolução**: as capas atuais vêm dos cards do release (~360 px).
- **Eventos das fotos SaveClip**: sem identificação, ficam com a legenda neutra "Ao vivo".
