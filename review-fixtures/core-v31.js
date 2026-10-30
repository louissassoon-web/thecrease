
'use strict';
// Pure simulation modules. Rendering, storage, time and pointer events live below.
// A future bowling controller can produce Delivery-compatible inputs for Match.
globalThis.Cricket = (() => {
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v)), lerp=(a,b,t)=>a+(b-a)*t;
 const RNG={next(state){let s=(state+0x6D2B79F5)>>>0,t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return {state:s,value:((t^(t>>>14))>>>0)/4294967296};},stream(state){return{state:state>>>0,next(){const r=RNG.next(this.state);this.state=r.state;return r.value;}};}};
 const BOWLERS=[
  {id:'swing',name:'Elliot Vale',family:'swing',style:'Right-arm swing',short:'SWING',speed:[128,142],colour:'#ffc383',arm:'right',rating:66},
  {id:'seam',name:'Rory Finch',family:'pace',style:'Right-arm pace · seam',short:'PACE',speed:[118,133],colour:'#a8dce1',arm:'right',rating:66},
  {id:'legspin',name:'Arun Mehta',family:'wrist-spin',style:'Wrist spin · leg-spin',short:'WRIST SPIN',speed:[74,89],colour:'#e4b6ee',arm:'right',rating:66},
  {id:'offspin',name:'Dev Lawson',family:'finger-spin',style:'Finger spin · off-spin',short:'FINGER SPIN',speed:[79,94],colour:'#efd293',arm:'right',rating:66},
  {id:'leftpace',name:'Noah Farrow',family:'pace',style:'Left-arm pace',short:'PACE',speed:[127,143],colour:'#a5cceb',arm:'left',rating:66}
 ];
 const FIELDS=[
  [{a:155,r:.24,n:'slip'},{a:65,r:.48,n:'point'},{a:35,r:.58,n:'cover'},{a:12,r:.66,n:'mid-off'},{a:-19,r:.61,n:'mid-on'},{a:-68,r:.49,n:'midwicket'},{a:-122,r:.89,n:'fine leg'},{a:91,r:.91,n:'deep point'},{a:-43,r:.93,n:'deep midwicket'}],
  [{a:148,r:.24,n:'slip'},{a:72,r:.52,n:'point'},{a:40,r:.59,n:'cover'},{a:12,r:.66,n:'mid-off'},{a:-16,r:.60,n:'mid-on'},{a:-72,r:.89,n:'deep square leg'},{a:-128,r:.91,n:'fine leg'},{a:103,r:.86,n:'third man'},{a:-46,r:.52,n:'midwicket'}],
  [{a:68,r:.50,n:'point'},{a:35,r:.52,n:'cover'},{a:13,r:.91,n:'long-off'},{a:-13,r:.93,n:'long-on'},{a:-52,r:.90,n:'deep midwicket'},{a:-93,r:.89,n:'deep square leg'},{a:116,r:.55,n:'short third'},{a:-140,r:.42,n:'short fine leg'},{a:-35,r:.40,n:'midwicket'}]
 ];
 FIELDS.push(FIELDS[2].map(f=>({...f,a:f.a+(f.a>0?4:-3)})),FIELDS[0].map(f=>({...f,a:f.a+6})));
 const Rotation={schedule(overs){return overs===3?[0,1,2]:overs===5?[0,1,2,3,4]:overs===10?[0,1,4,0,2,3,4,2,3,1]:[0,1,0,4,1,4,2,3,2,3,2,4,3,2,3,4,0,1,0,1];},bowler(over,overs=3){return this.schedule(overs)[over];}};
 // Input is independent of the canvas and match clock, so a lifted pointer
 // can be captured before the same tick adjudicates the delivery.
 const Gesture={
  begin(id,x,y,width=390,version=6,loft=false){return{id,sx:x,sy:y,x,y,angle:0,distance:0,mode:'defend',loftAt:clamp(width*(version>=15?.36:.245),version>=15?122:78,version>=15?162:106),...(version>=15?{inputVersion:Math.min(version,18),defendAt:28}:{}),...(version>=16?{loftIntent:version===16&&!!loft}:{}),...(version>=17?{peak:{x,y,d:0},backswing:false,pullAt:version>=18?clamp(width*.035,12,18):clamp(width*.055,18,24)}:{})};},
  move(g,id,x,y){if(!g||id!==g.id)return g;
   if(g.inputVersion>=18){
    const dx=x-g.sx,dy=y-g.sy,d=Math.hypot(dx,dy);let peak=g.peak,backswing=g.backswing;
    // Recognise the reversal before the thumb crosses its starting point.
    // Larger pull-backs and diagonal follow-throughs use the same grammar.
    if(!backswing&&peak.d>=g.pullAt){
     const rx=x-peak.x,ry=y-peak.y,travel=Math.hypot(rx,ry),back=-(rx*(peak.x-g.sx)+ry*(peak.y-g.sy))/peak.d;
     backswing=back>=clamp(peak.d*.35,20,42)&&back>=travel*.42;
    }
    if(!backswing&&d>peak.d)peak={x,y,d};
    const swingX=x-(backswing?peak.x:g.sx),swingY=y-(backswing?peak.y:g.sy),distance=Math.hypot(swingX,swingY);
    return{...g,x,y,peak,backswing,distance,angle:distance>4?Math.atan2(swingX,-swingY)*180/Math.PI:g.angle,mode:backswing?'loft':distance<g.defendAt?'defend':'ground'};
   }
   if(g.inputVersion>=17){
    const dx=x-g.sx,dy=y-g.sy,d=Math.hypot(dx,dy);let peak=g.peak,backswing=g.backswing;
    // A small first stroke followed by a clear reversal THROUGH the start.
    // Long drives, natural thumb curves and corrections cannot arm loft.
    if(!backswing&&peak.d>=g.pullAt&&peak.d<=g.pullAt*2.8){
     const px=peak.x-g.sx,py=peak.y-g.sy,rx=x-peak.x,ry=y-peak.y;
     const forward=-(rx*px+ry*py)/peak.d,across=Math.abs(rx*py-ry*px)/peak.d;
     backswing=forward>=peak.d+10&&across<=Math.max(10,peak.d*.4);
    }
    if(!backswing&&d>peak.d)peak={x,y,d};
    const ox=backswing?peak.x:g.sx,oy=backswing?peak.y:g.sy,swingX=x-ox,swingY=y-oy,distance=Math.hypot(swingX,swingY);
    return{...g,x,y,peak,backswing,distance,angle:distance>4?Math.atan2(swingX,-swingY)*180/Math.PI:g.angle,mode:distance<g.defendAt?'defend':backswing?'loft':'ground'};
   }
   const dx=x-g.sx,dy=y-g.sy,d=Math.hypot(dx,dy);return{...g,x,y,distance:d,angle:d>4?Math.atan2(dx,-dy)*180/Math.PI:g.angle,mode:d<(g.defendAt??16)?'defend':g.inputVersion>=16?(g.loftIntent?'loft':'ground'):d<g.loftAt?'ground':'loft'};
  },
  effort(g){return g.mode==='defend'?0:g.mode==='ground'||g.inputVersion>=16?lerp(.25,1,clamp((g.distance-(g.defendAt??16))/(g.loftAt-(g.defendAt??16)),0,1)):lerp(.82,1,clamp((g.distance-g.loftAt)/(g.loftAt*.6),0,1));},
  release(g,id,x,y,elapsed,duration,scoringVersion=6){if(!g||id!==g.id)return null;const moved=this.move(g,id,x,y),shot={angle:moved.angle,mode:moved.mode,error:elapsed-duration};if(scoringVersion>=7)shot.effort=this.effort(moved);return shot;}
 };
 const Delivery={
  create(seed,over,maxOvers=3){
   const rng=RNG.stream(seed),bowlerIndex=Rotation.bowler(over,maxOvers),bowler=BOWLERS[bowlerIndex],type=bowler.id,spin=bowler.family.includes('spin'),v=rng.next(),vr=rng.next();
   const lengthName=spin?(v<.28?'full':v<.72?'good':'short'):(v<.16?'yorker':v<.40?'full':v<.73?'good':'short');
   const bands=spin?{yorker:[.18,.65],full:[2.0,3.4],good:[4.7,6.1],short:[7.8,9.3]}:{yorker:[.18,.65],full:[2.0,3.4],good:[5.1,6.5],short:[8.3,10.0]};
   const length=lerp(...bands[lengthName],rng.next());
   const variation=type==='swing'?(vr<.5?'Outswinger':'Inswinger'):type==='legspin'?(vr<.23?'Googly':vr<.37?'Top-spinner':'Leg-break'):type==='offspin'?(vr<.22?'Arm ball':'Off-break'):vr<.2?'Slower ball':type==='seam'?'Seam-up':'Angled seam-up';
   let speed=Math.round(lerp(...bowler.speed,rng.next()));if(variation==='Slower ball')speed-=17;
   const wide=rng.next()<.035,line=wide?(rng.next()<.75?1.14:-1.14):lerp(-.38,.45,rng.next());
   const swing=type==='swing'?(variation==='Outswinger'?1:-1)*lerp(.17,.31,rng.next()):0;
   const kick=type==='seam'||type==='leftpace'?(rng.next()<.5?-1:1)*lerp(.08,.19,rng.next()):type==='legspin'?(variation==='Googly'?-1:variation==='Top-spinner'?0:1)*lerp(.24,.43,rng.next()):type==='offspin'?(variation==='Arm ball'?0:-lerp(.20,.37,rng.next())):0;
   const heightBands=spin?{yorker:[.055,.12],full:[.23,.40],good:[.65,.85],short:[1.25,1.52]}:{yorker:[.055,.12],full:[.25,.44],good:[.78,1.04],short:[1.55,1.88]};
   const fraction=(length-bands[lengthName][0])/(bands[lengthName][1]-bands[lengthName][0]),contactH=lerp(...heightBands[lengthName],fraction),releaseH=spin?1.96:2.14;
   const preTime=(18.4-length)/(speed/3.6),postTime=length/(speed/3.6*(spin?.70:.79)),physicalTime=preTime+postTime;
   const ball={scoringVersion:4,trajectoryVersion:4,bowler:bowlerIndex,archetype:type,family:bowler.family,speed,variation,lengthName,length,line,releaseX:type==='leftpace'?-.60:spin?.54:.43,swing,kick,contactH,releaseH,preTime,postTime,duration:physicalTime*2600,bounceT:preTime/physicalTime};
   return{ball,rngState:rng.state};
  },
  at(ball,t){const q=clamp(t,0,1.14),b=ball.bounceT;let height;
   if(ball.trajectoryVersion===4){
    let z;if(q<=b){const p=q/b,seconds=p*ball.preTime,vy=(.035-ball.releaseH+4.905*ball.preTime*ball.preTime)/ball.preTime;height=ball.releaseH+vy*seconds-4.905*seconds*seconds;z=18.4-(18.4-ball.length)*p;}
    else{const p=(q-b)/(1-b),seconds=p*ball.postTime,vy=(ball.contactH-.035+4.905*ball.postTime*ball.postTime)/ball.postTime;height=.035+vy*seconds-4.905*seconds*seconds;z=ball.length*(1-p);}
    const progress=(18.4-z)/18.4,after=Math.max(0,(ball.length-z)/ball.length);
    return{x:lerp(ball.releaseX,ball.line,progress)+ball.swing*progress*progress+ball.kick*after,z,h:Math.max(.035,height)};
   }
   if(q<=b){const p=q/b;height=2.05*(1-p)+.30*Math.sin(Math.PI*p);}else{const p=(q-b)/(1-b);height=Math.max(0,ball.contactH*p+.09*Math.sin(Math.PI*p));}
   const bend=ball.swing*q*q;const after=clamp((q-b)/(1-b),0,1.5);
   return{x:lerp(ball.releaseX,ball.line,q)+bend+ball.kick*after,z:18.4*(1-q),h:height};
  }
 };
 const LegacyShot={
  describe(angle,mode,ball){if(mode==='defend')return 'Defence';const a=Math.abs(angle);if(a<24)return 'Straight drive';if(a<63)return angle>0?'Cover drive':'On drive';if(a<116)return angle>0?'Cut':'Pull';return angle>0?'Late cut':'Glance';},
  suitability(ball,angle,mode){if(mode==='defend')return{value:.98,reason:'Controlled defence'};const a=Math.abs(angle),x=Delivery.at(ball,1).x;let value=1,reason='Good shot choice';
   if((ball.lengthName==='full'||ball.lengthName==='yorker')&&a>80){value=.42;reason='Too full for that square shot';}
   else if(ball.lengthName==='short'&&a<42){value=.43;reason='Too short to drive';}
   else if(ball.lengthName==='good'&&a>130){value=.64;reason='Little room for that late shot';}
   if(x>.16&&angle< -30){value=Math.min(value,.48);reason='Across the line outside off';}
   if(x<-.19&&angle>35){value=Math.min(value,.46);reason='Too far down leg for that shot';}
   if(Math.abs(x)>.85){value*=.65;reason='Reaching for a wide ball';}
   return{value,reason};
  },
  resolve(ball,input,batter,field,seed){const rng=RNG.stream(seed),roll=[rng.next(),rng.next(),rng.next(),rng.next()],pos=Delivery.at(ball,1),stumps=Delivery.at(ball,1.035),onStumps=Math.abs(stumps.x)<.15&&stumps.h<.75;
   const out={runs:0,wicket:false,wide:false,contact:false,angle:0,distance:0,loft:false,shot:'Leave',title:'Dot ball',detail:'Safely through to the keeper',timing:'Left alone',error:null,quality:0,rngState:rng.state};
   const missed=()=>{if(onStumps){Object.assign(out,{wicket:true,title:'Bowled',detail:input?'Missed it - the ball hit the stumps':'Left a ball that hit the stumps'});}else if(Math.abs(pos.x)>.96){Object.assign(out,{runs:1,wide:true,title:'Wide',detail:'One extra run. This ball will be rebowled.'});}else{out.detail=input?'Beaten - no contact':'Safely through to the keeper';}return out;};
   if(!input)return missed();
   const error=input.error,ae=Math.abs(error),window=215*batter.attributes.timing*(batter.attributes.matchups[ball.archetype]||1);
   out.error=error;out.angle=input.angle;out.loft=input.mode==='loft';out.shot=(ball.scoringVersion>=4?Shot:ball.scoringVersion===3?ShotV3:batter.rulesVersion===1?LegacyShot:ShotV3).describe(input.angle,input.mode,ball);
   out.timing=ae<=36?'Perfect timing':ae<=80?'Good timing':error<0?'Early':'Late';
   if(ae>window||Math.abs(pos.x)>1.37)return missed();
   const choice=(ball.scoringVersion>=4?Shot:ball.scoringVersion===3?ShotV3:batter.rulesVersion===1?LegacyShot:ShotV3).suitability(ball,input.angle,input.mode),timeQ=clamp(1-(ae/window)*.84,0,1),q=timeQ*choice.value;
   out.contact=true;out.quality=q;out.detail=choice.reason;
   if(q<.36){out.angle=pos.x>=0?164:-156;out.loft=true;out.distance=9+roll[0]*12;
    if(roll[1]<.68){out.wicket=true;out.title='Caught behind';out.detail=(q<.3?choice.reason:out.timing)+' - edged to the keeper';out.fielder='keeper';}
    else{out.runs=roll[2]>.55?1:0;out.title=out.runs?'1 run':'Dot ball';out.detail='An edge falls short';}return out;
   }
   if(input.mode==='defend'){out.distance=4+q*8;out.loft=false;out.runs=roll[0]>.91&&q>.8?1:0;out.title=out.runs?'1 run':'Dot ball';out.detail=out.runs?'Soft hands, a quick single':'Defended safely';return out;}
   const power=batter.attributes.power;
   if(!out.loft&&ball.scoringVersion>=3)return ball.scoringVersion>=6?out:Ground.finish(out,ball,field,q,power,roll);
   out.distance=batter.rulesVersion===1?(input.mode==='loft'?(32+54*q)*power:(24+54*q)*power):(input.mode==='loft'?(20+60*q)*power:(16+51*q)*power);
   out.distance+=ball.speed>115?3:0;out.distance+=(roll[0]-.5)*3;
   const angleDiff=(a,b)=>Math.abs(((a-b+540)%360)-180);
   const nearest=field.map(f=>({...f,delta:angleDiff(f.a,out.angle)})).sort((a,b)=>a.delta-b.delta)[0];
   if(out.loft&&out.distance>=64){out.runs=6;out.title='Six';out.detail=out.shot+' - clears the rope';return out;}
   if(out.loft&&nearest.delta<15&&Math.abs(nearest.r*64-out.distance)<17){out.wicket=true;out.title='Caught';out.detail='Picked out '+nearest.n+' with a lofted '+out.shot.toLowerCase();out.fielder=nearest.n;return out;}
   if(!out.loft&&nearest.delta<9&&out.distance>nearest.r*64-5){out.runs=nearest.r>.72?1:0;out.title=out.runs?'1 run':'Dot ball';out.detail='Stopped at '+nearest.n;out.distance=Math.min(out.distance,nearest.r*64);return out;}
   if(!out.loft&&out.distance>=64){out.runs=4;out.title='Four';out.detail=out.shot+' - through the gap';return out;}
   out.runs=batter.rulesVersion===1?(out.distance>43?2:out.distance>19?1:0):(out.distance>43&&nearest.delta>22?2:out.distance>21?1:0);if(out.distance>57&&nearest.delta>26&&roll[3]>.7)out.runs=3;
   out.title=out.runs?out.runs+' run'+(out.runs===1?'':'s'):'Dot ball';out.detail=choice.value<.8?choice.reason:out.shot+' into the gap';return out;
  }
 };
 const ShotV3={...LegacyShot,
  describe(angle,mode,ball){if(mode==='defend')return 'Defence';const a=Math.abs(angle),spin=ball&&['legspin','offspin'].includes(ball.archetype);if(a<23)return 'Straight drive';if(angle>0)return a<63?'Cover drive':a<112?'Square cut':'Late cut';if(a<61)return 'On drive';if(a<113)return 'Pull';return spin?'Sweep':'Leg glance';},
  suitability(ball,angle,mode){const shot=this.describe(angle,mode,ball),x=Delivery.at(ball,1).x;
   if(shot==='Sweep'&&ball.lengthName!=='short'&&ball.lengthName!=='yorker')return{value:x>.40?.56:.94,reason:x>.40?'Reaching across a wide line':'Good sweep length'};
   if(shot==='Leg glance'&&x<.02&&ball.lengthName!=='yorker')return{value:.94,reason:'Worked off the pads'};
   return LegacyShot.suitability(ball,angle,mode);
  }
 };
 // Ground shots race the fielders to the ball. Runs reflect the time
 // available before the return, rather than a fixed angular gap threshold.
 const Ground={
  finish(out,ball,field,q,power,roll){
   const boundary=64,range=(20+62*q)*power+(ball.speed>115?2:0)+(roll[0]-.5)*2;
   const speed=16+15*q,drag=speed*speed/(2*range),stopTime=speed/drag;
   const angle=out.angle*Math.PI/180,dx=Math.sin(angle),dz=Math.cos(angle),origin=ball.scoringVersion>=4?Fielding.contactOrigin(ball,{angle:out.angle,mode:'ground'}):{x:0,z:0},originX=origin.x,originZ=origin.z,along=originX*dx+originZ*dz,ropeDistance=ball.scoringVersion>=23?Ground.ropeDistance(ball,origin,dx,dz):-along+Math.sqrt(along*along+boundary*boundary-originX*originX-originZ*originZ);
   const distance=t=>t>=stopTime?range:speed*t-.5*drag*t*t;
   const ropeTime=range>=ropeDistance?(speed-Math.sqrt(Math.max(0,speed*speed-2*drag*ropeDistance)))/drag:Infinity;
   let picked=null;
   for(const f of field){
    const fa=f.a*Math.PI/180,fx=Math.sin(fa)*f.r*boundary,fz=Math.cos(fa)*f.r*boundary;
    const reachable=t=>Math.hypot(fx-originX-dx*distance(t),fz-originZ-dz*distance(t))<=Math.max(0,t-.50)*5.7+.75;
    const end=Math.min(ropeTime,15);let previous=0;
    for(let t=.08;t<=end+.0001;t+=.08){if(reachable(t)){let lo=previous,hi=t;for(let n=0;n<8;n++){const mid=(lo+hi)/2;if(reachable(mid))hi=mid;else lo=mid;}
      if(!picked||hi<picked.time)picked={time:hi,name:f.n,distance:distance(hi),start:{x:fx,z:fz}};break;}previous=t;}
   }
   out.groundSpeed=speed;out.groundDrag=drag;out.maxRange=range;
   if(range>=ropeDistance&&(!picked||picked.time>=ropeTime)){
    out.runs=4;out.title='Four';out.detail=out.shot+' - beats the field and reaches the rope';out.distance=ropeDistance;out.ballTravelTime=ropeTime;return out;
   }
   if(!picked)picked={time:15,name:'deep fielder',distance:Math.min(range,boundary),start:{x:0,z:boundary}};
   const returned=picked.time+.50+picked.distance/22;
   out.runs=returned>=8.65?3:returned>=5.75?2:returned>=3.0?1:0;
   out.distance=picked.distance;out.ballTravelTime=picked.time;out.returnTime=returned;
   out.retrieval={name:picked.name,start:picked.start,x:originX+dx*picked.distance,z:originZ+dz*picked.distance,time:picked.time};
   out.title=out.runs?out.runs+' run'+(out.runs===1?'':'s'):'Dot ball';
   out.detail=out.runs===3?'Into the deep gap - back for three':out.runs===2?'Into the gap - two before the return':out.runs===1?'A single before '+picked.name+' returns it':'Stopped quickly at '+picked.name;
   return out;
  }
 };
 // One world-space field serves scoring, the perspective view and the radar.
 const Fielding={
  contactOrigin(ball,input){const p=Delivery.at(ball,1),name=Shot.describe(input?.angle||0,input?.mode||'defend',ball);return{...p,z:ball.scoringVersion>=20&&Strokes.drive(name)?.11:ball.scoringVersion>=15&&name==='Forward defence'?.11:['Sweep','Slog sweep','Paddle sweep'].includes(name)?.55:ball.scoringVersion>=8&&name==='Late cut'?-.04:['good','short'].includes(ball.lengthName)?-.04:.11};},
  positions(field){return field.map((f,id)=>({id,name:f.n,x:Math.sin(f.a*Math.PI/180)*f.r*64,z:Math.cos(f.a*Math.PI/180)*f.r*64}));},
  keeper:{id:'keeper',name:'keeper',x:0,z:-4.2},
  keeperFor(ball){return ball?.scoringVersion>=5?{id:'keeper',name:'keeper',x:ball.scoringVersion>=6&&Number.isFinite(ball.line)?clamp(Delivery.at(ball,1).x*1.35,-1.8,1.8):.06,z:ball.family?.includes('spin')?-2.6:-12.5}:{...this.keeper};},
  freeBall(p,t){
   if(p.physicsVersion>=7)return NormalBall.at(p,t);
   if(p.physicsVersion>=6)return BallFlight.at(p,t);
   if(t<p.airTime){return{x:p.origin.x+p.dx*p.airSpeed*t,z:p.origin.z+p.dz*p.airSpeed*t,h:Math.max(.035,p.origin.h+p.vy*t-4.905*t*t)};}
   const dt=t-p.airTime,roll=Math.min(p.rollRange,dt>=p.groundSpeed/p.drag?p.rollRange:p.groundSpeed*dt-.5*p.drag*dt*dt),d=p.airSpeed*p.airTime+Math.max(0,roll);
   return{x:p.origin.x+p.dx*d,z:p.origin.z+p.dz*d,h:.035};
  },
  playback(p,age){if(p.kind==='through')return (p.startAt||0)+Math.max(0,age)/1300;if(p.physicsVersion>=6)return Math.max(0,age)/1000;const initial=Math.min(.25,p.event.time*.25);return age<=800?Math.max(0,age-140)/660*initial:initial+(age-800)/1000*Math.max(1.35,(p.returnTime+.4)/4.7);},
  ballAt(p,t){
   if(t<p.event.time)return this.freeBall(p,t);
   const e=p.event;if(p.physicsVersion>=6&&['catch','take'].includes(e.type))return{x:e.x,z:e.z,h:lerp(e.h,1.25,clamp((t-e.time-.18)/.45,0,1))};if(e.type==='pickup'&&t<=e.time+.45)return{x:e.x,z:e.z,h:lerp(p.physicsVersion>=6?e.h:.035,1.35,clamp((t-e.time)/.45,0,1))};if(e.type==='pickup'&&t>e.time+.45){const k=clamp((t-e.time-.45)/Math.max(.2,p.returnTime-e.time-.45),0,1);return{x:lerp(e.x,0,k),z:lerp(e.z,-.8,k),h:lerp(1.35,.8,k)+Math.sin(k*Math.PI)*1.8};}
   return{x:e.x,z:e.z,h:e.h};
  },
  frame(out,t,field,delivery=null){
   const p=out?.play,starts=p?.starts||this.positions(field),all=[...starts,{...(p?.keeper||this.keeperFor(delivery))}];
   if(!p)return{fielders:all,ball:null,event:null,complete:false};
   const e=p.event,ball=this.ballAt(p,t);
   const fielders=all.map(f=>{if(f.id!==e.id)return{...f,moving:false};
    const distance=Math.hypot(e.x-f.x,e.z-f.z),travel=Math.max(0,distance-(p.physicsVersion>=6?.60:.55)),k=travel?clamp((p.physicsVersion>=6?BallFlight.run(f,t):(t-.35)*5.7)/travel,0,1):1,ratio=distance?travel/distance*k:0;
    return{...f,x:lerp(f.x,e.x,ratio),z:lerp(f.z,e.z,ratio),moving:k>0&&k<1,jump:p.physicsVersion>=6&&['catch','take'].includes(e.type)?Math.max(0,e.h-1.95)*clamp((t-e.time+.30)/.30,0,1)*(1-clamp((t-e.time-.06)/.30,0,1)):0,action:t>=e.time-.24?(e.type==='catch'||e.type==='take'?'catch':t<e.time+.45?'pickup':'throw'):'run',hands:{x:e.x,z:e.z,h:e.type==='catch'||e.type==='take'?(p.physicsVersion>=6?ball.h:e.h):t<e.time?.12:t<e.time+.45?ball.h:1.35},actionBlend:clamp((t-(e.time-.30))/.30,0,1)};
   });
   return{fielders,ball,event:e,complete:t>=e.time,returned:t>=p.returnTime};
  },
  decorateGround(out,ball,field){
   const origin={...this.contactOrigin(ball,{angle:out.angle,mode:out.loft?'loft':'ground'}),h:.035},a=out.angle*Math.PI/180,starts=this.positions(field),retrieval=out.retrieval;
   const event=retrieval?{...retrieval,id:starts.find(f=>f.name===retrieval.name)?.id,type:'pickup',h:.035}:{type:'four',time:out.ballTravelTime,x:origin.x+Math.sin(a)*out.distance,z:origin.z+Math.cos(a)*out.distance,h:.035};
   out.play={keeper:this.keeperFor(ball),origin,dx:Math.sin(a),dz:Math.cos(a),airTime:0,airSpeed:0,vy:0,groundSpeed:out.groundSpeed,drag:out.groundDrag,rollRange:out.maxRange,starts,event,returnTime:out.returnTime||event.time};return out;
  },
  resolve(out,ball,input,field){
   if(!out.contact)return out;
   if(out.groundSpeed)return this.decorateGround(out,ball,field);
   const origin=this.contactOrigin(ball,input),starts=this.positions(field),keeper=this.keeperFor(ball),q=out.quality;
   if(!out.loft){const speed=7+5*q,range=out.distance;Object.assign(out,{groundSpeed:speed,groundDrag:speed*speed/(2*range),maxRange:range});
    const a=out.angle*Math.PI/180,end={x:origin.x+Math.sin(a)*range,z:origin.z+Math.cos(a)*range},f=[...starts,{id:'bowler',name:'bowler',x:.43,z:17.1}].sort((a,b)=>Math.hypot(a.x-end.x,a.z-end.z)-Math.hypot(b.x-end.x,b.z-end.z))[0],time=Math.max(2*range/speed,.35+Math.hypot(f.x-end.x,f.z-end.z)/5.7);
    out.retrieval={name:f.name,start:{x:f.x,z:f.z},...end,time};out.ballTravelTime=time;out.returnTime=time+.45+range/22;const decorated=this.decorateGround(out,ball,field);if(f.id==='bowler'){decorated.play.starts.push(f);decorated.play.event.id='bowler';}return decorated;
   }
   // A weak edge has its own short airborne path through the keeper's reach.
   let angle=out.angle*Math.PI/180,range=out.distance,vy=Math.sqrt(Math.max(3,range)*9.81*.34);
   if(q<.36&&ball.scoringVersion<5){range=out.wicket?4.6:7.2;const targetX=out.wicket?.06:origin.x+.8;angle=Math.atan2(targetX-origin.x,-range);vy=out.wicket?3.5:1.7;}
   if(q<.36&&ball.scoringVersion>=5){const r=RNG.stream(out.rngState),pace=ball.speed/3.6;vy=lerp(-1.4,2.4,r.next());const flight=(vy+Math.sqrt(vy*vy+19.62*origin.h))/9.81;range=Math.max(3,pace*lerp(.42,.75,r.next())*flight);angle=(out.angle+(r.next()-.5)*24)*Math.PI/180;out.rngState=r.state;}
   const airTime=(vy+Math.sqrt(vy*vy+19.62*origin.h))/9.81,airSpeed=range/airTime;
   const rollRange=q<.36?(ball.scoringVersion>=5?ball.speed*.31:4):10+q*16,groundSpeed=q<.36?(ball.scoringVersion>=5?ball.speed/9:5):9+q*6;
   const p={keeper,origin,dx:Math.sin(angle),dz:Math.cos(angle),airTime,airSpeed,vy,groundSpeed,drag:groundSpeed*groundSpeed/(2*rollRange),rollRange,starts,returnTime:0};
   out.angle=angle*180/Math.PI;
   const reach=(f,t,pos)=>Math.hypot(f.x-pos.x,f.z-pos.z)<=Math.max(0,t-.35)*5.7+.55;
   let event=null;
   for(let t=.04;t<airTime;t+=.04){const pos=this.freeBall(p,t),d=Math.hypot(pos.x,pos.z);if(d>=64){event={type:'six',time:t,...pos};break;}
    if(pos.h>.20&&pos.h<2.05){const candidates=[...starts,keeper].filter(f=>reach(f,t,pos)).sort((a,b)=>Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z));if(candidates.length){event={type:'catch',time:t,id:candidates[0].id,name:candidates[0].name,...pos};break;}}
   }
   if(!event){for(let t=airTime;t<18;t+=.06){const pos=this.freeBall(p,t);if(Math.hypot(pos.x,pos.z)>=64){event={type:'four',time:t,...pos};break;}
     const candidates=[...starts,keeper].filter(f=>reach(f,t,pos)).sort((a,b)=>Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z));if(candidates.length){event={type:'pickup',time:t,id:candidates[0].id,name:candidates[0].name,...pos};break;}}
   }
   if(!event){const pos=this.freeBall(p,18),f=starts.slice().sort((a,b)=>Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z))[0];event={type:'pickup',time:18,id:f.id,name:f.name,...pos};}
   p.event=event;p.returnTime=event.type==='pickup'?event.time+.45+Math.hypot(event.x,event.z+.8)/22:event.time;
   out.play=p;out.ballTravelTime=event.time;out.returnTime=p.returnTime;out.distance=Math.hypot(event.x-origin.x,event.z-origin.z);out.wicket=event.type==='catch';out.fielder=out.wicket?event.name:undefined;
   out.runs=out.wicket?0:event.type==='six'?6:event.type==='four'?4:p.returnTime>=8.65?3:p.returnTime>=5.75?2:p.returnTime>=3?1:0;
   out.title=out.wicket?(event.id==='keeper'?'Caught behind':'Caught'):out.runs===6?'Six':out.runs===4?'Four':out.runs?out.runs+' run'+(out.runs===1?'':'s'):'Dot ball';
   out.detail=out.wicket?'Taken by '+event.name:out.runs===6?'Carries over the rope':out.runs===4?'Bounces clear of the fielder and reaches the rope':'Lands safely - '+event.name+' fields it';
   return out;
  }
 };
 // Ballistic flights, lossy turf impacts and a final decelerating roll.
 // Scoring and drawing query the same path; a bounced ball cannot be caught out.
 const BallFlight={
  radius:.035,g:9.81,
  run(f,t){const reaction=f.id==='keeper'?.18:.32,a=f.id==='keeper'?.65:1.05,v=f.id==='keeper'?4.2:5.2,u=Math.max(0,t-reaction);return u<a?v*u*u/(2*a):v*(u-a/2);},
  build(origin,angle,vx,vy,range,kind='shot'){
   const dx=Math.sin(angle),dz=Math.cos(angle),segments=[],bounces=[];let time=0,distance=0,h=Math.max(this.radius,origin.h),up=vy,speed=vx;
   for(let i=0;i<4;i++){const duration=(up+Math.sqrt(up*up+2*this.g*(h-this.radius)))/this.g;if(duration<.0001)break;segments.push({time,distance,h,vy:up,speed,duration,roll:false,bounced:i>0});time+=duration;distance+=speed*duration;const impact=Math.max(0,this.g*duration-up);bounces.push({time,impact});up=Math.min(kind==='ground'?2.3:7.5,impact*(i===0?(kind==='ground'?.25:.34):.37));speed*=i===0?.80:.88;h=this.radius;if(up<.65)break;}
   const left=Math.max(2,range-distance),drag=Math.max(.2,speed*speed/(2*left));segments.push({time,distance,h:this.radius,vy:0,speed,drag,duration:speed/drag,roll:true,bounced:true});
   return{physicsVersion:6,kind,origin:{...origin},dx,dz,segments,bounces,airTime:bounces[0]?.time||0,stopTime:time+speed/drag,returnTime:0};
  },
  at(p,time){const t=Math.max(0,time),s=p.segments.find(s=>t<s.time+s.duration)||p.segments.at(-1),u=clamp(t-s.time,0,s.duration),distance=s.distance+s.speed*u-(s.roll?.5*s.drag*u*u:0);return{x:p.origin.x+p.dx*distance,z:p.origin.z+p.dz*distance,h:s.roll?this.radius:Math.max(this.radius,s.h+s.vy*u-.5*this.g*u*u),bounced:s.bounced,speed:Math.max(0,s.speed-(s.roll?s.drag*u:0))};},
  continuation(ball){const origin=Delivery.at(ball,1),before=Delivery.at(ball,.999),a=Math.atan2(origin.x-before.x,origin.z-before.z),vx=Delivery.incomingSpeed(ball),vy=(ball.contactH-this.radius+.5*this.g*ball.postTime*ball.postTime)/ball.postTime-this.g*ball.postTime;return this.build(origin,a,vx,vy,100,'through');},
  through(out,ball,field){
   const p=this.continuation(ball),keeper=Fielding.keeperFor(ball),starts=Fielding.positions(field);p.keeper=keeper;p.starts=starts;let event;
   if(out.wicket){const duration=.8/(Delivery.incomingSpeed(ball)),pos=this.at(p,duration);event={type:'stumps',time:duration,...pos};}
   else{const atKeeper=Math.max(.04,Math.abs(keeper.z)/Math.max(1,Delivery.incomingSpeed(ball)));for(let t=atKeeper;t<atKeeper+1.5;t+=.012){const pos=this.at(p,t);if(pos.h<=2.45&&Math.hypot(pos.x-keeper.x,pos.z-keeper.z)<=this.run(keeper,t)+.8){event={type:'take',id:'keeper',name:'keeper',time:t,...pos};break;}}
    if(!event){const pos=this.at(p,atKeeper);event={type:'take',id:'keeper',name:'keeper',time:atKeeper,...pos};}
   }
   p.event=event;p.returnTime=event.time+.35;out.play=p;out.ballTravelTime=event.time;out.returnTime=p.returnTime;out.contactGrade='NO CONTACT';if(ball.lengthName==='short'&&!out.wicket&&!out.wide)out.detail=out.error===null||out.evasion?'Ducked under the bouncer - taken by the keeper':'Over the bat - taken by the keeper';return out;
  },
  resolve(out,ball,input,batter,field){
   if(!out.contact)return this.through(out,ball,field);
   const rng=RNG.stream(out.rngState),q=out.quality,power=batter.attributes.power,edge=q<.36,ground=!out.loft,defend=input.mode==='defend',origin=Fielding.contactOrigin(ball,input),angle=(out.angle+(rng.next()-.5)*(edge?22:(1-q)*8))*Math.PI/180;
   let vx,vy,range,kind=ground?'ground':'shot';
   if(edge){vx=ball.speed/3.6*lerp(.58,.85,rng.next());vy=lerp(-1.1,2.7,rng.next());range=48+ball.speed*.24;kind='edge';}
   else if(defend){vx=4.5+q*2;vy=-1.4;range=1+q*4;kind='ground';}
   else if(ground){vx=(18+17*q)*power;vy=-Math.max(1.4,origin.h*5.0);range=(14+84*q*q)*power+ball.speed*.035;}
   else{const carry=(14+82*q*q)*power+(ball.speed>115?2:0)+(rng.next()-.5)*3,elevation=(q>.82?35:46)*Math.PI/180;vy=Math.sqrt(Math.max(12,carry)*this.g*Math.tan(elevation)/2);const air=(vy+Math.sqrt(vy*vy+2*this.g*(origin.h-this.radius)))/this.g;vx=carry/air;range=carry+18+q*17;}
   const p=this.build(origin,angle,vx,vy,range,kind),keeper=Fielding.keeperFor(ball),starts=[...Fielding.positions(field),{id:'bowler',name:'bowler',x:ball.releaseX,z:17.1}],all=[...starts,keeper];p.keeper=keeper;p.starts=starts;let event=null,previous=0;
   const boundary=t=>Math.hypot(this.at(p,t).x,this.at(p,t).z)>=64;
   for(let t=.015;t<Math.max(20,p.stopTime+2);t+=.025){const pos=this.at(p,t);if(boundary(t)){let lo=previous,hi=t;for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(boundary(mid))hi=mid;else lo=mid;}const at=this.at(p,hi);event={type:at.bounced?'four':'six',time:hi,...at};break;}
    const airborne=!pos.bounced&&pos.h>=.20&&pos.h<=2.20,collect=pos.bounced&&pos.h<=.70;
    if(airborne||collect){const candidates=all.filter(f=>Math.hypot(f.x-pos.x,f.z-pos.z)<=this.run(f,t)+.60).sort((a,b)=>Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z));if(candidates.length){event={type:airborne?'catch':'pickup',id:candidates[0].id,name:candidates[0].name,time:t,...pos};break;}}previous=t;
   }
   if(!event){const pos=this.at(p,p.stopTime),f=all.slice().sort((a,b)=>Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z))[0],time=Math.max(p.stopTime,.85+Math.hypot(f.x-pos.x,f.z-pos.z)/5.2);event={type:'pickup',id:f.id,name:f.name,time,...pos};}
   p.event=event;p.returnTime=event.type==='pickup'?event.time+.50+Math.hypot(event.x,event.z+.8)/22:event.time;
   out.play=p;out.rngState=rng.state;out.angle=angle*180/Math.PI;out.distance=Math.hypot(event.x-origin.x,event.z-origin.z);out.ballTravelTime=event.time;out.returnTime=p.returnTime;out.wicket=event.type==='catch';out.fielder=out.wicket?event.name:undefined;out.contactGrade=edge?'EDGE':q>=.85?'MIDDLED':q>=.65?'CLEAN':q>=.45?'OFF THE MIDDLE':'MISTIMED';
   out.runs=out.wicket?0:event.type==='six'?6:event.type==='four'?4:p.returnTime>=8.65?3:p.returnTime>=5.75?2:p.returnTime>=3?1:0;
   if(defend&&!out.wicket)out.runs=p.returnTime>=6?1:0;
   out.title=out.wicket?(event.id==='keeper'?'Caught behind':'Caught'):out.runs===6?'Six':out.runs===4?'Four':out.runs?out.runs+' run'+(out.runs===1?'':'s'):'Dot ball';
   const choice=Shot.suitability(ball,input.angle,input.mode),why=choice.value<.70?choice.reason:edge?'Thin edge':q<.65?'Off the middle':out.shot;
   out.detail=out.wicket?why+' - '+(q>=.85?'picked out ':'taken by ')+event.name:out.runs===6?out.contactGrade.toLowerCase()+' - carries over the rope':out.runs===4?out.shot+' - through the gap for four':out.runs?out.runs+' before '+event.name+' returns it':'Stopped by '+event.name;
   return out;
  }
 };

 // V7 integrates launch conditions forward. Neither the score nor a requested
 // distance can alter air drag, impact loss or outfield resistance. V6 is kept
 // intact above so an already committed delivery can finish on its saved rules.
 const NormalBall={
  radius:.035,g:9.81,inertia:.4,step:.025,
  air:.5*1.225*.50*Math.PI*.035*.035/.156,
  pitch:Object.freeze({id:'pitch',restitution:.50,friction:.20,rolling:.70}),
  turf:Object.freeze({id:'outfield',restitution:.35,friction:.35,rolling:2.20}),
  surface(x,z){return Math.abs(x)<=1.52&&z>=-1.25&&z<=19.65?this.pitch:this.turf;},
  build(origin,angle,vx,vy,kind='ground',spinRatio=.4){
   const dx=Math.sin(angle),dz=Math.cos(angle),segments=[],bounces=[],crossings=[];
   for(const [a,d,edges]of [[origin.x,dx,[-1.52,1.52]],[origin.z,dz,[-1.25,19.65]]])if(Math.abs(d)>1e-8)for(const edge of edges){const distance=(edge-a)/d;if(distance>0)crossings.push(distance);}
   crossings.sort((a,b)=>a-b);
   let time=0,distance=0,h=Math.max(this.radius,origin.h),speed=vx,up=vy,spin=vx*spinRatio,settled=h<=this.radius&&vy===0,bounced=settled;
   const initial={speed,vy:up,spin};
   for(let n=0;n<6000;n++){
    if(settled&&speed<.025&&Math.abs(spin)<.025)break;
    const surface=this.surface(origin.x+dx*(distance+1e-7),origin.z+dz*(distance+1e-7));
    let duration=this.step,ax,ay,spinA=0,impact=false,rolling=false;
    if(!settled){
     const drag=this.air*Math.hypot(speed,up);ax=-drag*speed;ay=-this.g-drag*up;
     if(h+up*duration+.5*ay*duration*duration<=this.radius){duration=Math.max(0,(-up-Math.sqrt(up*up-2*ay*(h-this.radius)))/ay);impact=true;}
    }else{
     const slip=speed-spin;rolling=Math.abs(slip)<.015;
     const friction=rolling?0:-Math.sign(slip)*surface.friction*this.g;
     ax=friction-surface.rolling-this.air*speed*speed;ay=0;spinA=rolling?ax:-friction/this.inertia;
     if(rolling)spin=speed;
     else{const gripTime=-slip/(ax-spinA);if(gripTime>1e-7)duration=Math.min(duration,gripTime);}
     if(ax<0&&speed+ax*duration<0)duration=Math.max(0,speed/-ax);
     const edge=crossings.find(d=>d>distance+1e-6),travel=speed*duration+.5*ax*duration*duration;
     if(edge!==undefined&&edge-distance<travel){const d=edge-distance;duration=2*d/(speed+Math.sqrt(Math.max(0,speed*speed+2*ax*d)));}
    }
    if(duration>1e-9){
     segments.push({time,distance,h,speed,vy:up,ax,ay,spin,spinA,duration,bounced,roll:settled,surface:settled?surface.id:'air'});
     distance+=Math.max(0,speed*duration+.5*ax*duration*duration);h=Math.max(this.radius,h+up*duration+.5*ay*duration*duration);
     speed=Math.max(0,speed+ax*duration);up+=ay*duration;spin+=spinA*duration;time+=duration;
    }
    if(impact){
     const ground=this.surface(origin.x+dx*distance,origin.z+dz*distance),vertical=Math.max(0,-up),before={speed,vy:up,spin},impulse=-clamp((speed-spin)/(1+1/this.inertia),-ground.friction*(1+ground.restitution)*vertical,ground.friction*(1+ground.restitution)*vertical);
     speed+=impulse;spin-=impulse/this.inertia;up=vertical*ground.restitution;h=this.radius;bounced=true;
     if(up<.45){up=0;settled=true;}
     bounces.push({time,impact:vertical,surface:ground.id,before,after:{speed,vy:up,spin}});
    }else if(settled&&duration<1e-9){speed=0;spin=0;break;}
   }
   segments.push({time,distance,h:this.radius,speed:0,vy:0,ax:0,ay:0,spin:0,spinA:0,duration:0,bounced:true,roll:true,surface:this.surface(origin.x+dx*distance,origin.z+dz*distance).id});
   return{physicsVersion:7,environment:'normal-dry',kind,origin:{...origin},dx,dz,initial,segments,bounces,airTime:bounces[0]?.time||0,stopTime:time,returnTime:0};
  },
  at(p,time){
   const t=clamp(time,0,p.stopTime);let lo=0,hi=p.segments.length-1;
   while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(p.segments[mid].time<=t)lo=mid;else hi=mid-1;}
   const s=p.segments[lo],u=clamp(t-s.time,0,s.duration),distance=s.distance+s.speed*u+.5*s.ax*u*u;
   return{x:p.origin.x+p.dx*distance,z:p.origin.z+p.dz*distance,h:s.roll?this.radius:Math.max(this.radius,s.h+s.vy*u+.5*s.ay*u*u),bounced:s.bounced,speed:Math.max(0,s.speed+s.ax*u)};
  },
  launch(out,ball,input,batter,rng){
   const q=out.quality,edge=q<.36,defend=input.mode==='defend',ground=!out.loft,origin=Fielding.contactOrigin(ball,input),angle=(out.angle+(rng.next()-.5)*(edge?22:(1-q)*8))*Math.PI/180;
   const incoming=Delivery.incomingSpeed(ball),effort=clamp(Number.isFinite(input.effort)?input.effort:ground?.60:.90,0,1),power=batter.attributes.power;
   let speed,vertical,kind=ground?'ground':'shot',spinRatio=.4;
   if(edge){speed=incoming*lerp(.48,.80,rng.next());vertical=lerp(-1.1,2.7,rng.next());kind='edge';spinRatio=.1;}
   else if(defend){speed=1.4+incoming*.055+q*.65;vertical=-1.3;kind='ground';spinRatio=.15;}
   else{
    // Apparent bat restitution and bat speed are separate from release timing.
    // A glance preserves more tangential incoming pace but adds less bat speed.
    const glance=Math.sin(Math.abs(angle)/2)**2,restitution=.08+.20*q*q,redirect=lerp(restitution,.74,glance),batSpeed=(ground?2+20*effort:23+10*effort)*power*(.25+.75*q),batContribution=(1+restitution)*batSpeed*(1-.56*glance);
    speed=incoming*redirect+batContribution;
    if(ground){vertical=-Math.max(1.15,origin.h*3.5);spinRatio=.35+.20*q;}
    else{const elevation=(q>=.82?34:43+(1-q)*12)*Math.PI/180;vertical=speed*Math.sin(elevation);speed*=Math.cos(elevation);spinRatio=-.18;}
   }
   return{origin,angle,vx:speed,vy:vertical,kind,spinRatio,effort};
  },
  resolve(out,ball,input,batter,field){
   if(!out.contact)return BallFlight.through(out,ball,field);
   const rng=RNG.stream(out.rngState),q=out.quality,edge=out.edge??q<.36,defend=input.mode==='defend',launch=this.launch(out,ball,input,batter,rng),{origin,angle}=launch;
   const p=this.build(origin,angle,launch.vx,launch.vy,launch.kind,launch.spinRatio,ball.scoringVersion>=9?ball.conditions:null),keeper=Fielding.keeperFor(ball),starts=[...Fielding.positions(field),{id:'bowler',name:'bowler',x:ball.releaseX,z:17.1}],all=[...starts,keeper];p.keeper=keeper;p.starts=starts;let event=null,previous=0;
   if(ball.scoringVersion>=23){TeamField.pursue(p,ball,field,true);event=p.event;}else{
   const boundary=t=>{const pos=this.at(p,t);return Math.hypot(pos.x,pos.z)>=64;};
   for(let t=.015;t<p.stopTime+2;t+=.025){const pos=this.at(p,t);if(boundary(t)){let lo=previous,hi=t;for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(boundary(mid))hi=mid;else lo=mid;}const at=this.at(p,hi);event={type:at.bounced?'four':'six',time:hi,...at};break;}
    const airborne=!pos.bounced&&pos.h>=.20&&pos.h<=2.20,collect=pos.bounced&&pos.h<=.70;
    if(airborne||collect){const candidates=all.filter(f=>Math.hypot(f.x-pos.x,f.z-pos.z)<=BallFlight.run(f,t)+.60).sort((a,b)=>Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z));if(candidates.length){event={type:airborne?'catch':'pickup',id:candidates[0].id,name:candidates[0].name,time:t,...pos};break;}}previous=t;
   }
   if(!event){const pos=this.at(p,p.stopTime),f=all.slice().sort((a,b)=>Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z))[0],distance=Math.max(0,Math.hypot(f.x-pos.x,f.z-pos.z)-.60);let time=p.stopTime;while(BallFlight.run(f,time)<distance)time+=.025;event={type:'pickup',id:f.id,name:f.name,time,...pos};}
   }
   p.event=event;p.returnTime=event.type==='pickup'?event.time+.50+Math.hypot(event.x,event.z+.8)/22:event.time;
   out.play=p;out.rngState=rng.state;out.angle=angle*180/Math.PI;out.distance=Math.hypot(event.x-origin.x,event.z-origin.z);out.ballTravelTime=event.time;out.returnTime=p.returnTime;out.wicket=event.type==='catch';out.fielder=out.wicket?event.name:undefined;out.contactGrade=edge?'EDGE':q>=.85?'MIDDLED':q>=.65?'CLEAN':q>=.45?'OFF THE MIDDLE':'MISTIMED';out.effort=launch.effort;out.exitSpeed=Math.hypot(launch.vx,launch.vy);
   out.runs=out.wicket?0:event.type==='six'?6:event.type==='four'?4:p.returnTime>=8.65?3:p.returnTime>=5.75?2:p.returnTime>=3?1:0;
   if(defend&&!out.wicket)out.runs=p.returnTime>=6?1:0;
   out.title=out.wicket?(event.id==='keeper'?'Caught behind':'Caught'):out.runs===6?'Six':out.runs===4?'Four':out.runs?out.runs+' run'+(out.runs===1?'':'s'):'Dot ball';
   const choice=Shot.suitability(ball,input.angle,input.mode),why=ball.scoringVersion>=11&&edge?out.edgeType:choice.value<.70?choice.reason:edge?'Thin edge':q<.65?'Off the middle':out.shot;
   out.detail=out.wicket?why+' - '+(q>=.85?'picked out ':'taken by ')+event.name:out.runs===6?out.contactGrade.toLowerCase()+' - carries over the rope':out.runs===4?out.shot+' - through the gap for four':out.runs?out.runs+' before '+event.name+' returns it':'Stopped by '+event.name;
   return out;
  }
 };

 // V11 separates an edge from a general quality score. Release, shot choice
 // and late movement influence contact; fielders still have to intercept it.
 const Contact={
  testPace(ball){return ball.format==='TEST'&&!Strokes.spin(ball);},
  cutCoverage(ball,input){if(ball.scoringVersion<22||input?.mode!=='ground'||ball.lengthName!=='short')return false;const x=Delivery.at(Hand.canonical(ball),1).x;return ['Square cut','Late cut'].includes(Shot.describe(input.angle,input.mode,ball))&&x>.14&&x<1.25&&ball.contactH<1.96;},
  movement(ball){return clamp(Math.abs(ball.swing)*.9+Math.abs(ball.kick)*1.8,0,1);},
  window(ball,batter,input=null){const base=215*batter.attributes.timing*(batter.attributes.matchups[ball.archetype]||1),modern=ball.scoringVersion>=15;return base*(this.testPace(ball)?.84*clamp(135/ball.speed,.84,1.10)*(1-.12*this.movement(ball)):modern&&Strokes.spin(ball)?1.24:1)*(modern&&input?.mode==='defend'?1.18:ball.scoringVersion>=16&&input?.mode==='ground'&&this.testPace(ball)?1.10:1);},
  resolve(ball,input,batter,seed){const rng=RNG.stream(seed),roll=[rng.next(),rng.next(),rng.next(),rng.next()],pos=Delivery.at(ball,1),out={runs:0,wicket:false,wide:false,contact:false,angle:0,distance:0,loft:false,shot:'Leave',title:'Dot ball',detail:'Safely through to the keeper',timing:'Left alone',error:null,quality:0,rngState:rng.state};
   if(!input)return out;
   const error=input.error,ae=Math.abs(error),window=this.window(ball,batter,input),test=this.testPace(ball),modern=ball.scoringVersion>=15,spinAssist=ball.scoringVersion>=20&&Strokes.spin(ball),defend=input.mode==='defend',choice=Shot.suitability(ball,input.angle,input.mode),name=Shot.describe(input.angle,input.mode,ball),precision=spinAssist||this.cutCoverage(ball,input)?this.precisionWindow(ball,batter,input):window,attempt=clamp(ae/precision,0,1),timeQ=clamp(1-attempt*(modern&&defend?.56:modern&&input.mode==='ground'?.72:.84),0,1),backFootLoft=test&&ball.lengthName==='good'&&input.mode==='loft'&&!(ball.scoringVersion>=20&&Strokes.forward(ball)),value=choice.value*(backFootLoft?.92:1);
   Object.assign(out,{error,angle:input.angle,loft:input.mode==='loft',shot:name,timing:ae<=(test?25:modern?45:36)?'Perfect timing':ae<=(test?65:modern?95:80)?'Good timing':error<0?'Early':'Late',timingWindow:window,edge:false});
   if(ae>window||Math.abs(pos.x)>1.37){out.detail='Beaten - no contact';return out;}
   // Contact tolerance and middle-of-the-bat timing are separate. A sensible
   // spin stroke can be weakly hit without being forced into an outside edge.
   const calibrated=ball.scoringVersion>=22,controlledSpin=ball.scoringVersion>=17&&Strokes.spin(ball)&&input.mode!=='loft',cutCoverage=this.cutCoverage(ball,input),softContact=spinAssist&&controlledSpin&&value>=(calibrated?.65:.70)||cutCoverage&&value>=.80,q=softContact?Math.max(calibrated?.42:.38,timeQ*value):timeQ*value,pressure=clamp(((spinAssist||cutCoverage?clamp(ae/window,0,1):attempt)-(controlledSpin?.22:.10))/(controlledSpin?.78:.90),0,1),reach=clamp((Math.abs(pos.x)-.58)/.65,0,1),hard=defend?(modern?.32:.65):input.mode==='loft'?1.08:modern?(input.effort<=.75?.58:.78):.80,risk=clamp((pressure*((controlledSpin?(calibrated?.12:.20):.38)+(controlledSpin?(calibrated?.07:.14):modern&&Strokes.spin(ball)?.34:.50)*this.movement(ball))+Math.max(0,.82-value)*.70+reach*.10)*hard*(cutCoverage?.48:1),0,.72),edge=q<.36||roll[0]<risk;
   Object.assign(out,{contact:true,quality:q,detail:backFootLoft?'Limited swing from the back foot':choice.reason,edge,edgeRisk:risk});
   if(edge){const outside=pos.x>=.08||ball.kick+ball.swing*.35>.055,deflection=lerp(.5,43,Math.pow(roll[1],1.55));out.angle=(outside?1:-1)*(180-deflection);out.loft=true;out.edgeType=outside?'Outside edge':'Inside edge';out.detail=out.edgeType+(input.mode==='defend'?' - soft hands':' - off the edge of the bat');}
   return out;
  }
 };
 const Shot={...ShotV3,
  describe(angle,mode,ball){if(ball?.scoringVersion>=6&&ball.lengthName==='short'&&ball.contactH>1.45&&mode==='defend')return'Duck';const name=ShotV3.describe(angle,mode,ball);if(ball?.lengthName==='short'&&angle< -64&&mode!=='defend')return ball.contactH>1.52?'Hook':'Pull';if(ball?.lengthName==='yorker')return mode==='defend'?'Yorker defence':Math.abs(angle)<64?'Yorker dig':name;if(ball?.lengthName==='good'&&Math.abs(angle)<64&&mode!=='defend')return angle>23?'Back-foot punch':angle< -23?'Back-foot on drive':'Back-foot drive';return name;},
  suitability(ball,angle,mode){
   if(ball.scoringVersion!==4)return ShotV3.suitability(ball,angle,mode);
   const x=Delivery.at(ball,1).x,a=Math.abs(angle);let value=1,reason='Good shot choice';
   if(ball.lengthName==='yorker'){value=mode==='defend'?.98:a<64?(mode==='loft'?.46:.78):.30;reason=mode==='defend'?'Bat down to the yorker':a<64?'Dug out at the toes':'Too full to cut or pull';}
   else if(ball.lengthName==='full'){value=mode==='defend'?.98:a<64?1:angle< -112&&ball.family?.includes('spin')?.92:.34;reason=a>=64&&value<.5?'Too full for a cross-bat stroke':'Forward to the pitch of the ball';}
   else if(ball.lengthName==='good'){value=mode==='defend'?.97:a<64?.88:a<114?.76:.64;reason='Back-foot contact at the top of the bounce';}
   else{value=mode==='defend'?.76:a>=64&&a<138?1:.30;reason=value<.5?'Too high to drive - cut or pull':'Back and across to the short ball';}
   if(x>.20&&angle< -30){value=Math.min(value,.45);reason='Across the line outside off';}if(x<-.20&&angle>35){value=Math.min(value,.44);reason='Too far down leg for that shot';}if(Math.abs(x)>.85){value*=.65;reason='Reaching for a wide ball';}
   return{value,reason};
  },
  resolve(ball,input,batter,field,seed){const duck=ball.scoringVersion>=6&&ball.lengthName==='short'&&ball.contactH>1.45&&input?.mode==='defend',out=ball.scoringVersion>=11?Contact.resolve(ball,duck?null:input,batter,seed):LegacyShot.resolve(ball,duck?null:input,batter,field,seed);if(duck){out.shot='Duck';out.evasion=true;out.timing='Ducked';out.error=input.error;}return ball.scoringVersion>=7?NormalBall.resolve(out,ball,duck?null:input,batter,field):ball.scoringVersion>=6?BallFlight.resolve(out,ball,duck?null:input,batter,field):ball.scoringVersion>=4?Fielding.resolve(out,ball,input,field):out;}
 };
 const ShotV4={...Shot};
 Shot.suitability=function(ball,angle,mode){
  if(ball.scoringVersion<5)return ShotV4.suitability.call(ShotV4,ball,angle,mode);
  const x=Delivery.at(ball,1).x,name=this.describe(angle,mode,ball);
  if(mode!=='defend'&&name==='Sweep'&&['full','good'].includes(ball.lengthName))return{value:x>.58?.60:.96,reason:x>.58?'Reaching outside off':'Front knee planted - sweep along the ground'};
  if(mode!=='defend'&&name==='Leg glance'&&ball.lengthName!=='yorker'&&x<.25)return{value:.98,reason:'Using the pace off the pads'};
  if(mode!=='defend'&&name==='Late cut'&&['full','good'].includes(ball.lengthName)&&x>.04)return{value:.91,reason:'Soft hands, open face - behind point'};
  return ShotV4.suitability.call(ShotV4,{...ball,scoringVersion:4},angle,mode);
 };
 // Shot names, the guide and launch profiles share one versioned vocabulary.
 const ShotV7={...Shot};
 const Strokes={
  spin(ball){return ['legspin','offspin'].includes(ball?.archetype)||!!ball?.family?.includes('spin');},
  drive(name){return ['Straight drive','Off drive','Cover drive','On drive','Square drive'].includes(name);},
  forward(ball){return ball?.lengthName==='full'||ball?.lengthName==='good'&&ball.contactH<(ball.scoringVersion>=20?1.10:.72);},
  name(angle,mode,ball){
   if(ball?.scoringVersion>=22&&mode!=='defend'&&ball.lengthName==='short'&&angle>=28&&angle<=112)return'Square cut';
   if(ball?.scoringVersion>=16&&mode!=='defend'){
    const forward=this.forward(ball);
    if(forward&&angle>=-64&&angle<=108)return angle< -18?'On drive':angle<18?'Straight drive':angle<33?'Off drive':angle<65?'Cover drive':'Square drive';
    if(['good','short'].includes(ball.lengthName)&&mode==='ground'&&Math.abs(angle)<72)return'Back-foot punch';
    if(ball.lengthName==='short'&&angle<=-65)return angle< -168&&ball.contactH<1.5?'Leg glance':ball.contactH>1.42?'Hook':'Pull';
   }
   if(ball?.scoringVersion>=15){
    if(mode==='defend')return ball.lengthName==='yorker'?'Yorker defence':ball.lengthName==='short'&&ball.contactH>1.45?'Duck':ball.lengthName==='short'||ball.contactH>1.05?'Back-foot defence':'Forward defence';
    if(ball.lengthName==='short'){
     if(angle<=-65)return angle< -145&&ball.contactH<1.5?'Leg glance':ball.contactH>1.5?'Hook':'Pull';
     if(Math.abs(angle)<64&&mode==='ground')return'Back-foot punch';
    }
    if(ball.lengthName==='good'&&Math.abs(angle)<64&&mode==='ground')return'Back-foot punch';
   }
   if(mode==='defend')return ShotV7.describe(angle,mode,ball);
   if(this.spin(ball)&&!(ball.scoringVersion>=15&&ball.lengthName==='short')&&angle<=-65)return angle< -140?'Paddle sweep':mode==='loft'?'Slog sweep':'Sweep';
   if(angle>112)return mode==='loft'&&ball?.lengthName==='short'&&ball?.contactH>1.1?'Upper cut':'Late cut';
   return ShotV7.describe(angle,mode,ball);
  },
  guide(ball,mode='ground'){
   if(ball?.scoringVersion>=16){const forward=this.forward(ball),back=!forward&&['good','short'].includes(ball.lengthName),spin=this.spin(ball)&&ball.lengthName!=='short',hook=ball.lengthName==='short'&&ball.contactH>1.42,upper=mode==='loft'&&ball.lengthName==='short'&&ball.contactH>1.1;return[{label:back&&mode==='ground'?'BACK FOOT':'STRAIGHT',angle:0,slot:0},{label:ball.scoringVersion>=22&&ball.lengthName==='short'?'CUT':back&&mode==='ground'?'PUNCH':'COVER',angle:44,slot:1},{label:forward?'SQUARE':'CUT',angle:87,slot:2},{label:upper?'UPPER CUT':'LATE CUT',angle:135,slot:3},{label:back&&mode==='ground'?'ON PUNCH':'ON DRIVE',angle:-44,slot:4},{label:spin?(mode==='loft'?'SLOG SWEEP':'SWEEP'):hook?'HOOK':'PULL',angle:-95,slot:5},{label:spin?'PADDLE':hook?'FINE HOOK':'GLANCE',angle:-150,slot:6}];}
   const modern=ball?.scoringVersion>=15,short=ball?.lengthName==='short',back=modern&&['good','short'].includes(ball?.lengthName)&&mode!=='loft',spin=this.spin(ball)&&!(modern&&short),hook=modern&&short&&ball.contactH>1.5,upper=mode==='loft'&&ball?.lengthName==='short'&&ball?.contactH>1.1;
   return[{label:back?'BACK FOOT':'STRAIGHT',angle:0,slot:0},{label:back?'PUNCH':'COVER',angle:44,slot:1},{label:'CUT',angle:87,slot:2},{label:upper?'UPPER CUT':'LATE CUT',angle:135,slot:3},{label:back?'ON PUNCH':'ON DRIVE',angle:-44,slot:4},{label:spin?(mode==='loft'?'SLOG SWEEP':'SWEEP'):hook?'HOOK':'PULL',angle:-95,slot:5},{label:spin?'PADDLE':hook?'HOOK':'GLANCE',angle:-150,slot:6}];
  },
  strength(name,mode,effort=.6){return ['Late cut','Leg glance','Paddle sweep'].includes(name)?(effort<.45?'soft hands':effort<.8?'firm guidance':'full stroke along the ground'):mode==='defend'?'soft hands':mode==='loft'?'lofted':effort<.45?'push':effort<.8?'firm ground stroke':'full ground stroke';}
 };
 Shot.describe=function(angle,mode,ball){return ball?.scoringVersion>=8?Strokes.name(angle,mode,ball):ShotV7.describe(angle,mode,ball);};
 Shot.suitability=function(ball,angle,mode){
  if(ball.scoringVersion<8)return ShotV7.suitability.call(ShotV7,ball,angle,mode);
  const name=Strokes.name(angle,mode,ball),x=Delivery.at(ball,1).x;
  if(ball.scoringVersion>=16&&mode!=='defend'){
   const wide=Math.abs(x)>1.05,wrongSide=x>.38&&angle< -18||x<-.38&&angle>18,spinReach=ball.scoringVersion>=22&&Strokes.spin(ball)&&mode==='ground'&&Math.abs(x)<.72;
   if(['Straight drive','Off drive','Cover drive','On drive','Square drive'].includes(name)){const crowded=name==='Square drive'&&x<.16;return{value:wrongSide?(spinReach?.74:.48):crowded?.56:wide?.78:.98,reason:wrongSide?'Drive on the side of the ball':crowded?'Too close to square-drive':'Front foot to the ball - drive through the gap'};}
   if(name==='Back-foot punch')return{value:ball.contactH>1.42?.43:wrongSide?.54:wide?.78:.98,reason:ball.contactH>1.42?'Too high to punch - hook or cut':wrongSide?'Punch on the side of the ball':'Back and across - punch with a straight bat'};
   if(['Hook','Pull'].includes(name)&&ball.lengthName==='short')return{value:x>.65?.54:x>.30?.84:wide?.78:.98,reason:x>.65?'Too far outside off to hook':'Move back - roll the wrists through the ball'};
   if(name==='Square cut'&&['good','short'].includes(ball.lengthName))return{value:x<.08?.56:wide?.78:.97,reason:x<.08?'Too close to cut':'Back foot across - use the width'};
  }
  if(ball.scoringVersion>=15){
   if(mode==='defend')return{value:Math.abs(x)>.85?.80:ball.lengthName==='short'?.87:.99,reason:name==='Forward defence'?'Head over the ball - soft hands':name==='Back-foot defence'?'Back and across - bat close to the body':'Bat down to the yorker'};
   if(name==='Back-foot punch'){const wrongSide=x>.28&&angle< -28||x<-.28&&angle>35;return{value:ball.contactH>1.5?.40:wrongSide?.54:Math.abs(x)>1?.72:.96,reason:ball.contactH>1.5?'Too high to punch - hook or cut':wrongSide?'Punch on the side of the ball':'Weight back - compact, straight bat'};}
  }
  if(['Sweep','Slog sweep','Paddle sweep'].includes(name)){
   if(ball.lengthName==='short')return{value:.28,reason:'Too high to sweep - use the back foot'};
   if(ball.lengthName==='yorker')return{value:.32,reason:'Too full to get underneath the sweep'};
   return{value:x>.58?.57:name==='Paddle sweep'&&x>.25?.68:name==='Slog sweep'?.90:.96,reason:x>.58?'Reaching outside off':name==='Paddle sweep'?'Soft hands - guide it fine':name==='Slog sweep'?'Get low and swing through the leg side':'Knee down, head over the ball'};
  }
  if(name==='Upper cut')return{value:x>.15?.92:.51,reason:x>.15?'Use the height and pace over the slips':'Too close to the body to upper-cut'};
  return ShotV7.suitability.call(ShotV7,ball,angle,mode);
 };
 const launchV7=NormalBall.launch;
 NormalBall.launch=function(out,ball,input,batter,rng){
  if(ball.scoringVersion<8||out.quality<.36)return launchV7.call(this,out,ball,input,batter,rng);
  const name=out.shot,flat=['Late cut','Leg glance','Paddle sweep'].includes(name),guided=flat?{...out,loft:false}:out;
  if(name==='Late cut')guided.angle=clamp(input.angle,118,172);
  const launch=launchV7.call(this,guided,ball,flat?{...input,mode:'ground'}:input,batter,rng),q=out.quality,incoming=Delivery.incomingSpeed(ball);
  if(flat){
   out.loft=false;launch.kind='ground';const paddle=name==='Paddle sweep',effort=launch.effort;
   launch.vx=incoming*(paddle?.42+.20*q:.52+.18*q)+(paddle?.7+6.5*effort:1.2+4.5*effort)*batter.attributes.power*q;
   launch.vy=-Math.max(1,launch.origin.h*(paddle?2.5:2.9));launch.spinRatio=.38+.16*q;
   if(name==='Late cut')launch.angle=clamp(launch.angle,118*Math.PI/180,172*Math.PI/180);
  }else if(name==='Upper cut'){
   const speed=incoming*(.78+.12*q)+(3+13*launch.effort)*batter.attributes.power*q,elevation=(22+8*q)*Math.PI/180;launch.vx=speed*Math.cos(elevation);launch.vy=speed*Math.sin(elevation);launch.angle=clamp(launch.angle,118*Math.PI/180,170*Math.PI/180);
  }
  return launch;
 };
 const View={
  batting:{x:.22,y:2.15,z:-4.4,tx:.22,ty:-.14,tz:18.4},
  forBatter(hand,full=false,width=390,height=600){const sign=hand==='left'?-1:1;return{x:.40*sign,y:2.55,z:full?-Math.max(4.8,Math.min(6.4,height/Math.max(240,width)*2.5)):-4.8,tx:.02*sign,ty:.02,tz:18.4};},
  depth(p,c){const dx=c.tx-c.x,dy=c.ty-c.y,dz=c.tz-c.z;return((p.x-c.x)*dx+(p.h-c.y)*dy+(p.z-c.z)*dz)/Math.hypot(dx,dy,dz);},
  clipNear(points,c,near=.6){
   const result=[];if(!points.length)return result;let a=points.at(-1),da=this.depth(a,c);
   for(const b of points){const db=this.depth(b,c);if((da>=near)!==(db>=near)){const k=(near-da)/(db-da);result.push({x:lerp(a.x,b.x,k),z:lerp(a.z,b.z,k),h:lerp(a.h,b.h,k)});}if(db>=near)result.push(b);a=b;da=db;}return result;
  },
  polygon(points,c,w,h){
   let out=points.map(p=>this.project(p.x,p.z,p.h,c,w,h));
   if(out.some(p=>p.depth<.6))out=this.clipNear(points,c).map(p=>this.project(p.x,p.z,p.h,c,w,h));
   if(out.every(p=>p.x>=-2&&p.x<=w+2&&p.y>=-2&&p.y<=h+2))return out;
   for(const [key,bound,sign]of [['x',-2,1],['x',w+2,-1],['y',-2,1],['y',h+2,-1]]){
    const next=[];if(!out.length)break;let a=out.at(-1),da=(a[key]-bound)*sign;
    for(const b of out){const db=(b[key]-bound)*sign;if((da>=0)!==(db>=0)){const k=da/(da-db);next.push({x:lerp(a.x,b.x,k),y:lerp(a.y,b.y,k),depth:lerp(a.depth,b.depth,k),unit:lerp(a.unit,b.unit,k)});}if(db>=0)next.push(b);a=b;da=db;}out=next;
   }return out;
  },
  segment(a,b,c,w,h){
   const da=this.depth(a,c),db=this.depth(b,c);if(da<.6&&db<.6)return null;
   if(da<.6||db<.6){const k=(.6-da)/(db-da),p={x:lerp(a.x,b.x,k),z:lerp(a.z,b.z,k),h:lerp(a.h,b.h,k)};if(da<.6)a=p;else b=p;}
   const p=this.project(a.x,a.z,a.h,c,w,h),q=this.project(b.x,b.z,b.h,c,w,h);let lo=0,hi=1;
   for(const [key,min,max]of [['x',-3,w+3],['y',-3,h+3]]){const d=q[key]-p[key];if(Math.abs(d)<1e-10){if(p[key]<min||p[key]>max)return null;}else{const a=(min-p[key])/d,b=(max-p[key])/d;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return null;}}
   return [lo,hi].map(k=>({x:lerp(p.x,q.x,k),y:lerp(p.y,q.y,k),depth:lerp(p.depth,q.depth,k),unit:lerp(p.unit,q.unit,k)}));
  },
  horizon(c,h){return h*(.43+.98*(c.ty-c.y)/Math.max(.01,Math.hypot(c.tx-c.x,c.tz-c.z)));},
  camera(play,t,age){if(!play)return{...this.batting};const ball=Fielding.ballAt(play,t),k=clamp((age-(play.physicsVersion>=6?0:180))/(play.physicsVersion>=6?360:620),0,1),mix=k*k*(3-2*k),dx=play.dx,dz=play.dz;
   const to={x:ball.x-dx*12+dz*4,y:8+ball.h*.35,z:ball.z-dz*12-dx*4,tx:ball.x+dx*4,ty:2.8+ball.h*.70,tz:ball.z+dz*4};
   return Object.fromEntries(Object.keys(to).map(key=>[key,lerp(this.batting[key],to[key],mix)]));
  },
  project(x,z,h,c,w,height){const dz=c.tz-c.z,dx=c.tx-c.x,dy=c.ty-c.y,flat=Math.hypot(dx,dz),distance=Math.hypot(flat,dy),fx=dx/distance,fy=dy/distance,fz=dz/distance,rx=dz/flat,rz=-dx/flat,ux=rz*fy,uy=flat/distance,uz=-rx*fy;
   const px=x-c.x,py=h-c.y,pz=z-c.z,depth=px*fx+py*fy+pz*fz,unit=height*.98/Math.max(.2,depth);
   return{x:w*.52+(px*rx+pz*rz)*unit,y:height*.43-(px*ux+py*uy+pz*uz)*unit,depth,unit};
  }
 };

 // Original procedural stroke animation informed by batting motion research.
 // Foot plant precedes impact; pelvis leads trunk; hands lead the bat's arc.
 const BatterRig=(()=>{
  const v=(x=0,y=0,z=0)=>({x,y,z}),add=(a,b)=>v(a.x+b.x,a.y+b.y,a.z+b.z),sub=(a,b)=>v(a.x-b.x,a.y-b.y,a.z-b.z),mul=(a,k)=>v(a.x*k,a.y*k,a.z*k),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const cross=(a,b)=>v(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x),length=a=>Math.hypot(a.x,a.y,a.z),unit=a=>mul(a,1/Math.max(1e-9,length(a))),mix=(a,b,t)=>add(mul(a,1-t),mul(b,t)),smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  function ik(start,target,a,b,pole){const raw=sub(target,start),d=clamp(length(raw),Math.abs(a-b)+.0001,a+b-.0001),axis=length(raw)<1e-8?v(0,-1,0):unit(raw),end=add(start,mul(axis,d));let bend=sub(sub(pole,start),mul(axis,dot(sub(pole,start),axis)));if(length(bend)<1e-5)bend=cross(axis,Math.abs(axis.y)<.9?v(0,1,0):v(1,0,0));bend=unit(bend);const along=(a*a-b*b+d*d)/(2*d),away=Math.sqrt(Math.max(0,a*a-along*along));return{joint:add(start,add(mul(axis,along),mul(bend,away))),end};}
  // Cubic paths retain angular velocity through impact, rather than stopping
  // at each key pose. Scalar angles avoid a flipped bat between opposite poses.
  function track(keys,t){if(t<=keys[0][0])return keys[0][1];if(t>=keys.at(-1)[0])return keys.at(-1)[1];let i=0;while(t>keys[i+1][0])i++;const a=keys[i],b=keys[i+1],prev=keys[Math.max(0,i-1)],next=keys[Math.min(keys.length-1,i+2)],d=b[0]-a[0],u=(t-a[0])/d,m0=(b[1]-prev[1])/(b[0]-prev[0]),m1=(next[1]-a[1])/(next[0]-a[0]);return(2*u*u*u-3*u*u+1)*a[1]+(u*u*u-2*u*u+u)*m0*d+(-2*u*u*u+3*u*u)*b[1]+(u*u*u-u*u)*m1*d;}
  const vectorTrack=(keys,t)=>v(...['x','y','z'].map(k=>track(keys.map(([time,p])=>[time,p[k]]),t)));
  const CONTACT_MS=0,UPPER_ARM=.31,FOREARM=.28,THIGH=.45,SHIN=.43,BAT_LENGTH=.83;
  const settle=error=>clamp(-Math.min(-8,error)*.45,35,140);
  const released=(error,elapsed)=>{const start=Math.min(-8,error),duration=settle(error);return elapsed<duration?lerp(start,0,smooth(elapsed/duration)):elapsed-duration;};
  function pose({angle=0,mode='defend',archetype='swing',height=.32,line=.05,lengthName='full',ballT=-1,duration=1500,age=null,aiming=false,avoid=0,scoringVersion=7,effort=1,contactZ=null,contactHeight=null}={}){
   const name=Shot.describe(angle,mode,{archetype,lengthName,contactH:height,scoringVersion}),sweep=['Sweep','Slog sweep','Paddle sweep'].includes(name),paddle=name==='Paddle sweep',slog=name==='Slog sweep',late=scoringVersion>=8&&name==='Late cut',upper=name==='Upper cut',pull=name==='Pull'||name==='Hook',cut=name==='Square cut'||name==='Late cut'||upper,glance=name==='Leg glance',defend=mode==='defend',punch=scoringVersion>=15&&name==='Back-foot punch',hook=scoringVersion>=15&&name==='Hook',back=!sweep&&!(scoringVersion>=15&&name==='Forward defence')&&!(scoringVersion>=16&&['Straight drive','Off drive','Cover drive','On drive','Square drive'].includes(name))&&(lengthName==='good'||lengthName==='short'||late),yorker=lengthName==='yorker',drive=!sweep&&!pull&&!cut&&!glance;
   const time=age===null?(ballT<0?(aiming?-340:-900):Math.min(aiming?-8:-240,(ballT-1)*duration)):age,recover=smooth((time-850)/650),calibrated=scoringVersion>=22,footPlant=smooth((time+570)/490)*(1-recover),plant=calibrated?smooth((time+500)/420)*(1-recover):footPlant,hipTurn=smooth((time+210)/390)*(1-recover),chestTurn=smooth((time+125)/445)*(1-recover),weight=plant;
   const intent=scoringVersion>=8?clamp(effort,.25,1):1,totalTurn=(punch?.22:hook?1.34:late?-.30:cut?-.62:pull?1.13:paddle?.24:sweep?.50:glance?.20:defend?.06:angle*.004+.16)*(scoringVersion>=8?lerp(.72,1,intent):1),yaw=1.36+totalTurn*chestTurn,hipYaw=1.36+totalTurn*hipTurn*.68;
   const side=v(Math.cos(yaw),0,Math.sin(yaw)),front=v(Math.sin(yaw),0,-Math.cos(yaw)),hipSide=v(Math.cos(hipYaw),0,Math.sin(hipYaw));
   const strikeHeight=contactHeight??height,lateReach=contactZ===null?0:clamp((-contactZ-.12)/.9,0,1),contactStep=contactZ===null?0:(contactZ-(sweep?.55:back?-.04:.11))*.60*plant*(1-smooth(time/300));
   const shiftX=(scoringVersion>=10?clamp(line+.30,-.5,.9)*.84:clamp(line+.12,-.5,.9)*.63)*plant,shiftZ=(back?(punch?-.22:-.13):drive?.20:.06)*plant+contactStep,crouch=(sweep?(scoringVersion>=8?.47:.40)*smooth((time+450)/390)*(1-recover):(yorker?.14:late?clamp((1.05-height)*.18,.035,.19):back?.05:.08)*plant)+.32*avoid;
   const pelvis=v(shiftX,.90-crouch,shiftZ),leftHip=add(pelvis,mul(hipSide,.135)),rightHip=add(pelvis,mul(hipSide,-.135));
   const step=smooth((time+570)/485),footLift=time< -85?Math.sin(step*Math.PI)*.075*(1-recover):0;
   const frontFoot=v(.095+shiftX*.92,.06+(back?0:footLift),.20+(back?(punch?-.17:-.07):drive?.43:sweep?.31:.13)*(calibrated?footPlant:plant)+contactStep),backFoot=v(-.11+shiftX*.50,.06+(back?footLift:hipTurn*.035),-.26-(back?(punch?.24:.18):0)*(calibrated?footPlant:plant)+contactStep);
   const kneePole=add(leftHip,v(.45,-.22,.43)),rightPole=mix(add(rightHip,v(.55,-.22,.1)),add(rightHip,v(.1,-.85,.4)),sweep?smooth((plant-.15)/.65):0);
   const leftLeg=ik(leftHip,frontFoot,THIGH,SHIN,kneePole),rightLeg=ik(rightHip,backFoot,THIGH,SHIN,rightPole);
   let shoulders=add(pelvis,v(.07+.13*plant,.49+(height>1.5?.06*plant:0),(back?.015:drive?.10:sweep?.11:.035)*plant));
   let leftShoulder=add(shoulders,mul(side,.205)),rightShoulder=add(shoulders,mul(side,-.205));
   const a=angle*Math.PI/180,ray=v(Math.sin(a),0,Math.cos(a));
   let direction,contactDir;
   if(cut||pull||sweep){
    const baseYaw=cut?2.77:hook?.20:pull?.36:-.79-lateReach*.85,turn=-1,arc=late?.43:paddle?.48:scoringVersion>=8?lerp(.72,1,intent):1,heading=track([[-900,0],[-560,baseYaw-turn*1.1*arc],[-180,baseYaw-turn*.88*arc],[0,baseYaw],[230,baseYaw+turn*1.65*arc],[530,baseYaw+turn*2.0*arc],[850,baseYaw+turn*2.0*arc],[1500,0]],time);
    const atContact=late?-Math.asin(clamp((.9-height)/.60,.08,.96)):sweep?-.07:hook?.18:upper?.25:-.10,elevation=track([[-900,-1.33],[-560,sweep?.28:late?.40:1.10],[-180,sweep?.16:late?.24:.88],[0,atContact],[230,slog?.43:hook?.55:upper?.62:sweep?.08:late?.04:.15],[530,slog?.82:upper?.88:sweep?.24:late?.20:.50],[850,slog?.82:upper?.88:sweep?.24:late?.20:.50],[1500,-1.33]],time),contactElevation=scoringVersion>=8?atContact:-.10;
    direction=v(Math.sin(heading)*Math.cos(elevation),Math.sin(elevation),Math.cos(heading)*Math.cos(elevation));contactDir=v(Math.sin(baseYaw)*Math.cos(contactElevation),Math.sin(contactElevation),Math.cos(baseYaw)*Math.cos(contactElevation));
   }else{
    const follow=defend?.12:punch?.90:glance?.40:mode==='loft'?3.08:2.78;
    const impactAngle=.07-lateReach*1.10,theta=track([[-900,.03],[-590,-1.45],[-300,-2.48],[-180,-2.58],[0,impactAngle],[180,follow*.82],[420,follow],[850,follow],[1500,.03]],time);
    const strokeRay=unit(mix(v(0,0,1),ray,.65));direction=add(mul(strokeRay,Math.sin(theta)),v(.10,-Math.cos(theta),0));direction=unit(direction);contactDir=unit(add(mul(strokeRay,Math.sin(impactAngle)),v(.10,-Math.cos(impactAngle),0)));
   }
   const bladeContact=.70-Math.min(.16,Math.max(.012,strikeHeight-.035)/Math.max(.08,-contactDir.y)),hit=v(clamp(line+.47,-.4,1.55),strikeHeight,contactZ??(sweep?.55:back?-.04:.11)),contactGrip=sub(hit,mul(contactDir,bladeContact));
   const lift=scoringVersion>=17&&mode==='loft'?.12:0,restGrip=v(.32,.745,.025),loadedGrip=sweep?v(.48+shiftX*.65,.96-.18*plant+lift,-.03):v(.26+shiftX*.7,1.10+lift,-.16+shiftZ*.6);
   let extension=add(contactGrip,add(mul(ray,defend?.025:punch?.055:.15),v(defend?0:-.07,defend?.025:punch?.10:.20,0)));
   if(cut||pull)extension=v(.65+shiftX,contactGrip.y-.035,.18+shiftZ);if(sweep)extension=v(.55+shiftX,contactGrip.y+.015,.22+shiftZ);
   const preContact=mix(loadedGrip,contactGrip,.52);if(height>1.2)preContact.x=Math.max(preContact.x,Math.max(leftShoulder.x,rightShoulder.x)+.24);
   let finishGrip=v(.46+shiftX,1.43,.25+shiftZ);if(cut)finishGrip=v(.50+shiftX,upper?1.44:1.25,.25+shiftZ);if(pull)finishGrip=v(.36+shiftX,hook?1.52:1.24,.10+shiftZ);if(punch)finishGrip=add(contactGrip,v(0,.12,.11));if(sweep)finishGrip=v(.40+shiftX,slog?.89:.55,.16+shiftZ);if(defend||glance||late||paddle)finishGrip=add(contactGrip,v(0,late?.13:.035,late?.15:.06));
   let grip=vectorTrack([[-900,restGrip],[-520,loadedGrip],[-190,loadedGrip],[-90,preContact],[0,contactGrip],[150,extension],[430,finishGrip],[850,calibrated?mix(finishGrip,restGrip,.10):finishGrip],[1500,restGrip]],time);
   // Keep the hands in front of the shoulder capsule during the high
   // part of a stroke, leaving space for a bent elbow and the helmet.
   for(let pass=0;pass<1;pass++)for(const [root,offset]of [[leftShoulder,-.025],[rightShoulder,.07]]){const wrist=add(grip,mul(direction,offset)),crossDistance=(wrist.y-root.y)**2+(wrist.z-root.z)**2,inside=clamp(1-crossDistance/(.23*.23),0,1);grip.x+=Math.max(0,root.x+.23*Math.sqrt(inside)-wrist.x)*smooth(inside);}
   // Lean into the reachable stroke before clamping a genuinely wide reach.
   let lean=v();for(let i=0;i<5;i++)for(const [shoulder,offset]of [[leftShoulder,-.025],[rightShoulder,.07]]){const delta=sub(add(grip,mul(direction,offset)),add(shoulder,lean)),excess=length(delta)-.568;if(excess>0)lean=add(lean,mul(unit(delta),excess*.58));}const leanLimit=scoringVersion>=8&&sweep?.25:.19;if(length(lean)>leanLimit)lean=mul(unit(lean),leanLimit);
   shoulders=add(shoulders,lean);leftShoulder=add(leftShoulder,lean);rightShoulder=add(rightShoulder,lean);
   for(let i=0;i<12;i++)for(const [root,offset]of [[leftShoulder,-.025],[rightShoulder,.07]]){const target=add(grip,mul(direction,offset)),delta=sub(target,root),len=length(delta);if(len>.578)grip=sub(grip,mul(unit(delta),len-.578));}
   const leftWrist=add(grip,mul(direction,-.025)),rightWrist=add(grip,mul(direction,.07));
   const highElbow=(drive||defend)&&time> -300&&time<450?smooth((time+300)/210)*(1-smooth((time-130)/320)):0;
   // Transport the elbow plane with the shoulder-to-wrist axis. A fixed pole
   // flips sides when the arm passes it, producing a visibly broken elbow.
   const armPole=(root,wrist,theta)=>{const axis=unit(sub(wrist,root)),k=v(0,-axis.z,axis.y),base=v(0,Math.cos(theta),Math.sin(theta)),bend=add(base,add(cross(k,base),mul(cross(k,cross(k,base)),1/Math.max(.015,1+axis.x))));return add(root,bend);};
   const leftPole=armPole(leftShoulder,leftWrist,lerp(2.1,1.45,highElbow)),rightArmPole=armPole(rightShoulder,rightWrist,3.8);
   const leftArm=ik(leftShoulder,leftWrist,UPPER_ARM,FOREARM,leftPole),rightArm=ik(rightShoulder,rightWrist,UPPER_ARM,FOREARM,rightArmPole);
   const head=add(shoulders,v(.025,.223,.07+(!back?.045*plant:0))),knob=add(grip,mul(direction,-.13)),bladeTop=add(grip,mul(direction,.11)),toe=add(grip,mul(direction,.70)),sweetSpot=add(grip,mul(direction,.54));
   const faceAim=unit(add(ray,v(0,mode==='loft'&&!late&&!paddle?.40:-(cut||pull||sweep?.18:.08),0)));let batFace=sub(faceAim,mul(direction,dot(faceAim,direction)));if(length(batFace)<.08)batFace=v(0,0,1);batFace=unit(batFace);const batWidth=unit(cross(direction,batFace));batFace=unit(cross(batWidth,direction));
   return{name,side,front,hipSide,pelvis,shoulders,head,leftShoulder,rightShoulder,leftHip,rightHip,leftKnee:leftLeg.joint,rightKnee:rightLeg.joint,leftAnkle:leftLeg.end,rightAnkle:rightLeg.end,leftElbow:leftArm.joint,rightElbow:rightArm.joint,leftWrist:leftArm.end,rightWrist:rightArm.end,grip,knob,bladeTop,toe,sweetSpot,contactPoint:add(grip,mul(direction,bladeContact)),batWidth,batFace,direction,weight,yaw,hipYaw,headLook:unit(v(clamp(line,-.5,.8)*.22,-.08-(height<.5?.22*plant:0),1)),phase:time< -180?'prepare':time<0?'downswing':time<850?'follow-through':'recover'};
  }
  return{pose,ik,settle,released,CONTACT_MS,UPPER_ARM,FOREARM,THIGH,SHIN,BAT_LENGTH,v,add,sub,mul,dot,cross,length,unit,mix,smooth};
 })();

 const FielderRig={
  pose(f,time){
   const R=BatterRig,{v,add,sub,mul,unit,length,mix,ik,smooth}=R,raw=f.batting&&(f.moving||f.grounding)?v(f.grounding?Math.sin(f.turnProgress*Math.PI):0,1,(f.direction||1)*(f.grounding?Math.cos(f.turnProgress*Math.PI):1)):f.hands?sub(v(f.hands.x,f.hands.h,f.hands.z),v(f.x,0,f.z)):f.look?v(f.look.x-f.x,1,f.look.z-f.z):v(-f.x,1,-f.z||-1),facing=f.heading?v(f.heading.x,0,f.heading.z):f.look?v(f.look.x-f.x,0,f.look.z-f.z):v(raw.x,0,raw.z),initial=f.bowling?v(0,0,-1):length(facing)<1e-6?unit(v(-f.x,0,-f.z||-1)):unit(facing),turn=(a,b,k)=>{const yaw=Math.atan2(a.x,a.z),end=Math.atan2(b.x,b.z),n=yaw+Math.atan2(Math.sin(end-yaw),Math.cos(end-yaw))*k;return v(Math.sin(n),0,Math.cos(n));},watch=f.faceBall?turn(initial,v(f.faceBall.x-f.x,0,f.faceBall.z-f.z),f.faceBlend||0):initial,front=f.throwLook?turn(watch,v(f.throwLook.x-f.x,0,f.throwLook.z-f.z),f.throwBlend??1):watch,side=v(front.z,0,-front.x),up=v(0,1,0),p=(s,h,a=0)=>add(mul(side,s),add(v(0,h,0),mul(front,a)));
   const groundBat=f.batting&&(f.moving&&f.progress>.86||f.grounding),blend=f.actionBlend||0,collect=['pickup','throw','catch','break'].includes(f.action),crouch=groundBat?.16:collect?lerp(f.id==='keeper'?.17:.035,clamp(.90-raw.y,0,.56),blend):f.id==='keeper'?.17:.035,activity=f.gait??(f.moving?1:0),cycle=f.travel!==undefined?f.travel/1.36:time*2.4,run=Math.sin(cycle*Math.PI*2)*activity,phase=f.bowlingPhase||0,jump=f.jump||0,lift=f.bowling?smooth((phase-.83)/.12)*(1-smooth((phase-1.02)/.16))*.12:0;
   const pelvis=p(run*.012,.88-crouch+jump+lift+Math.sin(cycle*Math.PI*4)*.014*activity,.13*activity),hips=[add(pelvis,mul(side,-.13)),add(pelvis,mul(side,.13))],ankles=[-1,1].map((sign,i)=>{if(f.teamVersion===10){const phase=(cycle+i*.5)%1,stance=phase<.54,u=stance?phase/.54:(phase-.54)/.46;return p(sign*lerp(.13,.21,collect?blend:0),.055+jump+(stance?0:Math.sin(u*Math.PI)*.145)*activity,(stance?lerp(.365,-.365,u):lerp(-.365,.365,smooth(u)))*activity);}return p(sign*(collect?.22:.13),.055+jump+Math.max(0,run*sign)*.12,run*sign*.30+(collect?.04:0));}),legs=hips.map((hip,i)=>ik(hip,ankles[i],.45,.43,add(hip,add(mul(front,.6),v(0,-.3,0)))));
   let shoulders=add(pelvis,p(0,.49,lerp(.035,.16,collect?blend:0))),roots=[add(add(shoulders,mul(side,-.20)),mul(front,run*.045)),add(add(shoulders,mul(side,.20)),mul(front,-run*.045))];
   const hands=[-1,1].map(sign=>{
    if(f.ceremony==='cheer')return p(sign*.35,1.94+.06*Math.sin(time*2+sign),.10);
    if(f.ceremony==='clap')return p(sign*(.08+.07*(1+Math.sin(time*5))*.5),1.32,.38);
    if(f.ceremony==='dejected')return p(sign*.22,.90,.02);
    if(f.umpire&&f.signal==='out')return sign===1?p(.20,2.03,.02):p(-.24,.90,.04);
    if(f.umpire&&['four','six'].includes(f.signal)){const k=f.signalBlend??1,rest=p(sign*.24,.90,.04),target=f.signal==='six'?p(sign*.26,2.03,.03):sign===1?p(.08+.40*Math.sin((f.signalAge||0)*2.3),1.25,.30):rest;return mix(rest,target,k);}
    if(groundBat&&sign===1)return v(f.tip.x-f.x,.70,f.tip.z-f.z-(f.direction||1)*.48);
    if(f.throwStage!==undefined&&f.action==='throw'){const k=clamp(f.throwStage,0,3),rest=p(sign*.24,1.01,.12),gather=add(raw,mul(side,sign*(f.id==='keeper'?.075:.058))),target=sign===1?(k<=1&&f.hands?v(f.hands.x-f.x,f.hands.h,f.hands.z-f.z):p(.20,1.72-Math.max(0,Math.min(k,1.6)-1)*.6,.0472727+.50*Math.max(0,Math.min(k,1.6)-1))):p(-.24,1.22,.20-Math.max(0,Math.min(k,1.6)-.5)*.25);return mix(mix(gather,target,smooth((k-.20)/.42)),rest,smooth((k-1.6)/1.4));}
    if(f.bowling){const a=phase*Math.PI*2,release=phase>.70,wrist=release&&sign===(f.delivery?.arm==='left'?-1:1)?p(sign*.18,1.46-crouch+jump+lift+Math.cos(a)*.57,Math.sin(a)*.52):p(sign*.22,1.12+Math.sin(a+sign)*.20,Math.cos(a+sign)*.28);return wrist;}
    const rest=p(sign*.24,1.01-crouch+jump,-run*sign*.18+.12),reach=Math.hypot(raw.x,raw.z),target=reach>.72?v(raw.x*.72/reach,raw.y,raw.z*.72/reach):raw;
    return f.hands&&f.action!=='run'?mix(rest,add(target,mul(side,sign*(f.id==='keeper'?.075:.058))),blend):rest;
   });
   let lean=v();for(let pass=0;pass<5;pass++)for(let i=0;i<2;i++){const d=sub(hands[i],add(roots[i],lean)),excess=length(d)-.578;if(excess>0)lean=add(lean,mul(unit(d),excess*.6));}if(length(lean)>.28)lean=mul(unit(lean),.28);
   shoulders=add(shoulders,lean);roots=roots.map(r=>add(r,lean));const arms=roots.map((root,i)=>ik(root,hands[i],.31,.28,add(root,add(mul(side,i?.55:-.55),add(mul(front,.12),v(0,-.45,0))))));
   return{front,side,up,pelvis,shoulders,head:add(shoulders,p(0,.225,.035)),hips,knees:legs.map(l=>l.joint),ankles:legs.map(l=>l.end),roots,elbows:arms.map(a=>a.joint),wrists:arms.map(a=>a.end),targets:hands,crouch};
  }
 };
 const NAMES=['Theo Mercer','Jai Bennett','Owen Hart','Samir Hale','Leo Ashford','Callum Reed','Nikhil Ward','Milo Shaw','Reuben Pike','Ashwin Cole','Kit Palmer'];
 const Match={
  create(seed,names=NAMES,bowlerNames=BOWLERS.map(b=>b.name),maxOvers=20){if(![3,5,10,20].includes(maxOvers))throw Error('Choose 3, 5, 10 or 20 overs.');return{version:4,format:'BATTING_INNINGS',seed:seed>>>0,rngState:seed>>>0,maxOvers,runs:0,wickets:0,balls:0,extras:0,striker:0,nonStriker:1,nextBatter:2,complete:false,batters:NAMES.map((n,i)=>({id:'b'+i,name:(names[i]||n).slice(0,32),runs:0,balls:0,fours:0,sixes:0,dismissal:'',attributes:{rating:68,timing:1,power:i<7?.98:.94,matchups:{swing:1,seam:1,legspin:1,offspin:1,leftpace:1}}})),bowlers:BOWLERS.slice(0,maxOvers===3?3:5).map((b,i)=>({...b,name:(bowlerNames[i]||b.name).slice(0,32),balls:0,runs:0,wickets:0})),history:[]};},
  apply(match,ball,result){if(match.complete)throw Error('Innings is complete');const m=JSON.parse(JSON.stringify(match)),over=Math.floor(m.balls/6),b=m.batters[m.striker],bowler=m.bowlers[Rotation.bowler(over,m.maxOvers)];
   if(ball.bowler!==Rotation.bowler(over,m.maxOvers))throw Error('Wrong bowler for this over');
   const entry={over,ball:m.balls%6+1,batter:m.striker,delivery:ball,...result};m.runs+=result.runs;bowler.runs+=result.runs;m.rngState=result.rngState;
   if(result.wide)m.extras+=result.runs;else{m.balls++;bowler.balls++;b.balls++;b.runs+=result.runs;if(result.runs===4)b.fours++;if(result.runs===6)b.sixes++;}
   if(result.wicket){m.wickets++;bowler.wickets++;b.dismissal=(result.title==='Bowled'?'b ':'c '+(result.fielder||'fielder')+' b ')+bowler.name;if(m.wickets<10)m.striker=m.nextBatter++;}
   else if(!result.wide&&result.runs%2===1)[m.striker,m.nonStriker]=[m.nonStriker,m.striker];
   if(!result.wide&&m.balls%6===0)[m.striker,m.nonStriker]=[m.nonStriker,m.striker];
   m.complete=m.balls>=m.maxOvers*6||m.wickets>=10;m.history.push(entry);return m;
  },
  overs(balls){return Math.floor(balls/6)+'.'+balls%6;}
 };
 // Save schema is versioned independently from later season/economy additions.
 const Save={
  validate(data){if(!data||![1,2,3,4].includes(data.schema)||![1,2,3,4].includes(data.engine)||!data.match)throw Error('This is not a supported cricket save.');const m=data.match;
   const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
   if(!integer(m.seed,0,4294967295)||!integer(m.rngState,0,4294967295)||!integer(m.balls,0,m.maxOvers*6)||!integer(m.wickets,0,10)||!integer(m.runs,0,5000)||!integer(m.extras,0,5000)||!Array.isArray(m.batters)||m.batters.length!==11||!Array.isArray(m.history)||m.history.length>500||![3,5,10,20].includes(m.maxOvers)||!['T20_PROTOTYPE','BATTING_INNINGS'].includes(m.format))throw Error('The save contains invalid innings data.');
   if(!integer(m.striker,0,10)||!integer(m.nonStriker,0,10)||m.striker===m.nonStriker||!integer(m.nextBatter,2,11)||!Array.isArray(m.bowlers)||m.bowlers.length!==(m.maxOvers===3?3:5))throw Error('The save contains an invalid team.');
   for(const b of m.batters)if(typeof b.name!=='string'||b.name.length>32||!b.name.trim()||!integer(b.runs,0,5000)||!integer(b.balls,0,m.maxOvers*6)||!integer(b.fours,0,m.maxOvers*6)||!integer(b.sixes,0,m.maxOvers*6)||typeof b.dismissal!=='string'||!b.attributes||b.attributes.timing!==1||![.94,.98].includes(b.attributes.power)||['swing','seam','legspin'].some(k=>b.attributes.matchups?.[k]!==1))throw Error('The save contains invalid player data.');
   if(!['ready','flight','result','finished'].includes(data.phase)||!Number.isFinite(data.elapsed)||data.elapsed< -850||data.elapsed>10000)throw Error('The save contains an invalid delivery state.');
   if(m.complete!==(m.balls>=m.maxOvers*6||m.wickets>=10)||m.complete!==(data.phase==='finished'))throw Error('The innings status is inconsistent.');
   if(!Number.isFinite(data.resultAge)||data.resultAge<0||data.resultAge>1000000000)throw Error('The animation state is invalid.');
   if((data.phase==='result'||data.phase==='finished')&&(!m.history.length||!data.pending||JSON.stringify(data.pending)!==JSON.stringify(m.history.at(-1).delivery)))throw Error('The last delivery is missing or inconsistent.');
   if(data.phase==='ready'&&(m.history.length||data.pending||data.shot))throw Error('The start state is inconsistent.');
   if(m.batters.reduce((s,b)=>s+b.runs,0)+m.extras!==m.runs||m.batters.reduce((s,b)=>s+b.balls,0)!==m.balls)throw Error('The score does not add up.');
   let legal=0,runs=0,wickets=0,extras=0;
   for(const h of m.history){if(!h||!integer(h.runs,0,6)||typeof h.wicket!=='boolean'||typeof h.wide!=='boolean'||!integer(h.over,0,m.maxOvers-1)||!integer(h.batter,0,10)||h.over!==Math.floor(legal/6)||h.ball!==legal%6+1||typeof h.title!=='string'||typeof h.detail!=='string'||typeof h.timing!=='string'||typeof h.contact!=='boolean'||typeof h.loft!=='boolean'||!Number.isFinite(h.angle)||Math.abs(h.angle)>180||!Number.isFinite(h.distance)||h.distance<0||h.distance>120||!Number.isFinite(h.quality)||h.quality<0||h.quality>1||!h.delivery||h.delivery.bowler!==Rotation.bowler(h.over,m.maxOvers))throw Error('The ball history is invalid.');if(h.wide){if(h.runs!==1||h.wicket)throw Error('Invalid wide.');extras+=h.runs;}else legal++;runs+=h.runs;wickets+=Number(h.wicket);}
   if(legal!==m.balls||runs!==m.runs||wickets!==m.wickets||extras!==m.extras)throw Error('The ball history does not match the score.');
   for(let i=0;i<m.bowlers.length;i++){const b=m.bowlers[i],rows=m.history.filter(h=>h.delivery.bowler===i);if(b.id!==BOWLERS[i].id||typeof b.name!=='string'||!b.name.trim()||b.name.length>32||b.balls!==rows.filter(h=>Rules.legal(h)).length||b.runs!==rows.reduce((s,h)=>s+h.runs,0)||b.wickets!==rows.filter(h=>h.wicket).length)throw Error('The bowling figures do not match.');}
   if(data.pending){const b=data.pending;if(!BOWLERS.some(x=>x.id===b.archetype)||!integer(b.bowler,0,m.bowlers.length-1)||!['speed','length','line','releaseX','swing','kick','contactH','duration','bounceT'].every(k=>Number.isFinite(b[k]))||b.duration<800||b.duration>4000||b.bounceT<(b.trajectoryVersion===4?.35:.4)||b.bounceT>.999||Math.abs(b.line)>2||Math.abs(b.swing)>.5||Math.abs(b.kick)>.6||b.contactH<0||b.contactH>2||!['yorker','full','good','short'].includes(b.lengthName))throw Error('The pending delivery is invalid.');}
   if(data.pending?.trajectoryVersion===4){const b=data.pending;if(!['preTime','postTime','releaseH'].every(k=>Number.isFinite(b[k])&&b[k]>0)||b.preTime>2||b.postTime>2||b.releaseH>3||b.family!==BOWLERS[b.bowler].family||b.archetype!==BOWLERS[b.bowler].id||b.scoringVersion!==4)throw Error('The delivery trajectory is invalid.');}
   if(data.phase==='flight'&&(!data.pending||data.pending.bowler!==Rotation.bowler(Math.floor(m.balls/6),m.maxOvers)||m.complete))throw Error('The pending delivery does not match the innings.');
   if(data.shot&&(!Number.isFinite(data.shot.error)||Math.abs(data.shot.error)>10000||!Number.isFinite(data.shot.angle)||Math.abs(data.shot.angle)>180||!['defend','ground','loft'].includes(data.shot.mode)))throw Error('The saved shot is invalid.');
   const copy=JSON.parse(JSON.stringify(data));if(copy.engine===1)for(const b of copy.match.batters)b.rulesVersion=1;copy.schema=4;copy.engine=4;return copy;
  }
 };
 // Real names, original game ratings and editable fantasy XIs. These are not
 // asserted to be the current official playing elevens of any competition.
 const Squad=(()=>{
  const names=s=>s.split(';');
  const defs=[
   ['eng','England','London',names('Phil Salt;Jos Buttler;Ben Duckett;Harry Brook;Will Jacks;Sam Curran;Liam Dawson;Jofra Archer;Adil Rashid;Jamie Overton;Luke Wood'),[[7,'swing'],[9,'seam'],[8,'legspin'],[6,'offspin','left'],[10,'leftpace']],names('Zak Crawley;Ben Duckett;Ollie Pope;Joe Root;Harry Brook;Ben Stokes;Jamie Smith;Jofra Archer;Brydon Carse;Shoaib Bashir;Josh Tongue'),[[7,'swing'],[8,'seam'],[9,'offspin'],[3,'offspin'],[10,'seam']]],
   ['ind','India','Mumbai',names('Abhishek Sharma;Sanju Samson;Suryakumar Yadav;Tilak Varma;Hardik Pandya;Shivam Dube;Axar Patel;Kuldeep Yadav;Jasprit Bumrah;Arshdeep Singh;Harshit Rana'),[[8,'seam'],[10,'seam'],[7,'legspin','left'],[6,'offspin','left'],[9,'leftpace']],names('Yashasvi Jaiswal;KL Rahul;Sai Sudharsan;Shubman Gill;Rishabh Pant;Ravindra Jadeja;Washington Sundar;Kuldeep Yadav;Akash Deep;Jasprit Bumrah;Mohammed Siraj'),[[9,'seam'],[10,'swing'],[7,'legspin','left'],[5,'offspin','left'],[8,'seam']]],
   ['aus','Australia','Sydney',names('Travis Head;Mitchell Marsh;Steve Smith;Josh Inglis;Glenn Maxwell;Tim David;Cameron Green;Adam Zampa;Nathan Ellis;Xavier Bartlett;Ben Dwarshuis'),[[9,'swing'],[8,'seam'],[7,'legspin'],[4,'offspin'],[10,'leftpace']],names('Jake Weatherald;Travis Head;Marnus Labuschagne;Steve Smith;Cameron Green;Alex Carey;Beau Webster;Pat Cummins;Mitchell Starc;Nathan Lyon;Josh Hazlewood'),[[10,'seam'],[7,'seam'],[9,'offspin'],[8,'leftpace'],[4,'seam']]],
   ['sa','South Africa','Cape Town',names('Ryan Rickelton;Quinton de Kock;Aiden Markram;Tristan Stubbs;David Miller;Dewald Brevis;Marco Jansen;Keshav Maharaj;Kagiso Rabada;Anrich Nortje;Lungi Ngidi'),[[8,'seam'],[9,'seam'],[7,'offspin','left'],[2,'offspin'],[6,'leftpace']],names('Aiden Markram;Ryan Rickelton;Tristan Stubbs;Temba Bavuma;David Bedingham;Kyle Verreynne;Wiaan Mulder;Marco Jansen;Keshav Maharaj;Kagiso Rabada;Lungi Ngidi'),[[9,'seam'],[10,'seam'],[8,'offspin','left'],[0,'offspin'],[7,'leftpace']]],
   ['nz','New Zealand','Auckland',names('Finn Allen;Devon Conway;Rachin Ravindra;Daryl Mitchell;Glenn Phillips;Mark Chapman;Mitchell Santner;Ish Sodhi;Matt Henry;Lockie Ferguson;Kyle Jamieson'),[[8,'swing'],[9,'seam'],[7,'legspin'],[6,'offspin','left'],[10,'seam']],names('Tom Latham;Devon Conway;Kane Williamson;Rachin Ravindra;Daryl Mitchell;Tom Blundell;Michael Bracewell;Mitchell Santner;Matt Henry;Jacob Duffy;Nathan Smith'),[[8,'swing'],[9,'seam'],[7,'offspin','left'],[6,'offspin'],[10,'seam']]],
   ['pak','Pakistan','Lahore',names('Saim Ayub;Fakhar Zaman;Babar Azam;Sahibzada Farhan;Salman Agha;Shadab Khan;Mohammad Nawaz;Faheem Ashraf;Shaheen Afridi;Naseem Shah;Abrar Ahmed'),[[9,'swing'],[7,'seam'],[5,'legspin'],[6,'offspin','left'],[8,'leftpace']],names('Abdullah Shafique;Shan Masood;Babar Azam;Saud Shakeel;Mohammad Rizwan;Salman Agha;Faheem Ashraf;Sajid Khan;Noman Ali;Naseem Shah;Shaheen Afridi'),[[9,'swing'],[6,'seam'],[7,'offspin'],[8,'offspin','left'],[10,'leftpace']]],
   ['sl','Sri Lanka','Colombo',names('Pathum Nissanka;Kusal Perera;Kusal Mendis;Kamindu Mendis;Charith Asalanka;Dasun Shanaka;Dunith Wellalage;Dushan Hemantha;Maheesh Theekshana;Dushmantha Chameera;Matheesha Pathirana'),[[9,'swing'],[10,'seam'],[7,'legspin'],[8,'offspin'],[6,'offspin','left']],names('Pathum Nissanka;Oshada Fernando;Dinesh Chandimal;Kamindu Mendis;Dhananjaya de Silva;Kusal Mendis;Milan Rathnayake;Prabath Jayasuriya;Asitha Fernando;Lahiru Kumara;Nishan Peiris'),[[8,'swing'],[9,'seam'],[7,'offspin','left'],[10,'offspin'],[6,'seam']]],
   ['wi','West Indies','Bridgetown',names('Brandon King;Johnson Charles;Shai Hope;Shimron Hetmyer;Rovman Powell;Roston Chase;Jason Holder;Akeal Hosein;Romario Shepherd;Shamar Joseph;Jayden Seales'),[[10,'swing'],[9,'seam'],[7,'offspin','left'],[5,'offspin'],[6,'seam']],names('John Campbell;Tagenarine Chanderpaul;Alick Athanaze;Shai Hope;Kavem Hodge;Roston Chase;Justin Greaves;Tevin Imlach;Jomel Warrican;Kemar Roach;Jayden Seales'),[[9,'swing'],[10,'seam'],[8,'offspin','left'],[5,'offspin'],[6,'seam']]]
  ];
  const team=(d,format,index)=>{const isTest=format==='TEST',list=isTest?d[5]:d[3],attack=isTest?d[6]:d[4];return{id:d[0],name:isTest?d[1]:d[2],nation:d[1],rating:84-index*1.25,colour:['#739bbb','#7eaecc','#d0b968','#7aa888','#bac9d0','#6aab89','#929eca','#b7847e'][index],xi:list.map((name,i)=>({id:d[0]+'-'+i,name,batting:i<6?84-(i%3)*2:i<8?66:39+(i%3)*5})),attack:attack.map(([i,type,arm],j)=>{const base=BOWLERS.find(b=>b.id===type);return{...base,id:d[0]+'-bowler-'+i,player:i,name:list[i],archetype:type,arm:arm||base.arm,rating:(i<5?65:85)-(j%3)*2,style:arm==='left'?(type==='legspin'?'Left-arm wrist spin':'Left-arm finger spin'):base.style};})};};
  return{teams(format){return defs.map((d,i)=>team(d,format,i));},team(format,id){const index=defs.findIndex(d=>d[0]===id);if(index<0)throw Error('Unknown team');return team(defs[index],format,index);}};
 })();
 const Innings={
  order(bowlers,format){const pace=bowlers.map((b,i)=>!b.family.includes('spin')?i:-1).filter(i=>i>=0),spin=bowlers.map((b,i)=>b.family.includes('spin')?i:-1).filter(i=>i>=0),base=[pace[0],spin[0],pace[1],spin[1],...bowlers.map((_,i)=>i)].filter((x,i,a)=>x!==undefined&&a.indexOf(x)===i);return format==='TEST'?base:Array.from({length:20},(_,i)=>base[i%base.length]);},
  create(seed,batting,bowling,format,side,number=1,target=null){const m=Match.create(seed,batting.xi.map(p=>p.name),bowling.attack.map(b=>b.name),20);m.version=5;m.format=format;m.side=side;m.teamId=batting.id;m.teamName=batting.name;m.bowlingName=bowling.name;m.number=number;m.target=target;m.limitBalls=format==='T20'?120:null;m.maxOvers=format==='T20'?20:450;m.endReason=null;m.bowlers=bowling.attack.map(b=>({...b,balls:0,runs:0,wickets:0}));m.order=this.order(m.bowlers,format);m.batters=m.batters.map((b,i)=>({...b,name:batting.xi[i].name,attributes:{rating:batting.xi[i].batting,timing:.85+batting.xi[i].batting/560,power:.78+batting.xi[i].batting/370,matchups:{swing:1,seam:1,legspin:1,offspin:1,leftpace:1}}}));return m;},
  bowler(m,over=Math.floor(m.balls/6)){return m.version>=5?m.order[over%m.order.length]:Rotation.bowler(over,m.maxOvers);},
  delivery(m){const index=this.bowler(m),owner=m.bowlers[index],kind=BOWLERS.findIndex(b=>b.id===owner.archetype),d=Delivery.create(m.rngState,kind,5),ball={...d.ball,bowler:index,scoringVersion:8,format:m.format,arm:owner.arm};if(ball.lengthName==='short'&&!ball.family.includes('spin')){ball.postTime=ball.length/(ball.speed/3.6*.64);ball.duration=(ball.preTime+ball.postTime)*2600;ball.bounceT=ball.preTime/(ball.preTime+ball.postTime);}if(owner.arm==='left'&&owner.family.includes('spin')){ball.kick*=-1;ball.releaseX=-.54;}return{ball,rngState:d.rngState};},
  field(m,ball){const owner=m.bowlers[ball?.bowler??this.bowler(m)],index=BOWLERS.findIndex(b=>b.id===(ball?.archetype||owner.archetype));return FIELDS[Math.max(0,index)];},
  apply(m,ball,result){if(m.complete)throw Error('This innings is closed');if(ball.bowler!==this.bowler(m))throw Error('Wrong bowler');const n={...m,batters:m.batters.map(b=>({...b})),bowlers:m.bowlers.map(b=>({...b})),history:m.history.slice()},b=n.batters[n.striker],bowler=n.bowlers[ball.bowler];
   if(n.history.length){const last=n.history.at(-1);n.history[n.history.length-1]={...last,play:undefined,retrieval:undefined,delivery:{bowler:last.delivery.bowler,archetype:last.delivery.archetype,lengthName:last.delivery.lengthName,variation:last.delivery.variation,speed:last.delivery.speed}};}
   const entry={...result,over:Math.floor(n.balls/6),ball:n.balls%6+1,batter:n.striker,delivery:ball};n.runs+=result.runs;bowler.runs+=result.runs;n.rngState=result.rngState;
   if(result.wide)n.extras+=result.runs;else{n.balls++;bowler.balls++;b.balls++;b.runs+=result.runs;if(result.runs===4)b.fours++;if(result.runs===6)b.sixes++;}
   if(result.wicket){n.wickets++;bowler.wickets++;b.dismissal=(result.title==='Bowled'?'b ':'c '+(result.fielder||'fielder')+' b ')+bowler.name;if(n.wickets<10)n.striker=n.nextBatter++;}
   else if(!result.wide&&result.runs%2)[n.striker,n.nonStriker]=[n.nonStriker,n.striker];if(!result.wide&&n.balls%6===0)[n.striker,n.nonStriker]=[n.nonStriker,n.striker];
   n.history.push(entry);n.complete=n.wickets>=10||n.limitBalls!==null&&n.balls>=n.limitBalls||n.target!==null&&n.runs>=n.target;n.endReason=n.complete?(n.target!==null&&n.runs>=n.target?'target':n.wickets>=10?'all out':'overs'):null;return n;
  },
  close(m,reason='declared'){return{...m,complete:true,endReason:reason};},
  compact(m){return{...m,history:[],batters:m.batters.map(b=>({...b})),bowlers:m.bowlers.map(b=>({...b}))};}
 };
 const Contest={
  DAY:21600,LIMIT:108000,
  create(seed,format,home,away,playerId){const rng=RNG.stream(seed),toss=rng.next()<.5?0:1,first=rng.next()<.55?toss:1-toss,teams=[home,away],m=Innings.create(rng.state,teams[first],teams[1-first],format,first);return{version:5,seed:seed>>>0,format,teams,playerId,first,innings:[m],phase:'play',nextSide:null,clockSeconds:0,followOn:false,result:null,toss:teams[toss].name+' won the toss and chose to '+(first===toss?'bat':'bowl'),rngState:rng.state};},
  current(c){return c.innings.at(-1);},
  ownTurn(c){return this.current(c).teamId===c.playerId;},
  totals(c){return[0,1].map(side=>c.innings.filter(m=>m.side===side).reduce((n,m)=>n+m.runs,0));},
  counts(c){return[0,1].map(side=>c.innings.filter(m=>m.side===side&&m.complete).length);},
  won(c,side,detail){return{...c,phase:'complete',result:{kind:'win',winner:side,winnerId:c.teams[side].id,detail:c.teams[side].name+' won '+detail}};},
  assess(c){const m=this.current(c),totals=this.totals(c),counts=this.counts(c),i=c.innings.length;
   if(c.format==='T20'){
    if(i===2&&m.runs>=m.target)return this.won(c,m.side,'by '+(10-m.wickets)+' wicket'+(10-m.wickets===1?'':'s'));
    if(i===2&&m.complete){if(totals[0]===totals[1])return{...c,phase:'complete',result:{kind:'tie',winner:null,winnerId:null,detail:'Match tied'}};const win=totals[0]>totals[1]?0:1;return this.won(c,win,'by '+Math.abs(totals[0]-totals[1])+' runs');}
   }else{
    for(const side of [0,1])if(counts[1-side]===2&&totals[side]>totals[1-side])return this.won(c,side,c.innings.filter(n=>n.side===side).length===1?'an innings and '+(totals[side]-totals[1-side])+' runs':'by '+(m.side===side&&!m.complete?10-m.wickets:m.side===side&&m.endReason==='target'?10-m.wickets:Math.abs(totals[0]-totals[1]))+(m.side===side&&m.endReason==='target'||m.side===side&&!m.complete?' wickets':' runs'));
    if(counts[0]===2&&counts[1]===2)return{...c,phase:'complete',result:{kind:'tie',winner:null,winnerId:null,detail:'Test match tied'}};
    if(c.clockSeconds>=this.LIMIT)return{...c,phase:'complete',result:{kind:'draw',winner:null,winnerId:null,detail:'Match drawn - end of day five'}};
   }
   if(!m.complete)return{...c,phase:'play'};
   if(c.format==='TEST'&&i===2&&totals[c.first]-totals[1-c.first]>=200){const own=c.teams[c.first].id===c.playerId;if(own)return{...c,phase:'followOn',nextSide:null};return{...c,phase:'interval',followOn:true,nextSide:1-c.first};}
   return{...c,phase:'interval',nextSide:1-m.side};
  },
  apply(c,ball,result){if(c.phase!=='play')throw Error('Continue the match first');const m=Innings.apply(this.current(c),ball,result),innings=[...c.innings.slice(0,-1),m],next={...c,innings,rngState:m.rngState,clockSeconds:c.clockSeconds+(c.format==='TEST'?40:0)};return this.assess(next);},
  withPrepared(c,rngState){const innings=c.innings.slice();innings[innings.length-1]={...innings.at(-1),rngState};return{...c,innings,rngState};},
  declare(c){if(c.format!=='TEST'||c.phase!=='play'||this.current(c).complete)throw Error('An innings cannot be declared now');return this.assess({...c,innings:[...c.innings.slice(0,-1),Innings.close(this.current(c))]});},
  chooseFollowOn(c,enforce){if(c.phase!=='followOn')throw Error('No follow-on decision is due');return{...c,followOn:!!enforce,nextSide:enforce?1-c.first:c.first,phase:'interval'};},
  advance(c){if(c.phase!=='interval')throw Error('No new innings is due');const side=c.nextSide,number=c.innings.filter(m=>m.side===side).length+1,totals=this.totals(c),target=c.format==='T20'||number===2&&c.innings.filter(m=>m.side===1-side&&m.complete).length===2?totals[1-side]-totals[side]+1:null,clockSeconds=c.clockSeconds+(c.format==='TEST'?600:0);if(c.format==='TEST'&&clockSeconds>=this.LIMIT)return this.assess({...c,clockSeconds});
   const m=Innings.create(c.rngState,c.teams[side],c.teams[1-side],c.format,side,number,target);return{...c,innings:[...c.innings,m],clockSeconds,phase:'play',nextSide:null};
  },
  clock(c){const active=Math.min(c.clockSeconds,this.LIMIT-1),day=Math.floor(active/this.DAY)+1,within=active%this.DAY,session=Math.floor(within/7200),minutes=11*60+Math.floor(within/60)+(session>=1?40:0)+(session>=2?20:0);return{day,session:['Morning','Afternoon','Evening'][session],time:String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0'),remainingBalls:Math.max(0,Math.floor((this.LIMIT-c.clockSeconds)/40))};},
  shouldDeclare(c){const m=this.current(c),totals=this.totals(c),lead=totals[m.side]-totals[1-m.side];return c.format==='TEST'&&c.phase==='play'&&!this.ownTurn(c)&&(m.number===1&&m.runs>=420&&m.balls>=480||m.number===2&&(lead>=310&&m.balls>=120||lead>=180&&this.LIMIT-c.clockSeconds<17000));},
  summary(c){return{format:c.format,result:c.result,teams:c.teams.map(t=>({id:t.id,name:t.name})),innings:c.innings.map(Innings.compact),clockSeconds:c.clockSeconds};}
 };
 // V9: venue preparation, accumulated pitch wear and innings ball age are
 // separate. Format changes tactics and preparation, not a scoring multiplier.
 const Stadium={
  build(config=null){const cfg=config||{rows:9,sectors:64,roof:10,seat:'#71868b',wall:'#778b8d'},faces=[],people=[],solids=[],point=(a,r,h)=>({x:Math.sin(a)*(r+6),z:Math.cos(a)*(r+6),h}),rng=RNG.stream(48413);
   const solid=(corners,low,high,colour,topColour)=>{const bottom=corners.map(p=>({...p,h:low})),top=corners.map(p=>({...p,h:high})),cell=[{points:bottom,colour},{points:top,colour:topColour||colour}];for(let i=0;i<4;i++)cell.push({points:[bottom[i],bottom[(i+1)%4],top[(i+1)%4],top[i]],colour});solids.push(cell);faces.push(...cell);};
   for(let i=0;i<64;i++){const a=i*Math.PI/32,b=(i+1)*Math.PI/32;
    const active=i%16<cfg.sectors/4&&!(cfg.scene==='pavilion'&&Math.cos(a)>.9);if(active)for(let row=0;row<cfg.rows;row++){const r=72+row*1.12,deck=.65+row*.70,corners=[point(a,r,0),point(b,r,0),point(b,r+1.12,0),point(a,r+1.12,0)];solid(corners,0,deck,'#89938d',i%8===0?'#c2c3b4':cfg.seat);
     if(i%8!==0)for(let seat=0;seat<9;seat++){const angle=lerp(a,b,(seat+.55)/9.2),occupied=rng.next()>.045;if(!occupied)continue;people.push({point:point(angle,r+.52,deck+.31),shirt:['#c6cdd0','#b7876b','#49677e','#d0c6ad','#8eaea4','#95635a','#efe7d1'][Math.floor(rng.next()*7)],skin:['#cdae8c','#97765e','#b99375'][Math.floor(rng.next()*3)]});}
    }
    const rim=72+cfg.rows*1.12-.10;if(active)solid([point(a,rim,0),point(b,rim,0),point(b,rim+.32,0),point(a,rim+.32,0)],0,cfg.rows*.70+.8,cfg.wall);
    if(active&&i%16<cfg.roof)solid([point(a,71.8,0),point(b,71.8,0),point(b,rim+1.32,0),point(a,rim+1.32,0)],cfg.rows*.70+2.25,cfg.rows*.70+2.58,'#9dadaa','#c8d1cd');
    solid([point(a,68,0),point(b,68,0),point(b,68.20,0),point(a,68.20,0)],0,.65,i%8<4?'#deded0':'#405c62');
   }
   const block=(x,z,w,d,low,high,colour,top)=>solid([{x:x-w,z:z-d},{x:x+w,z:z-d},{x:x+w,z:z+d},{x:x-w,z:z+d}],low,high,colour,top);
   if(cfg.scene==='pavilion'||cfg.scene==='club'){
    const grand=cfg.scene==='pavilion',z=grand?84:82,width=grand?18:7,height=grand?10:3.7;
    block(0,z,width,5,0,height,grand?'#aa6857':'#d3c5a4');block(0,z,width+.6,5.6,height,height+.65,grand?'#596869':'#536651');
    for(let x=-width+2;x<width;x+=grand?3:2.6)for(let y=1.4;y<height-.4;y+=2.5)block(x,z-5.06,grand?.7:.55,.035,y,y+1.3,'#3b5258','#b1b8ab');
    if(grand)for(const x of [-16,16]){block(x,z,3.3,5.5,0,13,'#a05e4c');block(x,z,3.8,6,13,13.8,'#596567');}
   }
   return{faces,people,solids};
  }
 };
 const Conditions={
  profiles:[{id:'true',name:'Firm, true bounce',grass:.25,dry:.35,firm:.90},{id:'grass',name:'Grass on the surface',grass:.82,dry:.20,firm:.76},{id:'dry',name:'Dry, abrasive surface',grass:.12,dry:.88,firm:.72}],
  at(m){const rng=RNG.stream((m.pitchSeed??m.seed)^0x51c87),roll=rng.next(),venue=m.pitchVenue||m.teamId,dry=['ind','pak','sl','wi'].includes(venue),index=dry?(roll<.55?2:roll<.88?0:1):roll<.35?1:roll<.78?0:2,base=this.profiles[index],test=m.format==='TEST',day=Math.min(5,1+Math.floor((m.pitchClock||0)/21600)),wear=clamp((m.pitchBalls??m.balls)/1800*.60+(test?(day-1)*.10:0),0,1),ageBalls=test?m.balls%480:m.balls,age=ageBalls/6,fresh=1-clamp(age/(test?38:10),0,1),grass=base.grass*(test?1:.62)*(1-wear*.75),firm=clamp(base.firm+(test?0:.05)-wear*.15,.45,1);
   return{version:9,id:base.id,name:base.name,format:m.format,day,wear,grass,dry:base.dry,firm,ageBalls,newBall:test&&m.balls>0&&ageBalls===0,swing:(test?.28:.22)+(test?.94:.80)*fresh,seam:(.65+grass*.85)*(.76+.30*fresh),turn:.70+base.dry*.48+wear*.85,pace:.93+firm*.10-wear*.10,bounce:.90+firm*.15-wear*.12,variation:(test?.035:.018)+wear*.11};
  },
  attach(c,m){return{...m,pitchSeed:c.seed,pitchVenue:c.teams[0].id,pitchClock:c.clockSeconds,pitchBalls:c.innings.reduce((n,i)=>n+i.balls,0)};},
  label(m){const p=this.at(m),age=Math.floor(p.ageBalls/6)+'.'+p.ageBalls%6;return p.name+' · '+(m.format==='TEST'?(p.wear>.45?'Worn pitch · ':'')+(p.newBall?'New red ball':'Red ball '+age+' ov'):Bowling.stage(m)+' · White ball '+age+' ov');}
 };
 const Bowling={
  stage(m){return m.format==='TEST'?'Test spell':m.balls<36?'Powerplay':m.balls<90?'Middle overs':'Death overs';},
  order(bowlers,format){const pace=bowlers.map((b,i)=>!b.family.includes('spin')?i:-1).filter(i=>i>=0),spin=bowlers.map((b,i)=>b.family.includes('spin')?i:-1).filter(i=>i>=0),p=pace[0],q=pace[1]??spin[1],s=spin[0],t=spin[1]??pace[2],r=bowlers.map((_,i)=>i).find(i=>![p,q,s,t].includes(i));
   if(format==='T20')return[p,s,q,p,r,q,t,s,t,s,r,t,s,t,q,r,p,q,r,p];
   return [...Array.from({length:10},(_,i)=>i%2?q:p),...Array.from({length:6},(_,i)=>i%2?s:p),...Array.from({length:8},(_,i)=>i%2?s:r),...Array.from({length:4},(_,i)=>i%2?t:r),...Array.from({length:6},(_,i)=>i%2?s:p),...Array.from({length:6},(_,i)=>i%2?s:q)];
  },
  field(m,ball){const spin=Strokes.spin(ball||m.bowlers[Innings.bowler(m)]),test=m.format==='TEST';let rows;
   if(test)rows=spin?[[150,10,'slip'],[72,8,'silly point'],[-85,8,'short leg'],[64,26,'point'],[35,29,'cover'],[13,30,'mid-off'],[-16,30,'mid-on'],[-58,27,'midwicket'],[-135,44,'fine leg']]:[[166,12,'first slip'],[148,14,'second slip'],[122,17,'gully'],[67,25,'point'],[34,29,'cover'],[12,29,'mid-off'],[-18,29,'mid-on'],[-63,26,'midwicket'],[-144,55,'fine leg']];
   else if(m.balls<36)rows=[[158,12,'slip'],[68,24,'point'],[36,25,'cover'],[11,25,'mid-off'],[-18,24,'mid-on'],[-58,24,'midwicket'],[-96,24,'square leg'],[145,58,'third man'],[-145,56,'fine leg']];
   else rows=[[67,25,'point'],[35,26,'cover'],[-55,25,'midwicket'],[125,22,'short third'],[14,58,'long-off'],[-15,59,'long-on'],[-52,58,'deep midwicket'],[-99,57,'deep square leg'],[-147,57,'fine leg']];
   return rows.map(([a,metres,n])=>({a,r:metres/64,n}));
  },
  delivery(m,d){const rng=RNG.stream(d.rngState),owner=m.bowlers[Innings.bowler(m)],type=owner.archetype,spin=owner.family.includes('spin'),test=m.format==='TEST',death=!test&&m.balls>=90,powerplay=!test&&m.balls<36,p=Conditions.at(m),v=rng.next(),weights=spin?(test?[.00,.46,.92]:death?[.08,.45,.86]:[.02,.45,.88]):test?[.035,.32,.86]:death?[.45,.58,.73]:powerplay?[.12,.52,.82]:[.16,.40,.78],lengthName=v<weights[0]?'yorker':v<weights[1]?'full':v<weights[2]?'good':'short',bands=spin?{yorker:[.18,.65],full:[2,3.4],good:[4.7,6.1],short:[7.8,9.3]}:{yorker:[.18,.65],full:[2,3.4],good:[5.1,6.5],short:[8.3,10]},fraction=rng.next(),length=lerp(...bands[lengthName],fraction),variationRoll=rng.next();
   let variation=type==='legspin'?(variationRoll<(test?.13:.24)?'Googly':variationRoll<.36?'Top-spinner':'Leg-break'):type==='offspin'?(variationRoll<(test?.16:.28)?'Arm ball':'Off-break'):variationRoll<(test?.04:death?.42:.18)?'Slower ball':type==='swing'?(rng.next()<.62?'Outswinger':'Inswinger'):type==='leftpace'?'Angled seam-up':'Seam-up';
   let speed=Math.round(lerp(...owner.speed,rng.next()));if(variation==='Slower ball')speed-=lerp(13,21,rng.next());if(spin&&!test&&death)speed+=3;
   const wide=rng.next()<(test?.014:.027),line=wide?(rng.next()<.80?1.14:-1.14):test?lerp(-.08,.38,rng.next()):death&&lengthName==='yorker'?lerp(-.25,.70,rng.next()):lerp(-.30,.47,rng.next());
   const swing=type==='swing'?(variation==='Inswinger'?-1:1)*lerp(.17,.31,rng.next())*p.swing*(variation==='Slower ball'?.30:1):0;
   let kick=spin?(type==='legspin'?(variation==='Googly'?-1:variation==='Top-spinner'?0:1)*lerp(.24,.43,rng.next()):variation==='Arm ball'?0:-lerp(.20,.37,rng.next()))*p.turn:(rng.next()<.5?-1:1)*lerp(.05,.17,rng.next())*p.seam;
   if(owner.arm==='left'&&spin)kick*=-1;
   const heights=spin?{yorker:[.055,.12],full:[.23,.40],good:[.65,.85],short:[1.25,1.52]}:{yorker:[.055,.12],full:[.25,.44],good:[.78,1.04],short:[1.55,1.88]},contactH=clamp(lerp(...heights[lengthName],fraction)*p.bounce+(rng.next()-.5)*2*p.variation*(lengthName==='yorker'?.2:1),.05,2.08),preTime=(18.4-length)/(speed/3.6),postTime=length/(speed/3.6*(spin?.70:lengthName==='short'?.64:.79)*p.pace),duration=(preTime+postTime)*2600;
   return{ball:{...d.ball,scoringVersion:9,bowler:Innings.bowler(m),format:m.format,arm:owner.arm,lengthName,length,speed,variation,line,swing,kick,contactH,preTime,postTime,duration,bounceT:preTime/(preTime+postTime),releaseX:owner.arm==='left'?(spin?-.54:-.60):spin?.54:.43,conditions:p,fieldStage:this.stage(m)},rngState:rng.state};
  }
 };
 const InningsV8={...Innings},ContestV8={...Contest};
 Innings.create=function(...args){const m=InningsV8.create(...args);return{...m,bowlingVersion:9,order:Bowling.order(m.bowlers,m.format)};};
 Innings.delivery=function(m){return Bowling.delivery(m,InningsV8.delivery(m));};
 Innings.field=function(m,ball){return ball?.scoringVersion&&ball.scoringVersion<9?InningsV8.field(m,ball):Bowling.field(m,ball);};
 Contest.create=function(...args){const c=ContestV8.create(...args);return{...c,innings:[Conditions.attach(c,c.innings[0])]};};
 Contest.advance=function(c){const next=ContestV8.advance(c);if(next.innings.length===c.innings.length)return next;return{...next,innings:[...next.innings.slice(0,-1),Conditions.attach(next,Contest.current(next))]};};
 Contest.apply=function(c,ball,result){const next=ContestV8.apply(c,ball,result);return{...next,innings:[...next.innings.slice(0,-1),Conditions.attach(next,Contest.current(next))]};};
 const launchV8=NormalBall.launch;
 NormalBall.launch=function(out,ball,input,batter,rng){const launch=launchV8.call(this,out,ball,input,batter,rng);if(ball.scoringVersion>=9&&out.quality>=.36&&['Late cut','Leg glance','Paddle sweep'].includes(out.shot)){const q=out.quality,e=launch.effort,incoming=Delivery.incomingSpeed(ball),paddle=out.shot==='Paddle sweep';launch.vx=incoming*(paddle?.44+.18*e+.10*q:.52+.18*e+.13*q)+(1.2+(paddle?13:8.5)*e)*batter.attributes.power*q;}return launch;};
 const buildV8=NormalBall.build;
 NormalBall.build=function(origin,angle,vx,vy,kind='ground',spinRatio=.4,conditions=null){const model=conditions?{...this,surface(x,z){const base=NormalBall.surface(x,z);return base.id==='pitch'?{...base,restitution:base.restitution*(.90+.11*conditions.firm-.13*conditions.wear)*(conditions.weather?1-.18*conditions.weather.damp:1),friction:base.friction*(1+.4*conditions.wear),rolling:base.rolling*(1+.2*conditions.wear)}:base;}}:this;return buildV8.call(model,origin,angle,vx,vy,kind,spinRatio);};
 const launchV10=NormalBall.launch;
 NormalBall.launch=function(out,ball,input,batter,rng){
  if(ball.scoringVersion<11)return launchV10.call(this,out,ball,input,batter,rng);
  if(out.edge){const origin=Fielding.contactOrigin(ball,input),effort=clamp(input.effort??.6,0,1),hard=input.mode==='defend'?.10:.18+.75*effort,incoming=Delivery.incomingSpeed(ball);return{origin,angle:(out.angle+(rng.next()-.5)*3)*Math.PI/180,vx:incoming*(.52+.32*hard+(rng.next()-.5)*.12),vy:lerp(-.6,2.6,rng.next())+hard*.8,kind:'edge',spinRatio:.10,effort};}
  const launch=launchV10.call(this,out,ball,input,batter,rng);
  if(!Contact.testPace(ball)||input.mode==='defend'||['Late cut','Leg glance','Paddle sweep','Upper cut'].includes(out.shot))return launch;
  const q=out.quality,ground=!out.loft,glance=Math.sin(Math.abs(launch.angle)/2)**2,restitution=.08+.20*q*q,redirect=lerp(restitution,.74,glance),backFoot=ball.scoringVersion>=20?out.shot==='Back-foot punch':ball.lengthName==='good'&&Math.abs(input.angle)<64,room=backFoot?lerp(.91,.80,clamp((ball.length-5.1)/1.4,0,1)):1,batSpeed=(ground?2+20*launch.effort:21+10*launch.effort)*batter.attributes.power*(.15+.85*Math.pow(q,1.45))*room,speed=Delivery.incomingSpeed(ball)*redirect+(1+restitution)*batSpeed*(1-.56*glance);
  if(ground)launch.vx=speed;else{const angle=Math.atan2(launch.vy,launch.vx);launch.vx=speed*Math.cos(angle);launch.vy=speed*Math.sin(angle);}return launch;
 };
 const Opposition={
  input(m,ball){const rng=RNG.stream(m.rngState),x=Delivery.at(ball,1).x,spin=ball.family.includes('spin'),test=m.format==='TEST',b=m.bowlers[ball.bowler],roll=rng.next();let angle=ball.lengthName==='short'?(x>.12?94:-96):x<-.12?-36:42,mode=roll<(test?.60:.18)?'defend':roll>(test?.975:.85)?'loft':'ground';if(rng.next()<.16&&x<.15)angle=spin&&ball.lengthName!=='short'?-135:-145;if(rng.next()<.09&&x>.05)angle=132;if(rng.next()<(test?.06:.10))angle=-angle;const error=(rng.next()+rng.next()+rng.next()-1.5)*(test?139:149)*(0.85+b.rating/300),leave=rng.next()<(test?.055:.012);const shot=leave?null:{angle,mode,error};if(shot&&ball.scoringVersion>=7)shot.effort=mode==='defend'?0:mode==='ground'?lerp(test?.25:.30,test?.80:1,rng.next()):lerp(.82,1,rng.next());return{shot,rngState:rng.state};},
  ball(c){const m=Contest.current(c),d=Innings.delivery(m),prepared={...m,rngState:d.rngState},bot=this.input(prepared,d.ball,c),batter=prepared.batters[prepared.striker],result=Shot.resolve(d.ball,bot.shot,batter,Innings.field(prepared,d.ball),bot.rngState),next=Contest.apply(Contest.withPrepared(c,bot.rngState),d.ball,result);return{contest:Contest.shouldDeclare(next)?Contest.declare(next):next,ball:d.ball,shot:bot.shot,result,testCase:{ball:d.ball,input:bot.shot,seed:bot.rngState,batter:{attributes:batter.attributes},field:Innings.field(prepared,d.ball)}};},
  quick(seed,format,a,b){let c=Contest.create(seed,format,a,b,'spectator'),guard=0;while(c.phase!=='complete'){if(++guard>7000)throw Error('Simulation did not finish');if(c.phase==='interval')c=Contest.advance(c);else if(c.phase==='followOn')c=Contest.chooseFollowOn(c,true);else c=this.ball(c).contest;}return Contest.summary(c);}
 };
 const Season={
  fixtures(divisions){const out=[];for(let division=0;division<2;division++){const ids=divisions[division],rounds=[[[0,3],[1,2]],[[0,2],[3,1]],[[0,1],[2,3]]];for(let round=0;round<6;round++)for(const pair of rounds[round%3]){const [a,b]=round<3?pair:pair.slice().reverse();out.push({id:division+'-'+round+'-'+ids[a],division,round,home:ids[a],away:ids[b],result:null});}}return out;},
  create(seed,format,playerId){const teams=Squad.teams(format);if(!teams.some(t=>t.id===playerId))throw Error('Unknown team');const divisions=[teams.slice(0,4).map(t=>t.id),teams.slice(4).map(t=>t.id)];return{version:1,seed:seed>>>0,rngState:seed>>>0,format,playerId,year:1,round:0,teams,divisions,fixtures:this.fixtures(divisions),complete:false,records:[],movement:null};},
  team(s,id){return s.teams.find(t=>t.id===id);},
  fixture(s){return s.fixtures.find(f=>f.round===s.round&&(f.home===s.playerId||f.away===s.playerId));},
  begin(s){if(s.complete)throw Error('Start the next season');const f=this.fixture(s);if(!f||f.result)throw Error('This fixture is already complete');return Contest.create((s.seed+s.year*9013+s.round*6701)>>>0,s.format,this.team(s,f.home),this.team(s,f.away),s.playerId);},
  table(s,division){const rows=s.divisions[division].map(id=>({id,name:this.team(s,id).name,played:0,won:0,lost:0,drawn:0,tied:0,points:0,runsFor:0,ballsFor:0,runsAgainst:0,ballsAgainst:0}));for(const f of s.fixtures.filter(f=>f.division===division&&f.result)){const res=f.result;for(const id of [f.home,f.away]){const r=rows.find(r=>r.id===id);r.played++;if(res.result.kind==='win'){if(res.result.winnerId===id){r.won++;r.points+=s.format==='TEST'?12:2;}else r.lost++;}else if(res.result.kind==='draw'){r.drawn++;r.points+=4;}else{r.tied++;r.points+=s.format==='TEST'?6:1;}
    for(const inn of res.innings){const forUs=inn.teamId===id;r[forUs?'runsFor':'runsAgainst']+=inn.runs;r[forUs?'ballsFor':'ballsAgainst']+=s.format==='T20'&&inn.wickets===10?120:Math.max(1,inn.balls);}}
   }for(const r of rows)r.nrr=r.runsFor/(r.ballsFor||1)*6-r.runsAgainst/(r.ballsAgainst||1)*6;return rows.sort((a,b)=>b.points-a.points||b.won-a.won||b.nrr-a.nrr||a.name.localeCompare(b.name));},
  record(s,c){if(c.phase!=='complete')throw Error('Finish the match first');const f=this.fixture(s);if(!f||f.result)throw Error('Already recorded');if(c.format!==s.format||c.playerId!==s.playerId||c.teams[0].id!==f.home||c.teams[1].id!==f.away||c.seed!==this.begin(s).seed)throw Error('This result belongs to another fixture');const n={...s,fixtures:s.fixtures.map(f=>({...f})),records:s.records.slice()},summary=Contest.summary(c);n.fixtures.find(x=>x.id===f.id).result=summary;
   for(const other of n.fixtures.filter(x=>x.round===s.round&&!x.result))other.result=Opposition.quick((s.seed+s.year*131+s.round*7919+other.division*97+n.fixtures.indexOf(other)*617)>>>0,s.format,this.team(s,other.home),this.team(s,other.away));
   n.round++;n.complete=n.round>=6;if(n.complete){const upper=this.table(n,0),lower=this.table(n,1);n.movement={champion:upper[0].id,promoted:lower[0].id,relegated:upper.at(-1).id};n.records.push({year:n.year,...n.movement});}return n;
  },
  next(s){if(!s.complete)throw Error('The season is still in progress');const divisions=s.divisions.map(a=>a.slice()),{promoted,relegated}=s.movement;divisions[0][divisions[0].indexOf(relegated)]=promoted;divisions[1][divisions[1].indexOf(promoted)]=relegated;return{...s,year:s.year+1,round:0,complete:false,divisions,fixtures:this.fixtures(divisions),movement:null};}
 };
 const CareerSave={
  validate(raw){if(raw?.schema!==5||!['T20','TEST','LEGACY'].includes(raw.active)||!raw.sessions||typeof raw.sessions!=='object')throw Error('This is not a supported career save');const data=JSON.parse(JSON.stringify(raw));
   if(data.timingOffset===undefined)data.timingOffset=0;
   if(!Number.isFinite(data.timingOffset)||Math.abs(data.timingOffset)>200)throw Error('Invalid timing offset');
   for(const [format,state]of Object.entries(data.sessions)){if(!['T20','TEST'].includes(format))throw Error('Unknown saved format');const s=state.league,c=state.contest;if(!s||s.format!==format||!Number.isInteger(s.year)||s.year<1||!Number.isInteger(s.round)||s.round<0||s.round>6||s.teams?.length!==8||s.divisions?.flat().length!==8||new Set(s.divisions.flat()).size!==8||s.fixtures?.length!==24)throw Error('Invalid season');
    if(state.motionVersion!==undefined&&state.motionVersion!==29)throw Error('Invalid saved stroke presentation');for(const key of ['resultSeenKey','leagueSeenKey'])if(state[key]!==undefined&&(typeof state[key]!=='string'||state[key].length>250))throw Error('Invalid presentation marker');
    const teamIds=s.teams.map(t=>t.id),validTeam=t=>t&&typeof t.id==='string'&&typeof t.name==='string'&&t.name.length<=40&&t.xi?.length===11&&t.attack?.length===5&&t.xi.every(p=>typeof p.name==='string'&&p.name.trim()&&p.name.length<=32&&Number.isFinite(p.batting)&&p.batting>=1&&p.batting<=100&&(p.hand===undefined||['left','right'].includes(p.hand)))&&t.attack.every(b=>BOWLERS.some(type=>type.id===b.archetype)&&Number.isInteger(b.player)&&b.player>=0&&b.player<11&&typeof b.name==='string'&&b.name.trim()&&b.name.length<=32&&Number.isFinite(b.rating));
    if(new Set(teamIds).size!==8||!s.teams.every(validTeam)||!teamIds.includes(s.playerId)||s.divisions.some(d=>!Array.isArray(d)||d.length!==4||d.some(id=>!teamIds.includes(id)))||s.complete!==(s.round===6)||!Array.isArray(s.records)||!Number.isInteger(s.seed))throw Error('Invalid league teams');
    const expected=Season.fixtures(s.divisions);for(let i=0;i<24;i++){const f=s.fixtures[i],e=expected[i];if(!f||['id','round','division','home','away'].some(k=>f[k]!==e[k])||!!f.result!==(f.round<s.round))throw Error('Invalid fixture list');if(f.result&&(!['win','tie','draw'].includes(f.result.result?.kind)||!Array.isArray(f.result.innings)||f.result.innings.some(m=>![f.home,f.away].includes(m.teamId)||!Number.isFinite(m.runs)||!Number.isFinite(m.balls))))throw Error('Invalid fixture result');}
    if(s.complete&&(!s.movement||!['champion','promoted','relegated'].every(k=>teamIds.includes(s.movement[k]))))throw Error('Invalid season result');
    if(!c||c.format!==format||c.teams?.length!==2||!Array.isArray(c.innings)||c.innings.length<1||c.innings.length>(format==='TEST'?4:2)||!['play','interval','followOn','complete'].includes(c.phase)||!Number.isFinite(c.clockSeconds)||c.clockSeconds<0||c.clockSeconds>Contest.LIMIT+640)throw Error('Invalid match');
    if(c.playerId!==s.playerId||!c.teams.every(validTeam)||c.teams[0].id===c.teams[1].id||!Number.isInteger(c.seed)||![0,1].includes(c.first)||!c.teams.some(t=>t.id===c.playerId)||c.phase==='complete'&&!['win','tie','draw'].includes(c.result?.kind))throw Error('Invalid match teams');
    for(const m of c.innings){if(m.version!==5||m.batters?.length!==11||m.bowlers?.length!==5||!Number.isInteger(m.runs)||m.runs<0||m.runs>20000||!Number.isInteger(m.balls)||m.balls<0||m.balls>3000||!Number.isInteger(m.wickets)||m.wickets<0||m.wickets>10||!Array.isArray(m.history)||m.history.length>3500||m.striker===m.nonStriker||!Number.isInteger(m.rngState)||m.rngState<0||m.rngState>4294967295)throw Error('Invalid innings');
     if(m.format!==format||!Number.isInteger(m.side)||!c.teams[m.side]||m.teamId!==c.teams[m.side].id||![1,2].includes(m.number)||![m.striker,m.nonStriker].every(i=>Number.isInteger(i)&&i>=0&&i<11)||!Number.isInteger(m.nextBatter)||m.nextBatter<2||m.nextBatter>11||m.bowlingVersion!==undefined&&m.bowlingVersion!==9||JSON.stringify(m.order)!==JSON.stringify(m.bowlingVersion===9?Bowling.order(m.bowlers,format):Innings.order(m.bowlers,format))||m.limitBalls!==(format==='T20'?120:null)||m.maxOvers!==(format==='T20'?20:450))throw Error('Invalid innings configuration');
     for(const key of ['pitchSeed','pitchClock','pitchBalls'])if(m[key]!==undefined&&(!Number.isFinite(m[key])||m[key]<0||m[key]>(key==='pitchSeed'?4294967295:key==='pitchClock'?109000:12000)))throw Error('Invalid pitch conditions');
     if(m.pitchSeed===undefined){m.pitchSeed=c.seed;m.pitchVenue=c.teams[0].id;m.pitchClock=c.clockSeconds;m.pitchBalls=c.innings.reduce((n,i)=>n+i.balls,0);}
     const extra=m.extrasDetail||{wides:m.extras,noBalls:0,byes:0,legByes:0};if(!['wides','noBalls','byes','legByes'].every(k=>Number.isInteger(extra[k])&&extra[k]>=0)||Object.values(extra).reduce((a,b)=>a+b,0)!==m.extras||m.freeHit!==undefined&&typeof m.freeHit!=='boolean')throw Error('Invalid extras');
     if(m.batters.reduce((n,b)=>n+b.runs,0)+m.extras!==m.runs||m.batters.reduce((n,b)=>n+b.balls,0)!==m.history.reduce((n,r)=>n+(r.ballsFaced??(r.wide?0:1)),0)||m.bowlers.reduce((n,b)=>n+b.runs,0)+extra.byes+extra.legByes!==m.runs||m.bowlers.reduce((n,b)=>n+b.balls,0)!==m.balls||m.history.filter(b=>b.wicket).length!==m.wickets||m.history.filter(b=>Rules.legal(b)).length!==m.balls||m.history.reduce((n,b)=>n+b.runs,0)!==m.runs)throw Error('The score does not add up');
     for(const b of m.batters)if(typeof b.name!=='string'||!b.name.trim()||b.name.length>32||!b.attributes||!Number.isFinite(b.attributes.timing)||b.attributes.timing<.5||b.attributes.timing>1.5||!Number.isFinite(b.attributes.power)||b.attributes.power<.5||b.attributes.power>1.5||b.attributes.hand!==undefined&&!['left','right'].includes(b.attributes.hand))throw Error('Invalid batsman');
     for(const b of m.bowlers)if(!BOWLERS.some(t=>t.id===b.archetype)||typeof b.name!=='string'||b.name.length>32)throw Error('Invalid bowler');
    }
    if(!['ready','flight','inPlay','result','finished'].includes(state.phase)||!Number.isFinite(state.elapsed)||state.elapsed< -850||state.elapsed>10000||!Number.isFinite(state.resultAge)||state.resultAge<0||state.resultAge>30000)throw Error('Invalid delivery clock');
    const m=Contest.current(c),p=state.pending;if(['flight','inPlay'].includes(state.phase)){if(c.phase!=='play'||!p||p.bowler!==Innings.bowler(m)||!['speed','duration','bounceT','length','line','kick','swing','releaseX','contactH','preTime','postTime','releaseH'].every(k=>Number.isFinite(p[k]))||p.duration<800||p.duration>4000||![5,6,7,8,9,10,11,12,13,15,16,17,19,20,22,23,24,25,26,27].includes(p.scoringVersion))throw Error('Invalid pending delivery');}
    if(state.fieldBrief!==undefined&&typeof state.fieldBrief!=='boolean'||state.fieldBrief&&(state.phase!=='flight'||state.elapsed!==-850||!Number.isFinite(state.briefAge)||state.briefAge<0||state.briefAge>15000))throw Error('Invalid pre-delivery pause');
    if(state.introducedBatters!==undefined&&(!Array.isArray(state.introducedBatters)||state.introducedBatters.length>11||state.introducedBatters.some(i=>!Number.isInteger(i)||i<0||i>10)))throw Error('Invalid saved player introductions');if(state.reward!==undefined&&![0,300,500].includes(state.reward))throw Error('Invalid saved reward');if(state.briefCards!==undefined&&!Broadcast.valid(state.briefCards))throw Error('Invalid saved introduction');if(state.ballBridge!==undefined&&state.ballBridge!==null&&(!['x','z','h'].every(k=>Number.isFinite(state.ballBridge.from?.[k]))||!Number.isFinite(state.ballBridge.duration)||state.ballBridge.duration<.08||state.ballBridge.duration>.22||state.ballBridge.startAt!==undefined&&(!Number.isFinite(state.ballBridge.startAt)||state.ballBridge.startAt<0||state.ballBridge.startAt>30)))throw Error('Invalid saved ball transition');if(p?.scoringVersion>=19&&(!Players.valid(p.batterProfile,format)||!Players.validBowler(p.bowlerProfile)))throw Error('Invalid saved player profile');
    if(p?.scoringVersion>=13&&(!Weather.valid(p.weather)||JSON.stringify(p.weather)!==JSON.stringify(p.conditions?.weather)))throw Error('Invalid saved weather');
    if(p?.scoringVersion>=12){const sign=Hand.sign(p),field=p.savedField;if(!Array.isArray(field)||!Tactics.legal(field.map(f=>({...f,a:f.a*sign})),m)||typeof p.fieldNote!=='string'||p.fieldNote.length>140)throw Error('Invalid saved field');}
    if(state.phase==='inPlay'){const r=state.live;if(!r||r.rulesVersion!==10||![10,11,12,13,15,16,17,19,20,22,23,24,25,26,27].includes(p.scoringVersion)||r.batter!==m.striker||r.nonStriker!==m.nonStriker||r.play?.teamVersion!==10||!Number.isFinite(r.decisionTime)||r.decisionTime<0||r.decisionTime>29||!Number.isInteger(r.rngState)||r.rngState<0||r.rngState>4294967295||r.runs!==r.batRuns+Object.values(r.extrasDetail).reduce((a,b)=>a+b,0))throw Error('Invalid live ball');const legs=r.play.running?.legs||[],commands=r.play.running?.commands||[];if(legs.length>(p.scoringVersion>=15?3:5)||p.scoringVersion>=15&&r.play.running&&(r.play.running.version!==15||!Number.isInteger(r.play.running.maxRuns)||r.play.running.maxRuns<0||r.play.running.maxRuns>3)||legs.some((l,i)=>!Number.isFinite(l.start)||!Number.isFinite(l.end)||l.start<0||l.end<=l.start||i&&l.start<legs[i-1].end)||commands.length>100||commands.some(x=>!['run','hold'].includes(x.kind)||!Number.isFinite(x.time)||x.time<0||x.time>30))throw Error('Invalid running decisions');}
    if(state.shot&&(!['ground','loft','defend'].includes(state.shot.mode)||!Number.isFinite(state.shot.angle)||Math.abs(state.shot.angle)>180||!Number.isFinite(state.shot.error)||Math.abs(state.shot.error)>10000))throw Error('Invalid saved shot');
    if(state.botInput){const input=state.botInput;if(!Number.isInteger(input.rngState)||input.rngState<0||input.rngState>4294967295||input.shot&&(!['ground','loft','defend'].includes(input.shot.mode)||!Number.isFinite(input.shot.angle)||Math.abs(input.shot.angle)>180||!Number.isFinite(input.shot.error)||Math.abs(input.shot.error)>10000))throw Error('Invalid opposition shot');}
    for(const shot of [state.shot,state.botInput?.shot])if(shot?.effort!==undefined&&(!Number.isFinite(shot.effort)||shot.effort<0||shot.effort>1))throw Error('Invalid stroke strength');
    if(state.watchUntil!==undefined&&(!Number.isInteger(state.watchUntil)||state.watchUntil<0||state.watchUntil>3006)||state.recorded&&c.phase!=='complete')throw Error('Invalid match progress');
    if(state.batUntil!==undefined&&(!Number.isInteger(state.batUntil)||state.batUntil<0||state.batUntil>3006||state.batUntil%6)||state.betweenAge!==undefined&&(!Number.isFinite(state.betweenAge)||state.betweenAge<0||state.betweenAge>10000)||state.loftIntent!==undefined&&typeof state.loftIntent!=='boolean')throw Error('Invalid over controls');
    if(state.celebrationAge!==undefined&&(!Number.isFinite(state.celebrationAge)||state.celebrationAge<0||state.celebrationAge>20000))throw Error('Invalid celebration clock');
    if(state.shot?.rawError!==undefined&&(!Number.isFinite(state.shot.rawError)||Math.abs(state.shot.rawError)>10000))throw Error('Invalid raw swing timing');
    const learning=state.timingLearning;if(learning!==undefined&&(!learning||typeof learning.key!=='string'||!/^\d{1,10}:[01]:[12]$/.test(learning.key)||typeof learning.offered!=='boolean'||learning.median!==null&&(!Number.isFinite(learning.median)||Math.abs(learning.median)>10000)||learning.proposal!==null&&(!learning.offered||!Number.isInteger(learning.proposal)||Math.abs(learning.proposal)>200)))throw Error('Invalid timing calibration');
    state.match=m;
   }
   // Older own-innings errors were uncorrected. Seed the rolling record from
   // the active career without rewriting its history or a prepared shot.
   if(data.timingErrors===undefined){const c=data.sessions[data.active]?.contest;data.timingErrors=(c?c.innings.filter(m=>m.teamId===c.playerId).flatMap(m=>m.history):[]).map(r=>Number.isFinite(r.rawError)?r.rawError:r.delivery?.scoringVersion<=25?r.error:null).filter(e=>Number.isFinite(e)&&Math.abs(e)<=10000).slice(-40);}
   if(!Array.isArray(data.timingErrors)||data.timingErrors.length>40||data.timingErrors.some(e=>!Number.isFinite(e)||Math.abs(e)>10000))throw Error('Invalid timing history');
   if(data.wallet===undefined)data.wallet=Economy.create();if(!Economy.valid(data.wallet))throw Error('Invalid saved coins or shop items');if(data.legacy)data.legacy=Save.validate(data.legacy);if(data.active==='LEGACY'){if(!data.legacy)throw Error('Missing saved practice');}else if(!data.sessions[data.active])throw Error('Missing active season');return data;
  },
  pack(app){return{schema:5,active:app.active,timingOffset:app.timingOffset??0,timingErrors:app.timingErrors||[],wallet:app.wallet||Economy.create(),legacy:app.legacy||null,sessions:Object.fromEntries(Object.entries(app.sessions).map(([format,s])=>{const {match,...rest}=s;return[format,rest];}))};}
 };

 const Crowd={
  profiles:{four:{duration:2.6,gain:.48,claps:48,roar:.25},six:{duration:3.7,gain:.62,claps:68,roar:.46},wicket:{duration:3.6,gain:.66,claps:58,roar:.62},fifty:{duration:4.3,gain:.58,claps:75,roar:.25},hundred:{duration:6,gain:.82,claps:94,roar:.49},onefifty:{duration:5.2,gain:.72,claps:85,roar:.39},double:{duration:7,gain:.90,claps:108,roar:.62},team:{duration:3.1,gain:.48,claps:58,roar:.22}},
  events(m,result){const events=[];if(result.wicket)events.push({kind:'wicket',label:'Wicket'});else if(!result.wide&&[4,6].includes(result.runs))events.push({kind:result.runs===4?'four':'six',label:result.runs===4?'Four':'Six'});
   const b=m.batters[m.striker],after=b.runs+(result.wide?0:result.runs);for(const [value,kind]of [[50,'fifty'],[100,'hundred'],[150,'onefifty'],[200,'double']])if(b.runs<value&&after>=value)events.push({kind,label:b.name+' '+value,value});
   for(let value=(Math.floor(m.runs/100)+1)*100;value<=m.runs+result.runs;value+=100)events.push({kind:'team',label:(m.teamName||'Team')+' '+value,value});return events;
  },
  response(events=[]){return events.filter(e=>this.profiles[e.kind]).sort((a,b)=>this.profiles[b.kind].duration-this.profiles[a.kind].duration)[0]||null;},
  samples(kind,rate=22050){const p=this.profiles[kind]||this.profiles.four,n=Math.ceil(p.duration*rate),out=new Float32Array(n),rng=RNG.stream(7319+kind.length*139),noise=()=>rng.next()*2-1;let low=0,mid=0;
   for(let i=0;i<n;i++){const t=i/rate,x=noise();low+=.035*(x-low);mid+=.22*(x-mid);const envelope=Math.min(1,t/.22)*Math.pow(Math.max(0,1-t/p.duration),.8),swell=.72+.15*Math.sin(t*7)+.13*Math.sin(t*11.3);out[i]=(mid-low)*p.roar*envelope*swell;}
   // Separate small clap bursts create an audience, followed by short room echoes.
   for(let j=0;j<p.claps;j++){let time=.03+rng.next()*.8,period=.23+rng.next()*.26,level=.06+rng.next()*.10;while(time<p.duration-.2){const start=Math.floor(time*rate),len=Math.floor(rate*.027);for(let k=0;k<len&&start+k<n;k++){const v=noise()*level*Math.exp(-k/(rate*.0055))*(1-time/p.duration);out[start+k]+=v;for(const [delay,amount]of [[.037,.15],[.091,.08]]){const at=start+k+Math.floor(delay*rate);if(at<n)out[at]+=v*amount;}}time+=period*(.85+rng.next()*.3);}}
   let peak=0;for(const v of out)peak=Math.max(peak,Math.abs(v));const scale=p.gain/Math.max(.1,peak);for(let i=0;i<n;i++)out[i]*=scale*Math.min(1,(n-i)/(rate*.04));return out;
  }
 };
 Innings.apply=function(m,ball,result){const events=Crowd.events(m,result);return InningsV8.apply(m,ball,events.length?{...result,celebrations:events}:result);};
 // Original synthesised foley. Its RNG never touches the match seed.
 const SoundDesign={
  contact(result){return !result?.contact?null:(result.edge??result.quality<.36)?'nick':result.quality>=.85?'middle':'bat';},
  samples(kind,rate=22050){if(kind.startsWith('crowd-'))return Crowd.samples(kind.slice(6),rate);const duration={nick:.085,middle:.21,bat:.14,turf:.10,glove:.12,stumps:.31}[kind]||.12,n=Math.ceil(rate*duration),data=new Float32Array(n);let random=kind.length*1093,low=0,previous=0;
   for(let i=0;i<n;i++){random=(Math.imul(random,1664525)+1013904223)>>>0;const noise=random/2147483648-1,t=i/rate;low+=.16*(noise-low);const high=noise-previous;previous=noise;let v;
    if(kind==='nick')v=.24*high*Math.exp(-t*120)+(.27*Math.sin(t*2*Math.PI*2700)+.10*Math.sin(t*2*Math.PI*4300))*Math.exp(-t*80);
    else if(kind==='middle')v=(.57*Math.sin(t*2*Math.PI*510)+.21*Math.sin(t*2*Math.PI*1180))*Math.exp(-t*31)+.40*high*Math.exp(-t*180)+.12*low*Math.exp(-t*48);
    else if(kind==='bat')v=.32*Math.sin(t*2*Math.PI*770)*Math.exp(-t*48)+.28*high*Math.exp(-t*95);
    else if(kind==='turf')v=.40*low*Math.exp(-t*70)+.15*Math.sin(t*2*Math.PI*140)*Math.exp(-t*65);
    else if(kind==='glove')v=.42*low*Math.exp(-t*65)+.10*Math.sin(t*2*Math.PI*260)*Math.exp(-t*60);
    else v=(.31*Math.sin(t*2*Math.PI*1450)+.20*Math.sin(t*2*Math.PI*2190))*Math.exp(-t*29)+.25*high*Math.exp(-t*100)+.08*noise*Math.exp(-Math.abs(t-.075)*120);
    data[i]=clamp(v*Math.min(1,t/.0009),-.95,.95);
   }return data;
  }
 };

 // V10 keeps committed older deliveries on their original scoring and motion.
 const ShotV9={...Shot},InningsV9={...Innings},FieldingV9={...Fielding},ViewV9={...View};
 const Hand={
  left:new Set('Jake Weatherald;Michael Bracewell;Faheem Ashraf;Noman Ali;Lahiru Kumara;Shamar Joseph;Jayden Seales;Ben Duckett;Ben Stokes;Sam Curran;Liam Dawson;Luke Wood;Abhishek Sharma;Tilak Varma;Shivam Dube;Axar Patel;Kuldeep Yadav;Arshdeep Singh;Yashasvi Jaiswal;Sai Sudharsan;Rishabh Pant;Ravindra Jadeja;Washington Sundar;Travis Head;Ben Dwarshuis;Usman Khawaja;Alex Carey;Mitchell Starc;Devon Conway;Rachin Ravindra;Mark Chapman;Mitchell Santner;Tom Latham;Henry Nicholls;Quinton de Kock;Ryan Rickelton;David Miller;Marco Jansen;Keshav Maharaj;Tony de Zorzi;Saim Ayub;Fakhar Zaman;Mohammad Nawaz;Shaheen Afridi;Shan Masood;Saud Shakeel;Kusal Perera;Kamindu Mendis;Charith Asalanka;Dunith Wellalage;Dimuth Karunaratne;Shimron Hetmyer;Akeal Hosein;John Campbell;Tagenarine Chanderpaul;Alick Athanaze;Jomel Warrican'.split(';')),
  of(b){return b?.attributes?.hand||b?.hand||(this.left.has(b?.name)?'left':'right');},
  sign(ball){return ball?.scoringVersion>=10&&ball.battingHand==='left'?-1:1;},
  canonical(ball){if(this.sign(ball)===1)return ball;return{...ball,battingHand:'right',line:-ball.line,swing:-ball.swing,kick:-ball.kick,releaseX:-ball.releaseX};},
  reflect(out){const p=out.play,point=p=>p?{...p,x:-p.x}:p;if(p){out.play={...p,origin:point(p.origin),dx:-p.dx,event:point(p.event),keeper:point(p.keeper),starts:p.starts.map(point)};}return{...out,angle:-out.angle};}
 };
 Shot.describe=function(angle,mode,ball){return ShotV9.describe.call(this,angle*Hand.sign(ball),mode,Hand.canonical(ball));};
 Shot.suitability=function(ball,angle,mode){return ShotV9.suitability.call(this,Hand.canonical(ball),angle*Hand.sign(ball),mode);};
 const strokeGuideV9=Strokes.guide;
 Strokes.guide=function(ball,mode){const sign=Hand.sign(ball);return strokeGuideV9.call(this,Hand.canonical(ball),mode).map(s=>({...s,angle:s.angle*sign,slot:sign===1?s.slot:({1:4,2:5,3:6,4:1,5:2,6:3}[s.slot]||s.slot)}));};
 const poseV9=BatterRig.pose;
 BatterRig.pose=function(options={}){const hand=options.hand==='left'&&options.scoringVersion>=10?-1:1,o={...options,angle:(options.angle||0)*hand,line:(options.line||0)*hand};
  // Soft deflections recover sooner; the bat does not remain frozen in a full finish.
  if(o.scoringVersion>=10&&o.age>230&&o.effort<.7)o.age=230+(o.age-230)*lerp(1.7,1,clamp(o.effort/.7,0,1));
  const p=poseV9(o);if(hand===-1){for(const [k,v]of Object.entries(p))if(v&&typeof v==='object'&&Number.isFinite(v.x))p[k]={...v,x:-v.x};p.yaw=-p.yaw;p.hipYaw=-p.hipYaw;}
  return p;
 };
 const Rules={
  crease:[.4192,18.0976],wickets:[-.8,19.3168],halfWidth:.1143,
  legal(r){return r.legal??!r.wide;},
  extras(r){return r.extrasDetail||{wides:r.wide?r.runs:0,noBalls:0,byes:0,legByes:0};},
  batterRuns(r){return r.batRuns??(r.wide?0:r.runs);},
  atZ(ball,z){const t=(ball.length-z)/ball.length,seconds=t*ball.postTime,progress=(18.4-z)/18.4,vy=(ball.contactH-.035+4.905*ball.postTime*ball.postTime)/ball.postTime;return{x:lerp(ball.releaseX,ball.line,progress)+ball.swing*progress*progress+ball.kick*t,z,h:Math.max(.035,.035+vy*seconds-4.905*seconds*seconds)};},
  hits(p){return Math.abs(p.x)<=this.halfWidth+.035&&p.h<=.711+.035;},
  lbw(ball,impact,attempt,batFirst=false){const sign=Hand.sign(ball),pitch=Delivery.at(ball,ball.bounceT),at=this.atZ(ball,this.wickets[0]),pitchLeg=!ball.fullToss&&pitch.x*sign< -this.halfWidth,impactLeg=impact.x*sign< -this.halfWidth,impactOff=impact.x*sign>this.halfWidth;
   const reason=ball.noBall?'No ball':ball.freeHit?'Free hit':batFirst?'Bat first':pitchLeg?'Pitched outside leg':impactLeg?'Impact outside leg':impactOff&&attempt?'Impact outside off':!this.hits(at)?at.h>.746?'Going over the stumps':'Missing the stumps':'Pitch and impact in line - hitting the stumps';
   return{out:!ball.noBall&&!ball.freeHit&&!batFirst&&!pitchLeg&&!impactLeg&&(!impactOff||!attempt)&&this.hits(at),reason,pitch,impact,projected:at,attempt};
  },
  pad(ball,input){const R=BatterRig,pose=R.pose({angle:input?.angle||0,mode:input?.mode||'defend',hand:ball.battingHand,scoringVersion:ball.scoringVersion>=22?22:ball.scoringVersion>=20?20:ball.scoringVersion>=16?16:ball.scoringVersion>=15?15:10,archetype:ball.archetype,lengthName:ball.lengthName,height:ball.contactH,line:Delivery.at(ball,1).x,age:input?0:-300,effort:input?.effort||0}),root=-.47*Hand.sign(ball),parts=[[pose.leftAnkle,pose.leftKnee],[pose.rightAnkle,pose.rightKnee]];
   for(let z=1.05;z>-.65;z-=.025){const p=this.atZ(ball,z),point=R.v(p.x-root,p.h,p.z);for(const [a,b]of parts){const d=R.sub(b,a),k=clamp(R.dot(R.sub(point,a),d)/R.dot(d,d),0,1);if(R.length(R.sub(point,R.add(a,R.mul(d,k))))<.126)return p;}}
   return null;
  },
  score(out,movement=0){const e=out.play?.event,penalty=out.noBall?1:out.wide?1:0,wicket=!!out.wicket,amount=wicket&&out.dismissalKind!=='runOut'?0:movement,extras={wides:0,noBalls:out.noBall?1:0,byes:0,legByes:0};let batRuns=0;
   if(out.wide)extras.wides=1+amount;else if(out.contact)batRuns=amount;else if(out.extraKind==='legByes')extras.legByes=amount;else extras.byes=amount;
   const runs=batRuns+Object.values(extras).reduce((a,b)=>a+b,0),boundary=['four','six'].includes(e?.type)&&!wicket;
   let title=wicket?(out.dismissalKind==='runOut'?'Run out':out.dismissalKind==='lbw'?'LBW':out.dismissalKind==='bowled'?'Bowled':e?.id==='keeper'?'Caught behind':'Caught'):boundary?(e.type==='six'?'Six':'Four')+(out.contact?'':out.wide?' wides':out.extraKind==='legByes'?' leg byes':' byes'):amount?amount+' '+(out.contact?'run'+(amount===1?'':'s'):out.wide?'wide'+(runs===1?'':'s'):out.extraKind==='legByes'?'leg bye'+(amount===1?'':'s'):'bye'+(amount===1?'':'s')):out.wide?'Wide':out.noBall?'No ball':'Dot ball';
   if(out.noBall&&amount&&!wicket)title='No ball + '+amount+(out.contact?'':out.extraKind==='legByes'?' leg byes':' byes');
   return{...out,rulesVersion:10,runs,batRuns,extrasDetail:extras,bowlerRuns:batRuns+extras.wides+extras.noBalls,legal:!out.noBall&&!out.wide,ballsFaced:out.wide?0:1,boundary:boundary?(e.type==='six'?6:4):0,completedRuns:boundary?0:amount,title,penalty};
  },
  dismissal(r,bowler){return r.dismissalKind==='runOut'?'run out ('+(r.fielder||'fielder')+')':r.dismissalKind==='lbw'?'lbw b '+bowler.name:r.dismissalKind==='bowled'||r.title==='Bowled'?'b '+bowler.name:'c '+(r.fielder||'fielder')+' b '+bowler.name;},
  chip(r){const e=this.extras(r);return r.wicket?(r.runs?r.runs+'W':'W'):e.noBalls?(r.runs===1?'Nb':'Nb+'+(r.runs-1)):e.wides?(r.runs===1?'Wd':r.runs+'Wd'):e.legByes?r.runs+'Lb':e.byes?r.runs+'B':r.runs||'·';}
 };
 const TeamField={
  arrive(f,x,z){const d=Math.max(0,Math.hypot(x-f.x,z-f.z)-.55);let lo=0,hi=25;for(let n=0;n<22;n++){const t=(lo+hi)/2;if(BallFlight.run(f,t)>=d)hi=t;else lo=t;}return hi;},
  pursue(p,ball,field,canCatch=true){const starts=[...Fielding.positions(field),{id:'bowler',name:'bowler',x:ball.releaseX,z:17.1}],keeper=Fielding.keeperFor(ball),all=[...starts,keeper];p.starts=starts;p.keeper=keeper;let event;
   for(let t=.01;t<=Math.max(22,p.stopTime+1);t+=.025){const at=Fielding.freeBall(p,t);if(Math.hypot(at.x,at.z)>=64){let lo=Math.max(0,t-.025),hi=t;for(let n=0;n<14;n++){const m=(lo+hi)/2,q=Fielding.freeBall(p,m);if(Math.hypot(q.x,q.z)>=64)hi=m;else lo=m;}const q=Fielding.freeBall(p,hi);event={...q,type:canCatch&&!q.bounced?'six':'four',time:hi};break;}
    const air=!at.bounced&&at.h>=.20&&at.h<=2.20,low=at.bounced&&at.h<=.70;if(air||low){const reachable=all.filter(f=>Math.hypot(f.x-at.x,f.z-at.z)<=BallFlight.run(f,t)+.60).sort((a,b)=>Math.hypot(a.x-at.x,a.z-at.z)-Math.hypot(b.x-at.x,b.z-at.z));if(reachable.length){const f=reachable[0];event={...at,type:air&&canCatch?'catch':air?'take':'pickup',id:f.id,name:f.name,time:t};break;}}
   }
   if(!event){const at=Fielding.freeBall(p,p.stopTime),f=all.slice().sort((a,b)=>this.arrive(a,at.x,at.z)-this.arrive(b,at.x,at.z))[0];event={...at,type:'pickup',id:f.id,name:f.name,time:Math.max(p.stopTime,this.arrive(f,at.x,at.z))};}
   p.event=event;p.returnTime=event.time;return p;
  },
  prepare(p,seed){const rng=RNG.stream(seed^0x6f21),e=p.event;return{...p,teamVersion:10,throwSpeed:22+rng.next()*5,throwError:(rng.next()+rng.next()-1)*1.25,transfer:e.type==='take'?.38:.58};},
  route(p,end=0){const e=p.event,all=[...p.starts,p.keeper],target={x:0,z:Rules.wickets[end],h:.68},collector=all.find(f=>f.id===e.id),d=Math.max(.01,Math.hypot(collector.x-e.x,collector.z-e.z)),root={x:e.x+(collector.x-e.x)/d*Math.min(.44,d),z:e.z+(collector.z-e.z)/d*Math.min(.44,d)},aim=Math.max(.01,Math.hypot(target.x-root.x,target.z-root.z)),front={x:(target.x-root.x)/aim,z:(target.z-root.z)/aim},from={x:root.x+front.z*.20+front.x*.0472727,z:root.z-front.x*.20+front.z*.0472727,h:1.72},distance=Math.hypot(from.x,from.z-target.z),release=e.time+p.transfer,flight=Math.max(.16,distance/p.throwSpeed),landing=release+flight,receiver=all.filter(f=>f.id!==e.id).sort((a,b)=>this.arrive(a,p.throwError+.32,target.z)-this.arrive(b,p.throwError+.32,target.z))[0],ready=this.arrive(receiver,p.throwError+.32,target.z+.12),direct=Math.abs(p.throwError)<=Rules.halfWidth,breakTime=direct?landing:Math.max(landing,ready)+.18+Math.abs(p.throwError)*.13;
   const backup=all.filter(f=>f.id!==e.id&&f.id!==receiver.id).sort((a,b)=>Math.hypot(a.x,a.z-target.z)-Math.hypot(b.x,b.z-target.z))[0];
   return{end,target,release,flight,landing,breakTime,receiver:receiver.id,backup:backup.id,backupTarget:{x:-e.x/Math.max(1,distance)*3.2,z:target.z+(target.z-e.z)/Math.max(1,distance)*3.2},direct,error:p.throwError,from};
  },
  ballAt(p,t){const e=p.event,r=p.throw;if(t<e.time)return Fielding.freeBall(p,t);if(!r)return{x:e.x,z:e.z,h:['catch','take'].includes(e.type)?lerp(e.h,1.25,BatterRig.smooth((t-e.time-.18)/.45)):e.h};
   if(t<r.release){const k=clamp((t-e.time)/(r.release-e.time),0,1);const blend=BatterRig.smooth(k);return{x:lerp(e.x,r.from.x,blend),z:lerp(e.z,r.from.z,blend),h:lerp(e.h,r.from.h,blend)};}
   if(t<r.landing){const k=(t-r.release)/r.flight;return{x:lerp(r.from.x,r.error,k),z:lerp(r.from.z,r.target.z,k),h:lerp(r.from.h,.68,k)+.5*9.81*r.flight*r.flight*k*(1-k)};}
   if(t<r.breakTime){const k=(t-r.landing)/Math.max(.01,r.breakTime-r.landing);return{x:lerp(r.error,0,k),z:r.target.z,h:lerp(.68,.55,k)};}return{x:0,z:r.target.z,h:.55};
  },
  frame(out,t){const p=out.play,e=p.event,r=p.throw,all=[...p.starts,p.keeper],ball=this.ballAt(p,t),other=all.filter(f=>f.id!==e.id&&f.id!==e.chaser?.id&&f.id!==r?.receiver&&f.id!==r?.backup).sort((a,b)=>Math.hypot(a.x-e.x,a.z-e.z)-Math.hypot(b.x-e.x,b.z-e.z)).slice(0,2).map(f=>f.id);
   const fielders=all.map(f=>{let target={x:f.x,z:f.z},action='ready',hands=null,blend=0;
    if(f.id===e.id){const d=Math.max(.01,Math.hypot(e.x-f.x,e.z-f.z)),space=Math.min(.44,d);target={x:e.x+(f.x-e.x)/d*space,z:e.z+(f.z-e.z)/d*space};action=t<e.time-.3?'run':r&&t>=e.time?'throw':e.type==='catch'||e.type==='take'?'catch':'pickup';hands=t<e.time?{x:e.x,z:e.z,h:['catch','take'].includes(e.type)?e.h:.12}:!r||t<=r.release?ball:{x:e.x,z:e.z,h:1.35};blend=BatterRig.smooth((t-e.time+.30)/.30);}
    else if(r&&f.id===r.receiver){target={x:.32+lerp(r.error,0,clamp((t-r.landing)/Math.max(.01,r.breakTime-r.landing),0,1)),z:r.target.z+.12};action=t<r.landing-.3?'run':t<r.breakTime?'catch':'break';hands=t>=r.landing?{...ball}:{x:r.error,z:r.target.z,h:.68};blend=BatterRig.smooth((t-r.landing+.3)/.3);}
    else if(r&&f.id===r.backup){target=r.backupTarget;action='backup';}
    else if(other.includes(f.id)){const d=Math.hypot(e.x-f.x,e.z-f.z),k=Math.min(4,d*.22)/Math.max(.01,d);target={x:lerp(f.x,e.x,k),z:lerp(f.z,e.z,k)};action='support';}
    const distance=Math.hypot(target.x-f.x,target.z-f.z),rawTravel=Math.min(distance,BallFlight.run(f,t)+(p.motionVersion>=23&&f.id===e.id&&['catch','take'].includes(e.type)?Math.max(0,distance-BallFlight.run(f,e.time))*BatterRig.smooth((t-e.time+.32)/.32):0)),brake=Math.min(.75,distance),u=brake?clamp((rawTravel-distance+brake)/brake,0,1):0,travel=rawTravel<distance-brake?rawTravel:distance-brake+brake*(u+u*u-u*u*u),k=distance?travel/distance:0,moving=distance>.1&&rawTravel<distance-.02,gait=BatterRig.smooth(rawTravel/.7)*BatterRig.smooth((distance-rawTravel)/.75);
    return{...f,x:lerp(f.x,target.x,k),z:lerp(f.z,target.z,k),moving,travel,gait,heading:{x:target.x-f.x,z:target.z-f.z},look:target,faceBall:f.id===e.id&&['catch','take'].includes(e.type)?p.origin:null,faceBlend:f.id===e.id?BatterRig.smooth((t-e.time+.5)/.4):0,throwBlend:r&&f.id===e.id?BatterRig.smooth((t-e.time-.03)/Math.max(.2,p.transfer*.85)):0,throwLook:r&&f.id===e.id&&t>=e.time+.15?r.target:null,action,hands,actionBlend:blend,jump:f.id===e.id&&['catch','take'].includes(e.type)?Math.max(0,e.h-1.95)*clamp((t-e.time+.3)/.3,0,1)*(1-clamp((t-e.time-.06)/.3,0,1)):0,throwStage:r&&f.id===e.id?clamp((t-e.time)/(r.release-e.time),0,3):undefined,teamVersion:10};
   });return{fielders,ball,event:e,complete:t>=e.time,returned:t>=(r?.breakTime||p.returnTime),runners:Running.frame(out,t)};
  }
 };
 const Running={
  duration:2.78,turn:.22,
  leg(start,index){return{start,end:start+this.duration+(index===0?.12:0)};},
  count(legs,t){return legs.filter(l=>t>=l.end).length;},
  position(legs,t,runner=0){let completed=this.count(legs,t),leg=legs.find(l=>t>=l.start&&t<l.end),progress=0;
   if(leg){const u=(t-leg.start)/(leg.end-leg.start);progress=u<.2?u*u/.36:(u-.10)/.9;progress=clamp(progress,0,1);}
   const from=(completed+runner)%2,to=1-from,near=Rules.crease[0],far=Rules.crease[1],tipZ=leg?lerp(from?far:near,to?far:near,progress):from?far:near,direction=to?1:-1;
   const x=runner===0?-.62:-1.48,last=completed?legs[completed-1]:null,since=last?t-last.end:Infinity,grounding=!leg&&since<this.turn,previousDirection=from===1?1:-1,inside=from?far+.25:near-.25;
   const z=leg?lerp(inside,to?far-.60:near+.60,progress):last?lerp((from?far:near)-previousDirection*.60,inside,BatterRig.smooth(since/this.turn)):inside;
   return{runner,x,z,tip:{x,z:tipZ,h:leg&&progress<.88?.12:.025},moving:!!leg,grounding,turnProgress:grounding?clamp(since/this.turn,0,1):0,progress,completed,from,to,direction:grounding?previousDirection:direction,grounded:tipZ<=Rules.crease[0]||tipZ>=Rules.crease[1]};
  },
  frame(out,t){const p=out.play;if(!p.running)return[];const time=Math.min(t,out.decisionTime);return[0,1].map(i=>{const a=this.position(p.running.legs,time,i),hand=i===0?p.running.hand:p.running.nonHand,entry=BatterRig.smooth(((time-(p.running.legs[0]?.start||0))/.38)),startX=i===0?(p.running.hand==='left'?.47:-.47):-1.48;return{...a,x:lerp(startX,i===0&&hand==='left'?.62:a.x,entry),tip:{...a.tip,x:lerp(startX,i===0&&hand==='left'?.62:a.x,entry)},id:i===0?'runner-striker':'runner-nonstriker',batting:true,teamVersion:10,hand};});},
  finish(out,legs,route){const p={...out.play,throw:route,returnTime:route.breakTime,running:{...out.play.running,legs}},t=route.breakTime,positions=[0,1].map(i=>this.position(legs,t,i)),near=positions[0].z<=positions[1].z?0:1,owner=route.end===0?near:1-near,at=positions[owner],unsafe=at.moving&&!at.grounded,count=this.count(legs,t),endSwap=unsafe?near===1:count%2===1;
   const wicket=unsafe,finished=legs.length?Math.min(legs.at(-1).end,t):t,decisionTime=Math.max(out.play.event.time,wicket?t:Math.max(finished,t));
   return Rules.score({...out,play:p,wicket,dismissalKind:wicket?'runOut':null,runOutRunner:wicket?owner:null,endSwap,decisionTime,detail:(out.edge?out.edgeType+' - ':'')+(wicket?(route.direct?'Direct hit':'Throw collected and bails removed')+' - bat short of the crease':out.ducked?'Ducked under the bouncer - '+(count?count+' byes completed':'collected by '+p.event.name):count?count+' completed before the return':out.padEvidence?out.padEvidence.reason:out.noBall?'Front foot over the crease - the ball is still live':'Fielded by '+p.event.name), fielder:wicket?p.event.name:undefined},count);
  },
  create(out,ball){const p=out.play,e=p.event;if(out.disallowRuns&&!out.wicket){out={...out,play:{...p,event:{...e,type:'dead'}}};return Rules.score({...out,detail:'No shot or evasive action - leg byes disallowed',decisionTime:e.time},0);}if(out.wicket||!['pickup','take'].includes(e.type))return Rules.score({...out,decisionTime:e.time},out.wicket?0:e.type==='six'?6:e.type==='four'?4:0);
   const routes=[TeamField.route(p,0),TeamField.route(p,1)],route=routes[0].breakTime<=routes[1].breakTime?routes[0]:routes[1];p.running={legs:[],hand:ball.battingHand||'right',nonHand:ball.nonStrikerHand||'right',commands:[],...(ball.scoringVersion>=12?{version:ball.scoringVersion>=15?15:12,maxRuns:Math.min(ball.scoringVersion>=15?3:5,ball.runsNeeded==null?5:Math.max(0,ball.runsNeeded-(out.noBall||out.wide?1:0)))}:{})};
   const legs=[];if(!out.disallowRuns&&!(ball.scoringVersion>=23&&['Forward defence','Back-foot defence','Yorker defence'].includes(out.shot)))for(let i=0;i<(ball.scoringVersion>=12?1:4);i++){const l=this.leg(i?legs.at(-1).end+this.turn:.32,i);if(l.end+.36>route.breakTime||i>=Math.max(0,(ball.runsNeeded??99)-(out.noBall||out.wide?1:0)))break;legs.push(l);}
   return this.finish(out,legs,route);
  },
  offer(out,time){const p=out?.play,r=p?.running,legs=r?.legs||[],queued=legs.some(l=>l.start>time+.025),number=legs.length+1,start=Math.max(time+.13,legs.length?legs.at(-1).end+this.turn:.32),leg=this.leg(start,legs.length),margin=(p?.throw?.breakTime??0)-leg.end,closed=!r||out.disallowRuns||time>=out.decisionTime-.10||legs.length>=Math.min(5,r.maxRuns??5),status=closed?'closed':queued?'queued':margin<-.18?'late':margin<.20?'tight':'available';
   return{status,number,leg,margin,allowed:['available','tight'].includes(status),queued,canHold:!!r&&time<out.decisionTime-.10&&legs.some(l=>l.start>time+.025),hint:closed?'Stay in your ground':queued?'Run queued. Cancel it before it starts if needed.':status==='late'?'Too late for another - hold your ground':status==='tight'?'Tight run - the throw may beat you':number===1?'A single is available':'Run '+number+' is available'};
  },
  automatic(out,push=false){let r=out;for(let i=0;i<4;i++){const legs=r.play?.running?.legs;if(!legs?.length)break;const time=legs.at(-1).start+.45,offer=this.offer(r,time);if(!offer.allowed||offer.margin<(push?-.12:.32))break;const next=this.command(r,'run',time);if(next===r)break;r=next;}if(r.play?.running)r.play.running.commands=[];return r;},
  command(out,kind,time){const p=out.play;if(!p.running||p.running.commands.length>=100||out.disallowRuns||time>=out.decisionTime-.10||time<0)return out;let legs=p.running.legs.map(l=>({...l}));
   if(kind==='hold')legs=legs.filter(l=>l.start<=time+.025);else if(kind==='run'&&legs.length<5){if(p.running.version>=12&&!this.offer(out,time).allowed)return out;const start=Math.max(time+.13,legs.length?legs.at(-1).end+this.turn:.32);if(start>=p.throw.breakTime-.12)return out;legs.push(this.leg(start,legs.length));}else return out;
   const next={...out,play:{...p,running:{...p.running,commands:[...p.running.commands,{kind,time}]}}};return this.finish(next,legs,p.throw);
  }
 };
 const LiveBall={
  resolve(ball,input,batter,field,seed){const sign=Hand.sign(ball),canonical=Hand.canonical(ball),stroke=input?{...input,angle:input.angle*sign}:null,canonicalField=sign===1?field:field.map(f=>({...f,a:-f.a}));let out=ShotV9.resolve(canonical,stroke,batter,canonicalField,seed);if(sign===-1)out=Hand.reflect(out);
   out={...out,noBall:!!ball.noBall,freeHit:!!ball.freeHit,wide:false,ducked:ball.lengthName==='short'&&ball.contactH>1.45&&(!input||input.mode==='defend')};const pos=Delivery.at(ball,1),pad=!out.contact?Rules.pad(ball,input):null;out.padEvidence=pad?Rules.lbw(ball,pad,!!input&&!out.evasion):null;
   if(!out.contact){const at=Rules.atZ(ball,Rules.wickets[0]),bowled=!pad&&Rules.hits(at)&&!ball.noBall&&!ball.freeHit;out.wicket=!!out.padEvidence?.out||bowled;out.dismissalKind=out.padEvidence?.out?'lbw':bowled?'bowled':null;
    out.wide=!ball.noBall&&!pad&&(pos.x*sign>(ball.format==='TEST'?1.15:.96)||pos.x*sign< (ball.format==='TEST'?-1.15:-.62)||pos.h>2.02);
    out.extraKind=pad?'legByes':'byes';out.disallowRuns=!!pad&&!input&&!out.evasion;const before=Delivery.at(ball,.998),origin=pad||pos,angle=pad?Math.atan2(sign*(.7+Math.abs(pad.x)),.6):Math.atan2(pos.x-before.x,pos.z-before.z),speed=pad?Delivery.incomingSpeed(ball)*.19:Delivery.incomingSpeed(ball)*(ball.scoringVersion>=23?Math.hypot(1,Delivery.lateral(ball,-1)-pos.x):1),up=pad?-.6:ball.fullToss?Delivery.fullTossVelocity(ball):(ball.contactH-.035+4.905*ball.postTime*ball.postTime)/ball.postTime-9.81*ball.postTime;
    let p=NormalBall.build(origin,angle,speed,up,pad?'pad':'through',.1,ball.conditions);
    if(!pad&&Rules.hits(at)&&(ball.noBall||ball.freeHit)){const duration=.8/speed,beforeStumps={path:p,duration};p=NormalBall.build(at,sign*.8,3.8,1.1,'rebound',.1,ball.conditions);p={...p,beforeStumps,stopTime:p.stopTime+duration,bounces:p.bounces.map(b=>({...b,time:b.time+duration}))};out.stumpsHitTime=duration;}
    p=TeamField.pursue(p,ball,field,false);if(out.wicket){const time=out.dismissalKind==='lbw'?.65:Math.max(.015,.8/speed),point=out.dismissalKind==='lbw'?NormalBall.at(p,time):at;p.event={...point,type:out.dismissalKind==='lbw'?'lbw':'stumps',time};p.returnTime=time;out.detail=out.padEvidence?.reason||'The ball hit the stumps';}out.play=p;out.contactGrade=pad?'PAD':'NO CONTACT';
   }else{out.dismissalKind=out.wicket?'caught':null;if(out.wicket&&(ball.noBall||ball.freeHit)){out.wicket=false;out.dismissalKind=null;out.play={...out.play,event:{...out.play.event,type:'take'}};out.detail=(ball.noBall?'No ball':'Free hit')+' - caught, but the ball is still live';}}
   out.play=TeamField.prepare(out.play,out.rngState);if(ball.scoringVersion>=22)out.play.viewVersion=22;out=Running.create(out,ball);
   if(ball.scoringVersion>=12&&input?.callRuns)out=Running.automatic(out,!!input.pushRun);
   if(ball.scoringVersion<12&&input?.pushRun===true&&out.play.running?.legs.length&&out.play.throw.breakTime-out.play.running.legs.at(-1).end>1.8){out=Running.command(out,'run',.65);out.play.running.commands=[];out.autoRunRisk=true;}
   if(ball.runsNeeded===1&&(out.noBall||out.wide)){out=Rules.score({...out,wicket:false,dismissalKind:null,play:{...out.play,event:{...pos,type:'penalty',time:.02},throw:null,running:null},decisionTime:.02},0);out.detail=(out.noBall?'No ball':'Wide')+' - target reached';}
   if(ball.scoringVersion>=11&&out.edge&&!out.detail.startsWith(out.edgeType))out.detail=out.edgeType+' - '+out.detail;
   return out;
  }
 };
 Shot.resolve=function(ball,input,batter,field,seed){return ball.scoringVersion>=10?LiveBall.resolve(ball,input,batter,field,seed):ShotV9.resolve(ball,input,batter,field,seed);};
 const oppositionInputV9=Opposition.input;
 Opposition.input=function(m,ball){if(ball.scoringVersion<10)return oppositionInputV9.call(this,m,ball);const bot=oppositionInputV9.call(this,m,Hand.canonical(ball)),rng=RNG.stream(bot.rngState),push=rng.next()<(m.format==='T20'?.085:.025);return{shot:bot.shot?{...bot.shot,angle:bot.shot.angle*Hand.sign(ball),pushRun:push,...(ball.scoringVersion>=12?{callRuns:true}:{})}:null,rngState:rng.state};};
 Innings.create=function(...args){const m=InningsV9.create(...args),team=args[1];return{...m,freeHit:false,extrasDetail:{wides:0,noBalls:0,byes:0,legByes:0},batters:m.batters.map((b,i)=>({...b,attributes:{...b.attributes,hand:Hand.of(team.xi[i])}}))};};
 Innings.delivery=function(m){const d=InningsV9.delivery(m),rng=RNG.stream(d.rngState),hand=Hand.of(m.batters[m.striker]),noBall=rng.next()<.014,ball={...d.ball,scoringVersion:11,battingHand:hand,nonStrikerHand:Hand.of(m.batters[m.nonStriker]),noBall,freeHit:m.format==='T20'&&!!m.freeHit,runsNeeded:m.target===null?null:Math.max(0,m.target-m.runs),frontFootHeel:Rules.crease[1]+(noBall?-.07:.12)};if(hand==='left'){ball.line*=-1;if(ball.family==='swing')ball.variation=ball.variation==='Outswinger'?'Inswinger':'Outswinger';}return{ball,rngState:rng.state};};
 Innings.field=function(m,ball){const field=InningsV9.field(m,ball),hand=ball?.scoringVersion?Hand.sign(ball):Hand.of(m.batters[m.striker])==='left'?-1:1;return hand===1?field:field.map(f=>({...f,a:-f.a}));};
 Innings.apply=function(m,ball,result){if(result.rulesVersion!==10){const n=InningsV9.apply(m,ball,result);if(m.extrasDetail)n.extrasDetail={...m.extrasDetail,wides:m.extrasDetail.wides+(result.wide?result.runs:0)};return n;}if(m.complete||ball.bowler!==this.bowler(m))throw Error('This delivery does not belong to the open innings');
  const n={...m,batters:m.batters.map(b=>({...b})),bowlers:m.bowlers.map(b=>({...b})),history:m.history.slice(),extrasDetail:{wides:m.extras, noBalls:0,byes:0,legByes:0,...m.extrasDetail}},b=n.batters[n.striker],bowler=n.bowlers[ball.bowler],extras=Rules.extras(result),entry={...result,over:Math.floor(m.balls/6),ball:m.balls%6+1,batter:m.striker,nonStriker:m.nonStriker,delivery:ball,celebrations:Crowd.events(m,result)};
  if(n.history.length){const last=n.history.at(-1);n.history[n.history.length-1]={...last,play:undefined,padEvidence:undefined,retrieval:undefined,delivery:{bowler:last.delivery.bowler,archetype:last.delivery.archetype,lengthName:last.delivery.lengthName,variation:last.delivery.variation,speed:last.delivery.speed,scoringVersion:last.delivery.scoringVersion,battingHand:last.delivery.battingHand}};}
  n.runs+=result.runs;n.rngState=result.rngState;b.runs+=result.batRuns;b.balls+=result.ballsFaced;bowler.runs+=result.bowlerRuns;if(result.legal){n.balls++;bowler.balls++;}for(const key of Object.keys(extras))n.extrasDetail[key]+=extras[key];n.extras+=Object.values(extras).reduce((a,b)=>a+b,0);
  if(result.boundary&&result.batRuns===result.boundary)b[result.boundary===6?'sixes':'fours']++;
  if(result.endSwap||!result.wicket&&result.completedRuns%2)[n.striker,n.nonStriker]=[n.nonStriker,n.striker];
  if(result.wicket){n.wickets++;const dismissed=result.dismissalKind==='runOut'?(result.runOutRunner===1?m.nonStriker:m.striker):m.striker;entry.dismissedBatter=dismissed;n.batters[dismissed].dismissal=Rules.dismissal(result,bowler);if(result.dismissalKind!=='runOut')bowler.wickets++;if(n.wickets<10){if(n.striker===dismissed)n.striker=n.nextBatter++;else n.nonStriker=n.nextBatter++;}}
  if(result.legal&&n.balls%6===0)[n.striker,n.nonStriker]=[n.nonStriker,n.striker];n.freeHit=m.format==='T20'&&(result.noBall||result.wide&&!!m.freeHit);n.history.push(entry);n.complete=n.wickets>=10||n.limitBalls!==null&&n.balls>=n.limitBalls||n.target!==null&&n.runs>=n.target;n.endReason=n.complete?(n.target!==null&&n.runs>=n.target?'target':n.wickets>=10?'all out':'overs'):null;return n;
 };
 // A captain reacts to recent scoring, then locks a legal field before bowling.
 const Tactics={
  outside(f){const a=f.a*Math.PI/180,x=Math.sin(a)*f.r*64,z=Math.cos(a)*f.r*64;return Math.hypot(x,z-clamp(z,Rules.wickets[0],Rules.wickets[1]))>27.43;},
  legal(field,m){if(field.length!==9||field.some(f=>!Number.isFinite(f.a)||Math.abs(f.a)>180||!Number.isFinite(f.r)||f.r<.07||f.r>.96||typeof f.n!=='string'||!f.n.length||f.n.length>32))return false;const points=Fielding.positions(field);if(points.some((p,i)=>points.slice(i+1).some(q=>Math.hypot(p.x-q.x,p.z-q.z)<3)))return false;if(points.filter(p=>p.x<0&&p.z<Rules.crease[0]).length>2)return false;return m.format!=='T20'||field.filter(f=>f.a<0).length<=5&&field.filter(f=>this.outside(f)).length<=(m.balls<36?2:5);},
  zone(angle){return angle<-125?'fine leg':angle<-78?'square leg':angle<-28?'midwicket':angle<28?'straight':angle<62?'cover':angle<108?'point':'third man';},
  plan(m,ball){const owner=m.bowlers[Innings.bowler(m)],hand=ball?.battingHand||Hand.of(m.batters[m.striker]),sign=hand==='left'?-1:1,base=Bowling.field(m,ball?.family?ball:owner),field=base.map(f=>({...f})),zones=new Map();
   const last=m.history.at(-1),previous=last?.delivery?.savedField;if(m.format==='T20'&&m.freeHit&&last?.batter===m.striker&&previous&&this.legal(previous.map(f=>({...f,a:f.a*sign})),m))return{field:previous.map(f=>({...f})),note:'Field held for the free hit',adapted:0};
   m.history.slice(-18).forEach((r,i)=>{const batRuns=Rules.batterRuns(r);if(r.batter!==m.striker||!r.contact||r.edge||r.contactGrade==='EDGE'||batRuns<1||!Number.isFinite(r.angle))return;const angle=r.angle*(r.delivery?.battingHand==='left'?-1:1),key=this.zone(angle),z=zones.get(key)||{key,hits:0,boundaries:0,runs:0,weight:0,angle:0};const weight=(r.boundary||batRuns>=4?3:1)*Math.pow(.96,17-i);z.hits++;z.boundaries+=!!r.boundary||batRuns>=4?1:0;z.runs+=batRuns;z.weight+=weight;z.angle+=angle*weight;zones.set(key,z);});
   const hot=[...zones.values()].filter(z=>z.boundaries>=2||z.hits>=3).sort((a,b)=>b.weight-a.weight).slice(0,2),moved=new Set(),notes=[];
   for(const z of hot){const deep=z.boundaries>=2||z.runs>=10,mean=clamp(z.angle/z.weight,-176,176),angle=z.key==='straight'&&Math.abs(mean)<12?(mean<0?-12:12):Math.round(mean/5)*5,target={a:angle,r:(deep?58:20)/64,n:deep?(z.key==='straight'?(angle<0?'long-on':'long-off'):z.key==='third man'?'third man':'deep '+z.key):z.key==='straight'?(angle<0?'mid-on':'mid-off'):z.key==='third man'?'short third':z.key},at=Fielding.positions([target])[0],candidates=field.map((f,i)=>{const p=Fielding.positions([f])[0];return{i,cost:Math.hypot(p.x-at.x,p.z-at.z)};}).filter(({i})=>!moved.has(i)&&!['first slip','slip'].includes(field[i].n)).sort((a,b)=>a.cost-b.cost);
    for(const {i}of candidates){const next=field.map((f,j)=>j===i?target:f);if(!this.legal(next,m))continue;field[i]=target;moved.add(i);notes.push(deep?z.key+' boundary protected':z.key+' single closed down');break;}
   }
   return{field:sign===1?field:field.map(f=>({...f,a:-f.a})),note:notes.length?'Field: '+notes.join(' · '):m.format==='TEST'?'Field: attacking '+(Strokes.spin(ball?.family?ball:owner)?'spin':'pace'):m.balls<36?'Field: powerplay':'Field: boundary protection',adapted:notes.length};
  }
 };
 const deliveryV11=Innings.delivery,fieldV11=Innings.field;
 Innings.delivery=function(m){const d=deliveryV11(m),ball={...d.ball,scoringVersion:12},plan=Tactics.plan(m,ball);return{...d,ball:{...ball,savedField:plan.field,fieldNote:plan.note,fieldAdapted:plan.adapted}};};
 Innings.field=function(m,ball){if(ball?.scoringVersion&&ball.scoringVersion<12)return fieldV11(m,ball);return ball?.savedField?ball.savedField.map(f=>({...f})):Tactics.plan(m,ball).field;};
 const crowdEventsV9=Crowd.events;
 Crowd.events=function(m,r){if(r.rulesVersion!==10)return crowdEventsV9.call(this,m,r);const events=[];if(r.wicket)events.push({kind:'wicket',label:'Wicket'});else if(r.boundary)events.push({kind:r.boundary===6?'six':'four',label:r.boundary===6?'Six':'Four'});const b=m.batters[m.striker];for(const [value,kind]of [[50,'fifty'],[100,'hundred'],[150,'onefifty'],[200,'double']])if(b.runs<value&&b.runs+r.batRuns>=value)events.push({kind,label:b.name+' '+value,value});for(let value=(Math.floor(m.runs/100)+1)*100;value<=m.runs+r.runs;value+=100)events.push({kind:'team',label:(m.teamName||'Team')+' '+value,value});return events;};
 Fielding.freeBall=function(p,t){return p.beforeStumps?t<p.beforeStumps.duration?NormalBall.at(p.beforeStumps.path,t):NormalBall.at(p,t-p.beforeStumps.duration):FieldingV9.freeBall.call(this,p,t);};
 Fielding.ballAt=function(p,t){return p.teamVersion===10?TeamField.ballAt(p,t):FieldingV9.ballAt.call(this,p,t);};
 Fielding.playback=function(p,age){return p.teamVersion===10?Presentation.playback(p,age):FieldingV9.playback.call(this,p,age);};
 Fielding.frame=function(out,t,field,delivery){return out?.play?.teamVersion===10?TeamField.frame(out,t):FieldingV9.frame.call(this,out,t,field,delivery);};
 View.camera=function(p,t,age,stance){const base=ViewV9.camera.call(stance?{...this,batting:stance}:this,p,t,age);if(p?.teamVersion!==10||!p.throw)return base;const k=BatterRig.smooth((t-p.throw.release+.35)/.65),side={x:p.event.x<0?-23:23,y:11,z:9,tx:0,ty:.4,tz:9.25};return Object.fromEntries(Object.keys(base).map(key=>[key,lerp(base[key],side[key],k)]));};
 // Weather has a separate seed and match clock. Viewing it never consumes a ball.
 const Weather={
  profiles:[{name:'Sunny',cloud:.12,temp:26,wind:5,damp:.04},{name:'Overcast',cloud:.88,temp:18,wind:8,damp:.12},{name:'Breezy',cloud:.43,temp:21,wind:25,damp:.07},{name:'Damp',cloud:.95,temp:16,wind:7,damp:.48}],
  key(m,index){const rng=RNG.stream(((m.pitchSeed??m.seed)^0x71ce903)>>>0),warm=['ind','pak','sl','wi'].includes(m.pitchVenue||m.teamId);let type=Math.floor(rng.next()*4);for(let i=0;i<index;i++)type=(type+1+Math.floor(rng.next()*3))%4;const p=this.profiles[type],jitter=rng.next(),wind=p.wind*(.8+rng.next()*.4),direction=rng.next()*Math.PI*2;return{...p,temp:p.temp+(warm?5:0)+(jitter-.5)*3,wind,windX:Math.sin(direction),windZ:Math.cos(direction)};},
  at(m){const clock=m.format==='TEST'?(m.pitchClock??m.balls*40):(m.pitchBalls??m.balls)*40,span=m.format==='TEST'?3600:1200,step=Math.floor(clock/span),u=clock/span-step,k=u*u*(3-2*u),a=this.key(m,step),b=this.key(m,step+1),values=Object.fromEntries(['cloud','temp','wind','damp','windX','windZ'].map(key=>[key,lerp(a[key],b[key],k)]));return{version:13,step,progress:u,name:(k<.5?a:b).name,...values};},
  effects(w){const density=288.15/(273.15+w.temp),headwind=w.windZ*w.wind/3.6;return{swing:clamp(density*Math.pow(1+headwind/38,2)*(1-w.wind*.0015),.84,1.18),bounce:1-.18*w.damp,pace:1-.10*w.damp,firm:1-.20*w.damp,turn:1-.18*w.damp};},
  wind(w){return{angle:Math.round(Math.atan2(w.windX,w.windZ)*180/Math.PI/45)*45,speed:Math.round(w.wind/5)*5};},
  brief(w){const e=this.effects(w);return w.name+' · '+(w.damp>.27?'Damp, lower bounce':w.damp>.12?'Moist strip':'Dry strip')+' · '+(e.swing>1.035?'More swing':e.swing<.96?'Less swing':'Usual swing');},
  label(w){const wind=Math.abs(w.windZ)<.35?'crosswind':w.windZ>0?'headwind':'tailwind';return w.name+' · '+Math.round(w.temp)+'°C · '+this.wind(w).speed+' km/h '+wind;},
  report(w){const effect=this.effects(w);return this.label(w)+' · '+(w.damp>.27?'Damp strip, lower carry':w.damp>.12?'Some moisture in the strip':'Firm, dry strip')+' · '+(effect.swing>1.035?'Air favours swing':effect.swing<.96?'Less help for swing':'Usual swing conditions');},
  valid(w){return !!w&&w.version===13&&this.profiles.some(p=>p.name===w.name)&&['cloud','damp','progress'].every(k=>Number.isFinite(w[k])&&w[k]>=0&&w[k]<=1)&&Number.isInteger(w.step)&&w.step>=0&&w.step<=50&&Number.isFinite(w.temp)&&w.temp>=5&&w.temp<=40&&Number.isFinite(w.wind)&&w.wind>=0&&w.wind<=40&&['windX','windZ'].every(k=>Number.isFinite(w[k])&&Math.abs(w[k])<=1);}
 };
 const conditionsV12=Conditions.at,deliveryV12=Innings.delivery;
 Conditions.at=function(m){const p=conditionsV12.call(this,m),weather=Weather.at(m),e=Weather.effects(weather);return{...p,version:13,weather,swing:p.swing*e.swing,bounce:p.bounce*e.bounce,pace:p.pace*e.pace,firm:p.firm*e.firm,turn:p.turn*e.turn,variation:p.variation+weather.damp*.025};};
 Innings.delivery=function(m){const d=deliveryV12(m),ball={...d.ball,scoringVersion:17,weather:d.ball.conditions.weather};
  // Presentation time only: the same turn and physical post-bounce speed,
  // with more time to read spin after pitching. The release has no speed jump.
  if(Strokes.spin(ball)){const before=ball.preTime*2600,after=ball.postTime*3200;ball.duration=before+after;ball.bounceT=before/ball.duration;}
  return{...d,ball};
 };
 // Compact strokes keep their own launch and finish; old saved balls retain V13.
 const launchV13=NormalBall.launch;
 NormalBall.launch=function(out,ball,input,batter,rng){const launch=launchV13.call(this,out,ball,input,batter,rng);if(ball.scoringVersion<15)return launch;
  if(out.edge&&input.mode==='defend'){const late=clamp(Math.abs(input.error)/Contact.window(ball,batter,input),0,1);launch.vx*=.58+.15*late;launch.vy=Math.min(launch.vy,-.5+1.5*late);launch.spinRatio=.08;}
  else if(!out.edge&&out.shot==='Back-foot punch'&&input.mode==='ground'){launch.vx*=ball.scoringVersion>=16?.96:.88;launch.vy=-Math.max(1.8,launch.origin.h*4.2);launch.kind='ground';launch.spinRatio=.42;}
  if(ball.scoringVersion>=16&&!out.edge&&out.shot==='Hook'&&input.mode==='ground')launch.vy=-Math.max(launch.origin.h*5.2,1.8);
  return launch;
 };
 const PreDelivery={
  changed(previous,ball){if(!previous||previous.bowler!==ball.bowler||previous.battingHand!==ball.battingHand||previous.weather?.name!==ball.weather?.name)return true;const a=previous.savedField,b=ball.savedField;if(!a||!b)return true;return Fielding.positions(a).some((p,i)=>{const q=Fielding.positions(b)[i];return !q||Math.hypot(p.x-q.x,p.z-q.z)>.01||a[i].n!==b[i].n;});}
 };
 // Presentation clocks never alter delivery, running, fielding or match RNG.
 const Presentation={
  cordon(p){return p?.viewVersion>=22&&p.event.type==='catch'&&p.event.z<-.8&&Math.hypot(p.event.x,p.event.z)<25;},
  playback(p,age){const t=Math.max(0,age)/1000,e=p.event;if(!this.cordon(p))return t;const span=Math.max(1.05,e.time);return t<span?t/span*e.time:e.time+t-span;},
  blend(from,to,age,duration=1100){const u=clamp(age/duration,0,1),k=u*u*u*(u*(u*6-15)+10);return Object.fromEntries(Object.keys(to).map(key=>[key,lerp(from[key],to[key],k)]));},
  fieldCamera(play,w,h){
   const close=this.cordon(play),points=close?[{x:0,z:.5,h:1.8},{x:play.event.x,z:play.event.z,h:2.3}]:[{x:0,z:Rules.wickets[0],h:1.8},{x:0,z:Rules.wickets[1],h:1.8}];
   for(let i=0;i<=16;i++){const p=Fielding.freeBall(play,play.event.time*i/16);points.push({...p,h:p.h+.6});}
   if(play.throw)for(let i=0;i<=12;i++){const p=TeamField.ballAt(play,lerp(play.throw.release,play.throw.breakTime,i/12));points.push({...p,h:p.h+.6});}
   const xs=points.map(p=>p.x),zs=points.map(p=>p.z),ys=points.map(p=>p.h),tx=(Math.min(...xs)+Math.max(...xs))/2,tz=(Math.min(...zs)+Math.max(...zs))/2,ty=(Math.min(...ys)+Math.max(...ys))*.40;
   const direction=Math.atan2(play.event.x,play.event.z),dx=Math.sin(direction),dz=Math.cos(direction);
   let distance=close?10:18,view;for(let i=0;i<40;i++){view={x:tx+distance*(close?.72:-dx+dz*.14),y:ty+distance*(close?.24:.22),z:tz+distance*(close?.69:-dz-dx*.14),tx,ty,tz};if(points.every(p=>{const q=View.project(p.x,p.z,p.h,view,w,h);return q.depth>.6&&q.x>w*.10&&q.x<w*.90&&q.y>h*.12&&q.y<h*.88;}))break;distance*=1.12;}return view;
  },
  sequence(result){
   const prominent=result?.presentationVersion>=18;let start=prominent?(this.cordon(result?.play)?950:450):0;
   return(result?.celebrations||[]).map(e=>{
    const duration=prominent?(e.value?3500:e.kind==='wicket'?2200:2800):e.value?2600:e.kind==='wicket'?2000:1900,
     title=e.kind==='four'?'FOUR':e.kind==='six'?'SIX':e.kind==='team'?e.value+' UP':e.value?String(e.value):'WICKET',
     caption=({four:'FOUR',six:'SIX',fifty:'HALF-CENTURY',hundred:'CENTURY',onefifty:'150 RUNS',double:'DOUBLE CENTURY',team:'TEAM TOTAL',wicket:'WICKET'})[e.kind]||'MILESTONE',
     numeral=e.kind==='four'?'4':e.kind==='six'?'6':e.value?String(e.value):'W',
     detail=e.kind==='four'?'To the boundary':e.kind==='six'?'Over the rope':e.value?e.label:result.title;
    const item={...e,title,caption,numeral,detail,start,duration};start+=duration;return item;
   });
  },
  duration(result){const last=this.sequence(result).at(-1);return last?last.start+last.duration:0;},
  celebration(result,age){if(!Number.isFinite(age))return null;const e=this.sequence(result).find(e=>age>=e.start&&age<e.start+e.duration);if(!e)return null;const time=age-e.start,prominent=result.presentationVersion>=18;return{...e,time,alpha:BatterRig.smooth(time/(prominent?450:320))*BatterRig.smooth((e.duration-time)/(prominent?600:450))};}
 };
 BatterRig.salute=function(p,amount,hand='right'){
  if(!amount)return p;const {v,add,sub,mul,unit,mix,ik,cross}=this,sign=hand==='left'?-1:1,k=clamp(amount,0,1),grip=mix(p.grip,add(p.rightShoulder,v(sign*.25,.36,.06)),k),direction=unit(mix(p.direction,unit(v(sign*.24,.96,.04)),k)),face=unit(cross(cross(direction,v(0,0,1)),direction));
  const leftTarget=mix(p.leftWrist,add(p.leftShoulder,v(-sign*.08,-.48,.03)),k),rightTarget=add(grip,mul(direction,.07)),left=ik(p.leftShoulder,leftTarget,.31,.28,add(p.leftShoulder,v(-sign*.4,-.25,.2))),right=ik(p.rightShoulder,rightTarget,.31,.28,add(p.rightShoulder,v(sign*.45,.05,.15)));
  return{...p,grip,direction,batFace:face,batWidth:unit(cross(direction,face)),leftWrist:left.end,leftElbow:left.joint,rightWrist:right.end,rightElbow:right.joint,knob:sub(grip,mul(direction,.13)),bladeTop:add(grip,mul(direction,.11)),toe:add(grip,mul(direction,.70)),sweetSpot:add(grip,mul(direction,.54))};
 };
 const Restart={
  match(state){if(!state.contest)return{...state,schema:4,engine:4,match:Match.create(state.match.seed,state.match.maxOvers),...this.view()};let league=state.league;if(state.recorded){const round=Math.max(0,league.round-1);league={...league,round,complete:false,movement:null,fixtures:league.fixtures.map(f=>f.round>=round?{...f,result:null}:f),records:league.records.filter(r=>r.year<league.year)};}const contest=Season.begin(league);return{...state,league,contest,match:Contest.current(contest),recorded:false,...this.view()};},
  view(){return{pending:null,phase:'ready',elapsed:0,shot:null,botInput:null,resultAge:0,celebrationAge:0,watchUntil:0,batUntil:0,betweenAge:0,loftIntent:false,testCase:null,live:null,fieldBrief:false,briefAge:0,briefCards:[],introducedBatters:[],ballBridge:null,reward:0};}
 };
 // Visual clocks use one incoming path, without pulling or freezing the ball
 // at a guessed impact point. These helpers never consume match randomness.
 const BallView={
  scale(ball){return ball.fullToss?2600:ball.duration*(1-ball.bounceT)/ball.postTime;},
  incoming(ball,elapsed){
   if(elapsed<=ball.duration)return Delivery.at(ball,elapsed/ball.duration);
   const seconds=(elapsed-ball.duration)/this.scale(ball);return Rules.atZ(ball,-Delivery.incomingSpeed(ball)*seconds);
  },
  cue(ball,elapsed){const p=this.incoming(ball,elapsed);return{progress:clamp(1-p.z/18.4,0,1),distance:Math.max(0,p.z),atBat:Math.abs(elapsed-ball.duration)<=95};},
  startAt(ball,result,elapsed){return !result.contact&&result.play?.kind==='through'?Math.max(0,(elapsed-ball.duration)/this.scale(ball)):0;},
  bridge(ball,elapsed,play,startAt=0){const from=this.incoming(ball,elapsed),to=Fielding.ballAt(play,startAt),distance=Math.hypot(from.x-to.x,from.z-to.z,from.h-to.h);return{from,startAt,duration:clamp(distance/20,.08,.22)};},
  replay(play,time,bridge){const p=Fielding.ballAt(play,time),age=time-(bridge?.startAt||0);if(!bridge||age>=bridge.duration)return p;const origin=Fielding.ballAt(play,bridge.startAt||0),k=1-BatterRig.smooth(age/bridge.duration);return{...p,x:p.x+(bridge.from.x-origin.x)*k,z:p.z+(bridge.from.z-origin.z)*k,h:Math.max(.035,p.h+(bridge.from.h-origin.h)*k)};},
  impactTime(ball,shot){return shot.visualVersion>=29?Math.max(ball.duration,ball.duration+shot.error,ball.duration+(shot.rawError??shot.error)):Math.max(ball.duration,ball.duration+shot.error+BatterRig.settle(shot.error));},
  strokeAge(ball,shot,elapsed,after=0){return elapsed+after-BallView.impactTime(ball,shot);},
  contactTarget(ball,shot,elapsed){return this.incoming(ball,shot?this.impactTime(ball,shot):Math.max(ball.duration,elapsed));}
 };
 // A shared wallet spans both formats. A fixture can pay out only once even
 // if it is restarted; cosmetic ownership does not enter the match RNG.
 const Economy={
  stadiums:[
   {id:'club',name:'Club ground',city:'Local cricket',price:0,rows:2,sectors:24,roof:0,seat:'#879877',wall:'#c2bfaa',grass:['#668948','#5b8041'],lights:false,scene:'club',note:'Open boundary, modest pavilion and a small crowd.'},
   {id:'newlands',name:'Newlands',city:'Cape Town',price:900,rows:5,sectors:44,roof:5,seat:'#7b999a',wall:'#c3d0ca',grass:['#568442','#4d793a'],lights:true,scene:'mountain',note:'Mountain backdrop and low, open stands.'},
   {id:'eden',name:'Eden Gardens',city:'Kolkata',price:1800,rows:10,sectors:64,roof:8,seat:'#769da0',wall:'#bea786',grass:['#648747','#597e3d'],lights:true,scene:'eden',note:'Packed curved stands and a warm city setting.'},
   {id:'mcg',name:'Melbourne Cricket Ground',city:'Melbourne',price:3000,rows:15,sectors:64,roof:16,seat:'#648b96',wall:'#aebbbd',grass:['#648b51','#577f43'],lights:true,scene:'bowl',note:'A tall stadium bowl with a continuous roof.'},
   {id:'lords',name:'Lord’s',city:'London',price:4500,rows:7,sectors:52,roof:9,seat:'#73918b',wall:'#b18d76',grass:['#6b8c4d','#60823f'],lights:true,scene:'pavilion',note:'A red-brick pavilion and pale modern stands.'}
  ],
  kits:[
   {id:'basic',name:'Club basics',price:0,shirt:'#607887',trousers:'#344b58',trim:'#becbc6',pattern:'plain',note:'Plain club colours and simple whites.'},
   {id:'green',name:'Forest stripe',price:300,shirt:'#20564c',trousers:'#153e37',trim:'#d9ba65',pattern:'stripe',note:'Deep green with a gold chest stripe.'},
   {id:'blue',name:'Royal chevron',price:600,shirt:'#235597',trousers:'#183b68',trim:'#c5e4e8',pattern:'chevron',note:'Royal blue with an ice-blue chevron.'},
   {id:'maroon',name:'Heritage maroon',price:900,shirt:'#7f3046',trousers:'#49283a',trim:'#e2c593',pattern:'stripe',note:'Maroon with warm cream detailing.'},
   {id:'black',name:'Midnight gold',price:1500,shirt:'#25333d',trousers:'#192831',trim:'#dfb95c',pattern:'chevron',note:'Charcoal with a gold chevron and trim.'}
  ],
  create(){return{version:1,coins:0,stadiums:['club'],kits:['basic'],stadium:'club',kit:'basic',rewarded:[]};},
  item(kind,id){return (kind==='stadium'?this.stadiums:kind==='kit'?this.kits:[]).find(x=>x.id===id);},
  valid(p){return !!p&&p.version===1&&Number.isSafeInteger(p.coins)&&p.coins>=0&&p.coins<=10000000&&['stadium','kit'].every(k=>Array.isArray(p[k+'s'])&&new Set(p[k+'s']).size===p[k+'s'].length&&p[k+'s'].includes(k==='stadium'?'club':'basic')&&p[k+'s'].includes(p[k])&&p[k+'s'].every(id=>this.item(k,id)))&&Array.isArray(p.rewarded)&&p.rewarded.length<=20000&&new Set(p.rewarded).size===p.rewarded.length&&p.rewarded.every(k=>typeof k==='string'&&k.length<160);},
  buy(p,kind,id){const item=this.item(kind,id);if(!this.valid(p)||!item)throw Error('Unknown shop item');if(p[kind+'s'].includes(id))return{...p,[kind]:id};if(p.coins<item.price)throw Error('Not enough coins');return{...p,coins:p.coins-item.price,[kind+'s']:[...p[kind+'s'],id],[kind]:id};},
  key(s){return[s.league.format,s.league.seed,s.league.year,s.contest.seed,s.contest.playerId,...s.contest.teams.map(t=>t.id)].join(':');},
  reward(p,s){const c=s.contest,key=this.key(s);if(c.phase!=='complete'||c.result?.kind!=='win'||c.result.winnerId!==c.playerId||p.rewarded.includes(key))return{wallet:p,amount:0};const amount=c.format==='TEST'?500:300;return{wallet:{...p,coins:Math.min(10000000,p.coins+amount),rewarded:[...p.rewarded,key]},amount};},
  colours(p,format,ours=true,teamColour='#557f9b'){const k=ours?this.item('kit',p.kit):null;return{shirt:format==='TEST'?'#ecebdd':k?.shirt||teamColour,trousers:format==='TEST'?'#e0e1d2':k?.trousers||'#2b4657',trim:k?.trim||'#bcc8b8',pattern:k?.pattern||'plain'};}
 };
 // Career-inspired game estimates, not official rankings or live form.
 // Each named row has Test control, T20 control, power and a batting style.
 const Players=(()=>{
  const rows=`Zak Crawley|76|77|82|driver
Ben Duckett|85|84|76|sweeper
Ollie Pope|77|72|72|driver
Joe Root|97|85|67|timer
Harry Brook|91|92|90|backfoot
Ben Stokes|85|81|89|allrounder
Jamie Smith|82|81|83|backfoot
Jofra Archer|32|42|61|lower
Brydon Carse|46|45|69|lower
Shoaib Bashir|18|17|27|tail
Josh Tongue|21|19|32|tail
Yashasvi Jaiswal|91|91|87|attacker
KL Rahul|84|86|77|driver
Sai Sudharsan|77|87|75|driver
Shubman Gill|88|90|83|driver
Rishabh Pant|90|86|93|sweeper
Ravindra Jadeja|82|77|80|allrounder
Washington Sundar|73|70|73|allrounder
Kuldeep Yadav|32|26|35|tail
Akash Deep|27|27|51|lower
Jasprit Bumrah|21|18|36|tail
Mohammed Siraj|20|18|33|tail
Jake Weatherald|72|74|79|driver
Travis Head|91|94|94|backfoot
Marnus Labuschagne|87|70|67|timer
Steve Smith|97|87|73|timer
Cameron Green|82|82|87|allrounder
Alex Carey|85|76|76|sweeper
Beau Webster|77|72|82|allrounder
Pat Cummins|49|56|72|lower
Mitchell Starc|49|45|71|lower
Nathan Lyon|24|21|38|tail
Josh Hazlewood|20|18|31|tail
Aiden Markram|84|87|81|driver
Ryan Rickelton|80|84|84|backfoot
Tristan Stubbs|82|88|90|finisher
Temba Bavuma|87|65|58|timer
David Bedingham|78|74|79|backfoot
Kyle Verreynne|78|66|66|timer
Wiaan Mulder|76|69|75|allrounder
Marco Jansen|59|67|84|lower
Keshav Maharaj|43|40|62|lower
Kagiso Rabada|30|35|53|lower
Lungi Ngidi|17|17|33|tail
Tom Latham|85|70|66|sweeper
Devon Conway|84|86|75|timer
Kane Williamson|96|83|63|timer
Rachin Ravindra|87|85|84|driver
Daryl Mitchell|85|88|87|allrounder
Tom Blundell|78|65|67|timer
Michael Bracewell|59|74|84|allrounder
Mitchell Santner|59|67|68|allrounder
Matt Henry|39|37|57|lower
Jacob Duffy|23|22|36|tail
Nathan Smith|57|49|64|allrounder
Abdullah Shafique|78|72|68|driver
Shan Masood|75|69|71|driver
Babar Azam|89|87|74|driver
Saud Shakeel|88|61|56|sweeper
Mohammad Rizwan|84|87|72|sweeper
Salman Agha|80|77|75|allrounder
Faheem Ashraf|52|58|74|lower
Sajid Khan|29|30|52|lower
Noman Ali|38|29|48|lower
Naseem Shah|22|24|39|tail
Shaheen Afridi|32|42|68|lower
Pathum Nissanka|86|85|77|driver
Oshada Fernando|72|61|60|timer
Dinesh Chandimal|86|73|70|sweeper
Kamindu Mendis|90|76|78|timer
Dhananjaya de Silva|83|73|77|allrounder
Kusal Mendis|81|88|82|sweeper
Milan Rathnayake|54|40|62|lower
Prabath Jayasuriya|23|19|32|tail
Asitha Fernando|17|15|25|tail
Lahiru Kumara|16|15|33|tail
Nishan Peiris|29|28|43|lower
John Campbell|67|65|74|driver
Tagenarine Chanderpaul|73|47|45|timer
Alick Athanaze|76|71|71|sweeper
Shai Hope|76|87|74|timer
Kavem Hodge|75|60|69|driver
Roston Chase|72|73|68|allrounder
Justin Greaves|70|59|71|allrounder
Tevin Imlach|66|53|56|timer
Jomel Warrican|29|24|42|tail
Kemar Roach|25|23|39|tail
Jayden Seales|17|17|30|tail
Phil Salt|70|94|94|attacker
Jos Buttler|77|95|95|finisher
Will Jacks|67|83|88|attacker
Sam Curran|59|75|80|allrounder
Liam Dawson|66|66|65|allrounder
Adil Rashid|41|36|49|lower
Jamie Overton|48|63|89|lower
Luke Wood|32|41|62|lower
Abhishek Sharma|67|92|94|attacker
Sanju Samson|70|87|87|driver
Suryakumar Yadav|66|96|93|sweeper
Tilak Varma|75|88|79|timer
Hardik Pandya|71|89|94|finisher
Shivam Dube|59|83|96|spinHitter
Axar Patel|73|79|81|allrounder
Arshdeep Singh|20|20|35|tail
Harshit Rana|36|37|55|lower
Mitchell Marsh|76|88|95|attacker
Josh Inglis|76|86|82|sweeper
Glenn Maxwell|72|90|94|sweeper
Tim David|50|88|99|finisher
Adam Zampa|26|26|40|tail
Nathan Ellis|23|28|46|tail
Xavier Bartlett|35|36|53|lower
Ben Dwarshuis|38|48|68|lower
Quinton de Kock|85|91|88|backfoot
David Miller|70|90|96|finisher
Dewald Brevis|67|83|93|attacker
Anrich Nortje|21|19|37|tail
Finn Allen|59|89|96|attacker
Glenn Phillips|75|86|92|finisher
Mark Chapman|65|79|81|sweeper
Ish Sodhi|34|28|47|lower
Lockie Ferguson|20|19|34|tail
Kyle Jamieson|53|43|65|lower
Saim Ayub|75|84|84|attacker
Fakhar Zaman|76|85|91|attacker
Sahibzada Farhan|67|80|82|driver
Shadab Khan|51|70|77|allrounder
Mohammad Nawaz|57|61|70|allrounder
Abrar Ahmed|21|20|35|tail
Kusal Perera|77|84|88|backfoot
Charith Asalanka|66|82|83|finisher
Dasun Shanaka|51|73|91|finisher
Dunith Wellalage|53|55|60|allrounder
Dushan Hemantha|42|43|58|lower
Maheesh Theekshana|25|29|45|tail
Dushmantha Chameera|23|26|47|tail
Matheesha Pathirana|13|14|24|tail
Brandon King|69|81|80|driver
Johnson Charles|53|81|90|attacker
Shimron Hetmyer|72|86|94|finisher
Rovman Powell|58|82|97|finisher
Jason Holder|66|68|83|allrounder
Akeal Hosein|37|44|61|lower
Romario Shepherd|39|70|95|finisher
Shamar Joseph|26|29|52|lower`;
  // Bowling rows: name, type, arm, normal pace range, control, movement,
  // bounce, variation skill, yorker skill, Test rating, T20 rating.
  const bowlingRows=`Jofra Archer|seam|right|138|151|85|83|95|88|88|88|92
Brydon Carse|seam|right|133|147|79|79|91|71|64|83|78
Shoaib Bashir|offspin|right|78|91|71|80|92|62|25|76|54
Joe Root|offspin|right|76|87|57|51|55|40|20|48|40
Josh Tongue|seam|right|134|146|75|85|89|67|66|81|69
Jasprit Bumrah|seam|right|133|148|98|94|86|97|99|98|99
Mohammed Siraj|swing|right|131|145|83|91|80|73|79|86|80
Kuldeep Yadav|legspin|left|76|89|85|98|85|95|31|90|93
Ravindra Jadeja|offspin|left|85|97|95|82|76|79|39|94|84
Akash Deep|seam|right|131|143|81|86|80|64|62|81|66
Josh Hazlewood|seam|right|131|143|97|89|90|86|87|94|94
Pat Cummins|seam|right|133|148|93|91|97|86|84|97|89
Nathan Lyon|offspin|right|80|92|94|93|98|81|27|95|63
Mitchell Starc|leftpace|left|137|151|84|96|85|86|97|93|90
Cameron Green|seam|right|129|142|74|72|91|63|54|73|66
Kagiso Rabada|seam|right|135|149|89|93|96|86|88|96|90
Lungi Ngidi|seam|right|128|141|80|82|88|91|79|82|84
Keshav Maharaj|offspin|left|78|91|93|89|83|82|31|91|86
Aiden Markram|offspin|right|79|91|67|57|64|49|22|51|61
Marco Jansen|leftpace|left|130|144|79|87|99|74|72|87|82
Matt Henry|swing|right|130|143|93|94|84|78|78|93|83
Jacob Duffy|seam|right|129|140|85|83|82|78|76|79|86
Mitchell Santner|offspin|left|79|94|96|84|82|91|41|76|94
Michael Bracewell|offspin|right|80|93|82|76|77|78|33|67|78
Nathan Smith|seam|right|125|138|80|80|77|72|65|71|64
Naseem Shah|swing|right|134|148|86|94|85|82|87|85|89
Faheem Ashraf|seam|right|124|137|75|67|70|80|67|66|69
Sajid Khan|offspin|right|80|93|85|90|87|72|27|85|61
Noman Ali|offspin|left|76|89|93|93|76|77|25|90|56
Shaheen Afridi|leftpace|left|132|148|86|98|88|86|94|88|94
Asitha Fernando|swing|right|131|145|87|91|81|78|80|89|76
Lahiru Kumara|seam|right|135|149|73|81|90|68|66|80|72
Prabath Jayasuriya|offspin|left|77|90|93|96|86|85|26|92|59
Nishan Peiris|offspin|right|78|91|79|83|82|64|25|72|57
Milan Rathnayake|seam|right|124|136|78|79|78|65|56|72|55
Kemar Roach|swing|right|125|139|94|95|78|77|70|89|62
Jayden Seales|seam|right|130|144|87|88|86|75|75|87|72
Jomel Warrican|offspin|left|75|88|86|90|78|76|24|82|53
Roston Chase|offspin|right|79|92|80|69|86|68|28|67|77
Justin Greaves|seam|right|123|134|73|68|76|60|50|60|50
Jamie Overton|seam|right|133|147|72|70|93|79|76|71|79
Adil Rashid|legspin|right|76|89|90|96|79|98|28|74|96
Liam Dawson|offspin|left|79|91|93|80|77|83|30|70|85
Luke Wood|leftpace|left|131|144|76|84|77|82|83|65|77
Harshit Rana|seam|right|131|145|76|79|89|83|75|71|79
Axar Patel|offspin|left|84|97|94|78|75|86|38|87|88
Arshdeep Singh|leftpace|left|128|142|88|93|78|90|95|74|94
Xavier Bartlett|swing|right|128|140|87|94|83|74|74|72|83
Nathan Ellis|seam|right|126|139|90|69|70|99|96|58|90
Adam Zampa|legspin|right|80|94|92|89|76|97|30|60|95
Glenn Maxwell|offspin|right|81|94|75|64|70|71|28|53|73
Ben Dwarshuis|leftpace|left|126|138|79|73|77|88|82|59|78
Anrich Nortje|seam|right|141|154|78|77|98|78|85|87|91
Lockie Ferguson|seam|right|140|153|81|79|96|86|89|73|91
Ish Sodhi|legspin|right|76|91|76|91|84|91|26|66|83
Kyle Jamieson|seam|right|128|141|88|85|99|73|70|88|72
Shadab Khan|legspin|right|79|93|82|87|78|92|29|61|85
Mohammad Nawaz|offspin|left|82|94|84|76|73|79|32|62|75
Dushmantha Chameera|seam|right|134|148|77|79|93|81|84|75|81
Matheesha Pathirana|seam|right|135|151|75|75|73|96|98|48|92
Dushan Hemantha|legspin|right|76|90|70|81|75|78|25|50|65
Maheesh Theekshana|offspin|right|83|98|89|84|76|98|42|71|91
Dunith Wellalage|offspin|left|79|92|86|82|76|80|30|68|77
Shamar Joseph|seam|right|134|149|72|82|91|64|65|82|64
Akeal Hosein|offspin|left|81|94|94|84|76|91|36|55|93
Jason Holder|seam|right|122|135|88|78|96|87|79|80|83
Ben Stokes|seam|right|126|140|83|84|87|82|75|85|77
Sam Curran|leftpace|left|122|136|86|85|68|93|89|71|90
Hardik Pandya|seam|right|129|144|83|76|85|87|81|70|86
Will Jacks|offspin|right|82|94|66|61|73|56|24|45|61
Shivam Dube|seam|right|119|132|60|55|74|65|49|43|54
Washington Sundar|offspin|right|82|94|89|78|86|76|31|83|82
Dhananjaya de Silva|offspin|right|77|90|79|75|73|67|23|70|58
Romario Shepherd|seam|right|128|143|72|69|84|86|81|57|77
Wiaan Mulder|seam|right|123|137|85|83|80|72|61|81|66
Beau Webster|seam|right|120|132|77|74|93|64|53|72|60
Daryl Mitchell|seam|right|116|130|65|54|73|59|47|49|48
Glenn Phillips|offspin|right|79|92|78|72|74|72|26|67|63
Rachin Ravindra|offspin|left|78|91|70|69|70|66|25|57|61`;
  const styles={
   timer:{label:'Placement and control',pace:3,spin:3,defence:7,drive:3,backFoot:2,sweep:-5,loft:-15},
   driver:{label:'Front-foot strokeplay',pace:2,spin:0,defence:0,drive:8,backFoot:-2,sweep:-9,loft:-5},
   backfoot:{label:'Cuts, pulls and punches',pace:6,spin:-4,defence:-4,drive:0,backFoot:10,sweep:-8,loft:1},
   sweeper:{label:'Sweeps and spin scoring',pace:-2,spin:7,defence:-2,drive:0,backFoot:2,sweep:12,loft:0},
   attacker:{label:'Attacking opener',pace:4,spin:-1,defence:-12,drive:4,backFoot:5,sweep:-10,loft:6},
   finisher:{label:'Boundary power',pace:3,spin:-3,defence:-17,drive:-2,backFoot:1,sweep:-12,loft:9},
   spinHitter:{label:'Power against spin',pace:-12,spin:10,defence:-13,drive:2,backFoot:-12,sweep:-8,loft:10},
   allrounder:{label:'All-round batting',pace:0,spin:1,defence:0,drive:0,backFoot:0,sweep:-5,loft:-1},
   lower:{label:'Lower-order hitting',pace:-3,spin:-4,defence:-4,drive:-4,backFoot:-6,sweep:-10,loft:1},
   tail:{label:'Specialist bowler',pace:-2,spin:-3,defence:1,drive:-4,backFoot:-6,sweep:-9,loft:-5}
  };
  const overrides={
   'Joe Root':{spin:97,defence:97,drive:94,backFoot:94,sweep:96,loft:73},
   'Steve Smith':{pace:96,spin:95,defence:98,drive:93,backFoot:95,sweep:77,loft:77},
   'Kane Williamson':{pace:95,spin:94,defence:98,drive:96,backFoot:95,sweep:76,loft:70},
   'Ben Duckett':{spin:94,sweep:98,backFoot:90,defence:76},
   'Babar Azam':{drive:97,defence:90,sweep:72,loft:73},
   'Travis Head':{pace:96,backFoot:98,drive:93,sweep:73,defence:80},
   'Jos Buttler':{pace:96,spin:91,loft:98,sweep:90,backFoot:93,defence:74},
   'Tim David':{pace:94,spin:81,loft:98,defence:57,sweep:61},
   'Shivam Dube':{pace:68,spin:94,backFoot:67,loft:95},
   'Rishabh Pant':{spin:96,sweep:97,loft:93,defence:82},
   'Suryakumar Yadav':{pace:98,spin:93,backFoot:98,sweep:95,loft:96,defence:71},
   'Glenn Maxwell':{spin:96,sweep:97,loft:96,defence:64},
   'Harry Brook':{pace:96,backFoot:97,drive:91,sweep:80},
   'Saud Shakeel':{spin:94,sweep:92,defence:93,loft:57},
   'Alex Carey':{spin:90,sweep:94,defence:85}
  };
  const id=name=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),data={},byName={},rosters={};
  for(const row of rows.split('\n')){const [name,test,t20,power,style]=row.split('|'),key=id(name);data[key]={id:key,name,test:+test,t20:+t20,power:+power,style};byName[name]=key;}
  for(const row of bowlingRows.split('\n')){const [name,type,arm,min,max,control,movement,bounce,variation,yorker,test,t20]=row.split('|');data[byName[name]].bowling={type,arm,speed:[+min,+max],control:+control,movement:+movement,bounce:+bounce,variation:+variation,yorker:+yorker,test:+test,t20:+t20};}
  // Immutable roster slots preserve identity in old saves with edited names.
  for(const format of ['TEST','T20'])rosters[format]=Object.fromEntries(Squad.teams(format).map(t=>[t.id,t.xi.map(p=>byName[p.name])]));
  const labels={timing:'Timing',power:'Power',pace:'Facing pace',spin:'Facing spin',defence:'Defence',drive:'Drives',backFoot:'Back-foot shots',sweep:'Sweeps',loft:'Loft control'};
  function batting(key,format){const p=data[key];if(!p)return null;const rating=format==='TEST'?p.test:p.t20,s=styles[p.style],skills={timing:rating,power:p.power};for(const k of ['pace','spin','defence','drive','backFoot','sweep','loft'])skills[k]=clamp(rating+s[k],12,98);for(const [k,v]of Object.entries(overrides[p.name]||{}))skills[k]=clamp(v+(rating-Math.max(p.test,p.t20))*.55,12,98);for(const k in skills)skills[k]=Math.round(skills[k]);return{id:key,version:19,format,style:s.label,...skills};}
  function identity(format,team,index,explicit){return data[explicit]?explicit:rosters[format]?.[team]?.[index]||null;}
  function batter(m,index=m.striker){return batting(identity(m.format,m.teamId,index,m.batters[index]?.attributes.playerId),m.format);}
  function bowler(m,index=Innings.bowler(m)){const b=m.bowlers[index],key=identity(m.format,m.bowlingTeamId,b.player,b.playerId)||byName[b.name];return data[key]?.bowling?{id:key,...data[key].bowling,speed:data[key].bowling.speed.slice(),rating:m.format==='TEST'?data[key].bowling.test:data[key].bowling.t20}:null;}
  function team(t,format){const xi=t.xi.map((p,i)=>{const key=identity(format,t.id,i,p.playerId),b=batting(key,format);return{...p,playerId:key,batting:b?.timing??p.batting};}),attack=t.attack.map(b=>{const key=xi[b.player].playerId,p=data[key]?.bowling;return p?{...b,...BOWLERS.find(t=>t.id===p.type),id:b.id,name:b.name,player:b.player,playerId:key,archetype:p.type,arm:p.arm,speed:p.speed.slice(),style:bowlingStyle(p),rating:format==='TEST'?p.test:p.t20}:b;});return{...t,xi,attack,rating:Math.round((xi.slice(0,7).reduce((n,p)=>n+p.batting,0)/7+attack.reduce((n,b)=>n+b.rating,0)/5)/2)};}
  function shotSkill(p,ball,input){const name=Shot.describe(input?.angle||0,input?.mode||'defend',ball);if(input?.mode==='defend')return p.defence;if(['Sweep','Slog sweep','Paddle sweep'].includes(name))return input.mode==='loft'?(p.sweep+p.loft)/2:p.sweep;if(input?.mode==='loft')return p.loft;if(['Hook','Pull','Square cut','Late cut','Upper cut','Back-foot punch'].includes(name))return p.backFoot;return p.drive;}
  function effective(ball,b,input){const p=ball.scoringVersion>=19?ball.batterProfile:null;if(!p)return b;const skill=shotSkill(p,ball,input),matchups={};for(const type of ['swing','seam','leftpace','legspin','offspin']){const control=['legspin','offspin'].includes(type)?p.spin:p.pace;matchups[type]=.86+control*.0018;}
   return{...b,attributes:{...b.attributes,rating:p.timing,timing:(.70+p.timing*.0045)*(.85+skill*.0018),power:(.62+p.power*.0056)*(.92+skill*.001),matchups}};
  }
  function bowlingStyle(p){return(p.arm==='left'?'Left-arm ':'Right-arm ')+(p.type==='legspin'?'wrist spin':p.type==='offspin'?'finger spin':p.speed[1]>=145?'fast':p.speed[1]>=135?'fast-medium':'medium')+(p.type==='swing'?' · swing':'');}
  function validBowler(p){return !!(p&&data[p.id]?.bowling&&BOWLERS.some(b=>b.id===p.type)&&['left','right'].includes(p.arm)&&Array.isArray(p.speed)&&p.speed.length===2&&p.speed.every(v=>Number.isInteger(v)&&v>=55&&v<=160)&&p.speed[0]<=p.speed[1]&&['control','movement','bounce','variation','yorker','rating'].every(k=>Number.isInteger(p[k])&&p[k]>=1&&p[k]<=100));}
  function summary(p){if(!p)return null;const entries=Object.entries(labels).map(([key,label])=>({key,label,value:p[key]})).sort((a,b)=>b.value-a.value);return{strengths:entries.slice(0,2).map(e=>e.label),weaknesses:entries.slice(-2).reverse().map(e=>e.label)};}
  function valid(p,format){return p&&p.version===19&&data[p.id]&&p.format===format&&typeof p.style==='string'&&p.style.length<80&&Object.keys(labels).every(k=>Number.isInteger(p[k])&&p[k]>=12&&p[k]<=100);}
  return{data,labels,batting,batter,bowler,identity,team,shotSkill,effective,summary,valid,validBowler,bowlingStyle};
 })();
 // Profiles are frozen onto each newly prepared ball. Old recorded and pending
 // balls still read their original attributes and deterministic scoring rules.
 const squadTeamV18=Squad.team,squadTeamsV18=Squad.teams,inningsCreateV18=Innings.create,deliveryV18=Innings.delivery,bowlingDeliveryV18=Bowling.delivery,contactWindowV18=Contact.window,launchV18=NormalBall.launch,oppositionInputV18=Opposition.input;
 Squad.team=function(format,id){return Players.team(squadTeamV18.call(this,format,id),format);};
 Squad.teams=function(format){return squadTeamsV18.call(this,format).map(t=>Players.team(t,format));};
 Innings.create=function(...args){const m=inningsCreateV18(...args),batting=args[1],bowling=args[2];return{...m,bowlingTeamId:bowling.id,batters:m.batters.map((b,i)=>({...b,attributes:{...b.attributes,playerId:Players.identity(m.format,batting.id,i,batting.xi[i].playerId)}})),bowlers:m.bowlers.map(b=>({...b,playerId:Players.identity(m.format,bowling.id,b.player,b.playerId)}))};};
 Innings.delivery=function(m){
  const bowlingTeamId=m.bowlingTeamId||Squad.teams(m.format).find(t=>t.name===m.bowlingName)?.id,
   prepared={...m,bowlingTeamId,playerModel:19},bowlers=m.bowlers.map((b,i)=>{const p=Players.bowler(prepared,i);if(!p)return b;const previous=m.history.at(-1);if(previous?.over===Math.floor(m.balls/6)&&previous.delivery.bowler===i&&BOWLERS.some(t=>t.id===previous.delivery.archetype))p.type=previous.delivery.archetype;const base=BOWLERS.find(t=>t.id===p.type);return{...b,...base,name:b.name,id:b.id,player:b.player,playerId:p.id,archetype:p.type,arm:p.arm,speed:p.speed,rating:p.rating,skills:p};});
  const d=deliveryV18({...prepared,bowlers});return{...d,ball:{...d.ball,scoringVersion:24,kick:Math.atan(d.ball.kick/5.5),batterProfile:Players.batter(m),bowlerProfile:bowlers[d.ball.bowler].skills||null}};
 };
 Bowling.delivery=function(m,d){
  if(m.playerModel!==19)return bowlingDeliveryV18.call(this,m,d);
  const owner=m.bowlers[Innings.bowler(m)],s=owner.skills;if(!s)return bowlingDeliveryV18.call(this,m,d);
  const rng=RNG.stream(d.rngState),type=owner.archetype,spin=owner.family.includes('spin'),test=m.format==='TEST',death=!test&&m.balls>=90,powerplay=!test&&m.balls<36,p=Conditions.at(m),modern=m.scoringCalibration>=25,fair=m.scoringCalibration>=26,fullControl=fair&&!test&&!spin?1.35-s.control/100:1,base=spin?(test?[0,.46,.92]:death?[.08,modern?.41:.45,.86]:[.02,modern?.41:.45,.88]):test?[.035,.32,.86]:fair?(death?[.28,.38,.73]:powerplay?[.05,.37,.82]:[.08,.24,.78]):death?[modern?.48:.45,.58,.73]:powerplay?[modern?.16:.12,modern?.48:.52,.82]:[modern?.20:.16,modern?.36:.40,.78],weights=[base[0]*(.55+s.yorker/100),(base[1]-base[0])*fullControl,((base[2]-base[1])+(base[1]-base[0])*(1-fullControl))*(.55+s.control/130),(1-base[2])*(.65+s.bounce/160)],total=weights.reduce((a,b)=>a+b,0),pick=rng.next()*total;
  let lengthIndex=0,left=pick;while(lengthIndex<3&&left>=weights[lengthIndex])left-=weights[lengthIndex++];
  const lengthName=['yorker','full','good','short'][lengthIndex],bands=spin?{yorker:[.18,.65],full:[2,3.4],good:[4.7,6.1],short:[7.8,9.3]}:{yorker:[.18,.65],full:[2,3.4],good:[5.1,6.5],short:[8.3,10]},fraction=clamp(.5+(rng.next()-.5)*(1.25-s.control*.005),0,1),length=lerp(...bands[lengthName],fraction),v=rng.next(),variety=.60+s.variation/160;
  const variation=type==='legspin'?(v<(test?.13:.24)*variety?'Googly':v<.36?'Top-spinner':'Leg-break'):type==='offspin'?(v<(test?.16:.28)*variety?'Arm ball':'Off-break'):v<(test?.04:death?.42:.18)*variety?'Slower ball':type==='swing'?(rng.next()<.62?'Outswinger':'Inswinger'):type==='leftpace'?'Angled seam-up':'Seam-up';
  let speed=lerp(...s.speed,rng.next());if(variation==='Slower ball')speed-=lerp(13,21,rng.next());if(spin&&!test&&death)speed+=2;speed=Math.round(speed);
  const wide=rng.next()<(test?.024:.043)*(1-s.control/130),spread=1.4-s.control*.006,line=wide?(rng.next()<.8?1.14:-1.14):test?.15+lerp(-.23,.23,rng.next())*spread:death&&lengthName==='yorker'?.20+lerp(-.45,.50,rng.next())*spread:fair&&!spin&&lengthName!=='yorker'?-.16+lerp(-.20,.20,rng.next())*spread:.08+lerp(-.38,.39,rng.next())*spread;
  const movement=.55+s.movement*.006,swing=(type==='swing'?(variation==='Inswinger'?-1:1)*lerp(.17,.31,rng.next()):!spin?(owner.arm==='left'?-.12:.065):0)*p.swing*movement*(variation==='Slower ball'?.30:1);
  let kick=(spin?(type==='legspin'?(variation==='Googly'?-1:variation==='Top-spinner'?0:1)*lerp(.24,.43,rng.next()):variation==='Arm ball'?0:-lerp(.20,.37,rng.next()))*p.turn:(rng.next()<.5?-1:1)*lerp(.05,.17,rng.next())*p.seam)*movement;if(owner.arm==='left'&&spin)kick*=-1;
  const heights=spin?{yorker:[.055,.12],full:[.23,.40],good:[.65,.85],short:[1.25,1.52]}:{yorker:[.055,.12],full:[.25,.44],good:[.78,1.04],short:[1.55,1.88]},contactH=clamp(lerp(...heights[lengthName],fraction)*p.bounce*(.90+s.bounce*.0013)+(rng.next()-.5)*2*p.variation*(lengthName==='yorker'?.2:1),.05,2.08),preTime=(18.4-length)/(speed/3.6),postTime=length/(speed/3.6*(spin?.70:lengthName==='short'?.64:.79)*p.pace),duration=(preTime+postTime)*2600;
  return{ball:{...d.ball,scoringVersion:19,bowler:Innings.bowler(m),format:m.format,arm:owner.arm,lengthName,length,speed,variation,line,swing,kick,contactH,preTime,postTime,duration,bounceT:preTime/(preTime+postTime),releaseX:owner.arm==='left'?(spin?-.54:-.60):spin?.54:.43,conditions:p,fieldStage:this.stage(m)},rngState:rng.state};
 };
 Contact.precisionWindow=function(ball,batter,input=null){return contactWindowV18.call(this,ball,Players.effective(ball,batter,input),input);};
 Contact.window=function(ball,batter,input=null){
  const base=this.precisionWindow(ball,batter,input);if(this.cutCoverage(ball,input))return clamp(base+85,250,350);if(ball.scoringVersion<20||!Strokes.spin(ball))return base;
  if(ball.scoringVersion>=22)return input?.mode==='loft'?clamp(base+65,285,380):input?.mode==='defend'?clamp(base+300,560,700):clamp(base+270,520,640);
  // Extra coverage is for getting bat on ball, not extra power or perfect timing.
  return input?.mode==='loft'?clamp(base+35,245,340):input?.mode==='defend'?clamp(base+110,325,450):clamp(base+100,300,420);
 };
 Contact.allowance=function(ball,batter){
  if(ball.scoringVersion<20)return Math.max(285,Math.ceil(this.window(ball,batter,{mode:'defend'}))+25);
  const inputs=[{mode:'defend'},...['ground','loft'].flatMap(mode=>Strokes.guide(ball,mode).map(s=>({angle:s.angle,mode})))];
  return Math.max(285,...inputs.map(input=>Math.ceil(this.window(ball,batter,input))+25));
 };
 NormalBall.launch=function(out,ball,input,batter,rng){return launchV18.call(this,out,ball,input,Players.effective(ball,batter,input),rng);};
 Opposition.input=function(m,ball){const bot=oppositionInputV18.call(this,m,ball);if(ball.scoringVersion<19||!bot.shot||!ball.batterProfile)return bot;const p=ball.batterProfile,s=ball.bowlerProfile,skill=Players.shotSkill(p,ball,bot.shot),error=bot.shot.error*clamp(1.20-(p.timing+skill)/650,.86,1.15)*(s?(.78+s.rating/360)/(.85+m.bowlers[ball.bowler].rating/300):1);return{...bot,shot:{...bot.shot,error}};};

 // V23: kick is an angular change at pitching, in radians. A single
 // lateral projection serves delivery, adjudication and the outgoing tangent.
 const deliveryAtV22=Delivery.at,rulesAtZV22=Rules.atZ,movementV22=Contact.movement,continuationV22=BallFlight.continuation;
 Delivery.lateral=function(ball,z){
  const progress=(18.4-z)/18.4,b=(18.4-ball.length)/18.4;
  if(z>=ball.length)return lerp(ball.releaseX,ball.line,progress)+ball.swing*progress*progress;
  const atPitch=lerp(ball.releaseX,ball.line,b)+ball.swing*b*b,
   incoming=(ball.line-ball.releaseX+2*ball.swing*b)/18.4,
   slope=Math.tan(Math.atan(incoming)+ball.kick);
  return atPitch+(ball.length-z)*slope;
 };
 Delivery.at=function(ball,t){const p=deliveryAtV22.call(this,ball,t);return ball.scoringVersion>=23?{...p,x:this.lateral(ball,p.z)}:p;};
 Rules.atZ=function(ball,z){if(ball.scoringVersion<23)return rulesAtZV22.call(this,ball,z);if(z>ball.length){const t=(18.4-z)/(18.4-ball.length)*ball.bounceT;return Delivery.at(ball,t);}return{...rulesAtZV22.call(this,ball,z),x:Delivery.lateral(ball,z)};};
 Contact.movement=function(ball){return movementV22.call(this,ball.scoringVersion>=23?{...ball,kick:Math.tan(ball.kick)*5.5}:ball);};
 BallFlight.continuation=function(ball){if(ball.scoringVersion<23)return continuationV22.call(this,ball);const origin=Delivery.at(ball,1),slope=Delivery.lateral(ball,-1)-origin.x,vz=Delivery.incomingSpeed(ball),vy=(ball.contactH-this.radius+.5*this.g*ball.postTime**2)/ball.postTime-this.g*ball.postTime;return this.build(origin,Math.atan2(slope,-1),vz*Math.hypot(1,slope),vy,100,'through');};

 // V23 contact geometry keeps defensive coverage generous, while attacking
 // timing changes contact position, face orientation and energy transfer.
 const contactResolveV22=Contact.resolve,contactWindowV22=Contact.window,launchV22=NormalBall.launch;
 Contact.window=function(ball,batter,input=null){
  if(ball.scoringVersion<23)return contactWindowV22.call(this,ball,batter,input);
  const base=this.precisionWindow(ball,batter,input),spin=Strokes.spin(ball);
  return input?.mode==='defend'?clamp(base*1.12,240,380):input?.mode==='loft'?clamp(base*.70,125,225):this.cutCoverage(ball,input)?clamp(base*.88,170,245):clamp(base*(spin?.78:.74),140,285);
 };
 Contact.resolve=function(ball,input,batter,seed){
  if(ball.scoringVersion<23)return contactResolveV22.call(this,ball,input,batter,seed);
  const rng=RNG.stream(seed),roll=[rng.next(),rng.next(),rng.next(),rng.next()],pos=Delivery.at(ball,1),out={runs:0,wicket:false,wide:false,contact:false,angle:0,distance:0,loft:false,shot:'Leave',title:'Dot ball',detail:'Safely through to the keeper',timing:'Left alone',error:null,quality:0,rngState:rng.state};
  if(!input)return out;
  const window=this.window(ball,batter,input),ae=Math.abs(input.error),defend=input.mode==='defend',loft=input.mode==='loft',spin=Strokes.spin(ball),choice=Shot.suitability(ball,input.angle,input.mode),pressure=clamp(ae/window,0,1),movement=this.movement(ball),cut=this.cutCoverage(ball,input),reach=clamp((Math.abs(pos.x)-.6)/.65,0,1),effort=clamp(input.effort??.65,0,1);
  Object.assign(out,{error:input.error,angle:input.angle,loft,shot:Shot.describe(input.angle,input.mode,ball),timing:ae<=(loft?15:35)?'Perfect timing':ae<=(loft?45:80)?'Good timing':input.error<0?'Early':'Late',timingWindow:window,edge:false});
  if(ae>window||Math.abs(pos.x)>1.37){out.detail='Beaten - no contact';return out;}
  const q=choice.value*(defend?1-.50*pressure:Math.exp(-(loft?3.4:1.9)*Math.pow(pressure,loft?1.1:1.35))),
   risk=clamp((defend?.003+movement*.009+.13*pressure*pressure:loft?.012+.18*Math.pow(pressure,1.4):.006+movement*.022+(.10+.065*effort)*Math.pow(pressure,1.35))*(cut?.58:1)+Math.max(0,.83-choice.value)*.65+reach*.09,0,.75),edge=roll[0]<risk||q<(defend?.18:.20);
  if(q<.20&&roll[2]<.70){out.detail='Beaten - bat passed outside the ball';return out;}
  Object.assign(out,{contact:true,quality:q,detail:choice.reason,edge,edgeRisk:risk});
  if(edge){const outside=pos.x>=.04||ball.kick>0,deflection=lerp(.8,32,Math.pow(roll[1],1.6));out.angle=(outside?1:-1)*(180-deflection);out.loft=true;out.edgeType=outside?'Outside edge':'Inside edge';out.detail=out.edgeType+(defend?' - soft hands':' - off the edge of the bat');}
  return out;
 };
 NormalBall.launch=function(out,ball,input,batter,rng){
  if(ball.scoringVersion<23)return launchV22.call(this,out,ball,input,batter,rng);
  const b=Players.effective(ball,batter,input),power=b.attributes.power,origin=Fielding.contactOrigin(ball,input),incoming=Delivery.incomingSpeed(ball),q=out.quality,effort=clamp(input.effort??.65,0,1),defend=input.mode==='defend';
  if(out.edge){const speed=incoming*(defend?.36:.70)*( .90+.20*rng.next()),flight=Math.max(.12,(Strokes.spin(ball)?2.6:12.5)/speed),target=defend?lerp(-.8,.5,rng.next()):lerp(.55,1.8,rng.next()),vy=clamp((target-origin.h+4.905*flight*flight)/flight,-2.8,7.5);return{origin,angle:(out.angle+(rng.next()-.5)*2)*Math.PI/180,vx:speed,vy,kind:'edge',spinRatio:.08,effort};}
  // Preserve guided deflections and their use of the incoming pace.
  if(['Late cut','Leg glance','Paddle sweep'].includes(out.shot))return launchV22.call(this,out,ball,input,batter,rng);
  const window=Contact.window(ball,batter,input),error=clamp(input.error/window,-1,1),scatter=rng.next()*2-1,angle=(out.angle+error*16+scatter*(2+Math.abs(error)*26))*Math.PI/180;
  if(defend)return{origin,angle,vx:1.4+incoming*.045+q*.55,vy:-1.4,kind:'ground',spinRatio:.15,effort};
  if(!out.loft){const glance=Math.sin(Math.abs(angle)/2)**2,speed=incoming*lerp(.09+.13*q*q,.65,glance)+(2+21*effort)*power*(.15+.85*q)*(1-.55*glance);return{origin,angle,vx:speed,vy:-Math.max(1.2,origin.h*3.7),kind:'ground',spinRatio:.35+.20*q,effort};}
  // The player's power determines both bat contribution and the attainable
  // ceiling. Off-centre impact loses energy and rotates the launch face.
  const ceiling=clamp(29+11*power,34,43),potential=Math.min(ceiling,incoming*.16+(12+19*effort)*power),speed=potential*(.40+.60*Math.pow(q,.85)),
   elevation=clamp(34-error*22+(rng.next()*2-1)*(3+Math.abs(error)*25),12,72)*Math.PI/180;
  return{origin,angle,vx:speed*Math.cos(elevation),vy:speed*Math.sin(elevation),kind:'shot',spinRatio:-.18,effort};
 };
 // Elliptical rope: 70 m straight, 62 m square. The same shape drives scoring
 // and the field view; fielder positions remain absolute world coordinates.
 Ground.axes=function(ball){return ball?.scoringVersion>=23?{x:62,z:70}:{x:64,z:64};};
 Ground.outside=function(ball,p){const a=this.axes(ball);return(p.x/a.x)**2+(p.z/a.z)**2>=1;};
 Ground.ropeDistance=function(ball,origin,dx,dz){const a=this.axes(ball),A=(dx/a.x)**2+(dz/a.z)**2,B=origin.x*dx/a.x**2+origin.z*dz/a.z**2,C=(origin.x/a.x)**2+(origin.z/a.z)**2-1;return(-B+Math.sqrt(B*B-A*C))/A;};
 const pursueV22=TeamField.pursue;
 TeamField.pursue=function(p,ball,field,canCatch=true){
  if(ball.scoringVersion<23)return pursueV22.call(this,p,ball,field,canCatch);
  const starts=[...Fielding.positions(field),{id:'bowler',name:'bowler',x:ball.releaseX,z:17.1}],keeper=Fielding.keeperFor(ball),all=[...starts,keeper];p.starts=starts;p.keeper=keeper;p.motionVersion=23;
  // Sample the descending catch height and the instant before first ground
  // contact explicitly, so a landing-point catch cannot tunnel between steps.
  const times=[];for(let t=.01;t<=Math.max(22,p.stopTime+1);t+=.025)times.push(t);
  for(const segment of p.segments||[])if(!segment.bounced&&!segment.roll&&segment.vy<0&&segment.h>=1.3){const end=NormalBall.at(p,segment.time+segment.duration);if(end.h<1.3){let lo=segment.time,hi=lo+segment.duration;for(let n=0;n<15;n++){const mid=(lo+hi)/2;if(NormalBall.at(p,mid).h>1.3)lo=mid;else hi=mid;}times.push(hi);}}
  if(p.airTime)times.push(Math.max(.001,p.airTime-.001));times.sort((a,b)=>a-b);let previous=0,event;
  for(const t of times){const at=Fielding.freeBall(p,t);if(Ground.outside(ball,at)){let lo=previous,hi=t;for(let n=0;n<15;n++){const mid=(lo+hi)/2;if(Ground.outside(ball,Fielding.freeBall(p,mid)))hi=mid;else lo=mid;}const q=Fielding.freeBall(p,hi);event={...q,type:canCatch&&!q.bounced?'six':'four',time:hi};break;}
   const air=!at.bounced&&at.h>=.15&&at.h<=2.20,low=at.bounced&&at.h<=.70;if(air||low){const candidates=all.filter(f=>Math.hypot(f.x-at.x,f.z-at.z)<=BallFlight.run(f,t)+(air?(f.id==='keeper'?.85:/slip|gully/.test(f.name)?.95:.60):.60)).sort((a,b)=>TeamField.arrive(a,at.x,at.z)-TeamField.arrive(b,at.x,at.z));if(candidates.length){const f=candidates[0];event={...at,type:air&&canCatch?'catch':air?'take':'pickup',id:f.id,name:f.name,time:t};break;}}previous=t;
  }
  if(!event){const at=Fielding.freeBall(p,p.stopTime),f=all.slice().sort((a,b)=>this.arrive(a,at.x,at.z)-this.arrive(b,at.x,at.z))[0];event={...at,type:'pickup',id:f.id,name:f.name,time:Math.max(p.stopTime,this.arrive(f,at.x,at.z))};}p.event=event;p.returnTime=event.time;return p;
 };

 // V23 opposition chooses strokes from length, line, player strengths and
 // the field. Gaussian timing plus occasional read errors permits collapses.
 const oppositionV22=Opposition.input,declareV22=Contest.shouldDeclare,prepareV23=Innings.delivery;
 Innings.delivery=function(m){
  const d=prepareV23.call(this,m),b=d.ball,rng=RNG.stream(d.rngState),s=b.bowlerProfile,sign=Hand.sign(b),test=m.format==='TEST',control=s?.control??70;
  const wide=rng.next()<(test?.016:.035)*(1.45-control/140),attack=rng.next()<.32;
  let target=wide?(rng.next()<.72?1.45:-1.32):attack?lerp(-.16,.18,rng.next()):lerp(-.10,.58,rng.next());
  // Bowlers aim their stock delivery; deviations still act at the bounce.
  const expected=Delivery.at(b,1).x/sign,adjust=(target-expected)*(wide?1: .82);
  b.line+=adjust*sign;
  if(test&&b.lengthName==='good')b.contactH=clamp(b.contactH+(rng.next()+rng.next()-1)*.36,.42,1.35);
  const plan=Tactics.plan(m,b);b.savedField=plan.field;b.fieldNote=plan.note;b.fieldAdapted=plan.adapted;
  return{ball:b,rngState:rng.state};
 };
 Opposition.input=function(m,ball){
  if(ball.scoringVersion<23)return oppositionV22.call(this,m,ball);
  const rng=RNG.stream(m.rngState),normal=()=>Math.sqrt(-2*Math.log(Math.max(1e-12,rng.next())))*Math.cos(2*Math.PI*rng.next()),p=ball.batterProfile,b=ball.bowlerProfile,test=m.format==='TEST',spin=Strokes.spin(ball),sign=Hand.sign(ball),canonical=Hand.canonical(ball),at=Delivery.at(canonical,1),x=at.x,h=at.h,
   skill=spin?p?.spin??70:p?.pace??70,rating=p?.timing??70,readMistake=rng.next()<.025+(100-skill)*.0007,seen=x+(readMistake?normal()*.40:0),onStumps=Rules.hits(Rules.atZ(canonical,Rules.wickets[0])),short=ball.lengthName==='short',full=ball.lengthName==='full',yorker=ball.lengthName==='yorker',death=!test&&m.balls>=90,needed=m.target==null?null:Math.max(0,m.target-m.runs),ballsLeft=test?Math.max(1,(Contest.LIMIT-(m.pitchClock||0))/40):Math.max(1,120-m.balls),required=needed==null?0:needed/ballsLeft*6,
   saveTest=test&&needed!==null&&(required>4.8||m.wickets>=7&&ballsLeft<120&&needed>80),set=Math.min(1,(m.batters[m.striker]?.balls||0)/25);
  if((Math.abs(seen)>1.18||short&&h>1.62&&seen>.45)&&rng.next()<.93 || test&&!onStumps&&seen>.50&&rng.next()<(saveTest?.85:.48))return{shot:null,rngState:rng.state};
  const driveable=full||ball.lengthName==='good'&&h<1.05&&Math.abs(seen)>.18&&Math.abs(seen)<.72&&Contact.movement(canonical)<.85,defence=test?(saveTest?.88:yorker?.85:!full&&!short?(driveable?.58:.76):full?.35:.22):yorker?.30:!full&&!short?.055:.015;
  let mode=rng.next()<defence?'defend':rng.next()<(test?.009:(death?.32:.25)*(full?1.2:short?1:.6)*(m.wickets>6?.65:1))&&!yorker?'loft':'ground';
  const angles=[0,26,44,68,92,135,-30,-52,-95,-145],field=Innings.field(m,ball),weights=angles.map(angle=>{
   const shot={angle:angle*sign,mode},value=Shot.suitability(ball,shot.angle,mode).value,angleRad=angle*Math.PI/180,dist=mode==='loft'?58:26,
    gap=Math.min(...Fielding.positions(field).map(f=>Math.hypot(f.x*sign-Math.sin(angleRad)*dist,f.z-Math.cos(angleRad)*dist))),stroke=Players.shotSkill(p||{drive:70,backFoot:70,sweep:70,loft:70,defence:70},ball,shot),side=seen>.20&&angle< -18||seen<-.20&&angle>18?.14:1;
   return Math.pow(value,6)*side*(.65+stroke/130)*(.6+Math.min(25,gap)/25)*(mode==='loft'&&Math.abs(angle)>115?.15:1);
  });
  let pick=rng.next()*weights.reduce((a,b)=>a+b,0),index=0;while(index<weights.length-1&&pick>weights[index])pick-=weights[index++];
  const form=.88+RNG.stream(m.seed^0x395ace).next()*.25,bowler=.90+(b?.rating??75)/500,
   sd=(test?38:48)*(1.48-rating*.005)*(1.18-skill*.002)*bowler*form*(1.10-set*.10),error=normal()*sd+(readMistake?normal()*120:0),effort=mode==='defend'?0:mode==='loft'?lerp(.86,1,rng.next()):lerp(test?.66:.68,test?.96:.94,rng.next());
  return{shot:{angle:(mode==='defend'?0:angles[index])*sign,mode,error,effort,callRuns:true,pushRun:!test&&death&&rng.next()<.06},rngState:rng.state};
 };
 Contest.shouldDeclare=function(c){
  const m=this.current(c),latest=m.history.at(-1)?.delivery;if(latest?.scoringVersion<23)return declareV22.call(this,c);
  if(c.format!=='TEST'||c.phase!=='play'||this.ownTurn(c)||m.target!==null)return false;
  const totals=this.totals(c),lead=totals[m.side]-totals[1-m.side],remaining=Math.max(0,(this.LIMIT-c.clockSeconds-600)/40),inHand=10-m.wickets,pitch=Conditions.at(m),opposition=c.innings.filter(i=>i.side!==m.side),rate=opposition.length?clamp(opposition.reduce((n,i)=>n+i.runs,0)/Math.max(1,opposition.reduce((n,i)=>n+i.balls,0)),.38,.85):.58,
   wicketsToTake=20-opposition.reduce((n,i)=>n+i.wickets,0),bowlingBudget=wicketsToTake*(pitch.wear>.5?39:49),safety=65+inHand*7;
  if(m.number===1){const sufficient=m.runs>rate*Math.min(780,remaining*.40)+safety;return sufficient&&(m.balls>600&&inHand<=3||remaining<bowlingBudget+600||m.runs>rate*900+60)&&lead>140;}
  const chaseRate=clamp(rate+.20+pitch.wear*.05,.66,1.05),safeLead=remaining*chaseRate+45+inHand*3;
  return remaining>90&&lead>Math.max(160,safeLead)&&remaining<=Math.max(300,bowlingBudget+inHand*18);
 };

 // V24 calibration: contact decays smoothly across phone release offsets.
 const contactResolveV23=Contact.resolve,contactWindowV23=Contact.window,launchV23=NormalBall.launch;
 Contact.window=function(ball,batter,input=null){
  if(ball.scoringVersion<24)return contactWindowV23.call(this,ball,batter,input);
  const spin=Strokes.spin(ball),precision=ball.scoringVersion>=26&&ball.format==='T20'&&input?.mode==='ground'&&['full','good'].includes(ball.lengthName)?1-.20*(ball.bowlerProfile?.control??70)/100:1,base=this.precisionWindow(ball,batter,input)*precision;
  return input?.mode==='defend'?clamp(base*1.12,240,380):input?.mode==='loft'?clamp(base,200,spin?270:230):this.cutCoverage(ball,input)?clamp(base,200,280):clamp(base*(spin?(ball.scoringVersion>=27&&ball.format==='T20'?.90:.85):1),210,300);
 };
 Contact.resolve=function(ball,input,batter,seed){
  if(ball.scoringVersion<24)return contactResolveV23.call(this,ball,input,batter,seed);
  const rng=RNG.stream(seed),roll=[rng.next(),rng.next(),rng.next(),rng.next()],pos=Delivery.at(ball,1),out={runs:0,wicket:false,wide:false,contact:false,angle:0,distance:0,loft:false,shot:'Leave',title:'Dot ball',detail:'Safely through to the keeper',timing:'Left alone',error:null,quality:0,rngState:rng.state};
  if(!input)return out;
  const window=this.window(ball,batter,input),ae=Math.abs(input.error),defend=input.mode==='defend',loft=input.mode==='loft',choice=Shot.suitability(ball,input.angle,input.mode),pressure=clamp(ae/window,0,1),movement=this.movement(ball)*(ball.scoringVersion>=25&&Strokes.spin(ball)?.4:1),cut=this.cutCoverage(ball,input),reach=clamp((Math.abs(pos.x)-.6)/.65,0,1),effort=clamp(input.effort??.65,0,1);
  Object.assign(out,{error:input.error,angle:input.angle,loft,shot:Shot.describe(input.angle,input.mode,ball),timing:ae<=35?'Perfect timing':ae<=80?'Good timing':input.error<0?'Early':'Late',timingWindow:window,edge:false});
  if(ae>window||Math.abs(pos.x)>1.37){out.detail='Beaten - no contact';return out;}
  // V26: protect the central 30 ms from additional timing risk, then expose
  // a committed stroke smoothly as release error grows. The spin discount
  // reflects the extra reaction time after pitching. Keep V25's flat tax
  // only on already prepared V25 balls; defence and loft retain their rules.
  const legacyTax=ball.scoringVersion===25?(Strokes.spin(ball)?.016:.050)*(.75+(ball.bowlerProfile?.control??70)/280):0,
   timingRisk=ball.scoringVersion>=26?(Strokes.spin(ball)?.7:1)*(['full','good'].includes(ball.lengthName)?.10+(ball.scoringVersion>=27?1.25:.79)*Math.pow(Math.min(.80,effort),6):.15+.12*effort)*(1-Math.exp(-(ball.scoringVersion>=27?3:9)*Math.pow(Math.max(0,(ae-30)/window),ball.scoringVersion>=27?1.3:1))):(.10+.065*effort)*Math.pow(pressure,1.35),
   q=choice.value*(defend?1-.50*pressure:Math.exp(-(loft?1.6:1.8)*Math.pow(pressure,loft?1.1:1.45))),
   risk=clamp((defend?.003+movement*.006+.09*pressure*pressure:loft?.008+.11*Math.pow(pressure,1.4):.006+legacyTax+movement*.036+timingRisk)*(cut?.58:1)+Math.max(0,.83-choice.value)*.65+reach*.09,0,.75),edge=roll[0]<risk||q<(defend?.18:.20);
  if(q<.20&&roll[2]<.70){out.detail='Beaten - bat passed outside the ball';return out;}
  Object.assign(out,{contact:true,quality:q,detail:choice.reason,edge,edgeRisk:risk});
  if(edge){const outside=pos.x>=.04||ball.kick>0,deflection=lerp(.8,32,Math.pow(roll[1],1.6));out.angle=(outside?1:-1)*(180-deflection);out.loft=true;out.edgeType=outside?'Outside edge':'Inside edge';out.detail=out.edgeType+(defend?' - soft hands':' - off the edge of the bat');}
  return out;
 };
 NormalBall.launch=function(out,ball,input,batter,rng){
  if(ball.scoringVersion<24)return launchV23.call(this,out,ball,input,batter,rng);
  const b=Players.effective(ball,batter,input),power=b.attributes.power,origin=Fielding.contactOrigin(ball,input),incoming=Delivery.incomingSpeed(ball),q=out.quality,effort=clamp(input.effort??.65,0,1),defend=input.mode==='defend';
  // V25 spin edges cover downward bat faces, feathers and steeper/wider
  // deflections. Do not lob every nick to the upstanding keeper. V24 retains
  // its original launch and random draws for an already prepared delivery.
  if(out.edge){
   const spin25=ball.scoringVersion>=25&&Strokes.spin(ball),speed=incoming*(defend?.36:.70)*(.90+.20*rng.next()),flight=Math.max(.12,(Strokes.spin(ball)?2.6:12.5)/speed),
    target=spin25?(defend?lerp(-2.5,.9,rng.next()):lerp(-3.0,3.6,rng.next())):defend?lerp(-1.6,.4,rng.next()):lerp(-.9,3.2,rng.next()),vy=clamp((target-origin.h+4.905*flight*flight)/flight,spin25?-8:-2.8,spin25?10:7.5);
   return{origin,angle:(out.angle+(rng.next()-.5)*(spin25?(defend?30:70):defend?10:24))*Math.PI/180,vx:speed,vy,kind:'edge',spinRatio:.08,effort};
  }
  // Preserve guided deflections and their use of the incoming pace.
  if(['Late cut','Leg glance','Paddle sweep'].includes(out.shot))return launchV23.call(this,out,ball,input,batter,rng);
  const window=Contact.window(ball,batter,input),error=clamp(input.error/window,-1,1),scatter=rng.next()*2-1,angle=(out.angle+error*16+scatter*(out.loft?8+(1-q)*62:2+Math.abs(error)*26))*Math.PI/180;
  if(defend)return{origin,angle,vx:1.4+incoming*.045+q*.55,vy:-1.4,kind:'ground',spinRatio:.15,effort};
  // Slower arrivals allow a fuller swing; taper the extra bat contribution
  // to zero at 28 m/s, without multiplying the incoming-ball contribution.
  if(!out.loft){const glance=Math.sin(Math.abs(angle)/2)**2,preparation=ball.scoringVersion>=25?1+.12*clamp((28-incoming)/11.5,0,1):1,speed=incoming*lerp(.09+.13*q*q,.65,glance)+(2+23*effort)*power*(.25+.75*q)*(1-.55*glance)*preparation;return{origin,angle,vx:speed,vy:-Math.max(1.2,origin.h*3.7),kind:'ground',spinRatio:.35+.20*q,effort};}
  // The player's power determines both bat contribution and the attainable
  // ceiling. Off-centre impact loses energy and rotates the launch face.
  // A committed swing opens the face more and magnifies angular error;
  // a shorter aerial stroke stays flatter. Neither bypasses interception.
  const ceiling=clamp(29+11*power,34,43),potential=Math.min(ceiling,incoming*.16+(12+19*effort)*power),speed=potential*(ball.scoringVersion>=27?(.48+.52*Math.pow(q,.85))*Math.exp(-4*(1-effort)*(1-q)):.55+.45*Math.pow(q,.85)),
   swingLoad=Math.pow(clamp((effort-.60)/.40,0,1),2),
   elevation=clamp((ball.scoringVersion>=27?16+swingLoad*26:12+swingLoad*30)+(1-q)*(ball.scoringVersion>=27?22*(.6+.4*swingLoad):6*swingLoad)-error*4+(rng.next()*2-1)*(4+swingLoad*26+(1-q)*20*swingLoad),10,78)*Math.PI/180;
  return{origin,angle,vx:speed*Math.cos(elevation),vy:speed*Math.sin(elevation),kind:'shot',spinRatio:-.18,effort};
 };

 // V24 opposition can misread both line and length; the real ball still
 // goes through the same contact, pad and wicket geometry as human input.
 const oppositionV23=Opposition.input;
 // V27 Test intent uses the score and time available, without extra RNG.
 Opposition.testPlan=function(m,contest=null){
  const needed=m.target==null?null:Math.max(0,m.target-m.runs),ballsLeft=Math.max(1,(Contest.LIMIT-(m.pitchClock||0))/40),required=needed==null?0:needed/ballsLeft*6,totals=contest?Contest.totals(contest):null,deficit=totals?totals[1-m.side]-totals[m.side]:0;
  return{build:m.number===1&&m.striker<7,survive:needed!==null&&(required>3.5-m.wickets*.10||needed>(10-m.wickets)*35&&ballsLeft<540)||needed===null&&m.number===2&&deficit>60&&ballsLeft<900};
 };
 Opposition.input=function(m,ball,contest=null){
  if(ball.scoringVersion<24)return oppositionV23.call(this,m,ball);
  const rng=RNG.stream(m.rngState),normal=()=>Math.sqrt(-2*Math.log(Math.max(1e-12,rng.next())))*Math.cos(2*Math.PI*rng.next()),p=ball.batterProfile,b=ball.bowlerProfile,test=m.format==='TEST',spin=Strokes.spin(ball),sign=Hand.sign(ball),canonical=Hand.canonical(ball),at=Delivery.at(canonical,1),x=at.x,h=at.h,plan=ball.scoringVersion>=27&&test?this.testPlan(m,contest):null,
   skill=spin?p?.spin??70:p?.pace??70,rating=p?.timing??70,readMistake=rng.next()<(plan?.survive?.015:test?.04:.055)+(100-skill)*(plan?.survive?.0006:.0012),seen=x+(readMistake?normal()*.55:0),
   lengthError=readMistake?Math.round(normal()):0,readLength=['yorker','full','good','short'][clamp(['yorker','full','good','short'].indexOf(ball.lengthName)+lengthError,0,3)],
   perceived={...ball,line:ball.line+(seen-x)*sign,lengthName:readLength,contactH:clamp(h+lengthError*.30,.05,2.1)},short=readLength==='short',full=readLength==='full',yorker=readLength==='yorker',death=!test&&m.balls>=90,needed=m.target==null?null:Math.max(0,m.target-m.runs),ballsLeft=test?Math.max(1,(Contest.LIMIT-(m.pitchClock||0))/40):Math.max(1,120-m.balls),required=needed==null?0:needed/ballsLeft*6,
   totals=contest?Contest.totals(contest):null,deficit=totals?totals[1-m.side]-totals[m.side]:0,
   saveTest=test&&(needed!==null&&(required>3.5-m.wickets*.10||needed>(10-m.wickets)*35&&ballsLeft<540)||needed===null&&m.number===2&&deficit>60&&ballsLeft<900),set=Math.min(1,(m.batters[m.striker]?.balls||0)/25);
  if((Math.abs(seen)>1.18||short&&perceived.contactH>1.62&&seen>.45)&&rng.next()<.93 || test&&seen>.42&&rng.next()<(plan?.survive?(full?.45:.72):saveTest?.85:.48))return{shot:null,rngState:rng.state};
  const driveable=full||readLength==='good'&&perceived.contactH<1.05&&Math.abs(seen)>.18&&Math.abs(seen)<.72&&Contact.movement(canonical)<.85,defence=test?(plan?.survive?(yorker?.96:full?.55:short?.70:driveable?.65:.83):saveTest?.95:yorker?.85:!full&&!short?(driveable?.64:.82):full?.42:.30):yorker?.30:!full&&!short?.055:.015;
  let mode=rng.next()<defence?'defend':rng.next()<(test?(plan?.survive?0:.009):(death?.40:.26)*(full?1.2:short?1:.6)*(m.wickets>6?.65:1))&&!yorker?'loft':'ground';
  const angles=[0,26,44,68,92,135,-30,-52,-95,-145],field=Innings.field(m,ball),weights=angles.map(angle=>{
   const shot={angle:angle*sign,mode},value=Shot.suitability(perceived,shot.angle,mode).value,angleRad=angle*Math.PI/180,dist=mode==='loft'?58:26,
    gap=Math.min(...Fielding.positions(field).map(f=>Math.hypot(f.x*sign-Math.sin(angleRad)*dist,f.z-Math.cos(angleRad)*dist))),stroke=Players.shotSkill(p||{drive:70,backFoot:70,sweep:70,loft:70,defence:70},ball,shot),side=seen>.20&&angle< -18||seen<-.20&&angle>18?.14:1;
   return Math.pow(value,6)*side*(.65+stroke/130)*(.6+Math.min(25,gap)/25)*(mode==='loft'&&Math.abs(angle)>115?.15:1);
  });
  let pick=rng.next()*weights.reduce((a,b)=>a+b,0),index=0;while(index<weights.length-1&&pick>weights[index])pick-=weights[index++];
  const form=.88+RNG.stream(m.seed^0x395ace).next()*.25,bowler=.90+(b?.rating??75)/500,
   sd=(test?42:58)*(1.48-rating*.005)*(1.18-skill*.002)*bowler*form*(1.10-set*.10),error=normal()*sd+(readMistake?normal()*(mode==='defend'?220:310):0),effort=mode==='defend'?0:mode==='loft'?lerp(ball.scoringVersion>=27&&!test?.95:.86,1,rng.next()):plan?.build?lerp(.58,full?.84:short?.82:.78,rng.next()):plan?.survive?lerp(.60,.82,rng.next()):lerp(.60,test?.86:.88,rng.next());
  return{shot:{angle:(mode==='defend'?0:angles[index])*sign,mode,error,effort,callRuns:true,pushRun:!test&&death&&rng.next()<.06},rngState:rng.state};
 };

 // V25: a boundary remains live until the rope. Chasing and running use
 // the resolved path and engine time only; neither consumes match RNG.
 const deliveryV24=Innings.delivery,pursueV24=TeamField.pursue,fieldFrameV24=TeamField.frame,
  runningCreateV24=Running.create,runningFinishV24=Running.finish,runningOfferV24=Running.offer,runningCommandV24=Running.command,runningFrameV24=Running.frame;
 Innings.delivery=function(m){const d=deliveryV24.call(this,{...m,scoringCalibration:27}),b=d.ball;b.scoringVersion=27;b.duration=(b.preTime+b.postTime)*2600;b.bounceT=b.preTime/(b.preTime+b.postTime);return d;};
 TeamField.pursue=function(p,ball,field,canCatch=true){
  const play=pursueV24.call(this,p,ball,field,canCatch),e=play.event;
  if(ball.scoringVersion>=25&&['four','six'].includes(e.type)){
   // Named IDs also keep the first outfielder (old numeric ID 0) explicit.
   play.starts=play.starts.map(f=>({...f,id:typeof f.id==='number'?'fielder-'+f.id:f.id}));
   const chasers=[...play.starts,play.keeper].map(f=>({id:f.id,name:f.name,arrival:this.arrive(f,e.x,e.z)})).sort((a,b)=>a.arrival-b.arrival),chaser=chasers[0];
   play.event={...e,chaser:{...chaser,arrival:Math.max(chaser.arrival,e.time+.15)}};play.boundaryVersion=25;play.returnTime=play.event.chaser.arrival+1.5;
  }return play;
 };
 TeamField.frame=function(out,t){
  const frame=fieldFrameV24.call(this,out,t),p=out.play,e=p.event,c=e.chaser;if(p.boundaryVersion!==25||!c)return frame;
  const f=[...p.starts,p.keeper].find(f=>f.id===c.id),distance=Math.max(.001,Math.hypot(e.x-f.x,e.z-f.z)),ux=(e.x-f.x)/distance,uz=(e.z-f.z)/distance,
   targetDistance=Math.max(0,distance-.44),travel=Math.min(targetDistance,BallFlight.run(f,t)),walkAge=Math.max(0,t-c.arrival-.65),walk=Math.min(3,1.25*(walkAge-.25*(1-Math.exp(-walkAge/.25)))),
   low=BatterRig.smooth((t-c.arrival+.30)/.30)*(1-BatterRig.smooth((t-c.arrival-.25)/.40)),moving=travel<targetDistance-.02||walkAge>0&&walk<3,
   action=walkAge>0?'walk':t>=c.arrival-.30?'pickup':'run',gait=walkAge>0?.27*BatterRig.smooth(walkAge/.3)*BatterRig.smooth((3-walk)/.5):BatterRig.smooth(travel/.7)*BatterRig.smooth((targetDistance-travel)/.6),
   chaser={...f,x:f.x+ux*(travel-walk),z:f.z+uz*(travel-walk),travel:travel+walk,moving,gait,heading:{x:ux,z:uz},look:{x:e.x,z:e.z},throwLook:walkAge>0?{x:f.x,z:f.z}:null,throwBlend:BatterRig.smooth(walkAge/.7),action,actionBlend:low,hands:low>0?{x:e.x,z:e.z,h:.08}:null,teamVersion:10};
  return{...frame,fielders:frame.fielders.map(a=>a.id===c.id?chaser:a)};
 };
 Running.finish=function(out,legs,route){
  if(out.play.boundaryVersion!==25)return runningFinishV24.call(this,out,legs,route);
  const e=out.play.event,count=this.count(legs,e.time),allowance=e.type==='six'?6:4,runs=Math.max(allowance,count),play={...out.play,returnTime:e.chaser.arrival+1.5,running:{...out.play.running,legs}};
  return Rules.score({...out,play,wicket:false,dismissalKind:null,runOutRunner:null,endSwap:runs>allowance&&runs%2===1,decisionTime:e.time},runs);
 };
 Running.create=function(out,ball){
  if(out.play.boundaryVersion!==25||out.wicket||out.disallowRuns)return runningCreateV24.call(this,out,ball);
  const play={...out.play,running:{legs:[],hand:ball.battingHand||'right',nonHand:ball.nonStrikerHand||'right',commands:[],version:15,maxRuns:Math.min(3,ball.runsNeeded==null?3:Math.max(0,ball.runsNeeded-(out.noBall||out.wide?1:0)))}};
  const legs=play.running.maxRuns>0?[this.leg(.32,0)]:[];return this.finish({...out,play},legs,null);
 };
 Running.offer=function(out,time){
  if(out?.play?.boundaryVersion!==25)return runningOfferV24.call(this,out,time);
  // A queued leg may be interrupted by the boundary signal. There is no
  // incoming throw, so a negative completion margin does not forbid the call.
  const r=out.play.running,legs=r?.legs||[],queued=legs.some(l=>l.start>time+.025),number=legs.length+1,start=Math.max(time+.13,legs.length?legs.at(-1).end+this.turn:.32),leg=this.leg(start,legs.length),closed=!r||out.disallowRuns||time>=out.decisionTime-.10||legs.length>=r.maxRuns,status=closed?'closed':queued?'queued':'available';
  return{status,number,leg,margin:out.play.event.time-leg.end,allowed:status==='available',queued,canHold:!!r&&time<out.decisionTime-.10&&queued,hint:closed?'Stay in your ground':queued?'Run queued. Cancel it before it starts if needed.':'Ball in play - call run '+number+' or hold your ground'};
 };
 Running.command=function(out,kind,time){
  if(out.play.boundaryVersion!==25)return runningCommandV24.call(this,out,kind,time);
  const p=out.play;if(!p.running||p.running.commands.length>=100||out.disallowRuns||time>=out.decisionTime-.10||time<0)return out;let legs=p.running.legs.map(l=>({...l}));
  if(kind==='hold')legs=legs.filter(l=>l.start<=time+.025);else if(kind==='run'&&this.offer(out,time).allowed)legs.push(this.offer(out,time).leg);else return out;
  return this.finish({...out,play:{...p,running:{...p.running,commands:[...p.running.commands,{kind,time}]}}},legs,null);
 };
 Running.frame=function(out,t){const frames=runningFrameV24.call(this,out,t);return out.play.boundaryVersion===25&&t>=out.decisionTime?frames.map(f=>({...f,moving:false,grounding:false})):frames;};

 const Broadcast={
  cards(m,previous,ball,introduced=[]){const cards=[],entrant=m.history.at(-1)?.wicket&&m.nextBatter>2?m.nextBatter-1:m.striker,p=entrant===m.striker?ball.batterProfile:Players.batter(m,entrant),b=m.batters[entrant],bowler=m.bowlers[ball.bowler],s=ball.bowlerProfile;
   if(!introduced.includes(entrant)&&!m.history.some(r=>r.batter===entrant)&&p)cards.push({kind:'batter',player:entrant,title:'At the crease',name:b.name,detail:(Hand.of(b)==='left'?'Left-handed':'Right-handed')+' · '+b.runs+' runs from '+b.balls+' balls',stats:[['Timing',p.timing],['Power',p.power],['Facing spin',p.spin]],duration:3000});
   if((!previous||previous.bowler!==ball.bowler)&&s)cards.push({kind:'bowler',title:'Into the attack',name:bowler.name,detail:Players.bowlingStyle(s)+' · '+bowler.wickets+'/'+bowler.runs,stats:[['Control',s.control],['Movement',s.movement],['Variations',s.variation]],duration:3000});
   if(ball.weather&&(!previous?.weather||Weather.brief(previous.weather)!==Weather.brief(ball.weather)))cards.push({kind:'weather',title:previous?'Conditions changed':'Conditions',name:ball.weather.name,detail:Weather.brief(ball.weather).split(' · ').slice(1).join(' · '),stats:[],duration:2400});
   const positions=f=>JSON.stringify(f?.map(x=>[x.n,x.a,x.r]));if(!previous||positions(previous.savedField)!==positions(ball.savedField))cards.push({kind:'field',title:ball.fieldAdapted?'Field changed':'Field set',name:'',detail:ball.fieldNote.replace(/^Field: /,''),stats:[],duration:1800});
   return cards;
  },
  duration(cards){return cards?.length?cards.reduce((n,c)=>n+c.duration,0):1800;},
  at(cards,age){let start=0;for(const card of cards||[]){if(age<start+card.duration)return{...card,age:age-start,alpha:Math.min(1,(age-start)/300,(start+card.duration-age)/350)};start+=card.duration;}return null;},
  valid(cards){return Array.isArray(cards)&&cards.length<=4&&cards.every(c=>['batter','bowler','weather','field'].includes(c.kind)&&['title','name','detail'].every(k=>typeof c[k]==='string'&&c[k].length<180)&&[1800,2400,3000].includes(c.duration)&&Array.isArray(c.stats)&&c.stats.length<=3&&c.stats.every(s=>Array.isArray(s)&&s.length===2&&typeof s[0]==='string'&&s[0].length<30&&Number.isFinite(s[1])&&s[1]>=0&&s[1]<=100));}
 };
 // R28 appearance and broadcast text are presentation-only, with no match RNG.
 const Appearance=(()=>{
  const colours={};const set=(skin,names)=>{for(const name of names.split('|'))colours[name.toLowerCase().replace(/[^a-z0-9]+/g,'-')]=skin;};
  set('#dcb497','Zak Crawley|Ben Duckett|Ollie Pope|Joe Root|Harry Brook|Ben Stokes|Jamie Smith|Brydon Carse|Josh Tongue|Jake Weatherald|Travis Head|Marnus Labuschagne|Steve Smith|Cameron Green|Alex Carey|Beau Webster|Pat Cummins|Mitchell Starc|Nathan Lyon|Josh Hazlewood|Aiden Markram|Ryan Rickelton|Tristan Stubbs|David Bedingham|Kyle Verreynne|Wiaan Mulder|Marco Jansen|Tom Latham|Devon Conway|Kane Williamson|Daryl Mitchell|Tom Blundell|Michael Bracewell|Mitchell Santner|Matt Henry|Jacob Duffy|Nathan Smith|Phil Salt|Jos Buttler|Will Jacks|Sam Curran|Liam Dawson|Jamie Overton|Luke Wood|Mitchell Marsh|Josh Inglis|Glenn Maxwell|Tim David|Adam Zampa|Nathan Ellis|Xavier Bartlett|Ben Dwarshuis|Quinton de Kock|David Miller|Dewald Brevis|Anrich Nortje|Finn Allen|Glenn Phillips|Mark Chapman|Lockie Ferguson|Kyle Jamieson');
  set('#b88461','Shoaib Bashir|Shubman Gill|Rishabh Pant|Washington Sundar|Kuldeep Yadav|Rachin Ravindra|Abdullah Shafique|Shan Masood|Babar Azam|Saud Shakeel|Mohammad Rizwan|Salman Agha|Faheem Ashraf|Sajid Khan|Noman Ali|Naseem Shah|Shaheen Afridi|Adil Rashid|Abhishek Sharma|Shivam Dube|Arshdeep Singh|Harshit Rana|Saim Ayub|Fakhar Zaman|Sahibzada Farhan|Shadab Khan|Mohammad Nawaz|Abrar Ahmed');
  set('#9b6848','Yashasvi Jaiswal|KL Rahul|Sai Sudharsan|Ravindra Jadeja|Akash Deep|Jasprit Bumrah|Mohammed Siraj|Keshav Maharaj|Pathum Nissanka|Oshada Fernando|Dinesh Chandimal|Kamindu Mendis|Dhananjaya de Silva|Kusal Mendis|Milan Rathnayake|Prabath Jayasuriya|Asitha Fernando|Lahiru Kumara|Nishan Peiris|Tagenarine Chanderpaul|Sanju Samson|Suryakumar Yadav|Tilak Varma|Hardik Pandya|Axar Patel|Ish Sodhi|Kusal Perera|Charith Asalanka|Dasun Shanaka|Dunith Wellalage|Dushan Hemantha|Maheesh Theekshana|Dushmantha Chameera|Matheesha Pathirana');
  set('#744931','Jofra Archer|Temba Bavuma|Kagiso Rabada|Lungi Ngidi|John Campbell|Alick Athanaze|Shai Hope|Kavem Hodge|Roston Chase|Justin Greaves|Tevin Imlach|Jomel Warrican|Kemar Roach|Jayden Seales|Brandon King|Johnson Charles|Shimron Hetmyer|Rovman Powell|Jason Holder|Akeal Hosein|Romario Shepherd|Shamar Joseph');
  const keepers=new Set('jamie-smith|rishabh-pant|alex-carey|kyle-verreynne|tom-blundell|mohammad-rizwan|kusal-mendis|tevin-imlach|jos-buttler|sanju-samson|josh-inglis|quinton-de-kock|devon-conway|johnson-charles'.split('|'));
  return{colours,keepers,skin:id=>id==='umpire'?'#ba8c6b':colours[id]||'#b88e6b'};
 })();
 Presentation.bowlerPosition=function(ball,phase,elapsed){const flight=phase==='flight',run=flight&&elapsed<0?clamp((elapsed+850)/850,0,1):flight?clamp(elapsed/600,0,1):.35,release=ball?.releaseX??.43,side=release<0?-1:1,approach=side*Math.max(1.4,Math.abs(release)),bend=BatterRig.smooth((run-.48)/.52);return{x:flight&&elapsed<0?lerp(approach,release,bend):release,z:flight&&elapsed<0?24-run*5.6:flight?18.4-run*1.3:17.1};};
 const Commentary={
  pick(lines,key){let n=0;for(const c of String(key))n=(Math.imul(n,31)+c.charCodeAt(0))>>>0;return lines[n%lines.length];},
  line(r,input,waiting=false,key=''){
   if(!r)return '';const name=r.shot||'',good=(r.quality??0)>=.8,pick=a=>this.pick(a,key+name);
   if(waiting){if(r.edge)return 'Off the edge! Watch the keeper and the slips.';if(!r.contact)return 'Past the bat, through towards the keeper.';if(r.loft)return 'Up in the air. The fielder is judging the flight.';return good?'A clean strike. Can the field cut it off?':'Worked into the field. Watch the running.';}
   if(r.wicket)return ({bowled:pick(['Through the gate and into the stumps!','Beaten by the ball, and the stumps are down.']),lbw:'Struck on the pad. The finger goes up - leg before wicket.',runOut:'The throw beats the bat. Run out!',caught:r.edge?'The edge carries this time, and the catch is held.':'In the air, underneath it, and safely held.'})[r.dismissalKind]||'Out! A wicket for the bowling side.';
   if(r.edge){const bounce=r.play?.bounces?.[0],at=bounce&&Fielding.freeBall(r.play,bounce.time),short=at&&Math.hypot(at.x,at.z)<14;return short?'Off the edge, but it drops short of the catching field.':r.runs>=4?'A thick edge evades the cordon and runs away for four.':'An edge, but no catch. The batter survives.';}
   if(r.dropped)return 'Put down! The chance goes to ground'+(r.batRuns?' and they take '+r.batRuns+'.':'. The fielder recovers.');
   if(r.wide)return 'Too wide to make the batter play. An extra to the total.';
   if(!r.contact)return input?'Beaten! No contact with that one.':'Shoulders arms and lets it through to the keeper.';
   if(r.batRuns===6)return /slog/i.test(name)?pick(['A huge swing, and it clears the rope!','The slog clears the rope. Six runs!']):good?pick(['Right out of the middle and over the rope for six!','A clean lift, all the way. Six runs.']):'Not perfectly struck, but there is enough on it for six.';
   if(r.batRuns===4){if(/cover/i.test(name))return !good?'Driven through the covers. The chase cannot stop four.':pick(['Leans into the cover drive. Beautifully placed for four.','Through the covers, timed sweetly. That is four.']);if(/straight/i.test(name))return 'A straight bat, a clean swing, and four past the bowler.';if(/cut/i.test(name))return 'Uses the width and cuts it past the field for four.';if(/sweep/i.test(name))return 'Down on one knee, swept firmly to the boundary.';return pick(['Finds the gap and the ball races away for four.','Firmly struck, beyond the chase. Four runs.']);}
   if(input?.mode==='defend')return good?pick(['Right behind it, head still and bat straight. Solid defence.','Soft hands, under the eyes. Nothing for the close catchers.']):'Gets the bat down and keeps it out.';
   if(/cover/i.test(name)&&good)return 'A lovely cover drive, but the field is well placed.';
   if(r.batRuns>0)return r.batRuns===1?'Worked into the gap. A well-judged single.':r.batRuns===2?'Placed away from the fielder. They come back for two.':'Into the open field. Good running brings three.';
   return good?'Nicely timed, straight to the fielder. No run.':'The field closes in. No run available.';
  }
 };
 const resultSoundV27=SoundDesign.samples;
 SoundDesign.samples=function(kind,rate=22050){
  if(kind==='crowd-victory'||kind==='crowd-trophy')return Crowd.samples(kind==='crowd-trophy'?'double':'hundred',rate);
  if(kind==='crowd-draw')return Crowd.samples('team',rate);
  if(kind!=='coins'&&kind!=='crowd-defeat')return resultSoundV27.call(this,kind,rate);
  const duration=kind==='coins'?1.7:3.1,out=new Float32Array(Math.ceil(duration*rate));
  for(let i=0;i<out.length;i++){const t=i/rate;let value=0;if(kind==='coins'){for(let j=0;j<7;j++){const age=t-j*.15;if(age>=0)value+=.14*Math.exp(-age*13)*(Math.sin(2*Math.PI*(880+j*110)*age)+.32*Math.sin(2*Math.PI*(1780+j*113)*age));}}else{const envelope=Math.sin(Math.PI*t/duration)**2;for(let j=0;j<9;j++)value+=.035*envelope*Math.sin(2*Math.PI*(135+j*17+4*Math.sin(t*3+j))*t);}out[i]=clamp(value,-.7,.7);}return out;
 };

 // R30: human bowling is a command over the same seeded match engine.
 // Previewing the arm, marker and flight never draws from the match RNG.
 const BowlingControl={
  duration:1400,
  lengthAt(age,version=31){return version===30?lerp(.22,10.4,clamp((age-450)/800,0,1)):clamp(.55+(age-690)*.023,-5,10.8);},
  releaseLabel(length,version=31){return version===30?this.label(length):length<=0?'Full toss':length<.85?'Yorker':length<2.1?'Overpitched':this.label(length);},
  lines(hand='right'){const lines=[{value:1,name:'Wide outside off'},{value:.55,name:'Corridor'},{value:.14,name:'Off stump'},{value:0,name:'Middle stump'},{value:-.4,name:'Leg stump'}];return hand==='left'?lines.reverse():lines;},
  camera(arm='right'){const side=arm==='left'?-1:1;return{x:side*1.05,y:2.35,z:23.2,tx:0,ty:.68,tz:0};},
  label(length){return length<1.05?'yorker':length<4.05?'full':length<7.4?'good':'short';},
  phase(age){return lerp(.72,1.14,clamp(age/1400,0,1));},
  options(owner){const type=owner.archetype,s=Players.data[owner.playerId]?.bowling||owner.skills||owner,items=type==='legspin'?['Leg-break','Top-spinner','Googly']:type==='offspin'?['Off-break','Arm ball']:type==='swing'?['Seam-up','Outswinger','Inswinger','Slower ball']:type==='leftpace'?['Angled seam-up',...((s.movement??0)>=90?['Outswinger']:[]),'Inswinger','Slower ball']:['Seam-up',...((s.movement??0)>=80?['Outswinger']:[]),...((s.movement??0)>=90?['Inswinger']:[]),'Slower ball'];return items.map(name=>({name,control:Math.round(clamp((s.control??70)+(name==='Seam-up'||name.includes('break')?4:name==='Slower ball'||name==='Googly'?(s.variation??65)/5-20:-5),35,98))}));},
  eligible(m){const over=Math.floor(m.balls/6),last=m.history.findLast(r=>r.over===over-1)?.delivery.bowler,started=m.history.some(r=>r.over===over);return m.bowlers.map((b,i)=>({index:i,name:b.name,allowed:started?i===Innings.bowler(m):i!==last&&(m.format!=='T20'||b.balls<24),balls:b.balls}));},
  choose(m,index){if(!Number.isInteger(index)||!this.eligible(m).some(b=>b.index===index&&b.allowed)||m.history.some(r=>r.over===Math.floor(m.balls/6)))throw Error('Choose an eligible bowler before the over begins');return{...m,bowlingChoices:{...m.bowlingChoices,[Math.floor(m.balls/6)]:index}};},
  field(m,ball,preset='balanced'){
   const sign=Hand.sign(ball),field=Innings.field(m,ball).map(f=>({...f,a:f.a*sign}));
   if(preset==='attack'){for(let i=0;i<field.length;i++){if(Tactics.outside(field[i])&&field[i].a>0){const next=field.map((f,j)=>j===i?{a:field.some(q=>q.n==='slip'||q.n==='first slip')?145:160,r:13/64,n:field.some(q=>q.n==='slip'||q.n==='first slip')?'second slip':'slip'}:f);if(Tactics.legal(next,m)){field.splice(0,field.length,...next);break;}}}}
   if(preset==='defend'){for(const angle of [14,-16,65,-100,135]){const target={a:angle,r:57/64,n:angle===14?'long-off':angle===-16?'long-on':angle===65?'deep cover':angle===-100?'deep square leg':'third man'},i=field.map((f,i)=>({i,cost:Tactics.outside(f)?999:Math.abs(f.a-angle)})).sort((a,b)=>a.cost-b.cost)[0]?.i,next=field.map((f,j)=>j===i?target:f);if(Tactics.legal(next,m))field.splice(0,field.length,...next);}}
   return field.map(f=>({...f,a:f.a*sign}));
  },
  prepare(m,plan={}){const d=Innings.delivery(m),b=d.ball,owner=m.bowlers[b.bowler],choices=this.options(owner),variation=choices.some(v=>v.name===plan.variation)?plan.variation:choices[0].name,rng=RNG.stream(d.rngState),noise=Array.from({length:6},()=>rng.next()),line=clamp(Number(plan.line)||0,-1.1,1.25),preset=['balanced','attack','defend'].includes(plan.field)?plan.field:'balanced';
   b.manualBowling={version:31,variation,line,field:preset,noise,control:choices.find(v=>v.name===variation).control,releaseAge:null};b.variation=variation;b.savedField=this.field(m,b,preset);b.fieldNote='Field: '+({balanced:'balanced',attack:'catching positions',defend:'boundary protection'}[preset]);return{ball:b,rngState:rng.state};
  },
  release(template,rawAge,offset=0){const b={...template,manualBowling:{...template.manualBowling}},c=b.manualBowling;if(!c||![30,31].includes(c.version))throw Error('This ball has no bowling plan');const age=clamp(rawAge-offset,350,1400),n=c.noise,s=b.bowlerProfile,spin=Strokes.spin(b),p=b.conditions,sign=Hand.sign(b),control=c.control,variation=c.variation;
   const intended=this.lengthAt(age,c.version),rawLength=clamp(intended+(n[0]+n[1]-1)*(1-control/115)*(c.version>=31?1.1:.75),c.version>=31?-5:.18,10.8),length=rawLength>0?Math.max(.18,rawLength):rawLength,lengthName=c.version>=31?(length<=0?'full':length<.85?'yorker':length<4.05?'full':this.label(length)):this.label(length),speed=Math.round(lerp(...s.speed,n[2])-(variation==='Slower ball'?lerp(13,21,n[3]):0)),movement=.55+s.movement*.006;
   let swing=(variation==='Outswinger'?1:variation==='Inswinger'?-1:0)*lerp(.17,.31,n[3])*p.swing*movement*sign;
   let kick=spin?(b.archetype==='legspin'?(variation==='Googly'?-1:variation==='Top-spinner'?0:1)*lerp(.24,.43,n[4]):variation==='Arm ball'?0:-lerp(.20,.37,n[4]))*p.turn:(n[4]<.5?-1:1)*lerp(.05,.17,n[5])*p.seam;
   if(spin&&b.arm==='left')kick*=-1;kick=Math.atan(kick*movement/5.5)*sign;
   const knots=spin?[[.18,.06],[1,.16],[3.3,.40],[5.5,.75],[8,1.32],[10.8,1.8]]:[[.18,.06],[1,.17],[3.3,.44],[5.8,.9],[8.5,1.65],[10.8,2.05]];let k=1;while(k<knots.length-1&&length>knots[k][0])k++;const height=lerp(knots[k-1][1],knots[k][1],clamp((length-knots[k-1][0])/(knots[k][0]-knots[k-1][0]),0,1));
   const contactH=clamp(height*p.bounce*(.90+s.bounce*.0013)*(variation==='Top-spinner'?1.10:1)+(n[5]-.5)*p.variation,.05,2.22),preTime=(18.4-length)/(speed/3.6),postTime=length/(speed/3.6*(spin?.70:lerp(.79,.64,clamp((length-6)/3,0,1)))*p.pace);
   Object.assign(b,{length,lengthName,speed,variation,swing,kick,contactH,preTime,postTime,duration:(preTime+postTime)*2600,bounceT:preTime/(preTime+postTime),line:(c.line+(n[0]+n[5]-1)*(1-control/120)*.28)*sign});
   c.releaseAge=rawAge;c.correctedAge=age;c.phase=this.phase(rawAge);c.intendedLength=intended;
   if(c.version>=31){c.releaseLabel=this.releaseLabel(length,c.version);b.fullToss=length<=0;if(b.fullToss){b.contactH=clamp(.035-length*.23,.035,.95);b.kick=0;b.preTime=18.4/(speed/3.6);b.postTime=0;b.duration=b.preTime*2600;b.bounceT=1;}}return b;
  }
 };
 const inningsBowlerV29=Innings.bowler;
 Innings.bowler=function(m,over=Math.floor(m.balls/6)){if(!m.bowlingChoices)return inningsBowlerV29.call(this,m,over);const fixed=m.bowlingChoices[over],played=m.history.find(r=>r.over===over);if(fixed!==undefined)return fixed;if(played)return played.delivery.bowler;const last=m.history.findLast(r=>r.over===over-1)?.delivery.bowler,index=inningsBowlerV29.call(this,m,over);return index!==last&&(m.format!=='T20'||m.bowlers[index].balls<24)?index:m.bowlers.map((b,i)=>({b,i})).filter(({b,i})=>i!==last&&(m.format!=='T20'||b.balls<24)).sort((a,b)=>a.b.balls-b.b.balls)[0]?.i??index;};
 const FlightInfo={
  carry(p){if(!p?.airTime||!p.origin)return null;const end=Fielding.freeBall(p,p.airTime);return Math.round(Math.hypot(end.x-p.origin.x,end.z-p.origin.z));},
  trail(p,time){if(!p||time<=0)return[];const end=Math.min(time,p.event.time),start=Math.max(0,end-.65);return Array.from({length:15},(_,i)=>({...Fielding.freeBall(p,lerp(start,end,i/14)),alpha:(i+1)/15})).filter(p=>p.h>.16&&!p.bounced);}
 };
 const Toss={
  available(c){return c.innings.length===1&&c.innings[0].history.length===0&&c.phase==='play';},
  call(c,call){if(!this.available(c)||!['heads','tails'].includes(call))throw Error('The toss has already finished');const rng=RNG.stream(c.seed^0x30a71),face=rng.next()<.5?'heads':'tails',player=c.teams.findIndex(t=>t.id===c.playerId),winner=face===call?player:1-player,choice=rng.next()<.55?'bat':'bowl';return{call,face,winner,choice:winner===player?null:choice,seen:false};},
  choose(c,toss,choice){if(!this.available(c)||!['bat','bowl'].includes(choice))throw Error('Invalid toss decision');const first=choice==='bat'?toss.winner:1-toss.winner,rng=RNG.stream(c.seed);rng.next();rng.next();const m=Conditions.attach(c,Innings.create(rng.state,c.teams[first],c.teams[1-first],c.format,first));return{...c,first,innings:[m],toss:c.teams[toss.winner].name+' won the toss and chose to '+choice,rngState:rng.state};}
 };
 const CatchControl={
  opportunity(out){const p=out?.play,e=p?.catchAttempt||p?.event;if(!out?.contact||!e||!['catch','pickup','four','six'].includes(e.type)||Math.hypot(e.x,e.z)<22||Math.min(p.airTime||0,e.time)<1.35)return null;return e;},
  candidates(out,time=0){const e=this.opportunity(out),p=out?.play;if(!e||time>=Math.min(p.airTime,e.time)-.55)return[];const boundary=['four','six'].includes(e.type),frame=TeamField.frame(out,time),selected=e.id??e.chaser?.id;return frame.fielders.filter(f=>f.id!=='keeper'&&f.id!=='bowler').map(f=>({id:f.id,name:f.playerName||f.name,position:f.name,arrival:time+TeamField.arrive(f,e.x,e.z),x:f.x,z:f.z})).filter(f=>boundary||f.arrival<=e.time-.05||f.id===selected).sort((a,b)=>a.arrival-b.arrival).slice(0,3);},
  choose(out,ball,id,time){const target=this.candidates(out,time).find(f=>String(f.id)===String(id));if(!target)return out;const p=out.play,base=p.catchBase||p,e=this.opportunity(out),selected=e.id??e.chaser?.id;if(String(selected)===String(id))return out;const previous=TeamField.frame(out,time),choice={time,id:target.id,positions:previous.fielders.map(f=>({id:f.id,x:f.x,z:f.z,travel:f.travel||0}))};
   if(['four','six'].includes(e.type)){const event={...e,chaser:{id:target.id,name:target.position,arrival:Math.max(target.arrival,e.time+.15)}};return{...out,play:{...p,event,returnTime:event.chaser.arrival+1.5,catchChoice:choice}};}
   const event={...e,id:target.id,name:target.position},play={...base,event,catchChoice:choice};
   if(e.type==='catch')return Catching.resolve({...out,play,wicket:true,dismissalKind:'caught',fielder:event.name,decisionTime:event.time},ball);
   let result={...out,play};if(play.running&&play.throw)result=Running.finish(result,play.running.legs,TeamField.route(play,play.throw.end));return result;
  }
 };
 const Catching={
  probability(p,e){const f=[...p.starts,p.keeper].find(f=>f.id===e.id),distance=Math.hypot(e.x-f.x,e.z-f.z),arrival=TeamField.arrive(f,e.x,e.z),at=Fielding.freeBall(p,e.time),pace=clamp((at.speed||0)/32,0,1),running=clamp((distance-6)/22,0,1)*clamp((arrival/Math.max(.1,e.time)-.70)/.30,0,1),low=clamp((.6-e.h)/.6,0,1),high=clamp((e.h-1.8)/.5,0,1);
   // The first reachable point is often on the edge of the reach envelope.
   // That alone is not a difficult catch: use a sustained sprint, ball pace
   // and hand height. Routine chances have only a small handling error.
   return clamp(.997-.018*pace*pace-.10*running*running-.008*low-.008*high,.86,.997);},
  resolve(out,ball,forced=false){const p=out.play,e=p?.event;if(!p||e.type!=='catch'||ball.fieldingVersion!==30||ball.noBall||ball.freeHit)return out;
   const roll=p.catchRoll??RNG.stream((out.rngState^0x5b3017)>>>0).next(),probability=this.probability(p,e),base={...p,catchRoll:roll};delete base.catchBase;
   if(roll<probability)return Rules.score({...out,play:{...base,catchAttempt:{...e,probability},catchHeld:true},wicket:true,dismissalKind:'caught',fielder:e.name,decisionTime:e.time,title:'Caught',detail:'Caught by '+e.name},0);
   const at=Fielding.freeBall(p,e.time),deflected=NormalBall.build(at,Math.atan2(p.dx,p.dz),Math.max(1.4,(at.speed||10)*.17),.5,'drop',.1,ball.conditions),play={...base,catchBase:base,catchAttempt:{...e,probability},catchHeld:false,drop:{time:e.time,path:deflected},stopTime:e.time+deflected.stopTime,throw:null,running:null};
   let event;for(let t=e.time+.65;t<=Math.max(e.time+8,play.stopTime+.4);t+=.04){const q=Fielding.freeBall(play,t);if(Ground.outside(ball,q)){event={...q,type:'four',time:t};break;}if(q.h>.70)continue;const candidates=[...play.starts,play.keeper].filter(f=>Math.hypot(f.x-q.x,f.z-q.z)<=BallFlight.run(f,t)+.6).sort((a,b)=>TeamField.arrive(a,q.x,q.z)-TeamField.arrive(b,q.x,q.z));if(candidates.length){event={...q,type:'pickup',id:candidates[0].id,name:candidates[0].name,time:t};break;}}
   if(!event)event={...Fielding.freeBall(play,play.stopTime),type:'pickup',id:e.id,name:e.name,time:Math.min(25,play.stopTime+.3)};play.event=event;play.returnTime=event.time;let r=Running.create({...out,play,wicket:false,dismissalKind:null,fielder:undefined,title:'Dropped catch',detail:'Put down by '+e.name},ball);if(out.aiRuns)r=Running.automatic(r);r.dropped=true;return r;
  }
 };
 const deliveryForFieldingV29=Innings.delivery;
 Innings.delivery=function(m){const d=deliveryForFieldingV29.call(this,m);return{...d,ball:{...d.ball,fieldingVersion:30}};};
 const freeBallV29=Fielding.freeBall,shotResolveV29=Shot.resolve,frameFieldV29=TeamField.frame;
 Fielding.freeBall=function(p,t){return p.drop&&t>=p.drop.time?NormalBall.at(p.drop.path,t-p.drop.time):freeBallV29.call(this,p,t);};
 Shot.resolve=function(ball,input,batter,field,seed){let out=shotResolveV29.call(this,ball,input,batter,field,seed);if(ball.fieldingVersion===30){out.aiRuns=!!input?.callRuns;out=Catching.resolve(out,ball);}if(ball.fieldingVersion===30&&out.boundary===6)out.sixDistance=FlightInfo.carry(out.play);return out;};
 TeamField.frame=function(out,t){const p=out.play,drop=p.drop;
  if(drop&&t<=drop.time)return this.frame({...out,play:{...p.catchBase,event:p.catchAttempt,catchChoice:p.catchChoice}},t);
  const frame=frameFieldV29.call(this,out,t),change=p.catchChoice,mark=drop?.time??change?.time;
  if(mark!==undefined&&t>=mark){const e=p.event,atEvent=frameFieldV29.call(this,out,e.chaser?.arrival??e.time),starts=drop?this.frame({...out,play:{...p.catchBase,event:p.catchAttempt,catchChoice:p.catchChoice}},drop.time).fielders:change.positions,dt=t-mark,period=Math.max(.05,(e.chaser?.arrival??e.time)-mark);
   frame.fielders=frame.fielders.map(f=>{const start=starts.find(a=>a.id===f.id),target=atEvent.fielders.find(a=>a.id===f.id);if(!start||!target)return f;const dx=target.x-start.x,dz=target.z-start.z,d=Math.hypot(dx,dz),travel=Math.min(d,BallFlight.run(f,Math.min(dt,period))),k=d?travel/d:1,x=start.x+dx*k,z=start.z+dz*k;
    if(dt<=period)return{...f,x,z,travel:(start.travel||0)+travel,moving:travel<d-.02,gait:travel<d-.02?1:0,heading:{x:dx,z:dz}};
    const blend=1-BatterRig.smooth((dt-period)/.5);return{...f,x:f.x+(x-target.x)*blend,z:f.z+(z-target.z)*blend};});
  }return frame;
 };
 const savePackV29=CareerSave.pack,saveValidateV29=CareerSave.validate;
 CareerSave.pack=function(app){return{...savePackV29.call(this,app),bowlingOffset:app.bowlingOffset??0,bowlingGuide:app.bowlingGuide!==false,ballTrail:app.ballTrail!==false};};
 CareerSave.validate=function(raw){const data=saveValidateV29.call(this,raw);if(data.bowlingOffset===undefined)data.bowlingOffset=0;if(!Number.isFinite(data.bowlingOffset)||Math.abs(data.bowlingOffset)>200)throw Error('Invalid bowling timing offset');for(const key of ['bowlingGuide','ballTrail'])if(data[key]!==undefined&&typeof data[key]!=='boolean')throw Error('Invalid bowling preference');for(const state of Object.values(data.sessions)){
   if(state.needsToss!==undefined&&typeof state.needsToss!=='boolean')throw Error('Invalid toss state');
   const pending=state.pending,manual=pending?.manualBowling;if(pending?.fieldingVersion!==undefined&&pending.fieldingVersion!==30)throw Error('Invalid fielding rules');
   if(manual&&(![30,31].includes(manual.version)||typeof manual.variation!=='string'||manual.variation.length>30||!['balanced','attack','defend'].includes(manual.field)||!Number.isFinite(manual.line)||Math.abs(manual.line)>1.25||!Number.isFinite(manual.control)||manual.control<35||manual.control>98||!Array.isArray(manual.noise)||manual.noise.length!==6||manual.noise.some(n=>!Number.isFinite(n)||n<0||n>=1)||manual.releaseAge!==null&&(!Number.isFinite(manual.releaseAge)||manual.releaseAge<450||manual.releaseAge>1400)||manual.root&&!['x','z'].every(k=>Number.isFinite(manual.root[k])&&Math.abs(manual.root[k])<30)))throw Error('Invalid saved bowling release');
   if(pending?.fullToss!==undefined&&(typeof pending.fullToss!=='boolean'||manual?.version!==31||pending.fullToss&&(pending.length>0||pending.postTime!==0||pending.bounceT!==1||pending.contactH<.035||pending.contactH>.95)))throw Error('Invalid full-toss flight');
   const change=state.live?.play?.catchChoice;if(change&&(!Number.isFinite(change.time)||change.time<0||change.time>30||!Array.isArray(change.positions)||change.positions.length!==11||change.positions.some(f=>!Number.isFinite(f.x)||!Number.isFinite(f.z)||Math.hypot(f.x,f.z)>100)))throw Error('Invalid saved fielding choice');
   const a=state.bowlingAction;if(a&&(!Number.isFinite(a.age)||a.age<0||a.age>1400||typeof a.running!=='boolean'||typeof a.released!=='boolean'))throw Error('Invalid bowling action');const plan=state.bowlingPlan;if(plan&&(!Number.isFinite(plan.line)||plan.line< -1.1||plan.line>1.25||typeof plan.variation!=='string'||plan.variation.length>30||!['balanced','attack','defend'].includes(plan.field)))throw Error('Invalid bowling plan');for(const m of state.contest.innings)if(m.bowlingChoices){for(const [over,index]of Object.entries(m.bowlingChoices))if(!/^\d+$/.test(over)||+over>449||!Number.isInteger(index)||index<0||index>4)throw Error('Invalid bowler selection');if(m.format==='T20'&&m.bowlers.some(b=>b.balls>24))throw Error('Bowler exceeded four overs');}if(state.toss30&&(!['heads','tails'].includes(state.toss30.call)||!['heads','tails'].includes(state.toss30.face)||![0,1].includes(state.toss30.winner)||![null,'bat','bowl'].includes(state.toss30.choice)||typeof state.toss30.seen!=='boolean'))throw Error('Invalid toss');}return data;};

 // R31 full tosses follow an unbounced parabola to the bat. No artificial
 // pitch, turn, turf sound or post-bounce slowdown; older paths are untouched.
 Delivery.incomingSpeed=ball=>ball.fullToss?ball.speed/3.6:ball.length/ball.postTime;
 Delivery.fullTossVelocity=ball=>(ball.contactH-ball.releaseH)/ball.preTime-4.905*ball.preTime;
 Delivery.fullTossAt=function(ball,z){const progress=(18.4-z)/18.4,t=progress*ball.preTime,vy=(ball.contactH-ball.releaseH)/ball.preTime+4.905*ball.preTime;return{x:lerp(ball.releaseX,ball.line,progress)+ball.swing*progress*progress,z,h:Math.max(.035,ball.releaseH+vy*t-4.905*t*t)};};
 const atBeforeFullToss=Delivery.at,lateralBeforeFullToss=Delivery.lateral,atZBeforeFullToss=Rules.atZ,continuationBeforeFullToss=BallFlight.continuation;
 Delivery.at=function(ball,t){return ball.fullToss?this.fullTossAt(ball,18.4*(1-clamp(t,0,1.14))):atBeforeFullToss.call(this,ball,t);};
 Delivery.lateral=function(ball,z){return ball.fullToss?this.fullTossAt(ball,z).x:lateralBeforeFullToss.call(this,ball,z);};
 Rules.atZ=function(ball,z){return ball.fullToss?Delivery.fullTossAt(ball,z):atZBeforeFullToss.call(this,ball,z);};
 BallFlight.continuation=function(ball){if(!ball.fullToss)return continuationBeforeFullToss.call(this,ball);const p=Delivery.at(ball,1),slope=(ball.line-ball.releaseX+2*ball.swing)/18.4;return this.build(p,Math.atan2(slope,-1),Delivery.incomingSpeed(ball)*Math.hypot(1,slope),Delivery.fullTossVelocity(ball),100,'through');};

 return Object.freeze({BowlingControl,CatchControl,Catching,FlightInfo,Toss,Appearance,Commentary,Broadcast,Economy,BallView,Players,Presentation,Weather,PreDelivery,Restart,Tactics,Contact,Rules,Running,TeamField,LiveBall,Hand,SoundDesign,Crowd,Stadium,Conditions,Bowling,RNG,Delivery,Shot,Strokes,LegacyShot,ShotV3,Ground,Fielding,BallFlight,NormalBall,View,BatterRig,FielderRig,Match,Save,Squad,Innings,Contest,Opposition,Season,CareerSave,Gesture,Rotation,BOWLERS,FIELDS,clamp,lerp});
})();
