import { Session } from './session';
export function validMutation(req:Request,s:Session|null){const origin=process.env.PUBLIC_ORIGIN||new URL(req.url).origin;return !!s && req.headers.get('origin')===origin && req.headers.get('x-csrf-token')===s.csrf && req.headers.get('sec-fetch-site')!=='cross-site';}
