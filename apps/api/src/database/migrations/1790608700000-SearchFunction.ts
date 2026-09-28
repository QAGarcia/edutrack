import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Função de busca sem acento e sem diferenciar maiúsculas/minúsculas.
 * Implementada com translate() para não depender da extensão "unaccent"
 * (que exige permissões extras em alguns provedores).
 */
export class SearchFunction1790608700000 implements MigrationInterface {
  name = 'SearchFunction1790608700000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE OR REPLACE FUNCTION unaccent_ci(input text) RETURNS text
      LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
        SELECT lower(translate(input,
          'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
          'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'))
      $$`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP FUNCTION IF EXISTS unaccent_ci(text)`);
  }
}
