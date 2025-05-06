export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class Order {
  order_id: string;
  order_status: OrderStatus;
}
