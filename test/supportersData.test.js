import assert from 'node:assert/strict';
import test from 'node:test';

import { loadSupporters, parseSupportersCsv } from '../src/supportersData.js';

const HEADER = 'display_name,total_usd';

function csv(...rows) {
  return [HEADER, ...rows, ''].join('\n');
}

test('parseSupportersCsv accepts named and separate Ko-fi Supporter donations', () => {
  assert.deepEqual(
    parseSupportersCsv(csv(
      'civo,100',
      'Ko-fi Supporter,20',
      '"Ko-fi, Fan",20',
      'oOBansh33,10',
      'Ko-fi Supporter,5'
    )),
    [
      { displayName: 'civo', totalUsd: 100 },
      { displayName: 'Ko-fi Supporter', totalUsd: 20 },
      { displayName: 'Ko-fi, Fan', totalUsd: 20 },
      { displayName: 'oOBansh33', totalUsd: 10 },
      { displayName: 'Ko-fi Supporter', totalUsd: 5 }
    ]
  );
});

test('loadSupporters reads named and Ko-fi Supporter donations from the reviewed public CSV', async () => {
  const supporters = await loadSupporters();

  assert.equal(supporters.length, 8);
  assert.deepEqual(supporters[0], { displayName: 'civo', totalUsd: 100 });
  assert.deepEqual(supporters[3], { displayName: 'Ko-fi Supporter', totalUsd: 10 });
  assert.deepEqual(supporters[6], { displayName: 'Ko-fi Supporter', totalUsd: 5 });
  assert.deepEqual(supporters.at(-1), { displayName: 'Timmcd', totalUsd: 5 });
});

test('parseSupportersCsv rejects invalid schema and private labels', () => {
  const cases = [
    ['rank,display_name,total_usd\n1,civo,100\n', /header must be exactly/],
    [csv(), /at least one supporter/],
    [csv(''), /line 2 is blank/],
    [csv(',10'), /empty display_name/],
    [csv('person@example.com,10'), /must not contain an email address/],
    [csv('civo,10,private'), /exactly two fields/],
    [csv('alpha,10', 'zeta,20'), /descending order/],
    [csv('zeta,10', 'alpha,10'), /equal totals must be in alphabetical order/],
    [csv('civo,0'), /greater than zero/],
    [csv('civo,1.234'), /invalid total_usd/],
    [`${HEADER}\n"civo,10\n`, /unterminated quoted field/],
    [csv(...Array.from({ length: 11 }, (_, index) => `supporter-${String(index + 1).padStart(2, '0')},${11 - index}`)), /at most 10 supporters/]
  ];

  for (const [source, expectedError] of cases) {
    assert.throws(() => parseSupportersCsv(source), expectedError);
  }
});
