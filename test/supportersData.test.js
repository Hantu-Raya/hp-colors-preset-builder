import assert from 'node:assert/strict';
import test from 'node:test';

import { loadSupporters, parseSupportersCsv } from '../src/supportersData.js';

const HEADER = 'rank,display_name,total_usd';

function csv(...rows) {
  return [HEADER, ...rows, ''].join('\n');
}

test('parseSupportersCsv accepts ranked rows and duplicate public labels', () => {
  assert.deepEqual(
    parseSupportersCsv(csv(
      '1,civo,100',
      '2,"Ko-fi, Supporter",20',
      '3,Ko-fi Supporter,20',
      '4,Ko-fi Supporter,5.25'
    )),
    [
      { rank: 1, displayName: 'civo', totalUsd: 100 },
      { rank: 2, displayName: 'Ko-fi, Supporter', totalUsd: 20 },
      { rank: 3, displayName: 'Ko-fi Supporter', totalUsd: 20 },
      { rank: 4, displayName: 'Ko-fi Supporter', totalUsd: 5.25 }
    ]
  );
});

test('loadSupporters reads the reviewed public CSV', async () => {
  const supporters = await loadSupporters();

  assert.equal(supporters.length, 7);
  assert.deepEqual(supporters[0], { rank: 1, displayName: 'civo', totalUsd: 100 });
  assert.deepEqual(supporters.at(-1), { rank: 7, displayName: 'Timmcd', totalUsd: 5 });
});

test('parseSupportersCsv rejects invalid schema, ranking, totals, and private labels', () => {
  const cases = [
    ['display_name,rank,total_usd\ncivo,1,100\n', /header must be exactly/],
    [csv(), /at least one supporter/],
    [csv('1,,100'), /empty display_name/],
    [csv('1,person@example.com,100'), /must not contain an email address/],
    [csv('0,civo,100'), /invalid rank/],
    [csv('1,civo,100', '3,dacooder,20'), /expected rank 2/],
    [csv('1,civo,20', '2,dacooder,100'), /descending order/],
    [csv('1,civo,0'), /greater than zero/],
    [csv('1,civo,1.234'), /invalid total_usd/],
    [csv('1,civo,100,private'), /exactly three fields/],
    [`${HEADER}\n1,"civo,100\n`, /unterminated quoted field/],
    [csv(...Array.from({ length: 11 }, (_, index) => `${index + 1},supporter-${index + 1},${11 - index}`)), /at most 10 supporters/]
  ];

  for (const [source, expectedError] of cases) {
    assert.throws(() => parseSupportersCsv(source), expectedError);
  }
});
