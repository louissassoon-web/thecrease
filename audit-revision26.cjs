// Independent timing curve plus the contract's defensive bowling census.
// Optional frozen core argument allows the same diagnostic on the old model.
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(process.argv[2]||__dirname+'/dist/index.html','utf8');
vm.runInThisContext(source.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)?.[1]||source);
const C=Cricket,teams=C.Squad.teams('T20'),samples=[];
for(let i=0;i<4000&&samples.length<1000;i++){
 const m=C.Innings.create(92831+i*137,teams[i%8],teams[(i+3)%8],'T20',0);m.balls=(i%20)*6;
 const d=C.Innings.delivery(m),ball=d.ball;if(C.Strokes.spin(ball)||!['full','good'].includes(ball.lengthName))continue;
 const x=C.Delivery.at(ball,1).x*C.Hand.sign(ball),angle=(x>.35?65:x>.1?44:x<-.15?-44:0)*C.Hand.sign(ball);
 samples.push({m,d,ball,angle});
}
const curve=[];for(const error of [0,30,60,90,120,150]){
 let edges=0,wickets=0,risk=0,runs=0;
 for(const {m,d,ball,angle}of samples){const r=C.Shot.resolve(ball,{angle,mode:'ground',error,effort:.75},m.batters[m.striker],C.Innings.field(m,ball),d.rngState);edges+=!!r.edge;wickets+=!!r.wicket;risk+=r.edgeRisk||0;runs+=r.runs;}
 curve.push({error,n:samples.length,edgePct:100*edges/samples.length,dismissedPct:100*wickets/samples.length,meanEdgeRiskPct:100*risk/samples.length,runsPerOver:6*runs/samples.length});
}
const phases={powerplay:{pace:0,yorkers:0},middle:{pace:0,yorkers:0},death:{pace:0,yorkers:0}};
for(let k=0;k<24;k++){
 const batting=teams[k%8],bowling=teams[(k+3)%8];let c=C.Contest.create(3000+k*89,'T20',batting,bowling,batting.id);
 for(let j=1;!C.Contest.ownTurn(c)&&j<50;j++)c=C.Contest.create(3000+k*89+j*17,'T20',batting,bowling,batting.id);
 let n=0;while(c.phase==='play'&&C.Contest.ownTurn(c)&&n<120){
  const m=C.Contest.current(c),d=C.Innings.delivery(m),ball=d.ball,prepared={...m,rngState:d.rngState};
  if(!C.Strokes.spin(ball)){const t=phases[m.balls<36?'powerplay':m.balls<90?'middle':'death'];t.pace++;t.yorkers+=ball.lengthName==='yorker';}
  const r=C.Shot.resolve(ball,{angle:0,mode:'defend',error:0,effort:0,callRuns:true},prepared.batters[prepared.striker],C.Innings.field(prepared,ball),d.rngState);
  c=C.Contest.apply(C.Contest.withPrepared(c,d.rngState),ball,r);n++;
 }
}
for(const row of Object.values(phases))row.yorkerPct=100*row.yorkers/row.pace;
console.log(JSON.stringify({curve,phases},null,2));
