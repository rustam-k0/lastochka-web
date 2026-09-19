export type Json = any; // Boundary responses vary from published OpenAPI; normalized at use sites.
export type Product = {id:number;storeId:number|null;title:string;slug?:string;description?:string;price:number;priceOld?:number;images:{path:string}[];quantityStep:number;measurementUnit:string;measurementUnitLabel:string;weight?:number;stockQuantity:number;isFavorite:boolean;isConfigurable:boolean;hasSupplements:boolean;hasRequiredSupplements:boolean;supplements:Json[];variants?:Json[];composition?:string;additionalInfo?:string;proteins?:number;fats?:number;carbohydrates?:number;calories?:number;rating?:number;reviewsCount:number;pickupOnly?:boolean;category?:{id:number;name:string;slug:string}};
export const unwrap = (v:Json):Json => v?.data ?? v;
export const list = (v:Json):Json[] => Array.isArray(unwrap(v)) ? unwrap(v) : [];
export const money = (v:unknown) => typeof v==='number' && Number.isFinite(v) ? new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(v) : '—';
export const truth = (v:unknown) => v===true || v===1 || v==='1' || v==='true';
export const step = (p:Product) => Math.max(1,Number(p.quantityStep)||1);
export const quantityLabel = (p:Product,n:number) => `${n} ${p.measurementUnitLabel || 'шт'}`;
export function product(v:Json):Product {return {...v,price:Number(v.price),stockQuantity:Number(v.stockQuantity)||0,quantityStep:Math.max(1,Number(v.quantityStep)||1),images:Array.isArray(v.images)?v.images.filter((i:Json)=>typeof i?.path==='string'):[],supplements:Array.isArray(v.supplements)?v.supplements:[],isConfigurable:truth(v.isConfigurable),hasSupplements:truth(v.hasSupplements),hasRequiredSupplements:truth(v.hasRequiredSupplements)};}
