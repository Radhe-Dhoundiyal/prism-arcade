import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { it } from 'node:test';
import { PUBLICATION_ASSETS } from '../src/research/publicationAssets.js';
import { availableResearchHref, researchAssetRecord, publicEditionAsset, PUBLIC_RESEARCH_EDITIONS } from '../src/research/assetPolicy.js';
import { validateResearchDirectory, verifyAssetPackage, rewriteResearchLinks } from '../scripts/research-assets.mjs';
import configure from '../vite.config.js';

it('publication ledger retains 88 authentic identities and separates 86 prepared from two exclusions', () => {
  const assets = PUBLICATION_ASSETS.assets;
  assert.equal(new Set(assets.map(asset => asset.url)).size, 88);
  assert.equal(assets.filter(asset => asset.status === 'prepared').length, 86);
  assert.equal(assets.filter(asset => asset.status === 'approved').length, 0);
  assert.equal(assets.filter(asset => asset.kind === 'rough').length, 7);
  assert.equal(assets.filter(asset => asset.kind === 'notebook-page').length, 72);
  for (const asset of assets) { assert.match(asset.sha256, /^[a-f0-9]{64}$/); assert.ok(asset.bytes > 0); }
});
it('official PDF and Problem 8 extract stay inaccessible in public editions', () => {
  for (const url of ['/research/prism-india-problem-set.pdf', '/research/problem-8-original.tex']) {
    assert.equal(researchAssetRecord(url).status, 'excluded');
    for (const mode of ['withheld', 'public-editions']) assert.equal(availableResearchHref(url, { mode, baseUrl: 'https://example.org' }), null);
  }
});
it('every ledger hash agrees with the unchanged historical catalogs', () => {
  const catalog = JSON.parse(fs.readFileSync('src/research/catalog.json'));
  const notebooks = JSON.parse(fs.readFileSync('src/research/notebook-pages.json'));
  for (const asset of [...catalog.records.flatMap(record => record.assets), ...Object.values(notebooks.records).flatMap(record => record.pages)]) {
    assert.equal(researchAssetRecord(asset.url).sha256, asset.sha256);
  }
});
it('public editions preserve page anchors without exposing the original PDF', () => {
  const url = '/research/problem-5-rough.pdf#page=15';
  assert.equal(availableResearchHref(url), null);
  assert.equal(availableResearchHref(url, { mode: 'public-editions' }), '/research/v1/problem-5-notebook.pdf#page=15');
  assert.equal(availableResearchHref('/research/not-listed.pdf', { mode: 'public-editions' }), null);
  assert.throws(() => availableResearchHref(url, { mode: 'local-review' }));
});
it('changing an old approval flag cannot make a private original downloadable', () => {
  const url = '/research/problem-1-rough.pdf#page=2';
  const record = researchAssetRecord(url), previous = record.status;
  try {
    record.status = 'approved';
    assert.equal(availableResearchHref(url), null);
    assert.equal(availableResearchHref(url, { mode: 'public-editions' }), '/research/v1/problem-1-notebook.pdf#page=2');
  } finally { record.status = previous; }
});
it('build payload validation rejects unlisted binary assets and missing prepared payloads', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-assets-'));
  try {
    assert.deepEqual(validateResearchDirectory(directory), { checked: 0 });
    assert.throws(() => verifyAssetPackage(directory), /missing/);
    fs.writeFileSync(path.join(directory, 'unexpected.pdf'), 'not a PDF');
    assert.throws(() => validateResearchDirectory(directory), /Unapproved/);
  } finally { fs.rmSync(directory, { recursive: true }); }
});
it('viewer mounts only the selected lazy page and offers bounded accessible zoom', () => {
  const text = fs.readFileSync('src/research/ResearchPanel.jsx', 'utf8');
  assert.match(text, /loading="lazy"/);
  assert.equal((text.match(/<img /g) || []).length, 1);
  assert.match(text, /aria-label="Notebook zoom"/);
  assert.match(text, /\[100, 150, 200, 300\]/);
  assert.match(text, /not a solution/);
  const publication = fs.readFileSync('src/publication.css', 'utf8');
  assert.match(publication, /\.arcade-shell \.parity-trajectory-line/);
  assert.match(publication, /white-space: normal/);
});
it('publication package validation fails closed on tampering and extra originals', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-hash-'));
  const bytes=Buffer.from('Public edition fixture'),expected={version:'v1',files:[{url:'/research/v1/fixture.tex',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),sourceSha256:'0'.repeat(64)}]};
  try {
    fs.mkdirSync(path.join(directory, 'research/v1'),{recursive:true});
    fs.writeFileSync(path.join(directory,'research/v1/manifest.json'),JSON.stringify(expected));
    fs.writeFileSync(path.join(directory,'research/v1/fixture.tex'),bytes);
    assert.equal(verifyAssetPackage(directory,expected).checked,1);
    fs.writeFileSync(path.join(directory,'research/v1/fixture.tex'),'tampered');
    assert.throws(() => verifyAssetPackage(directory,expected), /hash mismatch/);
    fs.writeFileSync(path.join(directory,'research/problem-1-rough.pdf'),'private');
    assert.throws(() => verifyAssetPackage(directory,expected), /Unexpected/);
  } finally { fs.rmSync(directory, { recursive: true }); }
});
it('all seven public editions preserve source-page order and distinct source identities',()=>{
  assert.equal(PUBLIC_RESEARCH_EDITIONS.files.length,86);assert.equal(Object.keys(PUBLIC_RESEARCH_EDITIONS.records).length,7);
  let pages=0;for(const record of Object.values(PUBLIC_RESEARCH_EDITIONS.records)){
    assert.deepEqual(record.pages.map(page=>page.page),Array.from({length:record.pages.length},(_,i)=>i+1));
    for(const page of record.pages){pages++;assert.equal(page.sourcePage,page.page);assert.notEqual(page.sha256,page.sourceSha256);assert.equal(publicEditionAsset(page.sourceUrl).url,page.url);assert.ok(['A','B','C','D'].includes(page.classification));}
  }assert.equal(pages,72);
});
it('downloadable dossier links resolve relative and absolute notices without exposing held originals',()=>{
  const resolve=href=>availableResearchHref(href,{mode:'public-editions'});
  for(const prefix of ['../','/research/']){
    const input='[Notebook]('+prefix+'availability.html?source='+encodeURIComponent('/research/problem-5-rough.pdf#page=15')+')';
    assert.equal(rewriteResearchLinks(input,resolve),'[Notebook (public edition)](/research/v1/problem-5-notebook.pdf#page=15)');
    const held='[Official]('+prefix+'availability.html?source='+encodeURIComponent('/research/prism-india-problem-set.pdf')+')';
    assert.equal(rewriteResearchLinks(held,resolve),held);
  }
});
it('production preview serves public TeX with an explicit content type',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'prism-preview-'));
  try{
    const url=PUBLIC_RESEARCH_EDITIONS.files.find(asset=>asset.kind==='solution-tex').url;
    fs.mkdirSync(path.dirname(path.join(directory,url)),{recursive:true});fs.writeFileSync(path.join(directory,url),'Public TeX fixture');
    let middleware;configure().plugins.find(plugin=>plugin.name==='public-research-editions').configurePreviewServer({config:{root:directory,build:{outDir:'.'}},middlewares:{use(fn){middleware=fn;}}});
    let status,headers,ended=false;
    middleware({url,method:'HEAD'},{writeHead(code,h){status=code;headers=h;},end(){ended=true;}},()=>assert.fail('Known edition must be handled explicitly'));
    assert.equal(status,200);assert.equal(headers['Content-Type'],'application/x-tex');assert.equal(ended,true);
  }finally{fs.rmSync(directory,{recursive:true});}
});

