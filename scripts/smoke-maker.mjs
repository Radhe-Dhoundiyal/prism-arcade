import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { games } from '../src/pages/lobbyData.js';
import { LANGUAGE_CHALLENGES } from '../src/games/languageLabyrinth/challenges.js';

const require = createRequire(import.meta.url);
const base = process.env.PRISM_BASE_URL || 'http://127.0.0.1:4175';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = path.resolve(process.env.PRISM_QA_DIR || '.qa');
const media = path.join(output, stamp);
fs.mkdirSync(media, { recursive: true });
const report = { startedAt: new Date().toISOString(), base, backend: 'Playwright', checks: [], screenshots: [], accessibility: [], errors: [] };
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const buildFiles = ['dist/index.html',...fs.readdirSync('dist/assets').map(file=>'dist/assets/'+file)].sort().map(file=>({file,sha256:digest(fs.readFileSync(file))}));
report.sourceBuild = {id:digest(JSON.stringify(buildFiles)),files:buildFiles};
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const softwareRendering = process.env.PRISM_SOFTWARE_RENDERING === '1';
const browser = await chromium.launch({ headless: true, ...(fs.existsSync(edge) ? { executablePath: edge } : {}), ...(softwareRendering ? {args:['--disable-gpu']} : {}) });
report.softwareRendering = softwareRendering;
report.browserVersion = browser.version();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage(); page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(60000);
page.on('pageerror', (error) => report.errors.push({ type: 'page', message: error.message }));
page.on('console', (message) => { if (message.type() === 'error') report.errors.push({ type: 'console', message: message.text() }); });
async function check(name, run) {
  try { await run(); report.checks.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { report.checks.push({ name, passed: false, error: error.message }); console.log('FAIL', name, error.message.slice(0, 300)); }
}
async function screenshot(name, caption) {
  const file = path.join(media, name + '.png'); await page.screenshot({ path: file, timeout: 60000 });
  report.screenshots.push({ file: path.relative(process.cwd(), file).replaceAll('\\', '/'), caption,
    timestamp:new Date().toISOString(),sourceBuild:report.sourceBuild.id,state:{route:new URL(page.url()).hash||'#lobby',reducedMotion:'reduce'},
    viewport: page.viewportSize(), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') });
}
async function accessibility(name) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const result = await page.evaluate(async () => {
    const audit = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return audit.violations.map(({ id, impact, help, nodes }) => ({ id, impact, help, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }));
  });
  report.accessibility.push({ name, violations: result });
  assert.equal(result.length, 0, `${name}: ${result.map((entry) => entry.id).join(', ')}`);
}
async function waitText(locator, text) {
  await locator.filter({ hasText: text }).waitFor({ state: 'visible', timeout: 30000 });
}
const backs = { 'loop-strings': 'loop-back-lobby', 'language-labyrinth': 'language-return-lobby' };
report.startupAttempts=[];
async function bootstrap() {
  for(let attempt=1;attempt<=2;attempt++){
    try{await page.goto(base,{waitUntil:'domcontentloaded'});await page.getByTestId('portal-action-problem-1').waitFor();report.startupAttempts.push({attempt,passed:true});return;}
    catch(error){report.startupAttempts.push({attempt,passed:false,error:error.message});if(attempt===2)throw error;await page.goto('about:blank',{waitUntil:'domcontentloaded'});}
  }
}

try {
  await bootstrap();
  await check('Lobby portal-first desktop', async () => {
    assert.equal(await page.locator('.portal-card').count(), 8);
    assert.deepEqual(await page.locator('.lobby-stats strong').allTextContents(), ['8','8','100%']);
    assert.ok((await page.getByTestId('portal-card-problem-1').boundingBox()).y < 400);
    assert.equal(await page.locator('.lobby-secondary').getAttribute('open'), null);
    await screenshot('lobby-desktop', 'Actual Maker candidate lobby, desktop; eight portals precede collapsed profile/settings.');
    await accessibility('lobby-desktop');
  });
  await check('Lobby mobile 390 and tablet 768', async () => {
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await screenshot(width === 390 ? 'lobby-mobile' : 'lobby-tablet', `Actual lobby at ${width}px.`);
      await accessibility(`lobby-${width}`);
    }
  });
  for (const game of games) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByTestId(`portal-action-problem-${game.problemNumber}`).click();
    await page.getByRole('heading', { level: 1, name: game.title, exact: true }).waitFor();
    console.log('OPEN', game.id);
    await check(`${game.id}: desktop / focus / accessibility`, async () => {
      assert.equal(await page.locator('main h1').innerText(), game.title);
      assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H1');
      await accessibility(game.id + '-desktop');
    });
    await check(`${game.id}: functional explorer/challenge`, async () => {
      if (game.id === 'binary-shift') {
        await waitText(page.getByTestId('binary-shift-final-verdict'), 'Special');
        for (const invalid of ['-1', '1.5', '1e2', '9'.repeat(156)]) {
          await page.getByTestId('binary-shift-x-input').fill(invalid);
          await waitText(page.getByTestId('binary-shift-final-verdict'), 'Invalid input');
        }
        await page.getByTestId('binary-shift-x-input').fill('17');
        await waitText(page.getByTestId('binary-shift-final-verdict'), 'Special');
        await screenshot(game.id + '-desktop', 'Actual valid n=8, x=17 binary rotation after recovery from invalid inputs.');
        await page.getByTestId('binary-shift-mode-challenge').click();
        await page.getByTestId('binary-shift-challenge-x-input').fill('1');
        await page.getByTestId('binary-shift-challenge-check').click();
        await waitText(page.getByTestId('binary-shift-challenge-result'), 'Challenge complete');
      } else if (game.id === 'parity-engine') {
        await page.getByTestId('parity-n-input').fill('20'); await page.getByTestId('parity-trials-input').fill('200');
        await page.getByTestId('parity-run-simulation').click();
        await page.getByTestId('parity-simulation-result').waitFor();
        await page.getByTestId('parity-simulation-result').scrollIntoViewIfNeeded();
        await screenshot(game.id + '-desktop', 'Actual finite-step analytic versus Monte Carlo comparison.');
        await page.getByTestId('parity-randomizer-custom').click();
        await page.getByTestId('parity-custom-pa').fill('0'); await page.getByTestId('parity-custom-pb').fill('1');
        await waitText(page.locator('main'), 'does not converge');
        await page.getByTestId('parity-mode-challenge').click();
        await page.getByTestId('parity-challenge-submit').click();
        await page.locator('[data-testid="parity-challenge-result"].is-success').waitFor();
      } else if (game.id === 'number-forge') {
        await page.getByLabel('Generators', { exact: true }).fill('6,7,10');
        await waitText(page.locator('.reduction-engine-panel'), 'No certified reduction');
        const target = page.getByLabel('n', { exact: true });
        await target.fill('14'); await waitText(page.locator('.forge-result-card'), 'Reachable');
        await target.fill('21'); await waitText(page.locator('.forge-result-card'), 'Reachable');
        await target.fill('1000000'); await waitText(page.locator('.forge-result-card'), 'Not checked');
        for (const invalid of ['', '-1', '1.5', '1e2']) {
          await target.fill(invalid); await waitText(page.locator('.forge-result-card'), 'Not checked');
        }
        await target.fill('21'); await page.locator('.reduction-engine-panel').scrollIntoViewIfNeeded();
        await screenshot(game.id + '-desktop', 'Actual guarded reduction panel; unsound generalized reduction is not asserted.');
        await page.getByTestId('number-forge-mode-challenge').click();
        await page.getByTestId('number-forge-generator-9').click();
        await page.getByTestId('number-forge-generator-15').click(); await page.getByTestId('number-forge-generator-15').click();
        await page.getByTestId('number-forge-challenge-submit').click();
        await page.locator('.campaign-result.is-success').waitFor();
      } else if (game.id === 'grid-dominion') {
        await page.locator('.size-presets').getByRole('button', { name: '2x3', exact: true }).click();
        await waitText(page.locator('.prediction-line'), 'Player 2 win');
        await page.locator('.strategy-panel').scrollIntoViewIfNeeded();
        await screenshot(game.id + '-desktop', 'Actual worker-computed exact Player 2 prediction for empty 2x3.');
        await page.getByTestId('grid-dominion-game-mode-ai').click();
        await page.getByRole('group', { name: 'AI difficulty', exact: true }).getByRole('button', { name: 'Hard', exact: true }).click();
        await page.getByTestId('grid-dominion-cell-0-0').click();
        await page.waitForFunction(() => document.querySelectorAll('.move-history .move-main').length === 2);
        await page.getByRole('group', { name: 'Human player', exact: true }).getByRole('button', { name: 'Player 2', exact: true }).click();
        await page.waitForFunction(() => document.querySelectorAll('.move-history .move-main').length === 1);
        await page.getByTestId('grid-dominion-game-mode-local').click();
        await page.locator('.size-presets').getByRole('button', { name: '3x3', exact: true }).click();
        const latency = await page.evaluate(() => new Promise((resolve) => { const start = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - start))); }));
        report.workerFrameLatencyMs = latency;
        await page.getByTestId('grid-dominion-reset').click();
        await page.locator('.size-presets').getByRole('button', { name: '5x5', exact: true }).click();
        await waitText(page.locator('.prediction-line'), 'unavailable');
      } else if (game.id === 'language-labyrinth') {
        assert.equal(await page.locator('[data-testid="language-word-table"] tbody tr').count(), 100);
        await page.getByRole('button', { name: 'Next word page', exact: true }).click();
        await page.getByTestId('language-mode-detective').click();
        const witnesses = { 'find-length-three-palindrome': 'aca', 'mixed-word-exists': 'cab', 'palindrome-with-a-and-b': 'bacab', 'length-ten-mixed-palindrome': 'bacabbacab' };
        for (const challenge of LANGUAGE_CHALLENGES) {
          await page.getByTestId('language-challenge-' + challenge.id).click();
          await page.getByRole('radio', { name: challenge.expectedAnswer === 'false' ? 'False / impossible' : 'True / exists', exact: true }).check();
          if (challenge.requiresWord) await page.getByTestId('language-challenge-word').fill(witnesses[challenge.id]);
          else await page.getByTestId('language-challenge-explanation').fill('Track each official rule: B and C preserve the relevant suffix and D ends in b.');
          await page.getByTestId('language-submit-challenge').click();
          assert.match(await page.getByTestId('language-challenge-result').getAttribute('class'), /is-success/);
        }
        await page.getByTestId('language-counterexample-gallery').scrollIntoViewIfNeeded();
        await screenshot(game.id + '-desktop', 'Actual eight-palindrome gallery and derivations; original conjecture is preserved as disproved.');
        await page.getByTestId('language-mode-explorer').click();
        await page.getByTestId('language-max-length').fill('4'); await page.getByTestId('language-generate').click();
        assert.ok(await page.locator('[data-testid="language-word-table"] tbody tr').count() < 100);
      } else if (game.id === 'temporal-graphs') {
        await page.getByRole('button', { name: 'Node A', exact: true }).press('Enter');
        await page.getByTestId('temporal-mode-challenge').click();
        for (let index = 0; index < 5; index += 1) {
          await page.getByTestId('temporal-trigger-t1').click(); await page.getByTestId('temporal-submit-challenge').click();
          await waitText(page.locator('.campaign-result'), 'Trigger Successful');
          if (index < 4) await page.getByTestId('temporal-next-challenge').click();
        }
        await page.locator('.temporal-stage').scrollIntoViewIfNeeded();
        await screenshot(game.id + '-desktop', 'Actual unit-lattice ladder; cumulative owners and one newly activated owner are distinguished.');
      } else if (game.id === 'loop-strings') {
        for (const label of [1, 2, 3]) await page.getByTestId('loop-label-' + label).click();
        await page.getByTestId('loop-apply-shift').click();
        assert.match(await page.getByTestId('loop-cycles').innerText(), /3/);
        await page.getByTestId('loop-cycles').scrollIntoViewIfNeeded();
        await screenshot(game.id + '-desktop', 'Actual 3-shift and cycle decomposition.');
        await page.locator('.loop-diagram').scrollIntoViewIfNeeded();
        await screenshot('loop-strings-diagram', 'Actual matching-label connection diagram after a 3-shift.');
        await page.getByTestId('loop-mode-challenge').click();
        for (const label of [1, 2, 3]) await page.getByTestId('loop-challenge-label-' + label).click();
        await page.getByTestId('loop-challenge-apply').click(); await page.getByTestId('loop-challenge-submit').click();
        await page.locator('[data-testid="loop-challenge-result"].is-success').waitFor();
      } else if (game.id === 'blackboard-moves') {
        await page.getByTestId('blackboard-custom-input').fill('4,5,5'); await page.getByTestId('blackboard-preset-custom').click();
        await page.getByTestId('blackboard-search').click();
        await waitText(page.getByTestId('blackboard-search-result'), '19');
        await page.getByTestId('blackboard-optimal-explainer').locator('h2').scrollIntoViewIfNeeded();
        await screenshot(game.id + '-desktop', 'Actual legal [4,5,5] optimal witness and greedy comparison.');
        await page.getByTestId('blackboard-mode-challenge').click();
        for (const pair of [[0, 1], [0, 2]]) {
          for (const index of pair) await page.getByTestId('blackboard-challenge-token-' + index).click();
          await page.getByTestId('blackboard-challenge-apply').click();
        }
        await page.getByTestId('blackboard-challenge-submit').click();
        await waitText(page.getByTestId('blackboard-challenge-result'), 'Success');
      }
    });
    await check(`${game.id}: mobile 390 / source panel`, async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => window.scrollTo(0, 0));
      await screenshot(game.id + '-mobile', 'Actual ' + game.title + ' at 390px; no simulated or edited UI.');
      const widths = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
      assert.equal(widths.content, widths.viewport, JSON.stringify(widths));
      await accessibility(game.id + '-mobile');
      await page.getByText('Explore My Reasoning', { exact: true }).click();
      const research = page.getByRole('region', { name: 'Mathematical research sources' });
      await research.getByRole('tab', { name: 'Original Notebook', exact: true }).click();
      await waitText(research, game.id==='blackboard-moves' ? 'No original notebook was found' : 'Notebook publication withheld');
      assert.equal(await research.locator('img').count(), 0);
      assert.match(await research.getByRole('link', { name: /Official question \/ page/ }).getAttribute('href'),/^\/research\/availability\.html\?source=/);
    });
    await check(`${game.id}: return to lobby`, async () => {
      const back = page.getByTestId(backs[game.id] || 'nav-back-lobby');
      if (await back.count()) await back.click();
      else await page.getByRole('button', { name: 'Return to lobby', exact: true }).click();
      await page.getByTestId('portal-action-problem-1').waitFor();
    });
  }
  await check('Hash deep link and browser-back navigation/focus', async () => {
    await page.goto(base + '/#grid-dominion');
    await page.getByRole('heading', { level: 1, name: 'Grid Dominion', exact: true }).waitFor();
    await page.getByTestId('nav-back-lobby').click();
    await page.goBack();
    await page.getByRole('heading', { level: 1, name: 'Grid Dominion', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H1');
    await page.getByTestId('nav-back-lobby').click();
  });
  await check('Save export/reset/import round-trip and invalid import preservation', async () => {
    await page.locator('.lobby-secondary > summary').click();
    await page.getByTestId('export-arcade-save').click();
    const saved = await page.getByTestId('arcade-save-text').inputValue(); const parsed = JSON.parse(saved);
    assert.equal(parsed.version, 2); assert.equal(Object.keys(parsed.data).length, 18);
    page.once('dialog', (dialog) => dialog.accept()); await page.getByTestId('reset-arcade-progress').click();
    await page.getByTestId('arcade-save-text').fill(saved); await page.getByTestId('import-arcade-save').click();
    await waitText(page.locator('.settings-panel [role="status"]'), 'imported');
    const before = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    await page.getByTestId('arcade-save-text').fill('{"version":999,"data":{}}'); await page.getByTestId('import-arcade-save').click();
    await waitText(page.locator('.settings-panel [role="status"]'), 'unsupported version');
    assert.equal(await page.evaluate(() => JSON.stringify({ ...localStorage })), before);
  });
  await check('Research references and full dossiers remain integrated while unapproved bytes are withheld', async () => {
    const catalog = JSON.parse(fs.readFileSync('src/research/catalog.json', 'utf8'));
    assert.equal(catalog.records.length,8);assert.equal(new Set(catalog.records.flatMap(record=>record.assets.map(asset=>asset.url))).size,16);
    for (const name of ['language-labyrinth', 'temporal-graphs', 'number-forge']) {
      const response = await context.request.get(base + '/research/corrections/' + name + '.md');
      assert.equal(response.status(), 200); assert.ok((await response.text()).length > 200);
    }
    const files = fs.readdirSync('public/research');
    assert.deepEqual(files.sort(), ['availability.html','corrections']);
    const notice=await context.request.get(base+'/research/availability.html?source='+encodeURIComponent('/research/problem-5-rough.pdf#page=15'));assert.equal(notice.status(),200);assert.match(await notice.text(),/not the requested PDF/);
  });
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/#language-labyrinth');
  await check('Language scanner keeps aggregate and exact-length counts live',async()=>{
    const value = async label => page.getByText(label,{exact:true}).locator('..').locator('dd').innerText();
    assert.equal(await value('Mixed palindromes, lengths 1-10'),'23');assert.equal(await value('Mixed palindromes, length exactly 10'),'8');
    await page.getByTestId('language-max-length').fill('5');await page.getByTestId('language-generate').click();assert.equal(await value('Mixed palindromes, length exactly 5'),'1');
    await page.getByTestId('language-max-length').fill('10');await page.getByTestId('language-generate').click();
    await page.getByTestId('language-invariant-scanner').scrollIntoViewIfNeeded();await screenshot('language-scanner','Code-first scanner distinguishes 23 through length 10 from eight at exactly 10.');await accessibility('language-scanner');
  });
  await check('Final Language witness rejects wrong length and confirms existence',async()=>{
    await page.getByTestId('language-mode-detective').click();await page.getByTestId('language-challenge-length-ten-mixed-palindrome').click();
    await page.getByRole('radio',{name:'True / exists',exact:true}).check();await page.getByTestId('language-challenge-word').fill('bacab');await page.getByTestId('language-submit-challenge').click();
    assert.ok(!(await page.getByTestId('language-challenge-result').getAttribute('class')).includes('is-success'));
    await page.getByTestId('language-challenge-word').fill('bacabbacab');await page.getByTestId('language-submit-challenge').click();await waitText(page.getByTestId('language-challenge-result'),'Witness verified');
    await page.getByTestId('language-challenge-result').scrollIntoViewIfNeeded();await screenshot('language-witness','A confirming length-10 witness, without notebook or paper reproduction.');
  });
  await check('Research jump, original notebook navigation and full correction dossier remain usable',async()=>{
    await page.getByRole('button',{name:'Follow the counterexample / Correction Dossier',exact:false}).click();
    const region=page.getByRole('region',{name:'Mathematical research sources'});await region.getByRole('heading',{name:'From experiment to evidence',exact:true}).waitFor();
    await page.waitForFunction(()=>document.activeElement?.tagName==='H2');
    assert.equal(await page.evaluate(()=>document.activeElement?.tagName),'H2');
    await region.getByRole('tab',{name:'Mathematical Investigation',exact:true}).press('Home');
    assert.equal(await region.getByRole('tab',{name:'Original Notebook',exact:true}).getAttribute('aria-selected'),'true');
    await region.getByLabel('Notebook page',{exact:true}).selectOption('14');
    const originalLink=region.getByRole('link',{name:/Open public-edition PDF/});assert.equal(new URL(await originalLink.getAttribute('href'),base).searchParams.get('source'),'/research/problem-5-rough.pdf#page=15');
    await region.getByRole('tab',{name:'Original Notebook',exact:true}).press('End');
    await region.getByRole('button',{name:'Read Correction Dossier',exact:true}).click();
    await region.getByRole('heading',{name:'A counterexample changes the answer',exact:true}).waitFor();
    assert.equal(await region.locator('img').count(),0);await screenshot('language-proof','Software proof notes remain readable without original source assets.');await accessibility('code-first-proof');
  });
  await check('Binary equation keeps native fraction and accessible grouping',async()=>{
    await page.goto(base+'/#binary-shift');const equation=page.locator('[data-equation-id="binary"]');await equation.waitFor();
    assert.equal(await equation.locator('mfrac').count(),1);assert.match(await equation.locator('math').getAttribute('aria-label'),/denominator two times n minus one/);
    await equation.scrollIntoViewIfNeeded();await screenshot('binary-equation','Binary Shift native equation and integer rotation, without external media.');
  });
  await check('Blackboard indexed replay reaches legal intermediate and terminal states',async()=>{
    await page.goto(base+'/#blackboard-moves');await page.getByTestId('blackboard-custom-input').fill('4,5,5');await page.getByTestId('blackboard-preset-custom').click();await page.getByTestId('blackboard-search').click();
    await page.getByLabel('Witness move',{exact:true}).waitFor();const slider=page.getByLabel('Witness move',{exact:true});await slider.focus();await slider.press('Home');for(let i=0;i<10;i++)await slider.press('ArrowRight');
    assert.deepEqual(await page.getByTestId('witness-replay-state').locator('[data-token-value]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.tokenValue))),[4,51,2]);
    await slider.press('End');assert.deepEqual(await page.getByTestId('witness-replay-state').locator('[data-token-value]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.tokenValue))),[0,70,0]);
    await page.getByTestId('blackboard-search-result').scrollIntoViewIfNeeded();await screenshot('blackboard-strategies','Legal 19-move terminal replay and the exact/greedy comparison.');
  });
  await check('Reduced motion and mobile research keyboard navigation remain usable',async()=>{
    await page.goto(base);assert.equal(await page.locator('.bit-orbit b').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.emulateMedia({reducedMotion:'no-preference'});await page.getByTestId('portal-card-problem-1').hover();await page.waitForFunction(()=>getComputedStyle(document.querySelector('.bit-orbit b')).animationName==='bit-rotation');assert.equal(await page.locator('.bit-orbit b').evaluate(el=>getComputedStyle(el).animationName),'bit-rotation');await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize({width:390,height:844});await page.goto(base+'/#loop-strings');await page.getByText('Explore My Reasoning',{exact:true}).click();
    await page.getByRole('tab',{name:'Mathematical Investigation',exact:true}).click();await page.getByRole('tab',{name:'Mathematical Investigation',exact:true}).press('Home');await page.getByRole('heading',{name:'Notebook publication withheld',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await screenshot('mobile-research','Keyboard-accessible source status at 390px, without notebook assets.');await accessibility('mobile-research');
  });
  await check('Mobile Grid keeps both color tools and player controls beside the board',async()=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+'/#grid-dominion');const controls=page.getByLabel('Board-side controls',{exact:true});await controls.scrollIntoViewIfNeeded();
    await controls.getByRole('button',{name:'Blue',exact:true}).click();await page.getByTestId('grid-dominion-cell-0-0').click();assert.match(await page.getByTestId('grid-dominion-cell-0-0').getAttribute('class'),/has-blue/);
    await controls.getByRole('button',{name:'Red',exact:true}).click();await page.getByTestId('grid-dominion-cell-0-1').click();assert.match(await page.getByTestId('grid-dominion-cell-0-1').getAttribute('class'),/has-red/);
    await controls.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await screenshot('mobile-grid','Both color tools remain available to either player on mobile.');await accessibility('mobile-grid');
  });
  assert.equal(await page.locator('vite-error-overlay').count(),0);
} catch (error) {
  report.errors.push({ type: 'fatal-harness', message: error.message });
  console.error('FATAL QA', error.message);
} finally {
  report.finishedAt = new Date().toISOString();
  report.passed = report.checks.length === 44 && report.checks.every((entry) => entry.passed) && report.errors.length === 0;
  await browser.close();
  const destination = path.join(output, `qa-${stamp}.json`);
  fs.writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
  console.log('QA_REPORT', destination, 'PASS', report.passed, 'ERRORS', report.errors.length);
  if (!report.passed) process.exitCode = 1;
}
