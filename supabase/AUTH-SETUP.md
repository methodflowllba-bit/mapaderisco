# Integração escolhida: SuperDB

**Projeto informado:** `p_4c359bf39f` em `https://app.superdb.com.br/projects/p_4c359bf39f`.

**Estado:** NÃO conectado, login NÃO ativado e nenhuma ART migrada. Preservar o site atual.

O SuperDB usa `@superdb/client`, `https://auth.superdb.com.br` e exige o **slug** do projeto, que não deve ser presumido a partir do ID `p_4c359bf39f`. O dashboard fornece a chave `anon`. Nunca colocar `service_role` no GitHub Pages.

Importante: **SuperDB não hospeda Supabase Edge Functions**. O código que está em `supabase/functions/art-access/index.ts` é apenas referência anterior e **não pode ser implantado diretamente no SuperDB**. É preciso hospedar as operações privilegiadas (criar usuário, ativar conta e gerar código de primeiro acesso) em um backend separado, como Vercel Functions, com as credenciais sensíveis em variáveis de ambiente.

O SQL de `supabase/schema.sql` foi feito para Supabase. **Não execute sem adaptar e validar** os namespaces de autenticação, schemas e permissões da instância SuperDB.

Para continuar: localizar em **SuperDB > projeto > Conectar/API** o slug e a chave pública `anon`; configurar a autenticação de senha e o serviço de funções do backend; aplicar esquema e RLS verificados; criar administrador principal; testar primeiro acesso; migrar as ARTs existentes por backup controlado.

---

# Autenticação Method Flow — implantação

## Status
A estrutura foi preparada, **mas NÃO está ativada no site** até configurar o Supabase.
O site existente e suas ARTs locais permanecem funcionando.

## Requisitos
1. Crie um projeto Supabase sob controle da empresa.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Em Authentication > Users, crie manualmente o **primeiro usuário** com email
   `alvaro.batistella@method-flow.com`, definindo uma senha temporária segura
   diretamente no painel, sem convite por e-mail.
4. Execute o trecho comentado de **ATIVAÇÃO INICIAL** no fim do SQL.
5. Faça deploy da Edge Function em `supabase/functions/art-access/index.ts` com
   `verify_jwt = false` **somente porque a função valida o JWT internamente**.
   O endpoint de primeiro acesso é público, mas exige o código secreto gerado pelo administrador.
6. Configure URL e chave pública do Supabase no frontend. **Nunca publique service_role**.
7. Migre ARTs locais conscientemente para a tabela `art_audits` antes de
   considerar as auditorias compartilhadas. Os dados antigos estão em localStorage;
   criar login não os transfere automaticamente.

## Fluxo sem e-mail
Administrador registra e-mail e função, ativa cadastro e recebe **código único**.
Entrega o código ao colaborador por meio interno. O colaborador entra no endereço,
clica em **1º acesso**, informa e-mail + código e define duas vezes sua senha.
O servidor verifica código e ativação e cria a credencial no Supabase Auth, sem enviar e-mail.

## Segurança
- Não é permitido auto cadastro livre.
- Perfil `principal` não pode ser concedido pela tela de usuários.
- Usuários comuns acessam apenas suas auditorias pela política RLS;
  administradores ativos têm acesso a todas as auditorias hospedadas no banco.
- Desativação impede acesso a dados pela RLS, mesmo se a sessão Auth continuar válida.
- O código de ativação tem prazo de 48 horas; gerar novo código invalida o anterior.
- O login não protege ARTs antigas ainda armazenadas no navegador. A migração de
  dados e a limpeza controlada do armazenamento local exigem procedimento próprio.
- Para recuperação de senha sem e-mail, o administrador deverá emitir novo código
  de recuperação; não habilite redefinição irrestrita por e-mail.
