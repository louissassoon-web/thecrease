// Scoring decomposition under the contract batting policy. Diagnostic only.
const fs=require('node:fs'),vm=require('node:vm');const source=fs.readFileSync(process.argv[2]||__dirname+'/dist/index.html','utf8');vm.runInThisContext(source.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)?.[1]||source);
const contract=fs.readFileSync(__dirname+'/check-balance.cjs','utf8'),C=Cricket;
const gauss=contract.slice(contract.indexOf('function gauss('),contract.indexOf('// ---- 1.'));
let human=contract.slice(contract.indexOf('function chooseShot('),contract.indexOf('const groundGood='));
human=human.replace('const res=C.Shot.resolve','const res=C.Shot.resolve').replace('n++;\n   t.balls++',"n++;const kind=(C.Strokes.spin(ball)?'spin':'pace')+'/'+input.mode,group=groups[kind]??={balls:0,runs:0,wickets:0,fours:0,sixes:0};group.balls++;group.runs+=res.runs;group.wickets+=!!res.wicket;group.fours+=res.batRuns===4;group.sixes+=res.batRuns===6;\n   t.balls++");
const box={C,groups:{}};vm.createContext(box);vm.runInContext(gauss+human+';globalThis.human=human;',box);
const out={};for(const rate of [0,.25,1]){box.groups={};const r=box.human('T20',{sigma:60,effort:rate===1?1:.85,loftRate:rate},24);out[rate]={...r,groups:box.groups};}console.log(JSON.stringify(out,null,2));
