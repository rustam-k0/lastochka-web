import test from 'node:test';
import assert from 'node:assert/strict';
import routes from '../src/config/routes.json';
import {list,money,product,quantityLabel,step,truth,unwrap} from '../src/lib/types';

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
