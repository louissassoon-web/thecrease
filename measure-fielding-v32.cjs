// Fixed 300-delivery sample, paired R31/R32 catching, 20 shot scenarios each.
// These are game probabilities, not real-player fielding statistics.
const fs=require('node:fs'),vm=require('node:vm');
const {C}=require('./check-display-input.cjs');const box={};vm.createContext(box);vm.runInContext(fs.readFileSync(__dirname+'/review-fixtures/core-v31.js','utf8'),box);const O=box.Cricket;
const teams=C.Squad.teams('T20'),totals={R31:{chances:0,drops:0,expected:0},R32:{chances:0,drops:0,expected:0}};
for(let k=1;k<=300;k++){const m=C.Innings.create(k*137,teams[k%8],teams[(k+3)%8],'T20',0),d=C.Innings.delivery(m);for(const error of [0,60,100,150])for(const angle of [0,44,87,-44,-95])for(const [name,engine]of [['R31',O],['R32',C]]){
 const ball={...d.ball,fieldingVersion:name==='R31'?30:32},r=engine.Shot.resolve(ball,{angle,mode:'loft',effort:.9,error,callRuns:true},m.batters[0],engine.Innings.field(m,ball),d.rngState),t=totals[name];if(r.play?.catchAttempt){t.chances++;t.drops+=!!r.dropped;t.expected+=1-r.play.catchAttempt.probability;}
}}
for(const [name,t]of Object.entries(totals))console.log(`${name}: ${t.drops} drops / ${t.chances} chances = ${(100*t.drops/t.chances).toFixed(2)}%; model expected ${(100*t.expected/t.chances).toFixed(2)}%.`);
