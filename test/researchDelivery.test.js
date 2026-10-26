import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {it} from 'node:test';
import {assetBase,retrieveResearch} from '../scripts/retrieve-research.mjs';
import editions from '../src/research/public-editions.json' with {type:'json'};

it('retrieval accepts only an explicit credential-free HTTPS base',()=>{
  assert.equal(assetBase('https://example.org/archive/'),'https://example.org/archive');
  for(const value of ['http://example.org','file:///private','https://user:secret@example.org','https://example.org/?key=1','https://example.org/#x'])assert.throws(()=>assetBase(value));
});
it('retrieval fails before writing when the remote manifest is not pinned',async()=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'prism-retrieval-')),directory=path.join(parent,'new-assets');
  try{await assert.rejects(retrieveResearch('https://example.org',directory,async()=>new Response('{}')),/pinned/);assert.equal(fs.existsSync(directory),false);}finally{fs.rmSync(parent,{recursive:true});}
});
it('retrieval refuses an existing directory without fetching or replacing it',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'prism-existing-'));let fetched=false;
  try{await assert.rejects(retrieveResearch('https://example.org',directory,async()=>{fetched=true;}),/overwrite/);assert.equal(fetched,false);}finally{fs.rmSync(directory,{recursive:true});}
});
it('a failed resource retains an identifiable partial directory, never a completed package',async()=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'prism-partial-')),directory=path.join(parent,'assets');
  try{
    await assert.rejects(retrieveResearch('https://example.org',directory,async url=>new Response(url.endsWith('manifest.json')?JSON.stringify(editions):'wrong bytes')),/does not match/);
    assert.equal(fs.existsSync(directory),false);assert.equal(fs.readdirSync(parent).filter(name=>name.startsWith('assets.partial-')).length,1);
  }finally{fs.rmSync(parent,{recursive:true});}
});
it('oversized remote manifests fail before creating local directories',async()=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'prism-manifest-')),directory=path.join(parent,'assets');
  try{await assert.rejects(retrieveResearch('https://example.org',directory,async()=>new Response('x'.repeat(1024*1024+1))),/size limit/);assert.equal(fs.existsSync(directory),false);}finally{fs.rmSync(parent,{recursive:true});}
});
