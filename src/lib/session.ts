import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { cookies } from 'next/headers';
let database:DatabaseSync;
export const cookieName='lastochka_session';
export const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*24*14};
function db(){if(!database){const path=resolve(process.env.SESSION_DB_PATH||'.data/sessions.sqlite');mkdirSync(dirname(path),{recursive:true,mode:0o700});database=new DatabaseSync(path);database.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, csrf TEXT NOT NULL, token TEXT, expires INTEGER NOT NULL, store INTEGER); CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL);');}return database;}
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
function key(){const value=process.env.SESSION_ENCRYPTION_KEY;if(!value||!/^[a-f0-9]{64}$/i.test(value))throw new Error('Session encryption is not configured');return Buffer.from(value,'hex');}
function encrypt(v:string){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv);const encrypted=Buffer.concat([c.update(v),c.final()]);return Buffer.concat([iv,encrypted,c.getAuthTag()]).toString('base64');}
function decrypt(v:string){const b=Buffer.from(v,'base64'),d=createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));d.setAuthTag(b.subarray(-16));return Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString();}
export type Session={id:string;csrf:string;token:string|null;expires:number;store:number|null};
export async function session():Promise<Session|null>{const id=(await cookies()).get(cookieName)?.value;if(!id)return null;const s=db().prepare('SELECT * FROM sessions WHERE id=? AND expires>?').get(hash(id),Date.now()) as Session|undefined;return s?{...s,token:s.token?decrypt(s.token):null}:null;}
export function createSession(token?:string,store?:number|null){const id=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');db().prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db().prepare('INSERT INTO sessions VALUES (?,?,?,?,?)').run(hash(id),csrf,token?encrypt(token):null,Date.now()+cookieOptions.maxAge*1000,store||null);return {id,csrf};}
export function removeSession(s:Session){db().prepare('DELETE FROM sessions WHERE id=?').run(s.id);}
export function setStore(s:Session,id:number){db().prepare('UPDATE sessions SET store=? WHERE id=?').run(id,s.id);}
export function rateLimit(id:string,max=10,window=600000){const k=hash(id),now=Date.now();db().prepare('DELETE FROM limits WHERE until<?').run(now);db().prepare('INSERT INTO limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(k,now+window);const r=db().prepare('SELECT count FROM limits WHERE key=?').get(k) as {count:number};return r.count<=max;}
