export type FaceCandidate={name:string;score:number};
// Similarity scores are heuristic, not calibrated identity probabilities.
export function confidentMatch(candidates:FaceCandidate[],threshold=.72,margin=.08){
 const bestByName=new Map<string,number>();for(const c of candidates)bestByName.set(c.name,Math.max(bestByName.get(c.name)||0,c.score));
 const sorted=[...bestByName].map(([name,score])=>({name,score})).sort((a,b)=>b.score-a.score);
 return sorted[0]&&sorted[0].score>=threshold&&(!sorted[1]||sorted[0].score-sorted[1].score>=margin)?sorted[0]:null;
}
