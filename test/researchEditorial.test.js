import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {it} from 'node:test';
import catalog from '../src/research/catalog.json' with {type:'json'};
import {DOSSIERS} from '../src/research/dossiers.js';

const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

it('editorial metadata retains the published historical assets, page references and dates',()=>{
  const sources=catalog.records.map(r=>({portalId:r.portalId,problemNumber:r.problemNumber,assets:r.assets,dates:r.correctionHistory.map(h=>h.date)}));
  assert.equal(digest(sources),'e78a350eb36580b078143631e93aa4fc4b2538cc885f6cb22ce4c3a3e9b89ad1');
  for(const record of catalog.records){
    assert.match(record.authorship,/Radhe Dhoundiyal/);
    for(const entry of record.correctionHistory)assert.ok(['Software verification','Mathematical correction'].includes(entry.actor));
  }
  assert.match(catalog.records.find(r=>r.portalId==='blackboard-moves').authorship,/No historical notebook or completed solution/);
});

it('complete mathematical arguments and witnesses retain their v0.3.0 identities',()=>{
  const proofs=DOSSIERS.map(d=>({id:d.id,sections:d.sections.filter((_,i)=>i!==9&&!(d.portalId==='number-forge'&&[1,2].includes(i)))}));
  assert.equal(digest(proofs),'5b7e9563fb00745589400663b415cd2220035f67f5a52eed1599dd65124e05fa');
  for(const dossier of DOSSIERS)assert.equal(dossier.sections.length,10);
});

it('research copy keeps source authorship and links to the centralized acknowledgment',()=>{
  const panel=fs.readFileSync('src/research/ResearchPanel.jsx','utf8');
  assert.match(panel,/Historical investigations and later mathematical corrections are documented separately/);
  assert.match(panel,/Source Details records the original references, public editions and verification history/);
  assert.match(panel,/blob\/main\/docs\/provenance\.md/);
  assert.match(panel,/record\.authorship/);
  assert.match(panel,/research-rights\.txt/);
  const readme=fs.readFileSync('README.md','utf8'),provenance=fs.readFileSync('docs/provenance.md','utf8');
  assert.match(readme,/\[provenance\]\(docs\/provenance\.md\)/);
  assert.doesNotMatch(readme+panel,/sole human contributor|AI-assisted|AI assistance/);
  assert.match(provenance,/AI tools assisted with software implementation, debugging, later mathematical verification and editorial preparation/);
  assert.match(provenance,/supplied by Radhe Dhoundiyal/);
  assert.match(provenance,/Historical notebooks and subsequent corrections are distinguished/);
  for(const file of ['src/research/ResearchPanel.jsx','src/research/catalog.json','src/research/dossiers.js','src/research/editorial.js',...DOSSIERS.flatMap(d=>['public'+d.document,'docs/corrections/'+d.document.split('/').at(-1)])]){
    assert.doesNotMatch(fs.readFileSync(file,'utf8'),/awaits owner confirmation|still need owner confirmation|Maker RC1|pre-Maker|\bM2A\b|\bM3\b|personal recollections|supplementary reviewable dossier/i,file);
  }
});
