# Publicação da API administrativa — Method Flow ART

A interface GitHub Pages não pode cadastrar outras pessoas com chave de servidor. A API `api/admin.js` é uma função Node.js para Vercel; **não está publicada automaticamente pelo GitHub Pages**.

## 1. Publicar API na Vercel

- Em Vercel, importe **methodflowllba-bit/mapaderisco** como projeto separado de API.
- Framework: **Other**, Root directory: raiz do repositório.
- Configure as variáveis de ambiente no projeto Vercel:
  - `SUPERDB_ANON_KEY`: chave pública anon do projeto Mapa de Risco.
  - `SUPERDB_SERVICE_ROLE_KEY`: chave privada `service_role` do mesmo projeto. **Nunca inserir no GitHub, no navegador ou em auth-config.js.**
- Faça deploy. O endpoint será `https://SEU-PROJETO.vercel.app/api/admin`.

## 2. Apontar o GitHub Pages para a API

No arquivo `auth-config.js`, preencha APENAS:
`adminApiUrl: 'https://SEU-PROJETO.vercel.app'`

A interface chama:
- `POST /api/admin?route=users` (token Bearer de administrador, nome/e-mail/perfil/status)
- `POST /api/admin?route=account%2Factivate` (e-mail, código entregue pelo administrador, senha, `mode=first`)

## 3. Limites e validação

- O e-mail deve estar no pré-cadastro e com status ativo. O código é aleatório, só o hash fica no banco; validade 24h e até 5 tentativas.
- O endpoint de **reset sem e-mail** retorna 501 deliberadamente: ainda falta uma rota de administração SuperDB confirmada para trocar senha de outras contas.
- Teste primeiro em ambiente de homologação com um usuário novo. Verifique se a API reconhece o JWT de administrador e se `service_role` grava no schema correto.
- Este projeto **ainda não permite atualizar status, regenerar código ou excluir usuários**. Não marque essas funções como prontas.
- Na versão atual, a API pré-cadastra o usuário antes da criação da identidade de autenticação. O usuário define a senha ao apresentar código e e-mail. O cadastro não envia e-mail.
- Segurança adicional antes de produção: rate-limit também no IP, transação/lock atômico no resgate do código e reconciliação em caso de falha após `signUp`; avaliar confirmação de e-mail desligada.
- A proteção obrigatória do Mapa de Risco e persistência de ARTs no banco **não foram ativadas**.
