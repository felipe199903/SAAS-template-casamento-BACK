# CasalPerfeito — Backend API

NestJS 11 · Prisma 5 · PostgreSQL 16 · JWT · Mercado Pago PIX

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20 LTS |
| npm | 10+ |
| Docker Desktop | qualquer versão recente |

---

## Subir localmente (5 passos)

```bash
# 1. Entre na pasta do back-end
cd SAAS-template-casamento-BACK

# 2. Instale as dependências
npm install

# 3. Suba o banco de dados PostgreSQL via Docker
docker-compose up -d

# 4. Execute as migrations do Prisma
npx prisma migrate deploy

# 5. Inicie o servidor em modo desenvolvimento (hot reload via SWC)
npm run start:dev
```

O servidor estará disponível em: **http://localhost:3000/api**

---

## Variáveis de ambiente (`.env`)

Já existe um `.env` configurado para desenvolvimento local. Ajuste conforme necessário:

```env
DATABASE_URL="postgresql://casalperfeito:casalperfeito_secret@localhost:5432/casalperfeito"
JWT_SECRET="casalperfeito_jwt_secret_local_2026"
PORT=3000
CORS_ORIGIN="http://localhost:4200"

# Mercado Pago (use um token de teste para dev)
MP_ACCESS_TOKEN="TEST-your-mercado-pago-access-token-here"

# Deixe vazio em dev para pular validação de assinatura do webhook
MP_WEBHOOK_SECRET=""

SITE_PRICE_BRL=50.00
```

Para obter um token de teste do Mercado Pago: https://www.mercadopago.com.br/developers

---

## Docker — banco de dados

```bash
# Subir
docker-compose up -d

# Ver logs
docker-compose logs -f db

# Parar
docker-compose down

# Parar e apagar dados
docker-compose down -v
```

Container: `casalperfeito_db`  
Porta: `5432`  
Credenciais: `casalperfeito / casalperfeito_secret`  
Banco: `casalperfeito`

---

## Endpoints

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/register` | Registrar usuário |
| `POST` | `/api/auth/login` | Login → retorna JWT |

### Casamentos
| Método | Rota | Auth? | Descrição |
|---|---|---|---|
| `POST` | `/api/weddings` | ✅ | Criar site de casamento |
| `GET` | `/api/weddings/my` | ✅ | Listar meus casamentos |
| `GET` | `/api/weddings/:slug` | ❌ | Buscar por slug (público) |
| `PATCH` | `/api/weddings/:id/pix` | ✅ | Configurar chave PIX |
| `PATCH` | `/api/weddings/:id/publish` | ✅ | Publicar site (precisa estar pago) |

### Presentes
| Método | Rota | Auth? | Descrição |
|---|---|---|---|
| `POST` | `/api/weddings/:id/presents` | ✅ | Adicionar presente |
| `GET` | `/api/weddings/:slug/presents` | ❌ | Listar presentes (público) |
| `PATCH` | `/api/presents/:id/status` | ❌ | Atualizar status (convidado) |
| `DELETE` | `/api/presents/:id` | ✅ | Remover presente |

### Compras (ativação do site)
| Método | Rota | Auth? | Descrição |
|---|---|---|---|
| `POST` | `/api/purchases` | ✅ | Criar compra → gera QR PIX |
| `GET` | `/api/purchases/:id/status` | ❌ | Consultar status do pagamento |

### Pagamentos
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/payments/webhook/mercadopago` | Webhook Mercado Pago |

### Admin (requer role ADMIN)
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/admin/stats` | Estatísticas gerais |
| `GET` | `/api/admin/weddings` | Todos os casamentos |
| `GET` | `/api/admin/purchases` | Todos os pedidos |
| `GET` | `/api/admin/users` | Todos os usuários |

---

## Criar usuário ADMIN

Para promover um usuário a ADMIN, use o Prisma Studio ou um script SQL:

```bash
# Abrir Prisma Studio
npx prisma studio
```

No Studio, vá em `User`, encontre o usuário e mude o campo `role` para `ADMIN`.

Ou via SQL:
```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'seu@email.com';
```

---

## Comandos úteis

```bash
# Abrir Prisma Studio (visualizar banco)
npx prisma studio

# Gerar Prisma Client após alterar schema
npx prisma generate

# Criar nova migration
npx prisma migrate dev --name nome-da-migration

# Build de produção
npm run build

# Rodar testes
npm run test
```

---

## Estrutura do projeto

```
src/
├── main.ts                    # Bootstrap (CORS, ValidationPipe, rawBody)
├── modules/
│   ├── auth/                  # JWT, registro, login
│   ├── weddings/              # CRUD de casamentos
│   ├── presents/              # CRUD de presentes
│   ├── purchases/             # Compra (PIX via Mercado Pago)
│   ├── payments/              # Webhook de pagamento
│   ├── admin/                 # Painel administrativo
│   └── prisma/                # PrismaService global
prisma/
├── schema.prisma              # Modelos do banco
└── migrations/                # Histórico de migrations
```

<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
