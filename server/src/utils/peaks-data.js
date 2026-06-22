// CJS port of client/src/data/peaks-data.ts
const PALETTES = {
  SAWATCH:  {sky:'#ECAE4B',sun:'#F7D58E',back:'#9098BE',pL:'#969FC6',pM:'#646FA0',pS:'#4E588A',pD:'#3C4470',hi:'#F1EADC',hiSh:'#C9CDDE',mid:'#4A6B3F',pn1:'#2C5235',pn2:'#3C6B41',pn3:'#4A7C45',bd:'#233D2E',ky:'#3C6149',bn:'#233D2E',nm:'#ECAE4B',ac:'#ECAE4B',sub:'#ECEAE0'},
  SANGRE:   {sky:'#E9A77E',sun:'#F6D3A8',back:'#9A7E92',pL:'#C97E7A',pM:'#9E5E63',pS:'#7C4651',pD:'#5E3340',hi:'#F2E0D6',hiSh:'#D3B5B0',mid:'#4B5E3E',pn1:'#284A33',pn2:'#365C3D',pn3:'#4A7444',bd:'#3A2530',ky:'#6E4A4E',bn:'#3A2530',nm:'#F1C98C',ac:'#E89A6B',sub:'#F1E7DE'},
  SANJUAN:  {sky:'#5FA9A6',sun:'#EAD9A0',back:'#7E9E97',pL:'#C58A52',pM:'#9E6438',pS:'#7A4A2A',pD:'#5C3720',hi:'#EFE6D2',hiSh:'#C9BFA0',mid:'#3E5E3C',pn1:'#244A30',pn2:'#34593A',pn3:'#487443',bd:'#1F3D33',ky:'#486B57',bn:'#1F3D33',nm:'#E0B36A',ac:'#D98C4A',sub:'#EAF1EC'},
  ELK:      {sky:'#84B2C4',sun:'#F1E3B0',back:'#7C8BA0',pL:'#9A5E5A',pM:'#7A4148',pS:'#5C2F3A',pD:'#45222E',hi:'#ECE2D6',hiSh:'#C6B6B2',mid:'#6E7A3C',pn1:'#2E5236',pn2:'#3C6B41',pn3:'#C99A3C',bd:'#33222A',ky:'#5E4A50',bn:'#33222A',nm:'#E0B24E',ac:'#C98A3C',sub:'#EDEAE0'},
  MOSQUITO: {sky:'#9DC6D0',sun:'#F0E7C4',back:'#93A0AE',pL:'#A7AEB8',pM:'#7E8794',pS:'#616B7C',pD:'#4A5364',hi:'#F1EFEA',hiSh:'#CBD0D6',mid:'#54663F',pn1:'#2C4A33',pn2:'#3A5C3E',pn3:'#4C7546',bd:'#2A3640',ky:'#4E5E63',bn:'#2A3640',nm:'#E6C766',ac:'#C9A24E',sub:'#EEF2F2'},
  FRONT:    {sky:'#6FA8C4',sun:'#F3E2A8',back:'#8E96A4',pL:'#C2A98C',pM:'#9C8268',pS:'#77604B',pD:'#5A4838',hi:'#F0EBDF',hiSh:'#CFC4B0',mid:'#4E6A3E',pn1:'#284A30',pn2:'#365C3C',pn3:'#497544',bd:'#213A2C',ky:'#3E5E47',bn:'#213A2C',nm:'#E8C36A',ac:'#D8A24E',sub:'#EAF1F2'},
  TENMILE:  {sky:'#8C92C4',sun:'#E9E6D2',back:'#9AA0C2',pL:'#AEB6CE',pM:'#828BAC',pS:'#646E92',pD:'#4C5578',hi:'#F2F1EC',hiSh:'#CDD3E0',mid:'#3E5240',pn1:'#25402F',pn2:'#33523A',pn3:'#456A45',bd:'#25303A',ky:'#46566A',bn:'#25303A',nm:'#E4D9A6',ac:'#C9C06E',sub:'#EEEEF4'},
};

function P(id,name,full,elev,range,ridge,scene){return{id,name,full,elev,range,palette:range,ridge,scene};}

