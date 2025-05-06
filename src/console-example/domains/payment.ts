export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export class Payment {
  payment_id: string;
  order_id: string;
  payment_status: PaymentStatus;
}
