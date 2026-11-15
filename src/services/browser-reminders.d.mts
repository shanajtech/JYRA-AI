export function createBrowserReminders(storage:Pick<Storage,'getItem'|'setItem'>,options?:{clock?:()=>number;timeZone?:string}):{request:(path:string,method?:string,body?:unknown)=>unknown};
