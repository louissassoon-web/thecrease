const assert=require('node:assert/strict'),{C,copy}=require('./check-display-input.cjs');
const teams=C.Squad.teams('T20'),m=C.Innings.create(71317,teams[0],teams[3],'T20',0),d=C.Innings.delivery(m),b={...d.ball,lengthName:'full',length:2.8,contactH:.35,line:.10,swing:0,kick:0,postTime:.1,archetype:'seam',family:'pace',scoringVersion:27},bat=m.batters[0],input={angle:0,mode:'ground',effort:.75,error:0};
const risks=[0,30,60,90,120,160].map(error=>C.Contact.resolve(b,{...input,error},bat,30191).edgeRisk);
assert.ok(risks.every(Number.isFinite));assert.equal(risks[0],risks[1]);for(let i=2;i<risks.length;i++)assert.ok(risks[i]>risks[i-1]);assert.ok(risks[2]-risks[1]<risks[4]-risks[2],'The shoulder must not jump to the late-error plateau');
for(const error of [30,60,90,120,160])assert.equal(C.Contact.resolve(b,{...input,error},bat,30191).edgeRisk,C.Contact.resolve(b,{...input,error:-error},bat,30191).edgeRisk);
console.log('PASS V27 edge exposure has a neutral centre and a gradual, symmetric rise through ordinary and large release errors');
for(const quality of [.35,.7,1])for(const effort of [.65,.85,1]){
 const out={quality,angle:25,shot:'Cover drive',loft:false,edge:false},shot={...input,effort,error:60};
 const old=C.NormalBall.launch(out,{...b,scoringVersion:26},shot,bat,C.RNG.stream(531)),next=C.NormalBall.launch(out,b,shot,bat,C.RNG.stream(531));assert.deepEqual(copy(next),copy(old),'Ground launch physics stays exact at matched contact');
}
for(const power of [.85,1,1.2]){
 const ball={...b,batterProfile:{...b.batterProfile,power:power*75}},shot={...input,mode:'loft',effort:1,error:0},out={quality:1,angle:25,shot:'Cover drive',loft:true,edge:false},a=C.RNG.stream(731),z=C.RNG.stream(731),old=C.NormalBall.launch(out,{...ball,scoringVersion:26},shot,bat,a),next=C.NormalBall.launch(out,ball,shot,bat,z);
 assert.deepEqual(copy(next),copy(old),'A perfect committed loft keeps its launch');assert.equal(a.state,z.state);
 const bad={...out,quality:.6},oldBad=C.NormalBall.launch(bad,{...ball,scoringVersion:26},{...shot,error:80},bat,C.RNG.stream(731)),newBad=C.NormalBall.launch(bad,ball,{...shot,error:80},bat,C.RNG.stream(731));assert.ok(Math.hypot(newBad.vx,newBad.vy)<Math.hypot(oldBad.vx,oldBad.vy));
}
console.log('PASS Ground launches and perfect committed lofts retain their physics; off-centre lofts lose energy without extra random draws');
console.log('2 revision 27 model review groups passed.');
