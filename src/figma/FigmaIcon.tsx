import {figmaAssets} from './assets';
import {foundationIcons} from './foundations';
export default function FigmaIcon({name,screen='4:10'}:{name:string;screen?:string}){
 const key='img'+name[0].toUpperCase()+name.slice(1)+'Glyph';
 const src=screen==='foundations'?foundationIcons[name]:figmaAssets[screen]?.[key]||figmaAssets['4:11']?.[key]||figmaAssets['4:16']?.[key];
 return src?<span className="fg-icon" aria-hidden="true"><img src={src} alt=""/></span>:null;
}
