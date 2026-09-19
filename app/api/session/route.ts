import { NextResponse } from 'next/server';
import { session,createSession,cookieName,cookieOptions } from '@/lib/session';
export const dynamic='force-dynamic';
export async function GET(){const s=await session();const fresh=s?null:createSession();const r=NextResponse.json({authenticated:!!s?.token,csrf:s?.csrf||fresh?.csrf,storeId:s?.store||Number(process.env.DEFAULT_STORE_ID)||2,checkoutEnabled:process.env.CHECKOUT_ENABLED==='true'},{headers:{'Cache-Control':'no-store, private'}});if(fresh)r.cookies.set(cookieName,fresh.id,cookieOptions);return r;}
