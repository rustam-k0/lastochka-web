'use client';

import { useEffect, useId, useRef, useState, ReactNode } from 'react';
import Image from 'next/image';
import { X, ImageIcon, LoaderCircle } from 'lucide-react';

export interface PhotoProps {
  src?: string | null;
  sources?: string[];
  alt?: string;
  className?: string;
  eager?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  fill?: boolean;
}

export function Photo({
  src,
  sources,
  alt = '',
  className = '',
  eager = false,
  width,
  height,
  sizes,
  fill,
}: PhotoProps) {
  const candidates = [src, ...(sources || [])].filter(
    (value, index, all): value is string => !!value && all.indexOf(value) === index,
  );
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setHasError(false);
  }, [src, sources?.join('|')]);

  const current = candidates[candidateIndex];

  if (!current || hasError) {
    return (
      <div className={`photo-placeholder ${className}`} role="img" aria-label={alt || 'Фото пока нет'}>
        <ImageIcon size={30} strokeWidth={1.5} />
        <span>Фото скоро</span>
      </div>
    );
  }

  const handleError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setHasError(true);
    }
  };

  // If explicit width & height are omitted and fill isn't specified,
  // we provide safe default dimensions with CSS overriding for responsive fluid layout.
  const isFill = fill ?? false;

  return (
    <Image
      src={current}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      priority={eager}
      sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
      fill={isFill}
      width={!isFill ? width || 500 : undefined}
      height={!isFill ? height || 500 : undefined}
      onError={handleError}
    />
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    el?.showModal();
    requestAnimationFrame(() => el?.querySelector<HTMLElement>('[data-modal-close]')?.focus());
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = oldOverflow;
      el?.close();
      previousActiveElement?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          <button data-modal-close className="icon-button" aria-label="Закрыть" onClick={onClose} type="button">
            <X />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <img src="/images/swallow.webp" alt="" width={72} height={72} />
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function ErrorMessage({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error" role="alert">
      <p>{message}</p>
      {retry && (
        <button onClick={retry} type="button">
          Попробовать ещё раз
        </button>
      )}
    </div>
  );
}

export function Busy() {
  return (
    <span className="busy">
      <LoaderCircle className="spin" size={18} /> Загружаем…
    </span>
  );
}