const PEAKS=[
  P('elbert','ELBERT','MOUNT ELBERT','14,440','SAWATCH',[[120,364],[176,300],[230,228],[284,168],[320,134],[352,166],[392,222],[438,286],[500,364]],{sun:[418,158,84],birds:[[168,150,0.9]],sky:'A',trees:'full',feature:null,snow:null}),
  P('massive','MASSIVE','MOUNT MASSIVE','14,428','SAWATCH',[[110,364],[160,268],[200,214],[238,244],[280,170],[316,150],[352,178],[394,158],[436,234],[476,288],[512,364]],{sun:[182,182,74],birds:[[420,140,0.6],[452,120,0.9]],sky:'B',trees:'clusters',feature:null,snow:null}),
  P('harvard','HARVARD','MOUNT HARVARD','14,421','SAWATCH',[[124,364],[200,256],[262,176],[312,118],[362,178],[424,258],[500,364]],{sun:[416,150,80],birds:[[166,158,0.9]],sky:'C',trees:'full',feature:null,snow:null}),
  P('laplata','LA PLATA','LA PLATA PEAK','14,343','SAWATCH',[[120,364],[180,260],[238,176],[286,126],[324,168],[360,150],[404,224],[452,294],[500,364]],{sun:[186,150,80],birds:[[420,140,0.62],[450,162,0.9]],sky:'A',trees:'sparseR',feature:null,snow:null}),
  P('antero','ANTERO','MOUNT ANTERO','14,276','SAWATCH',[[118,364],[178,288],[236,212],[296,150],[326,128],[366,196],[404,250],[438,300],[472,322],[504,364]],{sun:[420,160,78],birds:[[170,146,0.85]],sky:'B',trees:'clusters',feature:null,snow:null}),
  P('shavano','SHAVANO','MOUNT SHAVANO','14,236','SAWATCH',[[124,364],[192,272],[252,186],[306,124],[356,190],[416,272],[500,364]],{sun:[196,120,52],birds:[[430,150,0.9]],sky:'C',trees:'full',feature:null,snow:'angel'}),
  P('belford','BELFORD','MOUNT BELFORD','14,197','SAWATCH',[[122,364],[176,300],[214,246],[258,178],[292,130],[315,112],[350,156],[398,178],[434,256],[478,362]],{sun:[414,160,80],birds:[[166,150,0.95]],sky:'B',trees:'full',feature:null,snow:null}),
  P('princeton','PRINCETON','MOUNT PRINCETON','14,197','SAWATCH',[[118,364],[182,280],[244,196],[300,134],[330,128],[382,200],[440,278],[504,364]],{sun:[188,160,80],birds:[[424,150,0.9]],sky:'A',trees:'clusters',feature:null,snow:null}),
  P('yale','YALE','MOUNT YALE','14,196','SAWATCH',[[126,364],[206,250],[268,160],[312,116],[358,166],[420,254],[498,364]],{sun:[414,148,84],birds:[[160,150,0.62],[192,128,0.9]],sky:'C',trees:'full',feature:null,snow:null}),
  P('tabeguache','TABEGUACHE','TABEGUACHE PEAK','14,155','SAWATCH',[[122,364],[188,272],[250,182],[300,126],[340,164],[372,150],[420,250],[500,364]],{sun:[190,158,76],birds:[[428,152,0.88]],sky:'B',trees:'sparseL',feature:null,snow:null}),
  P('oxford','OXFORD','MOUNT OXFORD','14,153','SAWATCH',[[120,364],[182,294],[244,224],[300,168],[336,150],[378,196],[430,268],[500,364]],{sun:[416,158,80],birds:[[166,152,0.9]],sky:'A',trees:'full',feature:null,snow:null}),
  P('columbia','COLUMBIA','MOUNT COLUMBIA','14,073','SAWATCH',[[120,364],[180,286],[236,216],[286,158],[316,138],[342,170],[360,150],[404,228],[456,298],[500,364]],{sun:[188,150,80],birds:[[424,150,0.9]],sky:'C',trees:'clusters',feature:null,snow:null}),
  P('missouri','MISSOURI','MISSOURI MOUNTAIN','14,067','SAWATCH',[[124,364],[196,268],[258,178],[306,122],[330,150],[348,138],[372,210],[392,300],[430,330],[500,364]],{sun:[416,158,80],birds:[[158,150,0.62],[190,130,0.9]],sky:'B',trees:'full',feature:null,snow:null}),
  P('holycross','HOLY CROSS','MOUNT OF THE HOLY CROSS','14,005','SAWATCH',[[120,364],[160,312],[196,268],[250,196],[290,140],[300,118],[330,158],[372,178],[414,210],[468,312],[484,364]],{sun:[190,118,52],birds:[[408,150,0.62],[448,126,0.92]],sky:'C',trees:'shores',feature:'lake',snow:'cross'}),
  P('huron','HURON','HURON PEAK','14,003','SAWATCH',[[128,364],[210,250],[272,150],[312,112],[352,150],[414,250],[496,364]],{sun:[414,148,84],birds:[[166,152,0.9]],sky:'A',trees:'full',feature:null,snow:null}),
];

