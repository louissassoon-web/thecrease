// Seeded paired audit diagnostic, independent of the unchanged balance contract.
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8');vm.runInThisContext(html.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1]);const C=Cricket,teams=C.Squad.teams('T20');
const results={},stats=()=>({n:0,runs:0,wickets:0,contact:0,edges:0,boundaries:0,byes4:0,wides4:0,edge4:0,edgeBowled:0,runOut:0,leaves:0,h:0,legal:0});
function add(t,b,r,input){t.n++;t.runs+=r.runs;t.wickets+=!!r.wicket;t.contact+=!!r.contact;t.edges+=!!r.edge;t.boundaries+=r.runs>=4;t.byes4+=(C.Rules.extras(r).byes>=4);t.wides4+=(C.Rules.extras(r).wides>=5);t.edge4+=r.edge&&r.batRuns>=4?1:0;t.edgeBowled+=r.edge&&r.dismissalKind==='bowled'?1:0;t.runOut+=r.dismissalKind==='runOut';t.leaves+=!input;t.h+=b.contactH;t.legal+=r.legal?1:0;}
const manual={};
for(let k=1;k<=400;k++){
 const c=C.Contest.create(10000+k*313,'T20',teams[k%8],teams[(k+3)%8],'spectator'),base=C.Contest.current(c);
 for(const kind of ['spin','pace']){const index=base.bowlers.findIndex(b=>['legspin','offspin'].includes(b.archetype)===(kind==='spin'));if(index<0)continue;const m=C.BowlingControl.choose(base,index),d=C.BowlingControl.prepare(m,{line:.14});
 for(const [label,age] of [['full',775],['good',890],['short',1000],['drag',1120]]){const b=C.BowlingControl.release(d.ball,age),prepared={...m,rngState:d.rngState},bot=C.Opposition.input(prepared,b,c),r=C.Shot.resolve(b,bot.shot,prepared.batters[prepared.striker],C.Innings.field(prepared,b),bot.rngState),key=kind+'-'+label;add(manual[key]??=stats(),b,r,bot.shot);}}
}
results.manual=manual;const missed={pace:stats(),spin:stats()},edges={pace:stats(),spin:stats()},hoik={};let inside=0,insideCross=0;const sampleInside=[];
for(let k=1;k<=5000;k++){
 const c=C.Contest.create(700000+k*113,'T20',teams[k%8],teams[(k+3)%8],'spectator'),m={...C.Contest.current(c),balls:(k%20)*6},d=C.Innings.delivery(m),b=d.ball,f=C.Innings.field(m,b),batter=m.batters[m.striker],key=C.Strokes.spin(b)?'spin':'pace';
 const left=C.Shot.resolve(b,null,batter,f,d.rngState);add(missed[key],b,left,null);
 const sign=C.Hand.sign(b),x=C.Delivery.at(b,1).x*sign,angle=(x>.35?65:x>.1?44:x<-.15?-44:0)*sign,inp={angle,mode:'ground',error:120,effort:.75,callRuns:true},r=C.Shot.resolve(b,inp,batter,f,d.rngState);if(r.edge)add(edges[key],b,r,inp);
 if(r.edgeType==='Inside edge'&&!b.noBall&&!b.freeHit){inside++;const p=r.play;if(p.origin.z>C.Rules.wickets[0]){let prev=C.Fielding.freeBall(p,0);for(let t=.005;t<Math.min(1,p.event.time);t+=.005){const now=C.Fielding.freeBall(p,t);if(now.z<=C.Rules.wickets[0]){const a=(C.Rules.wickets[0]-prev.z)/(now.z-prev.z),at={x:prev.x+(now.x-prev.x)*a,z:C.Rules.wickets[0],h:prev.h+(now.h-prev.h)*a};if(C.Rules.hits(at)){insideCross++;if(sampleInside.length<3)sampleInside.push({seed:k,at,crossTime:t,eventTime:p.event.time,event:p.event.type,dismissal:r.dismissalKind,runs:r.runs});}break;}prev=now;}}}
 if(k<=1000&&['full','good'].includes(b.lengthName)&&Math.abs(x)>.22&&Math.abs(x)<.85){for(const err of [0,60,120]){const shot={angle:(x>0?-52:44)*sign,mode:'loft',effort:1,error:err},r=C.Shot.resolve(b,shot,batter,f,d.rngState);add(hoik[err]??=stats(),b,r,shot);}}
}
results.left=missed;results.edges=edges;results.hoikWrongSide=hoik;results.inside={n:inside,unresolvedCrossings:insideCross,sample:sampleInside};
results.latePose=[];for(let k=1;k<100;k++){const c=C.Contest.create(k*137,'T20',teams[0],teams[1],'spectator'),m=C.Contest.current(c),d=C.Innings.delivery(m),b=d.ball;if(C.Strokes.spin(b)||b.lengthName!=='full')continue;for(const error of [0,60,120,180]){const shot={angle:44,mode:'ground',effort:.75,error,rawError:error,visualVersion:29},t=C.BallView.impactTime(b,shot),contact=C.BallView.contactTarget(b,shot,t),p=C.BatterRig.pose({hand:b.battingHand,angle:44,mode:'ground',archetype:b.archetype,height:b.contactH,line:contact.x,contactZ:contact.z,contactHeight:contact.h,lengthName:b.lengthName,duration:b.duration,ballT:1,age:0,aiming:true,scoringVersion:b.scoringVersion,effort:.75});results.latePose.push({error,speed:b.speed,contactZ:contact.z,backAnkleZ:p.rightAnkle.z,frontAnkleZ:p.leftAnkle.z,pelvisZ:p.pelvis.z,stumpsZ:C.Rules.wickets[0]});}break;}
fs.writeFileSync(__dirname+'/physics-after.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
