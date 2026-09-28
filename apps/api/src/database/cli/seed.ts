import dataSource from '../data-source';
import { seed } from '../seed/seed';

(async () => {
  await dataSource.initialize();
  await dataSource.runMigrations();
  const result = await seed(dataSource);
  console.log(`\n✅ Massa de dados criada. Senha de todos os usuários: ${result.password}\n`);
  console.table(result.users);
  await dataSource.destroy();
})().catch((e) => {
  console.error('❌ Falha no seed:', e.message);
  process.exit(1);
});
