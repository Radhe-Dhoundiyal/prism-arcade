import { EQUATIONS } from '../research/mathNotation.js';

export default function MathEquation({ id }) {
  const equation = EQUATIONS[id];
  if (!equation) return null;
  return <figure className="math-equation" data-equation-id={id}>
    <math display="block" aria-label={equation.label}>
      {id === 'binary' && <mrow><mi>x</mi><mo>=</mo><mfrac><mrow><msup><mn>2</mn><mi>n</mi></msup><mo>-</mo><mn>1</mn></mrow><mrow><mn>2</mn><mi>n</mi><mo>-</mo><mn>1</mn></mrow></mfrac></mrow>}
      {id === 'temporal' && <mrow><mi>W</mi><mo>=</mo><mo>|</mo><mi>E</mi><mo>|</mo><mo>-</mo><mo>|</mo><mi>V</mi><mo>|</mo><mo>+</mo><mi>k</mi></mrow>}
      {id === 'semigroup' && <mrow><mfrac><mrow><mi>n</mi><mo>-</mo><mi>r</mi><mi>c</mi></mrow><mi>m</mi></mfrac><mo>=</mo><mi>a</mi><mi>x</mi><mo>+</mo><mi>b</mi><mi>y</mi><mo>+</mo><mi>c</mi><mi>t</mi></mrow>}
      {id === 'parity' && <mrow><msub><mi>E</mi><mrow><mi>t</mi><mo>+</mo><mn>1</mn></mrow></msub><mo>=</mo><mi>b</mi><mo>+</mo><mo>(</mo><mi>a</mi><mo>-</mo><mi>b</mi><mo>)</mo><msub><mi>E</mi><mi>t</mi></msub></mrow>}
    </math>
    <figcaption>{equation.note}</figcaption>
  </figure>;
}
