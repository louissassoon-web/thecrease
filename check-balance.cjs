// Balance acceptance harness. Run from the extracted folder: node check-balance.cjs
// Loads the pure engine from dist/index.html and measures gameplay balance against
// target ranges. Targets are game-design choices; adjust them deliberately, not to pass.
// 29 September 2026: sections 5 (spin versus pace parity) and 6 (boundary balls) added for revision 25.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
vm.runInThisContext(html.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1]);
const C=Cricket;
const mean=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length),sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));};
const results=[];let pass=0,fail=0;
function check(label,value,lo,hi,unit=''){const ok=value>=lo&&value<=hi;ok?pass++:fail++;const v=Number.isFinite(value)?+value.toFixed(2):value;results.push((ok?'PASS ':'FAIL ')+label.padEnd(66)+String(v+unit).padStart(9)+'   target '+lo+'-'+hi+unit);}
function gauss(rng){let u=0,v=0;while(u===0)u=rng.next();while(v===0)v=rng.next();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

// ---- 1. Simulated human batter through the real delivery/shot/scoring pipeline ----
function chooseShot(ball,s,rng){const sign=C.Hand.sign(ball),x=C.Delivery.at(ball,1).x*sign,spin=C.Strokes.spin(ball),len=ball.lengthName;let angle,mode='ground';
 if(len==='yorker')return{angle:0,mode:'defend'};
 if(len==='short')angle=x>.25?87:-95;else if(spin&&x<-.1&&rng.next()<.3)angle=-95;else angle=x>.35?65:x>.1?44:x<-.15?-44:0;
 if(s.loftRate&&['full','good'].includes(len)&&rng.next()<s.loftRate)mode='loft';
 if(s.defendRate&&rng.next()<s.defendRate)return{angle:0,mode:'defend'};
 return{angle:angle*sign,mode};}
function human(format,s,seeds=10,maxBalls=120){const teams=C.Squad.teams(format),t={balls:0,legal:0,runs:0,wickets:0,sixes:0,fours:0,caught:0};
 for(let k=0;k<seeds;k++){const batting=teams[k%8],bowling=teams[(k+3)%8];let c=C.Contest.create(1000+k*97,format,batting,bowling,batting.id);for(let j=1;!C.Contest.ownTurn(c)&&j<50;j++)c=C.Contest.create(1000+k*97+j*17,format,batting,bowling,batting.id);
  const rng=C.RNG.stream(k*7+1);let n=0;while(c.phase==='play'&&C.Contest.ownTurn(c)&&n<maxBalls){const m=C.Contest.current(c),d=C.Innings.delivery(m),ball=d.ball,prepared={...m,rngState:d.rngState},choice=chooseShot(ball,s,rng),input={...choice,error:gauss(rng)*s.sigma,effort:choice.mode==='defend'?0:s.effort,callRuns:true};
   const res=C.Shot.resolve(ball,input,prepared.batters[prepared.striker],C.Innings.field(prepared,ball),d.rngState);c=C.Contest.apply(C.Contest.withPrepared(c,d.rngState),ball,res);n++;
   t.balls++;if(res.legal)t.legal++;t.runs+=res.runs;if(res.wicket){t.wickets++;if(res.dismissalKind==='caught')t.caught++;}if(res.batRuns===6)t.sixes++;if(res.batRuns===4)t.fours++;}}
 return{rr:6*t.runs/Math.max(1,t.legal),ballsPerWicket:t.legal/Math.max(1,t.wickets),sixPct:100*t.sixes/t.balls,fourPct:100*t.fours/t.balls,wickets:t.wickets};}
const groundGood=human('T20',{sigma:60,effort:.75,loftRate:0});
check('T20 ground strokes, 60 ms timing sd: runs per over',groundGood.rr,5,7.5);
check('T20 ground strokes, 60 ms timing sd: balls per wicket',groundGood.ballsPerWicket,30,90);
const groundPoor=human('T20',{sigma:130,effort:.75,loftRate:0});
check('T20 ground strokes, 130 ms timing sd: balls per wicket',groundPoor.ballsPerWicket,12,40);
const mix=human('T20',{sigma:60,effort:.85,loftRate:.25});
check('T20 25% loft mix, 60 ms sd: runs per over',mix.rr,7,10.5);
check('T20 25% loft mix, 60 ms sd: balls per wicket',mix.ballsPerWicket,20,60);
const slog=human('T20',{sigma:60,effort:1,loftRate:1});
check('T20 loft every ball, 60 ms sd: six % of balls',slog.sixPct,10,35);
check('T20 loft every ball, 60 ms sd: balls per wicket',slog.ballsPerWicket,5,16);
const projected=r=>Math.round(r.rr/6*Math.min(120,10*r.ballsPerWicket));
check('Projected 20-over total, 25% loft mix at 60 ms sd',projected(mix),120,190);
check('Projected 20-over total, all-loft at 60 ms sd (must trail the mix)',projected(slog),60,Math.max(60,projected(mix)-1));
const testDay=human('TEST',{sigma:60,effort:.65,loftRate:0,defendRate:.35},8,270);
check('Test ground strokes + 35% defence, 60 ms sd: runs per over',testDay.rr,2.8,4.8);
check('Test ground strokes + 35% defence, 60 ms sd: balls per wicket',testDay.ballsPerWicket,40,130);

// ---- 2. Loft outcome by release error (full pace ball, opener, full effort) ----
(function(){const teams=C.Squad.teams('T20');for(let i=0;i<600;i++){let c=C.Contest.create(i*13+1,'T20',teams[0],teams[3],teams[0].id);if(!C.Contest.ownTurn(c))continue;const m=C.Contest.current(c),d=C.Innings.delivery(m),ball=d.ball;if(C.Strokes.spin(ball)||ball.lengthName!=='full')continue;const prepared={...m,rngState:d.rngState},batter=prepared.batters[prepared.striker];
 const row=err=>{let six=0,out=0,exit=0,n=0;for(let s=0;s<80;s++){const res=C.Shot.resolve(ball,{angle:C.Delivery.at(ball,1).x>.1?44:0,mode:'loft',error:err,effort:1},batter,C.Innings.field(prepared,ball),d.rngState+s*7);n++;if(res.runs===6)six++;if(res.wicket)out++;exit+=res.exitSpeed||0;}return{six:100*six/n,out:100*out/n,exit:exit/n};};
 const p=row(0),e80=row(80),e130=row(130);
 check('Perfect full-effort loft on a full ball: six %',p.six,55,90);
 check('Perfect full-effort loft on a full ball: exit speed m/s',p.exit,30,44,' m/s');
 check('Loft released 80 ms off: six %',e80.six,10,45);
 check('Loft released 80 ms off: caught %',e80.out,15,60);
 check('Loft released 130 ms off: six %',e130.six,0,20);
 return;}})();

// ---- 3. AI v AI matches ----
function ai(format,n){const teams=C.Squad.teams(format),first=[],wk=[],dis={},res={win:0,tie:0,draw:0};let balls=0,wides=0,sixes=0,lastBatWins=0,declared=0,inn1=0;
 for(let seed=1;seed<=n;seed++){const a=teams[seed%8],b=teams[(seed*3+1)%8];if(a.id===b.id)continue;let c=C.Contest.create(seed*7919,format,a,b,'spectator'),g=0;
  while(c.phase!=='complete'&&g++<9000){if(c.phase==='interval')c=C.Contest.advance(c);else if(c.phase==='followOn')c=C.Contest.chooseFollowOn(c,true);else{const r=C.Opposition.ball(c);c=r.contest;balls++;wides+=C.Rules.extras(r.result).wides>0?1:0;if(r.result.batRuns===6)sixes++;if(r.result.wicket)dis[r.result.dismissalKind]=(dis[r.result.dismissalKind]||0)+1;}}
  res[c.result.kind]++;const i1=c.innings[0];first.push(i1.runs);wk.push(i1.wickets);inn1++;if(i1.endReason==='declared')declared++;const last=c.innings.at(-1);if(c.result.kind==='win'&&c.result.winner===last.side)lastBatWins++;}
 const w=Object.values(dis).reduce((x,y)=>x+y,0);return{n:inn1,mean:mean(first),sd:sd(first),wickets:mean(wk),widePct:100*wides/balls,sixesPerInnings:sixes/(2*inn1),lbwPct:100*(dis.lbw||0)/Math.max(1,w),bowledPct:100*(dis.bowled||0)/Math.max(1,w),declaredPct:100*declared/inn1,lastBatWinPct:100*lastBatWins/inn1,drawPct:100*res.draw/inn1};}
const t20=ai('T20',40);
check('AI T20 first-innings mean',t20.mean,150,180);
check('AI T20 first-innings standard deviation',t20.sd,20,45);
check('AI T20 first-innings wickets',t20.wickets,5,8.5);
check('AI T20 sixes per innings',t20.sixesPerInnings,4,9);
check('AI T20 wides, % of balls',t20.widePct,1.5,4.5,'%');
check('AI T20 lbw, % of dismissals',t20.lbwPct,4,20,'%');
const test=ai('TEST',14);
check('AI Test first-innings mean',test.mean,280,400);
check('AI Test first-innings standard deviation',test.sd,55,140);
check('AI Test first innings declared, %',test.declaredPct,0,30,'%');
check('AI Test bowled, % of dismissals',test.bowledPct,10,30,'%');
check('AI Test lbw, % of dismissals',test.lbwPct,8,25,'%');
check('AI Test won by the side batting last, %',test.lastBatWinPct,30,65,'%');
check('AI Test draws, %',test.drawPct,5,25,'%');

// ---- 4. Yorker movement geometry and keeper collection ----
(function(){const teams=C.Squad.teams('T20');const dev=[];let yorkers=0,fourByes=0,taken=0,passed=0;
 for(let i=0;i<4000&&yorkers<150;i++){const a=teams[i%8],b=teams[(i*5+2)%8];if(a===b)continue;let c=C.Contest.create(i*77+1,'T20',a,b,a.id);if(!C.Contest.ownTurn(c))continue;const m=C.Contest.current(c),d=C.Innings.delivery(m),ball=d.ball;if(C.Strokes.spin(ball)||ball.lengthName!=='yorker')continue;yorkers++;
  const crease=C.Delivery.at(ball,1),before=C.Delivery.at(ball,.999);dev.push(Math.abs(180-Math.abs(Math.atan2(crease.x-before.x,crease.z-before.z)*180/Math.PI)));
  const prepared={...m,rngState:d.rngState},res=C.Shot.resolve(ball,null,prepared.batters[prepared.striker],C.Innings.field(prepared,ball),d.rngState);if(!res.wicket&&!res.wide){passed++;if(res.runs>=4)fourByes++;else if(res.runs===0)taken++;}}
 dev.sort((a,b)=>a-b);check('Pace yorker: median lateral deviation at the crease, degrees',dev[Math.floor(dev.length/2)],0,3,'°');
 check('Left pace yorker that passes the stumps: four byes, %',100*fourByes/Math.max(1,passed),0,5,'%');
 check('Left pace yorker that passes the stumps: keeper collects for no run, %',100*taken/Math.max(1,passed),75,100,'%');})();

// ---- 5. Spin versus pace parity (same simulated batter, same policy, split by bowler) ----
// Spin should be a different problem from pace, not a harder one: a batter who plays the
// right stroke should lose wickets and find the rope at broadly the same rate against both.
function humanSplit(format,s,seeds=24,maxBalls=120){const teams=C.Squad.teams(format),out={};
 for(let k=0;k<seeds;k++){const batting=teams[k%8],bowling=teams[(k+3)%8];let c=C.Contest.create(3000+k*89,format,batting,bowling,batting.id);for(let j=1;!C.Contest.ownTurn(c)&&j<50;j++)c=C.Contest.create(3000+k*89+j*17,format,batting,bowling,batting.id);
  const rng=C.RNG.stream(k*11+5);let n=0;while(c.phase==='play'&&C.Contest.ownTurn(c)&&n<maxBalls){const m=C.Contest.current(c),d=C.Innings.delivery(m),ball=d.ball,prepared={...m,rngState:d.rngState},choice=chooseShot(ball,s,rng),input={...choice,error:gauss(rng)*s.sigma,effort:choice.mode==='defend'?0:s.effort,callRuns:true};
   const res=C.Shot.resolve(ball,input,prepared.batters[prepared.striker],C.Innings.field(prepared,ball),d.rngState);c=C.Contest.apply(C.Contest.withPrepared(c,d.rngState),ball,res);n++;
   const t=out[C.Strokes.spin(ball)?'spin':'pace']||(out[C.Strokes.spin(ball)?'spin':'pace']={balls:0,legal:0,runs:0,wickets:0,fours:0,edges:0,edgesCaught:0,screen:0,physical:0});
   t.balls++;if(res.legal)t.legal++;t.runs+=res.runs;if(res.wicket)t.wickets++;if(res.batRuns===4)t.fours++;if(res.edge){t.edges++;if(res.wicket&&res.dismissalKind==='caught')t.edgesCaught++;}t.screen+=ball.duration;t.physical+=1000*(ball.preTime+ball.postTime);
   // Physics only: would a well-timed ground stroke reach the rope with nobody fielding it?
   if(res.contact&&!res.edge&&input.mode==='ground'&&Math.abs(input.error)<=40&&ball.lengthName!=='yorker'){t.timed=(t.timed||0)+1;const p=res.play;for(let u=.02;u<=p.stopTime+.5;u+=.05)if(C.Ground.outside(ball,C.Fielding.freeBall(p,u))){t.rope=(t.rope||0)+1;break;}}
   // Boundary balls: is a chaser named, and can the batters set off while the ball travels?
   const e=res.play?.event;if(e?.type==='four'&&!res.wicket&&res.contact){t.boundaries=(t.boundaries||0)+1;if(e.chaser?.id||e.id)t.chased=(t.chased||0)+1;if(e.time>=1&&C.Running.offer(res,.45).allowed)t.runnable=(t.runnable||0)+1;if(e.time>=1)t.slowFours=(t.slowFours||0)+1;if(res.batRuns>=4)t.scoredFour=(t.scoredFour||0)+1;}}}
 for(const t of Object.values(out))Object.assign(t,{rr:6*t.runs/Math.max(1,t.legal),ballsPerWicket:t.legal/Math.max(1,t.wickets),fourPct:100*t.fours/t.balls,edgePct:100*t.edges/t.balls,edgeCaughtPct:100*t.edgesCaught/Math.max(1,t.edges),scale:t.screen/Math.max(1,t.physical),ropePct:100*(t.rope||0)/Math.max(1,t.timed||0),chasedPct:100*(t.chased||0)/Math.max(1,t.boundaries||0),runnablePct:100*(t.runnable||0)/Math.max(1,t.slowFours||0),scoredFourPct:100*(t.scoredFour||0)/Math.max(1,t.boundaries||0)});
 return out;}
const parity=humanSplit('T20',{sigma:60,effort:.75,loftRate:0}),parityPoor=humanSplit('T20',{sigma:130,effort:.75,loftRate:0});
check('Spin v pace, 60 ms ground strokes: balls-per-wicket ratio',parity.spin.ballsPerWicket/parity.pace.ballsPerWicket,.7,1.6);
check('Spin v pace, 130 ms ground strokes: balls-per-wicket ratio',parityPoor.spin.ballsPerWicket/parityPoor.pace.ballsPerWicket,.6,1.6);
check('Spin v pace, 60 ms ground strokes: runs-per-over ratio',parity.spin.rr/parity.pace.rr,.8,1.1);
check('Spin v pace, 60 ms ground strokes: four % ratio',parity.spin.fourPct/parity.pace.fourPct,.55,1.1);
check('Well-timed ground strokes that would reach the rope unfielded: spin/pace',parity.spin.ropePct/Math.max(1,parity.pace.ropePct),.75,1.1);
check('Spin v pace, 60 ms ground strokes: edge % ratio',parity.spin.edgePct/parity.pace.edgePct,.7,1.3);
check('Spin edges that are caught, 60 ms ground strokes, %',parity.spin.edgeCaughtPct,15,40,'%');
check('Spin flight: screen ms per physical ms (pace is 2.6)',parity.spin.scale,2.45,2.75);

// ---- 6. Boundary balls: chased by a fielder, run by the batters, still worth four ----
const all=Object.values(parity),sum=k=>all.reduce((a,t)=>a+(t[k]||0),0);
check('Fours with a named chasing fielder (event.chaser or event.id), %',100*sum('chased')/Math.max(1,sum('boundaries')),90,100,'%');
check('Fours where the batters are offered a run at 0.45 s, %',100*sum('runnable')/Math.max(1,sum('slowFours')),85,100,'%');
check('Fours still scoring at least four, %',100*sum('scoredFour')/Math.max(1,sum('boundaries')),100,100,'%');

console.log(results.join('\n'));console.log('\n'+pass+' passed, '+fail+' failed of '+(pass+fail)+' balance checks.');
