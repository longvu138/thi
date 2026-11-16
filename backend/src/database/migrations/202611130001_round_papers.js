// Giai đoạn 11: database dev/test dựng lại; chỉ lưu cơ cấu, không tạo trước bộ đề.
exports.up=async knex=>{await knex.schema.alterTable('exam_rounds',t=>{t.json('selection_config');});};
exports.down=async knex=>{await knex.schema.alterTable('exam_rounds',t=>{t.dropColumn('selection_config');});};
