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

it('research copy uses confirmed attribution without repeating the full acknowledgment in dossiers',()=>{
  const panel=fs.readFileSync('src/research/ResearchPanel.jsx','utf8');
  assert.match(panel,/investigations are credited to Radhe Dhoundiyal/);
  assert.equal((panel.match(/AI assistance/g)??[]).length,1);
  assert.match(panel,/research-rights\.txt/);
  assert.match(fs.readFileSync('README.md','utf8'),/Software development, debugging, later mathematical verification and editorial preparation were AI-assisted/);
  for(const file of ['src/research/ResearchPanel.jsx','src/research/catalog.json','src/research/dossiers.js','src/research/editorial.js',...DOSSIERS.flatMap(d=>['public'+d.document,'docs/corrections/'+d.document.split('/').at(-1)])]){
    assert.doesNotMatch(fs.readFileSync(file,'utf8'),/awaits owner confirmation|still need owner confirmation|Maker RC1|pre-Maker|\bM2A\b|\bM3\b|personal recollections|supplementary reviewable dossier/i,file);
  }
});
