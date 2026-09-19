import {test,expect} from '@playwright/test';

test('home, catalog, search and product links use live store data',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Всё любимое — рядом'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Рекомендуем'})).toBeVisible();
  await page.goto('/catalog');
  await expect(page.getByRole('heading',{name:'Каталог',exact:true})).toBeVisible();
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
  await page.goto('/catalog?page=1');
  const first=page.locator('.product-card .product-title').first();
  await first.click();
  await expect(page).toHaveURL(/\/product\//);
  await page.goBack();
  await expect(page).toHaveURL(/\/catalog\?page=1/);
  await expect(page.locator('.product-card').first()).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});

test('anonymous personal pages request login instead of exposing data',async({page})=>{
  await page.goto('/cart');
  await expect(page.getByRole('button',{name:'Войти по телефону'})).toBeVisible();
  await page.goto('/favorites');
  await expect(page.getByRole('button',{name:'Войти по телефону'})).toBeVisible();
});
