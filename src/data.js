export const HEROES = [
  {id:'pengu',name:'PENGU',role:'Frost Ranger',color:0x63d8ff,range:230,damage:18,rate:620,speed:90,projectile:'ice'},
  {id:'utya',name:'UTYA',role:'Wing Scout',color:0xffcf54,range:220,damage:15,rate:430,speed:120,projectile:'feather'},
  {id:'teddy',name:'TEDDY',role:'Bruiser Tank',color:0xff75b5,range:65,damage:34,rate:900,speed:88,projectile:'melee'},
  {id:'yoda',name:'YODA',role:'Arcane Sage',color:0x78f0bd,range:245,damage:22,rate:760,speed:82,projectile:'arcane'},
  {id:'egor',name:'Egor',role:'Crystal Engineer',color:0x69e0ff,range:215,damage:19,rate:650,speed:80,projectile:'crystal'},
  {id:'telegramdog',name:'telegram.dog',role:'Courier Scout',color:0xf0c36f,range:210,damage:14,rate:380,speed:115,projectile:'signal'},
  {id:'virus',name:'virus',role:'Toxic Caster',color:0x72ff72,range:205,damage:12,rate:560,speed:76,projectile:'poison',poison:5},
  {id:'babyshark',name:'Baby Shark',role:'Tidal Disruptor',color:0x79e9ff,range:195,damage:16,rate:540,speed:112,projectile:'water',push:18},
  {id:'yaya',name:'yaya',role:'Festival Spirit',color:0xffbd55,range:210,damage:17,rate:690,speed:92,projectile:'flame'},
  {id:'gramcat',name:'Gramcat',role:'Sky Archer',color:0xbdd7ff,range:270,damage:25,rate:820,speed:100,projectile:'arrow',crit:0.18},
  {id:'memegram',name:'Memegram',role:'Star Caster',color:0xa9baff,range:225,damage:20,rate:710,speed:85,projectile:'star'},
  {id:'noctis',name:'NOCTIS VEYL',role:'Shadow Assassin',color:0xa681ff,range:235,damage:30,rate:940,speed:128,projectile:'shadow',crit:0.22}
];

export const TOWERS = [
  {id:'ranger',name:'Ranger',icon:'🏹',cost:90,color:0x64d8ff,range:220,damage:19,rate:620},
  {id:'arcane',name:'Arcane',icon:'🔮',cost:115,color:0xce82ff,range:205,damage:33,rate:980},
  {id:'bombard',name:'Bombard',icon:'💣',cost:135,color:0xff946f,range:190,damage:30,rate:1250,splash:62},
  {id:'guardian',name:'Guardian',icon:'🛡',cost:110,color:0x8ce9cb,range:145,damage:16,rate:860,slow:0.22},
  {id:'frost',name:'Frost',icon:'❄',cost:125,color:0xa7ebff,range:205,damage:13,rate:880,slow:0.34},
  {id:'tesla',name:'Tesla',icon:'⚡',cost:145,color:0xa8b4ff,range:195,damage:22,rate:1010,chain:2},
  {id:'venom',name:'Venom',icon:'☣',cost:140,color:0x70ef78,range:200,damage:15,rate:820,poison:5},
  {id:'beacon',name:'Beacon',icon:'📡',cost:130,color:0xffdb75,range:180,damage:0,rate:999999,support:true}
];

export const MODS = [
  {id:'rapid',name:'Rapid Core',icon:'⚙',color:0xffc86f,rateMul:0.76},
  {id:'scope',name:'Crit Scope',icon:'◎',color:0x85d2ff,range:35,crit:0.18},
  {id:'venom',name:'Venom Tip',icon:'☣',color:0x79ff80,poison:5},
  {id:'cryo',name:'Cryo Core',icon:'❄',color:0x91e9ff,slow:0.22},
  {id:'blast',name:'Blast Shell',icon:'✹',color:0xff996f,splash:36,damage:7},
  {id:'chain',name:'Chain Coil',icon:'⌁',color:0xb1aaff,chain:1,damage:4}
];

export const POWERS = [
  {id:'bombard',name:'Bombard',icon:'☄',cost:35,cooldown:28000,targeted:true},
  {id:'laser',name:'Laser',icon:'┃',cost:55,cooldown:42000,targeted:true},
  {id:'gravity',name:'Gravity',icon:'◉',cost:42,cooldown:35000,targeted:true},
  {id:'reinforce',name:'Reinforce',icon:'✚',cost:30,cooldown:32000,targeted:true},
  {id:'overdrive',name:'Overdrive',icon:'»',cost:45,cooldown:45000,targeted:false}
];

export const COINS = {
  btc:{symbol:'₿',name:'Bitcoin',color:0xf7931a,role:'Tank',hp:260,speed:42,reward:26,armor:0.28},
  eth:{symbol:'Ξ',name:'Ethereum',color:0x7c8cff,role:'Shield',hp:145,speed:62,reward:22,shield:85},
  sol:{symbol:'S',name:'Solana',color:0x7c4dff,role:'Runner',hp:78,speed:118,reward:16,dash:true},
  bnb:{symbol:'◆',name:'BNB',color:0xf3ba2f,role:'Bruiser',hp:170,speed:70,reward:22},
  xrp:{symbol:'X',name:'XRP',color:0xe8eef7,role:'Swarm',hp:68,speed:102,reward:14},
  doge:{symbol:'Ð',name:'Dogecoin',color:0xc9a633,role:'Chaos',hp:96,speed:86,reward:16,split:true},
  usdt:{symbol:'₮',name:'USDT',color:0x26a17b,role:'Healer',hp:110,speed:58,reward:20,heal:true},
  ada:{symbol:'A',name:'Cardano',color:0x2a74d9,role:'Caster',hp:105,speed:72,reward:18},
  avax:{symbol:'A',name:'Avalanche',color:0xe84142,role:'Impact',hp:135,speed:68,reward:20},
  trx:{symbol:'T',name:'TRON',color:0xef4444,role:'Raider',hp:86,speed:108,reward:16}
};

export const WAVES = [
  ['xrp','sol','xrp','bnb','eth','sol'],
  ['sol','doge','xrp','eth','bnb','usdt','sol'],
  ['btc','xrp','sol','ada','bnb','eth','doge','usdt'],
  ['btc','eth','sol','sol','bnb','avax','trx','usdt','doge'],
  ['btc','btc','eth','sol','avax','bnb','doge','usdt','trx','sol']
];