export enum DeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  RETURNED = 'returned',
}

export class Delivery {
  delivery_id: string;
  order_id: string;
  delivery_status: DeliveryStatus;
}
