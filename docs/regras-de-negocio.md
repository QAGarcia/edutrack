# Regras de negócio

Especificação funcional do EduTrack. **Use este documento como fonte de verdade para derivar casos de teste.**
Cada regra tem um identificador (`RNxx`) para você referenciar nos nomes dos testes e nos relatórios.

## Convenções da API

| Status | Quando | `code` típico |
|---|---|---|
| `400` | Dados inválidos (formato, tamanho, tipo, campo não permitido, UUID inválido) | `VALIDATION_ERROR` |
| `401` | Sem token, token inválido/expirado, credenciais erradas | `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| `403` | Autenticado, mas sem permissão (perfil errado, recurso de outra pessoa, conta desativada no login) | `FORBIDDEN`, `USER_INACTIVE`, `INVALID_SCOPE` |
| `404` | Recurso inexistente **ou invisível** para quem pede (ex.: rascunho para aluno) | `NOT_FOUND` |
| `409` | Conflito de estado/unicidade | `EMAIL_TAKEN`, `ALREADY_ENROLLED`, `COURSE_FULL`, `ASSESSMENT_EXISTS`, `COURSE_HAS_ENROLLMENTS`, `CATEGORY_EXISTS` |
| `422` | Requisição válida, mas viola uma regra de negócio | ver regras abaixo |
| `429` | Limite de tentativas de login excedido | `RATE_LIMITED` |

Todo erro tem o formato:

```json
{
  "statusCode": 422,
  "code": "COURSE_WITHOUT_LESSONS",
  "message": "Adicione ao menos uma aula antes de publicar",
  "details": [{ "field": "title", "message": "título deve ter ao menos 5 caracteres" }],
  "path": "/api/courses/…/publish",
  "timestamp": "2026-09-28T12:00:00.000Z",
  "requestId": "8f0c…"
}
```

`details` só aparece em erros de validação. Todo response traz o header `X-Request-Id`.
**Dica de teste:** compare o `code`, que é estável; a `message` é texto para humanos e pode mudar.

---

## Autenticação e conta

| ID | Regra | Resultado esperado |
|---|---|---|
| RN01 | Cadastro exige nome (3–120), e-mail válido (até 160) e senha de 8–64 caracteres com maiúscula, minúscula e número. | `400 VALIDATION_ERROR` com `details` por campo |
| RN02 | E-mail é único e normalizado (trim + minúsculas). `  Ana@X.com ` e `ana@x.com` são o mesmo e-mail. | `409 EMAIL_TAKEN` |
| RN03 | No cadastro, o perfil só pode ser `STUDENT` (padrão) ou `TEACHER`. | `ADMIN` → `400` |
| RN04 | O cadastro já devolve o token (usuário entra logado). | `201` com `accessToken` |
| RN05 | Login com e-mail inexistente ou senha errada devolve a **mesma** mensagem genérica. | `401 INVALID_CREDENTIALS` |
| RN06 | Conta desativada não consegue entrar. | `403 USER_INACTIVE` |
| RN07 | Desativar um usuário invalida as sessões dele **imediatamente** (o token existente deixa de funcionar). | `401` na próxima requisição |
| RN08 | Login tem limite de tentativas por minuto por IP (`LOGIN_RATE_LIMIT`, padrão 30 em dev). | `429 RATE_LIMITED` |
| RN09 | Campos não previstos no corpo são rejeitados (proteção contra *mass assignment*). | `400`, detalhe "campo não permitido" |
| RN10 | Trocar a senha exige a senha atual correta. | `422 INVALID_CURRENT_PASSWORD` |
| RN11 | Perfil: nome 3–120, bio até 300. E-mail e perfil não são editáveis pelo próprio usuário. | `400` |

## Usuários (admin)

| ID | Regra | Resultado esperado |
|---|---|---|
| RN12 | Apenas `ADMIN` lista e gerencia usuários. | outros → `403` |
| RN13 | Filtros: busca por nome/e-mail (parcial, sem diferenciar maiúsculas), perfil e situação (ativo/desativado). Paginação máx. 50. | — |
| RN14 | O admin não pode desativar a si mesmo. | `422 CANNOT_DEACTIVATE_SELF` |

## Cursos

| ID | Regra | Resultado esperado |
|---|---|---|
| RN15 | Criar curso: `TEACHER` ou `ADMIN`. Título 5–120, resumo 10–200, descrição até 5000, categoria existente, nível `BEGINNER/INTERMEDIATE/ADVANCED`, carga 1–400 h, vagas 1–500. | `400`; categoria inexistente → `422 INVALID_CATEGORY` |
| RN16 | Todo curso nasce como `DRAFT`. O `slug` é gerado do título (sem acento, minúsculo, com hífens) e é único (`-2`, `-3`… se repetir). | — |
| RN17 | Ciclo de vida: `DRAFT → PUBLISHED → ARCHIVED`. Qualquer outra transição é inválida. | `422 INVALID_STATUS_TRANSITION` |
| RN18 | Só publica curso com **pelo menos 1 aula**. | `422 COURSE_WITHOUT_LESSONS` |
| RN19 | Só o professor dono do curso ou um admin altera, publica, arquiva, exclui ou gerencia aulas. | outro professor → `403` |
| RN20 | Curso arquivado é somente leitura (curso e aulas). | `422 COURSE_NOT_EDITABLE` |
| RN21 | Vagas não podem ficar abaixo do número de matrículas **ativas**. | `422 CAPACITY_BELOW_ENROLLED` |
| RN22 | Só se exclui curso em `DRAFT` (a exclusão é definitiva e remove as aulas). Cursos publicados ou arquivados devem ser arquivados, nunca excluídos. | publicado/arquivado → `422 INVALID_STATUS_TRANSITION` |

## Catálogo e visibilidade

| ID | Regra | Resultado esperado |
|---|---|---|
| RN23 | O catálogo (`scope=catalog`, padrão) mostra só cursos `PUBLISHED`, para qualquer pessoa, logada ou não. | — |
| RN24 | `scope=mine` é só para professor e lista os cursos dele em qualquer status. `scope=all` é só para admin. | uso indevido → `403 INVALID_SCOPE` |
| RN25 | Busca parcial em título e resumo, **sem diferenciar maiúsculas/minúsculas e acentos** (`matematica` encontra "Matemática"). Caracteres `%` e `_` são tratados como texto literal. | — |
| RN26 | Filtros: categoria (slug), nível, professor. Ordenação: `newest` (padrão), `oldest`, `title`, `popular` (mais alunos ativos). Empates são desempatados por título e id, para a paginação ser estável. | — |
| RN27 | Paginação: `page ≥ 1`, `limit` de 1 a 50 (padrão 12). | fora da faixa → `400` |
| RN28 | Detalhe por id **ou** slug. Rascunho só é visível para o dono e para admin; para os demais, é como se não existisse. Curso arquivado continua visível por link direto. | rascunho para terceiros → `404` |
| RN29 | O detalhe informa, para quem está logado: se é dono, se já tem matrícula ativa e se pode se matricular (`viewer.canEnroll`). | — |

## Aulas

| ID | Regra | Resultado esperado |
|---|---|---|
| RN30 | Aula: título 3–120, conteúdo até 20.000, duração 1–600 min. Novas aulas entram no fim (posição = última + 1). | `400` |
| RN31 | Reordenar exige enviar **todos** os IDs das aulas do curso, sem repetir. As posições ficam contíguas (1..n). | `422 INVALID_LESSON_ORDER` |
| RN32 | Excluir aula reorganiza as posições. Curso publicado não pode ficar sem aulas. | `422 LAST_LESSON_OF_PUBLISHED_COURSE` |
| RN33 | O conteúdo da aula só é acessível ao dono, ao admin ou a aluno com matrícula **ativa** no curso. | demais → `403` |

## Matrículas

| ID | Regra | Resultado esperado |
|---|---|---|
| RN34 | Só `STUDENT` se matricula. | outros → `403` |
| RN35 | Curso inexistente ou em rascunho. | `404` |
| RN36 | Curso arquivado não aceita matrícula. | `422 COURSE_NOT_OPEN` |
| RN37 | No máximo **uma matrícula ativa** por aluno em cada curso (garantido também no banco). | `409 ALREADY_ENROLLED` |
| RN38 | O número de matrículas ativas **nunca** passa do número de vagas, **mesmo com requisições simultâneas** pela última vaga. | `409 COURSE_FULL` |
| RN39 | O aluno pode cancelar a própria matrícula (o admin pode cancelar qualquer uma), desde que esteja ativa e **sem notas lançadas**. | outro aluno → `403`; já cancelada → `422 ENROLLMENT_NOT_ACTIVE`; com notas → `422 ENROLLMENT_HAS_GRADES` |
| RN40 | Depois de cancelar, o aluno pode se matricular de novo (nova matrícula, progresso zerado, se houver vaga). | `201` |

## Progresso

| ID | Regra | Resultado esperado |
|---|---|---|
| RN41 | O aluno marca e desmarca aulas como concluídas na própria matrícula ativa. Marcar de novo não duplica nem dá erro (**idempotente**). | `200` |
| RN42 | Progresso = aulas concluídas ÷ total de aulas do curso, em % inteiro (arredondado). | — |
| RN43 | Depois de emitido o certificado, o progresso não pode ser desmarcado. | `422 GRADES_LOCKED` |

## Notas e situação acadêmica

| ID | Regra | Resultado esperado |
|---|---|---|
| RN44 | Só o professor do curso ou um admin lança/corrige notas, e só em matrícula ativa. | outro professor → `403`; cancelada → `422 ENROLLMENT_NOT_ACTIVE` |
| RN45 | Nota de **0 a 10**, até **2 casas decimais**. | `-0.01`, `10.01`, `7.555` → `400` |
| RN46 | Nome da avaliação: 1–20 caracteres (letras, números, espaço e hífen), normalizado para MAIÚSCULAS e sem espaços nas pontas. Único por matrícula (`p1` = `P1`). | `409 ASSESSMENT_EXISTS` |
| RN47 | Média = média aritmética simples, arredondada em 2 casas. | — |
| RN48 | **Situação** (calculada a cada leitura): | |
| | • `CANCELLED` se a matrícula está cancelada; | |
| | • `IN_PROGRESS` se há menos de **2** notas; | |
| | • `FAILED` se a média é **< 6,0**; | |
| | • `IN_PROGRESS` se a média é ≥ 6,0 mas o progresso é **< 75%**; | |
| | • `APPROVED` se a média é **≥ 6,0** e o progresso é **≥ 75%**. | |
| RN49 | Depois de emitido o certificado, as notas ficam bloqueadas. | `422 GRADES_LOCKED` |

## Certificados

| ID | Regra | Resultado esperado |
|---|---|---|
| RN50 | Só o aluno dono emite, e só com situação `APPROVED`. | `422 NOT_APPROVED` |
| RN51 | A emissão é **idempotente**: a primeira chamada cria (`201`); as seguintes devolvem o mesmo certificado (`200`). | — |
| RN52 | Código no formato `EDU-XXXX-XXXX` (sem os caracteres ambíguos 0, O, 1 e I), único. | — |
| RN53 | O certificado guarda um "retrato" dos dados no momento da emissão (nome, curso, professor, carga, média). | — |
| RN54 | A verificação é pública e aceita o código em qualquer caixa. | inexistente → `404` |

## Painéis

| ID | Regra | Resultado esperado |
|---|---|---|
| RN55 | `/dashboard/admin` só para admin: usuários ativos por perfil, cursos por status, matrículas, certificados, top 5 cursos e matrículas recentes. | outros → `403` |
| RN56 | `/dashboard/teacher` só para professor: cursos por status, alunos ativos, média geral e matrículas aguardando notas (ativas com menos de 2 avaliações). | outros → `403` |

## Interface (regras específicas da UI)

| ID | Regra |
|---|---|
| RN57 | Rotas protegidas redirecionam quem não está logado para `/entrar?redirect=<rota>` e, depois do login, voltam para a rota original. |
| RN58 | Perfil sem permissão numa rota vai para `/acesso-negado`. Usuário logado que acessa `/entrar` ou `/cadastro` vai para a própria página inicial. |
| RN59 | Página inicial por perfil: aluno → `/meu-aprendizado`, professor → `/professor`, admin → `/admin`. |
| RN60 | Os filtros do catálogo ficam na URL (`busca`, `categoria`, `nivel`, `ordem`, `pagina`): a página é compartilhável, e "voltar" desfaz o filtro. Mudar um filtro volta para a página 1. |
| RN61 | Paginação: "Anterior" fica desabilitado na primeira página e "Próxima", na última. |
| RN62 | Ações destrutivas (cancelar matrícula, excluir aula ou curso, arquivar, desativar usuário) pedem confirmação num diálogo. |
| RN63 | Os formulários validam no navegador **e** no servidor. Erros de validação do servidor aparecem no campo correspondente. |
| RN64 | Sessão expirada ou inválida (401) desloga e leva para `/entrar?sessao=expirada`. |
| RN65 | No player, a aula atual fica fixa na URL (`/aprender/:matricula/:aula`); concluir uma aula não muda a tela sozinho. |
