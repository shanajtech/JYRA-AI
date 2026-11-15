export const foundationColors={canvas:'#080d18',surface:'#101827',raised:'#172235',border:'#26344a',ink:'#f1f5fa',muted:'#a9b7ca',subtle:'#7f93ae',cyan:'#65e2ea',purple:'#ae9bf4',success:'#8ce2b3',warning:'#f3c889',danger:'#f4a3aa'} as const;
export const foundationIconNames=['home','chat','bolt','family','bell','eye','phone','memory','settings','shield','mic','arrow','check','plus','camera','lock','file','close','pause','search','menu','globe'] as const;
export const foundationIcons:Record<string,string>=Object.fromEntries(foundationIconNames.map(name=>[name,`/figma/foundations/${name}.svg`]));
export const foundationPortrait='/figma/foundations/portrait.png';
