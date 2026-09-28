import 'reflect-metadata';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { env } from '../config/env';
import { entities } from './entities';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  entities,
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
  // Schema é versionado por migrations. Nunca "synchronize" fora de protótipo.
  synchronize: false,
};

export default new DataSource(dataSourceOptions);
