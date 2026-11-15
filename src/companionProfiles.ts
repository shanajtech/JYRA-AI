export type CompanionId = 'female' | 'male' | 'child';
import {portrait} from './figma/assets';
export const companionProfiles: Record<CompanionId, {
  label: string; name: string; image: string; expression: string;
}> = {
  female: { label: 'JYRA', name: 'JYRA', image: portrait, expression: portrait },
  male: { label: 'JYRA', name: 'JYRA', image: portrait, expression: portrait },
  child: { label: 'JYRA', name: 'JYRA', image: portrait, expression: portrait },
};
// Legacy ids stay readable so existing local accounts do not lose their data.
export const companionOrder: CompanionId[] = ['female'];
export function savedCompanion(): CompanionId {
  try {
    const id = localStorage.getItem('zyra.companion');
    void id;return 'female';
  } catch { return 'female'; }
}

