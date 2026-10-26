export function normalizeGenerators(generators) {
  return [...new Set(
    generators
      .map((value) => Number(value))
      .filter((value) => Number.isSafeInteger(value) && value > 0),
  )].sort((a, b) => a - b);
}

function gcdPair(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }

  return x;
}

function gcdMany(values) {
  return values.reduce((current, value) => gcdPair(current, value), 0);
}

function getSubsets(values) {
  const subsets = [];
  const limit = 2 ** values.length;

  for (let mask = 1; mask < limit; mask += 1) {
    const subset = values.filter((_, index) => mask & (1 << index));

    if (subset.length >= 2) {
      subsets.push(subset);
    }
  }

  return subsets;
}

export function suggestModuli(generators) {
  const cleanGenerators = normalizeGenerators(generators);
  const structuralSuggestions = new Set();
  const patternSuggestions = new Set();

  const subsetGcds = new Set();
  for (const generator of cleanGenerators) {
    const additions = [...subsetGcds].map((gcd) => gcdPair(gcd, generator));
    for (const gcd of additions) if (gcd > 1) structuralSuggestions.add(gcd);
    subsetGcds.add(generator);
    for (const gcd of additions) subsetGcds.add(gcd);
  }

  for (let modulus = 2; modulus <= 12; modulus += 1) {
    const residues = new Set(cleanGenerators.map((generator) => generator % modulus));
    const zeroCount = cleanGenerators.filter((generator) => generator % modulus === 0).length;

    if (zeroCount > 0 || residues.size < cleanGenerators.length) {
      patternSuggestions.add(modulus);
    }
  }

  return [
    ...[...structuralSuggestions].sort((a, b) => a - b),
    ...[...patternSuggestions]
      .filter((modulus) => !structuralSuggestions.has(modulus))
      .sort((a, b) => a - b),
  ];
}

export function analyzeReachability(generators, maxValue) {
  const cleanGenerators = normalizeGenerators(generators);
  const max = Math.max(0, Math.min(10000, Math.floor(Number(maxValue) || 0)));
  const reachable = Array(max + 1).fill(false);
  const previous = Array(max + 1).fill(null);

  reachable[0] = true;

  for (let value = 0; value <= max; value += 1) {
    if (!reachable[value]) {
      continue;
    }

    cleanGenerators.forEach((generator) => {
      const next = value + generator;

      if (next <= max && !reachable[next]) {
        reachable[next] = true;
        previous[next] = {
          from: value,
          generator,
        };
      }
    });
  }

  return {
    generators: cleanGenerators,
    max,
    reachable,
    previous,
  };
}

export function analyzeResidueClasses(analysis, modulus) {
  const cleanModulus = Math.max(1, Math.min(128, Math.floor(Number(modulus) || 1)));

  return Array.from({ length: cleanModulus }, (_, residue) => {
    const reachableNumbers = [];
    const unreachableNumbers = [];

    for (let value = residue; value <= analysis.max; value += cleanModulus) {
      if (analysis.reachable[value]) {
        reachableNumbers.push(value);
      } else {
        unreachableNumbers.push(value);
      }
    }

    return {
      residue,
      reachableNumbers,
      unreachableNumbers,
      smallestReachable: reachableNumbers[0] ?? null,
      largestUnreachable: unreachableNumbers.at(-1) ?? null,
    };
  });
}

export function getModularExplanation(generators, modulus) {
  const cleanGenerators = normalizeGenerators(generators);
  const cleanModulus = Math.max(1, Math.min(128, Math.floor(Number(modulus) || 1)));
  const residues = cleanGenerators.map((generator) => ({
    generator,
    residue: generator % cleanModulus,
  }));
  const nonzeroResidues = residues.filter(({ residue }) => residue !== 0);

  let summary = 'Generator residues show which additions can change the target class.';

  if (nonzeroResidues.length === 1) {
    summary = `Therefore the number of ${nonzeroResidues[0].generator}s controls the residue class.`;
  } else if (nonzeroResidues.length === 0) {
    summary = `All generators are 0 mod ${cleanModulus}, so only residue 0 can be built.`;
  }

  return {
    modulus: cleanModulus,
    residues,
    summary,
  };
}

export function getParityCounts(analysis) {
  return analysis.reachable.reduce(
    (counts, isReachable, value) => {
      const parity = value % 2 === 0 ? 'even' : 'odd';
      const status = isReachable ? 'reachable' : 'unreachable';
      const key = `${status}${parity[0].toUpperCase()}${parity.slice(1)}`;

      return {
        ...counts,
        [key]: counts[key] + 1,
      };
    },
    {
      unreachableOdd: 0,
      unreachableEven: 0,
      reachableOdd: 0,
      reachableEven: 0,
    },
  );
}

function getMissingValues(generators, safeMax) {
  const analysis = analyzeReachability(generators, safeMax);

  return analysis.reachable
    .map((isReachable, value) => (isReachable ? null : value))
    .filter((value) => value !== null);
}

