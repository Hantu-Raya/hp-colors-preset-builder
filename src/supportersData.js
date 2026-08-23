import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SUPPORTERS_CSV_PATH = resolve(process.cwd(), 'public/data/supporters.csv');

const EXPECTED_HEADER = ['rank', 'display_name', 'total_usd'];
const MAX_SUPPORTERS = 10;
const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/;

function parseCsvLine(line, lineNumber) {
  const fields = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      fields.push(field);
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error(`supporters.csv line ${lineNumber} has an unterminated quoted field`);
  }
  fields.push(field);
  return fields;
}

export function parseSupportersCsv(csvText) {
  if (typeof csvText !== 'string') {
    throw new TypeError('supporters.csv content must be text');
  }

  const lines = csvText.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.length === 0) throw new Error('supporters.csv is empty');

  const header = parseCsvLine(lines[0], 1);
  if (header.length !== EXPECTED_HEADER.length || header.some((field, index) => field !== EXPECTED_HEADER[index])) {
    throw new Error(`supporters.csv header must be exactly ${EXPECTED_HEADER.join(',')}`);
  }

  const rows = lines.slice(1).map((line, index) => {
    const lineNumber = index + 2;
    if (line.trim() === '') throw new Error(`supporters.csv line ${lineNumber} is blank`);

    const fields = parseCsvLine(line, lineNumber);
    if (fields.length !== EXPECTED_HEADER.length) {
      throw new Error(`supporters.csv line ${lineNumber} must contain exactly three fields`);
    }

    const [rankText, displayNameText, totalText] = fields.map((field) => field.trim());
    if (!/^[1-9]\d*$/.test(rankText)) {
      throw new Error(`supporters.csv line ${lineNumber} has an invalid rank`);
    }
    if (!displayNameText) {
      throw new Error(`supporters.csv line ${lineNumber} has an empty display_name`);
    }
    if (EMAIL_PATTERN.test(displayNameText)) {
      throw new Error(`supporters.csv line ${lineNumber} display_name must not contain an email address`);
    }
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(totalText)) {
      throw new Error(`supporters.csv line ${lineNumber} has an invalid total_usd`);
    }

    const totalUsd = Number(totalText);
    if (!Number.isFinite(totalUsd) || totalUsd <= 0) {
      throw new Error(`supporters.csv line ${lineNumber} total_usd must be greater than zero`);
    }

    return {
      rank: Number(rankText),
      displayName: displayNameText,
      totalUsd
    };
  });

  if (rows.length === 0) throw new Error('supporters.csv must contain at least one supporter');
  if (rows.length > MAX_SUPPORTERS) throw new Error(`supporters.csv must contain at most ${MAX_SUPPORTERS} supporters`);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const expectedRank = index + 1;
    if (row.rank !== expectedRank) {
      throw new Error(`supporters.csv ranks must be unique, ordered, and contiguous from 1; expected rank ${expectedRank}`);
    }
    if (index > 0 && row.totalUsd > rows[index - 1].totalUsd) {
      throw new Error('supporters.csv total_usd values must be in descending order');
    }
  }

  return rows;
}

export async function loadSupporters() {
  return parseSupportersCsv(await readFile(SUPPORTERS_CSV_PATH, 'utf8'));
}
