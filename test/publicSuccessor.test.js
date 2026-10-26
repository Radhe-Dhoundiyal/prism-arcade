import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {it} from 'node:test';
import {validatePublicPaths,verifyContent} from '../scripts/verify-content.mjs';
import {generateLanguage,isPalindrome} from '../src/games/languageLabyrinth/logic.js';
import {getDossier,MIXED_PALINDROMES} from '../src/research/dossiers.js';
import {EQUATIONS} from '../src/research/mathNotation.js';
import {games,getLobbyProgressPercent} from '../src/pages/lobbyData.js';
import {LANGUAGE_CHALLENGES,evaluateLanguageChallenge} from '../src/games/languageLabyrinth/challenges.js';
import {languageResultHeading,mixedPalindromeLabels,parityLesson,numberForgeInsight} from '../src/research/editorial.js';
import {availableResearchHref,researchLinkHref} from '../src/research/assetPolicy.js';

it('all copied code and essential provenance pins and public links verify',()=>assert.equal(verifyContent().preservedFiles,84));
it('publication paths reject unapproved files without deleting their references',()=>{
  for(const name of ['public/research/paper.pdf','notes.tex','photo.png','notes.webp','private/log.json','.env.local','HANDOVER.md'])assert.throws(()=>validatePublicPaths([name]));
  assert.equal(validatePublicPaths(['src/main.jsx','README.md','.env.example','src/research/notebook-pages.json']),true);
});
it('catalog retains all eight playable portals and original source identities',()=>{
  const data=JSON.parse(fs.readFileSync('src/research/catalog.json'));
  assert.deepEqual(data.records.map(record=>record.portalId).sort(),games.map(game=>game.id).sort());
  assert.equal(games.length,8);assert.equal(games.filter(game=>game.playable).length,8);assert.equal(getLobbyProgressPercent(games),100);
  const assets=new Map(data.records.flatMap(record=>record.assets.map(asset=>[asset.url,asset])));assert.equal(assets.size,16);
  for(const asset of assets.values()){assert.match(asset.sha256,/^[a-f0-9]{64}$/);assert.ok(asset.originalFile);}
});
it('Language existence tasks preserve valid witnesses and correct terminology',()=>{
  const examples={'find-length-three-palindrome':'aca','mixed-word-exists':'cab','palindrome-with-a-and-b':'bacab','length-ten-mixed-palindrome':'bacabbacab'};
  for(const challenge of LANGUAGE_CHALLENGES.filter(challenge=>challenge.requiresWord)){
    const result=evaluateLanguageChallenge({challenge,answer:challenge.expectedAnswer,word:examples[challenge.id]});assert.equal(result.success,true);assert.equal(languageResultHeading(result),'Witness verified');
  }
  assert.equal(languageResultHeading({success:false}),'Not supported yet');assert.equal(languageResultHeading({success:true,witness:{ok:true}},{witnessRefutesStatement:true}),'Counterexample found');
});
it('finite counts and scoped labels preserve 23 versus eight',()=>{
  const words=generateLanguage(10).nodes.map(node=>node.word),mixed=words.filter(word=>word.includes('a')&&word.includes('b')&&isPalindrome(word));
  assert.equal(words.length,3866);assert.equal(mixed.length,23);assert.deepEqual(mixed.filter(word=>word.length===10).sort(),[...MIXED_PALINDROMES].sort());assert.equal(mixedPalindromeLabels(10).exactly,'Mixed palindromes, length exactly 10');
});
it('the complete constructive derivation still reaches both mixed witnesses',()=>{
  let word='a';word='c'+word;const wrap=(w,v)=>{assert.equal(w+v,word);assert.ok(w.length);word=v+w+v;};
  wrap('c','a');wrap('ac','a');assert.ok(word.startsWith('a'));word=word.slice(1)+'b';wrap('aca','b');assert.equal(word,'bacab');wrap('b','acab');wrap('acabbaca','b');assert.equal(word,'bacabbacab');assert.equal(getDossier('language-labyrinth').sections.find(section=>section.derivation).steps.length,8);
});
it('the full Number Forge dossier retains the closure proof and counterexamples',()=>{
  const note=getDossier('number-forge');assert.equal(note.sections.length,10);assert.match(note.sections[6].paragraphs.join(' '),/If c belongs to S/);assert.equal(7+7,14);assert.equal(7+7+7,21);assert.equal(Array.from({length:3},(_,x)=>7-3*x).some(n=>n>=0&&n%5===0),false);
});
it('the full Temporal dossier preserves the reverse-forest reasoning',()=>{
  const note=getDossier('temporal-graphs');assert.equal(note.sections.length,10);assert.match(note.sections.map(section=>(section.paragraphs??[]).join(' ')).join(' '),/forest/);
});
it('equation metadata retains grouping and qualified mathematical claims',()=>{
  assert.equal(EQUATIONS.binary.text,'x = (2^n - 1)/(2n - 1)');assert.equal((2**8-1)/(2*8-1),17);for(const value of Object.values(EQUATIONS)){assert.ok(value.label.length>20);assert.ok(value.note);}assert.match(parityLesson({id:'stationary-match'}),/convergent/);assert.match(numberForgeInsight({id:'prove-7'},''),/at least 9/);
});
it('research retains notebook controls, journey stages, links and keyboard focus',()=>{
  const text=fs.readFileSync('src/research/ResearchPanel.jsx','utf8');for(const word of ['prism-research-open','ArrowRight','ArrowLeft','Home','End','focus(','Original Notebook','Notebook page','Source Details','JOURNEY_STAGES','ResearchAssetLink'])assert.ok(text.includes(word),word);assert.ok(text.includes('<img'));assert.ok(text.includes('availableResearchHref(page.url)'));assert.ok(text.includes('notebook-pages.json'));
});
it('served and documentation dossiers retain all original sections and proofs',()=>{
  for(const id of ['language-labyrinth','number-forge','temporal-graphs']){const note=getDossier(id);assert.equal(note.sections.length,10);for(const file of ['public'+note.document,'docs/corrections/'+note.document.split('/').at(-1)]){const text=fs.readFileSync(file,'utf8');assert.match(text,/Mathematical correction dossier/);for(const section of note.sections)for(const paragraph of section.paragraphs??[])assert.ok(text.includes(paragraph));}}
});
it('release version and activated MIT scope retain the approved copyright and research exceptions',()=>{
  const pkg=JSON.parse(fs.readFileSync('package.json')),lock=JSON.parse(fs.readFileSync('package-lock.json'));assert.equal(pkg.version,'0.3.1');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);assert.equal(pkg.license,'MIT');assert.equal(lock.packages[''].license,'MIT');
  const license=fs.readFileSync('LICENSE');assert.equal(crypto.createHash('sha256').update(license).digest('hex'),'bba37934de03968bebd57ea8c7f84b105653444d9fd4f6492f9e1924f0c89529');assert.match(license.toString(),/Copyright \(c\) 2026 Radhe Dhoundiyal/);assert.equal(fs.existsSync('docs/license-mit.txt'),false);
  const scope=fs.readFileSync('docs/licensing.md','utf8');for(const path of ['docs/corrections/','public/research/corrections/','research/v1/','docs/media/'])assert.ok(scope.includes(path));
  assert.ok(fs.readFileSync('vite.config.js','utf8').includes("path.join(dir,'license.txt')"));
});
it('withheld links retain the exact original notebook page',()=>{
  const source='/research/problem-5-rough.pdf#page=15',policy={mode:'withheld'};assert.equal(availableResearchHref(source,policy),null);assert.equal(new URL(researchLinkHref(source,policy),'https://example.org').searchParams.get('source'),source);
});
it('research mode resolves a historical image reference to its distinct public edition',()=>{
  const source='/research/notebook-pages/language-labyrinth-15.webp';assert.equal(availableResearchHref(source,{mode:'public-editions'}),'/research/v1/pages/language-labyrinth-15.webp');assert.equal(availableResearchHref(source,{mode:'public-editions',baseUrl:'https://example.org/approved'}),'https://example.org/approved/research/v1/pages/language-labyrinth-15.webp');
});
it('source resolver rejects traversal, foreign references and unsafe host configuration',()=>{
  for(const source of ['javascript:alert(1)','/research/../secret.pdf','/research/%2e%2e/secret.pdf','https://example.org/paper.pdf'])assert.throws(()=>availableResearchHref(source,{mode:'public-editions'}));for(const baseUrl of ['http://example.org','file:///private','https://user:pass@example.org','https://example.org/?secret=x'])assert.throws(()=>availableResearchHref('/research/problem-1-rough.pdf',{mode:'public-editions',baseUrl}));
});
it('all 72 page references remain linked to authentic PDF identities',()=>{
  const notebooks=JSON.parse(fs.readFileSync('src/research/notebook-pages.json')),catalog=JSON.parse(fs.readFileSync('src/research/catalog.json'));let count=0;for(const record of catalog.records){const notebook=notebooks.records[record.portalId];if(notebook.status==='missing'){assert.equal(record.portalId,'blackboard-moves');continue;}assert.equal(record.assets.find(asset=>asset.url===notebook.sourceUrl).sha256,notebook.sourceSha256);for(const page of notebook.pages){count++;assert.match(page.sha256,/^[a-f0-9]{64}$/);assert.ok(page.width>0&&page.height>0);}}assert.equal(count,72);
});
