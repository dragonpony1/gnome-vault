// ASCII dump of a map's grid and heights, straight from parts/game.js (no browser): node gridmap.mjs <mapIndex>
import fs from 'fs'; const src=fs.readFileSync(process.env.SP+'/parts/game.js','utf8'); const a=src.indexOf('const MAPS=['), b=src.indexOf('const MAPS_CLEARED');
const PI=Math.PI, T={WALL:0,FLOOR:1,CARPET:2,DAIS:3,PILLAR:4,SPAWN:5,CRYSTAL:6,PROP:7};
const MAPS=new Function('PI','T',src.slice(a,b)+'; return MAPS;')(PI,T); const M=MAPS[+process.argv[2]||0]; const GW=M.gw, GH=M.gh; const grid=new Uint8Array(GW*GH), hgt=new Float32Array(GW*GH), rampA=new Int8Array(GW*GH);
const idx=(x,z)=>z*GW+x; const f=(x0,x1,z0,z1,t)=>{ for(let z=z0;z<=z1;z++) for(let x=x0;x<=x1;x++) grid[idx(x,z)]=t; }; const g=(x,z,t)=>{ grid[idx(x,z)]=t; }; const h=(x0,x1,z0,z1,y)=>{ for(let z=z0;z<=z1;z++) for(let x=x0;x<=x1;x++) hgt[idx(x,z)]=y; };
const ramp=(x0,x1,z0,z1,dir,y0,y1)=>{ const alongZ=dir===1||dir===2; const n=alongZ?(z1-z0+1):(x1-x0+1); for(let z=z0;z<=z1;z++) for(let x=x0;x<=x1;x++){ const k=alongZ?(dir===1?z1-z:z-z0):(dir===3?x-x0:x1-x); const i=idx(x,z); rampA[i]=dir; hgt[i]=y0+(y1-y0)*(k+.5)/n; } };
M.build(f,g,h,ramp);
const ch=['#','.',':','=','O','S','C','P']; console.log(M.name,GW+'x'+GH);
for(let z=0;z<GH;z++){ let row=String(z).padStart(2)+' '; for(let x=0;x<GW;x++){ const i=idx(x,z), t=grid[i]; if(t===T.WALL){ row+='  '; continue; } let c=ch[t]; if(rampA[i]) c='^v><'[rampA[i]-1]; row+=c+(t===T.WALL?' ':String(Math.round(hgt[i]))); } console.log(row); }
// BFS from the crystal with the ledge rule
const walk=t=>t===1||t===2||t===3||t===5; const GOAL=idx(M.crystal[0],M.crystal[1]); const dist=new Int16Array(GW*GH).fill(-1); dist[GOAL]=0; const q=[GOAL]; let qi=0;
while(qi<q.length){ const i=q[qi++], x=i%GW, z=(i/GW)|0; for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx,nz=z+dz; if(nx<0||nz<0||nx>=GW||nz>=GH) continue; const j=idx(nx,nz); if(dist[j]>=0||!walk(grid[j])||Math.abs(hgt[j]-hgt[i])>.8) continue; dist[j]=dist[i]+1; q.push(j); } }
for(const [k,l] of Object.entries(M.lanes)) console.log('lane',k,l.name,'from wave',l.from||1,'path',dist[idx(l.cx,l.cz)]);
