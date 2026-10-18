// lib/jam-room.ts: 매칭된 두 사람에게 같은 SonoBus 방을, 그 밖의 사람에게는 아무것도 주지 않아야 한다.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const SECRET = 'test-secret';

function load() {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync('lib/jam-room.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    {
      exports,
      // 'server-only'는 Next 번들러 전용 표식이라 테스트에서는 빈 모듈로 대체
      require: (name) => (name === 'crypto' ? crypto : {}),
      URLSearchParams,
    },
  );
  return exports;
}

const { deriveJamRoom, isMutualDmPair } = load();
const plain = (value) => JSON.parse(JSON.stringify(value));

test('같은 쌍이면 누가 열든 같은 그룹 이름·비밀번호가 나온다', () => {
  const fromA = plain(deriveJamRoom(A, B, SECRET));
  assert.deepEqual(plain(deriveJamRoom(A, B, SECRET)), fromA);
  assert.deepEqual(plain(deriveJamRoom(B, A, SECRET)), fromA);
  assert.match(fromA.groupName, /^musicspot-[0-9a-f]{10}$/);
  assert.match(fromA.password, /^[a-z2-7]{12}$/);
  assert.equal(
    fromA.launchUrl,
    `sonobus://aoo.sonobus.net:10998/?g=${fromA.groupName}&p=${fromA.password}`,
  );
});

test('다른 쌍이나 다른 비밀값이면 다른 방이 나온다', () => {
  const ab = deriveJamRoom(A, B, SECRET);
  const ac = deriveJamRoom(A, C, SECRET);
  const otherSecret = deriveJamRoom(A, B, 'another-secret');
  assert.notEqual(ab.groupName, ac.groupName);
  assert.notEqual(ab.password, ac.password);
  assert.notEqual(ab.groupName, otherSecret.groupName);
  assert.notEqual(ab.password, otherSecret.password);
  // 비밀번호가 그룹 이름 해시의 일부가 아니어야 한다
  assert.ok(!ab.groupName.includes(ab.password));
});

test('비밀값이 없으면 조용히 약한 방을 만들지 않고 던진다', () => {
  assert.throws(() => deriveJamRoom(A, B, ''), /SONOBUS_ROOM_SECRET/);
});

test('서로 DM을 한 통씩 주고받아야 매칭으로 본다', () => {
  const ab = { sender_id: A, receiver_id: B };
  const ba = { sender_id: B, receiver_id: A };
  assert.equal(isMutualDmPair(A, B, [ab, ba]), true);
  assert.equal(isMutualDmPair(B, A, [ab, ba]), true);
  assert.equal(isMutualDmPair(A, B, [ab]), false, '한쪽만 보냄');
  assert.equal(isMutualDmPair(A, B, []), false);
});

test('비당사자는 남의 대화 기록을 넘겨도 방 정보를 받을 수 없다', () => {
  const thread = [{ sender_id: A, receiver_id: B }, { sender_id: B, receiver_id: A }];
  assert.equal(isMutualDmPair(C, B, thread), false);
  assert.equal(isMutualDmPair(C, A, thread), false);
  assert.equal(isMutualDmPair(A, A, thread), false, '자기 자신');
  assert.equal(isMutualDmPair('', B, thread), false);
});
