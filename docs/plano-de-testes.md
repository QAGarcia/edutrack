# Plano de testes: EduTrack

| | |
|---|---|
| **Versão** | 1.0 (28/09/2026) |
| **Sistema sob teste (SUT)** | EduTrack: API NestJS (`apps/api`) + web React (`apps/web`) |
| **Base de referência** | [regras-de-negocio.md](regras-de-negocio.md) (RN01–RN65), [massa-de-dados.md](massa-de-dados.md), [openapi.json](openapi.json) e leitura do código-fonte |
| **Ferramentas** | Playwright + TypeScript (API e E2E), GitHub Actions |

O plano foi construído passo a passo. Cada passo usa a saída do anterior:

1. [Entender o produto e definir o escopo](#passo-1-escopo-e-premissas)
2. [Analisar riscos](#passo-2-análise-de-risco)
3. [Definir a estratégia (níveis, técnicas, dados, ambiente)](#passo-3-estratégia-de-testes)
4. [Modelar as regras (permissões, limites, decisões, estados)](#passo-4-modelagem-das-regras)
5. [Derivar os casos de teste](#passo-5-casos-de-teste)
6. [Registrar hipóteses de defeito e dúvidas para o PO](#passo-6-achados-da-análise-e-perguntas-ao-po)
7. [Definir critérios, métricas e execução no CI](#passo-7-execução-critérios-e-métricas)
8. [Rastreabilidade RN → casos de teste](#passo-8-rastreabilidade)

---

## Passo 1: escopo e premissas

### 1.1 Objetivo
Dar confiança de que as regras de negócio de **matrícula, avaliação e certificação** estão corretas, de que os **controles de acesso** entre perfis são respeitados, e de que as **jornadas principais** de aluno, professor e admin funcionam de ponta a ponta. Os testes devem ser rápidos e determinísticos o bastante para rodar em todo push.

### 1.2 Dentro do escopo
| Área | Regras |
|---|---|
| Autenticação, conta e sessão | RN01–RN11 |
| Gestão de usuários (admin) | RN12–RN14 |
| Cursos e ciclo de vida | RN15–RN22 |
| Catálogo, busca e visibilidade | RN23–RN29 |
| Aulas | RN30–RN33 |
| Matrículas | RN34–RN40 |
| Progresso, notas e situação acadêmica | RN41–RN49 |
| Certificados | RN50–RN54 |
| Painéis | RN55–RN56 |
| Regras de interface | RN57–RN65 |
| Contrato da API | Formato de erro, `X-Request-Id`, schemas do OpenAPI |

### 1.3 Fora do escopo (nesta versão)
- Carga e performance: a concorrência é tratada só como **corretude** (RN38), não como volume.
- Regressão visual e testes cross-browser além de Chromium. Firefox e WebKit entram como fase opcional.
- Pentest completo. Aqui entram apenas controles de acesso, *mass assignment* e força bruta, que estão na especificação.
- Unitários da API: são responsabilidade do time de desenvolvimento. O plano recomenda cobrir `academic-policy.ts` por unitário, mas não os implementa.

### 1.4 Premissas
- Ambiente com `ENABLE_TEST_ROUTES=true`, que habilita `POST /api/testing/reset` e o seed determinístico.
- Os IDs mudam a cada reset. Os testes localizam os registros por **e-mail, slug ou título**, nunca por ID fixo.
- A asserção de erro compara o **`code`**, que é estável, e nunca a `message`, que é texto para humanos.
- A especificação (RN) é a fonte de verdade. Onde o código diverge ou a regra é ambígua, o ponto é registrado no [Passo 6](#passo-6-achados-da-análise-e-perguntas-ao-po) e não "corrigido" no teste.

---

## Passo 2: análise de risco

### 2.1 Método
**Risco = Probabilidade × Impacto**, cada um numa escala de 1 a 3.

- **Impacto:** 3 = dinheiro, dados acadêmicos, fraude ou segurança; 2 = funcionalidade importante degradada; 1 = incômodo ou cosmético.
- **Probabilidade:** estimada pela complexidade da regra, pela presença de concorrência ou cálculo, e pelos indícios encontrados na leitura do código (Passo 6).
- **Nível:** 🔴 Alto (6–9) · 🟡 Médio (3–4) · 🟢 Baixo (1–2).

O nível define a **prioridade**, a **profundidade** (quantas técnicas se aplicam) e **quando roda** (smoke em todo push ou regressão completa).

### 2.2 Riscos de produto

| ID | Risco | RNs | I | P | Nível | Resposta |
|---|---|---|---|---|---|---|
| R01 | **Aprovação ou reprovação indevida**: média, progresso ou situação calculados errado, principalmente nos limiares (6,0 e 75%) e no arredondamento | RN42, RN47, RN48 | 3 | 3 | 🔴 9 | Tabela de decisão + valores limite + dados sintéticos precisos. Achados A1/A2 |
| R02 | **Quebra de controle de acesso**: um perfil ou usuário acessa ou altera recurso de outro (IDOR) | RN12, RN19, RN24, RN28, RN33, RN34, RN39, RN44, RN50, RN55, RN56 | 3 | 2 | 🔴 6 | Matriz de permissões completa por API |
| R03 | **Superlotação de curso** por requisições simultâneas ou por redução de vagas | RN21, RN37, RN38 | 3 | 2 | 🔴 6 | Testes de concorrência dedicados. Achado A11 |
| R04 | **Certificado indevido, duplicado ou inconsistente**: emissão sem aprovação, falha de idempotência, snapshot errado | RN50–RN54 | 3 | 2 | 🔴 6 | Tabela de decisão + idempotência (sequencial e concorrente). Achado A3 |
| R05 | **Conta desativada mantém acesso** | RN06, RN07, RN14 | 3 | 2 | 🔴 6 | Testes de sessão por API. Achado A4 |
| R06 | **Adulteração acadêmica após certificação**: notas ou progresso alterados depois da emissão | RN43, RN49 | 3 | 1 | 🟡 3 | Negativos diretos |
| R07 | **Escalonamento de privilégio no cadastro ou perfil** (*mass assignment*: `role=ADMIN`, `isActive`, `email`) | RN03, RN09, RN11 | 3 | 1 | 🟡 3 | Negativos com campos extras |
| R08 | **Ciclo de vida do curso violado**: publicar sem aula, editar arquivado, excluir publicado | RN17, RN18, RN20, RN22, RN32 | 2 | 2 | 🟡 4 | Transição de estados (todas as combinações estado × evento) |
| R09 | **Força bruta e enumeração de contas no login** | RN05, RN08 | 2 | 2 | 🟡 4 | Negativos + limite de tentativas. Achado A8 |
| R10 | **Validação de entrada falha** (aceita inválido ou rejeita válido) | RN01, RN11, RN15, RN30, RN45, RN46 | 2 | 2 | 🟡 4 | Partição de equivalência + valores limite |
| R11 | **Catálogo incorreto**: busca, filtros, ordenação ou paginação instável | RN23–RN27 | 2 | 2 | 🟡 4 | Partição + pairwise dos filtros + suposição de erro (`%`, `_`, acentos) |
| R12 | **Indicadores errados nos painéis** | RN55, RN56 | 2 | 2 | 🟡 4 | Oráculo calculado a partir da massa conhecida |
| R13 | **Navegação e sessão na UI**: redirecionamentos, URL de filtros, sessão expirada | RN57–RN65 | 2 | 2 | 🟡 4 | E2E focado |
| R14 | **Mudança no conteúdo do curso altera a situação dos alunos** (nova aula reduz o progresso de quem já estava aprovado) | RN42, RN48 | 2 | 2 | 🟡 4 | Teste de efeito colateral. Achado A6 |
| R15 | **Vazamento de rascunho** para terceiros | RN28, RN35 | 2 | 1 | 🟢 2 | Negativos de visibilidade |
| R16 | **Ordem das aulas corrompida** (posições não contíguas) | RN30–RN32 | 1 | 2 | 🟢 2 | Positivos + negativos de reordenação |
| R17 | **Perfil e senha** | RN10, RN11 | 2 | 1 | 🟢 2 | Positivos + negativos |

### 2.3 Riscos do projeto de teste
São os riscos que ameaçam a **confiabilidade da suíte**, não do produto.

| ID | Risco | Mitigação |
|---|---|---|
| PR1 | **O rate limit do login derruba a suíte no CI.** O código usa padrão 10 tentativas/min, o `.env.example` usa 30, e o CI não define a variável, então valem **10** (achado A7) | Autenticar **uma vez por perfil** (`storageState` / token em fixture de escopo worker). Nunca fazer login pela UI em cada teste. Testar o RN08 isolado, num projeto próprio |
| PR2 | **Workers paralelos disputam os mesmos dados do seed** e geram falsos negativos | Dados do seed são **somente leitura**. Todo teste que altera estado cria os próprios dados via API (factories: usuário novo, curso novo) |
| PR3 | **Os IDs mudam a cada reset** | Buscar por e-mail, slug ou título. Helpers de lookup no cliente de API |
| PR4 | **Testes de concorrência intermitentes** | Projeto Playwright separado, `workers: 1`, disparo com `Promise.all` e asserção sobre o **conjunto** de respostas (quantos 201 e quantos 409), nunca sobre a ordem |
| PR5 | **O reset no meio da execução apaga dados de outro worker** | Reset **apenas** no *global setup* |

---

## Passo 3: estratégia de testes

### 3.1 Distribuição por nível
Regra de negócio se prova **na API**, que é mais rápida, estável e precisa. A UI prova que **as peças estão conectadas** e testa as regras que só existem nela.

| Nível | Participação | O que cobre |
|---|---|---|
| **API (funcional)** | ~70% | Todas as RN01–RN56: validação, permissões, estados, cálculos, idempotência |
| **API (contrato)** | transversal | Toda resposta valida contra o schema do OpenAPI. Formato de erro padrão, `X-Request-Id` presente |
| **API (concorrência)** | pontual | RN37, RN38, RN51 sob requisições simultâneas |
| **E2E (UI)** | ~25% | Jornadas críticas por perfil + RN57–RN65 |
| **Acessibilidade** | pontual | `axe` nas páginas principais (catálogo, login, player, turma) |

### 3.2 Técnicas de teste aplicadas
| Técnica | Sigla | Onde se aplica |
|---|---|---|
| Partição de equivalência | PE | Campos de formulário, perfis, filtros |
| Análise de valor limite (2 valores) | AVL | Tamanhos (RN01, RN11, RN15, RN30), notas (RN45), média e progresso (RN48), vagas (RN21, RN38), paginação (RN27) |
| Tabela de decisão | TD | Situação acadêmica (RN48), emissão de certificado (RN50/51), cancelamento (RN39) |
| Transição de estados | TE | Ciclo de vida do curso (RN17–RN22), matrícula ACTIVE ↔ CANCELLED (RN39/40) |
| Matriz de permissões | MP | Todas as ações × perfis (RN12, RN19, RN24, RN33, RN34...) |
| Pairwise | PW | Combinações de filtros do catálogo (RN26) |
| Idempotência | ID | RN41, RN51 |
| Concorrência | CC | RN37, RN38, RN51 |
| Suposição de erro | SE | `%`/`_` na busca, e-mail com espaços e maiúsculas, UUID inválido, campos extras, token adulterado |
| Teste baseado em cenário (jornada) | JN | E2E ponta a ponta |

### 3.3 Estratégia de dados
| Tipo de dado | Origem | Uso |
|---|---|---|
| **Referência (somente leitura)** | Seed (`massa-de-dados.md`) | Catálogo, visibilidade, situações pré-montadas (Juliana 6,0; Rafael 50%; Didática lotada) |
| **Descartável (por teste)** | Factories via API: `registerStudent()`, `createCourse({ lessons: n, capacity })`, `enroll()`, `grade()` | Tudo que muda estado. Isola os workers |
| **Sintético preciso** | Curso criado com N aulas exatas | Limiares de progresso (3/4 = 75%, 2/3 = 67%) e de média |

⚠️ **Não valide o formato RN52 nos certificados do seed.** Os códigos `EDU-JOAO-PLAY` e `EDU-BEAT-PEDA` são fixos e usam a letra `O`, que o gerador exclui. Valide o formato só em certificados **emitidos pelo teste** (achado A10).

### 3.4 Ambiente
- **Local:** `npm run db:reset && npm run build && npm start` (porta 3000, a UI é servida pela API).
- **CI:** o job existente sobe o Postgres como *service*. A suíte roda depois do smoke, com `LOGIN_RATE_LIMIT` definido **explicitamente** (PR1).
- **Tags:** `@smoke` (P1, a cada push), `@regression` (tudo), `@api`, `@e2e`, `@concurrency`, `@security`.

---

## Passo 4: modelagem das regras

### 4.1 Matriz de permissões (API)
Legenda: ✅ permitido · 403 · 404 · 401 = resposta esperada. "Dono" = professor do curso / aluno da matrícula.

| Ação | Anônimo | Aluno | Aluno dono | Professor | Professor dono | Admin |
|---|---|---|---|---|---|---|
| Listar catálogo (`scope=catalog`) | ✅ | ✅ | — | ✅ | — | ✅ |
| `scope=mine` | 403 | 403 | — | ✅ (só os seus) | — | 403 |
| `scope=all` | 403 | 403 | — | 403 | — | ✅ |
| Ver rascunho (detalhe) | 404 | 404 | — | 404 | ✅ | ✅ |
| Criar curso | 401 | 403 | — | ✅ | — | ✅ |
| Editar, publicar, arquivar ou excluir curso | 401 | 403 | — | 403 | ✅ | ✅ |
| Gerenciar aulas | 401 | 403 | — | 403 | ✅ | ✅ |
| Ler conteúdo da aula | 401 | 403 | ✅ (matrícula ativa) | 403 | ✅ | ✅ |
| Matricular-se | 401 | ✅ | — | 403 | 403 | 403 |
| Ver matrícula | 401 | 403 | ✅ | 403 | ✅ | ✅ |
| Cancelar matrícula | 401 | 403 | ✅ | 403 | 403 | ✅ |
| Marcar progresso | 401 | 403 | ✅ | 403 | 403 | 403 |
| Lançar ou corrigir nota | 401 | 403 | 403 | 403 | ✅ | ✅ |
| Emitir certificado | 401 | 403 | ✅ | 403 | 403 | 403 |
| Verificar certificado | ✅ | ✅ | — | ✅ | — | ✅ |
| Listar e gerenciar usuários | 401 | 403 | — | 403 | — | ✅ |
| `/dashboard/admin` | 401 | 403 | — | 403 | — | ✅ |
| `/dashboard/teacher` | 401 | 403 | — | ✅ | — | 403 |

> A matriz vira **um único teste parametrizado** (`test.describe` + `for` sobre as linhas). Cada célula é um caso de teste com relatório próprio. São ~100 verificações baratas, e esse é o tipo de cobertura que pega o bug de segurança mais comum em APIs (IDOR).

### 4.2 Análise de valor limite

| Campo (RN) | Inválido abaixo | Válido (mín.) | Válido (máx.) | Inválido acima |
|---|---|---|---|---|
| Nome do usuário (RN01, RN11) | 2 caracteres | 3 | 120 | 121 |
| E-mail (RN01) | — | — | 160 | 161 |
| Senha (RN01) | 7 | 8 | 64 | 65 |
| Bio (RN11) | — | 0 (vazia) | 300 | 301 |
| Título do curso (RN15) | 4 | 5 | 120 | 121 |
| Resumo do curso (RN15) | 9 | 10 | 200 | 201 |
| Descrição do curso (RN15) | — | 0 | 5000 | 5001 |
| Carga horária (RN15) | 0 | 1 | 400 | 401 |
| Vagas (RN15) | 0 | 1 | 500 | 501 |
| Vagas × matrículas ativas (RN21) | ativas − 1 | = ativas | — | — |
| Título da aula (RN30) | 2 | 3 | 120 | 121 |
| Conteúdo da aula (RN30) | — | 0 | 20.000 | 20.001 |
| Duração da aula (RN30) | 0 | 1 | 600 | 601 |
| Nota (RN45) | −0,01 | 0 | 10 | 10,01 |
| Casas decimais da nota (RN45) | — | 0 casas (`8`) | 2 casas (`7.55`) | 3 casas (`7.555`) |
| Nome da avaliação (RN46) | vazio / só espaços | 1 caractere | 20 | 21 |
| `page` (RN27) | 0 | 1 | — | — |
| `limit` (RN27, RN13) | 0 | 1 | 50 | 51 |
| Quantidade de notas (RN48) | 1 nota → `IN_PROGRESS` | 2 notas → avaliado | — | — |
| **Média** (RN48) | 5,99 → `FAILED` | **6,00 → aprovável** | — | — |
| **Progresso** (RN48) | 74% → `IN_PROGRESS` | **75% → aprovável** | — | — |
| Vagas no momento da matrícula (RN38) | última vaga → 201 | — | — | vagas + 1 → 409 |
| Tentativas de login (RN08) | N → aceita | — | — | N + 1 → 429 |

### 4.3 Tabela de decisão: situação acadêmica (RN48)
A ordem das condições importa: a regra é avaliada de cima para baixo.

| Regra | Matrícula | Nº de notas | Média | Progresso | **Situação** | Dado |
|---|---|---|---|---|---|---|
| D1 | CANCELLED | qualquer | qualquer | qualquer | `CANCELLED` | Rafael / Gestão Ágil |
| D2 | ACTIVE | 0 | — | qualquer | `IN_PROGRESS` | João / Arquitetura |
| D3 | ACTIVE | 1 | qualquer | 100% | `IN_PROGRESS` | João / SQL (1 nota) |
| D4 | ACTIVE | ≥ 2 | < 6,0 | 100% | `FAILED` | João / Mat. Financeira (4,75) |
| D5 | ACTIVE | ≥ 2 | < 6,0 | < 75% | `FAILED` (média tem precedência) | factory |
| D6 | ACTIVE | ≥ 2 | ≥ 6,0 | < 75% | `IN_PROGRESS` | Rafael / Redação (6,0 e 50%) |
| D7 | ACTIVE | ≥ 2 | = 6,0 | = 75% | `APPROVED` (duplo limite) | factory (curso com 4 aulas, 3 concluídas) |
| D8 | ACTIVE | ≥ 2 | ≥ 6,0 | 100% | `APPROVED` | Juliana / Inglês (6,0) |

### 4.4 Tabela de decisão: emissão de certificado (RN50/RN51)
| Quem chama | Situação | Já emitido? | Resultado |
|---|---|---|---|
| Outro aluno | qualquer | qualquer | `403` |
| Aluno dono | ≠ APPROVED | não | `422 NOT_APPROVED` |
| Aluno dono | APPROVED | não | `201` + código novo |
| Aluno dono | qualquer | sim | `200` + **mesmo** código |
| Professor ou admin | qualquer | qualquer | `403` (só o aluno emite) |

### 4.5 Tabela de decisão: cancelamento de matrícula (RN39)
| Quem chama | Matrícula ativa? | Tem notas? | Resultado |
|---|---|---|---|
| Aluno dono | sim | não | `200`, status `CANCELLED` |
| Admin | sim | não | `200` |
| Outro aluno | sim | não | `403` |
| Professor (mesmo o dono do curso) | sim | não | `403` |
| Aluno dono | não | — | `422 ENROLLMENT_NOT_ACTIVE` |
| Aluno dono | sim | sim | `422 ENROLLMENT_HAS_GRADES` |

### 4.6 Transição de estados: curso (RN17–RN22, RN32)

```
            publish (≥ 1 aula)          archive
  DRAFT ─────────────────────► PUBLISHED ─────────► ARCHIVED
    │                                                (somente leitura)
    └── delete ──► [excluído]
```

Cobertura **0-switch completa** (todo estado × todo evento):

| Estado \ Evento | publish | archive | delete | editar curso | criar/editar/excluir aula |
|---|---|---|---|---|---|
| **DRAFT** (sem aulas) | ❌ `422 COURSE_WITHOUT_LESSONS` | ❌ `422 INVALID_STATUS_TRANSITION` | ✅ | ✅ | ✅ |
| **DRAFT** (com aulas) | ✅ → PUBLISHED | ❌ `422 INVALID_STATUS_TRANSITION` | ✅ (e as aulas somem) | ✅ | ✅ |
| **PUBLISHED** | ❌ `422 INVALID_STATUS_TRANSITION` | ✅ → ARCHIVED | ❌ `422 INVALID_STATUS_TRANSITION` | ✅ | ✅ (a última aula: `422 LAST_LESSON_OF_PUBLISHED_COURSE`) |
| **ARCHIVED** | ❌ `422 INVALID_STATUS_TRANSITION` | ❌ `422 INVALID_STATUS_TRANSITION` | ❌ `422 INVALID_STATUS_TRANSITION` | ❌ `422 COURSE_NOT_EDITABLE` | ❌ `422 COURSE_NOT_EDITABLE` |

---

## Passo 5: casos de teste

**Legenda.**
Tipo: **✅ Pos** (positivo) · **❌ Neg** (negativo) · **🔶 Borda**.
Nível: **API** · **E2E** · **CC** (concorrência).
Prioridade: **P1** = smoke, roda em todo push · **P2** = regressão · **P3** = regressão estendida.

> O ID do caso vai no **título do teste** (`test('CT-ENR-07 matrícula na última vaga com concorrência @concurrency', ...)`). Assim o relatório do Playwright já nasce rastreável até a regra.

### 5.1 Autenticação e conta (AUTH)
| ID | Cenário | Tipo | Técnica | Nível | Prio | RN |
|---|---|---|---|---|---|---|
| CT-AUTH-01 | Cadastro de aluno com dados válidos devolve `201` com `accessToken` e perfil `STUDENT` por padrão | ✅ Pos | PE | API | P1 | RN01, RN03, RN04 |
| CT-AUTH-02 | Cadastro com `role=TEACHER` cria professor | ✅ Pos | PE | API | P2 | RN03 |
| CT-AUTH-03 | Cadastro com `role=ADMIN` → `400` | ❌ Neg | PE | API | P1 | RN03 |
| CT-AUTH-04 | Senha com 7 / 8 / 64 / 65 caracteres → 400 / 201 / 201 / 400 | 🔶 Borda | AVL | API | P2 | RN01 |
| CT-AUTH-05 | Senha sem maiúscula, sem minúscula ou sem número → `400` com `details` no campo `password` | ❌ Neg | PE | API | P2 | RN01 |
| CT-AUTH-06 | Nome com 2 / 3 / 120 / 121 caracteres; e-mail com 160 / 161 | 🔶 Borda | AVL | API | P3 | RN01 |
| CT-AUTH-07 | Vários campos inválidos de uma vez → `400` com **um `details` por campo** | ❌ Neg | SE | API | P2 | RN01 |
| CT-AUTH-08 | Cadastro com `"  Ana@X.com "` quando `ana@x.com` já existe → `409 EMAIL_TAKEN` | ❌ Neg | SE | API | P1 | RN02 |
| CT-AUTH-09 | Login com e-mail em caixa e espaços diferentes funciona (normalização) | 🔶 Borda | SE | API | P2 | RN02 |
| CT-AUTH-10 | Login válido para cada perfil (aluno, professor, admin) | ✅ Pos | PE | API | P1 | RN05 |
| CT-AUTH-11 | E-mail inexistente e senha errada devolvem **o mesmo** `401 INVALID_CREDENTIALS` com a mesma mensagem | ❌ Neg | SE | API | P1 | RN05 |
| CT-AUTH-12 | Login de conta desativada (Pedro) → `403 USER_INACTIVE` | ❌ Neg | PE | API | P1 | RN06 |
| CT-AUTH-13 | Admin desativa o usuário → o token que ele já tinha recebe `401` na próxima requisição | ❌ Neg | TE | API | P1 | RN07 |
| CT-AUTH-14 | Usuário reativado: o **token antigo** volta a funcionar? (ver A4) | 🔶 Borda | SE | API | P2 | RN07 |
| CT-AUTH-15 | N logins no minuto são aceitos; o N+1 → `429 RATE_LIMITED` (projeto isolado) | 🔶 Borda | AVL | API | P2 | RN08 |
| CT-AUTH-16 | Cadastro com campo extra (`isActive`, `id`) → `400` "campo não permitido" | ❌ Neg | SE | API | P1 | RN09 |
| CT-AUTH-17 | Troca de senha com a senha atual correta → `204`; login com a nova funciona e com a antiga falha | ✅ Pos | TE | API | P2 | RN10 |
| CT-AUTH-18 | Troca de senha com a senha atual errada → `422 INVALID_CURRENT_PASSWORD` | ❌ Neg | PE | API | P2 | RN10 |
| CT-AUTH-19 | Editar o perfil com nome e bio válidos; bio com 300 / 301 | 🔶 Borda | AVL | API | P3 | RN11 |
| CT-AUTH-20 | Editar o perfil enviando `email` ou `role` → `400`, e os dados não mudam | ❌ Neg | SE | API | P1 | RN09, RN11 |
| CT-AUTH-21 | Requisição sem token, com token malformado ou com assinatura adulterada → `401 UNAUTHORIZED` | ❌ Neg | SE | API | P1 | RN07 |

### 5.2 Usuários (USR)
| ID | Cenário | Tipo | Técnica | Nível | Prio | RN |
|---|---|---|---|---|---|---|
| CT-USR-01 | Admin lista usuários paginados | ✅ Pos | PE | API | P2 | RN12, RN13 |
| CT-USR-02 | Aluno e professor listando usuários → `403` | ❌ Neg | MP | API | P1 | RN12 |
| CT-USR-03 | Busca parcial e sem diferenciar caixa por nome e por e-mail (`JOÃO`, `pereira`, `@edutrack`) | ✅ Pos | PE | API | P2 | RN13 |
| CT-USR-04 | Filtro por perfil e por situação (`isActive=false` traz o Pedro) | ✅ Pos | PE | API | P2 | RN13 |
| CT-USR-05 | `limit` 50 / 51 | 🔶 Borda | AVL | API | P3 | RN13 |
| CT-USR-06 | Admin desativa e reativa um usuário | ✅ Pos | TE | API | P2 | RN12 |
| CT-USR-07 | Admin tenta desativar a si mesmo → `422 CANNOT_DEACTIVATE_SELF` | ❌ Neg | SE | API | P1 | RN14 |

### 5.3 Cursos e ciclo de vida (CRS)
| ID | Cenário | Tipo | Técnica | Nível | Prio | RN |
|---|---|---|---|---|---|---|
| CT-CRS-01 | Professor cria curso válido → nasce `DRAFT`, com slug gerado | ✅ Pos | PE | API | P1 | RN15, RN16 |
| CT-CRS-02 | Aluno cria curso → `403` | ❌ Neg | MP | API | P1 | RN15 |
| CT-CRS-03 | Limites de título, resumo, descrição, carga e vagas (tabela 4.2) | 🔶 Borda | AVL | API | P2 | RN15 |
| CT-CRS-04 | Nível fora do enum (`EXPERT`) → `400` | ❌ Neg | PE | API | P3 | RN15 |
| CT-CRS-05 | Categoria com UUID válido e inexistente → `422 INVALID_CATEGORY`; UUID malformado → `400` | ❌ Neg | PE | API | P2 | RN15 |
| CT-CRS-06 | Slug: `"Introdução à Lógica!"` → `introducao-a-logica`; o mesmo título de novo → `-2`, depois `-3` | 🔶 Borda | SE | API | P2 | RN16 |
| CT-CRS-07 | Transições de estado: todas as células da tabela 4.6 | ✅❌ | TE | API | P1 | RN17, RN18, RN20, RN22 |
| CT-CRS-08 | Publicar rascunho sem aulas (Kubernetes) → `422 COURSE_WITHOUT_LESSONS` | ❌ Neg | TE | API | P1 | RN18 |
| CT-CRS-09 | Publicar rascunho com aulas (Estatística) → `PUBLISHED`, aparece no catálogo | ✅ Pos | TE | API | P1 | RN17, RN23 |
| CT-CRS-10 | Outro professor edita, publica, arquiva ou exclui o curso → `403` | ❌ Neg | MP | API | P1 | RN19 |
| CT-CRS-11 | Admin gerencia o curso de qualquer professor | ✅ Pos | MP | API | P2 | RN19 |
| CT-CRS-12 | Editar curso arquivado (Pedagogia) → `422 COURSE_NOT_EDITABLE` | ❌ Neg | TE | API | P2 | RN20 |
| CT-CRS-13 | Reduzir vagas para exatamente o nº de ativos → ok; para ativos − 1 → `422 CAPACITY_BELOW_ENROLLED` | 🔶 Borda | AVL | API | P1 | RN21 |
| CT-CRS-14 | Matrículas **canceladas** não contam no limite de vagas (RN21) | 🔶 Borda | PE | API | P2 | RN21 |
| CT-CRS-15 | Excluir rascunho remove o curso e as aulas (depois, `GET` → `404`) | ✅ Pos | TE | API | P2 | RN22 |
| CT-CRS-16 | Alterar o título atualiza o slug; o slug antigo deixa de resolver | 🔶 Borda | SE | API | P3 | RN16, RN28 |

### 5.4 Catálogo e visibilidade (CAT)
| ID | Cenário | Tipo | Técnica | Nível | Prio | RN |
|---|---|---|---|---|---|---|
| CT-CAT-01 | Catálogo anônimo mostra os **12** publicados, e nenhum rascunho ou arquivado | ✅ Pos | PE | API | P1 | RN23 |
| CT-CAT-02 | `scope=mine` como professor traz só os cursos dele, em todos os status; como aluno ou admin → `403 INVALID_SCOPE` | ✅❌ | MP | API | P1 | RN24 |
| CT-CAT-03 | `scope=all` só para admin; outros → `403 INVALID_SCOPE` | ❌ Neg | MP | API | P2 | RN24 |
| CT-CAT-04 | Busca `matematica` encontra "Matemática Financeira"; `PLAYWRIGHT` encontra em caixa diferente | ✅ Pos | PE | API | P1 | RN25 |
| CT-CAT-05 | Busca por `%` e por `_` → tratados como literais (não trazem o catálogo inteiro) | ❌ Neg | SE | API | P2 | RN25 |
| CT-CAT-06 | Busca no resumo, não só no título | ✅ Pos | PE | API | P3 | RN25 |
| CT-CAT-07 | Filtros por categoria, nível (`ADVANCED` → só Arquitetura de Testes) e professor | ✅ Pos | PE | API | P2 | RN26 |
| CT-CAT-08 | Combinações de filtros + ordenação (conjunto pairwise) | ✅ Pos | PW | API | P3 | RN26 |
| CT-CAT-09 | Cada ordenação (`newest`, `oldest`, `title`, `popular`) retorna na ordem certa | ✅ Pos | PE | API | P2 | RN26 |
| CT-CAT-10 | Paginação estável: percorrer todas as páginas não repete nem perde nenhum curso (mesmo com empate em `popular`) | 🔶 Borda | SE | API | P2 | RN26, RN27 |
| CT-CAT-11 | `page=0`, `limit=0`, `limit=51` → `400`; `limit=1` e `limit=50` → ok; sem `limit` → 12 | 🔶 Borda | AVL | API | P2 | RN27 |
| CT-CAT-12 | Detalhe por id e por slug devolvem o mesmo curso | ✅ Pos | PE | API | P2 | RN28 |
| CT-CAT-13 | Rascunho visto por anônimo, aluno e outro professor → `404`; pelo dono e pelo admin → `200` | ❌ Neg | MP | API | P1 | RN28 |
| CT-CAT-14 | Curso arquivado continua acessível por link direto | 🔶 Borda | PE | API | P2 | RN28 |
| CT-CAT-15 | `viewer`: dono → `isOwner=true`; aluno matriculado → `enrollmentId` preenchido e `canEnroll=false`; curso lotado → `canEnroll=false`; anônimo → `viewer=null` | ✅ Pos | TD | API | P2 | RN29 |

### 5.5 Aulas (LES)
| ID | Cenário | Tipo | Técnica | Nível | Prio | RN |
|---|---|---|---|---|---|---|
| CT-LES-01 | Criar aula: entra na posição `última + 1` | ✅ Pos | PE | API | P2 | RN30 |
| CT-LES-02 | Limites de título, conteúdo e duração (tabela 4.2) | 🔶 Borda | AVL | API | P2 | RN30 |
| CT-LES-03 | Reordenar enviando todos os IDs → posições contíguas `1..n` na nova ordem | ✅ Pos | PE | API | P2 | RN31 |
| CT-LES-04 | Reordenar faltando um ID, com ID repetido ou com ID de outro curso → `422 INVALID_LESSON_ORDER` | ❌ Neg | SE | API | P2 | RN31 |
| CT-LES-05 | Excluir a aula do meio → as posições seguintes descem (`1..n-1`, sem buraco) | ✅ Pos | SE | API | P2 | RN32 |
| CT-LES-06 | Excluir a última aula de um curso publicado → `422 LAST_LESSON_OF_PUBLISHED_COURSE` | 🔶 Borda | AVL | API | P1 | RN32 |
| CT-LES-07 | Excluir a última aula de um **rascunho** → permitido | 🔶 Borda | PE | API | P3 | RN32 |
| CT-LES-08 | Conteúdo da aula: aluno com matrícula ativa → `200`; sem matrícula, com matrícula cancelada ou outro professor → `403` | ✅❌ | MP | API | P1 | RN33 |
| CT-LES-09 | Aula de outro curso na URL (`/courses/A/lessons/<aula de B>`) → `404` | ❌ Neg | SE | API | P3 | RN33 |

### 5.6 Matrículas (ENR)
| ID | Cenário | Tipo | Técnica | Nível | Prio | RN |
|---|---|---|---|---|---|---|
| CT-ENR-01 | Aluno se matricula em curso publicado com vaga → `201`, progresso 0% | ✅ Pos | PE | API | P1 | RN34 |
| CT-ENR-02 | Professor ou admin tentando se matricular → `403` | ❌ Neg | MP | API | P1 | RN34 |
| CT-ENR-03 | Matrícula em curso inexistente e em rascunho → `404`; `courseId` malformado → `400` | ❌ Neg | PE | API | P2 | RN35 |
| CT-ENR-04 | Matrícula em curso arquivado → `422 COURSE_NOT_OPEN` | ❌ Neg | TE | API | P2 | RN36 |
| CT-ENR-05 | Segunda matrícula ativa no mesmo curso → `409 ALREADY_ENROLLED` | ❌ Neg | PE | API | P1 | RN37 |
| CT-ENR-06 | Curso lotado (Didática 2/2) → `409 COURSE_FULL` | 🔶 Borda | AVL | API | P1 | RN38 |
| CT-ENR-07 | **Concorrência:** curso com 1 vaga e 10 alunos diferentes ao mesmo tempo → exatamente **1 × 201** e **9 × 409 COURSE_FULL**; ativos = 1 | 🔶 Borda | CC | CC | P1 | RN38 |
| CT-ENR-08 | **Concorrência:** o mesmo aluno com 5 requisições simultâneas → **1 × 201** e **4 × 409 ALREADY_ENROLLED** | 🔶 Borda | CC | CC | P1 | RN37 |
| CT-ENR-09 | Cancelamento: todas as linhas da tabela 4.5 | ✅❌ | TD | API | P1 | RN39 |
| CT-ENR-10 | Rematrícula após cancelar → `201`, **nova** matrícula com progresso zerado; a antiga continua `CANCELLED` | ✅ Pos | TE | API | P2 | RN40 |
| CT-ENR-11 | Rematrícula quando o curso lotou depois do cancelamento → `409 COURSE_FULL` | 🔶 Borda | TE | API | P3 | RN38, RN40 |
| CT-ENR-12 | Cancelar libera a vaga: curso lotado → cancela uma → outro aluno consegue se matricular | 🔶 Borda | TE | API | P2 | RN21, RN38 |
| CT-ENR-13 | Aluno A consulta a matrícula do aluno B → `403` (IDOR) | ❌ Neg | MP | API | P1 | RN39 |

### 5.7 Progresso, notas e situação (ACD)
| ID | Cenário | Tipo | Técnica | Nível | Prio | RN |
|---|---|---|---|---|---|---|
| CT-ACD-01 | Marcar uma aula como concluída → progresso atualizado | ✅ Pos | PE | API | P1 | RN41, RN42 |
| CT-ACD-02 | Marcar a mesma aula duas vezes → `200`, sem duplicar (progresso inalterado) | 🔶 Borda | ID | API | P2 | RN41 |
| CT-ACD-03 | Desmarcar uma aula → o progresso cai | ✅ Pos | PE | API | P2 | RN41 |
| CT-ACD-04 | Marcar progresso na matrícula de outro aluno → `403`; em matrícula cancelada → `422 ENROLLMENT_NOT_ACTIVE` | ❌ Neg | MP | API | P2 | RN41 |
| CT-ACD-05 | Arredondamento do progresso: 1/3 → 33; 2/3 → 67; 3/4 → 75 | 🔶 Borda | AVL | API | P2 | RN42 |
| CT-ACD-06 | Desmarcar progresso depois do certificado → `422 GRADES_LOCKED` | ❌ Neg | TE | API | P1 | RN43 |
| CT-ACD-07 | Professor dono e admin lançam nota → `201`/`200` com a média recalculada | ✅ Pos | MP | API | P1 | RN44 |
| CT-ACD-08 | Outro professor lança nota → `403`; nota em matrícula cancelada → `422 ENROLLMENT_NOT_ACTIVE` | ❌ Neg | MP | API | P1 | RN44 |
| CT-ACD-09 | Nota −0,01 / 0 / 10 / 10,01 / 7,55 / 7,555 → 400 / ok / ok / 400 / ok / 400 | 🔶 Borda | AVL | API | P1 | RN45 |
| CT-ACD-10 | Nota como string (`"8"`), `null`, `NaN` → `400` | ❌ Neg | SE | API | P3 | RN45 |
| CT-ACD-11 | Avaliação `" p1 "` é salva como `P1`; lançar `p1` de novo → `409 ASSESSMENT_EXISTS` | 🔶 Borda | SE | API | P1 | RN46 |
| CT-ACD-12 | Nome da avaliação: vazio, 21 caracteres, `P_1`, `P1!` → `400`; 1 e 20 caracteres, `PROVA-FINAL 2` → ok | 🔶 Borda | AVL | API | P2 | RN46 |
| CT-ACD-13 | Corrigir uma nota recalcula a média e a situação | ✅ Pos | PE | API | P2 | RN44, RN47 |
| CT-ACD-14 | Média aritmética com 2 casas: `[7, 8, 8]` → `7.67` | ✅ Pos | PE | API | P2 | RN47 |
| CT-ACD-15 | **Situação: linhas D1–D8 da tabela 4.3** | ✅❌🔶 | TD | API | P1 | RN48 |
| CT-ACD-16 | Média exatamente **6,0** com 100% → `APPROVED` (Juliana) | 🔶 Borda | AVL | API | P1 | RN48 |
| CT-ACD-17 | Média **5,99** com 100% → `FAILED` | 🔶 Borda | AVL | API | P1 | RN48 |
| CT-ACD-18 | Notas `[5.99, 6.00]` (média real 5,995) → qual é a situação esperada? (ver A1) | 🔶 Borda | SE | API | P1 | RN47, RN48 |
| CT-ACD-19 | Progresso exatamente **75%** (3/4) com média ≥ 6 → `APPROVED`; **74%** → `IN_PROGRESS` | 🔶 Borda | AVL | API | P1 | RN48 |
| CT-ACD-20 | Progresso real 74,51% (38/51, arredonda para 75) → qual é a situação esperada? (ver A2) | 🔶 Borda | SE | API | P3 | RN42, RN48 |
| CT-ACD-21 | Lançar ou corrigir nota depois do certificado → `422 GRADES_LOCKED` | ❌ Neg | TE | API | P1 | RN49 |
| CT-ACD-22 | Aluno aprovado (sem certificado) + professor adiciona uma aula → o progresso cai e a situação vira `IN_PROGRESS` (ver A6) | 🔶 Borda | SE | API | P2 | RN42, RN48 |

### 5.8 Certificados (CRT)
| ID | Cenário | Tipo | Técnica | Nível | Prio | RN |
|---|---|---|---|---|---|---|
| CT-CRT-01 | Beatriz (aprovada, sem certificado) emite → `201` com código novo | ✅ Pos | TD | API | P1 | RN50, RN51 |
| CT-CRT-02 | Emitir de novo → `200` com o **mesmo** código | 🔶 Borda | ID | API | P1 | RN51 |
| CT-CRT-03 | Emitir com situação `IN_PROGRESS` / `FAILED` / `CANCELLED` → `422 NOT_APPROVED` | ❌ Neg | TD | API | P1 | RN50 |
| CT-CRT-04 | Outro aluno, o professor ou o admin emitindo → `403` | ❌ Neg | MP | API | P1 | RN50 |
| CT-CRT-05 | Código novo casa com `^EDU-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$` (sem 0, O, 1 e I) | 🔶 Borda | SE | API | P2 | RN52 |
| CT-CRT-06 | Unicidade: N certificados emitidos na suíte têm códigos distintos | 🔶 Borda | SE | API | P3 | RN52 |
| CT-CRT-07 | Snapshot: depois de emitir, mudar o título do curso e o nome do aluno → o certificado mantém os valores originais | ✅ Pos | SE | API | P2 | RN53 |
| CT-CRT-08 | Verificação pública sem token: `EDU-JOAO-PLAY`, `edu-joao-play` e `  EDU-JOAO-PLAY  ` → `200 valid=true` | ✅ Pos | PE | API | P1 | RN54 |
| CT-CRT-09 | Código inexistente → `404` | ❌ Neg | PE | API | P2 | RN54 |
| CT-CRT-10 | **Concorrência:** 5 emissões simultâneas da mesma matrícula → 1 × 201, 4 × 200, **um** único código e nenhum `5xx` (ver A3) | 🔶 Borda | CC | CC | P2 | RN51 |

### 5.9 Painéis (DSH)
| ID | Cenário | Tipo | Técnica | Nível | Prio | RN |
|---|---|---|---|---|---|---|
| CT-DSH-01 | `/dashboard/admin` sobre o seed limpo: cursos por status = 12 / 2 / 1; usuários ativos por perfil batem com a massa (Pedro fora) | ✅ Pos | PE | API | P2 | RN55 |
| CT-DSH-02 | `/dashboard/admin` como aluno ou professor → `403` | ❌ Neg | MP | API | P1 | RN55 |
| CT-DSH-03 | `/dashboard/teacher`: "aguardando notas" conta só as matrículas ativas com menos de 2 notas | 🔶 Borda | PE | API | P2 | RN56 |
| CT-DSH-04 | `/dashboard/teacher` como aluno ou admin → `403` | ❌ Neg | MP | API | P2 | RN56 |
| CT-DSH-05 | O indicador reage à ação: matricular um aluno aumenta "alunos ativos" em 1 | ✅ Pos | SE | API | P3 | RN55, RN56 |

> CT-DSH-01 depende de números globais. Ele roda **antes** de qualquer teste que altere estado (projeto `setup` → `readonly`) ou compara o valor antes e depois da ação (CT-DSH-05).

### 5.10 Interface: jornadas e regras de UI (E2E)
| ID | Cenário | Tipo | Técnica | Nível | Prio | RN |
|---|---|---|---|---|---|---|
| CT-E2E-01 | **Jornada do aluno:** catálogo → busca → detalhe → matrícula → player → concluir aulas → ver o progresso em "Meu aprendizado" | ✅ Pos | JN | E2E | P1 | RN23, RN34, RN41, RN65 |
| CT-E2E-02 | **Jornada do certificado:** Beatriz emite o certificado → abre a página pública → verifica o código em `/verificar-certificado` | ✅ Pos | JN | E2E | P1 | RN50–RN54 |
| CT-E2E-03 | **Jornada do professor:** cria curso → adiciona aulas → reordena → publica → o curso aparece no catálogo | ✅ Pos | JN | E2E | P1 | RN15–RN18, RN31 |
| CT-E2E-04 | **Jornada da turma:** o professor lança duas notas → a situação do aluno muda na tela | ✅ Pos | JN | E2E | P1 | RN44, RN48 |
| CT-E2E-05 | **Jornada do admin:** desativa um usuário (com diálogo de confirmação) → esse usuário não consegue mais entrar | ✅ Pos | JN | E2E | P2 | RN06, RN12, RN62 |
| CT-E2E-06 | Anônimo em `/meu-aprendizado` → `/entrar?redirect=/meu-aprendizado` → após o login, volta para a rota original | ✅ Pos | TE | E2E | P1 | RN57 |
| CT-E2E-07 | Aluno em `/admin` → `/acesso-negado`; aluno logado em `/entrar` → `/meu-aprendizado` | ❌ Neg | MP | E2E | P2 | RN58 |
| CT-E2E-08 | Página inicial pós-login por perfil: aluno, professor e admin | ✅ Pos | PE | E2E | P1 | RN59 |
| CT-E2E-09 | Filtros do catálogo refletidos na URL; abrir a URL direto reaplica os filtros; "voltar" desfaz; mudar um filtro volta para a página 1 | 🔶 Borda | TE | E2E | P2 | RN60 |
| CT-E2E-10 | "Anterior" desabilitado na primeira página e "Próxima" desabilitado na última | 🔶 Borda | AVL | E2E | P2 | RN61 |
| CT-E2E-11 | Ações destrutivas abrem um diálogo; "cancelar" no diálogo **não** executa a ação | ❌ Neg | SE | E2E | P2 | RN62 |
| CT-E2E-12 | Validação no navegador (sem requisição) e erro do servidor exibido no campo (e-mail já cadastrado) | ✅❌ | PE | E2E | P2 | RN63 |
| CT-E2E-13 | Token inválido ou expirado no storage → a próxima ação leva para `/entrar?sessao=expirada` | ❌ Neg | SE | E2E | P2 | RN64 |
| CT-E2E-14 | Player: recarregar em `/aprender/:matricula/:aula` mantém a aula; concluir a aula não troca a tela | 🔶 Borda | SE | E2E | P2 | RN65 |
| CT-E2E-15 | Curso lotado: o botão de matrícula fica indisponível no detalhe | 🔶 Borda | PE | E2E | P3 | RN29, RN38 |
| CT-E2E-16 | Acessibilidade (axe, sem violações sérias ou críticas): home, catálogo, login, player, turma | ✅ Pos | — | E2E | P3 | — |

### 5.11 Contrato e convenções da API (API)
| ID | Cenário | Tipo | Técnica | Nível | Prio | RN |
|---|---|---|---|---|---|---|
| CT-API-01 | Toda resposta de sucesso valida contra o schema do `openapi.json` (modo estrito) | ✅ Pos | — | API | P2 | Convenções |
| CT-API-02 | Todo erro tem `statusCode`, `code`, `message`, `path`, `timestamp` e `requestId`; `details` aparece **só** em `400` de validação | ✅ Pos | PE | API | P1 | Convenções |
| CT-API-03 | Header `X-Request-Id` presente em sucesso e em erro, e igual ao `requestId` do corpo | ✅ Pos | PE | API | P2 | Convenções |
| CT-API-04 | UUID inválido em parâmetro de rota → `400 VALIDATION_ERROR` (e não `500`) | ❌ Neg | SE | API | P2 | Convenções |
| CT-API-05 | Nenhum endpoint responde `5xx` na suíte inteira (verificado por um hook global na fixture do cliente de API) | ❌ Neg | SE | API | P1 | Convenções |

**Total: 139 casos** (59 P1 · 64 P2 · 16 P3). Com a matriz de permissões parametrizada (~100 verificações), o total passa de 230 verificações automatizadas.

---

## Passo 6: achados da análise e perguntas ao PO

Estes pontos vêm da **leitura do código comparada com a especificação**. São **hipóteses**: o caso de teste indicado confirma ou descarta cada uma. Os que forem confirmados viram bug report. Os que forem ambiguidade de regra viram pergunta ao PO. Nesses casos, o teste fica marcado com `test.fixme` até a decisão, **nunca** ajustado para "passar".

| ID | Achado | Evidência | Impacto | Caso | Tipo |
|---|---|---|---|---|---|
| **A1** | **A média é arredondada antes de ser comparada com 6,0.** Notas `[5.99, 6.00]` têm média real 5,995, que vira **6,00** e gera `APPROVED`. O mesmo vale para `[6.01, 5.98]` | `average()` + `situationOf()` em `domain/academic-policy.ts` | Aprovação de quem não atingiu a média. Fraude-limite | CT-ACD-18 | ❓ Pergunta ao PO: o limiar vale para a média **exibida** (arredondada) ou para a **real**? |
| **A2** | **O progresso é arredondado antes de ser comparado com 75%.** 38 de 51 aulas = 74,51%, que vira **75** e gera `APPROVED` | `progressPercent()` usa `Math.round` | Baixo na prática (exige cursos com muitas aulas), mas é a mesma classe de defeito do A1 | CT-ACD-20 | ❓ Pergunta ao PO |
| **A3** | **A emissão concorrente de certificado deve responder `500`.** Duas chamadas simultâneas passam pela checagem "já existe?", e a segunda viola o `UNIQUE(enrollment_id)` sem tratamento (a matrícula trata esse caso, o certificado não) | `issueCertificate()` em `enrollments.service.ts` | Clique duplo em "Emitir" gera erro na tela. Viola a idempotência do RN51 | CT-CRT-10 | 🐞 Provável defeito |
| **A4** | **Reativar um usuário "ressuscita" tokens antigos.** O guard só confere `isActive`, e o JWT continua válido até expirar (2 h). A troca de senha também não invalida as sessões abertas | `AuthGuard.resolve()` | RN07 fala em "invalidar sessões": uma sessão roubada volta a valer | CT-AUTH-14 | ❓ Pergunta ao PO / 🔒 segurança |
| **A5** | **Curso arquivado ainda aceita progresso e notas** nas matrículas ativas. O RN20 diz "somente leitura (curso e aulas)", mas `completeLesson()` e `gradable()` não verificam o status do curso | `enrollments.service.ts` | Ambiguidade: o aluno pode concluir um curso depois que ele é arquivado? | novo caso após decisão | ❓ Pergunta ao PO |
| **A6** | **Adicionar uma aula a um curso publicado rebaixa alunos aprovados que ainda não emitiram o certificado** (a situação é recalculada a cada leitura) | `presentEnrollment()` | Um aluno "perde" a aprovação sem ter feito nada | CT-ACD-22 | ❓ Pergunta ao PO (a regra é coerente com o RN42/RN48, mas o efeito é de produto) |
| **A7** | **Divergência no padrão do `LOGIN_RATE_LIMIT`.** A documentação diz "30 em dev", o `.env.example` usa 30, o código usa **10** e o CI não define a variável | `config/env.ts`, `ci.yml` | Suíte intermitente no CI (PR1) | CT-AUTH-15 | 📄 Documentação / configuração |
| **A8** | **Enumeração de contas pelo tempo de resposta.** O `bcrypt.compare` só roda quando o e-mail existe, então e-mail inexistente responde mais rápido. O RN05 protege a mensagem, mas não o tempo | `AuthService.login()` | Um atacante descobre quais e-mails estão cadastrados | fora da suíte funcional: registrar como risco de segurança | 🔒 Segurança |
| **A9** | **`COURSE_HAS_ENROLLMENTS` parece inalcançável:** só rascunho pode ser excluído, e rascunho não aceita matrícula | `CoursesService.remove()` | Código morto, ou existe um caminho não documentado | — | ℹ️ Informativo |
| **A10** | **Os códigos do seed (`EDU-JOAO-PLAY`) contêm `O`**, letra que o RN52 exclui | `massa-de-dados.md` | Um teste de formato sobre o seed falharia por um motivo falso | CT-CRT-05 usa só certificados novos | ℹ️ Dados de teste |
| **A11** | **A redução de vagas (RN21) não usa a mesma trava da matrícula.** Um professor reduzindo vagas ao mesmo tempo que um aluno se matricula pode deixar o curso com ativos > vagas | `CoursesService.update()` sem `pessimistic_write` | Baixa probabilidade, mas quebra a invariante do RN38 | candidato a caso CC futuro | 🐞 Hipótese |

---

## Passo 7: execução, critérios e métricas

### 7.1 Organização da suíte (projetos do Playwright)
| Projeto | Conteúdo | Paralelismo | Quando roda |
|---|---|---|---|
| `setup` | Reset do banco + login de cada perfil (salva o `storageState`) | — | Sempre, primeiro |
| `api-readonly` | Catálogo, visibilidade, painéis sobre o seed limpo | Paralelo | Antes dos que alteram estado |
| `api` | Todo o resto de API, com dados próprios via factories | Paralelo | Todo push |
| `concurrency` | CT-ENR-07, CT-ENR-08, CT-CRT-10 | `workers: 1` | Todo push |
| `rate-limit` | CT-AUTH-15 (isolado, porque consome a cota de login do IP) | `workers: 1` | Por último |
| `e2e` | CT-E2E-* (Chromium) | Paralelo | Todo push (P1) / noturno (completo) |

### 7.2 Critérios de entrada
- O build e o smoke do CI passam (lint, tipos, migrations, seed, health).
- `POST /api/testing/reset` responde `200`.
- A massa de dados confere com `massa-de-dados.md` (checagem no `setup`).

### 7.3 Critérios de saída (para liberar um merge)
- **100% dos casos P1 passando.**
- Nenhum `5xx` em toda a suíte (CT-API-05).
- Cobertura de rastreabilidade: **todas as RN01–RN65 com ao menos um caso** (Passo 8).
- Taxa de flakiness abaixo de 2% nos últimos 20 runs. Um teste intermitente vai para quarentena com issue aberta, e nunca recebe `retries` para esconder o problema.
- Achados A1–A11: cada um fechado como bug aberto, decisão do PO registrada ou descartado com evidência.

### 7.4 Métricas acompanhadas
| Métrica | Para que serve |
|---|---|
| Casos por RN e por nível de risco | Mostra se a cobertura segue o risco (os 🔴 precisam ter mais técnicas aplicadas) |
| Taxa de aprovação por projeto | Saúde da suíte |
| Tempo total no CI (meta: < 5 min) | Garante que a suíte continue rodando em todo push |
| Testes flaky (retry que passou) | Confiabilidade |
| Defeitos por severidade e origem (RN / achado) | Qualidade do produto |

### 7.5 Severidade dos defeitos
| Severidade | Critério | Exemplo |
|---|---|---|
| **Crítica** | Fraude acadêmica, falha de segurança, corrupção de dados | Aprovação indevida (A1), curso acima da capacidade |
| **Alta** | A regra de negócio não é cumprida, sem contorno | Idempotência do certificado quebrada (A3) |
| **Média** | Existe contorno, ou a falha está num fluxo secundário | Filtro de catálogo errado |
| **Baixa** | Cosmético ou de mensagem | Texto de erro diferente do esperado |

---

## Passo 8: rastreabilidade

Todas as 65 regras têm ao menos um caso de teste.

| RN | Casos | RN | Casos | RN | Casos |
|---|---|---|---|---|---|
| RN01 | AUTH-01, 04–07 | RN23 | CAT-01, CRS-09, E2E-01 | RN45 | ACD-09, 10 |
| RN02 | AUTH-08, 09 | RN24 | CAT-02, 03 | RN46 | ACD-11, 12 |
| RN03 | AUTH-01–03 | RN25 | CAT-04–06 | RN47 | ACD-13, 14, 18 |
| RN04 | AUTH-01 | RN26 | CAT-07–10 | RN48 | ACD-15–20, 22, E2E-04 |
| RN05 | AUTH-10, 11 | RN27 | CAT-10, 11 | RN49 | ACD-21 |
| RN06 | AUTH-12, E2E-05 | RN28 | CAT-12–14, CRS-16 | RN50 | CRT-01, 03, 04, E2E-02 |
| RN07 | AUTH-13, 14, 21 | RN29 | CAT-15, E2E-15 | RN51 | CRT-01, 02, 10 |
| RN08 | AUTH-15 | RN30 | LES-01, 02 | RN52 | CRT-05, 06 |
| RN09 | AUTH-16, 20 | RN31 | LES-03, 04, E2E-03 | RN53 | CRT-07 |
| RN10 | AUTH-17, 18 | RN32 | LES-05–07 | RN54 | CRT-08, 09, E2E-02 |
| RN11 | AUTH-19, 20 | RN33 | LES-08, 09 | RN55 | DSH-01, 02, 05 |
| RN12 | USR-01, 02, 06, E2E-05 | RN34 | ENR-01, 02, E2E-01 | RN56 | DSH-03–05 |
| RN13 | USR-01, 03–05 | RN35 | ENR-03 | RN57 | E2E-06 |
| RN14 | USR-07 | RN36 | ENR-04 | RN58 | E2E-07 |
| RN15 | CRS-01–05, E2E-03 | RN37 | ENR-05, 08 | RN59 | E2E-08 |
| RN16 | CRS-01, 06, 16 | RN38 | ENR-06, 07, 11, 12, E2E-15 | RN60 | E2E-09 |
| RN17 | CRS-07, 09 | RN39 | ENR-09, 13 | RN61 | E2E-10 |
| RN18 | CRS-07, 08 | RN40 | ENR-10, 11 | RN62 | E2E-05, 11 |
| RN19 | CRS-10, 11 | RN41 | ACD-01–04, E2E-01 | RN63 | E2E-12 |
| RN20 | CRS-07, 12 | RN42 | ACD-01, 05, 20, 22 | RN64 | E2E-13 |
| RN21 | CRS-13, 14, ENR-12 | RN43 | ACD-06 | RN65 | E2E-01, 14 |
| RN22 | CRS-07, 15 | RN44 | ACD-07, 08, 13, E2E-04 | | |

---

### Próximos passos
1. Levar A1, A2, A4, A5 e A6 ao PO e registrar as decisões neste documento.
2. Fixar `LOGIN_RATE_LIMIT` no CI (A7) antes de a suíte entrar no pipeline.
3. Implementar na ordem de risco: fixtures e cliente de API → P1 de API → concorrência → P1 de E2E → P2/P3.
