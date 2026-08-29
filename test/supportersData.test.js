import assert from 'node:assert/strict';
import test from 'node:test';

import { loadSupporters, parseSupportersCsv } from '../src/supportersData.js';

const HEADER = 'display_name';

function csv(...rows) {
  return [HEADER, ...rows, ''].join('\n');
}

test('parseSupportersCsv accepts reviewed public names', () => {
  assert.deepEqual(
    parseSupportersCsv(csv(
      'civo',
      '"Ko-fi, Fan"',
      'oOBansh33'
    )),
    [
      { displayName: 'civo' },
      { displayName: 'Ko-fi, Fan' },
      { displayName: 'oOBansh33' }
    ]
  );
});

test('loadSupporters reads names from the reviewed public CSV', async () => {
  const supporters = await loadSupporters();

  assert.equal(supporters.length, 6);
  assert.deepEqual(supporters[0], { displayName: 'civo' });
  assert.deepEqual(supporters[4], { displayName: 'oOBansh33' });
  assert.deepEqual(supporters.at(-1), { displayName: 'Timmcd' });
});

test('parseSupportersCsv rejects invalid schema and private labels', () => {
  const cases = [
    ['rank,display_name\n1,civo\n', /header must be exactly/],
    [csv(), /at least one supporter/],
    [csv(''), /line 2 is blank/],
    [csv('person@example.com'), /must not contain an email address/],
    [csv('KO-FI SUPPORTER'), /must not identify an anonymous supporter/],
    [csv('civo,private'), /exactly one field/],
    [csv('zeta', 'alpha'), /alphabetical order/],
    [`${HEADER}\n"civo\n`, /unterminated quoted field/],
    [csv(...Array.from({ length: 11 }, (_, index) => `supporter-${index + 1}`)), /at most 10 supporters/]
  ];

  for (const [source, expectedError] of cases) {
    assert.throws(() => parseSupportersCsv(source), expectedError);
  }
});
