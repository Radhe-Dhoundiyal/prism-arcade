import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {it} from 'node:test';
import catalog from '../src/research/catalog.json' with {type:'json'};

const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

it('retains the published historical assets, page references and dates',()=>{
  const sources=catalog.records.map(r=>({portalId:r.portalId,problemNumber:r.problemNumber,assets:r.assets,dates:r.correctionHistory.map(h=>h.date)}));
  assert.equal(digest(sources),'e78a350eb36580b078143631e93aa4fc4b2538cc885f6cb22ce4c3a3e9b89ad1');
  assert.match(catalog.researchContext.credit,/Radhe Dhoundiyal/);
  assert.match(catalog.researchContext.credit,/AI tools/);
  assert.match(catalog.researchContext.scope,/official problems/);
  assert.match(catalog.records.find(record=>record.portalId==='blackboard-moves').sourceNote,/no earlier notebook/);
});
