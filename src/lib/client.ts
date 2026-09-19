'use client';
let csrf='';
export async function browserSession(){const r=await fetch('/api/session',{cache:'no-store'});const s=await r.json();csrf=s.csrf;return s;}
export async function request(path:string,method='GET',body?:unknown){if(method!=='GET'&&!csrf)await browserSession();const r=await fetch(path.startsWith('/api/')?path:`/api/shop/${path}`,{method,cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'x-csrf-token':csrf}:{})},body:body?JSON.stringify(body):undefined});const d=await r.json();if(d?.csrf)csrf=d.csrf;if(!r.ok){const fields=d.errors?Object.values(d.errors).flat().join(' '):'';throw Object.assign(new Error([d.message,fields].filter(Boolean).join(' ')||'Не удалось выполнить запрос'),{status:r.status});}return d;}
