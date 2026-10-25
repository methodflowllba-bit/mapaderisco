# Implantação SuperDB — Mapa de Risco

Projeto: p_4c359bf39f. Schema esperado: `proj_p_4c359bf39f`, deduzido do claim `project_schema` da chave pública enviada. **Valide no banco antes de executar.**

## Ordem de implantação
1. No SuperDB > Banco de Dados, confirme o schema do projeto.
2. Faça backup das ARTs do navegador e dos dados existentes do projeto.
3. No SuperDB > SQL Editor, revise e execute `superdb/mapa-risco.sql`.
4. Confira RLS com uma sessão anônima, usuário comum e administrador. A tabela de convites não deve ter acesso direto do navegador.
5. Em Autenticação > Login e provedores, habilite e-mail/senha e desabilite autocadastro público, se a plataforma oferecer esse controle.
6. Em Autenticação > Usuários, crie manualmente a conta principal com uma **nova senha** sem envio de convite. Copie o UUID e execute a instrução final comentada no SQL.
7. Configure um backend privado externo (ex.: Vercel) para gerar códigos de ativação, validar código e criar contas. SuperDB não oferece Supabase Edge Functions.
8. Instale/compile `@superdb/client` com `createClient('https://auth.superdb.com.br', anonKey, {project:'p_4c359bf39f'})`. Não use o cliente `@supabase/supabase-js` existente.
9. Adapte a interface de usuários à API privada e o CRUD de ARTs à tabela `art_audits`. Faça importação explícita de backup local, sem apagar os dados locais até confirmar.
10. Somente então habilite o login obrigatório e retire os caminhos que permitam ler a ART sem sessão.

## Importante
Os arquivos de login atuais são **provisórios**. A mera presença de um formulário, ou colocar anonKey no GitHub, NÃO completa a autenticação nem protege ARTs em localStorage. O acesso ao SuperDB não está ligado neste momento.
Nunca exponha service_role ou senhas pessoais. O fluxo de primeiro acesso sem e-mail exige backend confiável.
