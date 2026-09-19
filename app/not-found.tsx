import Link from 'next/link';
export default function NotFound(){return <div className="empty"><h1>Страница не найдена</h1><p>Возможно, товар или подборка больше не доступны.</p><Link className="primary" href="/catalog">В каталог</Link></div>;}
