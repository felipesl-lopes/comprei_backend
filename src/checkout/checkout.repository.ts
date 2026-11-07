import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddressRepository } from 'src/address/address.repository';
import { CartRepository } from 'src/cart/cart.repository';
import { Orders, OrderStatus } from 'src/orders/oders.interface';
import { OrdersRepository } from 'src/orders/orders.repository';
import { ProductsRepository } from 'src/products/products.repository';

@Injectable()
export class CheckoutRepository {
  constructor(
    private readonly productRepository: ProductsRepository,
    private readonly addressRepository: AddressRepository,
    private readonly orderRepository: OrdersRepository,
    private readonly cartRepository: CartRepository,
  ) {}

  async finalizeBuy(userId: string, addressId: string): Promise<string> {
    // 1. buscar carrinho
    const cart = await this.cartRepository.getCart(userId);

    const cartItems = Object.entries(cart).map(([productId, value]) => ({
      productId,
      quantity: value.quantity,
    }));

    if (cartItems.length === 0) {
      throw new BadRequestException('Carrinho vazio');
    }

    // 2. validar estoque
    for (const item of cartItems) {
      const product = await this.productRepository.getProductById(
        item.productId,
      );

      if (!product) {
        throw new NotFoundException(`Produto ${item.productId} não encontrado`);
      }

      if (product.quantity < item.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente para ${product.name}`,
        );
      }
    }

    // 3. buscar endereço
    const address = await this.addressRepository.searchAddress(
      userId,
      addressId,
    );

    if (!address) {
      throw new NotFoundException('Endereço não encontrado.');
    }

    // 4. montar pedido
    const products = await Promise.all(
      cartItems.map(async (item) => {
        const product = await this.productRepository.getProductById(
          item.productId,
        );

        return {
          id: product!.id,
          name: product!.name,
          quantity: item.quantity,
          price: product!.price,
          imageUrl: product!.imageUrls?.[0]?.value ?? null,
        };
      }),
    );

    const total = products.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const order: Orders = {
      total,
      date: new Date().toISOString(),
      address: address,
      products,
      status: OrderStatus.PENDING,
    };

    // 5. criar pedido
    const orderId = await this.orderRepository.finalizeBuy(userId, order);

    // 6. atualizar estoque
    for (const item of cartItems) {
      const product = await this.productRepository.getProductById(
        item.productId,
      );

      await this.productRepository.updateProduct(product!.id, {
        ...product!,
        quantity: product!.quantity - item.quantity,
      });
    }

    // 7. limpar carrinho
    await this.cartRepository.clearCart(userId);

    return orderId;
  }
}
