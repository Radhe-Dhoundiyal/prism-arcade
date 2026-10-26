export default function PortalPreview({ portalId }) {
  return <div className={`portal-preview preview-${portalId}`} aria-hidden="true">
    {portalId === 'binary-shift' ? <div className="bit-orbit"><span>00010001</span><b>&#8635;</b><span>10001000</span></div> :
      portalId === 'parity-engine' ? <div className="probability-preview"><span>E</span><i>1/4 &#8594;</i><span>E</span><small>P(next even) = 1/4</small></div> :
      portalId === 'number-forge' ? <div className="construction-preview"><span>9</span><b>+</b><span>15</span><b>+</b><span>15</span><strong>= 39</strong></div> :
      portalId === 'temporal-graphs' ? <svg viewBox="0 0 260 90" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M65 20H195V70H65Z" /><path className="preview-trigger" d="M65 70H195" strokeWidth="5" />
        {[[65,20],[195,20],[65,70],[195,70]].map(([x,y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="currentColor" />)}
        <g fill="currentColor" stroke="none" fontSize="13"><text x="43" y="50">1</text><text x="204" y="50">2</text><text x="125" y="15">3</text><text x="125" y="87">4</text></g>
      </g></svg> : portalId === 'grid-dominion' ? <svg viewBox="0 0 260 90" focusable="false"><g>
        <path d="M85 20H175M85 65H175" stroke="currentColor" strokeWidth="3" />
        {[[85,20],[130,20],[175,20],[85,65],[130,65],[175,65]].map(([x,y], index) => <circle key={index} cx={x} cy={y} r="10" fill={index<3?'#fa7f92':'#53d9ef'} />)}
      </g></svg> : portalId === 'language-labyrinth' ? <div className="word-preview"><span>aca|b</span><b>&#8594;</b><strong>b|aca|b</strong></div> :
      portalId === 'loop-strings' ? <svg viewBox="0 0 260 90" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="2"><path d="M104 20Q160 0 170 60Q125 95 90 60Z" />
        <path className="preview-trigger" d="M104 20Q160 0 170 60" strokeWidth="5" /></g><g fill="currentColor" fontSize="18"><text x="97" y="24">1</text><text x="171" y="67">3</text><text x="72" y="67">2</text></g></svg> :
      <div className="board-preview"><span>4, 5, 5</span><b>&#8594;</b><strong>4, 10, 4</strong></div>}
  </div>;
}