it('remote-only builds enable pinned editions and rewrite dossiers without copying the payload',()=>{
  const previous={assets:process.env.PRISM_RESEARCH_ASSETS_DIR,base:process.env.VITE_RESEARCH_ASSET_BASE_URL};
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'prism-remote-build-'));
  try{
    delete process.env.PRISM_RESEARCH_ASSETS_DIR;
    process.env.VITE_RESEARCH_ASSET_BASE_URL='https://example.org';
    const config=configure();
    assert.equal(config.define['import.meta.env.VITE_RESEARCH_ASSET_MODE'],'"public-editions"');
    const corrections=path.join(directory,'research/corrections');fs.mkdirSync(corrections,{recursive:true});
    fs.writeFileSync(path.join(corrections,'fixture.md'),'[Notebook](/research/availability.html?source=%2Fresearch%2Fproblem-1-rough.pdf)');
    config.plugins.find(plugin=>plugin.name==='public-research-editions').writeBundle({dir:directory});
    assert.match(fs.readFileSync(path.join(corrections,'fixture.md'),'utf8'),/https:\/\/example.org\/research\/v1\/problem-1-notebook.pdf/);
    assert.equal(fs.existsSync(path.join(directory,'research/v1')),false);
    assert.equal(availableResearchHref('/research/problem-1-rough.pdf',{mode:'public-editions',baseUrl:process.env.VITE_RESEARCH_ASSET_BASE_URL}),'https://example.org/research/v1/problem-1-notebook.pdf');
    delete process.env.VITE_RESEARCH_ASSET_BASE_URL;
    assert.equal(configure().define['import.meta.env.VITE_RESEARCH_ASSET_MODE'],'"withheld"');
    process.env.VITE_RESEARCH_ASSET_BASE_URL='https://user:secret@example.org';
    assert.throws(()=>configure(),/approved HTTPS/);
  }finally{
    for(const [name,value] of [['PRISM_RESEARCH_ASSETS_DIR',previous.assets],['VITE_RESEARCH_ASSET_BASE_URL',previous.base]]){if(value===undefined)delete process.env[name];else process.env[name]=value;}
    fs.rmSync(directory,{recursive:true});
  }
});
