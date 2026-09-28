# Massa de dados (seed)

Criada por `npm run db:reset` (terminal) ou `POST /api/testing/reset` (API, só com `ENABLE_TEST_ROUTES=true`).
**Senha de todos os usuários: `Senha@123`.** Os IDs mudam a cada reset; localize os registros por e-mail, título ou slug.

## Usuários

| E-mail | Nome | Perfil | Observação |
|---|---|---|---|
| admin@edutrack.dev | Helena Admin | ADMIN | |
| marina.prof@edutrack.dev | Marina Lopes | TEACHER | Playwright, Arquitetura de Testes, IA, UX, Kubernetes (rascunho sem aulas) |
| carlos.prof@edutrack.dev | Carlos Mendes | TEACHER | SQL, Matemática Financeira, Gestão Ágil, Estatística (rascunho com aulas) |
| renata.prof@edutrack.dev | Renata Oliveira | TEACHER | Didática, Metodologias, Redação, Inglês, Primeiros Socorros, Pedagogia (arquivado) |
| aluno@edutrack.dev | João Pereira | STUDENT | Vários cenários (ver abaixo) |
| beatriz@edutrack.dev | Beatriz Santos | STUDENT | Aprovada **sem** certificado (pronta para emitir) |
| lucas@edutrack.dev | Lucas Almeida | STUDENT | **Sem matrículas**: bom para fluxos "do zero" |
| camila@edutrack.dev | Camila Rocha | STUDENT | Ocupa a última vaga de Didática |
| rafael@edutrack.dev | Rafael Costa | STUDENT | Matrícula cancelada; média 6 com progresso baixo |
| juliana@edutrack.dev | Juliana Ferreira | STUDENT | Aprovada no limite (média exatamente 6,0) |
| ana@edutrack.dev | Ana Clara Dias | STUDENT | Matrículas novas, pouco progresso |
| pedro@edutrack.dev | Pedro Martins | STUDENT | **Conta desativada** |

## Cursos

15 cursos: **12 publicados**, 2 rascunhos e 1 arquivado, em 7 categorias.

| Curso (slug) | Status | Vagas | Particularidade |
|---|---|---|---|
| `playwright-com-typescript-do-zero` | PUBLISHED | 50 | 6 aulas; dois alunos aprovados |
| `arquitetura-de-testes-automatizados` | PUBLISHED | 25 | Único curso `ADVANCED` publicado |
| `sql-para-analise-de-dados` | PUBLISHED | 60 | Tem matrícula de conta desativada |
| `didatica-no-ensino-superior` | PUBLISHED | **2** | **Lotado (2/2)**: teste de `COURSE_FULL` |
| `matematica-financeira-aplicada` | PUBLISHED | 30 | João reprovado |
| `estatistica-aplicada-a-negocios` | **DRAFT** | 30 | Rascunho com 2 aulas (publicável) |
| `kubernetes-na-pratica` | **DRAFT** | 20 | Rascunho **sem aulas** (não publicável) |
| `fundamentos-de-pedagogia-turma-2024` | **ARCHIVED** | 40 | Arquivado, com certificado emitido |

## Cenários de matrícula

| Aluno | Curso | Progresso | Notas | Situação | Certificado |
|---|---|---|---|---|---|
| João | Playwright | 100% | 8 / 9 | APPROVED | `EDU-JOAO-PLAY` |
| João | SQL | 60% | 7 | IN_PROGRESS (1 nota) | — |
| João | Matemática Financeira | 100% | 4 / 5,5 | FAILED | — |
| João | Arquitetura de Testes | 0% | — | IN_PROGRESS | — |
| Beatriz | Playwright | 100% | 7 / 8 | APPROVED | **não emitido** |
| Beatriz | Didática | 33% | — | IN_PROGRESS | — |
| Beatriz | Pedagogia (arquivado) | 100% | 9 / 8,5 | APPROVED | `EDU-BEAT-PEDA` |
| Camila | Didática | 0% | — | IN_PROGRESS | — |
| Rafael | Gestão Ágil | 0% | — | CANCELLED | — |
| Rafael | Redação Acadêmica | 50% | 6 / 6 | IN_PROGRESS (média ok, progresso < 75%) | — |
| Juliana | Inglês Instrumental | 100% | 5,5 / 6,5 | APPROVED (média = 6,0) | — |
| Ana | UX Design | 0% | — | IN_PROGRESS | — |
| Ana | Metodologias Ativas | 67% | — | IN_PROGRESS | — |
| Pedro | SQL | 20% | — | IN_PROGRESS | — |
