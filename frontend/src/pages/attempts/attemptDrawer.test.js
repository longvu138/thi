import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('drawer root keeps Ant Design visibility control; participant layout stays inside',()=>{
 const source=readFileSync(new URL('./AttemptPage.jsx',import.meta.url),'utf8');
 const root=source.match(/<Drawer\s+rootClassName="([^"]+)"/);
 assert.ok(root);
 assert.equal(root[1],'attempt-question-drawer');
 assert.match(source,/<div className="participant-portal participant-session attempt-question-drawer-body">/);
 const css=readFileSync(new URL('../auth/participant-entry.css',import.meta.url),'utf8');
 // Portal styling paints an opaque page; it must never remain on the hidden drawer root.
 assert.match(css,/\.participant-portal\s*\{[^}]*background:/s);
});

test('USER session on login does not redirect before direct-entry navigation',()=>{
 const source=readFileSync(new URL('../../app/AppRoutes.jsx',import.meta.url),'utf8');
 const login=source.slice(source.indexOf('path="/"'),source.indexOf('path="/"')+400);
 assert.match(login,/element=\{currentUser\?\.role === "ADMIN"/);
 assert.match(login,/<LoginPage onAuthenticated=\{handleAuthenticated\}/);
});
