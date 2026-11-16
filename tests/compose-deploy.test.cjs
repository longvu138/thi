const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('Compose mới: MySQL → migrate → backend → Caddy, volume riêng, chỉ public web',t=>{
 if(spawnSync('docker',['compose','version']).status!==0)return t.skip('Không có Docker Compose CLI');
 const result=spawnSync('docker',['compose','--env-file','.env.production.example','config','--format','json'],{cwd:root,encoding:'utf8',env:{...process.env,MYSQL_PASSWORD:'E2E_config_only',MYSQL_ROOT_PASSWORD:'E2E_config_only_root',JWT_SECRET:'E2E_config_only_jwt',CSRF_SECRET:'E2E_config_only_csrf'}});
 assert.equal(result.status,0,result.stderr);const {services}=JSON.parse(result.stdout);
 assert.equal(services.migrate.depends_on.db.condition,'service_healthy');assert.equal(services.backend.depends_on.migrate.condition,'service_completed_successfully');assert.equal(services.web.depends_on.backend.condition,'service_healthy');
 for(const key of ['db','migrate','backend'])assert.equal(services[key].ports,undefined);
 assert.equal(services.backend.environment.TRUST_PROXY,'1');assert.equal(services.backend.environment.DB_POOL_MAX,'20');assert.equal(services.backend.environment.API_RATE_LIMIT_MAX,'30000');
 assert.equal(services.backend.environment.CANDIDATE_RATE_LIMIT_MAX,'600');assert.equal(services.backend.restart,'unless-stopped');assert.match(services.db.image,/mysql:8/);
 assert.ok(services.backend.healthcheck.test.join(' ').includes('/api/health'));
 assert.equal(services.db.volumes[0].type,'volume');assert.equal(services.backend.environment.BOOTSTRAP_TOKEN,undefined);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'compose.yaml'),'utf8'),/hts|ticket|bootstrap/i);
});
test('Script backup/restore đúng cú pháp và có rào chắn dữ liệu',()=>{
 for(const name of ['common','backup','restore'])assert.equal(spawnSync('bash',['-n',`deploy/${name}.sh`],{cwd:root}).status,0);
 const restore=fs.readFileSync(path.join(root,'deploy/restore.sh'),'utf8');assert.match(restore,/--allow-overwrite/);assert.match(restore,/read -r CONFIRM/);assert.match(restore,/gzip -t/);
 const backup=fs.readFileSync(path.join(root,'deploy/backup.sh'),'utf8');assert.match(backup,/--single-transaction/);assert.match(backup,/BACKUP_KEEP/);assert.match(backup,/pipefail/);
});
test('Restore không bị lệnh kiểm tra Docker đọc mất xác nhận qua stdin',()=>{
 const os=require('node:os');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'E2E_restore_'));try{
  const fake=path.join(dir,'docker');fs.writeFileSync(fake,'#!/bin/sh\ncase "$*" in *information_schema.tables*) cat >/dev/null; echo 0;; *"DROP DATABASE"*) cat >/dev/null;; *) cat >/dev/null;; esac\n',{mode:0o700});
  const envFile=path.join(dir,'test.env');fs.writeFileSync(envFile,'COMPOSE_PROJECT_NAME=E2E_only\n');const archive=path.join(dir,'test.sql.gz');fs.writeFileSync(archive,require('node:zlib').gzipSync('SELECT 1;'));
  const result=spawnSync('bash',['deploy/restore.sh',envFile,archive,'exam_restore_test'],{cwd:root,env:{...process.env,PATH:dir+path.delimiter+process.env.PATH},input:'exam_restore_test\n',encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Đã khôi phục/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
