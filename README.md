# Rifa Beneficente Online — MVP

Plataforma completa de rifa online com Next.js 14, Supabase e Vercel.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **TailwindCSS** — estilos
- **Supabase** — banco PostgreSQL + Auth + Realtime
- **Vercel** — deploy + cron jobs
- **PIX** — payload EMV gerado localmente (sem gateway)

---

## Passo a passo para rodar

### 1. Clonar e instalar

```bash
cd rifa-mvp
npm install
```

### 2. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto gratuito
2. Vá em **SQL Editor** e execute todo o conteúdo de `supabase/schema.sql`
3. Vá em **Settings > API** e copie:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Edite .env.local com os valores do Supabase
```

### 4. Criar usuário admin no Supabase

No Supabase → **Authentication > Users** → **Add user**:
- Email: seu-email@exemplo.com
- Senha: escolha uma segura
- Marque "Auto Confirm User"

### 5. Rodar localmente

```bash
npm run dev
# Acesse: http://localhost:3000
```

### 6. Acessar o painel admin

- URL: `http://localhost:3000/admin/login`
- Use o email/senha criados no passo 4

---

## Deploy na Vercel

### 1. Subir para o GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/seu-usuario/rifa-mvp.git
git push -u origin main
```

### 2. Importar na Vercel

1. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**
2. Importe o repositório do GitHub
3. Em **Environment Variables**, adicione todas as variáveis do `.env.local`
4. Clique em **Deploy**

O `vercel.json` já configura o cron job para liberar reservas expiradas a cada 5 minutos automaticamente.

---

## Fluxo do sistema

```
Cliente acessa /rifa/[slug]
  → Seleciona números no grid
  → Preenche nome, CPF, WhatsApp, e-mail
  → POST /api/pedidos (reserva por 15 min com FOR UPDATE SKIP LOCKED)
  → Redireciona para /rifa/[slug]/checkout?pedido=ID
  → Vê QR Code PIX + contador regressivo
  → Admin confirma pagamento em /admin/pedidos
  → Realtime notifica cliente (página atualiza automaticamente)
```

## Estrutura de pastas

```
src/
├── app/
│   ├── page.tsx                    # Home (lista rifas ativas)
│   ├── rifa/[slug]/
│   │   ├── page.tsx                # Página pública da rifa
│   │   ├── SeletorNumeros.tsx      # Grid + seleção + formulário
│   │   ├── checkout/page.tsx       # PIX + countdown + Realtime
│   │   └── resultado/page.tsx      # Resultado do sorteio
│   ├── meus-numeros/page.tsx       # Consulta por CPF/email
│   └── admin/
│       ├── login/page.tsx          # Login admin
│       ├── page.tsx                # Dashboard
│       ├── rifas/
│       │   ├── page.tsx            # Lista rifas
│       │   ├── nova/page.tsx       # Criar rifa
│       │   └── [id]/page.tsx       # Editar rifa
│       ├── pedidos/page.tsx        # Gerenciar pedidos
│       └── sorteio/[rifaId]/page.tsx # Realizar sorteio
├── components/
│   ├── NumeroGrid.tsx              # Grid de números
│   ├── ContadorReserva.tsx         # Countdown
│   ├── QRCodePix.tsx               # QR Code PIX
│   └── BarraProgresso.tsx          # Barra de progresso
└── lib/
    ├── supabase.ts                 # Client browser
    ├── supabase-server.ts          # Client server + service role
    ├── pix.ts                      # Gerador payload PIX EMV
    └── utils.ts                    # Formatadores
```

---

## Configuração do PIX por rifa

Cada rifa tem seus próprios dados PIX:
- **Chave PIX**: CPF, CNPJ, e-mail, telefone ou chave aleatória
- **Nome do recebedor**: Como aparece no app do cliente
- **Cidade**: Obrigatório no padrão EMV

Configure ao criar/editar a rifa no painel admin.

---

## Supabase RLS (Row Level Security)

O schema configura automaticamente:
- **Leitura pública**: rifas ativas, números, sorteios
- **Escrita**: somente via `service_role` (API routes do Next.js)
- **Admin**: usa Supabase Auth nativo

---

## Comandos úteis

```bash
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção
npm run lint       # Verificar erros
```
