// Fixed independent population, using the contract's batting policies without
// modifying its seeds, ranges or source. Optional frozen engine for comparison.
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(process.argv[2]||__dirname+'/dist/index.html','utf8');
vm.runInThisContext(source.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)?.[1]||source);
const contract=fs.readFileSync(__dirname+'/check-balance.cjs','utf8');
const gaussian=contract.slice(contract.indexOf('function gauss('),contract.indexOf('// ---- 1.'));
const policy=contract.slice(contract.indexOf('function chooseShot('),contract.indexOf('const groundGood='))
 .replaceAll('1000+k*97','81919+k*137').replace('k*7+1','k*19+931');
const box={C:Cricket};vm.createContext(box);vm.runInContext(gaussian+policy+';globalThis.run=human;',box);
const rows={};for(const [name,s] of Object.entries({ground:{sigma:60,effort:.75,loftRate:0},poor:{sigma:130,effort:.75,loftRate:0},mix:{sigma:60,effort:.85,loftRate:.25},slog:{sigma:60,effort:1,loftRate:1}})){
 const r=box.run('T20',s,96);rows[name]={...r,projected:Math.round(r.rr/6*Math.min(120,10*r.ballsPerWicket))};
}
console.log(JSON.stringify({inningsPerPolicy:96,rows},null,2));
