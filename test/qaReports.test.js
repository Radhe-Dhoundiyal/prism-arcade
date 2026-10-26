import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {it} from 'node:test';
import {validateQaReport,verifyQaReports} from '../scripts/verify-qa-reports.mjs';

const report=()=>({passed:true,checks:[{name:'Public source-only browser check',passed:true}],errors:[],accessibility:[{name:'lobby',violations:[]}]});
function fixture(t){
  const parent=path.resolve(os.tmpdir()),root=fs.mkdtempSync(path.join(parent,'prism-qa-'));
  t.after(()=>{assert.ok(path.resolve(root).startsWith(parent+path.sep));fs.rmSync(root,{recursive:true,force:true});});
  fs.mkdirSync(path.join(root,'.qa/research'),{recursive:true});
  fs.writeFileSync(path.join(root,'.qa/qa-test.json'),JSON.stringify(report()));
  fs.writeFileSync(path.join(root,'.qa/research/research-withheld-test.json'),JSON.stringify(report()));
  return root;
}

it('selects only the two allowlisted suite JSON reports, not hidden neighbors or media',t=>{
  const root=fixture(t);
  for(const file of ['.qa/.env','.qa/notebook.pdf','.qa/screenshot.png','.qa/research/source.tex'])fs.writeFileSync(path.join(root,file),'not an artifact');
  assert.deepEqual(verifyQaReports(root),['.qa/qa-test.json','.qa/research/research-withheld-test.json']);
  fs.writeFileSync(path.join(root,'.qa/qa-unchecked.extra.json'),'unvalidated content');
  assert.throws(()=>verifyQaReports(root),/exactly one/);
});

it('requires both generated reports and rejects unexpected report bodies',t=>{
  const root=fixture(t);fs.unlinkSync(path.join(root,'.qa/qa-test.json'));assert.throws(()=>verifyQaReports(root),/exactly one/);
  assert.throws(()=>validateQaReport({...report(),privateManuscript:'not a report'}),/structure/);
  assert.throws(()=>validateQaReport({passed:true}),/result fields/);
});

it('rejects credential-like strings, private paths and embedded documents without printing them',()=>{
  for(const value of ['ghp_'+'x'.repeat(36),'-----BEGIN PRIVATE KEY-----','https://user:password@example.org','data:application/pdf;base64,AAAA','%PDF-1.7','C:\\Users\\someone\\private.pdf']){
    assert.throws(()=>validateQaReport({...report(),errors:[value]}),/Sensitive or embedded/);
  }
  assert.throws(()=>validateQaReport({...report(),screenshots:[{storageState:{cookies:[]}}]}),/Sensitive field/);
});

it('retains failed browser results as evidence when their report content is safe',()=>{
  assert.equal(validateQaReport({...report(),passed:false,errors:['Synthetic browser assertion failed']}).passed,false);
});

it('CI explicitly validates reports and includes hidden files only through the unchanged narrow paths',()=>{
  const workflow=fs.readFileSync('.github/workflows/verify.yml','utf8');
  assert.match(workflow,/id: qa-reports/);assert.match(workflow,/run: node scripts\/verify-qa-reports\.mjs/);
  assert.match(workflow,/if: \$\{\{ always\(\) && steps\.qa-reports\.outcome == 'success' \}\}/);
  assert.match(workflow,/include-hidden-files: true/);assert.match(workflow,/if-no-files-found: error/);
  assert.match(workflow,/path: \|\n\s+\.qa\/qa-\*\.json\n\s+\.qa\/research\/research-\*\.json\n/);
  assert.doesNotMatch(workflow,/path: \|\n\s+\.qa\/\*\*/);
});
