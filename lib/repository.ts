import { MERCHANT_ID, products as localProducts } from "./catalog";
import { readStore, updateStore } from "./store";
import type { Order, OrderItem, OrderStatus, Product, StoreData } from "./types";
import { orderReceivedEmail, newOrderOwnerEmail, orderStatusChangedEmail } from "./email-templates";
import { sendEmail } from "./email";
import { processDueNotificationJobs } from "./notifications";
import { normalizeEmail } from "./validation";
import { isSupabaseConfigured, merchantSlug } from "./supabase/config";
import { createSupabaseAdminClient, createSupabaseServerClient } from "./supabase/server";

export type CheckoutInput = { name: string; phone: string; email: string; address: string; notes: string; paymentMethod: string; items: OrderItem[]; idempotencyKey?: string };

const money = (value: unknown) => Number(value ?? 0);

function requireLocalModeAllowed() {
  if (process.env.NODE_ENV === "production") throw new Error("Supabase is not configured. Production cannot fall back to local storage.");
}

async function merchantId() {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("merchants").select("id").eq("slug", merchantSlug()).single();
  if (error || !data) throw new Error("Merchant configuration was not found.");
  return data.id as string;
}

export async function getProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) { requireLocalModeAllowed(); return localProducts; }
  const admin = createSupabaseAdminClient();
  const id = await merchantId();
  const { data, error } = await admin.from("products").select("external_id,name,description,price,image,active").eq("merchant_id", id).eq("active", true).order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ id: row.external_id, merchantId: id, name: row.name, description: row.description, price: money(row.price), image: row.image, active: row.active }));
}

export async function getDashboardData(): Promise<StoreData> {
  if (!isSupabaseConfigured()) { requireLocalModeAllowed(); return readStore(); }
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
    customers: (customerResult.data ?? []).map((row) => ({ id: row.id, merchantId: row.merchant_id, name: row.name, phone: row.phone, email: row.email ?? "", address: row.address, orderCount: row.order_count, totalSpent: money(row.total_spent), createdAt: row.created_at })),
    orders: (orderResult.data ?? []).map((row) => ({ id: row.id, merchantId: row.merchant_id, customerId: row.customer_id, customerName: row.customer_name, phone: row.phone, email: row.email ?? "", address: row.address, notes: row.notes, paymentMethod: row.payment_method ?? "", items: (itemResult.data ?? []).filter((item) => item.order_id === row.id).map((item) => ({ productId: item.product_external_id, name: item.name, size: item.size ?? "", price: money(item.price), quantity: item.quantity })), subtotal: money(row.subtotal), deliveryFee: money(row.delivery_fee), total: money(row.total), status: row.status as OrderStatus, createdAt: row.created_at })),
    events: (eventResult.data ?? []).map((row) => ({ id: row.id, merchantId: row.merchant_id, type: row.type, orderId: row.order_id, status: row.status, message: row.message, createdAt: row.created_at })),
  };
}

export async function createCheckoutOrder(input: CheckoutInput): Promise<Order> {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("A valid email address is required.");
  if (!isSupabaseConfigured()) { requireLocalModeAllowed(); return createLocalOrder(input, email); }

  const admin = createSupabaseAdminClient();
  const id = await merchantId();
  const productIds = input.items.map((item) => item.productId);
  const { data: rows, error: productError } = await admin.from("products").select("id,external_id,name,price").eq("merchant_id", id).eq("active", true).in("external_id", productIds);
  if (productError || !rows || rows.length !== new Set(productIds).size) throw new Error("One of the selected products is unavailable.");
  const items = input.items.map((item) => {
    const product = rows.find((row) => row.external_id === item.productId)!;
    return { databaseId: product.id as string, productId: product.external_id as string, name: product.name as string, size: item.size, price: money(product.price), quantity: Math.max(1, Math.min(5, Number(item.quantity) || 1)) };
  });
  const phone = input.phone.replace(/[^+\d]/g, "");
  const rpcItems = items.map((item) => ({ product_id: item.databaseId, product_external_id: item.productId, name: item.name, size: item.size, price: item.price, quantity: item.quantity }));

  const { data: row, error } = await admin.rpc("create_checkout_order", {
    p_merchant_id: id,
    p_idempotency_key: input.idempotencyKey?.trim() || null,
    p_customer_name: input.name.trim(),
    p_phone: phone,
    p_email: email,
    p_address: input.address.trim(),
    p_notes: input.notes.trim(),
    p_payment_method: input.paymentMethod,
    p_items: rpcItems,
    p_owner_alert_email: process.env.ORDER_ALERT_EMAIL ?? "",
  });
  if (error || !row) throw new Error(error?.message ?? "Order could not be saved.");

  const order: Order = {
    id: row.id, merchantId: row.merchant_id, customerId: row.customer_id, customerName: row.customer_name,
    phone: row.phone, email: row.email ?? "", address: row.address, notes: row.notes ?? "", paymentMethod: row.payment_method ?? "",
    items: items.map(({ productId, name, size, price, quantity }) => ({ productId, name, size, price, quantity })),
    subtotal: money(row.subtotal), deliveryFee: money(row.delivery_fee), total: money(row.total), status: row.status as OrderStatus, createdAt: row.created_at,
  };

  void processDueNotificationJobs(10).catch((err) => console.error("Notification processing failed:", err));
  return order;
}

