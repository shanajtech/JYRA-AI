export const developer={name:'Shanaj Akter',role:'Developer & Designer',project:'JYRA',github:'https://github.com/shanajtech',repository:'https://github.com/shanajtech/JYRA-AI'};
export function developerAnswer(text,language='Auto'){
 const target=/\b(your|you|tomar|tumar|tomake|toke|jyra|zyra|jara)\b|তোম|আপনা|জায়রা/i.test(text);
 const role=/develop(?:er|ed)?|design(?:er|ed)?|creat(?:or|ed)|made|built|banai|banay|toiri|নির্মা|ডেভেলপার|ডিজাইনার|তৈরি|বানিয়ে|বানিয়েছে|বানিয়েছে/i.test(text);
 if(!target||!role)return null;
 if(language==='বাংলা'||/[\u0980-\u09ff]/.test(text))return 'আমি JYRA, একটি নতুন AI assistant। আমার developer ও designer হলেন Shanaj Akter। তিনি JYRA অ্যাপটি তৈরি ও ডিজাইন করছেন।';
 if(language!=='English'&&/\b(tomar|tumar|tomake|toke|banai|banay|toiri)\b/i.test(text))return 'Ami JYRA, ekti notun AI assistant. Amar developer o designer Shanaj Akter. Tini JYRA app-ti toiri o design korchen.';
 return 'I am JYRA, a new AI assistant. My developer and designer is Shanaj Akter, who is creating and designing the JYRA application.';
}
