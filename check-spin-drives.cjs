// Actual deterministic engine and pointer handlers; no browser layout emulation.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {host,pointer,C,copy}=require('./check-display-input.cjs');
const old={};vm.createContext(old);vm.runInContext(fs.readFileSync(__dirname+'/review-fixtures/core-v19.js','utf8'),old);const O=old.Cricket;
let checks=0;async function check(name,fn){try{await fn();checks++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exit(1);}}
function match(format='TEST',seed=31){return C.Innings.create(seed,C.Squad.team(format,'eng'),C.Squad.team(format,'ind'),format,0);}
function fixture(format='TEST',type='offspin',lengthName='good',x=.25,height=.85){
 const m=match(format),d=C.Innings.delivery(m),spin=['offspin','legspin'].includes(type),length={yorker:.4,full:2.8,good:5.6,short:8.8}[lengthName],speed=spin?86:138;
 const ball={...d.ball,scoringVersion:20,archetype:type,family:spin?'finger-spin':'pace',battingHand:'right',lengthName,length,speed,line:x-(spin?.22:.05),swing:0,kick:spin?.22:.05,releaseX:.43,contactH:height,noBall:false,freeHit:false};
 ball.preTime=(18.4-length)/(speed/3.6);ball.postTime=length/(speed/3.6*(spin?.70:lengthName==='short'?.64:.79));ball.duration=ball.preTime*2600+ball.postTime*(spin?3200:2600);ball.bounceT=ball.preTime*2600/ball.duration;
 return{m,ball,batter:m.batters[0],field:C.Innings.field(m,ball),seed:d.rngState};
}
const input=(angle=44,error=0,mode='ground',effort=.65)=>({angle,error,mode,effort});
const play=(f,shot,seed=f.seed)=>C.Shot.resolve(f.ball,shot,f.batter,f.field,seed);
function until(h,predicate){for(let i=0;i<1000;i++){if(predicate(h.u.get()))return;h.step();}throw Error('Clock stalled');}
(async()=>{
await check('Drive names, guides, foot plants and contact origins agree for both hands and formats',()=>{
 for(const format of ['TEST','T20'])for(const type of ['seam','offspin','legspin'])for(const hand of ['right','left'])for(const [length,height]of [['full',.34],['good',.85],['good',1.08]])for(const [angle,x,name,label]of [[0,0,'Straight drive','STRAIGHT'],[25,.18,'Off drive',null],[44,.3,'Cover drive','COVER'],[-44,-.28,'On drive','ON DRIVE'],[87,.60,'Square drive','SQUARE']]){
  const f=fixture(format,type,length,x,height),b=f.ball,sign=hand==='left'?-1:1;b.battingHand=hand;if(sign<0)for(const k of ['line','swing','kick','releaseX'])b[k]*=-1;
  const shot=input(angle*sign),pose=C.BatterRig.pose({scoringVersion:20,hand,angle:shot.angle,mode:'ground',lengthName:length,height,line:x*sign,archetype:type,age:0,effort:.65});
  assert.equal(C.Shot.describe(shot.angle,shot.mode,b),name);assert.equal(pose.name,name);assert.ok(C.Shot.suitability(b,shot.angle,shot.mode).value>.9);assert.ok(pose.leftAnkle.z>.4);assert.equal(C.Fielding.contactOrigin(b,shot).z,.11);assert.ok(Math.abs(pose.contactPoint.z-.11)<.08);
  if(label)assert.ok(C.Strokes.guide(b).some(s=>s.label===label));
 }
 for(const [length,height,angle,name]of [['good',1.22,44,'Back-foot punch'],['short',1.3,44,'Back-foot punch'],['short',1.7,-95,'Hook'],['short',1.25,-95,'Pull'],['full',.3,-95,'Sweep'],['good',.85,135,'Late cut']]){const {ball}=fixture('TEST','offspin',length,.2,height);assert.equal(C.Shot.describe(angle,'ground',ball),name);}
});
await check('Controlled spin contact stays usable across late releases without raising middle timing or power',()=>{
 const totals={old:{miss:0,edge:0,clean:0},now:{miss:0,edge:0,clean:0}};let samples=0;
 for(const format of ['TEST','T20'])for(const type of ['offspin','legspin'])for(let seed=1;seed<=24;seed++){
  const m=match(format);m.order.fill(m.bowlers.findIndex(b=>b.archetype===type));m.rngState=seed*104729;const d=C.Innings.delivery(m),ball=C.Hand.canonical(d.ball),x=C.Delivery.at(ball,1).x;
  if(!['full','good'].includes(ball.lengthName)||Math.abs(x)>1)continue;
  for(const error of [-350,-300,-240,240,300,350]){const shot=input(x<-.2?-44:x>.2?44:0,error),batter=m.batters[0];for(const [key,K,version]of [['old',O,19],['now',C,20]]){const r=K.Contact.resolve({...ball,scoringVersion:version},shot,batter,d.rngState),s=totals[key];s.miss+=!r.contact;s.edge+=!!r.edge;s.clean+=r.contact&&!r.edge;}samples++;}
 }
 assert.ok(samples>300);assert.ok(totals.now.clean>samples*.80);assert.ok(totals.now.miss<totals.old.miss*.1);assert.ok(totals.now.edge<totals.old.edge*.5);console.log('Matched spin strokes:',{samples,...totals});
 const f=fixture();for(const id of ['joe-root','zak-crawley','shoaib-bashir']){f.ball.batterProfile=C.Players.batting(id,'TEST');const window=C.Contact.window(f.ball,f.batter,input());assert.ok(window>=300&&window<=420);assert.ok(window>C.Contact.precisionWindow(f.ball,f.batter,input())+60);assert.ok(C.Contact.window(f.ball,f.batter,input(44,0,'defend'))>window);assert.ok(C.Contact.window(f.ball,f.batter,input(44,0,'loft'))<window);}
});
await check('Weak spin contact loses speed, clean middles retain their speed, and ground drives offer a scoring range',()=>{
 const scores=new Set();let fours=0,n=0,weak=0;
 for(const format of ['TEST','T20'])for(const type of ['seam','offspin'])for(const length of ['full','good'])for(const angle of [-44,0,44,87])for(const effort of [.35,.60,.9])for(const error of [0,120]){
  const f=fixture(format,type,length,angle===87?.60:angle<0?-.25:angle>0?.25:0,length==='full'?.32:.85),r=play(f,input(angle,error,'ground',effort),7919+n++);
  if(r.contact&&!r.edge){assert.equal(r.play.kind,'ground');assert.ok(r.play.initial.vy<0);assert.notEqual(r.boundary,6);const score=C.Running.automatic(r).batRuns;scores.add(score);fours+=score===4;}
 }
 assert.ok(scores.has(0)&&scores.has(1)&&scores.has(2)&&scores.has(4));assert.ok(fours>0&&fours<n*.55);
 for(let seed=1;seed<=30;seed++){const f=fixture('TEST','offspin','full'),s=input(),clean=play(f,s,seed),late=play(f,input(44,320),seed),before=O.Shot.resolve({...f.ball,scoringVersion:19},s,f.batter,f.field,seed);assert.equal(clean.exitSpeed,before.exitSpeed);if(!late.edge){assert.ok(late.contact);assert.ok(late.exitSpeed<clean.exitSpeed*.75);assert.notEqual(late.boundary,6);weak++;}}
 assert.ok(weak>20);console.log('Ground scoring:',{samples:n,fours,scores:[...scores].sort(),weakContacts:weak});
});
await check('Real edges and poor choices still matter, while pace contact windows retain their difficulty',()=>{
 let edges=0,keeper=0;const f=fixture('TEST','legspin','good',.38,.85);
 for(let seed=1;seed<=100;seed++){const r=play(f,input(44,300),seed*7919);edges+=!!r.edge;keeper+=r.wicket&&/keeper|slip/.test(r.fielder);}
 assert.ok(edges>0&&edges<35);assert.ok(keeper>0);
 assert.ok(C.Shot.suitability(fixture('TEST','offspin','short',.2,1.55).ball,-95,'ground').value>.9);
 assert.ok(C.Shot.suitability(fixture('TEST','offspin','yorker',.2,.08).ball,-95,'ground').value<.4);
 for(const format of ['TEST','T20'])for(const type of ['seam','swing','leftpace']){const f=fixture(format,type,'full');for(const mode of ['defend','ground','loft'])assert.equal(C.Contact.window(f.ball,f.batter,input(44,0,mode)),O.Contact.window({...f.ball,scoringVersion:19},f.batter,input(44,0,mode)));}
 const reach=fixture('TEST','offspin','full',1.5,.32);assert.equal(play(reach,input(44,0)).contact,false);assert.equal(play(f,input(44,500)).contact,false);console.log('Mistimed spin edges:',{edges,keeperCatches:keeper});
});
await check('Late spin releases work through actual pad/fullscreen handlers, and a live save resumes identically',async()=>{
 for(const format of ['TEST','T20'])for(const full of [false,true])for(const mode of ['ground','defend']){
  const h=host(format);if(full){await h.n('settingsBtn').click();await h.u.chooseDisplay(true);await h.n('settingsResumeBtn').click();}else await h.n('resumeBtn').click();await h.n('bowlBtn').click();await h.n('readyBallBtn').click();const s=h.u.get(),f=fixture(format),surface=h.n(full?'fieldCanvas':'swipePad');
  s.pending={...f.ball,bowler:s.pending.bowler};const shot=input(mode==='defend'?0:44,0,mode),error=C.Contact.window(s.pending,s.match.batters[s.match.striker],shot)-12;s.elapsed=s.pending.duration+error;h.u.clock(0);assert.equal(s.phase,'flight');h.u.pointerDown(pointer(surface,150,350));h.u.pointerUp(pointer(surface,mode==='defend'?150:220,mode==='defend'?330:278));assert.ok(s.shot);assert.equal(s.shot.mode,mode);assert.match(h.n('quality').textContent,/ms late/);until(h,s=>s.phase==='inPlay'); // R29 displays contact immediately, without the old settling delay.assert.equal(s.live.contact,true);
  await h.n('menuBtn').click();const saved=JSON.parse(h.storage.get('cricket.career.v5'));assert.equal(C.CareerSave.validate(copy(saved)).sessions[format].pending.scoringVersion,20);const resumed=host(format,saved);await h.n('resumeBtn').click();await resumed.n('resumeBtn').click();until(h,s=>s.phase==='result');until(resumed,s=>s.phase==='result');assert.deepEqual(copy(h.u.get().match),copy(resumed.u.get().match));
 }
});
await check('Prepared V19 balls keep exact outcomes and subsequent deliveries upgrade deterministically',()=>{
 for(const format of ['TEST','T20'])for(let seed=1;seed<=4;seed++){const m=O.Innings.create(seed,O.Squad.team(format,'eng'),O.Squad.team(format,'ind'),format,0);for(const over of [0,1,11]){m.balls=over*6;const d=O.Innings.delivery(m);for(const shot of [null,input(44,90),input(-95,50,'loft')])assert.equal(JSON.stringify(C.Shot.resolve(d.ball,shot,m.batters[0],C.Innings.field(m,d.ball),d.rngState)),JSON.stringify(O.Shot.resolve(d.ball,shot,m.batters[0],O.Innings.field(m,d.ball),d.rngState)));const before=JSON.stringify(m),a=C.Innings.delivery(m);assert.equal(a.ball.scoringVersion,35);assert.deepEqual(a,C.Innings.delivery(copy(m)));assert.equal(JSON.stringify(m),before);}}
});
console.log(checks+' spin and drive checks passed.');
})();
