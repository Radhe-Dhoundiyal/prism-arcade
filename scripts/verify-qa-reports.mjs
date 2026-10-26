import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const fields=new Set(['startedAt','base','backend','checks','screenshots','accessibility','errors','sourceBuild','softwareRendering','browserVersion','startupAttempts','workerFrameLatencyMs','finishedAt','passed','mode','sourceReferences','pageReferences','startupPageRequests']);
const sensitive=/(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|https?:\/\/[^\s/]*@|data:[^,]*;base64,|%PDF-|[A-Z]:\\(?:Users|Projects)\\/i;
const secretKey=/^(?:token|password|secret|authorization|cookie|storageState|localStorage|documentBody|sourceContent)$/i;

export function validateQaReport(report){
  if(!report||typeof report!=='object'||Array.isArray(report)||Object.keys(report).some(key=>!fields.has(key)))throw Error('Unexpected QA report structure');
  if(typeof report.passed!=='boolean'||!Array.isArray(report.checks)||!Array.isArray(report.errors)||!Array.isArray(report.accessibility))throw Error('Missing QA result fields');
  const inspect=value=>{
    if(typeof value==='string'&&sensitive.test(value))throw Error('Sensitive or embedded document content in QA report');
    if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){
      if(secretKey.test(key))throw Error('Sensitive field in QA report');
      inspect(child);
    }
  };
  inspect(report);
  return report;
}

export function verifyQaReports(root='.'){
  const qa=path.resolve(root,'.qa'),research=path.join(qa,'research'),selected=[];
  for(const [dir,prefix]of [[qa,'qa-'],[research,'research-']]){
    const stat=fs.lstatSync(dir);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('QA directory must be a real directory');
    const files=fs.readdirSync(dir).filter(name=>name.startsWith(prefix)&&name.endsWith('.json'));
    if(files.length!==1)throw Error('Expected exactly one JSON report per browser suite');
    const file=path.join(dir,files[0]),info=fs.lstatSync(file);
    if(info.isSymbolicLink()||!info.isFile()||info.size>2*1024*1024)throw Error('Invalid QA report file');
    let report;try{report=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw Error('Invalid QA JSON');}
    validateQaReport(report);selected.push(path.relative(root,file).replaceAll('\\','/'));
  }
  return selected;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify({reports:verifyQaReports(),passed:true}));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
