// Diagnostic companion to the unedited contract. Same batting policy, with
// extra counters for exit speed and dismissal causes; accepts a frozen core.
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(process.argv.slice(2).find(a=>!a.startsWith('--'))||__dirname+'/dist/index.html','utf8');
vm.runInThisContext(source.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)?.[1]||source);
const contract=fs.readFileSync(__dirname+'/check-balance.cjs','utf8');
let split=contract.slice(contract.indexOf('function humanSplit('),contract.indexOf('const parity=humanSplit('));
split=split.replace('t.timed=(t.timed||0)+1;', 't.timed=(t.timed||0)+1;t.exit=(t.exit||0)+(res.exitSpeed||0);');
split=split.replace('if(res.wicket)t.wickets++;', "if(res.wicket){t.wickets++;const cause=res.edge?'edge':res.dismissalKind;t.dismissals=t.dismissals||{};t.dismissals[cause]=(t.dismissals[cause]||0)+1;}");
split=split.replace('rr:6*t.runs/', 'exitSpeed:t.exit/Math.max(1,t.timed||0),rr:6*t.runs/');
// A separate fixed population can be selected without changing the contract.
if(process.argv.includes('--independent'))split=split.replaceAll('3000+k*89','81919+k*137').replace('k*11+5','k*19+931');
const policy=contract.slice(contract.indexOf('function chooseShot('),contract.indexOf('function human('));
const gaussian=contract.slice(contract.indexOf('function gauss('),contract.indexOf('// ---- 1.'));
const box={C:Cricket};vm.createContext(box);vm.runInContext(gaussian+policy+split+';globalThis.run=humanSplit;',box);
const rows={};for(const sigma of [60,130])rows[sigma]=box.run('T20',{sigma,effort:.75,loftRate:0},process.argv.includes('--independent')?96:24);
console.log(JSON.stringify(rows,null,2));
