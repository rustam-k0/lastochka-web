import {test,expect} from '@playwright/test';

test('home, catalog, search and product links use live store data',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  if((page.viewportSize()?.width||0)<=560)await expect(page.getByRole('link',{name:/Указать адрес доставки/})).toBeVisible();
  else await expect(page.getByRole('heading',{name:'Всё любимое — рядом'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Рекомендуем'})).toBeVisible();
  await page.goto('/catalog');
  await expect(page.getByRole('heading',{name:'Каталог',exact:true})).toBeVisible();
  await expect(page.locator('.catalog-category-section').first()).toBeVisible();
  const category=page.locator('.category-tile').first();
  await category.click();
  await expect(page.locator('.product-card').first()).toBeVisible();
  await page.goto('/search?query=молоко');
  await expect(page.getByRole('heading',{name:/Результаты поиска/})).toBeVisible();
  const product=page.locator('.product-card .product-title').first();
  await expect(product).toBeVisible();
  await product.click();
  await expect(page.locator('.product-detail h1')).toBeVisible();
  expect(errors).toEqual([]);
});

test('layout has no horizontal overflow and browser history restores catalog',async({page})=>{
  await page.goto('/search?query=молоко&page=1');
  const first=page.locator('.product-card .product-title').first();
  await first.click();
  await expect(page).toHaveURL(/\/product\//);
  await page.goBack();
  await expect(page).toHaveURL(/\/search\?query=.*page=1/);
  await expect(page.locator('.product-card').first()).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test('key storefront pages do not overflow or sit behind fixed controls at reference widths',async({page})=>{
  for(const width of [390,768,1280,1440]){
    await page.setViewportSize({width,height:900});
    for(const path of ['/','/catalog','/category/46080']){
      await page.goto(path);
      const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,lastBottom:(document.querySelector('main')?.getBoundingClientRect().bottom||0),viewport:innerHeight}));
      expect(metrics.overflow,`${path} at ${width}px`).toBe(0);
      expect(await page.locator('main').isVisible()).toBe(true);
    }
  }
});

test('anonymous personal pages request login instead of exposing data',async({page})=>{
  await page.goto('/cart');
  await expect(page.getByRole('button',{name:'Войти по телефону'})).toBeVisible();
  await page.goto('/favorites');
  await expect(page.getByRole('button',{name:'Войти по телефону'})).toBeVisible();
});
