import dataSource from '../data-source';
import { seed } from '../seed/seed';

/** Apaga TODAS as tabelas do schema, reaplica as migrations e roda o seed. */
(async () => {
  await dataSource.initialize();
  console.log('🧹 Removendo tabelas...');
  await dataSource.dropDatabase();
  console.log('🏗️  Aplicando migrations...');
  await dataSource.runMigrations({ transaction: 'each' });
  console.log('🌱 Criando massa de dados...');
  const result = await seed(dataSource);
  console.log(`\n✅ Banco pronto. Senha de todos os usuários: ${result.password}\n`);
  console.table(result.users);
  await dataSource.destroy();
})().catch((e) => {
  console.error('❌ Falha no reset:', e.message);
  process.exit(1);
});
