import type {PlanValues} from './PlanDialog';
let created:PlanValues|null=null;
export function setPreviewFamilyTask(value:PlanValues){created={...value};}
export function previewFamilyTask(){return created;}
