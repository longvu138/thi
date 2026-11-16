const tables = ['users', 'auth_sessions', 'exam_rounds', 'questions', 'attempts', 'attempt_questions', 'attempt_answers'];
exports.up = async knex => {
  const create = (name, define) => knex.schema.createTable(name, t => {
    t.engine('InnoDB'); t.charset('utf8mb4'); t.collate('utf8mb4_unicode_ci');
    t.specificType('id', 'char(36)').primary(); define(t);
  });
  const ref = (t, name, target) => t.specificType(name, 'char(36)').notNullable().references('id').inTable(target).onDelete('RESTRICT');
  await create('users', t => {
    t.string('username', 64).notNullable().unique(); t.string('full_name', 255).notNullable();
    t.string('password_hash').notNullable(); t.enum('role', ['ADMIN','USER']).notNullable().defaultTo('USER');
    t.boolean('is_active').notNullable().defaultTo(true); t.integer('token_version').unsigned().notNullable().defaultTo(0);
    t.dateTime('last_login_at'); t.dateTime('deleted_at'); t.timestamps(true, true); t.index(['role','is_active','deleted_at']);
  });
  await create('auth_sessions', t => {
    t.specificType('public_id','char(36)').notNullable().unique(); ref(t,'user_id','users');
    t.integer('token_version').unsigned().notNullable(); t.string('ip_address',45); t.text('user_agent');
    t.string('browser'); t.string('operating_system'); t.string('device_type');
    t.dateTime('expires_at').notNullable(); t.dateTime('last_seen_at').notNullable().defaultTo(knex.fn.now());
    t.dateTime('revoked_at'); t.specificType('revoked_by','char(36)').references('id').inTable('users');
    t.string('revoke_reason'); t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id','revoked_at','expires_at']);
  });
  await create('exam_rounds', t => {
    t.string('title').notNullable(); t.text('description');
    for (const key of ['question_count','duration_minutes','max_attempts']) t.integer(key).unsigned().notNullable();
    t.integer('passing_percentage').unsigned().notNullable().defaultTo(70);
    t.boolean('stop_after_pass').notNullable().defaultTo(false); t.boolean('show_correct_answers').notNullable().defaultTo(true);
    t.boolean('shuffle_questions').notNullable().defaultTo(true); t.boolean('shuffle_options').notNullable().defaultTo(true);
    t.dateTime('trial_start_at'); t.dateTime('start_at'); t.dateTime('end_at'); t.enum('status',['DRAFT','OPEN','CLOSED']).notNullable().defaultTo('DRAFT');
    t.timestamps(true,true); t.index(['status','start_at','end_at']);
  });
  await create('questions', t => {
    ref(t,'exam_round_id','exam_rounds'); t.string('question_code',100).notNullable(); t.string('category_name',255).notNullable();
    t.unique(['exam_round_id','question_code']);
    t.text('content').notNullable(); t.text('option_a').notNullable(); t.text('option_b').notNullable();
    t.text('option_c'); t.text('option_d'); t.enum('correct_answer',['A','B','C','D']).notNullable();
    t.boolean('allow_shuffle_options').notNullable().defaultTo(true); t.dateTime('deleted_at'); t.timestamps(true,true);
    t.index(['exam_round_id','deleted_at']);
  });
  await create('attempts', t => {
    ref(t,'user_id','users'); ref(t,'exam_round_id','exam_rounds'); t.boolean('is_trial').notNullable().defaultTo(false); t.integer('attempt_number').unsigned().notNullable();
    t.dateTime('started_at').notNullable(); t.dateTime('expires_at').notNullable(); t.dateTime('submitted_at');
    t.enum('status',['IN_PROGRESS','SUBMITTED','EXPIRED']).notNullable().defaultTo('IN_PROGRESS');
    t.specificType('in_progress_flag','tinyint').nullable();
    for (const key of ['correct_count','incorrect_count','unanswered_count','duration_seconds']) t.integer(key).unsigned();
    t.decimal('percentage',7,4); t.enum('result',['PASS','FAIL']); t.json('config_snapshot').notNullable();
    t.unique(['user_id','exam_round_id','is_trial','attempt_number']); t.unique(['user_id','exam_round_id','in_progress_flag']);
    t.index(['status','expires_at']);
  });
  await create('attempt_questions', t => {
    ref(t,'attempt_id','attempts'); ref(t,'question_id','questions'); t.string('category_name'); t.string('question_code',100); t.text('content').notNullable();
    t.integer('position').unsigned().notNullable(); t.json('options_snapshot').notNullable(); t.string('correct_answer',1).notNullable();
    t.unique(['attempt_id','position']); t.unique(['attempt_id','question_id']); t.unique(['attempt_id','id']);
  });
  await create('attempt_answers', t => {
    ref(t,'attempt_id','attempts'); t.specificType('attempt_question_id','char(36)').notNullable();
    t.foreign(['attempt_id','attempt_question_id']).references(['attempt_id','id']).inTable('attempt_questions');
    t.string('selected_answer',1); t.timestamps(true,true); t.unique(['attempt_id','attempt_question_id']);
  });
};
exports.down = async knex => { for (const name of [...tables].reverse()) await knex.schema.dropTableIfExists(name); };
