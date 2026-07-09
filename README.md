# Registro de Leitura // Cerebro

Tracker de leitura de quadrinhos (Next.js App Router + TypeScript). Guia inicial: **Era Krakoa** completa, com 3 níveis (Espinha / Recomendado / Completista), ordem interna dos eventos e capa da edição no hover.

## Rodando

```bash
pnpm install   # ou npm install
# .env.local:
# DATABASE_URL=postgres://user:pass@host:5432/db
pnpm dev
```

Precisa de um Postgres — Railway dá um de graça e injeta `DATABASE_URL` automaticamente no serviço linkado. A tabela `progress` é criada no primeiro request (lazy `CREATE TABLE IF NOT EXISTS`). As capas vêm da [Marvel Metadata API](https://marvel.emreparker.com) (gratuita, sem chaves).

## Como funciona

- **Progresso**: salvo em Postgres via `/api/progress` (GET pra buscar, POST pra togglar). Deploy é single-user — não há `user_id`; quem tem a URL compartilha o mesmo estado. Mantenha a URL do Railway privada.
- **Capas**: `app/api/cover/route.ts` chama a Marvel Metadata API — busca por título (`/v1/search/issues`) e depois pega os detalhes do issue (`/v1/issues/{id}`) pra extrair a capa. Cache em 3 camadas: memória do servidor, `revalidate` de 30 dias no fetch, e `localStorage` no client — na prática cada capa é buscada uma única vez.
- **Filtro de nível**: "Só a espinha" mostra apenas os ⭐ essenciais; as barras de progresso se recalculam pro nível ativo.

## Adicionando um novo guia

1. Crie `data/meu-guia.ts` exportando um objeto `Guide` (veja `data/krakoa.ts` como referência).
2. Registre no array `guides` em `lib/guides.ts`.

O campo `cover.q` é a query enviada à busca da API — use o título da série com o ano, ex.: `"X-Men (2019)"`. Os parênteses são removidos internamente (o ano vira só mais um token pra desambiguar séries homônimas). O campo `issue` é o número da edição.

## Atribuição

Metadata via [Marvel Metadata API](https://marvel.emreparker.com) (projeto não oficial). Imagens de capa vêm da CDN da Marvel. © MARVEL.
