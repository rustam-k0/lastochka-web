'use client';
export default function Error({reset}:{reset:()=>void}){return <div className="empty"><h1>Не удалось загрузить магазин</h1><p>Проверьте соединение и попробуйте ещё раз.</p><button className="primary" onClick={reset}>Повторить</button></div>;}
