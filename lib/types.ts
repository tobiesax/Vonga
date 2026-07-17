export type Product = { id: string; merchantId: string; name: string; description: string; price: number; image: string; active: boolean };
export type OrderStatus = "new" | "payment_pending" | "confirmed" | "preparing" | "ready" | "delivered";
export type OrderItem = { productId: string; name: string; size: string; price: number; quantity: number };
export type Customer = { id: string; merchantId: string; name: string; phone: string; email: string; address: string; orderCount: number; totalSpent: number; createdAt: string };
export type Order = { id: string; merchantId: string; customerId: string; customerName: string; phone: string; email: string; address: string; notes: string; paymentMethod: string; items: OrderItem[]; subtotal: number; deliveryFee: number; total: number; status: OrderStatus; createdAt: string };
export type AutomationEvent = { id: string; merchantId: string; type: string; orderId: string; status: "queued" | "sent" | "failed"; message: string; createdAt: string };
export type StoreData = { products: Product[]; customers: Customer[]; orders: Order[]; events: AutomationEvent[] };
