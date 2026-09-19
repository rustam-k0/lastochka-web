import {
  Utensils,
  Croissant,
  Apple,
  Beef,
  Fish,
  Milk,
  CakeSlice,
  Snowflake,
  CupSoda,
  Wheat,
  Coffee,
  Cookie,
  ShoppingBag,
  LucideIcon,
} from 'lucide-react';
import { Category } from '@/lib/types';

interface FallbackVisual {
  Icon: LucideIcon;
  gradient: string;
  accent: string;
}

export function getFallbackVisual(category: Category | string): FallbackVisual {
  const slug = typeof category === 'string' ? category : (category.slug || '').toLowerCase();
  const name = typeof category === 'string' ? category : (category.name || '').toLowerCase();
  const text = `${slug} ${name}`;

  if (text.includes('gotov') || text.includes('кулинар') || text.includes('готов')) {
    return {
      Icon: Utensils,
      gradient: 'linear-gradient(135deg, #fff2e6 0%, #fde0c8 100%)',
      accent: '#c05621',
    };
  }
  if (text.includes('xleb') || text.includes('buloc') || text.includes('хлеб') || text.includes('выпеч') || text.includes('булоч')) {
    return {
      Icon: Croissant,
      gradient: 'linear-gradient(135deg, #fff9e6 0%, #fcedc2 100%)',
      accent: '#b7791f',
    };
  }
  if (text.includes('ovosh') || text.includes('frukt') || text.includes('овощ') || text.includes('фрукт') || text.includes('зелен') || text.includes('ягод')) {
    return {
      Icon: Apple,
      gradient: 'linear-gradient(135deg, #eefbf1 0%, #d2f4d8 100%)',
      accent: '#2f855a',
    };
  }
  if (text.includes('mias') || text.includes('ptic') || text.includes('kolbas') || text.includes('мясо') || text.includes('птиц') || text.includes('колбас')) {
    return {
      Icon: Beef,
      gradient: 'linear-gradient(135deg, #fff0ed 0%, #fcd6ce 100%)',
      accent: '#c53030',
    };
  }
  if (text.includes('ryb') || text.includes('moreprodukt') || text.includes('рыб') || text.includes('морепродукт')) {
    return {
      Icon: Fish,
      gradient: 'linear-gradient(135deg, #ebf8ff 0%, #cfe8fc 100%)',
      accent: '#2b6cb0',
    };
  }
  if (text.includes('moloc') || text.includes('syr') || text.includes('молоч') || text.includes('сыр') || text.includes('творог')) {
    return {
      Icon: Milk,
      gradient: 'linear-gradient(135deg, #f7fafc 0%, #e6eef5 100%)',
      accent: '#4a5568',
    };
  }
  if (text.includes('sladk') || text.includes('tort') || text.includes('десерт') || text.includes('торт') || text.includes('сладк')) {
    return {
      Icon: CakeSlice,
      gradient: 'linear-gradient(135deg, #fff0f6 0%, #fdd5e5 100%)',
      accent: '#b83280',
    };
  }
  if (text.includes('zamoroz') || text.includes('морожен')) {
    return {
      Icon: Snowflake,
      gradient: 'linear-gradient(135deg, #ebf8fa 0%, #cdebf2 100%)',
      accent: '#0987a0',
    };
  }
  if (text.includes('voda') || text.includes('napitk') || text.includes('сок') || text.includes('напитк') || text.includes('вод')) {
    return {
      Icon: CupSoda,
      gradient: 'linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%)',
      accent: '#234e52',
    };
  }
  if (text.includes('bakale') || text.includes('круп') || text.includes('паст') || text.includes('макарон') || text.includes('бакале')) {
    return {
      Icon: Wheat,
      gradient: 'linear-gradient(135deg, #faf5ff 0%, #f0e6fc 100%)',
      accent: '#6b46c1',
    };
  }
  if (text.includes('cai') || text.includes('kofe') || text.includes('чай') || text.includes('кофе')) {
    return {
      Icon: Coffee,
      gradient: 'linear-gradient(135deg, #fbf7f4 0%, #f1e3d9 100%)',
      accent: '#7b341e',
    };
  }
  if (text.includes('cips') || text.includes('snek') || text.includes('снек') || text.includes('орех') || text.includes('чипс')) {
    return {
      Icon: Cookie,
      gradient: 'linear-gradient(135deg, #fffaf0 0%, #feebc8 100%)',
      accent: '#c05621',
    };
  }

  return {
    Icon: ShoppingBag,
    gradient: 'linear-gradient(135deg, #fff0f2 0%, #ffd9df 100%)',
    accent: '#e20a25',
  };
}

export function CategoryFallback({
  category,
  className = '',
}: {
  category: Category | string;
  className?: string;
}) {
  const { Icon, gradient, accent } = getFallbackVisual(category);
  return (
    <div
      className={`category-tile-fallback ${className}`}
      style={{ background: gradient, color: accent }}
      aria-hidden="true"
    >
      <Icon size={24} strokeWidth={2.2} />
    </div>
  );
}
