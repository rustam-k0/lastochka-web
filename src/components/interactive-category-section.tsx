'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Category, Product, categoryMedia, list, product } from '@/lib/types';
import { request } from '@/lib/client';
import { ProductCarousel, SkeletonCards } from '@/components/products';

export function InteractiveCategorySection({
  store,
  category,
  subcategories,
  groupBg,
}: {
  store: number;
  category: Category;
  subcategories: Category[];
  groupBg: string;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [productsMap, setProductsMap] = useState<Record<number, Product[]>>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleTileClick = async (sub: Category) => {
    if (selectedId === sub.id) {
      setSelectedId(null);
      return;
    }

    setSelectedId(sub.id);

    if (!productsMap[sub.id]) {
      setLoadingId(sub.id);
      try {
        const raw = await request<any>(`stores/${store}/categories/${sub.id}/products?perPage=12`);
        const items = list(raw).map(product);
        setProductsMap((prev) => ({ ...prev, [sub.id]: items }));
      } catch {
        setProductsMap((prev) => ({ ...prev, [sub.id]: [] }));
      } finally {
        setLoadingId(null);
      }
    }
  };

  const activeSub = subcategories.find((s) => s.id === selectedId);
  const activeProducts = selectedId ? productsMap[selectedId] || [] : [];
  const isLoading = selectedId !== null && loadingId === selectedId;

  return (
    <section className="catalog-category-section" id={`cat-${category.slug}`}>
      <div className="section-heading">
        <h2>{category.name}</h2>
        <Link href={`/category/${category.slug}`} className="see-all-link">
          Смотреть всё <ArrowRight size={16} />
        </Link>
      </div>

      <div className="category-tiles">
        {subcategories.map((c) => {
          const media = categoryMedia(c);
          const imageSrc = media.foreground || media.background;
          const isSelected = selectedId === c.id;

          return (
            <button
              key={c.id}
              type="button"
              className={`category-tile ${isSelected ? 'active-tile' : ''}`}
              style={{ backgroundColor: groupBg }}
              onClick={() => handleTileClick(c)}
              aria-expanded={isSelected}
              aria-label={c.name}
            >
              <strong className="category-tile-title">{c.name}</strong>
              {imageSrc && (
                <div className="category-tile-image-wrapper">
                  <img
                    src={imageSrc}
                    alt=""
                    className="category-tile-image"
                    loading="lazy"
                    width={110}
                    height={110}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedId !== null && activeSub && (
        <div className="sub-carousel-drawer" key={selectedId}>
          <div className="sub-carousel-header">
            <div className="sub-carousel-title-row">
              <span className="sub-carousel-bullet" style={{ backgroundColor: 'var(--brand)' }} />
              <h3>{activeSub.name}</h3>
              {activeProducts.length > 0 && (
                <span className="sub-carousel-badge">{activeProducts.length} поз.</span>
              )}
            </div>
            <Link href={`/category/${activeSub.slug}`} className="sub-carousel-view-all">
              Все товары раздела «{activeSub.name}» <ArrowRight size={14} />
            </Link>
          </div>

          {isLoading ? (
            <div className="sub-carousel-loading">
              <SkeletonCards count={4} />
            </div>
          ) : activeProducts.length > 0 ? (
            <div className="catalog-section-products">
              <ProductCarousel products={activeProducts} />
            </div>
          ) : (
            <p className="sub-carousel-empty">В этом разделе пока нет доступных товаров</p>
          )}
        </div>
      )}
    </section>
  );
}
