// Before-and-after measures for revision 38. Run from the repository root:
//   node tools/measure-r38.cjs review-fixtures/core-v37.js   (the frozen revision 37 engine)
//   node tools/measure-r38.cjs                               (the engine in dist/index.html)
// Both runs use the same seeds, the same simulated batter and the same bowling policy, and print JSON.
// These are diagnostics of those policies. They are not estimates of any one player's results.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const file=process.argv[2],source=file?fs.readFileSync(path.resolve(file),'utf8'):fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8').match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1];
const box={};vm.createContext(box);vm.runInContext(source,box);const C=box.Cricket;
const mean=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length),sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));},pct=(a,b)=>+(100*a/Math.max(1,b)).toFixed(2),r2=x=>+x.toFixed(2);
function gauss(rng){let u=0,v=0;while(u===0)u=rng.next();while(v===0)v=rng.next();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
// The balance contract's simulated batter: the sensible stroke for the line and length, with Gaussian timing error.
function chooseShot(ball,s,rng){const sign=C.Hand.sign(ball),x=C.Delivery.at(ball,1).x*sign,spin=C.Strokes.spin(ball),len=ball.lengthName;let angle,mode='ground';
 if(len==='yorker')return{angle:0,mode:'defend'};
 if(len==='short')angle=x>.25?87:-95;else if(spin&&x<-.1&&rng.next()<.3)angle=-95;else angle=x>.35?65:x>.1?44:x<-.15?-44:0;
 if(s.loftRate&&['full','good'].includes(len)&&rng.next()<s.loftRate)mode='loft';
 return{angle:angle*sign,mode};}
function innings(format,s,seeds,maxBalls,each){const teams=C.Squad.teams(format);
 for(let k=0;k<seeds;k++){const batting=teams[k%8],bowling=teams[(k+3)%8];let c=C.Contest.create(1000+k*97,format,batting,bowling,batting.id);for(let j=1;!C.Contest.ownTurn(c)&&j<50;j++)c=C.Contest.create(1000+k*97+j*17,format,batting,bowling,batting.id);
  const rng=C.RNG.stream(k*7+1);let n=0;while(c.phase==='play'&&C.Contest.ownTurn(c)&&n<maxBalls){const m=C.Contest.current(c),d=C.Innings.delivery(m),ball=d.ball,prepared={...m,rngState:d.rngState},choice=chooseShot(ball,s,rng),input={...choice,error:gauss(rng)*s.sigma,effort:choice.mode==='defend'?0:s.effort,callRuns:s.callRuns!==false};
   const res=C.Shot.resolve(ball,input,prepared.batters[prepared.striker],C.Innings.field(prepared,ball),d.rngState);c=C.Contest.apply(C.Contest.withPrepared(c,d.rngState),ball,res);n++;each(ball,input,res,prepared);}}}
const out={engine:file||'dist/index.html'};
// 1. Attacking edges against pace (note 3).
for(const [format,sigma,effort,seeds,balls]of [['T20',90,.85,60,120],['TEST',75,.65,14,420]]){const t={edges:0,four:0,caught:0};innings(format,{sigma,effort,loftRate:0},seeds,balls,(ball,input,res)=>{if(C.Strokes.spin(ball)||!res.edge||!res.contact||input.mode==='defend'||['Top edge','Leading edge'].includes(res.edgeType))return;t.edges++;if(res.wicket){if(res.dismissalKind==='caught')t.caught++;}else if(res.batRuns===4)t.four++;});
 out['edges'+format]={edges:t.edges,fourPct:pct(t.four,t.edges),caughtPct:pct(t.caught,t.edges)};}
// 2. Balls above the shoulder (note 5): pace releases held late, on a hittable line.
(function(){const teams=C.Squad.teams('T20'),balls=[],rng=C.RNG.stream(99);
 for(let k=1;k<=900;k++){const c=C.Contest.create(700+k*389,'T20',teams[k%8],teams[(k+3)%8],'spectator');let m=C.Contest.current(c);m={...m,balls:(k*6)%114};const d=C.BowlingControl.prepare(m,{line:[0,.14,-.2][k%3]});if(C.Strokes.spin(d.ball))continue;
  const ball=C.BowlingControl.release(d.ball,1040+(k*37)%90),at=C.Delivery.at(ball,1);if(ball.lengthName==='short'&&Math.abs(at.x)<.45&&!ball.fullToss)balls.push({ball,m,seed:d.rngState,h:at.h});}
 function play(set,strokes,sigma=40){const t={n:0,contact:0,edge:0,behind:0,front:0};for(const b of set)for(const [angle,mode]of strokes)for(let k=0;k<3;k++){const sign=C.Hand.sign(b.ball),res=C.Shot.resolve(b.ball,{angle:angle*sign,mode,error:gauss(rng)*sigma,effort:mode==='loft'?1:.85,callRuns:true},b.m.batters[b.m.striker],C.Innings.field(b.m,b.ball),b.seed+k*13);t.n++;if(!res.contact)continue;t.contact++;if(res.edge){t.edge++;if(Math.abs(res.angle)>=90)t.behind++;}else if(!res.mishit&&Math.abs(res.angle)<80)t.front++;}return t;}
 const head=balls.filter(b=>b.h>=1.75&&b.h<2.02),chest=balls.filter(b=>b.h>=1.2&&b.h<1.45),drive=play(head,[[0,'ground'],[0,'loft'],[44,'loft'],[-44,'loft']]),hook=play(head,[[-95,'ground']]),pull=play(chest,[[-95,'ground']]);
 out.highBalls={headHighBalls:head.length,straightBatCleanInFrontPct:pct(drive.front,drive.n),hookEdgePct:pct(hook.edge,hook.n),hookEdgesBehindSquarePct:pct(hook.behind,hook.edge),hookCleanContactPct:pct(hook.contact-hook.edge,hook.n),chestHighPullEdgePct:pct(pull.edge,pull.n)};
 let late=0,wides=0;for(let k=1;k<=300;k++){const c=C.Contest.create(900+k*211,'T20',teams[k%8],teams[(k+3)%8],'spectator'),m=C.Contest.current(c),d=C.BowlingControl.prepare(m,{line:.14});if(C.Strokes.spin(d.ball))continue;const ball=C.BowlingControl.release(d.ball,1180+(k%5)*40),bot=C.Opposition.input({...m,rngState:d.rngState},ball,c),res=C.Shot.resolve(ball,bot.shot,m.batters[m.striker],C.Innings.field(m,ball),bot.rngState);late++;if(res.wide)wides++;}
 out.highBalls.heldTooLongWidePct=pct(wides,late);})();
// 3. Mistimed ground strokes (note 9).
for(const [sigma,effort]of [[120,.85],[60,.75]]){const t={contact:0,up:0,caught:0};innings('T20',{sigma,effort,loftRate:0},60,120,(ball,input,res)=>{if(input.mode!=='ground'||!res.contact)return;t.contact++;if(res.mishit){t.up++;if(res.wicket&&res.dismissalKind==='caught')t.caught++;}});out['popUps'+sigma+'ms']={groundContacts:t.contact,inTheAirPct:pct(t.up,t.contact),caughtPct:t.up?pct(t.caught,t.up):null};}
// 4. The opposition against the player's bowling (notes 7 and 8): every line, ball and release, the quicker return on a live chance.
function bowl(format,matches,ballsPerInnings){const rows=[];
 for(let k=1;k<=matches;k++){const teams=C.Squad.teams(format),a=teams[k%8],b=teams[(k+3)%8];let c=C.Contest.create(20261110+k*3571,format,a,b,'spectator'),policy=C.RNG.stream(7919*k+91),n=0;
  while(c.phase==='play'&&c.innings.length===1&&n<ballsPerInnings){const m=C.Contest.current(c),owner=m.bowlers[C.Innings.bowler(m)],options=C.BowlingControl.options(owner),line=[-.4,0,.14,.55,1][Math.floor(policy.next()*5)],variation=options[Math.floor(policy.next()*options.length)].name,d=C.BowlingControl.prepare(m,{line,variation}),ball=C.BowlingControl.release(d.ball,640+policy.next()*540),bot=C.Opposition.input(m,ball,c);
   let r=C.Shot.resolve(ball,bot.shot,m.batters[m.striker],C.Innings.field(m,ball),bot.rngState);const t=r.play.event.time+.22;if(C.ReturnControl.available(r,t)&&r.play.running?.legs.some(l=>l.start<t&&t<l.end))r=[0,1].map(end=>C.ReturnControl.choose(r,end,t)).sort((x,y)=>x.play.throw.breakTime-y.play.throw.breakTime)[0];
   const at=C.Delivery.at(ball,1),sign=C.Hand.sign(ball);rows.push({spin:C.Strokes.spin(ball),label:ball.manualBowling.releaseLabel,name:ball.lengthName,slow:C.Strokes.spin(ball)||ball.variation==='Slower ball'||ball.speed<126,x:at.x*sign,h:at.h,shot:bot.shot?bot.shot.mode:'leave',runs:r.runs,four:r.boundary===4,wicket:!!r.wicket,wide:!!r.wide});
   c=C.Contest.apply(C.Contest.withPrepared(c,bot.rngState),ball,r);n++;}}return rows;}
const per=a=>r2(mean(a.map(r=>r.runs))),wkt=a=>pct(a.filter(r=>r.wicket).length,a.length);
(function(){const spin=bowl('T20',110,120).filter(r=>r.spin);out.t20SpinByLength={};for(const label of ['Full toss','Very full','Overpitched','Full','Good length','Short','Drag down']){const a=spin.filter(r=>r.label===label);out.t20SpinByLength[label]={balls:a.length,runsPerBall:per(a),wicketPct:wkt(a)};}})();
(function(){const rows=bowl('TEST',40,420),reach=rows.filter(r=>r.name==='short'&&r.slow&&r.x>.6&&r.x<=1.1&&!r.wide&&r.h<1.5),good=rows.filter(r=>r.name==='good'&&r.x>-.12&&r.x<=.6);out.testSlowShortWide={balls:reach.length,leftPct:pct(reach.filter(r=>r.shot==='leave').length,reach.length),fourPct:pct(reach.filter(r=>r.four).length,reach.length),runsPerBall:per(reach),goodBallRunsPerBall:per(good)};})();
// 5. Where the ball lands against where it was aimed (note 13).
(function(){const miss=[],teams=C.Squad.teams('T20');let yorkers=0,tries=0;for(let k=1;k<=900;k++){const c=C.Contest.create(555+k*977,'T20',teams[k%8],teams[(k+3)%8],'spectator');let m=C.Contest.current(c);m={...m,balls:(k*6)%114};const owner=m.bowlers[C.Innings.bowler(m)],d=C.BowlingControl.prepare(m,{line:.14,variation:C.BowlingControl.options(owner)[0].name}),spin=C.Strokes.spin(d.ball),ball=C.BowlingControl.release(d.ball,spin?880:930);if(ball.manualBowling.control>=80&&ball.manualBowling.control<88)miss.push(ball.length-ball.manualBowling.intendedLength);if(!spin){tries++;if(C.BowlingControl.release(d.ball,680).lengthName==='yorker')yorkers++;}}
 out.playerRelease={control80to87LengthMissSdM:r2(sd(miss)),control80to87MissBeyond1p5mPct:pct(miss.filter(x=>Math.abs(x)>1.5).length,miss.length),yorkerInstantLandsYorkerPct:pct(yorkers,tries)};
 for(const format of ['T20','TEST']){const t={pace:0,fullToss:0,leg:0,wideOff:0},f=C.Squad.teams(format);for(let k=1;k<=5000;k++){const c=C.Contest.create(91+k*313,format,f[k%8],f[(k+3)%8],'spectator');let m=C.Contest.current(c);m={...m,balls:(k*7)%114};const b=C.Innings.delivery(m).ball;if(C.Strokes.spin(b))continue;t.pace++;if(b.fullToss)t.fullToss++;const x=C.Delivery.at(b,1).x*C.Hand.sign(b);if(x<-.45)t.leg++;if(x>.9)t.wideOff++;}
  out['opposition'+format+'Pace']={balls:t.pace,fullTossPct:pct(t.fullToss,t.pace),downLegPct:pct(t.leg,t.pace),wideOfOffPct:pct(t.wideOff,t.pace)};}})();
// 6. What the run button says (note 4).
(function(){const t={open:0,warned:0,refused:0,warnedCalls:0,warnedOut:0,plainCalls:0,plainOut:0};innings('T20',{sigma:60,effort:.8,loftRate:.1,callRuns:false},40,120,(ball,input,r)=>{if(!r.play?.running)return;for(let time=.05;time<r.decisionTime;time+=.1){const offer=C.Running.offer(r,time);if(['closed','queued'].includes(offer.status))continue;t.open++;if(offer.status==='late'){t.refused++;continue;}const tried=C.Running.command(r,'run',time),runOut=tried!==r&&tried.dismissalKind==='runOut';if(['risky','tight'].includes(offer.status)){t.warned++;t.warnedCalls++;if(runOut)t.warnedOut++;}else{t.plainCalls++;if(runOut)t.plainOut++;}}});
 out.runButton={openCalls:t.open,warnedPct:pct(t.warned,t.open),refusedPct:pct(t.refused,t.open),runOutWhenWarnedPct:pct(t.warnedOut,t.warnedCalls),runOutWhenNotWarnedPct:pct(t.plainOut,t.plainCalls)};})();
console.log(JSON.stringify(out,null,1));
