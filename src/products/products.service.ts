import { Injectable } from '@nestjs/common';
import { Product, ProductResponse } from './products.interface';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async getProducts(userId: string): Promise<ProductResponse[]> {
    const products = await this.productsRepository.getProducts(userId);

    return this.validatePromotions(products);
  }

  async getMyProducts(userId: string): Promise<ProductResponse[]> {
    const products = await this.productsRepository.getMyProducts(userId);

    return this.validatePromotions(products);
  }

  async getFavoritesProducts(userId: string): Promise<ProductResponse[]> {
    const products = await this.productsRepository.getFavoritesProducts(userId);

    return this.validatePromotions(products);
  }

  private async validatePromotions(
    products: ProductResponse[],
  ): Promise<ProductResponse[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const product of products) {
      if (
        product.isPromotional &&
        product.promotionEndDate &&
        new Date(product.promotionEndDate) < today
      ) {
        await this.productsRepository.clearPromotion(product.id);

        product.isPromotional = false;
        product.discountPercentage = undefined;
        product.promotionEndDate = undefined;
      }
    }

    return products;
  }

  async getProductById(id: string): Promise<ProductResponse | null> {
    return this.productsRepository.getProductById(id);
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<string> {
    return this.productsRepository.createProduct(product);
  }

  async updateProduct(
    id: string,
    product: Omit<ProductResponse, 'id'>,
  ): Promise<ProductResponse> {
    return await this.productsRepository.updateProduct(id, product);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.productsRepository.deleteProduct(id);
  }

  async getProductsByIds(ids: string[]): Promise<ProductResponse[]> {
    const products = await Promise.all(
      ids.map((id) => this.productsRepository.getProductById(id)),
    );

    return products.filter(
      (product): product is ProductResponse => product !== null,
    );
  }
}
