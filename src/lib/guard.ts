import { Session } from './session';

export function validMutation(req: Request, currentSession: Session | null): boolean {
  const origin = process.env.PUBLIC_ORIGIN || new URL(req.url).origin;
  return (
    !!currentSession &&
    req.headers.get('origin') === origin &&
    req.headers.get('x-csrf-token') === currentSession.csrf &&
    req.headers.get('sec-fetch-site') !== 'cross-site'
  );
}
