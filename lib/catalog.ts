import type { Product } from "./types";

export const MERCHANT_ID = "crunch-and-crumbs";

export const products: Product[] = [
  { id: "cookie-stack", merchantId: MERCHANT_ID, name: "Chocolate Chip Cookies", description: "Soft, chewy and loaded with chocolate chips.", price: 25, image: "/assets/products/cookie-stack.jpg", active: true },
  { id: "classic-chinchin", merchantId: MERCHANT_ID, name: "Classic Chinchin", description: "Crispy, golden and perfectly sweetened.", price: 20, image: "/assets/products/bowl-chinchin.jpg", active: true },
  { id: "red-velvet", merchantId: MERCHANT_ID, name: "Red Velvet Cookies", description: "Rich red velvet with white chocolate chips.", price: 30, image: "/assets/products/cookie-single.jpg", active: true },
  { id: "coconut-chinchin", merchantId: MERCHANT_ID, name: "Coconut Chinchin", description: "Coconut-infused chinchin with a delightful crunch.", price: 25, image: "/assets/products/coconut-chinchin.jpg", active: true },
  { id: "mix-combo", merchantId: MERCHANT_ID, name: "Mix Combo Pack", description: "A gift-ready mix of cookies and chinchin favourites.", price: 40, image: "/assets/products/mix-combo.png", active: true },
];