const STUBS=[
  ['blanca','BLANCA','BLANCA PEAK','14,345','SANGRE'],
  ['crestonepk','CRESTONE','CRESTONE PEAK','14,294','SANGRE'],
  ['crestoneneedle','CRESTONE NEEDLE','CRESTONE NEEDLE','14,197','SANGRE'],
  ['kitcarson','KIT CARSON','KIT CARSON PEAK','14,165','SANGRE'],
  ['challenger','CHALLENGER','CHALLENGER POINT','14,081','SANGRE'],
  ['humboldt','HUMBOLDT','HUMBOLDT PEAK','14,064','SANGRE'],
  ['culebra','CULEBRA','CULEBRA PEAK','14,047','SANGRE'],
  ['ellingwood','ELLINGWOOD','ELLINGWOOD POINT','14,042','SANGRE'],
  ['lindsey','LINDSEY','MOUNT LINDSEY','14,042','SANGRE'],
  ['littlebear','LITTLE BEAR','LITTLE BEAR PEAK','14,037','SANGRE'],
  ['uncompahgre','UNCOMPAHGRE','UNCOMPAHGRE PEAK','14,309','SANJUAN'],
  ['mtwilson','MOUNT WILSON','MOUNT WILSON','14,246','SANJUAN'],
  ['eldiente','EL DIENTE','EL DIENTE PEAK','14,159','SANJUAN'],
  ['sneffels','SNEFFELS','MOUNT SNEFFELS','14,150','SANJUAN'],
  ['eolus','EOLUS','MOUNT EOLUS','14,083','SANJUAN'],
  ['windom','WINDOM','WINDOM PEAK','14,082','SANJUAN'],
  ['sunlight','SUNLIGHT','SUNLIGHT PEAK','14,059','SANJUAN'],
  ['handies','HANDIES','HANDIES PEAK','14,048','SANJUAN'],
  ['northeolus','NORTH EOLUS','NORTH EOLUS','14,039','SANJUAN'],
  ['redcloud','REDCLOUD','REDCLOUD PEAK','14,034','SANJUAN'],
  ['wilsonpk','WILSON PEAK','WILSON PEAK','14,017','SANJUAN'],
  ['wetterhorn','WETTERHORN','WETTERHORN PEAK','14,015','SANJUAN'],
  ['sanluis','SAN LUIS','SAN LUIS PEAK','14,014','SANJUAN'],
  ['sunshine','SUNSHINE','SUNSHINE PEAK','14,001','SANJUAN'],
  ['stewart','STEWART','STEWART PEAK','14,016','SANJUAN'],
  ['castle','CASTLE','CASTLE PEAK','14,265','ELK'],
  ['maroon','MAROON','MAROON PEAK','14,163','ELK'],
  ['capitol','CAPITOL','CAPITOL PEAK','14,130','ELK'],
  ['snowmass','SNOWMASS','SNOWMASS MOUNTAIN','14,092','ELK'],
  ['conundrum','CONUNDRUM','CONUNDRUM PEAK','14,060','ELK'],
  ['pyramid','PYRAMID','PYRAMID PEAK','14,018','ELK'],
  ['northmaroon','NORTH MAROON','NORTH MAROON PEAK','14,014','ELK'],
  ['lincoln','LINCOLN','MOUNT LINCOLN','14,286','MOSQUITO'],
  ['cameron','CAMERON','MOUNT CAMERON','14,238','MOSQUITO'],
  ['bross','BROSS','MOUNT BROSS','14,172','MOSQUITO'],
  ['democrat','DEMOCRAT','MOUNT DEMOCRAT','14,148','MOSQUITO'],
  ['sherman','SHERMAN','MOUNT SHERMAN','14,036','MOSQUITO'],
  ['grays','GRAYS','GRAYS PEAK','14,270','FRONT'],
  ['torreys','TORREYS','TORREYS PEAK','14,267','FRONT'],
  ['evans','BLUE SKY','MOUNT BLUE SKY','14,264','FRONT'],
  ['longs','LONGS','LONGS PEAK','14,255','FRONT'],
  ['pikes','PIKES','PIKES PEAK','14,115','FRONT'],
  ['bierstadt','BIERSTADT','MOUNT BIERSTADT','14,060','FRONT'],
  ['quandary','QUANDARY','QUANDARY PEAK','14,265','TENMILE'],
];

