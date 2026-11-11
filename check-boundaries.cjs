const assert=require('node:assert/strict'),{C,host,copy}=require('./check-display-input.cjs');
const examples={};
for(let seed=1;seed<250&&Object.keys(examples).length<3;seed++){
 const m=C.Innings.create(seed*193,C.Squad.team('T20','eng'),C.Squad.team('T20','ind'),'T20',0),d=C.Innings.delivery(m),b=d.ball,x=C.Delivery.at(b,1).x;
 for(const mode of ['ground','loft']){
  const shot={angle:x>.1?44:0,mode,effort:1,error:0},r=C.Shot.resolve(b,shot,m.batters[0],C.Innings.field(m,b),d.rngState),type=r.play.event.type;
  if(['four','six','pickup'].includes(type)&&!examples[type])examples[type]={m,b,shot,r};
 }
}
assert.equal(Object.keys(examples).length,3);
for(const type of ['four','six']){
 const {r,b}=examples[type],e=r.play.event,c=e.chaser,all=[...r.play.starts,r.play.keeper];
 assert.ok(c?.id);assert.equal(e.id,undefined);assert.equal(r.play.throw,undefined);
 assert.ok(c.arrival>=e.time+.15);const fastest=all.slice().sort((a,b)=>C.TeamField.arrive(a,e.x,e.z)-C.TeamField.arrive(b,e.x,e.z))[0];assert.equal(c.id,fastest.id);
 assert.ok(C.Running.offer(r,.45).allowed);let called=C.Running.command(r,'run',.45);assert.deepEqual(copy(C.Running.command(copy(r),'run',.45)),copy(called));assert.equal(called.play.running.legs.length,2);assert.ok(!called.wicket);assert.equal(called.decisionTime,e.time);assert.ok(called.batRuns>=(type==='six'?6:4));
 const held=C.Running.command(called,'hold',.55);assert.equal(held.play.running.legs.length,1);assert.equal(held.batRuns,called.batRuns);
 const crossed=C.Running.finish(r,[{start:0,end:e.time-.1},{start:e.time-.05,end:e.time+1}],null);assert.equal(crossed.batRuns,type==='six'?6:4);
 const five=Array.from({length:5},(_,i)=>({start:i*.1,end:i*.1+.09}));assert.equal(C.Running.finish(r,five,null).batRuns,type==='six'?6:5);
 assert.ok(C.Running.frame(called,e.time+.1).every(f=>!f.moving));
 const before=JSON.stringify(r);for(const t of [0,e.time/2,c.arrival,c.arrival+1])assert.deepEqual(C.Fielding.frame(r,t,null,b),C.TeamField.frame(r,t));assert.equal(JSON.stringify(r),before);
}
console.log('PASS Four and six running commands are live, cancellable and safe; boundary allowance and completed runs are preserved');
const frames=[];
for(const type of ['four','six']){
 const {m,b,shot,r}=examples[type],snapshot=JSON.stringify({m,b,r}),c=r.play.event.chaser,first=r.play.starts.find(f=>f.id===c.id)||r.play.keeper;
 for(const [stage,t]of [['contact',0],['mid-chase',c.arrival/2],['arrival',c.arrival],['walk',c.arrival+1.3]]){
  const f=C.Fielding.frame(r,t,null,b).fielders.find(f=>f.id===c.id),rig=C.FielderRig.pose(f,t);assert.ok(Number.isFinite(rig.head.x));
  if(stage==='contact')assert.ok(Math.hypot(f.x-first.x,f.z-first.z)<1e-8);
  if(stage==='mid-chase')assert.ok(Math.hypot(f.x-first.x,f.z-first.z)>4);
  if(stage==='arrival'){assert.equal(f.action,'pickup');assert.ok(f.actionBlend>.99);assert.ok(Math.hypot(f.x-r.play.event.x,f.z-r.play.event.z)<.65);}
  if(stage==='walk')assert.equal(f.action,'walk');
  const h=host('T20'),s=h.u.get();h.n('reducedMotionToggle').checked=true;h.n('reducedMotionToggle').dispatch('change');Object.assign(s,{match:m,pending:b,shot,live:r,phase:'inPlay',fieldBrief:false,elapsed:b.duration+35,resultAge:t*1000});
  const seen=[],pose=C.FielderRig.pose;C.FielderRig.pose=(f,t)=>{seen.push(copy(f));return pose(f,t);};try{h.u.drawField(0);}finally{C.FielderRig.pose=pose;}
  const drawn=seen.find(f=>f.id===c.id);assert.ok(drawn,'The real canvas draw path draws the '+type+' chaser at '+stage);assert.equal(drawn.x,f.x);assert.equal(drawn.z,f.z);assert.equal(JSON.stringify({m,b,r}),snapshot);
  frames.push({type,stage,time:+t.toFixed(3),fielder:c.name,x:+f.x.toFixed(3),z:+f.z.toFixed(3),action:f.action,gait:+f.gait.toFixed(3),distanceToRope:+Math.hypot(f.x-r.play.event.x,f.z-r.play.event.z).toFixed(3)});
 }
}
console.log('PASS Chaser runs from the field position, gathers low at the rope, then walks; real canvas and engine frames agree without RNG changes');
const pickup=examples.pickup.r;assert.ok(pickup.play.throw);assert.equal(pickup.play.boundaryVersion,undefined);assert.equal(pickup.decisionTime,pickup.play.throw.breakTime);assert.ok(C.Running.offer(pickup,.45).hint);console.log('PASS A cut-off ball retains its collector, throw and run-out route');
if(process.argv.includes('--frames'))console.log(JSON.stringify(frames,null,2));

let spin=0,pace=0;for(const format of ['T20','TEST'])for(let seed=1;seed<=40;seed++){
 const m=C.Innings.create(seed*127,C.Squad.team(format,'eng'),C.Squad.team(format,'ind'),format,0);m.balls=(seed%18)*6;
 const before=JSON.stringify(m),d=C.Innings.delivery(m),b=d.ball;assert.equal(b.scoringVersion,38);assert.equal(JSON.stringify(m),before);assert.deepEqual(C.Innings.delivery(copy(m)),d);
 assert.ok(Math.abs(b.duration/(b.preTime+b.postTime)-2600)<1e-9);assert.ok(Math.abs(b.duration*b.bounceT-b.preTime*2600)<1e-8);assert.ok(Math.abs(C.BallView.scale(b)-2600)<1e-8);
 for(const mode of ['ground','loft','defend']){const input={mode,angle:44},old=C.Contact.window({...b,scoringVersion:24},m.batters[0],input),v25=C.Contact.window({...b,scoringVersion:25},m.batters[0],input),current=C.Contact.window(b,m.batters[0],input);assert.equal(v25,old);if(format==='T20'&&mode==='ground'&&['full','good'].includes(b.lengthName)){assert.ok(current<=old&&current>=200);const controlled=C.Contact.window({...b,bowlerProfile:{...b.bowlerProfile,control:95}},m.batters[0],input),loose=C.Contact.window({...b,bowlerProfile:{...b.bowlerProfile,control:45}},m.batters[0],input);assert.ok(controlled<=loose);}else if(format==='T20'&&mode==='ground'&&C.Strokes.spin(b)&&!C.Contact.cutCoverage(b,input))assert.ok(current>=old&&current<=old*.90/.85+1e-8);else assert.equal(current,old);}
 if(C.Strokes.spin(b))spin++;else pace++;
}assert.ok(spin>10&&pace>10);console.log('PASS New pace and spin share 2600 ms per physical second before and after pitching; preparation is pure; new T20 ground precision responds to control, with V27 spin coverage calibrated separately');
