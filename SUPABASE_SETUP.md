# Constância — Supabase (Fase 8A)

## 1. Instalar a dependência

Na pasta do projeto:

```bash
npm install
```

A dependência `@supabase/supabase-js` já está declarada no `package.json`.

## 2. Criar o arquivo de ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

No Supabase, a URL e a Publishable Key ficam no botão **Connect** / dados de API do projeto.

Não coloque `service_role` ou qualquer Secret Key no frontend.

## 3. Criar as tabelas

Abra o **SQL Editor** do projeto Supabase, crie uma nova query, cole todo o conteúdo de:

`supabase/schema.sql`

E execute.

## 4. Configurar confirmação de e-mail

O Constância já trata o cenário em que o Supabase exige confirmação do e-mail: depois do cadastro, a tela informa que um e-mail foi enviado.

Para o link voltar ao aplicativo local durante os testes, deixe `http://localhost:5173` configurado como URL permitida no Authentication / URL Configuration do Supabase.

Quando o projeto estiver publicado, adicione também o domínio de produção.

## 5. O que esta fase faz

- login com e-mail e senha;
- criação de conta;
- mensagem de confirmação de e-mail;
- recuperação de senha;
- logout;
- perfil criado automaticamente no banco;
- tabelas protegidas por RLS;
- estrutura de banco preparada para sincronização.

## 6. O que esta fase NÃO faz

Os dados do IndexedDB ainda não são enviados automaticamente para o Supabase.

A sincronização será implementada na Fase 8B, para evitar apagar ou duplicar os dados locais existentes.
