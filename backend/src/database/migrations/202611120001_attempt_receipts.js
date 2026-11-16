exports.up = async knex => {
 await knex.schema.createTable('attempt_receipts', table => {
  table.engine('InnoDB');table.charset('utf8mb4');table.collate('utf8mb4_unicode_ci');
  table.specificType('id','char(36)').primary();
  table.specificType('attempt_id','char(36)').notNullable().unique().references('id').inTable('attempts').onDelete('RESTRICT');
  table.string('verification_code',24).notNullable().unique();
  table.json('data_snapshot').notNullable();
  table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
 });
};
exports.down = async knex => {await knex.schema.dropTableIfExists('attempt_receipts');};
