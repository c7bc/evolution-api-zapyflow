# Evolution API — ZapyFlow Fork

Fork da [Evolution API](https://github.com/EvolutionAPI/evolution-api) mantido pelo ZapyFlow com patches específicos que upstream ainda não resolveu ou não vai resolver.

**Base upstream:** `v2.3.7` (tag) — `cd800f2` Merge branch 'release/2.3.7'.

## Por que existe este fork

1. **Bug crítico Cloud API (issue [#2423](https://github.com/EvolutionAPI/evolution-api/issues/2423))** — `POST /instance/create` com `integration: WHATSAPP-BUSINESS` retorna `400 Foreign key constraint violated on Setting_instanceId_fkey` quando a Meta envia mensagem pendente durante o boot da instância. Impede qualquer integração Cloud API nova.

2. **Mensagens interativas quebradas (issue [#2390](https://github.com/EvolutionAPI/evolution-api/issues/2390))** — Em 2.3.7, `sendButtons` e `sendList` pararam de renderizar no destinatário. Fix via override do `@whiskeysockets/baileys` pra fork com binary nodes corretos.

3. **Native Flow ausente** — Upstream nunca mandou suporte a `cta_url`, `cta_copy`, `cta_call`, `cta_catalog`, `single_select` (lista moderna), `address_message`, `send_location`, `open_webview` ou carousel via Baileys. Adicionamos endpoints novos `POST /message/sendInteractive/:instance` e `POST /message/sendCarousel/:instance`.

## Patches aplicados

Ver commits com prefixo `zapyflow:` no histórico. Resumo vivo:

- [ ] `zapyflow: cloud FK patches` — try/catch em 3 camadas (`chatbot.controller.ts`, `whatsapp.business.service.ts`, `instance.controller.ts`) pra engolir FK violations do Prisma durante o boot da instância Cloud.
- [ ] `zapyflow: baileys override` — `package.json` com override de `@whiskeysockets/baileys` pra fork que renderiza native flow.
- [ ] `zapyflow: native flow interactive messages` — helper + DTOs + 2 endpoints novos.

Checkbox acima reflete estado do fork. Ao commitar, marca ✅.

## Deploy no Coolify

Use `docker-compose.zapyflow.yml` — template que o user já conhece, com `build: .` pra Coolify buildar do próprio repo (sem precisar registry externo).

**Variáveis Coolify obrigatórias** (configurar no dashboard):

| Var | Propósito |
|-----|-----------|
| `SERVICE_USER_POSTGRES` | User Postgres |
| `SERVICE_PASSWORD_POSTGRES` | Password Postgres |
| `POSTGRES_DB` | Nome do DB (default `postgres`) |
| `SERVICE_URL_EVO` | URL pública do Evolution (ex: `https://evolution.zapyflow.com.br`) |
| `SERVICE_PASSWORD_AUTHENTICATIONAPIKEY` | API key do Evolution (auth header) |

Opcionais (todos têm default sensato): `DATABASE_SAVE_DATA_*`, `RABBITMQ_*`, `WEBHOOK_EVENTS_*`, `*_ENABLED` por integração.

**Setup Coolify:**

1. New → Resource → Docker Compose
2. Source: Git Repository → apontar pro fork
3. Compose file: `docker-compose.zapyflow.yml`
4. Domain: setar em `api` service pra mapear pro `SERVICE_URL_EVO`
5. Deploy

Coolify builda o `Dockerfile` na raiz e roda os 3 serviços (api, redis, postgres) juntos.

## Como sincronizar com upstream

Quando `EvolutionAPI/evolution-api` lançar `v2.3.8` (ou qualquer release nova):

```bash
git remote add upstream https://github.com/EvolutionAPI/evolution-api.git
git fetch upstream
git checkout main
git rebase upstream/v2.3.8   # ou upstream/main
# resolver conflitos em arquivos com patches zapyflow:
# - src/api/integrations/chatbot/chatbot.controller.ts
# - src/api/integrations/channel/meta/whatsapp.business.service.ts
# - src/api/controllers/instance.controller.ts
# - src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts
# - package.json (override Baileys)
git push --force-with-lease
```

Redeploy no Coolify depois do rebase.

## Rollback rápido (se um patch quebrar)

Cada patch vira 1 commit atômico com prefixo `zapyflow:`. Pra reverter:

```bash
git revert <sha-do-patch>
git push
```

Coolify re-builda automaticamente.

## Referências

- Upstream: https://github.com/EvolutionAPI/evolution-api
- Issue #2423 (Cloud FK): https://github.com/EvolutionAPI/evolution-api/issues/2423
- Issue #2390 (sendButtons broken): https://github.com/EvolutionAPI/evolution-api/issues/2390
- ZapyFlow backend: https://github.com/<owner>/zapyflow (privado)
