export const EQUATIONS = {
  binary: { text: 'x = (2^n - 1)/(2n - 1)', label: 'x equals the fraction with numerator two to the power n minus one and denominator two times n minus one', latex: 'x=\\frac{2^n-1}{2n-1}', note: 'Here 2n means two times n. A special number must also satisfy the original n-bit conditions.' },
  temporal: { text: 'W = |E| - |V| + k', label: 'Winning owners equal edges minus vertices plus connected components', latex: 'W=|E|-|V|+k', note: 'W counts owners who have won so far. Its daily increase counts newly winning owners.' },
  semigroup: { text: '(n - rc)/m = ax + by + ct', label: 'The fraction with numerator n minus r times c and denominator m equals a times x plus b times y plus c times t', latex: '\\frac{n-rc}{m}=ax+by+ct', note: 'Write the controller count as r + mt, with 0 <= r < m and x, y, t nonnegative integers.' },
  parity: { text: 'E_(t+1) = b + (a-b) E_t', label: 'Probability of even at step t plus one equals b plus the product of a minus b and the probability of even at step t', latex: 'E_{t+1}=b+(a-b)E_t', note: 'Here a = P(E to E) = pq and b = P(O to E) = (1-p)q. This is a finite-step recurrence, not a stationary approximation.' },
};
