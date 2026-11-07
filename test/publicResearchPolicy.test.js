import assert from 'node:assert/strict';
import fs from 'node:fs';
import {it} from 'node:test';
import {validatePublicPaths,verifyContent} from '../scripts/verify-content.mjs';
import {BASE_WORDS,generateLanguage,getRuleApplications,isPalindrome} from '../src/games/languageLabyrinth/logic.js';
import {getDossier,MIXED_PALINDROMES} from '../src/research/dossiers.js';
import {EQUATIONS} from '../src/research/mathNotation.js';
import {games,getLobbyProgressPercent} from '../src/pages/lobbyData.js';
import {LANGUAGE_CHALLENGES,evaluateLanguageChallenge} from '../src/games/languageLabyrinth/challenges.js';
import {availableResearchHref,researchLinkHref} from '../src/research/assetPolicy.js';

it('verifies public research links and assets without bundling historical originals',()=>{
  const result=verifyContent();
  assert.ok(result.localLinks>0);
  assert.equal(result.bundledHistoricalAssets,0);
});
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
it('Language existence tasks accept their generated witnesses',()=>{
  const examples={'find-length-three-palindrome':'aca','mixed-word-exists':'cab','palindrome-with-a-and-b':'bacab','length-ten-mixed-palindrome':'bacabbacab'};
  for(const challenge of LANGUAGE_CHALLENGES.filter(challenge=>challenge.requiresWord)){
    const result=evaluateLanguageChallenge({challenge,answer:challenge.expectedAnswer,word:examples[challenge.id]});assert.equal(result.success,true);
  }
});
it('the displayed list agrees with the eight exact-length mixed palindromes',()=>{
  const words=generateLanguage(10).nodes.map(node=>node.word),mixed=words.filter(word=>word.includes('a')&&word.includes('b')&&isPalindrome(word));
  assert.equal(words.length,3866);assert.equal(mixed.length,23);assert.deepEqual(mixed.filter(word=>word.length===10).sort(),[...MIXED_PALINDROMES].sort());
});
it('replays the dossier derivation under the language rules',()=>{
  const [axiom,...steps]=getDossier('language-labyrinth').sections.find(section=>section.derivation).steps;
  let word=axiom.split(':')[0];
  assert.ok(BASE_WORDS.includes(word));
  const reached=new Set([word]);
  for(const step of steps){
    const match=/^([abc]+)\s*->\s*([abc]+)\s*:\s*\(([bcd])\)/i.exec(step);
    assert.ok(match,step);
    const [,from,to,rule]=match;
    assert.equal(from,word);
    assert.ok(getRuleApplications(from).some(application=>application.rule===rule.toUpperCase()&&application.word===to),step);
    reached.add(to);
    word=to;
  }
  assert.ok(reached.has('bacab'));
  assert.equal(word,'bacabbacab');
});
it('equation metadata retains mathematical grouping and accessible alternatives',()=>{
  assert.equal(EQUATIONS.binary.text,'x = (2^n - 1)/(2n - 1)');
  for(const value of Object.values(EQUATIONS))assert.ok(value.label.trim());
});
it('package and lockfile identify the same software release and license',()=>{
  const pkg=JSON.parse(fs.readFileSync('package.json')),lock=JSON.parse(fs.readFileSync('package-lock.json'));
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.equal(pkg.license,'MIT');
  assert.equal(lock.packages[''].license,pkg.license);
  assert.match(fs.readFileSync('LICENSE','utf8'),/Copyright \(c\) 2026 Radhe Dhoundiyal/);
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
