import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PUBLICATION_ASSETS} from '../src/research/publicationAssets.js';
import {validateResearchDirectory} from './research-assets.mjs';
import media from '../test/fixtures/media.json' with {type:'json'};

const MEDIA_PATHS = ['docs/media/lobby.png','docs/media/language.png','docs/media/blackboard.png','docs/media/loops.png'];

export function verifyPublicMedia(root='.') {
  if (JSON.stringify(media.map(file=>file.path).sort())!==JSON.stringify([...MEDIA_PATHS].sort())) throw Error('Public media allowlist changed');
  for (const file of media) {
    const bytes=fs.readFileSync(path.join(root,file.path));
    if (bytes.length!==file.bytes || crypto.createHash('sha256').update(bytes).digest('hex')!==file.sha256) throw Error('Public media hash/size mismatch: '+file.path);
    if (bytes.length<24 || bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a' || bytes.readUInt32BE(16)!==file.width || bytes.readUInt32BE(20)!==file.height) throw Error('Public media PNG/dimensions mismatch: '+file.path);
  }
  return {files:media.length,bytes:media.reduce((sum,file)=>sum+file.bytes,0)};
}

export function validatePublicPaths(files) {
  for (const file of files) {
    if (/\.(?:pdf|tex|png|webp|jpe?g|gif|zip|mp4|mp3)$/i.test(file) && !MEDIA_PATHS.includes(file)) throw Error('Unapproved asset: '+file);
    if (/(?:^|\/)(?:HANDOVER|PROJECT_CONTEXT|TODO_NEXT|SESSION_SUMMARY|CHANGED_FILES_SUMMARY)\.md$|PRISM_ARCADE_.*\.md$/.test(file)) throw Error('Private development record: '+file);
    if (file.startsWith('private/') || /\.env(?:\.|$)/.test(file) && !file.endsWith('.env.example')) throw Error('Private file: '+file);
  }
  return true;
}

export function sourceFiles(root='.') {
  return fs.readdirSync(root,{withFileTypes:true}).flatMap(entry => {
    if (entry.isSymbolicLink()) throw Error('Source symlinks are not permitted: '+entry.name);
    if (['node_modules','dist','.qa','.git'].includes(entry.name)) return [];
    const full=path.join(root,entry.name);
    return entry.isDirectory() ? sourceFiles(full) : [full];
  });
}

export function verifyContent(root='.') {
  const files=sourceFiles(root).map(file=>path.relative(root,file).replaceAll('\\','/'));
  validatePublicPaths(files);
  const screenshots=verifyPublicMedia(root);
  const payload=validateResearchDirectory(path.join(root,'public'));
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'src/research/catalog.json')));
  const assets=new Map(catalog.records.flatMap(record=>record.assets.map(asset=>[asset.url,asset])));
  if (catalog.records.length!==8 || assets.size!==16 || [...assets.values()].some(asset=>!/^[a-f0-9]{64}$/.test(asset.sha256))) throw Error('Original research catalog/provenance was reduced');
  const notebooks=JSON.parse(fs.readFileSync(path.join(root,'src/research/notebook-pages.json')));
  if (Object.values(notebooks.records).reduce((sum,record)=>sum+record.pages.length,0)!==72) throw Error('Notebook page references were reduced');
  if (!fs.existsSync(path.join(root,'public/research/availability.html'))) throw Error('Source availability notice missing');
  let links=0;
  for (const file of files.filter(file=>file.endsWith('.md'))) {
    const content=fs.readFileSync(path.join(root,file),'utf8');
    for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const target=match[1].replace(/^<|>$/g,'').split(/[?#]/)[0];
      if (!target || /^https?:|^mailto:/.test(target)) continue;
      const resolved=path.resolve(root,path.dirname(file),decodeURIComponent(target));
      if (!resolved.startsWith(path.resolve(root)+path.sep) || !fs.existsSync(resolved)) throw Error(file+': missing/escaping link '+target);
      links++;
    }
  }
  const preserved=JSON.parse(fs.readFileSync(path.join(root,'test/fixtures/preserved-code.json')));
  for (const record of preserved.files) {
    const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,record.path))).digest('hex');
    if (actual!==record.sha256) throw Error('Preserved code changed: '+record.path);
  }
  return {files:files.length,localLinks:links,preservedFiles:preserved.files.length,historicalSourceReferences:assets.size,notebookPageReferences:72,bundledHistoricalAssets:payload.checked,publicMedia:screenshots,passed:true};
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(JSON.stringify(verifyContent()));
