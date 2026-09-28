import { CourseLevel, CourseStatus, Role } from '../../domain/enums';

export const DEFAULT_PASSWORD = 'Senha@123';

export const CATEGORIES = ['Tecnologia', 'Dados e IA', 'Negócios', 'Educação', 'Linguagens', 'Saúde', 'Design'];

export interface SeedUser { key: string; name: string; email: string; role: Role; bio?: string; isActive?: boolean }

export const USERS: SeedUser[] = [
  { key: 'admin', name: 'Helena Admin', email: 'admin@edutrack.dev', role: Role.ADMIN, bio: 'Coordenação acadêmica da plataforma.' },
  { key: 'marina', name: 'Marina Lopes', email: 'marina.prof@edutrack.dev', role: Role.TEACHER, bio: 'Engenheira de qualidade há 12 anos, especialista em automação de testes.' },
  { key: 'carlos', name: 'Carlos Mendes', email: 'carlos.prof@edutrack.dev', role: Role.TEACHER, bio: 'Economista e analista de dados. Professor universitário desde 2010.' },
  { key: 'renata', name: 'Renata Oliveira', email: 'renata.prof@edutrack.dev', role: Role.TEACHER, bio: 'Pedagoga, mestre em Educação e designer instrucional.' },
  { key: 'joao', name: 'João Pereira', email: 'aluno@edutrack.dev', role: Role.STUDENT },
  { key: 'beatriz', name: 'Beatriz Santos', email: 'beatriz@edutrack.dev', role: Role.STUDENT },
  { key: 'lucas', name: 'Lucas Almeida', email: 'lucas@edutrack.dev', role: Role.STUDENT },
  { key: 'camila', name: 'Camila Rocha', email: 'camila@edutrack.dev', role: Role.STUDENT },
  { key: 'rafael', name: 'Rafael Costa', email: 'rafael@edutrack.dev', role: Role.STUDENT },
  { key: 'juliana', name: 'Juliana Ferreira', email: 'juliana@edutrack.dev', role: Role.STUDENT },
  { key: 'ana', name: 'Ana Clara Dias', email: 'ana@edutrack.dev', role: Role.STUDENT },
  { key: 'pedro', name: 'Pedro Martins', email: 'pedro@edutrack.dev', role: Role.STUDENT, isActive: false },
];

export interface SeedCourse {
  key: string; title: string; summary: string; category: string; level: CourseLevel; workloadHours: number;
  capacity: number; teacher: string; status: CourseStatus; daysAgo: number; lessons: [string, number][];
}

const P = CourseStatus.PUBLISHED;
const B = CourseLevel.BEGINNER, I = CourseLevel.INTERMEDIATE, A = CourseLevel.ADVANCED;