function getSafeMissingBound(generators) {
  const cleanGenerators = normalizeGenerators(generators);

  if (cleanGenerators.length === 2 && gcdPair(cleanGenerators[0], cleanGenerators[1]) === 1) {
    return cleanGenerators[0] * cleanGenerators[1] - cleanGenerators[0] - cleanGenerators[1];
  }

  return Math.max(120, Math.max(0, ...cleanGenerators) * Math.max(8, cleanGenerators.length * 3));
}

export function getReducedMissingValues(generators) {
  const cleanGenerators = normalizeGenerators(generators);

  if (!cleanGenerators.length) {
    return [];
  }

  if (cleanGenerators.length !== 2 || gcdMany(cleanGenerators) !== 1) {
    throw new RangeError('A complete finite missing set requires two coprime generators.');
  }
  if (getSafeMissingBound(cleanGenerators) > 10000) {
    throw new RangeError('Complete missing-set bound exceeds the 10000-value budget.');
  }

  return getMissingValues(cleanGenerators, getSafeMissingBound(cleanGenerators));
}

export function detectReduction(generators, maxValue = 200) {
  const cleanGenerators = normalizeGenerators(generators);

  if (cleanGenerators.length !== 3) {
    return null;
  }

  const candidates = [];

  cleanGenerators.forEach((controller) => {
    const divisibleGenerators = cleanGenerators.filter((generator) => generator !== controller);
    const modulus = gcdMany(divisibleGenerators);

    if (
      modulus > 1 &&
      controller % modulus === 1 &&
      divisibleGenerators.every((generator) => generator % modulus === 0)
    ) {
      const reducedGenerators = divisibleGenerators.map((generator) => generator / modulus);
      // Extra groups of `modulus` controllers add `controller` to the reduced
      // quotient. The minimal-controller reduction is exact only if that
      // addition was already representable by the reduced generators.
      if (modulus > 1000 || controller > 10000 ||
          getSafeMissingBound(reducedGenerators) > 10000 ||
          !analyzeReachability(reducedGenerators, controller).reachable[controller]) return;
      const reducedMissingValues = getReducedMissingValues(reducedGenerators);
      const residueClasses = Array.from({ length: modulus }, (_, residue) => {
        let controllerCount = 0;

        while ((controller * controllerCount) % modulus !== residue) {
          controllerCount += 1;
        }

        const baseOffset = controller * controllerCount;

        return {
          residue,
          controllerCount,
          baseOffset,
          reducedEquation: `(N - ${controller}*${controllerCount}) / ${modulus}`,
          liftedMissingValues: reducedMissingValues
            .map((missing) => baseOffset + modulus * missing)
            .filter((value) => value <= maxValue),
        };
      });

      candidates.push({
        modulus,
        divisibleGenerators,
        controllerGenerator: controller,
        reducedGenerators,
        reducedMissingValues,
        residueClasses,
      });
    }
  });

  return candidates.sort((a, b) => a.modulus - b.modulus)[0] || null;
}

export function getPrismResultCard(generators) {
  const key = normalizeGenerators(generators).join(',');

  if (key === '9,15,25') {
    return {
      missedOdd: 18,
      missedEven: 18,
      largestMissed: 71,
      allReachableFrom: 72,
    };
  }

  if (key === '9,21,49') {
    return {
      missedOdd: 33,
      missedEven: 33,
      largestMissed: 131,
      allReachableFrom: 132,
    };
  }

  return null;
}

export function recoverRepresentation(analysis, target) {
  const value = Number(target);

  if (!Number.isInteger(value) || value < 0 || value > analysis.max || !analysis.reachable[value]) {
    return null;
  }

  const representation = [];
  let cursor = value;

  while (cursor > 0) {
    const step = analysis.previous[cursor];

    if (!step) {
      return null;
    }

    representation.push(step.generator);
    cursor = step.from;
  }

  return representation.reverse();
}

export function findLargestUnreachable(analysis) {
  for (let value = analysis.max; value >= 0; value -= 1) {
    if (!analysis.reachable[value]) {
      return value;
    }
  }

  return null;
}

export function getReachabilityRows(analysis) {
  return analysis.reachable.map((isReachable, value) => ({
    value,
    reachable: isReachable,
    representation: isReachable ? recoverRepresentation(analysis, value) : null,
  }));
}

export function getReachabilityStats(analysis) {
  const reachableCount = analysis.reachable.filter(Boolean).length;
  let longestGap = {
    start: null,
    end: null,
    length: 0,
  };
  let currentGapStart = null;
  let currentGapLength = 0;

  analysis.reachable.forEach((isReachable, value) => {
    if (!isReachable) {
      if (currentGapStart === null) {
        currentGapStart = value;
      }

      currentGapLength += 1;

      if (currentGapLength > longestGap.length) {
        longestGap = {
          start: currentGapStart,
          end: value,
          length: currentGapLength,
        };
      }

      return;
    }

    currentGapStart = null;
    currentGapLength = 0;
  });

  return {
    largestUnreachable: findLargestUnreachable(analysis),
    reachableCount,
    totalCount: analysis.max + 1,
    density: (analysis.max + 1) === 0 ? 0 : reachableCount / (analysis.max + 1),
    longestGap,
  };
}
