const DEFAULT_MAX_SEARCH_N = 50;
export const MAX_BINARY_N = 512;

export function parseUnsignedInteger(value) {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) return null;
  const text = String(value ?? '').trim();
  if (!/^\d{1,155}$/.test(text)) return null;
  const number = BigInt(text);
  return number < (1n << BigInt(MAX_BINARY_N)) ? number : null;
}

function toBigInt(value, fallback = 0n) {
  return parseUnsignedInteger(value) ?? fallback;
}

export function normalizeN(value, fallback = 2) {
  const n = Math.trunc(Number(value));

  if (!Number.isFinite(n)) {
    return fallback;
  }

  return Math.max(1, Math.min(MAX_BINARY_N, n));
}

export function formatBigInt(value) {
  return value === null || value === undefined ? '-' : value.toString();
}

export function getPowerOfTwo(n) {
  return 1n << BigInt(normalizeN(n));
}

export function getNBitBinary(value, n) {
  const cleanN = normalizeN(n);
  const integer = typeof value === 'bigint' && value >= 0n && value < (1n << 522n)
    ? value : toBigInt(value);
  const bits = integer.toString(2);

  if (bits.length >= cleanN) {
    return bits;
  }

  return bits.padStart(cleanN, '0');
}

export function shiftLastBitToFront(binaryString) {
  if (!binaryString.length) {
    return '';
  }

  return `${binaryString.at(-1)}${binaryString.slice(0, -1)}`;
}

export function getShiftedValue(value, n) {
  if (parseUnsignedInteger(value) === null) throw new RangeError('Expected a nonnegative integer of at most 512 bits.');
  const binary = getNBitBinary(value, n);

  return BigInt(`0b${shiftLastBitToFront(binary)}`);
}

export function getDivisibilityRow(n) {
  const cleanN = normalizeN(n);
  const twoToNMinusOne = getPowerOfTwo(cleanN) - 1n;
  const divisor = 2n * BigInt(cleanN) - 1n;
  const divisible = twoToNMinusOne % divisor === 0n;
  const x = divisible ? twoToNMinusOne / divisor : null;
  const special = divisible && x > 0n;

  return {
    n: cleanN,
    mersenne: twoToNMinusOne,
    divisor,
    divisible,
    x,
    binaryX: x === null ? '-' : getNBitBinary(x, cleanN),
    special,
    knownSmallExample: (cleanN === 2 && x === 1n) || (cleanN === 8 && x === 17n),
  };
}

export function evaluateBinaryShift({ n, x }) {
  const parsedX = parseUnsignedInteger(x);
  if (!/^\d{1,3}$/.test(String(n ?? '').trim()) || Number(n) < 1 || Number(n) > MAX_BINARY_N || parsedX === null || parsedX === 0n) {
    return { valid: false, special: false, error: 'Enter integer n from 1 to 512 and positive integer x of at most 512 bits. Decimal and exponent notation are not accepted.',
      xBinary: '', productBinary: '', shiftedBinary: '', n: null, x: null, product: null, bound: null, shiftedValue: null };
  }
  const cleanN = normalizeN(n);
  const cleanX = parsedX;
  const nBig = BigInt(cleanN);
  const bound = getPowerOfTwo(cleanN);
  const product = nBig * cleanX;
  const xInBounds = cleanX > 0n && cleanX < bound;
  const productInBounds = product < bound;
  const xBinary = getNBitBinary(cleanX, cleanN);
  const productBinary = getNBitBinary(product, cleanN);
  const shiftedBinary = shiftLastBitToFront(xBinary);
  const shiftedValue = BigInt(`0b${shiftedBinary}`);
  const productMatchesShift = product === shiftedValue;
  const formulaRow = getDivisibilityRow(cleanN);
  const formulaCandidateMatches = formulaRow.x === cleanX;
  const lastBitIsOne = xBinary.at(-1) === '1';
  const special = xInBounds && productInBounds && productMatchesShift;

  return {
    valid: true,
    n: cleanN,
    x: cleanX,
    product,
    bound,
    xBinary,
    productBinary,
    shiftedBinary,
    shiftedValue,
    xInBounds,
    productInBounds,
    productMatchesShift,
    formulaDivisor: formulaRow.divisor,
    formulaDividend: formulaRow.mersenne,
    formulaDivisible: formulaRow.divisible,
    formulaCandidate: formulaRow.x,
    formulaCandidateMatches,
    lastBitIsOne,
    special,
  };
}

export function searchBinaryShift(maxN = DEFAULT_MAX_SEARCH_N) {
  if (!/^\d{1,3}$/.test(String(maxN)) || Number(maxN) < 2 || Number(maxN) > MAX_BINARY_N) return [];
  const cleanMax = Number(maxN);
  const rows = [];

  for (let n = 2; n <= cleanMax; n += 1) {
    rows.push(getDivisibilityRow(n));
  }

  return rows;
}

export function countSpecialValuesBelow(limit, maxN = 100) {
  const cleanLimit = toBigInt(limit);
  const valuesByX = new Map();

  searchBinaryShift(maxN).forEach((row) => {
    if (row.special && row.x < cleanLimit) {
      valuesByX.set(row.x.toString(), row);
    }
  });

  return [...valuesByX.values()].sort((a, b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : 0));
}