function _hash(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=(h<<13)|(h>>>19);}return h>>>0;}
function _rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function genRidge(r,kind,summitY,jag){const baseY=364;const lx=116+Math.round(r()*8),rx=496+Math.round(r()*8);const sf=0.45+r()*0.12;const sx=Math.round(lx+sf*(rx-lx));const rise=baseY-summitY;const broad=kind==='broad';const exL=broad?1.3:(kind==='pyramid'?1.0:0.82);const exR=broad?1.3:(kind==='pyramid'?1.0:0.9);const nL=3+(broad?1:0)+(r()<0.5?1:0);const nR=3+(broad?1:0)+(r()<0.5?1:0);const jit=()=>(r()-0.5)*rise*0.09*jag*2;const pts=[[lx,baseY]];for(let i=1;i<nL;i++){const t=i/nL;let y=baseY-rise*Math.pow(t,exL)+jit();pts.push([Math.round(lx+(sx-lx)*t),Math.round(Math.min(baseY-4,Math.max(summitY+4,y)))]);}pts.push([sx,summitY]);let curX=sx,curY=summitY;if(kind==='twin'){const gap=24+Math.round(r()*18);const dropC=10+Math.round(r()*8);pts.push([sx+Math.round(gap*0.5),summitY+dropC+8]);curY=summitY+6+Math.round(r()*8);curX=sx+gap;pts.push([curX,curY]);}for(let i=1;i<=nR;i++){const t=i/nR;let y=baseY-(baseY-curY)*(1-Math.pow(t,exR))+jit();y=Math.max(summitY+3,y);if(i===nR)y=baseY;pts.push([Math.round(curX+(rx-curX)*t),Math.round(Math.min(baseY,y))]);}pts[pts.length-1]=[rx,baseY];if(kind==='serrate'){for(let i=1;i<pts.length-1;i++){if(r()<0.5)pts[i][1]=Math.max(summitY,pts[i][1]-Math.round(r()*14));}}return pts;}
function genScene(r){const sunLeft=r()<0.5;const sun=sunLeft?[178+Math.round(r()*34),150+Math.round(r()*22),72+Math.round(r()*14)]:[404+Math.round(r()*24),150+Math.round(r()*18),76+Math.round(r()*10)];const bx=sunLeft?418+Math.round(r()*22):158+Math.round(r()*22);const birds=r()<0.65?[[bx,138+Math.round(r()*22),0.85+r()*0.12]]:[[bx-6,150+Math.round(r()*8),0.6],[bx+26,126+Math.round(r()*8),0.9]];const sky=['A','B','C'][Math.floor(r()*3)];const trees=['full','clusters','full','sparseL','sparseR'][Math.floor(r()*5)];const snow=r()<0.16?'angel':null;return{sun,birds,sky,trees,feature:null,snow};}
const RANGE_STYLE={SANGRE:{kinds:['serrate','horn','pyramid'],sy:[110,122],jag:1.0},SANJUAN:{kinds:['horn','serrate','broad'],sy:[114,128],jag:0.85},ELK:{kinds:['pyramid','twin','horn'],sy:[112,126],jag:0.7},MOSQUITO:{kinds:['broad','pyramid','broad'],sy:[122,134],jag:0.4},FRONT:{kinds:['broad','twin','pyramid'],sy:[116,130],jag:0.55},TENMILE:{kinds:['broad','pyramid'],sy:[118,130],jag:0.5}};
const KIND_OVERRIDE={crestoneneedle:'twin',crestonepk:'serrate',kitcarson:'twin',littlebear:'horn',maroon:'twin',northmaroon:'twin',pyramid:'pyramid',capitol:'horn',wetterhorn:'horn',sneffels:'horn',eldiente:'serrate',wilsonpk:'horn',uncompahgre:'broad',longs:'broad',pikes:'broad',grays:'twin',torreys:'twin',quandary:'broad'};
for(const[id,name,full,elev,range]of STUBS){const r=_rng(_hash(id));const st=RANGE_STYLE[range];const kind=KIND_OVERRIDE[id]||st.kinds[Math.floor(r()*st.kinds.length)];const summitY=Math.round(st.sy[0]+r()*(st.sy[1]-st.sy[0]));const ridge=genRidge(r,kind,summitY,st.jag);const scene=genScene(r);PEAKS.push({id,name,full,elev,range,palette:range,ridge,scene});}

// Lookup by normalized full name (case-insensitive), with explicit overrides for edge cases
const OVERRIDES = {
  'mount evans': 'evans', 'mount of the holy cross': 'holycross',
  'north eolus': 'northeolus', 'wilson peak': 'wilsonpk',
  'crestone needle': 'crestoneneedle', 'crestone peak': 'crestonepk',
  'kit carson peak': 'kitcarson', 'challenger point': 'challenger',
  'ellingwood point': 'ellingwood', 'little bear peak': 'littlebear',
  'mount wilson': 'mtwilson', 'el diente peak': 'eldiente',
  'north maroon peak': 'northmaroon',
};
const PEAKS_BY_ID = Object.fromEntries(PEAKS.map(p => [p.id, p]));

function findPeak(mountainName) {
  const lower = mountainName.toLowerCase();
  const id = OVERRIDES[lower];
  if (id) return PEAKS_BY_ID[id];
  const n = lower.replace(/\bmt\.?\b/g, 'mount').replace(/\bmtn\.?\b/g, 'mountain').trim();
  return PEAKS.find(p => p.full.toLowerCase() === n);
}

module.exports = { PEAKS, PALETTES, findPeak };
