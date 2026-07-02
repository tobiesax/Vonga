"use client";

import type { Product } from "@/lib/types";
import { useMemo, useState } from "react";

type Basket = Record<string, number>;

function Icon({ name, size = 28 }: { name: "delivery" | "shield" | "gift" | "heart" | "ingredients" | "trusted"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "delivery") return <svg {...common}><rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/></svg>;
  if (name === "gift") return <svg {...common}><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M12 8S9 3 6.5 4.5 8 8 12 8zM12 8s3-5 5.5-3.5S16 8 12 8z"/></svg>;
  if (name === "heart") return <svg {...common}><path d="M12 21C7 17 3 13.5 3 9a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 4.5-4 8-9 12z"/></svg>;
  if (name === "ingredients") return <svg {...common}><path d="M4 13a8 8 0 0 0 16 0H4z"/><path d="M12 13V7M9 7c0-2 1.5-3 3-3s3 1 3 3"/></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="6"/><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"/></svg>;
}

export default function Storefront({ products }: { products: Product[] }) {
  const [basket, setBasket] = useState<Basket>({});
  const [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");
  const items = products.filter((p) => basket[p.id]).map((p) => ({ ...p, quantity: basket[p.id] }));
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const count = Object.values(basket).reduce((sum, quantity) => sum + quantity, 0);

  const add = (id: string) => setBasket((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  const change = (id: string, amount: number) => setBasket((current) => {
    const next = Math.max(0, (current[id] ?? 0) + amount);
    const copy = { ...current }; if (next) copy[id] = next; else delete copy[id]; return copy;
  });

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setResult("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), address: form.get("address"), notes: form.get("notes"), items: items.map((item) => ({ productId: item.id, name: item.name, price: item.price, quantity: item.quantity })) }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setResult(data.error ?? "Order could not be placed."); return; }
    setResult(`Order ${data.order.id} is confirmed. We’ll continue with you on WhatsApp.`); setBasket({});
  }

  return <>
    <div className="announcement">FREE DELIVERY FOR ORDERS OVER R200 <span>Homemade with love in South Africa 🇿🇦</span></div>
    <header><a className="brand" href="#top"><img src="/assets/logo.png" alt="Crunch & Crumbs" /></a><nav><a href="#products">Shop</a><a href="#story">Our story</a><a href="/dashboard">Merchant dashboard</a></nav><button className="cartButton" onClick={() => setCheckout(true)}>Basket <b>{count}</b></button></header>
    <main id="top">
      <section className="hero"><img src="/assets/products/hero-composed.jpg" alt="Cookies and chinchin" /><div className="heroShade"/><div className="heroCopy"><p className="script">Freshly baked ♡</p><h1>Cookies &<br/>Authentic<br/><em>Nigerian Chinchin</em></h1><p>Homemade with love. Crafted for every celebration, snack break and special moment.</p><a className="primary" href="#products">SHOP OUR TREATS</a></div></section>
      <section className="features"><div><Icon name="delivery"/><b>Fast Delivery</b><span>Quick and reliable</span></div><div><Icon name="shield"/><b>Secure Packaging</b><span>Fresh and crunchy</span></div><div><Icon name="gift"/><b>Perfect for Gifting</b><span>Beautifully packed</span></div><div><Icon name="heart"/><b>Made with Love</b><span>In every batch</span></div></section>
      <section className="products" id="products"><p className="script gold">Our bestsellers</p><h2>Cookies, Chinchin & More</h2><div className="productGrid">{products.map((product) => <article key={product.id}><img src={product.image} alt={product.name}/><div><h3>{product.name}</h3><p>{product.description}</p><strong>R{product.price.toFixed(2)}</strong><button onClick={() => add(product.id)}>ADD TO BASKET</button></div></article>)}</div></section>
      <section className="story" id="story"><img src="/assets/products/couple-baking.jpg" alt="Crunch and Crumbs bakers"/><div><p className="script gold">Our story</p><h2>Homemade Goodness,<br/>Made for You</h2><p>We began as a husband-and-wife dream to bring homemade goodness to families across South Africa. Every batch is prepared with selected ingredients, attention to detail and a passion for quality.</p><div className="storyValues"><span><Icon name="ingredients" size={26}/><b>Quality Ingredients</b></span><span><Icon name="heart" size={26}/><b>Made with Love</b></span><span><Icon name="trusted" size={26}/><b>Trusted by Many</b></span></div></div></section>
    </main>
    {checkout && <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setCheckout(false)}><aside className="checkout"><button className="close" onClick={() => setCheckout(false)}>×</button><h2>Your order</h2>{!items.length ? <p>Your basket is empty.</p> : <>{items.map((item) => <div className="line" key={item.id}><span><b>{item.name}</b><small>R{item.price.toFixed(2)} each</small></span><span className="quantity"><button onClick={() => change(item.id,-1)}>−</button>{item.quantity}<button onClick={() => change(item.id,1)}>+</button></span></div>)}<div className="total"><span>Total</span><b>R{(subtotal + (subtotal >= 200 ? 0 : 35)).toFixed(2)}</b></div>{subtotal < 200 && <small>Includes R35 delivery. Spend R{(200-subtotal).toFixed(2)} more for free delivery.</small>}<form onSubmit={placeOrder}><input name="name" placeholder="Full name" required/><input name="phone" placeholder="WhatsApp number" required/><textarea name="address" placeholder="Delivery address" required/><textarea name="notes" placeholder="Order notes (optional)"/><button className="primary submit" disabled={busy}>{busy ? "PLACING ORDER…" : "PLACE ORDER"}</button></form></>}{result && <p className="result">{result}</p>}</aside></div>}
    <footer><img src="/assets/logo-light.png" alt="Crunch & Crumbs"/><span>Commerce powered by WhatsApp automation.</span></footer>
  </>;
}
