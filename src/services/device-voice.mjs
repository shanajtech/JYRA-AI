// Use only an explicitly identified local female voice. Never send reply text
// to an additional speech provider or silently read Bengali with English TTS.
export function selectDeviceVoice(voices,text){
 const language=/[\u0980-\u09ff]/.test(text)?'bn':/[\u0900-\u097f\u0600-\u06ff\u4e00-\u9fff\u0400-\u04ff]/.test(text)?null:'en';
 if(!language)return null;
 return voices.find(v=>v.localService===true&&v.lang.toLowerCase().split(/[-_]/)[0]===language&&/zira|hazel|susan|heera|samantha|karen|moira|tessa|victoria|salma|tanishaa|female|aria|natasha|sonia/i.test(v.name))||null;
}
export function spokenText(text){return text.replace(/\b(?:JYRA|ZYRA)\b/gi,/[\u0980-\u09ff]/.test(text)?'জায়রা':'Jaira').slice(0,2000);}
