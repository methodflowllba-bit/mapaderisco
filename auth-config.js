// Method Flow — conexão com SuperDB (projeto Mapa de Risco)
// Mantenha o login obrigatório desativado até validar a sessão e as políticas RLS.
// O teste separado em teste-login.html recebe a chave anon somente em memória.
// NUNCA coloque service_role, management_key ou senhas neste arquivo.
window.MF_AUTH_CONFIG = {
  provider: 'superdb',
  projectId: 'p_4c359bf39f',
  projectSlug: 'p_4c359bf39f',
  url: 'https://auth.superdb.com.br',
  anonKey: 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImRwa18yNjA2XzY1NzMwNTM2IiwidHlwIjoiSldUIn0.eyJyb2xlIjoiYW5vbiIsInByb2plY3RfaWQiOiIxOGUzMTZhNi1mODAwLTQ0ZDUtYWFjZC0zNjBkYjY1MzVmZjYiLCJwcm9qZWN0X3NjaGVtYSI6InByb2pfcF80YzM1OWJmMzlmIiwia3YiOjEsInN1YiI6ImFwaWtleTphbm9uIiwiaWF0IjoxNzkyNzQ5MzA4LCJpc3MiOiJodHRwczovL2F1dGguc3VwZXJkYi5jb20uYnIiLCJhdWQiOiJodHRwczovL2FwaS5zdXBlcmRiLmNvbS5iciJ9.TgDGBHg5i9xdG7nZC5xVrYwIAHGy3rdjUPzHs2aVNoPEVy-yHP6Q0tLd6jcrq1CFNpY5lCoSvozFdV_iCAIkcg',
  enabled: false,
  adminApiUrl: ''
};
