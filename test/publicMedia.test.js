import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {it} from 'node:test';
import media from './fixtures/media.json' with {type:'json'};
import {validatePublicPaths,verifyPublicMedia} from '../scripts/verify-content.mjs';

it('only four exact, correctly sized PNG application captures are included',()=>{
  assert.equal(verifyPublicMedia().files,4);
  assert.equal(validatePublicPaths(media.map(file=>file.path)),true);
  for(const file of ['docs/media/extra.png','public/media/lobby.png','docs/media/original.pdf','docs/media/lobby.webp'])assert.throws(()=>validatePublicPaths([file]),/Unapproved/);
});

it('public-media verification rejects altered screenshot bytes',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-media-'));
  try{
    for(const file of media){const target=path.join(root,file.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file.path,target);}
    assert.equal(verifyPublicMedia(root).files,4);
    const file=path.join(root,media[0].path),bytes=fs.readFileSync(file);bytes[bytes.length-1]^=1;fs.writeFileSync(file,bytes);
    assert.throws(()=>verifyPublicMedia(root),/hash\/size mismatch/);
  }finally{fs.rmSync(root,{recursive:true});}
});
