import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, MapPin, ChevronRight, LayoutGrid } from 'lucide-react';
import { api, publicApi, selectedStore, ApiError } from '@/lib/upstream';
import {
  list,
  unwrap,
  product,
  Category,
  categoryMedia,
  ProductGroupDto,
  BannerDto,
  StoryDto,
  Product,
} from '@/lib/types';
import { content } from '@/config/content';
import { Photo, Empty } from '@/components/ui';
import { ProductGrid, ProductDetail, ProductCarousel, SkeletonCards } from '@/components/products';
import { Filters } from '@/components/filters';
import { LoyaltyCard } from './account/bonuses/loyalty-card';
import { Reviews } from './account/reviews/reviews-view';
import { InteractiveCategorySection } from '@/components/interactive-category-section';
import { CategoryFallback } from '@/components/category-fallback';

export function getCategoryGroupColor(category: Category | string): string {
  const slug = typeof category === 'string' ? category : (category.slug || '').toLowerCase();
  const name = typeof category === 'string' ? category : (category.name || '').toLowerCase();

  if (slug.includes('gotov') || name.includes('готов')) return '#fbf6ec';
  if (slug.includes('xleb') || slug.includes('buloc') || name.includes('хлеб') || name.includes('выпеч') || name.includes('булоч')) return '#fbf6ec';
  if (slug.includes('ovosh') || slug.includes('frukt') || name.includes('овощ') || name.includes('фрукт')) return '#eaf2eb';
  if (slug.includes('mias') || slug.includes('ptic') || slug.includes('kolbas') || name.includes('мясо') || name.includes('птиц') || name.includes('колбас')) return '#fdede7';
  if (slug.includes('ryb') || slug.includes('moreprodukt') || name.includes('рыб') || name.includes('морепродукт')) return '#edf4f8';
  if (slug.includes('moloc') || name.includes('молоч') || name.includes('сыр')) return '#f5f6f0';
  if (slug.includes('sladk') || slug.includes('tort') || name.includes('сладк') || name.includes('торт')) return '#fbf0f4';
  if (slug.includes('zamoroz') || name.includes('замороз') || name.includes('морожен')) return '#ebf5f9';
  if (slug.includes('voda') || slug.includes('napitk') || name.includes('вод') || name.includes('напитк')) return '#eaf4f8';
  if (slug.includes('bakale') || name.includes('бакале')) return '#f8f4ea';
  if (slug.includes('cai') || slug.includes('kofe') || name.includes('чай') || name.includes('кофе')) return '#f5eeeb';
  if (slug.includes('cips') || slug.includes('snek') || name.includes('чипс') || name.includes('снек')) return '#faf2e8';

  return '#fbf6ec';
}

export function SectionHeading({
  title,
  href,
  subtitle,
}: {
  title: string;
  href?: string;
  subtitle?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        {subtitle && <p className="eyebrow">{subtitle}</p>}
        <h2>{title}</h2>
      </div>
      {href && (
        <Link href={href}>
          Смотреть всё <ArrowRight size={18} />
        </Link>
      )}
    </div>
  );
}

