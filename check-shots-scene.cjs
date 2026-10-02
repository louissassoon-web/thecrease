// Shot, articulated-body and camera geometry checks. No browser or canvas mock.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const html=fs.readFileSync(__dirname+'/dist/index.html','utf8');
vm.runInThisContext(html.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1]);
const C=Cricket,R=C.BatterRig,V=C.View,m=C.Innings.create(7,C.Squad.team('T20','eng'),C.Squad.team('T20','ind'),'T20',0);
let checks=0;
function check(name,fn){if(process.env.CRICKET_CHECK_FILTER&&!new RegExp(process.env.CRICKET_CHECK_FILTER).test(name))return;fn();checks++;console.log('PASS '+name);}
function delivery(seed,type,lengthName='full',line=.22){
 const short=lengthName==='short',spin=type===2||type===3,length=short?8.8:lengthName==='good'?5.4:lengthName==='yorker'?.6:2.8;
 const b={...C.Delivery.create(seed*37,type,5).ball,scoringVersion:8,lengthName,length,contactH:short?1.6:lengthName==='good'?.75:lengthName==='yorker'?.06:.3,line,swing:0,kick:0};
 b.preTime=(18.4-length)/(b.speed/3.6);b.postTime=length/(b.speed/3.6*(spin?.70:short?.64:.79));b.duration=(b.preTime+b.postTime)*2600;b.bounceT=b.preTime/(b.preTime+b.postTime);return b;
}
const resolve=(b,angle,mode='ground',effort=1,seed=7,error=0)=>C.Shot.resolve(b,{angle,mode,effort,error},m.batters[seed%6],C.FIELDS[b.bowler],seed);
check('Saved V8 late cuts retain their original grounded trajectory and scoring',()=>{
 const counts={0:0,1:0,2:0,3:0,4:0,6:0};let shots=0;
 for(let seed=1;seed<=12;seed++)for(const type of [0,1,2,3,4])for(const length of ['full','good'])for(const angle of [113,126,140,160,179])for(const mode of ['ground','loft']){
  const r=resolve(delivery(seed,type,length),angle,mode,[.3,.6,1][seed%3],seed,[0,35,80][seed%3]);assert.ok(r.contact&&r.quality>=.36);assert.equal(r.shot,'Late cut');assert.equal(r.loft,false);assert.equal(r.play.kind,'ground');assert.ok(r.play.initial.vy<0);assert.ok(r.angle>=118-1e-8&&r.angle<=172+1e-8);assert.ok(r.play.dz<0&&r.play.dx>0);if(r.wicket){assert.equal(r.play.event.type,'catch');assert.ok(!r.play.event.bounced&&r.play.event.time<r.play.bounces[0].time);}else assert.ok(r.play.bounces[0].time<r.play.event.time);assert.notEqual(r.runs,6);counts[r.runs]++;shots++;
  if(r.runs===4){assert.ok(r.play.event.bounced);assert.ok(r.play.event.z<0);assert.ok(Math.abs(Math.hypot(r.play.event.x,r.play.event.z)-64)<.001);}
 }
 assert.ok(counts[4]>0);assert.ok(counts[1]>counts[4]&&counts[2]>0);console.log({guidedCuts:shots,runs:counts});
});
check('Upper cuts need a high short ball and sweeps depend on the spinner and length',()=>{
 let upperSixes=0,slogSixes=0;
 for(let seed=1;seed<=24;seed++){
  const b=delivery(seed,0,'short',.38),upper=resolve(b,132,'loft',1,seed);assert.equal(upper.shot,'Upper cut');assert.ok(upper.play.initial.vy>0&&upper.play.dz<0);if(upper.runs===6)upperSixes++;
  const low={...b,contactH:.95},cut=resolve(low,132,'loft',1,seed);assert.equal(cut.shot,'Late cut');assert.ok(cut.play.initial.vy<0);
  for(const type of [2,3]){
   const spin=delivery(seed,type,'full',-.12),sweep=resolve(spin,-100,'ground',1,seed),slog=resolve(spin,-100,'loft',1,seed),paddle=resolve(spin,-155,'loft',1,seed);
   assert.equal(sweep.shot,'Sweep');assert.equal(slog.shot,'Slog sweep');assert.equal(paddle.shot,'Paddle sweep');assert.ok(sweep.play.initial.vy<0&&paddle.play.initial.vy<0&&slog.play.initial.vy>0);assert.ok(paddle.exitSpeed<sweep.exitSpeed);assert.notEqual(paddle.runs,6);if(slog.runs===6)slogSixes++;
   for(const name of ['short','yorker'])assert.ok(C.Shot.suitability(delivery(seed,type,name,-.12),-100,'ground').value<.4);
  }
 }
 assert.ok(upperSixes>0&&slogSixes>0);console.log({upperSixes,slogSixes});
 for(const type of [0,1,2,3,4])for(const mode of ['ground','loft']){
  const ball=delivery(8,type,'short'),guide=C.Strokes.guide(ball,mode),spin=C.Strokes.spin(ball);
  assert.equal(guide.find(g=>g.slot===5).label,spin?(mode==='loft'?'SLOG SWEEP':'SWEEP'):'PULL');assert.equal(guide.find(g=>g.slot===6).label,spin?'PADDLE':'GLANCE');
  for(const g of guide.filter(g=>g.slot===3||spin&&g.slot>=5))assert.ok(C.Shot.describe(g.angle,mode,ball).toUpperCase().startsWith(g.label));
 }
});
check('V8 cut and sweep motions retain fixed limbs, attached hands and continuous contact',()=>{
 const strokes=[{angle:135,archetype:'swing',height:.3,lengthName:'full',mode:'loft'},{angle:130,archetype:'swing',height:1.6,lengthName:'short',mode:'loft'},{angle:-100,archetype:'legspin',height:.3,lengthName:'full',mode:'ground'},{angle:-100,archetype:'offspin',height:.3,lengthName:'full',mode:'loft'},{angle:-155,archetype:'legspin',height:.3,lengthName:'full',mode:'loft'}];
 const distance=(a,b)=>R.length(R.sub(a,b));let maximum=0;
 for(const stroke of strokes)for(const effort of [.3,1]){
  const options={...stroke,scoringVersion:8,effort,line:stroke.angle>0?.22:-.12,aiming:true};let previous;
  for(let age=-900;age<=1500;age+=16){const p=R.pose({...options,age});
   for(const [a,b,len]of [['leftShoulder','leftElbow',.31],['leftElbow','leftWrist',.28],['rightShoulder','rightElbow',.31],['rightElbow','rightWrist',.28],['leftHip','leftKnee',.45],['leftKnee','leftAnkle',.43],['rightHip','rightKnee',.45],['rightKnee','rightAnkle',.43],['knob','toe',.83]])assert.ok(Math.abs(distance(p[a],p[b])-len)<1e-7);
   assert.ok(distance(p.leftWrist,R.add(p.grip,R.mul(p.direction,-.025)))<.003);assert.ok(distance(p.rightWrist,R.add(p.grip,R.mul(p.direction,.07)))<.003);assert.ok(p.toe.y>=.015);
   if(previous)for(const j of ['leftElbow','rightElbow','leftKnee','rightKnee']){const d=distance(p[j],previous[j]);maximum=Math.max(maximum,d);assert.ok(d<.19,p.name+' '+age+' '+j+' '+d);}previous=p;
  }
  const impact=R.pose({...options,age:0}),expected={x:options.line+.47,y:options.height,z:options.angle<0?.55:-.04};assert.ok(distance(impact.contactPoint,expected)<.045,impact.name+' meets the delivery at the blade');
  const before=R.pose({...options,age:-.001}),after=R.pose({...options,age:.001});assert.ok(distance(before.toe,after.toe)<.001);assert.ok(distance(before.grip,after.grip)<.001);
 }
 const base={scoringVersion:8,height:.3,lengthName:'full',archetype:'legspin',age:500,effort:1};
 assert.ok(R.pose({...base,angle:-100,mode:'loft'}).toe.y>R.pose({...base,angle:-100,mode:'ground'}).toe.y+.15);console.log({largestJointStepMetres:Number(maximum.toFixed(3))});
});
check('Fielders use fixed limbs and can place both hands at pickups and catches',()=>{
 const distance=(a,b)=>R.length(R.sub(a,b));let worst=0;
 for(const angle of [0,.7,2.3,4.7])for(const height of [.035,.2,.7,1.25,2.2])for(const time of [0,.2,.5]){
  const f={id:height===.035?'keeper':1,x:20,z:-16,moving:false,action:height<=.7?'pickup':'catch',actionBlend:1,jump:Math.max(0,height-1.95),hands:{x:20+Math.sin(angle)*.6,z:-16+Math.cos(angle)*.6,h:height}},p=C.FielderRig.pose(f,time);
  for(let i=0;i<2;i++){for(const [a,b,len]of [[p.hips[i],p.knees[i],.45],[p.knees[i],p.ankles[i],.43],[p.roots[i],p.elbows[i],.31],[p.elbows[i],p.wrists[i],.28]])assert.ok(Math.abs(distance(a,b)-len)<1e-8);const error=distance(p.wrists[i],p.targets[i]);worst=Math.max(worst,error);assert.ok(error<.05,'hand reaches the ball');}
 }
 for(let t=0;t<2;t+=.016){const p=C.FielderRig.pose({id:'bowler',x:.4,z:18,bowling:true,bowlingPhase:t/2,moving:t<1},t);for(const points of [p.ankles,p.knees,p.wrists,p.elbows])for(const p of points)assert.ok(Object.values(p).every(Number.isFinite));}
 console.log({maximumHandTargetErrorMetres:Number(worst.toFixed(3))});
});
check('Near-plane and viewport clipping retain visible ground and stand polygons',()=>{
 const c=V.batting,w=390,h=400,quad=[{x:-20,z:-30,h:0},{x:20,z:-30,h:0},{x:20,z:40,h:0},{x:-20,z:40,h:0}];
 assert.ok(quad.some(p=>V.depth(p,c)<.6));assert.ok(quad.some(p=>V.depth(p,c)>.6));const clipped=V.clipNear(quad,c);assert.ok(clipped.length>=3);for(const p of clipped)assert.ok(V.depth(p,c)>=.6-1e-10);
 for(const y of [0,4,9])for(const z of [-15,-4,0,20]){
  const p=V.polygon(quad.map(p=>({...p,z:p.z+z,h:y})),c,w,h);for(const q of p){assert.ok([q.x,q.y,q.depth,q.unit].every(Number.isFinite));assert.ok(q.x>=-2-1e-8&&q.x<=w+2+1e-8&&q.y>=-2-1e-8&&q.y<=h+2+1e-8);}
 }
 assert.ok(V.polygon(quad,c,w,h).length>=3);assert.ok(V.segment({x:0,z:-15,h:0},{x:0,z:40,h:0},c,w,h));assert.equal(V.segment({x:0,z:-15,h:0},{x:0,z:-10,h:0},c,w,h),null);
});
check('The same mowing stripes cover the ground through pans, behind-square shots and returns',()=>{
 // Independent screen-ray intersection and point-in-polygon test: no rendered
 // image or DOM. A visible point on the grass must be in a clipped ground strip.
 function groundRay(x,y,c,w,h){const dx=c.tx-c.x,dy=c.ty-c.y,dz=c.tz-c.z,flat=Math.hypot(dx,dz),length=Math.hypot(flat,dy),f={x:dx/length,y:dy/length,z:dz/length},r={x:dz/flat,z:-dx/flat},u={x:r.z*f.y,y:flat/length,z:-r.x*f.y},sx=(x-w*.52)/(h*.98),sy=(h*.43-y)/(h*.98),ray={x:f.x+r.x*sx+u.x*sy,y:f.y+u.y*sy,z:f.z+r.z*sx+u.z*sy},t=(.006-c.y)/ray.y;return t>0?{x:c.x+ray.x*t,z:c.z+ray.z*t,h:.006}:null;}
 function contains(poly,p){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
 const quads=Array.from({length:32},(_,i)=>{const x=(i-16)*5.5;return[{x,z:-90,h:.006},{x:x+5.5,z:-90,h:.006},{x:x+5.5,z:90,h:.006},{x,z:90,h:.006}];});let samples=0,crossings=0;
 const results=[-155,-100,-40,20,90,135,165].map((angle,i)=>resolve(delivery(i+3,i%5,'full',angle<0?-.12:.22),angle,'ground',.6,i+3));
 for(const out of results)for(const size of [[320,350],[390,400],[540,450]])for(let time=0;time<=out.play.returnTime+.4;time+=.10){
  const [w,h]=size,c=V.camera(out.play,time,time*1000),polys=quads.map(q=>V.polygon(q,c,w,h));if(quads.some(q=>q.some(p=>V.depth(p,c)<.6)&&q.some(p=>V.depth(p,c)>.6)))crossings++;
  for(let y=24;y<h;y+=41)for(let x=13;x<w;x+=43){const world=groundRay(x,y,c,w,h);if(!world||Math.abs(world.x)>=87.99||Math.abs(world.z)>=89.99||V.depth(world,c)<.6001)continue;assert.ok(polys.some(p=>contains(p,{x,y})),JSON.stringify({time,x,y,world,c}));samples++;}
 }
 assert.ok(samples>10000&&crossings>100);console.log({coveredGroundSamples:samples,camerasCrossingNearPlane:crossings});
});
check('Existing V7 deliveries preserve results, opposition input and ball playback exactly',()=>{
 const old=cp.execFileSync('git',['show','5357fa63b6b1e160c191490c3c6435602e8eae7e:dist/index.html'],{cwd:__dirname,encoding:'utf8'}),box={};vm.createContext(box);vm.runInContext(old.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1]+';globalThis.core=Cricket;',box);const O=box.core,copy=x=>JSON.parse(JSON.stringify(x));
 for(let seed=1;seed<=20;seed++){
  const om=O.Innings.create(seed,O.Squad.team('T20','eng'),O.Squad.team('T20','ind'),'T20',0),d=O.Innings.delivery({...om,balls:(seed%5)*6});assert.equal(d.ball.scoringVersion,7);assert.equal(JSON.stringify(C.Opposition.input(copy(om),copy(d.ball))),JSON.stringify(O.Opposition.input(om,d.ball)));
  for(const mode of ['ground','loft','defend'])for(const angle of [-155,-100,40,135]){const input={angle,mode,error:24,effort:.73},previous=O.Shot.resolve(d.ball,input,om.batters[0],O.Innings.field(om,d.ball),d.rngState),now=C.Shot.resolve(copy(d.ball),input,copy(om.batters[0]),C.Innings.field(copy(om),copy(d.ball)),d.rngState);assert.equal(JSON.stringify(now),JSON.stringify(previous));for(const t of [0,.25,1,3,7])assert.equal(JSON.stringify(C.Fielding.ballAt(now.play,t)),JSON.stringify(O.Fielding.ballAt(previous.play,t)));}
 }
});
console.log(checks+' shot and scene checks passed.');
