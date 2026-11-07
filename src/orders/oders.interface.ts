import { Address } from 'src/address/address.interface';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface Orders {
  id?: string;
  total: number;
  status: OrderStatus;
  products: Compras[];
  date: string;
  address: Address | null;
}

interface Compras {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
}
