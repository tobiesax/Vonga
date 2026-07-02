import { MERCHANT_ID, products as localProducts } from "./catalog";
import { readStore, updateStore } from "./store";
import type { Order, OrderItem, OrderStatus, Product, StoreData } from "./types";
import { orderConfirmation, sendWhatsApp, statusMessage } from "./whatsapp";
import { isSupabaseConfigured, merchantSlug } from "./supabase/config";
import { createSupabaseAdminClient, createSupabaseServerClient } from "./supabase/server";

export type CheckoutInput = { name: string; phone: string; address: string; notes: string; items: OrderItem[] };

const money = (value: unknown) => Number(value ?? 0);

async function merchantId() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("merchants").select("id").eq("slug", merchantSlug()).single();
  if (error || !data) throw new Error("Merchant configuration was not found.");
  return data.id as string;
}

export async function getProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return localProducts;
  const admin = createSupabaseAdminClient();
  const id = await merchantId();
  const { data, error } = await admin.from("products").select("external_id,name,description,price,image,active").eq("merchant_id", id).eq("active", true).order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.external_id, merchantId: id, name: row.name, description: row.description, price: money(row.price), image: row.image, active: row.active }));
}

export async function getDashboardData(): Promise<StoreData> {
  if (!isSupabaseConfigured()) return readStore();
  const supabase = await createSupabaseServerClient();
  const id = await merchantId();
  const [productResult, customerResult, orderResult, itemResult, eventResult] = await Promise.all([
    supabase.from("products").select("external_id,name,description,price,image,active").eq("merchant_id", id),
    supabase.from("customers").select("*").eq("merchant_id", id).order("created_at", { ascending: false }),
    supabase.from("orders").select("*").eq("merchant_id", id).order("created_at", { ascending: false }),
    supabase.from("order_items").select("*").eq("merchant_id", id),
    supabase.from("automation_events").select("*").eq("merchant_id", id).order("created_at", { ascending: false }),
  ]);
  const failure = [productResult, customerResult, orderResult, itemResult, eventResult].find((result) => result.error)?.error;
  if (failure) throw new Error(failure.message);
  return {
    products: (productResult.data ?? []).map((row) => ({ id: row.external_id, merchantId: id, name: row.name, description: row.description, price: money(row.price), image: row.image, active: row.active })),
    customers: (customerResult.data ?? []).map((row) => ({ id: row.id, merchantId: row.merchant_id, name: row.name, phone: row.phone, address: row.address, orderCount: row.order_count, totalSpent: money(row.total_spent), createdAt: row.created_at })),
    orders: (orderResult.data ?? []).map((row) => ({ id: row.id, merchantId: row.merchant_id, customerId: row.customer_id, customerName: row.customer_name, phone: row.phone, address: row.address, notes: row.notes, items: (itemResult.data ?? []).filter((item) => item.order_id === row.id).map((item) => ({ productId: item.product_external_id, name: item.name, price: money(item.price), quantity: item.quantity })), subtotal: money(row.subtotal), deliveryFee: money(row.delivery_fee), total: money(row.total), status: row.status as OrderStatus, createdAt: row.created_at })),
    events: (eventResult.data ?? []).map((row) => ({ id: row.id, merchantId: row.merchant_id, type: row.type, orderId: row.order_id, status: row.status, message: row.message, createdAt: row.created_at })),
  };
}

export async function createCheckoutOrder(input: CheckoutInput): Promise<Order> {
  if (!isSupabaseConfigured()) return createLocalOrder(input);
  const admin = createSupabaseAdminClient();
  const id = await merchantId();
  const productIds = input.items.map((item) => item.productId);
  const { data: rows, error: productError } = await admin.from("products").select("id,external_id,name,price").eq("merchant_id", id).eq("active", true).in("external_id", productIds);
  if (productError || !rows || rows.length !== new Set(productIds).size) throw new Error("One of the selected products is unavailable.");
  const items = input.items.map((item) => {
    const product = rows.find((row) => row.external_id === item.productId)!;
    return { databaseId: product.id as string, productId: product.external_id as string, name: product.name as string, price: money(product.price), quantity: Math.max(1, Math.min(20, Number(item.quantity) || 1)) };
  });
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal >= 200 ? 0 : 35;
  const phone = input.phone.replace(/[^+\d]/g, "");
  const { data: existing } = await admin.from("customers").select("id,order_count,total_spent").eq("merchant_id", id).eq("phone", phone).maybeSingle();
  const customerValues = { merchant_id: id, name: input.name.trim(), phone, address: input.address.trim(), order_count: (existing?.order_count ?? 0) + 1, total_spent: money(existing?.total_spent) + subtotal + deliveryFee, updated_at: new Date().toISOString() };
  const { data: customer, error: customerError } = await admin.from("customers").upsert(customerValues, { onConflict: "merchant_id,phone" }).select("id").single();
  if (customerError || !customer) throw new Error(customerError?.message ?? "Customer could not be saved.");
  const order: Order = { id: `CC-${Date.now().toString().slice(-6)}`, merchantId: id, customerId: customer.id, customerName: input.name.trim(), phone, address: input.address.trim(), notes: input.notes.trim(), items: items.map(({ productId, name, price, quantity }) => ({ productId, name, price, quantity })), subtotal, deliveryFee, total: subtotal + deliveryFee, status: "new", createdAt: new Date().toISOString() };
  const { error: orderError } = await admin.from("orders").insert({ id: order.id, merchant_id: id, customer_id: customer.id, customer_name: order.customerName, phone, address: order.address, notes: order.notes, subtotal, delivery_fee: deliveryFee, total: order.total, status: order.status, created_at: order.createdAt });
  if (orderError) throw new Error(orderError.message);
  const { error: itemError } = await admin.from("order_items").insert(items.map((item) => ({ order_id: order.id, merchant_id: id, product_id: item.databaseId, product_external_id: item.productId, name: item.name, price: item.price, quantity: item.quantity })));
  if (itemError) throw new Error(itemError.message);
  await recordConfirmation(admin, order);
  return order;
}