async function createLocalOrder(input: CheckoutInput, email: string) {
  return updateStore(async (data) => {
    const items = input.items.map((item) => {
      const product = data.products.find((candidate) => candidate.id === item.productId && candidate.active);
      if (!product) throw new Error("One of the selected products is unavailable.");
      return { productId: product.id, name: product.name, size: item.size, price: product.price, quantity: Math.max(1, Math.min(5, Number(item.quantity) || 1)) };
    });
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const phone = input.phone.replace(/[^+\d]/g, "");
    let customer = data.customers.find((entry) => entry.merchantId === MERCHANT_ID && entry.phone === phone);
    if (!customer) { customer = { id: crypto.randomUUID(), merchantId: MERCHANT_ID, name: input.name.trim(), phone, email, address: input.address.trim(), orderCount: 0, totalSpent: 0, createdAt: new Date().toISOString() }; data.customers.push(customer); }
    const deliveryFee = subtotal >= 5000 ? 0 : 120;
    const order: Order = { id: `VO-${Date.now().toString().slice(-6)}`, merchantId: MERCHANT_ID, customerId: customer.id, customerName: input.name.trim(), phone, email, address: input.address.trim(), notes: input.notes.trim(), paymentMethod: input.paymentMethod, items, subtotal, deliveryFee, total: subtotal + deliveryFee, status: "new", createdAt: new Date().toISOString() };
    customer.name = order.customerName; customer.email = email; customer.address = order.address; customer.orderCount += 1; customer.totalSpent += order.total; data.orders.unshift(order);

    const customerEmail = orderReceivedEmail(order);
    const customerResult = await sendEmail({ to: order.email, subject: customerEmail.subject, html: customerEmail.html, text: customerEmail.text });
    data.events.unshift({ id: crypto.randomUUID(), merchantId: MERCHANT_ID, type: "order_confirmation", orderId: order.id, status: customerResult.ok ? "sent" : "failed", message: customerResult.ok ? customerEmail.subject : customerResult.error, createdAt: new Date().toISOString() });

    const ownerAlertEmail = process.env.ORDER_ALERT_EMAIL;
    if (ownerAlertEmail) {
      const ownerEmail = newOrderOwnerEmail(order);
      const ownerResult = await sendEmail({ to: ownerAlertEmail, subject: ownerEmail.subject, html: ownerEmail.html, text: ownerEmail.text });
      data.events.unshift({ id: crypto.randomUUID(), merchantId: MERCHANT_ID, type: "merchant_order_alert", orderId: order.id, status: ownerResult.ok ? "sent" : "failed", message: ownerResult.ok ? ownerEmail.subject : ownerResult.error, createdAt: new Date().toISOString() });
    }
    return order;
  });
}

export async function subscribeToNewsletter(email: string) {
  const value = email.trim().toLowerCase();
  if (!isSupabaseConfigured()) return;
  const admin = createSupabaseAdminClient();
  const id = await merchantId();
  const { error } = await admin.from("newsletter_subscribers").upsert({ merchant_id: id, email: value }, { onConflict: "merchant_id,email" });
  if (error) throw new Error(error.message);
}

export async function findCustomerByPhone(phone: string) {
  const value = phone.replace(/[^+\d]/g, "");
  if (!value) return null;
  if (!isSupabaseConfigured()) {
    const data = await readStore();
    const found = data.customers.find((entry) => entry.merchantId === MERCHANT_ID && entry.phone === value);
    return found ? { name: found.name, email: found.email, address: found.address } : null;
  }
  const admin = createSupabaseAdminClient();
  const id = await merchantId();
  const { data } = await admin.from("customers").select("name,email,address").eq("merchant_id", id).eq("phone", value).maybeSingle();
  return data ? { name: data.name as string, email: (data.email as string) ?? "", address: data.address as string } : null;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  if (!isSupabaseConfigured()) {
    requireLocalModeAllowed();
    return updateStore(async (data) => {
      const found = data.orders.find((entry) => entry.id === id);
      if (!found) return null;
      if (found.status === status) return found;
      found.status = status;
      const email = orderStatusChangedEmail({ id: found.id, customerName: found.customerName }, status);
      const result = found.email
        ? await sendEmail({ to: found.email, subject: email.subject, html: email.html, text: email.text })
        : { ok: false as const, retryable: false, error: "No recipient email on file." };
      data.events.unshift({ id: crypto.randomUUID(), merchantId: found.merchantId, type: `order_${status}`, orderId: found.id, status: result.ok ? "sent" : "failed", message: result.ok ? email.subject : result.error, createdAt: new Date().toISOString() });
      return found;
    });
  }

  const supabase = await createSupabaseServerClient();
  const { data: current, error: currentError } = await supabase.from("orders").select("status").eq("id", id).maybeSingle();
  if (currentError) throw new Error(currentError.message);
  if (!current) return null;
  if (current.status === status) return { id, status };

  const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select("id,merchant_id,customer_name,email,phone").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const admin = createSupabaseAdminClient();
  const { data: eventRow, error: eventError } = await admin.from("order_status_events").insert({ merchant_id: data.merchant_id, order_id: data.id, status }).select("id").single();
  if (eventError) { console.error("Failed to record status event:", eventError.message); return { id: data.id, status }; }

  const email = (data.email as string | null) ?? "";
  if (email) {
    const { error: jobError } = await admin.from("notification_jobs").insert({
      merchant_id: data.merchant_id, order_id: data.id, kind: "order_status_changed",
      dedup_key: `order:${data.id}:status-changed:${eventRow.id}:v1`,
      recipient_email: email, recipient_name: data.customer_name, payload: { status },
    });
    if (jobError) console.error("Failed to enqueue status notification:", jobError.message);
    else void processDueNotificationJobs(5).catch((err) => console.error("Notification processing failed:", err));
  } else {
    console.warn(`Order ${data.id} has no email on file; skipping status notification.`);
  }

  return { id: data.id, status };
}
