import test from 'node:test';
import assert from 'node:assert/strict';
import {isInAppBrowser,receiptActions,legacyReceiptTarget,receiptPreviewScale} from './receiptPresentation.js';
test('detect Zalo Facebook Messenger without classifying Chrome/Safari as in-app',()=>{
 for(const ua of ['Mozilla/5.0 Zalo/24.1','Mozilla/5.0 [FBAN/FBIOS;FBAV/1]','Android FB_IAB/FB4A','Mozilla/5.0 Messenger'])assert.equal(isInAppBrowser(ua),true);
 for(const ua of ['', 'Mozilla/5.0 Chrome/131 Safari/537.36','iPhone Version/18.0 Mobile Safari/604.1'])assert.equal(isInAppBrowser(ua),false);
});
test('buttons prioritize print on desktop, save image on mobile/in-app; Admin print/PDF only',()=>{
 assert.deepEqual(receiptActions(),['print','pdf']);
 assert.deepEqual(receiptActions({mobile:true}),['image','pdf']);
 assert.deepEqual(receiptActions({inApp:true}),['image','pdf']);
 assert.deepEqual(receiptActions({mobile:true,inApp:true,admin:true}),['print','pdf']);
});
test('old receipt route replaces result route and opens modal without automatic action',()=>{
 const id='53dab57d-b3bb-41ed-b287-3523d4472302';
 assert.deepEqual(legacyReceiptTarget(id),{pathname:`/attempts/${id}/result`,state:{openReceipt:true},replace:true});
 assert.equal(legacyReceiptTarget(id).pathname.includes('?'),false);
});
test('preview fits narrow viewport; print scales long receipt into one A4 page',()=>{
 for(const width of [320,390,768,900]){
  const size=receiptPreviewScale(width,794,1123);
  assert.ok(size.scale<=1);assert.ok(794*size.scale<=width);
  assert.equal(size.height,1123*size.scale);
 }
 const long=receiptPreviewScale(390,794,2400);
 assert.ok(long.printScale<1);assert.ok(2400*long.printScale<=(297/210)*794);
});
import {readFileSync} from 'node:fs';
test('receipt print CSS scopes hiding to an open receipt and uses its own zero-margin A4 page',()=>{
 const css=readFileSync(new URL('../components/receipts/receipt.css',import.meta.url),'utf8');
 assert.match(css,/@page receipt-sheet-page \{size:A4 portrait;margin:0;\}/);
 assert.match(css,/page:receipt-sheet-page/);
 assert.match(css,/body:has\(>\.receipt-print-root\)>:not\(\.receipt-print-root\)/);
 assert.doesNotMatch(css,/\n body>:not\(/);
});
