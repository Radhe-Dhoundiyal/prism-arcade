import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import editions from '../src/research/public-editions.json' with {type:'json'};
import {verifyAssetPackage} from './research-assets.mjs';

export function assetBase(value) {
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('An explicit HTTPS asset base without credentials is required');
  return url.href.replace(/\/$/,'');
}

async function readManifest(response) {
  const chunks=[];let length=0;
  for await(const chunk of response.body){length+=chunk.length;if(length>1024*1024)throw Error('Edition manifest exceeds the size limit');chunks.push(chunk);}
  return Buffer.concat(chunks).toString('utf8');
}

export async function retrieveResearch(baseUrl,destination,fetcher=fetch) {
  const base=assetBase(baseUrl),target=path.resolve(destination);
  if(fs.existsSync(target))throw Error('Refusing to overwrite an existing asset directory');
  const manifestPath='/research/'+editions.version+'/manifest.json';
  const response=await fetcher(base+manifestPath,{redirect:'error'});
  if(!response.ok)throw Error('Edition manifest request failed');
  const text=await readManifest(response);
  if(text.length>1024*1024||JSON.stringify(JSON.parse(text))!==JSON.stringify(editions))throw Error('Remote manifest does not match the pinned edition');
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const working=fs.mkdtempSync(target+'.partial-');
  fs.mkdirSync(path.join(working,'research',editions.version),{recursive:true});
  fs.writeFileSync(path.join(working,manifestPath.slice(1)),JSON.stringify(editions,null,2));
  for(const asset of editions.files){
    const result=await fetcher(base+asset.url,{redirect:'error'});
    if(!result.ok||!result.body)throw Error('Research resource request failed: '+asset.url);
    const file=path.join(working,asset.url.slice(1));fs.mkdirSync(path.dirname(file),{recursive:true});
    const handle=fs.openSync(file,'wx'),hash=crypto.createHash('sha256');let size=0;
    try{for await(const chunk of result.body){size+=chunk.length;if(size>asset.bytes)throw Error('Research resource exceeds pinned size');hash.update(chunk);fs.writeSync(handle,chunk);}}finally{fs.closeSync(handle);}
    if(size!==asset.bytes||hash.digest('hex')!==asset.sha256)throw Error('Downloaded resource does not match its pin: '+asset.url);
  }
  const verified=verifyAssetPackage(working);
  if(path.dirname(path.resolve(working))!==path.dirname(target))throw Error('Asset staging path escaped its intended parent');
  fs.renameSync(working,target);return verified;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [base,directory]=process.argv.slice(2);
  if(!base||!directory)throw Error('Usage: node scripts/retrieve-research.mjs https://OWNER-APPROVED-BASE NEW-DIRECTORY');
  console.log(JSON.stringify(await retrieveResearch(base,directory)));
}
