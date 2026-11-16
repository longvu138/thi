require('dotenv').config({quiet:true});
const { createInterface } = require('node:readline/promises');
const { Writable } = require('node:stream');
const db = require('../src/config/database');
const { validateUser } = require('../src/modules/users/users.validator');
const { hashPassword } = require('../src/utils/password-hash');
const { createUuid } = require('../src/utils/uuid');
const { httpError } = require('../src/utils/http-error');
const createAdmin = async (body, {force = false} = {}) => {
  const input = validateUser({...body,role:'ADMIN'},true);
  const password_hash = await hashPassword(input.password); delete input.password;
  const connection = await db.client.acquireConnection();
  let acquired = false;
  try {
    const [rows] = await db.raw("SELECT GET_LOCK('exam_create_admin', 10) AS acquired").connection(connection);
    acquired = Number(rows[0].acquired) === 1;
    if (!acquired) throw httpError(409,'Đang có tiến trình tạo quản trị viên khác');
    return await db.transaction(async trx => {
      if (!force && await trx('users').where({role:'ADMIN'}).whereNull('deleted_at').first()) throw httpError(409,'Đã có ADMIN; chỉ dùng --force khi cần tạo thêm');
      const id = createUuid();
      await trx('users').insert({id,...input,password_hash});
      return id;
    }, {connection});
  } finally {
    try {if (acquired) await db.raw("SELECT RELEASE_LOCK('exam_create_admin')").connection(connection);}
    finally {await db.client.releaseConnection(connection);}
  }
};
const main = async () => {
  let muted = false;
  const output = new Writable({write(chunk,encoding,callback) { if (!muted) process.stdout.write(chunk,encoding); callback(); }});
  const rl = createInterface({input:process.stdin,output,terminal:process.stdin.isTTY});
  try {
    const username = await rl.question('Tên tài khoản: ');
    const fullName = await rl.question('Họ tên: ');
    process.stdout.write('Mật khẩu (ẩn khi nhập): '); muted = true;
    const password = await rl.question(''); muted = false; process.stdout.write('\n');
    await createAdmin({username,fullName,password},{force:process.argv.includes('--force')});
    console.log('Đã tạo tài khoản quản trị viên.');
  } catch(error) { console.error(error.code === 'ER_DUP_ENTRY' ? 'Tên tài khoản đã được sử dụng' : error.message); process.exitCode = 1; }
  finally { rl.close(); await db.destroy(); }
};
if (require.main === module) main();
module.exports = { createAdmin };
