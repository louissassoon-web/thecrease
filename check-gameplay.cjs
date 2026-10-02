// Rules, live decisions and movement geometry. No DOM or browser inspection.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const html=fs.readFileSync(__dirname+'/dist/index.html','utf8');vm.runInThisContext(html.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1]);
const C=Cricket,{Rules,Running,Innings,Contest,Shot,Squad,CareerSave,Fielding,BatterRig}=C,copy=x=>JSON.parse(JSON.stringify(x));let checks=0;
function check(name,fn){if(process.env.CRICKET_CHECK_FILTER&&!new RegExp(process.env.CRICKET_CHECK_FILTER).test(name))return;try{fn();}catch(e){console.error('FAIL '+name+'\n'+e.message.slice(0,1800));process.exit(1);}checks++;console.log('PASS '+name);}
function match(format='T20'){return Innings.create(17,Squad.team(format,'eng'),Squad.team(format,'ind'),format,0);}
function ball(m=match(),changes={}){const b={...Innings.delivery(m).ball,noBall:false,freeHit:false,battingHand:'right',line:0,releaseX:0,swing:0,kick:0,length:3,lengthName:'full',contactH:.32,...changes};b.preTime=(18.4-b.length)/(b.speed/3.6);b.postTime=b.length/(b.speed/3.6*.79);b.duration=(b.preTime+b.postTime)*2600;b.bounceT=b.preTime/(b.preTime+b.postTime);return b;}
const stroke={angle:35,mode:'ground',error:0,effort:.8};
function resolve(b,input=stroke,m=match(),seed=71){return Shot.resolve(b,input,m.batters[m.striker],Innings.field(m,b),seed);}
function scored(m,amount,changes={}){const b=ball(m),r=Rules.score({rulesVersion:10,contact:true,noBall:false,wide:false,wicket:false,quality:.9,rngState:m.rngState,title:'Runs',detail:'Scenario',timing:'Good timing',play:{event:{type:'pickup',time:1}},...changes},amount);return Innings.apply(m,b,r);}
function stateFor(c,phase='ready'){const league=C.Season.create(c.seed,c.format,c.playerId);return{league,contest:c,match:Contest.current(c),phase,pending:null,live:null,shot:null,botInput:null,elapsed:0,resultAge:0,watchUntil:0,recorded:false};}
function restore(s){return CareerSave.validate(copy(CareerSave.pack({schema:5,active:s.contest.format,sessions:{[s.contest.format]:s}}))).sessions[s.contest.format];}
check('LBW requires legal delivery, pad first, eligible pitch and impact, and a projected hit',()=>{
 const b=ball(match('TEST')),impact={x:0,z:.6,h:.3};assert.equal(Rules.lbw(b,impact,true).out,true);
 for(const extra of [{noBall:true},{freeHit:true}])assert.equal(Rules.lbw({...b,...extra},impact,true).out,false);
 assert.equal(Rules.lbw(b,impact,true,true).out,false);
 assert.equal(Rules.lbw({...b,releaseX:-.6,line:-.3,kick:.3},impact,true).out,false);
 assert.equal(Rules.lbw(b,{...impact,x:.3},true).out,false);assert.equal(Rules.lbw(b,{...impact,x:.3},false).out,true);
 assert.equal(Rules.lbw(b,{...impact,x:-.3},false).out,false);assert.equal(Rules.lbw({...b,contactH:1.5},impact,true).out,false);
 const r=resolve(b,{...stroke,error:400});assert.equal(r.dismissalKind,'lbw');assert.equal(r.play.event.type,'lbw');assert.equal(r.contact,false);assert.equal(r.runs,0);
 const left={...b,battingHand:'left',line:-b.line,releaseX:-b.releaseX};assert.equal(Rules.lbw(left,{...impact,x:-.3},true).out,false);assert.equal(resolve(left,{...stroke,angle:-35,error:400}).dismissalKind,'lbw');
});
check('No-balls, byes, leg byes and free hits balance batter and bowling figures',()=>{
 let m=match();m=scored(m,4,{noBall:true,play:{event:{type:'four',time:4}}});assert.equal(m.runs,5);assert.equal(m.batters[0].runs,4);assert.equal(m.batters[0].fours,1);assert.equal(m.batters[0].balls,1);assert.equal(m.balls,0);assert.equal(m.bowlers[0].runs,5);assert.equal(m.freeHit,true);assert.equal(m.striker,0);
 m=scored(m,0,{contact:false,wide:true});assert.equal(m.freeHit,true);assert.equal(m.balls,0);assert.equal(m.batters[0].balls,1);
 m=scored(m,2,{contact:false,extraKind:'legByes'});assert.equal(m.runs,8);assert.equal(m.extrasDetail.legByes,2);assert.equal(m.bowlers[0].runs,6);assert.equal(m.balls,1);assert.equal(m.freeHit,false);
 m=scored(m,1,{contact:false,extraKind:'byes',noBall:true});assert.equal(m.runs,10);assert.equal(m.bowlers[0].runs,7);assert.equal(m.striker,1);assert.equal(m.balls,1);assert.equal(m.batters[0].balls,3);
 assert.equal(m.batters.reduce((n,b)=>n+b.runs,0)+m.extras,m.runs);assert.equal(m.bowlers.reduce((n,b)=>n+b.runs,0)+m.extrasDetail.byes+m.extrasDetail.legByes,m.runs);
 assert.equal(scored(match('TEST'),0,{noBall:true}).freeHit,false);
 const b=ball(match(),{noBall:true,runsNeeded:1}),r=resolve(b);assert.equal(r.runs,1);assert.equal(r.batRuns,0);assert.equal(r.wicket,false);assert.equal(r.play.event.type,'penalty');
});
check('Run-outs retain completed runs, dismiss the correct batter and do not credit the bowler',()=>{
 let m=match();for(let i=0;i<5;i++)m=scored(m,0);m=scored(m,1,{wicket:true,dismissalKind:'runOut',runOutRunner:1,endSwap:true,fielder:'cover'});
 assert.equal(m.runs,1);assert.equal(m.wickets,1);assert.equal(m.batters[0].runs,1);assert.match(m.batters[1].dismissal,/run out/);assert.equal(m.bowlers[0].wickets,0);assert.equal(m.striker,0);assert.equal(m.nonStriker,2);assert.equal(m.balls,6);
 const nb=scored(match(),0,{wicket:true,dismissalKind:'runOut',runOutRunner:0,endSwap:false,noBall:true});assert.equal(nb.runs,1);assert.equal(nb.balls,0);assert.equal(nb.wickets,1);assert.equal(nb.striker,2);assert.equal(nb.bowlers[0].wickets,0);
});
function gap(version=12){const m=match();for(let seed=1;seed<120;seed++){const b=ball(m,{scoringVersion:version,line:.16,releaseX:.4,lengthName:'good',contactH:.75,length:5.4}),r=resolve(b,{...stroke,angle:132,effort:.55},m,seed);if(r.play.running&&r.completedRuns>=1&&r.play.throw.breakTime>4.1)return{m,b,r};}throw Error('No running scenario');}
check('Legacy Run and Hold preserve the saved crease race and struck trajectory',()=>{
 const {r}=gap(11),before=JSON.stringify(r.play.segments),hold=Running.command(r,'hold',.05);assert.equal(hold.completedRuns,0);assert.equal(hold.wicket,false);assert.equal(hold.play.running.legs.length,0);
 const take=Running.command(hold,'run',.70),push=Running.command(take,'run',.90);assert.equal(JSON.stringify(push.play.segments),before);assert.equal(push.play.throw.landing,r.play.throw.landing);
 const risk=push;assert.equal(risk.wicket,true);assert.equal(risk.dismissalKind,'runOut');assert.equal(risk.decisionTime,risk.play.throw.breakTime);
 const positions=Running.frame(risk,risk.decisionTime),runner=positions[risk.runOutRunner];assert.equal(runner.grounded,false);assert.ok(runner.tip.z>Rules.crease[0]&&runner.tip.z<Rules.crease[1]);
 const same=Running.command(risk,'hold',risk.decisionTime+.1);assert.equal(same,risk);const held=Running.command(risk,'hold',1.0);assert.equal(held.play.running.legs.length,1);assert.equal(held.wicket,false);
});
check('Throws have continuous flight, a receiver, a backup and a shared world-space frame',()=>{
 const {r}=gap(),p=r.play,t=p.throw;assert.notEqual(t.receiver,p.event.id);assert.notEqual(t.backup,t.receiver);assert.notEqual(t.backup,p.event.id);
 const a=Fielding.ballAt(p,t.release-1e-5),b=Fielding.ballAt(p,t.release+1e-5),c=Fielding.ballAt(p,t.landing-1e-5),d=Fielding.ballAt(p,t.landing+1e-5);assert.ok(Math.hypot(a.x-b.x,a.z-b.z,a.h-b.h)<.01);assert.ok(Math.hypot(c.x-d.x,c.z-d.z,c.h-d.h)<.01);
 const frame=Fielding.frame(r,t.landing-.1,[]);assert.deepEqual(frame.ball,Fielding.ballAt(p,t.landing-.1));assert.equal(frame.fielders.length,11);assert.ok(frame.fielders.some(f=>f.action==='backup'));assert.ok(frame.fielders.filter(f=>{const start=[...p.starts,p.keeper].find(s=>s.id===f.id);return Math.hypot(f.x-start.x,f.z-start.z)>.1;}).length>=3);
 for(const f of frame.fielders){const pose=C.FielderRig.pose(f,t.landing-.1);for(const key of ['head','pelvis'])for(const value of Object.values(pose[key]))assert.ok(Number.isFinite(value));}
 const collector=Fielding.frame(r,t.release,[]).fielders.find(f=>f.id===p.event.id),wrist=C.FielderRig.pose(collector,t.release).wrists[1],release=Fielding.ballAt(p,t.release);assert.ok(Math.hypot(collector.x+wrist.x-release.x,collector.z+wrist.z-release.z,wrist.y-release.h)<.01);
 const end=p.running.legs[0].end;for(const runner of [0,1]){const before=Running.position(p.running.legs,end-1e-5,runner),after=Running.position(p.running.legs,end+1e-5,runner);assert.ok(Math.abs(before.z-after.z)<.001);for(const dt of [-.04,0,.1]){const f={...Running.position(p.running.legs,end+dt,runner),batting:true,teamVersion:10},R=BatterRig,grip=C.FielderRig.pose(f,end+dt).wrists[1],target=R.v(f.tip.x-f.x,.025,f.tip.z-f.z),toe=R.add(grip,R.mul(R.unit(R.sub(target,grip)),.83));assert.ok(R.length(R.sub(toe,target))<.005);}}
});
check('Left-handed shots and articulated contact geometry mirror consistently',()=>{
 const m=match(),right=ball(m,{line:.24}),left={...right,battingHand:'left',line:-right.line,releaseX:-right.releaseX,swing:-right.swing,kick:-right.kick,savedField:right.savedField?.map(f=>({...f,a:-f.a}))},field=Innings.field(m,right),a=Shot.resolve(right,stroke,m.batters[0],field,41),b=Shot.resolve(left,{...stroke,angle:-stroke.angle},m.batters[0],field.map(f=>({...f,a:-f.a})),41);assert.equal(a.shot,b.shot);assert.equal(a.quality,b.quality);assert.equal(a.play.initial.speed,b.play.initial.speed);assert.ok(Math.abs(a.play.dx+b.play.dx)<1e-12);assert.equal(a.runs,b.runs);
 for(const angle of [-145,-93,0,40,94,135])for(const age of [-500,-90,0,150,450]){const opts={scoringVersion:10,angle,age,mode:'ground',line:.1,height:.6,lengthName:'good',effort:.7},r=BatterRig.pose(opts),l=BatterRig.pose({...opts,hand:'left',angle:-angle,line:-.1});for(const key of ['head','toe','leftAnkle','rightAnkle','leftWrist','rightWrist'])assert.deepEqual(l[key],{...r[key],x:-r[key].x});assert.ok(Math.abs(BatterRig.length(BatterRig.sub(r.toe,r.knob))-.83)<1e-8);for(const [a,b,len]of [['leftHip','leftKnee',.45],['leftKnee','leftAnkle',.43],['rightShoulder','rightElbow',.31],['rightElbow','rightWrist',.28]])assert.ok(Math.abs(BatterRig.length(BatterRig.sub(r[a],r[b]))-len)<1e-7);}
 assert.equal(C.Hand.of({name:'Ben Duckett'}),'left');assert.equal(C.Hand.of({name:'Phil Salt'}),'right');assert.equal(C.Hand.of({name:'Prabath Jayasuriya'}),'right');assert.equal(C.Hand.of({name:'Jayden Seales'}),'left');
});
check('Missed balls require a reachable keeper and permit genuine byes and leg byes',()=>{
 const m=match('TEST');let byes=0,legByes=0;for(const x of [-.6,-.4,-.2,0,.2,.4,.6,1])for(const height of [.12,.3,.7,1.8]){const b=ball(m,{line:x,lengthName:height>1.5?'short':'full',contactH:height}),r=resolve(b,{...stroke,error:400},m);byes+=r.extrasDetail.byes;legByes+=r.extrasDetail.legByes;if(['pickup','take'].includes(r.play.event.type)){const e=r.play.event,f=[...r.play.starts,r.play.keeper].find(f=>f.id===e.id);if(r.play.motionVersion>=23){const actual=Fielding.frame(r,e.time).fielders.find(f=>f.id===e.id);assert.ok(Math.hypot(actual.x-e.x,actual.z-e.z)<=.601);}else assert.ok(Math.hypot(f.x-e.x,f.z-e.z)<=C.BallFlight.run(f,e.time)+.601);}}
 assert.ok(byes>0);assert.ok(legByes>0);
 const b=ball(m,{line:-.34}),r=resolve(b,null,m);if(r.padEvidence&&!r.wicket)assert.equal(r.extrasDetail.legByes,0);
});
check('A no-ball or free hit cannot become a caught, bowled or LBW dismissal',()=>{
 const m=match(),b=ball(m),input={...stroke,angle:35,mode:'loft',effort:.3,error:20},open=Shot.resolve(b,input,m.batters[0],[{a:-150,r:.9,n:'fine leg'}],41),point=C.NormalBall.at(open.play,open.play.bounces[0].time-.08),field=[{n:'cover',a:Math.atan2(point.x,point.z)*180/Math.PI,r:Math.hypot(point.x,point.z)/64}],caught=Shot.resolve(b,input,m.batters[0],field,41);assert.ok(Math.hypot(point.x,point.z)<64,'Catch fixture must land inside the rope');assert.equal(caught.dismissalKind,'caught');
 for(const change of [{noBall:true},{freeHit:true}]){const r=Shot.resolve({...b,...change},input,m.batters[0],field,41);assert.equal(r.wicket,false);assert.equal(r.play.event.type,'take');}
 for(const flag of ['noBall','freeHit']){const b=ball(m,{[flag]:true}),r=resolve(b,{...stroke,error:400},m);assert.equal(r.wicket,false);}
});
check('Live runs and extras survive save/resume without advancing or doubling the score',()=>{
 let c=C.Season.begin(C.Season.create(19,'TEST','eng')),s=stateFor(c),d=Innings.delivery(s.match);s.pending=d.ball;s.contest=Contest.withPrepared(c,d.rngState);s.match=Contest.current(s.contest);s.shot={...stroke,error:350};const r=resolve(s.pending,s.shot,s.match,s.match.rngState);s.live={...r,batter:s.match.striker,nonStriker:s.match.nonStriker,over:0,ball:1};s.phase='inPlay';s.elapsed=d.ball.duration+350;s.resultAge=20;const restored=restore(s);assert.deepEqual(restored.live,copy(s.live));assert.equal(restored.match.runs,0);
 for(const state of [s,restored]){state.contest=Contest.apply(state.contest,state.pending,state.live);state.match=Contest.current(state.contest);state.live=null;state.phase='result';state.resultAge=30000;}
 assert.deepEqual(copy(s.match),copy(restored.match));assert.deepEqual(Innings.delivery(s.match),Innings.delivery(restore(restored).match));
 const {r:gapResult}=gap(),a=Running.command(gapResult,'hold',.1),b=Running.command(copy(a),'run',.4);assert.deepEqual(copy(b),copy(Running.command(a,'run',.4)));
});
check('Crowd and wicket sounds wait for the crease decision and do not repeat after resuming',()=>{
 const ui=html.match(/<script id="cricket-ui">([\s\S]*?)<\/script>/)[1],start=ui.indexOf('  function tick(){if(paused||simulating)'),body=ui.slice(start,ui.indexOf('  return{unlock,play,toggle,tick,label',start)),make=new Function('h',"let pending=null,result=null,previousTime=null,pitchHeard=false,eventHeard=false,returnHeard=false,celebrationHeard=false;const {state,paused,simulating,resultPhase,lastResult,playback,play,persist}=h;const clamp=Cricket.clamp;"+body+'return tick;');
 let r=Running.command(Running.command(Running.command(gap(11).r,'hold',.05),'run',.7),'run',.9);r.celebrations=[{kind:'wicket'}];const heard=[],state={phase:'inPlay',pending:{duration:1500,bounceT:.5},elapsed:1600,resultAge:0},host={state,paused:false,simulating:false,resultPhase:()=>true,lastResult:()=>r,playback:()=>state.resultAge/1000,play:kind=>heard.push(kind),persist(){}},tick=make(host);
 tick();state.resultAge=(r.play.event.time+.02)*1000;tick();assert.ok(!heard.some(s=>s.startsWith('crowd')));state.resultAge=(r.decisionTime+.02)*1000;tick();assert.equal(heard.filter(s=>s==='stumps').length,1);assert.equal(heard.filter(s=>s==='crowd-wicket').length,1);make(host)();assert.equal(heard.filter(s=>s==='crowd-wicket').length,1);
});
check('The opposition reads either batting hand and its running intent is seeded',()=>{
 const m=match(),right=ball(m,{line:.2}),left={...right,battingHand:'left',line:-right.line,releaseX:-right.releaseX,swing:-right.swing,kick:-right.kick,savedField:right.savedField?.map(f=>({...f,a:-f.a}))};for(let seed=1;seed<40;seed++){const a=C.Opposition.input({...m,rngState:seed},right),b=C.Opposition.input({...m,rngState:seed},left);assert.equal(a.rngState,b.rngState);if(a.shot){assert.equal(a.shot.angle,-b.shot.angle);assert.equal(a.shot.pushRun,b.shot.pushRun);}}
 const a=C.Opposition.quick(711,'T20',Squad.team('T20','eng'),Squad.team('T20','ind')),b=C.Opposition.quick(711,'T20',Squad.team('T20','eng'),Squad.team('T20','ind'));assert.deepEqual(a,b);assert.equal(a.innings.length,2);for(const m of a.innings){assert.ok(m.balls<=120);assert.equal(m.batters.reduce((n,b)=>n+b.runs,0)+m.extras,m.runs);assert.equal(m.bowlers.reduce((n,b)=>n+b.runs,0)+m.extrasDetail.byes+m.extrasDetail.legByes,m.runs);}
});
check('V9 pending deliveries keep exact outcomes and committed scorecards',()=>{
 const old=cp.execFileSync('git',['show','da34ac38118c3c536ab1a8fc742f4fdbd0d5bca8:dist/index.html'],{cwd:__dirname,encoding:'utf8'}),box={};vm.createContext(box);vm.runInContext(old.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1]+';globalThis.C=Cricket;',box);const O=box.C;
 for(let seed=1;seed<=8;seed++){const m=O.Innings.create(seed,O.Squad.team('T20','eng'),O.Squad.team('T20','ind'),'T20',0),d=O.Innings.delivery(m);for(const input of [null,stroke,{...stroke,angle:-100,mode:'loft',error:110}]){const expected=O.Shot.resolve(d.ball,input,m.batters[0],O.Innings.field(m,d.ball),d.rngState),actual=Shot.resolve(copy(d.ball),input,copy(m.batters[0]),Innings.field(copy(m),copy(d.ball)),d.rngState);assert.equal(JSON.stringify(actual),JSON.stringify(expected));assert.equal(JSON.stringify(Innings.apply(copy(m),copy(d.ball),actual)),JSON.stringify(O.Innings.apply(m,d.ball,expected)));}}
});
check('Controller keeps the ball live, blocks the next delivery and commits once at the outcome',()=>{
 let ui=html.match(/<script id="cricket-ui">([\s\S]*?)<\/script>/)[1];ui=ui.slice(ui.search(/ const \{[^\n]+\}=Cricket;/),ui.indexOf(' // Perspective camera'));ui=ui.replace(/^ const \$=.*$/m,'').replace(/^ const backdrop=.*$/m,'');const from=ui.indexOf(' let firstVisit='),to=ui.indexOf(' const lastResult=',from);ui=ui.slice(0,from)+ui.slice(to);
 for(const [name,body]of [['persist',''],['renderUI',''],['renderRunning',''],['openDialog','paused=true;'],['closeDialogs','paused=false;']]){const start=ui.indexOf(' function '+name+'('),brace=ui.indexOf('{',start);let end=brace,depth=0;do{if(ui[end]==='{')depth++;if(ui[end]==='}')depth--;end++;}while(depth);ui=ui.slice(0,start)+ui.slice(start,brace)+'{'+body+'}\n'+ui.slice(end);}
 const box={shotWriteDeferred:false,Cricket,window:{},Sound:{play(){},unlock(){},suspend(){}},performance,crypto:require('node:crypto').webcrypto};vm.createContext(box);vm.runInContext(ui+';function playback(r=lastResult()){return Cricket.Fielding.playback(r.play,state.resultAge||0);}globalThis.u={set(s){state=s;app={schema:5,active:s.contest.format,sessions:{[s.contest.format]:s}};paused=false;},get(){return state;},nextBall,releasePrepared,finishBall,commitLive};',box);
 let c=C.Season.begin(C.Season.create(37,'T20','eng'));c.playerId=Contest.current(c).teamId;const u=box.u;u.set(stateFor(c));u.nextBall();u.releasePrepared();const s=u.get();s.shot=stroke;s.elapsed=s.pending.duration+100;u.finishBall();assert.equal(s.phase,'inPlay');assert.equal(s.match.history.length,0);const pending=s.pending;u.nextBall();assert.equal(s.pending,pending);const runs=s.live.runs;u.commitLive();assert.equal(s.match.history.length,1);assert.equal(s.match.runs,runs);u.commitLive();assert.equal(s.match.history.length,1);
});
console.log(checks+' gameplay checks passed.');
