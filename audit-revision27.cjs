// Independent delivery population: timing curves and stump-line geometry.
// Never rewrites the acceptance harness. Optional frozen-core input for comparison.
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(process.argv[2]||__dirname+'/dist/index.html','utf8');
vm.runInThisContext(source.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)?.[1]||source);
const C=Cricket,teams=C.Squad.teams('T20'),samples=[],geometry={all:{},full:{},good:{}};
function add(g,ball){const p=C.Rules.atZ(ball,C.Rules.wickets[0]),sign=C.Hand.sign(ball);g.n=(g.n||0)+1;g.hit=(g.hit||0)+C.Rules.hits(p);g.x=(g.x||0)+p.x*sign;g.height=(g.height||0)+p.h;const lateral=Math.abs(p.x)<=C.Rules.halfWidth+C.BallFlight.radius;g.lateral=(g.lateral||0)+lateral;g.over=(g.over||0)+(lateral&&!C.Rules.hits(p));}
for(let i=0;i<4000&&samples.length<1000;i++){
 const m=C.Innings.create(92831+i*137,teams[i%8],teams[(i+3)%8],'T20',0);m.balls=(i%20)*6;
 const d=C.Innings.delivery(m),ball=d.ball;if(C.Strokes.spin(ball)||!['full','good'].includes(ball.lengthName))continue;
 const x=C.Delivery.at(ball,1).x*C.Hand.sign(ball),angle=(x>.35?65:x>.1?44:x<-.15?-44:0)*C.Hand.sign(ball);samples.push({m,d,ball,angle});
 add(geometry.all,ball);add(geometry[ball.lengthName],ball);add(geometry[ball.archetype]??={},ball);
}
const curve=[];for(const error of [0,30,60,90,120,160]){
 let edges=0,wickets=0,risk=0,runs=0,bowled=0,lbw=0;
 for(const {m,d,ball,angle}of samples){const r=C.Shot.resolve(ball,{angle,mode:'ground',error,effort:.75},m.batters[m.striker],C.Innings.field(m,ball),d.rngState);edges+=!!r.edge;wickets+=!!r.wicket;bowled+=r.dismissalKind==='bowled';lbw+=r.dismissalKind==='lbw';risk+=r.edgeRisk||0;runs+=r.runs;}
 curve.push({error,n:samples.length,edgePct:100*edges/samples.length,dismissedPct:100*wickets/samples.length,meanEdgeRiskPct:100*risk/samples.length,bowled,lbw,runsPerOver:6*runs/samples.length});
}
for(const g of Object.values(geometry))Object.assign(g,{hitPct:100*g.hit/g.n,lateralPct:100*g.lateral/g.n,overPct:100*g.over/g.n,meanX:g.x/g.n,meanH:g.height/g.n});
console.log(JSON.stringify({curve,geometry},null,2));
