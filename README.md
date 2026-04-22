# Bobby Millionaire ESL

Jogo de ingles no estilo programa de TV, com Bobby como host e uma escada de 25 perguntas de multipla escolha.

## Como funciona

- 25 perguntas por partida
- 5 perguntas de `A1`
- 5 perguntas de `A2`
- 5 perguntas de `B1`
- 5 perguntas de `B2`
- 5 perguntas de `C1`
- um erro encerra a partida
- tres recursos unicos por jogo:
  - `Consultar Bobby`
  - `Pular`
  - `Cortar 1 errada`

O jogador começa no bloco `A1` e sobe nivel por nivel ate `C1`. Se completar a escada inteira, ganha o premio final `BIG Corn Milhao`.

## Destaques

- interface inspirada em game show
- Bobby comenta as respostas e pode dar um palpite quando consultado
- animacao de suspense ao confirmar resposta
- efeitos sonoros sintetizados no cliente para tensao, acerto e erro
- suporte a perguntas com texto, imagem e audio
- resumo final para o professor

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `@google/genai`
- `Firestore` opcional para persistencia
- banco em memoria para demo local

## Rodando localmente

Instale as dependencias:

```bash
npm install
cp .env.example .env.local
```

Para demo local, use o banco em memoria:

```bash
BOBBY_USE_MEMORY_STORE=1 GEMINI_API_KEY=SEU_TOKEN npm run dev -- --hostname localhost
```

Abra:

```text
http://localhost:3000
```

Observacoes:

- `BOBBY_USE_MEMORY_STORE=1` evita dependencia de Firestore para testes locais.
- a aplicacao web atual usa `GEMINI_API_KEY` para as chamadas do Bobby.
- os scripts de geracao de assets usam Vertex AI.

## Variaveis de ambiente

Veja `.env.example`.

Principais variaveis:

- `GEMINI_API_KEY`
- `BOBBY_USE_MEMORY_STORE`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `FIRESTORE_DATABASE_ID`
- `MEDIA_BUCKET`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run seed:questions`
- `npm run generate:images`
- `npm run generate:tts`

## Verificacao

```bash
npm run typecheck
npm run lint
npm run build
```

## Seed e assets

Para gravar o banco de perguntas no Firestore:

```bash
GOOGLE_CLOUD_PROJECT=noble-velocity-492304-b6 npm run seed:questions
```

Para gerar assets de imagem com Vertex AI:

```bash
gcloud auth application-default login
GOOGLE_CLOUD_PROJECT=noble-velocity-492304-b6 GOOGLE_CLOUD_LOCATION=us-central1 npm run generate:images
```

Para gerar assets de audio:

```bash
GOOGLE_CLOUD_PROJECT=noble-velocity-492304-b6 GOOGLE_CLOUD_LOCATION=us-central1 npm run generate:tts
```

## Deploy

O projeto foi pensado para rodar em Cloud Run.

Em producao:

- prefira `Secret Manager` para `GEMINI_API_KEY`
- use Firestore para sessoes persistentes
- use `MEDIA_BUCKET` para servir audio e imagem das perguntas

## Status atual

O jogo foi migrado do formato antigo de resposta aberta para:

- escada fixa de 25 perguntas
- somente multipla escolha
- progressao automatica por dificuldade
- eliminacao imediata no primeiro erro
