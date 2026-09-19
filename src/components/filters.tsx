'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { SlidersHorizontal, RotateCcw, FolderOpen } from 'lucide-react';
import { Modal } from './ui';

export interface SubcategoryItem {
  id: number;
  name: string;
  slug: string;
}

export interface SubcategoriesNavProps {
  items: SubcategoryItem[];
  activeId?: number | string;
  parentSlug: string;
}

export function Filters({
  filters,
  subcategories,
}: {
  filters?: any;
  subcategories?: SubcategoriesNavProps;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="filters-desktop panel">
        {subcategories && subcategories.items.length > 0 && (
          <div className="sidebar-subcategories">
            <div className="sidebar-subcategories-header">
              <FolderOpen size={16} />
              <h4>Подразделы</h4>
            </div>
            <nav className="sidebar-subcategories-list">
              {subcategories.items.map((sub) => {
                const isActive =
                  String(subcategories.activeId) === String(sub.id) ||
                  subcategories.activeId === sub.slug;
                return (
                  <Link
                    key={sub.id}
                    href={`/category/${subcategories.parentSlug}?sub=${sub.slug || sub.id}`}
                    className={`sidebar-subcategory-link ${isActive ? 'active' : ''}`}
                  >
                    <span>{sub.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
        <FilterForm filters={filters} />
      </aside>

      <button
        className="filter-mobile secondary"
        onClick={() => setOpen(true)}
        type="button"
      >
        <SlidersHorizontal size={18} /> Фильтры и сортировка
      </button>

      {open && (
        <Modal title="Фильтры и сортировка" onClose={() => setOpen(false)}>
          <FilterForm filters={filters} onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

function FilterForm({ filters, onDone }: { filters?: any; onDone?: () => void }) {
  const params = useSearchParams();
  const path = usePathname();
  const router = useRouter();

  const attributes = filters?.attributes || filters?.filters || [];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const p = new URLSearchParams(params.toString());
    p.delete('page');

    for (const key of [...p.keys()]) {
      if (key.startsWith('filter[')) p.delete(key);
    }

    for (const [key, value] of f.entries()) {
      if (value) {
        p.set(key, String(value));
      } else {
        p.delete(key);
      }
    }

    if (!f.has('onlyDiscounted')) p.delete('onlyDiscounted');

    router.push(path + '?' + p.toString());
    onDone?.();
  };

  const handleReset = () => {
    const p = new URLSearchParams();
    if (params.get('query')) {
      p.set('query', params.get('query')!);
    }
    if (params.get('sub')) {
      p.set('sub', params.get('sub')!);
    }
    router.push(path + '?' + p.toString());
    onDone?.();
  };

  return (
    <form className="filter-form stack" key={params.toString()} onSubmit={handleSubmit}>
      <div className="filter-form-heading">
        <h3>Параметры</h3>
        <button type="button" className="text-button reset-filter-btn" onClick={handleReset}>
          <RotateCcw size={14} /> Сбросить
        </button>
      </div>

      <label>
        Сортировка
        <select name="sort" defaultValue={params.get('sort') || 'name'}>
          <option value="name">По названию (А-Я)</option>
          <option value="popular">По популярности</option>
          <option value="price_asc">Сначала дешевле</option>
          <option value="price_desc">Сначала дороже</option>
          <option value="discount">По размеру скидки</option>
          <option value="newest">Сначала новинки</option>
        </select>
      </label>

      <fieldset>
        <legend>Цена, ₽</legend>
        <div className="price-fields">
          <input
            name="priceMin"
            type="number"
            min="0"
            placeholder="От"
            aria-label="Цена от"
            defaultValue={params.get('priceMin') || ''}
          />
          <input
            name="priceMax"
            type="number"
            min="0"
            placeholder="До"
            aria-label="Цена до"
            defaultValue={params.get('priceMax') || ''}
          />
        </div>
      </fieldset>

      <label className="check filter-checkbox-item">
        <input
          type="checkbox"
          name="onlyDiscounted"
          value="1"
          defaultChecked={params.get('onlyDiscounted') === '1'}
        />
        <span>Только со скидкой</span>
      </label>

      {Array.isArray(attributes) &&
        attributes
          .filter((a: any) => a.code && a.values?.length)
          .map((a: any) => (
            <label key={a.code}>
              {a.name || a.title}
              <select
                name={`filter[${a.code}]`}
                defaultValue={params.get(`filter[${a.code}]`) || ''}
              >
                <option value="">Все</option>
                {a.values.map((v: any) => (
                  <option key={v.code || v.id} value={v.code || v.id}>
                    {v.label || v.name || v.title}
                  </option>
                ))}
              </select>
            </label>
          ))}

      <button className="primary filter-submit-btn" type="submit">
        Применить фильтры
      </button>
    </form>
  );
}
