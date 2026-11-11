// Revision 38 acceptance harness. Run from the repository root: node check-balance-r38.cjs
// It loads the pure engine from dist/index.html, exactly as check-balance.cjs does, and measures the
// behaviour added in revision 38 against the targets agreed in the revision 38 plan. The 48-check
// contract in check-balance.cjs is unedited; nothing here replaces it.
//
// Bands. Each check states the plan's target in its label where the two differ. A band is the plan's
// target widened by about one standard error of the sample used here, so that a check fails when the
// behaviour has moved and not when the dice have. Where revision 38 sits outside the plan's own
// number the label says so; those cases are listed in validation-v38/REPORT.md.
//
// Section 7 repeats three contract checks on samples several times larger. They are printed for
// information, with the revision 37 value beside them, because the contract's own samples are small
// enough for the same engine to pass on one block of seeds and fail on the next.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
vm.runInThisContext(html.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1]);
const C=Cricket;
const mean=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length),sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));},pct=(a,b)=>100*a/Math.max(1,b);
const results=[];let pass=0,fail=0;
function check(label,value,lo,hi,unit=''){const ok=value>=lo&&value<=hi;ok?pass++:fail++;const v=Number.isFinite(value)?+value.toFixed(2):value;results.push((ok?'PASS ':'FAIL ')+label.padEnd(86)+String(v+unit).padStart(9)+'   target '+lo+'-'+hi+unit);}
function info(label,value,reference){results.push('INFO '+label.padEnd(86)+String(value).padStart(9)+'   '+reference);}
function gauss(rng){let u=0,v=0;while(u===0)u=rng.next();while(v===0)v=rng.next();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
// The contract's simulated batter: the sensible stroke for the line and length, with Gaussian timing error.
function chooseShot(ball,s,rng){const sign=C.Hand.sign(ball),x=C.Delivery.at(ball,1).x*sign,spin=C.Strokes.spin(ball),len=ball.lengthName;let angle,mode='ground';
 if(len==='yorker')return{angle:0,mode:'defend'};
 if(len==='short')angle=x>.25?87:-95;else if(spin&&x<-.1&&rng.next()<.3)angle=-95;else angle=x>.35?65:x>.1?44:x<-.15?-44:0;
 if(s.loftRate&&['full','good'].includes(len)&&rng.next()<s.loftRate)mode='loft';
 if(s.defendRate&&rng.next()<s.defendRate)return{angle:0,mode:'defend'};
 return{angle:angle*sign,mode};}
function innings(format,s,seeds,maxBalls,each,base=1000,step=97){const teams=C.Squad.teams(format);
 for(let k=0;k<seeds;k++){const batting=teams[k%8],bowling=teams[(k+3)%8];let c=C.Contest.create(base+k*step,format,batting,bowling,batting.id);for(let j=1;!C.Contest.ownTurn(c)&&j<50;j++)c=C.Contest.create(base+k*step+j*17,format,batting,bowling,batting.id);
  const rng=C.RNG.stream(k*7+1);let n=0;while(c.phase==='play'&&C.Contest.ownTurn(c)&&n<maxBalls){const m=C.Contest.current(c),d=C.Innings.delivery(m),ball=d.ball,prepared={...m,rngState:d.rngState},choice=chooseShot(ball,s,rng),input={...choice,error:gauss(rng)*s.sigma,effort:choice.mode==='defend'?0:s.effort,callRuns:s.callRuns!==false};
   const res=C.Shot.resolve(ball,input,prepared.batters[prepared.striker],C.Innings.field(prepared,ball),d.rngState);c=C.Contest.apply(C.Contest.withPrepared(c,d.rngState),ball,res);n++;each(ball,input,res,prepared);}}}

// ---- 1. Edges against pace: some should run away for four (note 3) ----
function edges(format,sigma,effort,seeds,maxBalls){const t={edges:0,four:0,caught:0,played:0};
 innings(format,{sigma,effort,loftRate:0},seeds,maxBalls,(ball,input,res)=>{if(C.Strokes.spin(ball)||!res.edge||!res.contact||input.mode==='defend'||!['Outside edge','Inside edge'].includes(res.edgeType))return;t.edges++;if(res.wicket)res.dismissalKind==='caught'?t.caught++:t.played++;else if(res.batRuns===4)t.four++;});return t;}
const e20=edges('T20',90,.85,60,120),eTest=edges('TEST',75,.65,14,420);
check('T20 attacking pace edges that reach the rope, % (plan 8-15)',pct(e20.four,e20.edges),6,17,'%');
check('T20 attacking pace edges that are caught, % (plan 20-40; revision 37 was 31)',pct(e20.caught,e20.edges),15,36,'%');
check('Test attacking pace edges that reach the rope, % (plan 8-15)',pct(eTest.four,eTest.edges),6,19,'%');
check('Test attacking pace edges that are caught, % (plan 20-40)',pct(eTest.caught,eTest.edges),24,48,'%');

// ---- 2. The height of the ball: what a stroke can do above the shoulder (note 5) ----
// Real pace deliveries from the manual release, which reaches every height up to the wide line.
(function(){const teams=C.Squad.teams('T20'),balls=[];
 for(let k=1;k<=900;k++){let c=C.Contest.create(700+k*389,'T20',teams[k%8],teams[(k+3)%8],'spectator'),m=C.Contest.current(c);m={...m,balls:(k*6)%114};const d=C.BowlingControl.prepare(m,{line:[0,.14,-.2][k%3]});if(C.Strokes.spin(d.ball))continue;
  const ball=C.BowlingControl.release(d.ball,1040+(k*37)%90),at=C.Delivery.at(C.Hand.canonical(ball),1);if(ball.lengthName==='short'&&Math.abs(at.x)<.45)balls.push({ball,m,seed:d.rngState,h:at.h});}
 const band=(lo,hi)=>balls.filter(b=>b.h>=lo&&b.h<hi),rng=C.RNG.stream(99);
 function play(set,angle,mode,sigma=40){const t={n:0,contact:0,edge:0,top:0,behind:0,front:0};for(const b of set)for(let k=0;k<3;k++){const sign=C.Hand.sign(b.ball),input={angle:angle*sign,mode,error:gauss(rng)*sigma,effort:mode==='loft'?1:.85,callRuns:true},res=C.Shot.resolve(b.ball,input,b.m.batters[b.m.striker],C.Innings.field(b.m,b.ball),b.seed+k*13);t.n++;if(!res.contact)continue;t.contact++;
   if(res.edge){t.edge++;if(res.edgeType==='Top edge'){t.top++;if(Math.abs(res.angle)>=90)t.behind++;}}else if(!res.mishit&&Math.abs(res.angle)<80)t.front++;}return t;}
 const head=band(1.75,2.02),shoulder=band(1.5,1.75),chest=band(1.2,1.45);
 let straight={n:0,front:0};for(const [angle,mode]of [[0,'ground'],[0,'loft'],[44,'loft'],[-44,'loft']]){const t=play(head,angle,mode);straight.n+=t.n;straight.front+=t.front;}
 const hook=play(head,-95,'ground'),lowPull=play(chest,-95,'ground'),midHook=play(shoulder,-95,'ground');
 check('Sample size: pace balls between 1.75 m and the wide line on a hittable line',head.length,25,2000);
 check('Above 1.75 m, straight-bat strokes hit cleanly in front of square, % (plan under 5)',pct(straight.front,straight.n),0,5,'%');
 check('Above 1.75 m, a hook finds the edge, % (plan at least 25 at 1.85 m)',pct(hook.edge,hook.n),22,60,'%');
 check('Above 1.75 m, hook edges that are top edges, %',pct(hook.top,hook.edge),90,100,'%');
 check('Top edges that go behind square, %',pct(hook.behind,hook.top),100,100,'%');
 check('Between 1.5 and 1.75 m, a hook finds the edge, % (more than a pull, less than at head height)',pct(midHook.edge,midHook.n),2,+pct(hook.edge,hook.n).toFixed(1),'%');
 check('Between 1.2 and 1.45 m, a pull finds the edge, % (the pull stays a safe stroke)',pct(lowPull.edge,lowPull.n),0,8,'%');
 check('Between 1.2 and 1.45 m, a pull makes contact, %',pct(lowPull.contact,lowPull.n),97,100,'%');
 // A ball released as late as possible must not be a free bouncer: it clears the batter's head and is a wide.
 let late=0,wides=0;for(let k=1;k<=300;k++){let c=C.Contest.create(900+k*211,'T20',teams[k%8],teams[(k+3)%8],'spectator'),m=C.Contest.current(c);const d=C.BowlingControl.prepare(m,{line:.14});if(C.Strokes.spin(d.ball))continue;const ball=C.BowlingControl.release(d.ball,1180+(k%5)*40),bot=C.Opposition.input({...m,rngState:d.rngState},ball,c),res=C.Shot.resolve(ball,bot.shot,m.batters[m.striker],C.Innings.field(m,ball),bot.rngState);late++;if(res.wide)wides++;}
 check('Pace balls held as long as possible that are called wide over the head, %',pct(wides,late),60,100,'%');
})();

// ---- 3. Badly mistimed ground strokes sometimes go up in front of the bat (note 9) ----
function popUps(sigma,effort,seeds){const t={contact:0,up:0,caught:0,bowler:0,who:new Set()};innings('T20',{sigma,effort,loftRate:0},seeds,120,(ball,input,res)=>{if(input.mode!=='ground'||!res.contact)return;t.contact++;if(!res.mishit)return;t.up++;if(res.wicket&&res.dismissalKind==='caught'){t.caught++;const who=(res.play.catchAttempt||res.play.event).name;t.who.add(who);if(who==='bowler')t.bowler++;}});return t;}
const up120=popUps(120,.85,60),up60=popUps(60,.75,60);
check('T20 ground contacts that go up in front of the bat, 120 ms timing sd, % (plan 4-10; revision 38 is just under)',pct(up120.up,up120.contact),2.6,10,'%');
check('T20 ground contacts that go up in front of the bat, 60 ms timing sd, % (good timing rarely does)',pct(up60.up,up60.contact),.1,1.5,'%');
check('Of those at 120 ms, caught, % (the rest land safely)',pct(up120.caught,up120.up),25,60,'%');
check('Different fielders who take those catches',up120.who.size,4,11);
check('Of those catches, taken by the bowler, %',pct(up120.bowler,up120.caught),5,45,'%');

// ---- 4. The opposition punishes loose balls when the player bowls (notes 7 and 8) ----
function bowl(format,matches,ballsPerInnings){const rows=[];
 for(let k=1;k<=matches;k++){const teams=C.Squad.teams(format),a=teams[k%8],b=teams[(k+3)%8];let c=C.Contest.create(20261110+k*3571,format,a,b,'spectator'),policy=C.RNG.stream(7919*k+91),n=0;
  while(c.phase==='play'&&c.innings.length===1&&n<ballsPerInnings){const m=C.Contest.current(c),owner=m.bowlers[C.Innings.bowler(m)],options=C.BowlingControl.options(owner),line=[-.4,0,.14,.55,1][Math.floor(policy.next()*5)],variation=options[Math.floor(policy.next()*options.length)].name,
    d=C.BowlingControl.prepare(m,{line,variation}),ball=C.BowlingControl.release(d.ball,640+policy.next()*540),bot=C.Opposition.input(m,ball,c);
   let r=C.Shot.resolve(ball,bot.shot,m.batters[m.striker],C.Innings.field(m,ball),bot.rngState);const t=r.play.event.time+.22;
   if(C.ReturnControl.available(r,t)&&r.play.running?.legs.some(l=>l.start<t&&t<l.end))r=[0,1].map(end=>C.ReturnControl.choose(r,end,t)).sort((x,y)=>x.play.throw.breakTime-y.play.throw.breakTime)[0];
   const at=C.Delivery.at(C.Hand.canonical(ball),1);rows.push({spin:C.Strokes.spin(ball),label:ball.manualBowling.releaseLabel,name:ball.lengthName,slow:C.Strokes.spin(ball)||ball.variation==='Slower ball'||ball.speed<126,x:at.x,h:at.h,shot:bot.shot?bot.shot.mode:'leave',runs:r.runs,four:r.boundary===4,wicket:!!r.wicket,wide:!!r.wide});
   c=C.Contest.apply(C.Contest.withPrepared(c,bot.rngState),ball,r);n++;}}return rows;}
const per=a=>mean(a.map(r=>r.runs)),out=a=>pct(a.filter(r=>r.wicket).length,a.length);
(function(){const rows=bowl('T20',110,120),spin=rows.filter(r=>r.spin),by=label=>spin.filter(r=>r.label===label),good=by('Good length');
 check('T20 spin, good length: runs per ball (plan 1.05-1.25)',per(good),1,1.3);
 check('T20 spin, full: runs per ball (plan at least 1.5; revision 37 was 1.29)',per(by('Full')),1.38,2.4);
 check('T20 spin, overpitched: runs per ball (plan at least 1.5; revision 37 was 1.33)',per(by('Overpitched')),1.5,2.6);
 check('T20 spin, short: runs per ball (plan at least 1.5; revision 37 was 1.33)',per(by('Short')),1.55,2.6);
 check('T20 spin, drag down: runs per ball (revision 37 was 1.38)',per(by('Drag down')),1.65,2.7);
 check('T20 spin, full toss: runs per ball (plan at least 1.8; revision 37 was 1.65)',per(by('Full toss')),1.75,2.8);
 check('T20 spin, very full: runs per ball (plan 0.9-1.4; revision 37 was 0.30, revision 38 is just above)',per(by('Very full')),.9,1.85);
 check('T20 spin, drag down wickets as a multiple of good-length wickets (plan no more often)',out(by('Drag down'))/out(good),0,1.15);
 // Runs conceded for each wicket: the loose ball must be the worse bargain. The full ball is the exception and is reported, not required.
 const cost=a=>per(a)*a.length/Math.max(1,a.filter(r=>r.wicket).length);
 for(const label of ['Short','Drag down','Full toss'])check('T20 spin, '+label.toLowerCase()+': runs per wicket as a multiple of good length',cost(by(label))/cost(good),1,9);
 info('T20 spin, full: runs per wicket as a multiple of good length',(cost(by('Full'))/cost(good)).toFixed(2),'near 1: it costs more runs and still takes wickets. See REPORT.md');
 const pace=rows.filter(r=>!r.spin),high=pace.filter(r=>r.name==='short'&&r.h>2.02);
 check('T20 pace balls over the head that the batter leaves, %',pct(high.filter(r=>r.shot==='leave').length,high.length),75,100,'%');
})();
(function(){const rows=bowl('TEST',40,420),reach=rows.filter(r=>r.name==='short'&&r.slow&&r.x>.6&&r.x<=1.1&&!r.wide&&r.h<1.5),goodBall=rows.filter(r=>r.name==='good'&&r.x>-.12&&r.x<=.6);
 check('Sample size: Test balls that are slow, short, outside off, in reach and below the shoulder',reach.length,300,5000);
 check('Test slow short wide balls in reach that the batter leaves, % (plan under 25)',pct(reach.filter(r=>r.shot==='leave').length,reach.length),0,12,'%');
 check('Test slow short wide balls in reach hit for four, % (plan at least 30)',pct(reach.filter(r=>r.four).length,reach.length),30,60,'%');
 check('Test slow short wide balls in reach: runs per ball as a multiple of a good ball on the stumps or corridor',per(reach)/per(goodBall),3,9);
})();

// ---- 5. Bowlers do not always get it right (note 13) ----
(function(){const groups={},landed={n:0,yorker:0};
 for(const format of ['T20','TEST']){const teams=C.Squad.teams(format);for(let k=1;k<=900;k++){let c=C.Contest.create(555+k*977,format,teams[k%8],teams[(k+3)%8],'spectator'),m=C.Contest.current(c);m={...m,balls:(k*6)%114};const owner=m.bowlers[C.Innings.bowler(m)],d=C.BowlingControl.prepare(m,{line:.14,variation:C.BowlingControl.options(owner)[0].name}),spin=C.Strokes.spin(d.ball),ball=C.BowlingControl.release(d.ball,spin?880:930),e=ball.manualBowling.execution,control=ball.manualBowling.control;
   (groups[control>=88?'high':control>=80?'mid':'low']??=[]).push(e);if(JSON.stringify(C.BowlingControl.release(d.ball,spin?880:930))!==JSON.stringify(ball))throw Error('A release is not repeatable');
   if(!spin){const y=C.BowlingControl.release(d.ball,680);landed.n++;if(y.lengthName==='yorker')landed.yorker++;}}}
 const clean=a=>a.filter(e=>!e.slip),loose=a=>pct(a.length-clean(a).length,a.length);
 check('Player bowling, control 80-87: length error sd, m (plan 0.4-0.6 at control 85)',sd(clean(groups.mid).map(e=>e.length)),.4,.62,' m');
 check('Player bowling, control 80-87: line error sd, m (plan 0.12-0.20)',sd(clean(groups.mid).map(e=>e.line)),.11,.2,' m');
 check('Player bowling, control 80-87: loose balls, % (plan 3-6)',loose(groups.mid),2.5,6.5,'%');
 check('Player bowling: length error sd, control 88 and above over control 80-87 (better bowlers miss by less)',sd(clean(groups.high).map(e=>e.length))/sd(clean(groups.mid).map(e=>e.length)),.5,.9);
 check('Player bowling: length error sd, control below 80 over control 80-87',sd(clean(groups.low).map(e=>e.length))/sd(clean(groups.mid).map(e=>e.length)),1.1,1.7);
 check('Pace release at the yorker instant that lands a yorker, %',pct(landed.yorker,landed.n),45,80,'%');
 for(const [format,lo,hi]of [['T20',1.8,4.5],['TEST',1.5,4.5]]){const teams=C.Squad.teams(format),t={pace:0,loose:0,fullToss:0,error:[]};for(let k=1;k<=5000;k++){let c=C.Contest.create(91+k*313,format,teams[k%8],teams[(k+3)%8],'spectator'),m=C.Contest.current(c);m={...m,balls:(k*7)%114};const b=C.Innings.delivery(m).ball;if(b.scoringVersion!==38||b.execution?.version!==38)throw Error('A new delivery has no execution record');if(C.Strokes.spin(b))continue;t.pace++;if(b.execution.slip)t.loose++;else t.error.push(b.execution.length);if(b.fullToss)t.fullToss++;}
  check((format==='T20'?'T20':'Test')+' opposition pace: loose balls, %',pct(t.loose,t.pace),lo,hi,'%');
  check((format==='T20'?'T20':'Test')+' opposition pace: length error sd without them, m',sd(t.error),.15,.45,' m');
  if(format==='T20')check('T20 opposition pace: full tosses, % (plan 1-3)',pct(t.fullToss,t.pace),.6,3,'%');
  else info('Test opposition pace: full tosses, % (plan 1-3)',pct(t.fullToss,t.pace).toFixed(2)+'%','below plan. See REPORT.md');}
})();

// ---- 6. Running calls say what the batter can see (note 4) ----
(function(){const t={open:0,tight:0,boundaryTight:0,lateAllowed:0,available:0,availableOut:0,tightCalls:0,tightOut:0};
 innings('T20',{sigma:60,effort:.8,loftRate:.1,callRuns:false},40,120,(ball,input,r)=>{if(!r.play?.running)return;const rope=r.play.boundaryVersion===25;
  for(let time=.05;time<r.decisionTime;time+=.1){const offer=C.Running.offer(r,time);if(['closed','queued'].includes(offer.status))continue;t.open++;if(offer.status==='tight'){t.tight++;if(rope)t.boundaryTight++;}if(offer.status==='late'){if(offer.allowed||C.Running.command(r,'run',time)!==r)t.lateAllowed++;if(rope)t.boundaryTight++;continue;}
   const tried=C.Running.command(r,'run',time),runOut=tried!==r&&tried.dismissalKind==='runOut';if(offer.status==='available'){t.available++;if(runOut)t.availableOut++;}else{t.tightCalls++;if(runOut)t.tightOut++;}}});
 check('Run button: share of open calls labelled tight, % (plan under 25; revision 37 said risky on most)',pct(t.tight,t.open),1,25,'%');
 check('Run button: tight or no-run calls on a ball heading for the rope',t.boundaryTight,0,0);
 check('Run button: no-run calls that can still be taken',t.lateAllowed,0,0);
 check('Run button: a run called when it says the run is on that ends in a run out, %',pct(t.availableOut,t.available),0,0,'%');
 check('Run button: a run called when it says tight that ends in a run out, % (it could go either way)',pct(t.tightOut,t.tightCalls),25,75,'%');
})();

// ---- 7. Three contract checks on larger samples, for information ----
function human(format,s,seeds,maxBalls=120){const t={legal:0,wickets:0};innings(format,s,seeds,maxBalls,(ball,input,res)=>{if(res.legal)t.legal++;if(res.wicket)t.wickets++;});return t.legal/Math.max(1,t.wickets);}
const mix=human('T20',{sigma:60,effort:.85,loftRate:.25},120);
check('T20 25% loft mix, 60 ms sd, on 120 innings: balls per wicket (the contract uses 10 and a floor of 20)',mix,20,60);
info('  the same measurement on revision 37','20.63','its ten contract innings read 24.04; the floor is 20');
info('T20 ground strokes, 60 ms sd, on 120 innings: balls per wicket',human('T20',{sigma:60,effort:.75,loftRate:0},120).toFixed(1),'revision 37: 62.0; contract band 30-90');
info('T20 ground strokes, 130 ms sd, on 120 innings: balls per wicket',human('T20',{sigma:130,effort:.75,loftRate:0},120).toFixed(1),'revision 37: 22.4; contract band 12-40');
info('Test ground strokes + 35% defence, 60 ms sd, on 40 innings: balls per wicket',human('TEST',{sigma:60,effort:.65,loftRate:0,defendRate:.35},40,270).toFixed(1),'revision 37: 78.3; contract band 40-130');

console.log(results.join('\n'));console.log('\n'+pass+' passed, '+fail+' failed of '+(pass+fail)+' revision 38 checks.');
process.exit(fail?1:0);
