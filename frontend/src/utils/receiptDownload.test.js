import test from 'node:test';
import assert from 'node:assert/strict';
import {fitReceiptPage} from './receiptDownload.js';
test('receipt fits one A4 page with margins and preserves proportions',()=>{
 for(const [w,h] of [[794,1010],[794,3000],[1800,500]]){
  const box=fitReceiptPage(w,h);
  assert.ok(box.x>=10-1e-9);assert.equal(box.y,10);
  assert.ok(box.width<=190+1e-9);assert.ok(box.height<=277+1e-9);
  assert.ok(Math.abs(box.width/box.height-w/h)<1e-9);
 }
 assert.throws(()=>fitReceiptPage(0,10));
});
