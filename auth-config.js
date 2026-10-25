// Configuração do projeto SuperDB p_4c359bf39f.
// Preencha o slug e a chave anon pública obtidos em Projeto > API/Conectar.
// Não publique service_role ou management key.
window.MF_AUTH_CONFIG = {
  provider: 'superdb',
  projectId: 'p_4c359bf39f',
  url: 'https://auth.superdb.com.br',
  projectSlug: 'p_4c359bf39f',
  anonKey: '',
  enabled: false, // liberar somente após testar autenticação, tabelas e RLS
  // Endpoint HTTPS SEPARADO para criação de contas e códigos, ainda não implantado.
  adminApiUrl: ''
};