export const COURSES: SeedCourse[] = [
  { key: 'playwright', title: 'Playwright com TypeScript do Zero', summary: 'Automação de testes web moderna: seletores, asserções, Page Objects e relatórios.', category: 'Tecnologia', level: B, workloadHours: 40, capacity: 50, teacher: 'marina', status: P, daysAgo: 60,
    lessons: [['Por que Playwright?', 12], ['Instalação e primeiro teste', 18], ['Localizadores e boas práticas', 25], ['Asserções web-first', 20], ['Page Object Model', 30], ['Relatórios e Trace Viewer', 22]] },
  { key: 'arquitetura', title: 'Arquitetura de Testes Automatizados', summary: 'Como desenhar suítes de teste escaláveis, legíveis e confiáveis em times grandes.', category: 'Tecnologia', level: A, workloadHours: 30, capacity: 25, teacher: 'marina', status: P, daysAgo: 45,
    lessons: [['Pirâmide e troféu de testes', 20], ['Fixtures e injeção de dependências', 28], ['Massa de dados e isolamento', 25], ['Testes instáveis: causas e cura', 30], ['Testes no pipeline de CI/CD', 26]] },
  { key: 'sql', title: 'SQL para Análise de Dados', summary: 'Consultas, junções e agregações para responder perguntas de negócio com dados.', category: 'Dados e IA', level: B, workloadHours: 24, capacity: 60, teacher: 'carlos', status: P, daysAgo: 40,
    lessons: [['Modelo relacional', 15], ['SELECT, WHERE e ORDER BY', 20], ['JOINs sem medo', 25], ['GROUP BY e agregações', 22], ['Subconsultas e CTEs', 24]] },
  { key: 'ia', title: 'Introdução à Inteligência Artificial', summary: 'Conceitos essenciais de IA, aprendizado de máquina e uso responsável de modelos.', category: 'Dados e IA', level: I, workloadHours: 32, capacity: 40, teacher: 'marina', status: P, daysAgo: 30,
    lessons: [['O que é IA, afinal?', 18], ['Aprendizado supervisionado', 26], ['Modelos de linguagem', 24], ['Ética e avaliação de modelos', 20]] },
  { key: 'financeira', title: 'Matemática Financeira Aplicada', summary: 'Juros, descontos, amortização e análise de investimentos com exemplos reais.', category: 'Negócios', level: I, workloadHours: 36, capacity: 30, teacher: 'carlos', status: P, daysAgo: 55,
    lessons: [['Juros simples e compostos', 20], ['Taxas equivalentes', 18], ['Sistemas de amortização', 25], ['VPL e TIR', 28]] },
  { key: 'agil', title: 'Gestão Ágil de Projetos', summary: 'Scrum, Kanban e métricas de fluxo para entregar valor com previsibilidade.', category: 'Negócios', level: B, workloadHours: 20, capacity: 35, teacher: 'carlos', status: P, daysAgo: 25,
    lessons: [['Manifesto ágil', 12], ['Scrum na prática', 22], ['Kanban e WIP', 18], ['Métricas de fluxo', 20]] },
  { key: 'didatica', title: 'Didática no Ensino Superior', summary: 'Planejamento de aulas, avaliação e engajamento de turmas universitárias.', category: 'Educação', level: I, workloadHours: 30, capacity: 2, teacher: 'renata', status: P, daysAgo: 35,
    lessons: [['Planejamento de aula', 20], ['Avaliação formativa', 22], ['Engajamento em sala', 18]] },
  { key: 'metodologias', title: 'Metodologias Ativas de Aprendizagem', summary: 'Sala de aula invertida, PBL e gamificação para colocar o aluno no centro.', category: 'Educação', level: B, workloadHours: 16, capacity: 40, teacher: 'renata', status: P, daysAgo: 20,
    lessons: [['Sala de aula invertida', 15], ['Aprendizagem baseada em projetos', 20], ['Gamificação', 18]] },
  { key: 'redacao', title: 'Redação Acadêmica e Normas ABNT', summary: 'Estruture artigos e TCCs com clareza, argumentação e formatação correta.', category: 'Linguagens', level: B, workloadHours: 20, capacity: 45, teacher: 'renata', status: P, daysAgo: 50,
    lessons: [['Estrutura do texto acadêmico', 18], ['Argumentação', 20], ['Citações e referências', 22], ['Revisão final', 15]] },
  { key: 'ingles', title: 'Inglês Instrumental para TI', summary: 'Leitura de documentação técnica e vocabulário essencial para tecnologia.', category: 'Linguagens', level: I, workloadHours: 30, capacity: 30, teacher: 'renata', status: P, daysAgo: 15,
    lessons: [['Estratégias de leitura', 16], ['Vocabulário técnico', 20], ['Lendo documentação oficial', 24]] },
  { key: 'socorros', title: 'Primeiros Socorros no Ambiente Escolar', summary: 'Como agir em emergências comuns com crianças e adolescentes na escola.', category: 'Saúde', level: B, workloadHours: 12, capacity: 25, teacher: 'renata', status: P, daysAgo: 10,
    lessons: [['Avaliação da cena', 12], ['Engasgo e desmaio', 18], ['Quando acionar o SAMU', 10]] },
  { key: 'ux', title: 'UX Design para Iniciantes', summary: 'Pesquisa com usuários, wireframes e testes de usabilidade do jeito certo.', category: 'Design', level: B, workloadHours: 24, capacity: 30, teacher: 'marina', status: P, daysAgo: 5,
    lessons: [['O que é experiência do usuário', 14], ['Pesquisa com usuários', 22], ['Wireframes e protótipos', 25], ['Testes de usabilidade', 20]] },
  { key: 'estatistica', title: 'Estatística Aplicada a Negócios', summary: 'Em construção: estatística descritiva e inferencial para tomada de decisão.', category: 'Dados e IA', level: I, workloadHours: 40, capacity: 30, teacher: 'carlos', status: CourseStatus.DRAFT, daysAgo: 3,
    lessons: [['Estatística descritiva', 20], ['Probabilidade', 25]] },
  { key: 'kubernetes', title: 'Kubernetes na Prática', summary: 'Rascunho sem aulas: containers, pods e deploys em clusters Kubernetes.', category: 'Tecnologia', level: A, workloadHours: 28, capacity: 20, teacher: 'marina', status: CourseStatus.DRAFT, daysAgo: 1,
    lessons: [] },
  { key: 'pedagogia', title: 'Fundamentos de Pedagogia (turma 2024)', summary: 'Turma encerrada: bases históricas e filosóficas da educação.', category: 'Educação', level: B, workloadHours: 60, capacity: 40, teacher: 'renata', status: CourseStatus.ARCHIVED, daysAgo: 300,
    lessons: [['História da educação', 25], ['Correntes pedagógicas', 30], ['Educação no Brasil', 28]] },
];

