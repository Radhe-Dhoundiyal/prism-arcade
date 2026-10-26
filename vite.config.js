import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { validateResearchDirectory, verifyAssetPackage, installAssetPackage, rewriteResearchLinks } from './scripts/research-assets.mjs';
import { availableResearchHref, PUBLIC_RESEARCH_EDITIONS } from './src/research/assetPolicy.js';

export default defineConfig(() => {
  if (process.env.PRISM_PRIVATE_RESEARCH) throw Error('Private-original builds are not supported by the public edition; use the preserved private archive.');
  const assets = process.env.PRISM_RESEARCH_ASSETS_DIR || '';
  const output = process.env.PRISM_RESEARCH_OUT_DIR || '';
  const baseUrl = process.env.VITE_RESEARCH_ASSET_BASE_URL || '';
  if (output && path.resolve(output).startsWith(process.cwd() + path.sep)) throw Error('Separate research output must be outside the source tree.');
  validateResearchDirectory('public');
  if (assets) verifyAssetPackage(assets);
  if (baseUrl) availableResearchHref('/research/problem-1-rough.pdf',{mode:'public-editions',baseUrl});
  const enabled=Boolean(assets);
  const editionPaths=new Set(PUBLIC_RESEARCH_EDITIONS.files.map(asset=>asset.url));
  const manifestPath='/research/'+PUBLIC_RESEARCH_EDITIONS.version+'/manifest.json';
  const mime={'.pdf':'application/pdf','.webp':'image/webp','.tex':'application/x-tex','.json':'application/json'};
  const protectResearch=(directory,serve=false)=>(request,response,next)=>{
    const url=new URL(request.url,'http://localhost').pathname;
    if (!url.startsWith('/research/')) return next();
    if (editionPaths.has(url)||url===manifestPath) {
      const file=path.join(directory,url.slice(1));
      if(!fs.existsSync(file)){response.writeHead(404,{'Content-Type':'text/plain'});return response.end('Public-edition asset unavailable.');}
      if(serve){response.writeHead(200,{'Content-Type':mime[path.extname(file)],'Content-Length':fs.statSync(file).size,'Cache-Control':'no-cache'});return request.method==='HEAD'?response.end():fs.createReadStream(file).pipe(response);}
      return next();
    }
    if (/\.(?:pdf|tex|webp)$/.test(url)) {response.writeHead(404,{'Content-Type':'text/plain'});return response.end('Historical original is not distributed.');}
    next();
  };
  const researchPlugin = {
    name:'public-research-editions',
    configureServer(server){server.middlewares.use(protectResearch(enabled?assets:'public',true));},
    configurePreviewServer(server){server.middlewares.use(protectResearch(path.resolve(server.config.root,server.config.build.outDir),true));},
    writeBundle(options) {
      const dir=options.dir;
      if (enabled) installAssetPackage(assets,dir);
      fs.copyFileSync('notices/dependencies.txt',path.join(dir,'third-party-notices.txt'));
      fs.copyFileSync('LICENSE',path.join(dir,'license.txt'));
      fs.copyFileSync('RESEARCH_NOTICE.md',path.join(dir,'research-rights.txt'));
      if (enabled) {
        for (const name of fs.readdirSync(path.join(dir,'research/corrections'))) {
          const file=path.join(dir,'research/corrections',name);
          const text=rewriteResearchLinks(fs.readFileSync(file,'utf8'),href=>availableResearchHref(href,{mode:'public-editions',baseUrl}));
          fs.writeFileSync(file,'> Source links open edited public editions; original hashes identify private historical sources. Mathematical corrections remain separate.\n\n'+text);
        }
      }
    },
  };
  return {
    plugins: [react(), researchPlugin],
    server: {fs:{strict:true,allow:[process.cwd()]}},
    ...(output ? { build: { outDir: output, emptyOutDir: false, sourcemap:false } } : {build:{sourcemap:false}}),
    define: {
      'import.meta.env.VITE_RESEARCH_ASSET_MODE': JSON.stringify(enabled ? 'public-editions' : 'withheld'),
      'import.meta.env.VITE_RESEARCH_ASSET_BASE_URL': JSON.stringify(baseUrl),
    },
  };
});
