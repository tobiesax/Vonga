"use client";

import type { OrderStatus, StoreData } from "@/lib/types";
import { useState } from "react";

const statuses: OrderStatus[] = ["new", "payment_pending", "confirmed", "preparing", "ready", "delivered"];
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Dashboard({ initial }: { initial: StoreData }) {
  const [data, setData] = useState(initial);
  const revenue = data.orders.reduce((sum, order) => sum + order.total, 0);
  async function move(id: string, status: OrderStatus) {
    const response = await fetch(`/api/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (response.ok) { setData((current) => ({ ...current, orders: current.orders.map((order) => order.id === id ? { ...order, status } : order) })); window.location.reload(); }
  }
  return <main className="dashboard"><div className="dashTop"><div><p className="eyebrow">CRUNCH & CRUMBS</p><h1>Commerce control room</h1><p>Orders, customers and WhatsApp automation in one place.</p></div><div className="dashActions"><a className="primary" href="/">VIEW STOREFRONT</a><form action="/api/auth/logout" method="post"><button className="logoutButton">LOG OUT</button></form></div></div>
    <section className="metrics"><article><span>Orders</span><b>{data.orders.length}</b></article><article><span>Revenue</span><b>R{revenue.toFixed(2)}</b></article><article><span>Customers</span><b>{data.customers.length}</b></article><article><span>Automations</span><b>{data.events.length}</b></article></section>
    <section><div className="sectionTitle"><div><p className="eyebrow">LIVE PIPELINE</p><h2>Order fulfilment</h2></div></div><div className="kanban">{statuses.map((status) => <div className="column" key={status}><h3>{label(status)} <span>{data.orders.filter((order) => order.status === status).length}</span></h3>{data.orders.filter((order) => order.status === status).map((order) => <article className="orderCard" key={order.id}><small>{order.id}</small><b>{order.customerName}</b><p>{order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}</p><strong>R{order.total.toFixed(2)}</strong><select value={order.status} onChange={(event) => move(order.id, event.target.value as OrderStatus)}>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></article>)}</div>)}</div></section>
    <section className="lowerGrid"><div><div className="sectionTitle"><h2>Recent customers</h2></div><div className="table">{data.customers.length ? data.customers.map((customer) => <div key={customer.id}><span><b>{customer.name}</b><small>{customer.phone}</small></span><span>{customer.orderCount} order{customer.orderCount === 1 ? "" : "s"}</span><strong>R{customer.totalSpent.toFixed(2)}</strong></div>) : <p>No customers yet—place a test order from the storefront.</p>}</div></div><div><div className="sectionTitle"><h2>Automation log</h2></div><div className="events">{data.events.length ? data.events.slice(0,6).map((event) => <article key={event.id}><span className={`dot ${event.status}`}/><div><b>{label(event.type)}</b><small>{event.orderId} · {label(event.status)}</small></div></article>) : <p>No automation events yet.</p>}</div></div></section>
  </main>;
}
