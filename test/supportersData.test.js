import assert from 'node:assert/strict';
import test from 'node:test';

import { loadSupporters, parseSupportersCsv } from '../src/supportersData.js';

const HEADER = 'display_name,total_usd';

function csv(...rows) {
  return [HEADER, ...rows, ''].join('\n');
}

test('parseSupportersCsv accepts reviewed public names and amounts', () => {
  assert.deepEqual(
    parseSupportersCsv(csv(
      'civo,100',
      '"Ko-fi, Fan",20',
      'oOBansh33,10'
    )),
    [
      { displayName: 'civo', totalUsd: 100 },
      { displayName: 'Ko-fi, Fan', totalUsd: 20 },
      { displayName: 'oOBansh33', totalUsd: 10 }
    ]
  );
});

test('loadSupporters reads names and amounts from the reviewed public CSV', async () => {
  const supporters = await loadSupporters();

  assert.equal(supporters.length, 6);
  assert.deepEqual(supporters[0], { displayName: 'civo', totalUsd: 100 });
  assert.deepEqual(supporters[4], { displayName: 'oOBansh33', totalUsd: 10 });
  assert.deepEqual(supporters.at(-1), { displayName: 'Timmcd', totalUsd: 5 });
});

test('parseSupportersCsv rejects invalid schema and private labels', () => {
  const cases = [
    ['rank,display_name,total_usd\n1,civo,100\n', /header must be exactly/],
    [csv(), /at least one supporter/],
    [csv(''), /line 2 is blank/],
    [csv(',10'), /empty display_name/],
    [csv('person@example.com,10'), /must not contain an email address/],
    [csv('KO-FI SUPPORTER,10'), /must not identify an anonymous supporter/],
    [csv('civo,10,private'), /exactly two fields/],
    [csv('zeta,10', 'alpha,20'), /alphabetical order/],
    [csv('civo,0'), /greater than zero/],
    [csv('civo,1.234'), /invalid total_usd/],
    [`${HEADER}\n"civo,10\n`, /unterminated quoted field/],
    [csv(...Array.from({ length: 11 }, (_, index) => `supporter-${String(index + 1).padStart(2, '0')},${11 - index}`)), /at most 10 supporters/]
  ];

  for (const [source, expectedError] of cases) {
    assert.throws(() => parseSupportersCsv(source), expectedError);
  }
});
