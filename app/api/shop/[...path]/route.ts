import {NextResponse} from 'next/server';
import routes from '@/config/routes.json';
import {session,createSession,removeSession,cookieName,cookieOptions,rateLimit} from '@/lib/session';
import {validMutation} from '@/lib/guard';
import {upstream,ApiError} from '@/lib/upstream';
const headers={'Cache-Control':'no-store, private'};
async function handle(req:Request,ctx:{params:Promise<{path:string[]}>}){
 const segments=(await ctx.params).path;if(segments.some(x=>!/^[\p{L}\p{N}_-]+$/u.test(x)))return NextResponse.json({message:'Некорректный путь'},{status:400});
 const path=segments.join('/'),method=req.method;
 const route=routes.find(r=>r.method===method&&new RegExp('^'+r.path.replace(/\{[^}]+\}/g,'[^/]+')+'$').test(path));
 if(!route||path.startsWith('fcm-tokens')||path==='analytics/events'||path==='client-ip')return NextResponse.json({message:'Недоступно в веб-версии'},{status:404});
 const s=await session();if(method!=='GET'&&!validMutation(req,s))return NextResponse.json({message:'Сессия страницы истекла. Обновите страницу.'},{status:403});
 if(!route.public&&!s?.token)return NextResponse.json({message:'Войдите по номеру телефона'},{status:401});
 try{
 let body:any;if(!['GET','DELETE'].includes(method)||req.headers.get('content-length')){const text=await req.text();if(text.length>32000)return NextResponse.json({message:'Слишком большой запрос'},{status:413});body=text?JSON.parse(text):undefined;}
 if(path.startsWith('auth/phone-')&&(!rateLimit('otp-session:'+s!.id,15)||!rateLimit('otp-phone:'+String(body?.phone),10)))return NextResponse.json({message:'Слишком много попыток. Попробуйте через 10 минут.'},{status:429});
 if(path==='orders'&&method==='POST'&&process.env.CHECKOUT_ENABLED!=='true')return NextResponse.json({message:'Онлайн-оформление временно недоступно. Корзина сохранена.'},{status:503});
 if(body?.returnUrl){const u=new URL(body.returnUrl,process.env.PUBLIC_ORIGIN);if(u.origin!==process.env.PUBLIC_ORIGIN)return NextResponse.json({message:'Недопустимый адрес возврата'},{status:422});body.returnUrl=u.toString();}
 const query=new URL(req.url).search;
 const data=await upstream(path+query,{method,body,token:s?.token});
 if(path==='auth/phone-confirm'&&data?.token){const fresh=createSession(data.token,s?.store);if(s)removeSession(s);const r=NextResponse.json({user:data.user,csrf:fresh.csrf},{headers});r.cookies.set(cookieName,fresh.id,cookieOptions);return r;}
 if(path==='auth/logout'||path==='auth/account'){if(s)removeSession(s);const r=NextResponse.json({ok:true},{headers});r.cookies.set(cookieName,'',{...cookieOptions,maxAge:0});return r;}
 return NextResponse.json(data??{ok:true},{headers});
 }catch(e){if(path==='auth/logout'&&s){removeSession(s);const r=NextResponse.json({ok:true,message:'Вы вышли на этом устройстве.'},{headers});r.cookies.set(cookieName,'',{...cookieOptions,maxAge:0});return r;}return NextResponse.json(e instanceof ApiError?e.payload:{message:'Не удалось связаться с магазином. Попробуйте ещё раз.'},{status:e instanceof ApiError?e.status:502,headers});}
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE};
