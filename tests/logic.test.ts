import test from 'node:test';
import assert from 'node:assert/strict';
import routes from '../src/config/routes.json';
import {list,money,product,quantityLabel,step,truth,unwrap,normalizeMedia,categoryMedia,cartItems,cartChange,activeStoreId} from '../src/lib/types';
import {paymentReturnUrl} from '../src/lib/client';

test('payment callbacks always use the configured canonical origin',()=>{
  assert.equal(paymentReturnUrl('/cards?binding=return','https://lastochka.duckdns.org'), 'https://lastochka.duckdns.org/cards?binding=return');
  assert.equal(paymentReturnUrl('/payment','http://127.0.0.1:3000'), 'http://127.0.0.1:3000/payment');
  assert.throws(()=>paymentReturnUrl('/cards','javascript:alert(1)'),/безопасный адрес/);
});

test('normalizes documented and observed API wrappers',()=>{
  assert.deepEqual(unwrap({data:{id:2}}),{id:2});
  assert.deepEqual(list({data:[{id:2}]}),[{id:2}]);
  assert.deepEqual(list({data:{id:2}}),[]);
});

test('normalizes quantity, availability and images without inventing data',()=>{
  const p=product({id:1,storeId:2,title:'Аджика',price:'47.80',stockQuantity:'46524',quantityStep:'200',measurementUnit:'gram',measurementUnitLabel:'гр',images:[{}, {path:'https://example.test/a.webp'}],supplements:[],isConfigurable:'false'});
  assert.equal(p.price,47.8);
  assert.equal(step(p),200);
  assert.equal(quantityLabel(p,step(p)),'200 гр');
  assert.equal(p.images.length,1);
  assert.equal(p.stockQuantity,46524);
  assert.equal(p.isConfigurable,false);
});

test('handles money and inconsistent boolean types',()=>{
  assert.match(money(99.99),/99,99/);
  assert.equal(money(undefined),'—');
  for(const value of [true,1,'1','true'])assert.equal(truth(value),true);
});

test('proxy allow-list does not contain duplicate method/path pairs',()=>{
  const keys=routes.map(route=>`${route.method} ${route.path}`);
  assert.equal(new Set(keys).size,keys.length);
  assert.ok(keys.includes('GET stores/{store}/categories/{category}/products'));
  assert.ok(keys.includes('POST orders'));
});

test('category media keeps API background and foreground as separate layers',()=>{
  assert.deepEqual(categoryMedia({id:1,name:'Готовая еда',slug:'food',image:{path:'https://example.test/food.webp'},backgroundImage:{path:'https://example.test/bg.png'}}),{foreground:'https://example.test/food.webp',background:'https://example.test/bg.png'});
  assert.deepEqual(categoryMedia({backgroundImage:{path:'https://example.test/bg.png'}}),{foreground:null,background:'https://example.test/bg.png'});
  assert.deepEqual(categoryMedia({}),{foreground:null,background:null});
});

test('product preview order is stable, valid and deduplicated',()=>{
  const media=normalizeMedia({image:{path:'https://example.test/main.webp'},images:[{path:''},{path:'https://example.test/main.webp'},{path:'https://example.test/second.webp'}],variants:[{images:[{path:'https://example.test/variant.webp'}]}]});
  assert.deepEqual(media.map(v=>v.path),['https://example.test/main.webp','https://example.test/second.webp','https://example.test/variant.webp']);
  assert.equal(product({id:2,title:'Без фото',price:1,stockQuantity:1,quantityStep:1,measurementUnitLabel:'шт'}).preview,null);
});

test('cart helpers preserve configured positions by cart item id and describe reconciliation',()=>{
  const base={id:10,title:'Пицца',price:500,stockQuantity:9,quantityStep:1,measurementUnitLabel:'шт',images:[]};
  const before={storeGroups:[{store:{id:2,name:'Ласточка'},items:[{id:101,quantity:2,product:product(base),supplements:[{id:7}]},{id:102,quantity:1,product:product({...base,id:11,title:'Салат'})}]}]};
  const after={storeGroups:[{store:{id:2,name:'Ласточка'},items:[{id:101,quantity:1,product:product(base),supplements:[{id:7}]}]}]};
  assert.deepEqual(cartItems(before).map(v=>v.id),[101,102]);
  assert.match(cartChange(before,after)||'',/Салат/);
  assert.match(cartChange(before,after)||'',/Пицца/);
});

test('active delivery address is the single source of truth for the storefront store',()=>{
  assert.equal(activeStoreId(2,{storeId:7},1),7);
  assert.equal(activeStoreId(2,{store:{id:8,name:'Адресный магазин'}},1),8);
  assert.equal(activeStoreId(2,null,1),2);
  assert.equal(activeStoreId(null,null,1),1);
});

test('guest cart stores items, recalculates totals, and updates quantities',()=>{
  const storage = new Map<string, string>();
  (globalThis as any).window = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => storage.get(k) || null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  };

  const { addGuestCartItem, setGuestCartQuantity, getGuestCart, clearGuestCart } = require('../src/lib/guest-cart');

  clearGuestCart();
  const initial = getGuestCart();
  assert.equal(initial.totalToPay, 0);

  const testProduct = product({ id: 55, title: 'Молоко 3.2%', price: 120, stockQuantity: 10, quantityStep: 1, measurementUnitLabel: 'шт', storeId: 2 });
  const withOne = addGuestCartItem(testProduct);
  assert.equal(withOne.totalToPay, 120);
  assert.equal(withOne.storeGroups[0].items.length, 1);
  assert.equal(withOne.storeGroups[0].items[0].quantity, 1);

  // Adding same product increments quantity
  const withTwo = addGuestCartItem(testProduct);
  assert.equal(withTwo.totalToPay, 240);
  assert.equal(withTwo.storeGroups[0].items[0].quantity, 2);

  // Update quantity directly
  const itemId = withTwo.storeGroups[0].items[0].id;
  const withFive = setGuestCartQuantity(itemId, 5, testProduct);
  assert.equal(withFive.totalToPay, 600);
  assert.equal(withFive.storeGroups[0].items[0].quantity, 5);

  // Removing item when quantity is 0
  const emptyCart = setGuestCartQuantity(itemId, 0, testProduct);
  assert.equal(emptyCart.totalToPay, 0);
  assert.equal(emptyCart.storeGroups.length, 0);

  clearGuestCart();
  assert.equal(storage.size, 0);

  delete (globalThis as any).window;
  delete (globalThis as any).localStorage;
});
