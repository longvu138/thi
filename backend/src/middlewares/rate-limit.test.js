const test=require('node:test'),assert=require('node:assert/strict');
for(const key of ['API','CANDIDATE','PARTICIPANT','RECEIPT'])process.env[`${key}_RATE_LIMIT_MAX`]='2';
const express=require('express');
const {apiLimiter,candidateLimiter,participantLimiter,receiptLookupLimiter}=require('./rate-limit.middleware');
test('HTTP: người chung IP có quota riêng theo user; quota IP, vào thi và tra cứu vẫn áp dụng; log 429',async t=>{
 const logger=require('../utils/logger');const old=logger.warn;const logs=[];logger.warn=value=>logs.push(value);t.after(()=>{logger.warn=old;});
 const app=express();app.set('trust proxy',1);
 app.use((req,res,next)=>{req.user={id:req.get('X-Test-User')||'one'};next();});
 app.get('/user',candidateLimiter,(req,res)=>res.json({ip:req.ip}));
 app.get('/ip',apiLimiter,(req,res)=>res.end('ok'));
 app.post('/enter',participantLimiter,(req,res)=>res.end('ok'));
 app.post('/lookup',receiptLookupLimiter,(req,res)=>res.end('ok'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const request=(path,user='one',ip='192.0.2.1')=>fetch(base+path,{method:['/enter','/lookup'].includes(path)?'POST':'GET',headers:{'X-Test-User':user,'X-Forwarded-For':ip}});
 for(const user of ['one','two']){assert.equal((await request('/user',user)).status,200);assert.equal((await request('/user',user)).status,200);const blocked=await request('/user',user);assert.equal(blocked.status,429);assert.equal((await blocked.json()).code,'RATE_LIMITED');}
 for(const path of ['/ip','/enter','/lookup']){assert.equal((await request(path,'a')).status,200);assert.equal((await request(path,'b')).status,200);assert.equal((await request(path,'c')).status,429);assert.equal((await request(path,'c','192.0.2.2')).status,200);}
 assert.equal(logs.filter(x=>x.statusCode===429).length,5);assert.equal(logs[0].ip,'192.0.2.1');assert.equal(logs[0].actorUserId,'one');
});