async function recordConfirmation(admin: ReturnType<typeof createSupabaseAdminClient>, order: Order) {
  const message = orderConfirmation(order);
  let status: "queued" | "sent" | "failed" = "queued";
  try { status = (await sendWhatsApp(order.phone, message)).status; } catch { status = "failed"; }
  const { error } = await admin.from("automation_events").insert({ merchant_id: order.merchantId, type: "order_confirmation", order_id: order.id, status, message });
  if (error) throw new Error(error.message);
}

async function createLocalOrder(input: CheckoutInput) {
  return updateStore(async (data) => {
    const items = input.items.map((item) => {
      const product = data.products.find((candidate) => candidate.id === item.productId && candidate.active);
      if (!product) throw new Error("One of the selected products is unavailable.");
      return { productId: product.id, name: product.name, price: product.price, quantity: Math.max(1, Math.min(20, Number(item.quantity) || 1)) };
    });
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const phone = input.phone.replace(/[^+\d]/g, "");
    let customer = data.customers.find((entry) => entry.merchantId === MERCHANT_ID && entry.phone === phone);
    if (!customer) { customer = { id: crypto.randomUUID(), merchantId: MERCHANT_ID, name: input.name.trim(), phone, address: input.address.trim(), orderCount: 0, totalSpent: 0, createdAt: new Date().toISOString() }; data.customers.push(customer); }
    const deliveryFee = subtotal >= 200 ? 0 : 35;
    const order: Order = { id: `CC-${Date.now().toString().slice(-6)}`, merchantId: MERCHANT_ID, customerId: customer.id, customerName: input.name.trim(), phone, address: input.address.trim(), notes: input.notes.trim(), items, subtotal, deliveryFee, total: subtotal + deliveryFee, status: "new", createdAt: new Date().toISOString() };
    customer.name = order.customerName; customer.address = order.address; customer.orderCount += 1; customer.totalSpent += order.total; data.orders.unshift(order);
    const message = orderConfirmation(order); let status: "queued" | "sent" | "failed" = "queued";
    try { status = (await sendWhatsApp(phone, message)).status; } catch { status = "failed"; }
    data.events.unshift({ id: crypto.randomUUID(), merchantId: MERCHANT_ID, type: "order_confirmation", orderId: order.id, status, message, createdAt: new Date().toISOString() });
    return order;
  });
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  if (!isSupabaseConfigured()) return updateStore(async (data) => {
    const found = data.orders.find((entry) => entry.id === id);
    if (!found) return null;
    found.status = status;
    const message = statusMessage(found.customerName, found.id, status); let eventStatus: "queued" | "sent" | "failed" = "queued";
    try { eventStatus = (await sendWhatsApp(found.phone, message)).status; } catch { eventStatus = "failed"; }
    data.events.unshift({ id: crypto.randomUUID(), merchantId: found.merchantId, type: `order_${status}`, orderId: found.id, status: eventStatus, message, createdAt: new Date().toISOString() });
    return found;
  });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select("id,merchant_id,customer_name,phone").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const message = statusMessage(data.customer_name, data.id, status); let eventStatus: "queued" | "sent" | "failed" = "queued";
  try { eventStatus = (await sendWhatsApp(data.phone, message)).status; } catch { eventStatus = "failed"; }
  const admin = createSupabaseAdminClient();
  const { error: eventError } = await admin.from("automation_events").insert({ merchant_id: data.merchant_id, type: `order_${status}`, order_id: data.id, status: eventStatus, message });
  if (eventError) throw new Error(eventError.message);
  return { id: data.id, status };
}
