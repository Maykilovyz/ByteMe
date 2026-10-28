// As frases de teste da planilha usam Ananindeua e Belém. Sem CIDADES no .env.local, os testes usam as duas.
// Importar depois de ./carregar-env e ANTES de lib/config.
process.env.CIDADES ||= "Ananindeua,Belém";
