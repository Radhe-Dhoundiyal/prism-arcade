import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {games} from '../src/pages/lobbyData.js';
import {availableResearchHref,PUBLIC_RESEARCH_EDITIONS} from '../src/research/assetPolicy.js';
import {PUBLICATION_ASSETS} from '../src/research/publicationAssets.js';
const require=createRequire(import.meta.url),mode=process.env.PRISM_RESEARCH_TEST_MODE||'withheld';
assert.ok(['withheld','public-editions'].includes(mode));
const base=process.env.PRISM_BASE_URL||'http://127.0.0.1:4197',output=path.resolve(process.env.PRISM_QA_DIR||'.qa/research');fs.mkdirSync(output,{recursive:true});
const assetBase=process.env.VITE_RESEARCH_ASSET_BASE_URL||base;
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),catalog=JSON.parse(fs.readFileSync('src/research/catalog.json')),notebooks=JSON.parse(fs.readFileSync('src/research/notebook-pages.json'));
const report={startedAt:new Date().toISOString(),mode,base,checks:[],errors:[],accessibility:[],screenshots:[],sourceReferences:16,pageReferences:72,startupAttempts:[]};
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const softwareRendering=process.env.PRISM_SOFTWARE_RENDERING==='1';
const browser=await chromium.launch({headless:true,...(fs.existsSync(edge)?{executablePath:edge}:{}),...(softwareRendering?{args:['--disable-gpu']}:{})}),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(60000);
report.softwareRendering=softwareRendering;report.browserVersion=browser.version();
page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
const requestedPages=[];page.on('request',request=>{if(request.url().includes('/research/v1/pages/'))requestedPages.push(request.url());});
async function setZoom(region,value){await region.getByLabel('Notebook zoom',{exact:true}).selectOption(String(value));await page.waitForFunction(value=>document.querySelector('.notebook-sheet')?.style.width===`${value}%`,value);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function verifyPage(region,entry){
 await region.getByLabel('Notebook page',{exact:true}).selectOption(String(entry.page-1));
 await region.locator('.notebook-viewport').scrollIntoViewIfNeeded();
 await page.waitForFunction(url=>{const image=document.querySelector('img.notebook-page');return image?.currentSrc.endsWith(url)&&image.complete&&image.naturalWidth>0;},entry.url);
 const image=region.locator('img.notebook-page');assert.equal(await image.evaluate(img=>img.naturalWidth),entry.width);assert.equal(await image.getAttribute('loading'),'lazy');
 assert.equal(await region.locator('[data-edition-class]').getAttribute('data-edition-class'),entry.classification);
 report.pageVisits??=[];report.pageVisits.push({url:entry.url,page:entry.page,classification:entry.classification,viewport:page.viewportSize()});
}
const check=async(name,action)=>{try{await action();report.checks.push({name,passed:true});console.log('PASS',name);}catch(error){report.checks.push({name,passed:false,error:error.message});console.log('FAIL',name,error.message.slice(0,200));}};
async function axe(name){await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(({id,help})=>({id,help})));report.accessibility.push({name,violations});assert.deepEqual(violations,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),page.viewportSize().width);}
try{
 for(let attempt=1;attempt<=2;attempt++){
  try{await page.goto(base,{waitUntil:'domcontentloaded'});await page.getByTestId('portal-action-problem-1').waitFor();report.startupAttempts.push({attempt,passed:true});break;}
  catch(error){report.startupAttempts.push({attempt,passed:false,error:error.message});if(attempt===2)throw error;await page.goto('about:blank',{waitUntil:'domcontentloaded'});}
 }
 assert.equal(requestedPages.length,0,'Notebook pages must not load at lobby startup');report.startupPageRequests=0;
 for(const game of games)await check(game.id+': research and notebook integration',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/?research-check='+game.id+'#'+game.id,{waitUntil:'domcontentloaded'});await page.getByText('Explore My Reasoning',{exact:true}).click();
  const region=page.getByRole('region',{name:'Mathematical research sources'});assert.equal(await region.locator('.journey-stages button').count(),6);
  await region.getByRole('tab',{name:'Original Notebook',exact:true}).click();const notebook=notebooks.records[game.id],edition=PUBLIC_RESEARCH_EDITIONS.records[game.id];
  if(notebook.status==='missing'){await region.getByRole('heading',{name:'Notebook awaiting source',exact:true}).waitFor();assert.equal(await region.locator('img').count(),0);}
  else{
   const last=edition.pages.at(-1);
   await region.getByLabel('Notebook page',{exact:true}).selectOption('0');
   assert.equal(await region.getByRole('button',{name:'Previous notebook page',exact:true}).isDisabled(),true);
   const before=requestedPages.length;
   if(mode==='public-editions'){
    await verifyPage(region,edition.pages[0]);await verifyPage(region,edition.pages[Math.floor(edition.pages.length/2)]);
    await region.getByRole('button',{name:'Next notebook page',exact:true}).click();
    assert.equal(await region.getByLabel('Notebook page',{exact:true}).inputValue(),String(Math.floor(edition.pages.length/2)+1));
    await region.getByRole('button',{name:'Previous notebook page',exact:true}).click();
   }
   await region.getByLabel('Notebook page',{exact:true}).selectOption(String(last.page-1));
   assert.equal(await region.getByRole('button',{name:'Next notebook page',exact:true}).isDisabled(),true);
   const link=region.getByRole('link',{name:/^Open public-edition PDF/});
   if(mode==='public-editions'){
    await verifyPage(region,last);const image=region.locator('img.notebook-page');
    assert.equal(await image.evaluate(image=>image.naturalWidth),last.width);assert.equal(await link.getAttribute('href'),(assetBase===base?'':assetBase)+edition.pdfUrl+'#page='+last.page);
    await setZoom(region,100);const normal=await image.evaluate(image=>image.getBoundingClientRect().width);
    await setZoom(region,200);
    const wide=await image.evaluate(image=>image.getBoundingClientRect().width);report.zoomMeasurements??=[];report.zoomMeasurements.push({portal:game.id,normal,wide});assert.ok(Math.abs(wide/normal-2)<0.05);
    assert.equal(await region.locator('img').count(),1);assert.ok(requestedPages.length-before<notebook.pages.length);
    const viewport=region.getByRole('region',{name:'Zoomable notebook page',exact:true});await viewport.focus();await viewport.press('ArrowRight');
    await setZoom(region,100);
    const response=await context.request.get(assetBase+edition.pdfUrl);assert.equal(response.status(),200);assert.match(response.headers()['content-type'],/pdf/);assert.equal((await response.body()).subarray(0,4).toString(),'%PDF');
    await region.locator('.notebook-toolbar').scrollIntoViewIfNeeded();const file=path.join(output,game.id+'-desktop-'+stamp+'.png');await page.screenshot({path:file});report.screenshots.push({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),viewport:page.viewportSize(),state:{mode,page:last.page,route:'#'+game.id}});
    await page.setViewportSize({width:390,height:844});for(const entry of [edition.pages[0],edition.pages[Math.floor(edition.pages.length/2)],last])await verifyPage(region,entry);
    await setZoom(region,300);assert.ok(await region.locator('.notebook-viewport').evaluate(el=>el.scrollWidth>el.clientWidth));await setZoom(region,100);await axe(game.id+' mobile notebook');await page.setViewportSize({width:1440,height:1000});
   }else{
    await region.getByRole('heading',{name:'Notebook publication withheld',exact:true}).waitFor();assert.equal(await region.locator('img').count(),0);
    const href=await link.getAttribute('href');assert.equal(new URL(href,base).searchParams.get('source'),notebook.sourceUrl+'#page='+last.page);
   }
  }
  await region.getByRole('tab',{name:'Original Notebook',exact:true}).press('End');assert.equal(await region.getByRole('tab',{name:'Proof & Verification',exact:true}).getAttribute('aria-selected'),'true');
  if(mode==='public-editions'&&edition){const solution=region.getByRole('link',{name:'Historical solution - public TeX edition',exact:true});assert.equal(await solution.getAttribute('href'),(assetBase===base?'':assetBase)+edition.texUrl);}
  if(['language-labyrinth','number-forge','temporal-graphs'].includes(game.id)){
   await region.getByRole('button',{name:'Read Correction Dossier',exact:true}).click();assert.equal(await region.locator('.correction-dossier section').count(),10);
   const markdown=region.getByRole('link',{name:'Open Markdown dossier',exact:true});const response=await context.request.get(base+await markdown.getAttribute('href'));assert.equal(response.status(),200);
   if(mode==='public-editions')assert.ok((await response.text()).includes('/research/v1/'));
  }
  const details=region.getByText('Source Details / hashes and correction history',{exact:true});await details.click();assert.ok(await region.locator('[data-source-original]').count()>0);await axe(game.id);
 });
 await check('Language original-claim page jumps and complete proof dossier',async()=>{
  await page.goto(base+'/#language-labyrinth',{waitUntil:'domcontentloaded'});await page.getByText('Explore My Reasoning',{exact:true}).click();const region=page.getByRole('region',{name:'Mathematical research sources'});
  await region.getByRole('button',{name:'Original claim / notebook page 15',exact:true}).click();assert.equal(await region.getByLabel('Notebook page',{exact:true}).inputValue(),'14');
  if(mode==='public-editions'){const image=region.locator('img.notebook-page');await page.waitForFunction(()=>document.querySelector('img.notebook-page')?.currentSrc.includes('language-labyrinth-15.webp'));assert.ok((await image.getAttribute('src')).endsWith('language-labyrinth-15.webp'));}
  await region.getByRole('tab',{name:'Mathematical Investigation',exact:true}).click();await region.getByRole('button',{name:'Read Correction Dossier',exact:true}).click();await region.getByRole('heading',{name:'5. Explicit derivations',exact:true}).waitFor();assert.equal(await region.locator('.derivation-steps li').count(),8);
 });
 await check('All canonical original and notebook references authenticate in the selected mode',async()=>{
  const assets=new Map(catalog.records.flatMap(record=>record.assets.map(asset=>[asset.url,asset])));const pages=Object.values(notebooks.records).flatMap(record=>record.pages);assert.equal(assets.size,16);assert.equal(pages.length,72);
  if(mode==='public-editions')for(const asset of PUBLIC_RESEARCH_EDITIONS.files){const response=await context.request.get(assetBase+asset.url);assert.equal(response.status(),200);assert.match(response.headers()['content-type'],asset.kind==='notebook-pdf'?/application\/pdf/:asset.kind==='notebook-page'?/image\/webp/:/(?:text|application)\/(?:x-)?(?:tex|plain)/);assert.equal(crypto.createHash('sha256').update(await response.body()).digest('hex'),asset.sha256);}
  else for(const asset of assets.values())assert.equal(availableResearchHref(asset.url,{mode:'withheld'}),null);
  for(const asset of PUBLICATION_ASSETS.assets){const response=await context.request.get(base+asset.url);assert.equal(response.status(),404,'Private original exposed: '+asset.url);}
  const held=await context.request.get(base+'/research/availability.html?source='+encodeURIComponent('/research/prism-india-problem-set.pdf'));assert.equal(held.status(),200);assert.ok((await held.text()).includes('Untouched historical originals remain'));
 });
 await check('Mobile notebook controls, source references and availability remain accessible',async()=>{
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/#language-labyrinth',{waitUntil:'domcontentloaded'});
  const region=page.getByRole('region',{name:'Mathematical research sources'});
  if(await region.locator('details').first().getAttribute('open')===null)await page.getByText('Explore My Reasoning',{exact:true}).click();
  await region.getByRole('tab',{name:'Original Notebook',exact:true}).click();await page.getByLabel('Notebook page',{exact:true}).selectOption('14');
  if(mode==='public-editions'){
   await region.locator('.notebook-viewport').scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const image=document.querySelector('img.notebook-page');return image?.complete&&image.naturalWidth>0;});
   await setZoom(region,300);assert.ok(await region.locator('.notebook-viewport').evaluate(el=>el.scrollWidth>el.clientWidth));
   await setZoom(region,100);
  }
  await page.locator('.notebook-toolbar').scrollIntoViewIfNeeded();await axe('mobile-notebook');const file=path.join(output,'research-'+mode+'-'+stamp+'.png');await page.screenshot({path:file});report.screenshots.push({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),viewport:page.viewportSize(),timestamp:new Date().toISOString(),state:{mode,page:15,route:'#language-labyrinth'}});
 });
}catch(error){report.errors.push(error.message);}finally{report.passed=report.checks.length===11&&report.checks.every(check=>check.passed)&&!report.errors.length;report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,'research-'+mode+'-'+stamp+'.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log('RESEARCH_QA',mode,report.passed);if(!report.passed)process.exitCode=1;}
