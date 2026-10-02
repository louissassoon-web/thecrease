// Pure physics, scoring and save regression checks. No browser or dependencies.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const html=fs.readFileSync(__dirname+'/dist/index.html','utf8');
vm.runInThisContext(html.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1]);
const C=Cricket,N=C.NormalBall,team=C.Squad.team('T20','eng'),opponent=C.Squad.team('T20','ind'),m=C.Innings.create(7,team,opponent,'T20',0);
let checks=0;
function check(name,fn){if(process.env.CRICKET_CHECK_FILTER&&!new RegExp(process.env.CRICKET_CHECK_FILTER).test(name))return;fn();checks++;console.log('PASS '+name);}
const range=p=>{const at=N.at(p,p.stopTime);return Math.hypot(at.x-p.origin.x,at.z-p.origin.z);};
const energy=v=>v.speed*v.speed+v.vy*v.vy+N.inertia*v.spin*v.spin;
function delivery(seed,type,angle,version=7){
 const full=Math.abs(angle)<65||Math.abs(angle)>115,spin=type===2||type===3,b={...C.Delivery.create(seed*37,type,5).ball,scoringVersion:version,lengthName:full?'full':'short',length:full?2.8:8.8,contactH:full?.3:spin?1.4:1.6,line:angle<0?-.12:.16,swing:0,kick:0};
 b.preTime=(18.4-b.length)/(b.speed/3.6);b.postTime=b.length/(b.speed/3.6*(spin?.70:full?.79:.64));b.duration=(b.preTime+b.postTime)*2600;b.bounceT=b.preTime/(b.preTime+b.postTime);return b;
}
check('A normal outfield slows a rolling ball consistently, independent of shot labels',()=>{
 for(const speed of [3.38,10,25,40]){
  const p=N.build({x:20,z:0,h:N.radius},0,speed,0,'ground',1),q=N.build({x:20,z:0,h:N.radius},0,speed,0,'edge',1),a=N.turf.rolling,k=N.air;
  // Independent analytic integral of dv/dt = -a - k v², for pure rolling.
  const expected=Math.log(1+k*speed*speed/a)/(2*k);assert.ok(Math.abs(range(p)-expected)<Math.max(.005,expected*.005));assert.equal(range(p),range(q));
  const finer={...N,step:N.step/2}.build({x:20,z:0,h:N.radius},0,speed,0,'ground',1);assert.ok(Math.abs(range(p)-range(finer))<.3);
  const after=N.at(p,p.stopTime+30);assert.equal(after.speed,0);assert.deepEqual(after,N.at(p,p.stopTime));
 }
 // Lopez & Chinnery: release 3.38 m/s, mean roll 2.47 m on one measured field.
 // This is a plausibility anchor, not a universal cricket-outfield standard.
 const measured=N.build({x:20,z:0,h:N.radius},0,3.38,0,'ground',1);assert.ok(Math.abs(range(measured)-2.47)<.3);
 const strip=N.build({x:0,z:0,h:N.radius},0,3.38,0,'ground',1);assert.ok(range(strip)>range(measured)*2);
 console.log({outfieldRollMetres:Number(range(measured).toFixed(3)),pitchRollMetres:Number(range(strip).toFixed(3))});
});
check('Flights and impacts preserve position and dissipate energy before a natural stop',()=>{
 for(const speed of [8,25,45])for(const vy of [-6,0,20])for(const angle of [0,.7,2.4])for(const h of [.035,.3,1.8]){
  const p=N.build({x:.1,z:.11,h},angle,speed,vy,vy>0?'shot':'ground',vy>0?-.18:.5);assert.ok(p.segments.length<2000);assert.ok(p.stopTime>0&&p.stopTime<30);
  for(const b of p.bounces){assert.ok(energy(b.after)<=energy(b.before)+1e-8);assert.ok(b.after.vy<=Math.abs(b.before.vy));}
  for(const s of p.segments.slice(1)){
   const a=N.at(p,Math.max(0,s.time-1e-8)),b=N.at(p,s.time+1e-8);assert.ok(Math.hypot(a.x-b.x,a.z-b.z,a.h-b.h)<.00001);assert.ok([b.x,b.z,b.h,b.speed].every(Number.isFinite));assert.ok(b.h>=N.radius&&b.speed>=0);
  }
  const flight=p.segments.find(s=>!s.roll&&s.duration>.01);if(flight)assert.ok(flight.ax<=0);
  const start=N.at(p,0);assert.ok(Math.hypot(start.x-p.origin.x,start.z-p.origin.z,start.h-p.origin.h)<.000001);
 }
 // Grass resistance has no special penalty for shots behind square.
 const distances=[0,Math.PI/2,Math.PI,-Math.PI/2].map(a=>range(N.build({x:100,z:100,h:.3},a,25,-2,'ground',.5)));
 assert.ok(Math.max(...distances)-Math.min(...distances)<1e-8);
});
check('Swipe length controls stroke strength without changing direction or release quality',()=>{
 for(const width of [320,390,540]){
  const g=C.Gesture.begin(1,200,500,width),shots=[.08,.50,.92].map(f=>{const d=16+f*(g.loftAt-16);return C.Gesture.release(g,1,200+d/Math.sqrt(2),500-d/Math.sqrt(2),1000,1000,7);});
  assert.ok(shots[0].effort<shots[1].effort&&shots[1].effort<shots[2].effort);
  for(const shot of shots){assert.ok(Math.abs(shot.angle-45)<1e-9);assert.equal(shot.error,0);assert.equal(shot.mode,'ground');}
  const b=delivery(7,0,40),results=shots.map(shot=>C.Shot.resolve(b,shot,m.batters[0],C.FIELDS[0],17));
  for(const r of results){assert.equal(r.timing,'Perfect timing');assert.equal(r.quality,results[0].quality);assert.equal(r.contactGrade,'MIDDLED');}
  assert.ok(results[0].exitSpeed<results[1].exitSpeed&&results[1].exitSpeed<results[2].exitSpeed);assert.ok(range(results[0].play)<range(results[1].play)&&range(results[1].play)<range(results[2].play));
  assert.ok(results[0].runs<4);assert.equal(results[2].runs,4);
  const legacy=C.Gesture.release(g,1,220,480,1000,1000,6);assert.equal(legacy.effort,undefined);
 }
});
check('Ordinary strokes rotate the strike and full strokes can beat the field on either side',()=>{
 const summary=[];
 // A fixed, disclosed comparison set, not a predicted real-match score rate.
 for(const effort of [.25,.60,1]){
  const counts={0:0,1:0,2:0,3:0,4:0},behind={leg:0,off:0,sweep:0};let total=0;
  for(let seed=1;seed<=24;seed++)for(const type of [0,1,2,3,4])for(const angle of [-150,-130,-100,-80,-40,-10,10,40,80,100,130,150]){
   const b=delivery(seed,type,angle),input={angle,mode:'ground',error:[0,40,80][seed%3],effort},r=C.Shot.resolve(b,input,m.batters[seed%6],C.FIELDS[type],seed);counts[r.runs]++;total++;
   const e=r.play.event;if(r.runs===4){assert.ok(e.bounced);assert.ok(Math.abs(Math.hypot(e.x,e.z)-64)<.001);if(Math.abs(angle)>115){behind[angle<0?'leg':'off']++;if(r.shot==='Sweep')behind.sweep++;}}
   else{assert.equal(e.type,'pickup');const f=[...r.play.starts,r.play.keeper].find(f=>f.id===e.id);assert.ok(Math.hypot(f.x-e.x,f.z-e.z)<=C.BallFlight.run(f,e.time)+.601);}
   assert.deepEqual(C.Fielding.freeBall(r.play,Math.min(.5,e.time)),N.at(r.play,Math.min(.5,e.time)));
  }
  for(const value of Object.values(counts))assert.ok(value>0);assert.ok(counts[1]>counts[4]||effort===1);
  const rate=counts[4]/total;assert.ok(rate<(effort===.25?.15:effort===.6?.35:.65));if(effort===1){assert.ok(rate>.15);assert.ok(behind.leg>15&&behind.off>15&&behind.sweep>5);}
  summary.push({effort,shots:total,runs:counts,fourPercent:Number((rate*100).toFixed(1)),behind});
 }
 assert.ok(summary[0].fourPercent<summary[1].fourPercent&&summary[1].fourPercent<summary[2].fourPercent);console.log(JSON.stringify({calibration:summary}));
});
check('Lofted shots need actual carry and catches remain reachable before a bounce',()=>{
 let sixes=0,catches=0,middled=0;
 for(let seed=1;seed<=60;seed++)for(const angle of [-145,-90,-40,10,45,95,145]){
  const b={...C.Delivery.create(seed*41,seed%5,5).ball,scoringVersion:7},input={angle,mode:'loft',error:seed%3===0?75:0,effort:.9},r=C.Shot.resolve(b,input,m.batters[seed%6],C.FIELDS[seed%5],seed*13),e=r.play.event;
  if(r.runs===6){sixes++;assert.ok(!e.bounced&&e.time<r.play.airTime);assert.ok(Math.abs(Math.hypot(e.x,e.z)-64)<.001);if(r.contactGrade==='MIDDLED')middled++;}
  if(r.wicket&&r.contact){catches++;const f=[...r.play.starts,r.play.keeper].find(f=>f.id===e.id);assert.ok(!e.bounced&&e.time<r.play.airTime);assert.ok(e.h>=.2&&e.h<=2.2);assert.ok(Math.hypot(f.x-e.x,f.z-e.z)<=C.BallFlight.run(f,e.time)+.601);}
 }
 assert.ok(sixes>5&&catches>5&&middled>5);console.log({loftedSixes:sixes,reachableCatches:catches,middledSixes:middled});
});
check('Existing V6 deliveries keep their exact result, opposition input and saved trajectory',()=>{
 const old=cp.execFileSync('git',['show','858c62e98111117bf10834628da44daa12bbbbdc:dist/index.html'],{cwd:__dirname,encoding:'utf8'}),box={};vm.createContext(box);vm.runInContext(old.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1]+';globalThis.core=Cricket;',box);const O=box.core;
 for(let seed=1;seed<=30;seed++){
  const om=O.Innings.create(seed,O.Squad.team('T20','eng'),O.Squad.team('T20','ind'),'T20',0),d=O.Innings.delivery(om),copy=x=>JSON.parse(JSON.stringify(x)),oldInput=O.Opposition.input(om,d.ball),nowInput=C.Opposition.input(copy(om),copy(d.ball));assert.equal(JSON.stringify(nowInput),JSON.stringify(oldInput));
  for(const mode of ['ground','loft','defend']){const input={angle:seed%2?145:-40,mode,error:24},previous=O.Shot.resolve(d.ball,input,om.batters[0],O.Innings.field(om,d.ball),d.rngState),now=C.Shot.resolve(copy(d.ball),input,copy(om.batters[0]),C.Innings.field(copy(om),copy(d.ball)),d.rngState);assert.equal(JSON.stringify(now),JSON.stringify(previous));for(const t of [0,.25,1,3,7])assert.equal(JSON.stringify(C.Fielding.ballAt(now.play,t)),JSON.stringify(O.Fielding.ballAt(previous.play,t)));}
 }
});
check('Current stroke strength and playback survive save/resume; invalid strengths are rejected',()=>{
 const league=C.Season.create(3,'T20','eng');let contest=C.Season.begin(league),match=C.Contest.current(contest);const d=C.Innings.delivery(match);contest=C.Contest.withPrepared(contest,d.rngState);match=C.Contest.current(contest);
 const state={league,contest,match,recorded:false,phase:'flight',pending:d.ball,elapsed:700,shot:{angle:40,mode:'ground',error:15,effort:.37},botInput:null,resultAge:0,watchUntil:0},root={schema:5,active:'T20',legacy:null,sessions:{T20:state}},serialise=()=>JSON.parse(JSON.stringify(C.CareerSave.pack(root)));
 const restored=C.CareerSave.validate(serialise()).sessions.T20,resolve=s=>C.Shot.resolve(s.pending,s.shot,s.match.batters[s.match.striker],C.Innings.field(s.match,s.pending),s.match.rngState),result=resolve(state);
 assert.equal(restored.pending.scoringVersion,16);assert.equal(restored.shot.effort,.37);assert.deepEqual(resolve(restored),result);
 for(const effort of [-.1,1.1,null,'full']){const data=serialise();data.sessions.T20.shot.effort=effort;assert.throws(()=>C.CareerSave.validate(data),/stroke strength/);}
 const botBad=serialise();botBad.sessions.T20.botInput={rngState:1,shot:{...state.shot,effort:2}};assert.throws(()=>C.CareerSave.validate(botBad),/stroke strength/);
 state.contest=C.Contest.apply(contest,d.ball,result);state.match=C.Contest.current(state.contest);state.phase='result';state.resultAge=600;
 const replay=C.CareerSave.validate(serialise()).sessions.T20.match.history.at(-1).play;assert.equal(replay.physicsVersion,7);
 for(let t=0;t<=result.play.returnTime+.5;t+=.15)assert.deepEqual(C.Fielding.ballAt(replay,t),C.Fielding.ballAt(result.play,t));
 console.log({saveCharacters:JSON.stringify(C.CareerSave.pack(root)).length});
});
console.log(checks+' surface and stroke checks passed.');
