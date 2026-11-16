exports.up = async knex => {
 await knex.schema.alterTable('users', table => {
  table.string('party_committee', 255).nullable();
  table.string('party_branch', 255).nullable();
  table.string('participant_key', 64).nullable().unique();
 });
};
exports.down = async knex => {
 await knex.schema.alterTable('users', table => {
  table.dropUnique(['participant_key']);
  table.dropColumn('participant_key');
  table.dropColumn('party_branch');
  table.dropColumn('party_committee');
 });
};