export interface SeedEnrollment {
  student: string; course: string; cancelled?: boolean; completedLessons: number | 'all';
  grades?: [string, number][]; certificate?: boolean; daysAgo: number;
}

/** Cada linha é um cenário pensado para teste. */
export const ENROLLMENTS: SeedEnrollment[] = [
  // João: aprovado com certificado; em andamento; reprovado; recém-matriculado
  { student: 'joao', course: 'playwright', completedLessons: 'all', grades: [['P1', 8], ['P2', 9]], certificate: true, daysAgo: 50 },
  { student: 'joao', course: 'sql', completedLessons: 3, grades: [['P1', 7]], daysAgo: 30 },
  { student: 'joao', course: 'financeira', completedLessons: 'all', grades: [['P1', 4], ['P2', 5.5]], daysAgo: 45 },
  { student: 'joao', course: 'arquitetura', completedLessons: 0, daysAgo: 2 },
  // Beatriz: aprovada SEM certificado (pronta para emitir); turma lotada; curso arquivado com certificado
  { student: 'beatriz', course: 'playwright', completedLessons: 'all', grades: [['P1', 7], ['P2', 8]], daysAgo: 40 },
  { student: 'beatriz', course: 'didatica', completedLessons: 1, daysAgo: 20 },
  { student: 'beatriz', course: 'pedagogia', completedLessons: 'all', grades: [['P1', 9], ['P2', 8.5]], certificate: true, daysAgo: 280 },
  // Camila: ocupa a última vaga de Didática (2/2)
  { student: 'camila', course: 'didatica', completedLessons: 0, daysAgo: 18 },
  // Rafael: matrícula cancelada; média exatamente 6 mas progresso < 75% (segue em andamento)
  { student: 'rafael', course: 'agil', cancelled: true, completedLessons: 0, daysAgo: 22 },
  { student: 'rafael', course: 'redacao', completedLessons: 2, grades: [['P1', 6], ['P2', 6]], daysAgo: 28 },
  // Juliana: média exatamente 6 e 100% do curso (limite de aprovação)
  { student: 'juliana', course: 'ingles', completedLessons: 'all', grades: [['P1', 5.5], ['P2', 6.5]], daysAgo: 12 },
  // Ana: matrícula nova, sem progresso
  { student: 'ana', course: 'ux', completedLessons: 0, daysAgo: 4 },
  { student: 'ana', course: 'metodologias', completedLessons: 2, daysAgo: 9 },
  // Pedro (conta desativada) tinha uma matrícula
  { student: 'pedro', course: 'sql', completedLessons: 1, daysAgo: 38 },
];

export function lessonContent(courseTitle: string, lessonTitle: string): string {
  return [
    `Nesta aula de "${courseTitle}", vamos estudar ${lessonTitle.toLowerCase()}.`,
    '',
    'Objetivos da aula:',
    `- Entender os conceitos centrais de ${lessonTitle.toLowerCase()}.`,
    '- Relacionar o conteúdo com situações reais do dia a dia profissional.',
    '- Praticar com um exercício curto ao final.',
    '',
    'Leia o material com calma, anote suas dúvidas e, ao terminar, marque a aula como concluída para registrar seu progresso.',
  ].join('\n');
}
