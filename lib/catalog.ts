import type { Product } from "./types";
import { vongaProducts } from "./vonga";

export const MERCHANT_ID = "vonga";

export const products: Product[] = vongaProducts.map((p) => ({ id: p.id, merchantId: MERCHANT_ID, name: p.name, description: p.description, price: p.price, image: p.image, active: true }));
