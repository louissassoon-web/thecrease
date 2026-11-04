const cp=require('node:child_process');
for(const file of ['check-player-profiles.cjs','check-over-flow.cjs','check-spin-drives.cjs','check-world-progression.cjs','check-fielding-balance.cjs','check-model-v23.cjs','check-boundaries.cjs','check-timing-offset.cjs','check-model-v27.cjs','check-presentation-v28.cjs','check-batting-presentation-v29.cjs','check-bowling-v30.cjs','check-bowling-v31.cjs','check-bowling-v32.cjs','check-audit-v34.cjs','check-ux-v35.cjs','check-calm-v36.cjs','check-usability-v37.cjs']){
 const r=cp.spawnSync(process.execPath,[file],{cwd:__dirname,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);
}
console.log('All 119 portable review groups passed.');
