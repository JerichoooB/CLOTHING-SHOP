import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fixture, checkout } from './testing.js';
import { createPool, initializeDatabase } from './db.js';
import { createApp } from './app.js';
import { snapshotDatabase, restoreDatabase } from '../scripts/lib/database-transfer.mjs';

test('online transfer preserves login, admin roles, stock and orders; restores atomically and refuses occupied destinations', async () => {
  const source = await fixture(), root = createPool();
  const schema = 'clover_transfer_' + randomUUID().replaceAll('-', '');
  let target, server;
  try {
    const account = await source.register('Preserved Admin', 'preserved@example.test');
    await source.database.query("UPDATE users SET role='admin' WHERE id=$1", [account.user.id]);
    const order = await source.api('/api/checkout', { method: 'POST', cookie: account.cookie, body: checkout([{id:0,size:'M',qty:2}]) });
    assert.equal(order.status, 201);
    const snapshot = JSON.parse(JSON.stringify(await snapshotDatabase(source.database)));
    await root.query(`CREATE SCHEMA "${schema}"`);
    target = createPool({ options: `-c search_path=${schema}` });
    const invalid = structuredClone(snapshot);
    invalid.tables.payments.rows[0][invalid.tables.payments.columns.indexOf('order_id')] = randomUUID();
    await assert.rejects(restoreDatabase(target, invalid), /foreign key/);
    assert.equal((await target.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema=current_schema()")).rows[0].n, 0);
    await restoreDatabase(target, snapshot);
    for (const [name, data] of Object.entries(snapshot.tables))
      assert.equal((await target.query(`SELECT count(*)::int AS n FROM "${name}"`)).rows[0].n, data.rows.length);
    assert.equal((await target.query("SELECT stock FROM product_variants WHERE product_id=0 AND size='M'")).rows[0].stock, 18);
    await initializeDatabase(target);
    assert.equal((await target.query("SELECT stock FROM product_variants WHERE product_id=0 AND size='M'")).rows[0].stock, 18);
    server = createApp({ pool: target }).listen(0, '127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'preserved@example.test',password:'test-password-123'})});
    assert.equal(login.status,200);assert.equal((await login.json()).user.role,'admin');
    const response=await fetch(base+'/api/orders/'+order.data.order.id,{headers:{Cookie:login.headers.get('set-cookie').split(';')[0]}});
    assert.equal(response.status,200);assert.equal((await response.json()).order.payment.status,'approved');
    await assert.rejects(restoreDatabase(target,snapshot),/destination is not empty/);
    assert.equal((await target.query('SELECT count(*)::int AS n FROM orders')).rows[0].n,1);
    const inserted = await target.query("INSERT INTO product_variants(product_id,sku,size,stock) VALUES(0,'TRANSFER-SEQUENCE-CHECK','TEST',1) RETURNING id");
    assert.ok(BigInt(inserted.rows[0].id)>snapshot.tables.product_variants.rows.reduce((max,row)=>BigInt(row[0])>max?BigInt(row[0]):max,0n));
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    if(target) await target.end();
    await root.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await root.end();await source.close();
  }
});
