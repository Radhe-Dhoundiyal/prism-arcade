import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import editions from '../src/research/public-editions.json' with { type: 'json' };

export function rewriteResearchLinks(text, resolve) {
  return text.replace(/\[([^\]]+)\]\((?:\/research\/|\.\.\/)availability\.html\?source=([^)]*)\)/g, (match, label, encoded) => {
    const href = resolve(decodeURIComponent(encoded));
    return href ? '[' + label + ' (public edition)](' + href + ')' : match;
  });
}

export function walkFiles(directory) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    if (entry.isSymbolicLink()) throw Error('Asset symlinks are not permitted');
    const full=path.join(directory,entry.name);
    return entry.isDirectory() ? walkFiles(full) : [full];
  });
}

export function validateResearchDirectory(directory) {
  for (const file of walkFiles(directory)) if (/\.(?:pdf|tex|webp|png|jpe?g|gif|zip|mp4|mp3)$/i.test(file)) throw Error('Unapproved research bytes in source public directory: '+file);
  return {checked:0};
}

export function verifyAssetPackage(directory, expected=editions) {
  if (!directory || !fs.existsSync(directory)) throw Error('Set PRISM_RESEARCH_ASSETS_DIR to the separate versioned public-edition package');
  const root=path.resolve(directory), permitted=new Map(expected.files.map(asset=>[asset.url.slice(1),asset]));
  const manifestName='research/'+expected.version+'/manifest.json';
  const files=walkFiles(root).map(file=>path.relative(root,file).replaceAll('\\','/'));
  if (files.length!==permitted.size+1 || files.some(file=>file!==manifestName&&!permitted.has(file))) throw Error('Unexpected or missing research package files');
  const actual=JSON.parse(fs.readFileSync(path.join(root,manifestName)));
  if (JSON.stringify(actual)!==JSON.stringify(expected)) throw Error('Edition manifest differs from the pinned source manifest');
  for (const [name,asset] of permitted) {
    if (!/^research\/v[1-9]\d*\/[a-z0-9/_-]+\.(?:pdf|tex|webp)$/.test(name)) throw Error('Unsafe edition path');
    const bytes=fs.readFileSync(path.join(root,name));
    if (bytes.length!==asset.bytes || crypto.createHash('sha256').update(bytes).digest('hex')!==asset.sha256) throw Error('Research hash mismatch: '+name);
    if (asset.sha256===asset.sourceSha256) throw Error('A derivative cannot silently reuse a historical identity');
  }
  return {checked:permitted.size,manifest:manifestName,bytes:expected.files.reduce((n,a)=>n+a.bytes,0)};
}

export function installAssetPackage(directory,output) {
  const result=verifyAssetPackage(directory);
  for(const name of [...editions.files.map(asset=>asset.url.slice(1)),result.manifest]) {
    const to=path.join(output,name);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(directory,name),to);
  }
  return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(JSON.stringify(verifyAssetPackage(process.env.PRISM_RESEARCH_ASSETS_DIR)));
