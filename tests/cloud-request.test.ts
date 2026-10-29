import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assertCloudMessageAccepted, CloudRequestError, postCloudRequest } from '../src/api/integrations/channel/meta/cloud-request';

const url = 'https://graph.test/messages';
test('network failure remains an explicit unknown delivery without retry or credential exposure', async () => {
  let calls = 0;
  const post = async () => { calls++; throw { config: { headers: { Authorization: 'private' } }, code: 'ECONNRESET' }; };
  await assert.rejects(postCloudRequest(post, url, {}, {}), (error: CloudRequestError) => {
    assert.equal(error.status, 502);
    assert.equal(error.deliveryUnknown, true);
    assert.equal(JSON.stringify(error).includes('private'), false);
    return true;
  });
  assert.equal(calls, 1);
});
test('provider rejection preserves reason and HTTP status', async () => {
  const post = async () => { throw { response: { status: 429, data: { error: { message: 'Rate limited', code: 4 } } } }; };
  await assert.rejects(postCloudRequest(post, url, {}, {}), (error: CloudRequestError) => {
    assert.equal(error.status, 429);
    assert.equal(error.message, 'Rate limited (code 4)');
    assert.equal(error.deliveryUnknown, false);
    return true;
  });
});
test('empty provider response is never a success', async () => {
  await assert.rejects(postCloudRequest(async () => ({ data: undefined }), url, {}, {}), CloudRequestError);
});
test('error object inside a successful HTTP envelope is never accepted', async () => {
  await assert.rejects(postCloudRequest(async () => ({ data: { error: { message: 'Rejected' } } }), url, {}, {}), CloudRequestError);
});
test('valid Meta message is returned unchanged', async () => {
  const data = { messages: [{ id: 'wamid.test' }] };
  assert.equal(await postCloudRequest(async () => ({ data }), url, {}, {}), data);
  assertCloudMessageAccepted(data);
});
test('missing message id is an explicit unknown delivery', () => {
  for (const response of [undefined, {}, { messages: [] }, { messages: [{}] }]) {
    assert.throws(() => assertCloudMessageAccepted(response), CloudRequestError);
  }
});
test('service keeps typed Cloud failures instead of wrapping them as 400', () => {
  const source = readFileSync(new URL('../src/api/integrations/channel/meta/whatsapp.business.service.ts', import.meta.url), 'utf8');
  assert.match(source, /return postCloudRequest\(axios.post/);
  assert.match(source, /assertCloudMessageAccepted\(messageSent\)/);
  assert.match(source, /if \(error instanceof CloudRequestError\) throw error/);
});
