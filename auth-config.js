// Method Flow — conexão com SuperDB (projeto Mapa de Risco)
// Mantenha o login obrigatório desativado até validar a sessão e as políticas RLS.
// O teste separado em teste-login.html recebe a chave anon somente em memória.
// NUNCA coloque service_role, management_key ou senhas neste arquivo.
window.MF_AUTH_CONFIG = {
  provider: 'superdb',
  projectId: 'p_4c359bf39f',
  projectSlug: 'p_4c359bf39f',
  url: 'https://auth.superdb.com.br',
  anonKey: '',
  enabled: false,
  adminApiUrl: ''
};