export async function Home() {
  const id = await selectedStore();
  const [groups, categories, banners, stories] = await Promise.all([
    publicApi(`stores/${id}/product-groups`).then(list<ProductGroupDto>).catch(() => []),
    publicApi(`stores/${id}/categories`).then(list<Category>).catch(() => []),
    publicApi(`stores/${id}/banners`).then(list<BannerDto>).catch(() => []),
    publicApi('stories').then(list<StoryDto>).catch(() => []),
  ]);

  const recommended = groups.filter((g) => g.is_recommended);
  const featured =
    groups.find((g) => g.slug === 'firmennye-bliuda') ||
    groups.find((g) => !g.is_recommended && (g.productsCount || 0) > 0);

  const [featuredProducts, showcaseChildren] = await Promise.all([
    featured
      ? publicApi(`product-groups/${featured.id}/products?storeId=${id}&perPage=8`)
          .then(list)
          .then((l) => l.map(product))
          .catch(() => [] as Product[])
      : Promise.resolve([] as Product[]),
    // Fetch children of top parent categories to ensure every showcase tile has a quality image
    Promise.all(
      categories.slice(0, 4).map((c) =>
        publicApi(`stores/${id}/categories/${c.id}/children`)
          .then(list<Category>)
          .catch(() => [] as Category[]),
      ),
    ),
  ]);

  // Extract showcase tiles with real images
  const showcaseSubcategories: Category[] = [];
  showcaseChildren.forEach((children) => {
    showcaseSubcategories.push(...children.slice(0, 2));
  });
  const showcase =
    showcaseSubcategories.length >= 3 ? showcaseSubcategories.slice(0, 6) : categories.slice(0, 6);

  return (
    <>
      <section className="welcome">
        <div className="welcome-text">
          <p className="eyebrow">{content.brand}</p>
          <h1>{content.tagline}</h1>
          <p>
            Продукты для любимых блюд.
            <br className="mobile-break" /> И маленьких повседневных радостей.
          </p>
          <Link href="/addresses" className="address-cta">
            <MapPin size={18} /> Указать адрес доставки <ChevronRight size={16} />
          </Link>
        </div>
        <LoyaltyCard compact />
      </section>

      {stories.length > 0 && (
        <div className="stories">
          {stories.map((st) => (
            <Link href={'/stories/' + st.id} key={st.id}>
              <Photo src={st.image?.path || st.preview?.path} alt={st.title} />
              <span>{st.title}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Featured promo collections on Home */}
      {recommended.length > 0 && (
        <section>
          <SectionHeading title={content.home.titles.collections} subtitle="Собрали для вас" />
          <div className="collections">
            {recommended.map((g, i) => (
              <Link
                key={g.id}
                href={'/collection/' + g.slug}
                className={`collection-tile tone-${i % 5}`}
              >
                <Photo src={g.image?.path} alt="" />
                <strong>{g.title}</strong>
                <span className="tile-arrow">
                  <ArrowRight size={18} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featuredProducts.length > 0 && (
        <section>
          <SectionHeading
            title={featured?.title || 'Хиты продаж'}
            href={'/collection/' + featured?.slug}
            subtitle="Приготовлено с заботой"
          />
          <ProductCarousel products={featuredProducts} />
        </section>
      )}

      {/* Compact catalog navigation hint */}
      <section className="catalog-hint-section">
        <div className="catalog-hint-card">
          <div className="catalog-hint-info">
            <div className="catalog-hint-badge">
              <LayoutGrid size={24} />
            </div>
            <div>
              <h3>Каталог всех товаров</h3>
              <p>Готовая кулинария, свежая выпечка, фермерские продукты и напитки</p>
            </div>
          </div>
          <Link href="/catalog" className="catalog-hint-button">
            Открыть каталог <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}

export function CategoryTiles({
  categories,
  backgroundColor,
}: {
  categories: Category[];
  backgroundColor?: string;
}) {
  return (
    <div className="category-tiles">
      {categories.map((c, i) => {
        const media = categoryMedia(c);
        const imageSrc = media.foreground || media.background;
        const tileBg = backgroundColor || getCategoryGroupColor(c);
        return (
          <Link
            className="category-tile"
            style={{ backgroundColor: tileBg }}
            href={'/category/' + c.slug}
            key={c.id}
          >
            <span className="category-tile-title">{c.name}</span>
            {imageSrc ? (
              <div className="category-tile-image-wrapper">
                <Photo
                  src={imageSrc}
                  alt={c.name}
                  className="category-tile-image"
                  width={140}
                  height={140}
                />
              </div>
            ) : (
              <CategoryFallback category={c} />
            )}
          </Link>
        );
      })}
    </div>
  );
}

async function findCategoryPath(
  store: number,
  roots: Category[],
  target: string,
  maxDepth = 5,
): Promise<Category[] | null> {
  const direct = roots.find((c) => String(c.id) === target || c.slug === target);
  if (direct) return [direct];

  async function visit(parent: Category, depth: number): Promise<Category[] | null> {
    if (depth >= maxDepth) return null;
    const children = list<Category>(await publicApi(`stores/${store}/categories/${parent.id}/children`));
    const found = children.find((c) => String(c.id) === target || c.slug === target);
    if (found) return [parent, found];

    for (const child of children.filter((c) => !c.isLeaf)) {
      const nested = await visit(child, depth + 1);
      if (nested) return [parent, ...nested];
    }
    return null;
  }

  for (const root of roots) {
    const path = await visit(root, 0);
    if (path) return path;
  }
  return null;
}

async function CatalogCategorySection({ store, category }: { store: number; category: Category }) {
  const groupBg = getCategoryGroupColor(category);
  const children = await publicApi(`stores/${store}/categories/${category.id}/children`)
    .then(list<Category>)
    .catch(() => [] as Category[]);

  const tilesToRender = children.length ? children : (category.isLeaf ? [category] : []);

  if (!tilesToRender.length) {
    return null;
  }

  return (
    <InteractiveCategorySection
      store={store}
      category={category}
      subcategories={tilesToRender}
      groupBg={groupBg}
    />
  );
}

function RootCatalog({ store, categories }: { store: number; categories: Category[] }) {
  return (
    <div className="catalog-sections">
      {categories.map((category) => (
        <Suspense
          key={category.id}
          fallback={
            <section className="catalog-category-section category-loading">
              <div className="section-heading">
                <h2>{category.name}</h2>
              </div>
              <div className="category-tiles" aria-hidden="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i} className="category-tile-skeleton" />
                ))}
              </div>
            </section>
          }
        >
          <CatalogCategorySection store={store} category={category} />
        </Suspense>
      ))}
    </div>
  );
}

function queryString(params: Record<string, string | string[] | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (
      typeof v === 'string' &&
      (/^(page|query|sort|priceMin|priceMax|onlyDiscounted|sugarFree|categoryId|brandId)$/.test(k) ||
        /^filter\[[a-zA-Z0-9_-]+\]$/.test(k))
    ) {
      q.set(k, v);
    }
  }
  q.set('perPage', String(content.pageSize));
  return q;
}

export async function Catalog({
  kind,
  id,
  params,
}: {
  kind: string;
  id?: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const store = await selectedStore();
  const q = queryString(params);
  let title = 'Каталог';
  let data: any = { data: [] };
  let children: Category[] = [];
  let filters: any = null;
  let path: Category[] = [];
  let activeChild: Category | null = null;

  const categories = list<Category>(await publicApi(`stores/${store}/categories`));

  if (kind === 'catalog' && !id) {
    return (
      <>
        <div className="breadcrumbs">
          <Link href="/">Главная</Link>
          <span>/</span>
          <span>Каталог</span>
        </div>
        <div className="page-heading">
          <h1>Каталог</h1>
        </div>
        <RootCatalog store={store} categories={categories} />
      </>
    );
  }

  if (kind === 'search') {
    title = params.query ? `Результаты поиска «${params.query}»` : 'Найдётся всё, что нужно';
    if (typeof params.query !== 'string' || params.query.trim().length < 2) {
      return (
        <>
          <h1>{title}</h1>
          <form className="large-search" action="/search">
            <input
              name="query"
              placeholder="Например, молоко или сыр"
              minLength={2}
              required
              aria-label="Поиск"
            />
            <button className="primary" type="submit">
              Найти
            </button>
          </form>
          <CategoryTiles categories={categories} />
        </>
      );
    }
    [data, filters] = await Promise.all([
      api(`search/stores/${store}/products?${q}`),
      api(`search/stores/${store}/filters?${q}`),
    ]);
  } else if (kind === 'collection') {
    const groups = list<ProductGroupDto>(await api(`stores/${store}/product-groups`));
    const groupItem = groups.find((g) => g.slug === id || String(g.id) === id);
    if (!groupItem) {
      throw new ApiError(404, { message: 'Подборка не найдена' });
    }
    title = groupItem.title;
    data = await api(
      `stores/${store}/product-groups/slug/${encodeURIComponent(groupItem.slug)}/products?${q}`,
    );
  } else {
    // Category page
    if (id && !/^\d+$/.test(id)) {
      const detail = unwrap<Category>(
        await publicApi(`stores/${store}/categories/slug/${encodeURIComponent(id)}`),
      );
      path = [...(detail.ancestors || []), detail];
    } else {
      path = (await findCategoryPath(store, categories, id || '')) || [];
    }

    const current = path.at(-1);
    if (!current) {
      throw new ApiError(404, { message: 'Категория не найдена' });
    }

    title = current.name;
    children = list<Category>(await publicApi(`stores/${store}/categories/${current.id}/children`));

    // Resolve active subcategory if subcategories exist:
    if (children.length > 0) {
      const subParam = typeof params.sub === 'string' ? params.sub : undefined;
      activeChild =
        children.find((c) => c.slug === subParam || String(c.id) === subParam) ||
        children[0];
    }

    // Always fetch products! If subcategory is active, fetch its products; otherwise current category
    const targetCategoryId = activeChild ? activeChild.id : current.id;

    [data, filters] = await Promise.all([
      publicApi(`stores/${store}/categories/${targetCategoryId}/products?${q}`),
      publicApi(`stores/${store}/categories/${targetCategoryId}/filters`),
    ]);
  }

  const products = list(data).map(product);
  const page = Math.max(1, Number(params.page) || 1);

  function pageLink(n: number) {
    const p = new URLSearchParams(q);
    p.set('page', String(n));
    p.delete('perPage');
    return '?' + p.toString();
  }

  const currentCategory = path.at(-1);

  return (
    <>
      <div className="breadcrumbs">
        <Link href="/">Главная</Link>
        <span>/</span>
        <Link href="/catalog">Каталог</Link>
        {path.map((c) => (
          <span key={c.id} className="breadcrumb-part">
            <span>/</span>
            <Link href={'/category/' + c.slug}>{c.name}</Link>
          </span>
        ))}
        {activeChild && (
          <span className="breadcrumb-part">
            <span>/</span>
            <span>{activeChild.name}</span>
          </span>
        )}
      </div>

      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          {activeChild && <h2 className="active-sub-heading">{activeChild.name}</h2>}
        </div>
        {typeof data.total === 'number' && (
          <span className="muted total-count-badge">{data.total.toLocaleString('ru-RU')} товаров</span>
        )}
      </div>

      {/* Horizontal Pills (Chips) Bar for Subcategories - just like the mobile app! */}
      {children.length > 0 && currentCategory && (
        <div className="subcategory-pills-bar">
          <div className="subcategory-pills-scroll">
            {children.map((child) => {
              const isActive =
                activeChild && (activeChild.id === child.id || activeChild.slug === child.slug);
              return (
                <Link
                  key={child.id}
                  href={`/category/${currentCategory.slug}?sub=${child.slug || child.id}`}
                  className={`subcategory-pill ${isActive ? 'active' : ''}`}
                >
                  {child.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Catalog Layout with Desktop Sidebar and Dense Products Grid */}
      <div className="catalog-layout">
        <Filters
          filters={unwrap(filters)}
          subcategories={
            children.length > 0 && currentCategory
              ? {
                  items: children,
                  activeId: activeChild?.slug || activeChild?.id,
                  parentSlug: currentCategory.slug,
                }
              : undefined
          }
        />
        <div className="catalog-main">
          {products.length ? (
            <ProductGrid products={products} />
          ) : (
            <Empty title="В этом разделе пока нет товаров">
              <p>Попробуйте выбрать другой подраздел или сбросить фильтры.</p>
            </Empty>
          )}

          <nav className="pagination" aria-label="Страницы каталога">
            {page > 1 && (
              <Link className="secondary" href={pageLink(page - 1)}>
                ← Назад
              </Link>
            )}
            <span>Страница {page}</span>
            {data.hasMore && (
              <Link className="primary" href={pageLink(page + 1)}>
                Далее →
              </Link>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}

export async function ProductPage({ id }: { id: string }) {
  const store = await selectedStore();
  const [detailData, similar, relatedGroups] = await Promise.all([
    publicApi(`products/${encodeURIComponent(id)}?storeId=${store}`),
    publicApi(`products/${id}/similar?storeId=${store}&perPage=6`).then(list).catch(() => []),
    publicApi(`products/${id}/related?storeId=${store}&perPage=6`).then(list).catch(() => []),
  ]);
  const p = product(unwrap(detailData));

  const related = relatedGroups
    .flatMap((group) => (Array.isArray(group.products) ? group.products : [group]))
    .filter((v) => v?.title && v?.price != null);

  return (
    <>
      <div className="breadcrumbs">
        <Link href="/">Главная</Link>
        <span>/</span>
        <Link href="/catalog">Каталог</Link>
        {p.category && (
          <>
            <span>/</span>
            <Link href={'/category/' + (p.category.slug || p.category.id)}>
              {p.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span>{p.title}</span>
      </div>

      <ProductDetail p={p} stickyBuy />
      <Reviews productId={p.id} />

      {similar.length > 0 && (
        <section>
          <SectionHeading title="Вам может понравиться" />
          <ProductGrid products={similar.slice(0, 6).map(product)} />
        </section>
      )}

      {related.length > 0 && (
        <section>
          <SectionHeading title="Хорошо сочетается" />
          <ProductGrid products={related.slice(0, 6).map(product)} />
        </section>
      )}
    </>
  );
}
