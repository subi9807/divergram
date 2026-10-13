import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { verifySessionToken } from './sessionToken.js';
import { compileFilters, compileRead } from './dataQuery.js';
import { notificationText } from './notificationText.js';
import { requireAdminFactory } from '../middleware/requireAdmin.js';

const secret = 'isolated-regression-test-secret';
test('legacy session tokens remain valid', () => {
  const token = jwt.sign({ sub: '123', email: 'test@example.invalid' }, secret);
  assert.equal(verifySessionToken(jwt, token, secret).sub, '123');
});
for (const payload of [{ purpose: 'email_verify' }, { scope: 'wallet' }, { purpose: 'link' }, { tokenType: 'refresh' }]) {
  test(`purpose-bound JWT is not a login: ${JSON.stringify(payload)}`, () => {
    const token = jwt.sign({ sub: '123', ...payload }, secret);
    assert.throws(() => verifySessionToken(jwt, token, secret), /invalid_session_token/);
  });
}
for (const user of [null, { email: 'admin@example.invalid', role: 'admin', is_blocked: true }]) {
  test(`allowlist cannot override a missing or blocked admin: ${JSON.stringify(user)}`, async () => {
    const middleware = requireAdminFactory({ jwtSecret: secret, adminEmails: ['admin@example.invalid'], pool: { query: async () => ({ rows: user ? [user] : [] }) } });
    let status;
    const res = { status(code) { status = code; return this; }, json() {} };
    const token = jwt.sign({ sub: '123', email: 'admin@example.invalid' }, secret);
    await middleware({ headers: { authorization: `Bearer ${token}` } }, res, () => assert.fail('must not authorize'));
    assert.equal(status, 403);
  });
}
test('filters parameterize hostile values and reject hostile columns', () => {
  const attack = "x' OR 1=1 --";
  const result = compileFilters([{ column: 'id', op: 'eq', value: attack }], ['id']);
  assert.equal(result.where, '"id" = $1');
  assert.deepEqual(result.values, [attack]);
  assert.throws(() => compileFilters([{ column: attack, op: 'eq', value: 1 }], ['id']));
  assert.equal(compileFilters([{ column: 'id', op: 'in', value: [] }], ['id']).where, 'FALSE');
});
test('public profile projection omits private license and import data', () => {
  const spec = { table: 'app_profiles', columns: ['id','full_name','license_number','license_image_url','resort_source_raw','resort_record_key'] };
  const read = compileRead(spec, 'profiles', {}, null);
  assert.match(read.sql, /SELECT "id","full_name" FROM/);
  assert.doesNotMatch(read.sql, /license|source_raw|record_key/);
  assert.throws(() => compileRead(spec, 'profiles', { filters: JSON.stringify([{ column: 'license_number', op: 'eq', value: 'secret' }]) }, null), /invalid_column/);
  assert.throws(() => compileRead(spec, 'profiles', { order: JSON.stringify({ column: 'license_number' }) }, null), /invalid_order/);
});
test('private data filtering, ordering and pagination execute in SQL', () => {
  const read = compileRead({ table: 'app_notifications', columns: ['id','user_id','created_at'] }, 'notifications', { range: '[10,19]', order: '{"column":"created_at","ascending":false}' }, { userId: 'me' });
  assert.match(read.sql, /user_id=\$1/);
  assert.match(read.sql, /ORDER BY "created_at" DESC, id ASC LIMIT \$2 OFFSET \$3/);
  assert.deepEqual(read.values, ['me', 10, 10]);
});
for (const language of ['en', 'ja', 'zh', 'en-US', 'unsupported']) {
  test(`event notification has no Korean template for ${language}`, () => {
    for (const type of ['like', 'comment', 'follow', 'system']) assert.doesNotMatch(notificationText(type, language, 'Diver'), /[가-힣]/);
  });
}
