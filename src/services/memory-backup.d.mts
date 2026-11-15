import type {Note} from '../workspace/store';
export function parseMemoryBackup(text:string):Pick<Note,'title'|'body'>[];
export function mergeMemories(existing:Note[],incoming:Pick<Note,'title'|'body'>[],makeId:()=>string):Note[];
