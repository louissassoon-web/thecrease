// Before-and-after measures for revision 39. Run from the repository root:
//   node tools/measure-r39.cjs review-fixtures/core-v38.js   (the frozen revision 38 engine)
//   node tools/measure-r39.cjs                               (the engine in dist/index.html)
// Both runs use the same seeds, the same simulated batter and the same policies, and print JSON.
// SCALE=0.25 node tools/measure-r39.cjs runs a quarter of every sample for a quick look.
// The first block repeats the balance contract's small-sample checks on many more innings, because
// ten innings move by more than a design change does. The rest measures what revision 39 set out to
// change: the ball by age, the pitch from match to match, and the wind from end to end.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const file=process.argv[2],source=file?fs.readFileSync(path.resolve(file),'utf8'):fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8').match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1];
const box={};vm.createContext(box);vm.runInContext(source,box);const C=box.Cricket,scale=+process.env.SCALE||1,N=n=>Math.max(4,Math.round(n*scale));
const mean=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length),sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));},pct=(a,b)=>+(100*a/Math.max(1,b)).toFixed(2),r2=x=>+x.toFixed(2),r3=x=>+x.toFixed(3);
function gauss(rng){let u=0,v=0;while(u===0)u=rng.next();while(v===0)v=rng.next();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
// The balance contract's simulated batter, unchanged.
function chooseShot(ball,s,rng){const sign=C.Hand.sign(ball),x=C.Delivery.at(ball,1).x*sign,spin=C.Strokes.spin(ball),len=ball.lengthName;let angle,mode='ground';
 if(len==='yorker')return{angle:0,mode:'defend'};
 if(len==='short')angle=x>.25?87:-95;else if(spin&&x<-.1&&rng.next()<.3)angle=-95;else angle=x>.35?65:x>.1?44:x<-.15?-44:0;
 if(s.loftRate&&['full','good'].includes(len)&&rng.next()<s.loftRate)mode='loft';
 if(s.defendRate&&rng.next()<s.defendRate)return{angle:0,mode:'defend'};
 return{angle:angle*sign,mode};}
function innings(format,s,seeds,maxBalls,each,base=1000,step=97){const teams=C.Squad.teams(format);
 for(let k=0;k<seeds;k++){const batting=teams[k%8],bowling=teams[(k+3)%8];let c=C.Contest.create(base+k*step,format,batting,bowling,batting.id);for(let j=1;!C.Contest.ownTurn(c)&&j<50;j++)c=C.Contest.create(base+k*step+j*17,format,batting,bowling,batting.id);
  const rng=C.RNG.stream(k*7+1);let n=0;while(c.phase==='play'&&C.Contest.ownTurn(c)&&n<maxBalls){const m=C.Contest.current(c),d=C.Innings.delivery(m),ball=d.ball,prepared={...m,rngState:d.rngState},choice=chooseShot(ball,s,rng),input={...choice,error:gauss(rng)*s.sigma,effort:choice.mode==='defend'?0:s.effort,callRuns:true};
   const res=C.Shot.resolve(ball,input,prepared.batters[prepared.striker],C.Innings.field(prepared,ball),d.rngState);c=C.Contest.apply(C.Contest.withPrepared(c,d.rngState),ball,res);n++;each(ball,input,res,prepared,k);}}}
function tally(){return{balls:0,legal:0,runs:0,wickets:0,sixes:0,fours:0,edges:0,caught:0};}
function add(t,res){t.balls++;if(res.legal)t.legal++;t.runs+=res.runs;if(res.wicket){t.wickets++;if(res.dismissalKind==='caught'&&res.edge)t.caught++;}if(res.batRuns===6)t.sixes++;if(res.batRuns===4)t.fours++;if(res.edge)t.edges++;}
const rate=t=>({balls:t.balls,runsPerOver:r2(6*t.runs/Math.max(1,t.legal)),ballsPerWicket:r2(t.legal/Math.max(1,t.wickets)),edgePct:pct(t.edges,t.balls),edgesCaughtPct:pct(t.caught,t.edges)});
const out={engine:file||'dist/index.html',scale};

// 1. The contract's simulated batter on large samples.
for(const [key,format,s,seeds,balls]of [['t20Ground60','T20',{sigma:60,effort:.75,loftRate:0},240,120],['t20Ground130','T20',{sigma:130,effort:.75,loftRate:0},240,120],['t20LoftMix60','T20',{sigma:60,effort:.85,loftRate:.25},240,120],['t20Slog60','T20',{sigma:60,effort:1,loftRate:1},120,120],['testGround60','TEST',{sigma:60,effort:.65,loftRate:0,defendRate:.35},48,270]]){
 const t=tally();innings(format,s,N(seeds),balls,(ball,input,res)=>add(t,res));out[key]={innings:N(seeds),...rate(t),sixPct:pct(t.sixes,t.balls)};}
// 2. Spin against pace, the contract's section 5, on large samples.
for(const [key,sigma]of [['split60',60],['split130',130]]){const t={spin:tally(),pace:tally()};innings('T20',{sigma,effort:.75,loftRate:0},N(240),120,(ball,input,res)=>add(t[C.Strokes.spin(ball)?'spin':'pace'],res),3000,89);
 const s=rate(t.spin),p=rate(t.pace);out[key]={innings:N(240),spin:s,pace:p,ballsPerWicketRatio:r2(s.ballsPerWicket/p.ballsPerWicket),runsPerOverRatio:r2(s.runsPerOver/p.runsPerOver),edgeRatio:r2(s.edgePct/p.edgePct)};}

// 3. The ball by age: the same batter against pace, split by how old the ball is.
(function(){const bands={T20:[['overs 1-4',0,24],['overs 5-10',24,60],['overs 11-20',60,120]],TEST:[['overs 1-15',0,90],['overs 16-40',90,240],['overs 41-80',240,480],['overs 81-95, second new ball',480,570]]};
 for(const [format,s,seeds,balls]of [['T20',{sigma:75,effort:.8,loftRate:.1},240,120],['TEST',{sigma:70,effort:.65,loftRate:0,defendRate:.3},36,570]]){const rows=bands[format].map(([name,lo,hi])=>({name,lo,hi,t:tally(),h:[],v:[],swing:[],seam:[]}));
  innings(format,s,N(seeds),balls,(ball,input,res,m)=>{if(C.Strokes.spin(ball))return;const age=format==='TEST'?m.balls:m.balls,row=rows.find(r=>age>=r.lo&&age<r.hi);if(!row)return;add(row.t,res);if(ball.lengthName==='good'&&!ball.fullToss){row.h.push(ball.contactH);row.v.push(ball.length/ball.postTime*3.6);}if(Math.abs(ball.swing)>.02)row.swing.push(Math.abs(ball.swing));row.seam.push(Math.abs(ball.kick));},5000,131);
  out['ballAge'+format]=rows.map(r=>({band:r.name,...rate(r.t),goodLengthHeightM:r3(mean(r.h)),goodLengthSpeedOffPitchKmh:r2(mean(r.v)),swingM:r3(mean(r.swing)),seamRad:+mean(r.seam).toFixed(4)}));}})();

// 4. The pitch from match to match: bounce, pace off the surface and variable bounce at the first ball.
(function(){for(const format of ['T20','TEST']){const teams=C.Squad.teams(format),b=[],p=[],v=[],h=[];
  for(let k=1;k<=N(400);k++){const c=C.Contest.create(77+k*1543,format,teams[k%8],teams[(k+3)%8],'spectator'),m=C.Contest.current(c),q=C.Conditions.at(m);b.push(q.bounce);p.push(q.pace);v.push(q.variation);
   // The same pace ball on every pitch: a good-length ball from the first over's bowler.
   for(let j=0;j<6;j++){const d=C.Innings.delivery({...m,rngState:(m.rngState+j*7919)>>>0}).ball;if(!C.Strokes.spin(d)&&d.lengthName==='good'&&!d.fullToss){h.push({k,h:d.contactH});}}}
  const byMatch={};for(const x of h)(byMatch[x.k]??=[]).push(x.h);const means=Object.values(byMatch).map(mean);b.sort((x,y)=>x-y);
  out['pitch'+format]={matches:b.length,bounceMean:r3(mean(b)),bounceSd:r3(sd(b)),bounceLowest:r3(b[0]),bounceHighest:r3(b.at(-1)),paceSd:r3(sd(p)),variableBounceMeanM:r3(mean(v)),variableBounceSdM:r3(sd(v)),goodLengthHeightBetweenMatchesSdM:r3(sd(means))};}})();
// 5. Wear in a Test: variable bounce at the start of each day on the same pitches.
(function(){const teams=C.Squad.teams('TEST'),days=[[],[],[],[],[]];for(let k=1;k<=N(120);k++){const c=C.Contest.create(31+k*2221,'TEST',teams[k%8],teams[(k+3)%8],'spectator'),m=C.Contest.current(c);for(let d=0;d<5;d++)days[d].push(C.Conditions.at({...m,pitchClock:d*21600,pitchBalls:d*540,balls:0}).variation);}
 out.testVariableBounceByDayM=days.map(a=>r3(mean(a)));out.testVariableBounceHighestByDayM=days.map(a=>r3(Math.max(...a)));})();

// 6. The wind from end to end: the swing factor in successive overs of the same innings.
(function(){const teams=C.Squad.teams('T20'),gap=[],flips=[];for(let k=1;k<=N(300);k++){const c=C.Contest.create(13+k*4099,'T20',teams[k%8],teams[(k+3)%8],'spectator'),m=C.Contest.current(c),a=C.Conditions.at({...m,balls:0}),b=C.Conditions.at({...m,balls:6}),w=a.weather;if(w.wind<12||Math.abs(w.windZ)<.5)continue;gap.push(Math.abs(a.swing/b.swing-1)*100);flips.push(Math.sign(a.weather.windZ)!==Math.sign(b.weather.windZ)?1:0);}
 out.windyHeadOrTailMatches={matches:gap.length,windReversesBetweenOversPct:pct(flips.reduce((x,y)=>x+y,0),flips.length),meanSwingDifferenceBetweenEndsPct:r2(mean(gap))};})();

// 7. The player's bowling: swing direction by batter's hand, and round the wicket.
(function(){const teams=C.Squad.teams('T20'),t={right:[],left:[]},named={},release={over:[],round:[]};
 for(let k=1;k<=N(1200);k++){const c=C.Contest.create(555+k*977,'T20',teams[k%8],teams[(k+3)%8],'spectator');let m=C.Contest.current(c);m={...m,balls:(k*6)%114};const owner=m.bowlers[C.Innings.bowler(m)],names=C.BowlingControl.options(owner).map(o=>o.name),pick=names.find(n=>/swinger/.test(n));if(!pick)continue;
  for(const side of ['over','round']){const d=C.BowlingControl.prepare(m,{line:.14,variation:pick,side}),ball=C.BowlingControl.release(d.ball,930),hand=ball.battingHand==='left'?'left':'right';release[side].push(Math.abs(ball.releaseX));
   if(side==='over'){const dir=Math.sign(ball.swing)*(pick==='Outswinger'?1:-1);t[hand].push(dir);(named[hand]??={})[pick+' is shown as '+ball.variation]=(named[hand][pick+' is shown as '+ball.variation]||0)+1;}}}
 out.playerSwing={rightHanders:t.right.length,leftHanders:t.left.length,sameDirectionInTheWorldForRightHandersPct:pct(t.right.filter(x=>x===1).length,t.right.length),sameDirectionInTheWorldForLeftHandersPct:pct(t.left.filter(x=>x===1).length,t.left.length),names:named,releaseFromMiddleStumpM:{over:r2(mean(release.over)),round:r2(mean(release.round))}};})();
console.log(JSON.stringify(out,null,1));
