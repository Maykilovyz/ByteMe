# Prompt de sistema da triagem (v2.0, 05/11)

Histórico: v1.1 incluiu `tipo_autor` (regra das empresas). v1.2: `tipo_autor` tem padrão `pessoa_fisica`, e a IA só pergunta a cidade quando o assunto exige. v1.3 (primeiro teste real do Mayke no AI Studio, 25/10): a IA não pergunta a cidade quando só há uma cidade atendida; o código assume essa cidade. v1.4 (primeira rodada das 19 frases no Gemini pelo código, 25/10): relato claro com assunto fora da lista, ou só tentativa de mudar as regras, vai direto ao atendente, sem pergunta; a IA só pergunta o assunto quando o relato é vago; o exemplo da geladeira agora já traz a cidade e pergunta o valor (antes ensinava a perguntar a cidade mesmo com uma cidade só).

v2.0 (05/11): incorpora as regras do workflow n8n "Triagem" da equipe: gírias e órgãos do Pará, tradução do jeito do povo para o assunto, leitura de valores informais ("uns 5k", faixas), critérios de urgência e de confiança, proteção de dados, situações especiais (golpe, papel do fórum, autolesão, outro idioma, fora de escopo) e perguntas com uma frase de acolhimento. Dois campos novos e opcionais na ficha: `prazo_iminente` (audiência, prazo, despejo ou corte nos próximos dias: vai ao atendente) e `campos_sem_resposta` (o que a pessoa disse não saber: o código não pergunta de novo). Ficaram de fora do n8n, de propósito: a regra "acima de 20 SM vai à Vara Cível" (o app segue a Lei 9.099/95: Juizado até 40 SM, advogado obrigatório acima de 20 SM) e o texto final escrito pela IA (o app usa os textos fixos revisados pela Amyr, em `lib/respostas.ts`).

Serve para Gemini, Groq ou Claude, sem mudança. O código troca os campos entre chaves (`{CIDADES}`, `{CIDADE_EXEMPLO}` = a primeira cidade da lista, `{LISTA_ASSUNTOS}`, `{PERGUNTAS_FEITAS}`, `{MAX_PERGUNTAS}`) antes de enviar.

Testado em 25/10 nos modelos gemini-3.5-flash e gemini-3.5-flash-lite, com as 19 frases da planilha (script `npm run testar-frases` do repositório ByteMe; resultado em `docs/relatorio-testes.md`).

## Como o código usa
1. `system` = o texto da seção "Prompt", com os campos preenchidos.
2. `messages` = a conversa até agora (cidadão e perguntas da IA).
3. Pedir saída em JSON no formato da seção "Schema" (Gemini: `responseMimeType: "application/json"` + schema; Groq: modo JSON/structured outputs). Conferir na documentação de cada um, ao implementar, como ele marca campo que "pode ser nulo".
4. Validar a resposta com Zod **sempre**, mesmo com schema na API. Se falhar: tentar 1 vez de novo; se falhar de novo, cair em "ficha parcial para humano".
5. O código decide tudo o que vem depois (seção 9 do guia). O campo `pergunta_pendente` é ignorado quando `PERGUNTAS_FEITAS >= MAX_PERGUNTAS`, mesmo que a IA mande.

`LISTA_ASSUNTOS` vem da aba "Assuntos" da planilha, uma linha por assunto com status "Confirmado", só com o necessário (economiza tokens, o que importa no limite grátis do Groq). `exige_cidade` não é coluna da planilha: o código calcula (`sim` quando competência = TJPA e resolve_na_hora = N).
```
consumidor_produto_defeito | Produto com defeito ou loja que não troca | "minha geladeira quebrou e a loja não troca" | exige_valor=sim | exige_cidade=sim
certidao | Pedir certidão (ex.: nada consta) | "preciso de certidão pra entregar no emprego" | exige_valor=nao | exige_cidade=nao
```

## Prompt

O texto completo do prompt fica em [`lib/prompt.ts`](../lib/prompt.ts) (constante `MODELO`), para não haver duas versões diferentes. Seções: tarefa; regras invioláveis; como entender quem fala (gírias, tradução do jeito do povo, mensagem confusa); campos da ficha; como fazer a pergunta; situações especiais; exemplos; dados do sistema; formato da resposta.

## Schema da ficha (JSON Schema)
```json
{
  "type": "object",
  "properties": {
    "risco_imediato":       { "type": "boolean" },
    "quer_humano":          { "type": "boolean" },
    "assunto_id":           { "type": "string" },
    "confianca":            { "type": "number", "minimum": 0, "maximum": 1 },
    "cidade":               { "type": ["string", "null"] },
    "contra_quem":          { "type": ["string", "null"] },
    "valor_estimado_reais": { "type": ["number", "null"] },
    "urgencia":             { "type": "string", "enum": ["baixa", "media", "alta"] },
    "prazo_iminente":       { "type": "boolean" },
    "tipo_autor":           { "type": ["string", "null"], "enum": ["pessoa_fisica", "mei_me_epp", "outra_empresa", null] },
    "campos_sem_resposta":  { "type": "array", "items": { "type": "string" } },
    "resumo":               { "type": "string" },
    "pergunta_pendente":    { "type": ["string", "null"] }
  },
  "required": ["risco_imediato", "quer_humano", "assunto_id", "confianca", "cidade",
               "contra_quem", "valor_estimado_reais", "urgencia", "tipo_autor", "resumo", "pergunta_pendente"],
  "additionalProperties": false
}
// prazo_iminente e campos_sem_resposta são opcionais na validação (Zod) para não quebrar respostas antigas.
```

## Checagens que o código faz por cima da IA
- `assunto_id` não está na tabela → trata como `"indefinido"`.
- `cidade` fora da lista → `"outra"` → atendente.
- `cidade` null e só uma cidade atendida → o código assume essa cidade (demo: Ananindeua). Quando entrar Belém, a IA volta a perguntar.
- A resposta da IA pode vir dentro de ```json ... ```: remover as cercas antes de validar.
- `tipo_autor` null (falou de empresa sem dizer o porte) → falta dado → atendente com a ficha.
- `risco_imediato` da IA **ou** palavra da lista de risco → emergência (seção 9 do guia).
- Guardar o JSON cru de cada chamada junto ao protocolo: é a auditoria ("cada decisão gravada com o motivo").

## Riscos deste prompt
- **Exemplos viciam:** com só 2 exemplos, a IA pode puxar casos parecidos para "consumidor" ou "pensão". Se as frases de teste mostrarem isso, troque ou adicione exemplos.
- **Prompt grande gasta cota:** cada assunto a mais na lista custa tokens em toda chamada. Com 25 assuntos de uma linha, o prompt fica em torno de 2 a 3 mil tokens (estimativa, não medido).
- **Injeção de instrução:** a regra 1 reduz, mas não elimina. Por isso a decisão final nunca sai do texto da IA, só da ficha validada.
