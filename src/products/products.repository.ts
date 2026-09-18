/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Product, ProductResponse } from './products.interface';
import { FavoritesRepository } from 'src/favorites/favorites.repository';

@Injectable()
export class ProductsRepository {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly userFavoritesRepository: FavoritesRepository,
  ) {}

  async getProducts(userId: string): Promise<ProductResponse[]> {
    const snapshot = await this.firebaseService
      .getDatabase()
      .ref('products')
      .get();

    const data = snapshot.val() as Record<string, Omit<Product, 'id'>> | null;

    if (!data) {
      return [];
    }

    const favoritos = new Set(
      await this.userFavoritesRepository.carregarFavoritos(userId),
    );

    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, product]) => product.userId !== userId),
    ) as Record<string, Omit<Product, 'id'>>;

    return this.returnProducts(filteredData, favoritos);
  }

  async getMyProducts(userId: string): Promise<ProductResponse[]> {
    const snapshot = await this.firebaseService
      .getDatabase()
      .ref('products')
      .orderByChild('userId')
      .equalTo(userId)
      .get();

    const data = snapshot.val() as Record<string, Omit<Product, 'id'>> | null;

    return this.returnProducts(data);
  }

  async getFavoritesProducts(userId: string): Promise<ProductResponse[]> {
    const snapshot = await this.firebaseService
      .getDatabase()
      .ref('products')
      .get();

    const data = snapshot.val() as Record<string, Omit<Product, 'id'>> | null;

    if (!data) {
      return [];
    }

    const favoritos = new Set(
      await this.userFavoritesRepository.carregarFavoritos(userId),
    );

    const filteredData = Object.fromEntries(
      Object.entries(data).filter(
        ([id, product]) => product.userId !== userId && favoritos.has(id),
      ),
    ) as Record<string, Omit<Product, 'id'>>;

    return this.returnProducts(filteredData, favoritos);
  }

  private returnProducts(
    data: Record<string, Omit<Product, 'id'>> | null,
    favoritos?: Set<string>,
  ): ProductResponse[] {
    if (!data) {
      return [];
    }

    return Object.entries(data).map(([id, product]) => {
      const { userId: _userId, ...productWithoutUserId } = product;

      return {
        id,
        ...productWithoutUserId,
        isFavorite: favoritos?.has(id) ?? false,
        notaMedia: Number(product.notaMedia ?? 0.0),
        totalAvaliacoes: product.totalAvaliacoes ?? 0,
      };
    });
  }

  async getProductById(id: string): Promise<ProductResponse | null> {
    const snapshot = await this.firebaseService
      .getDatabase()
      .ref(`products/${id}`)
      .get();

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.val() as Omit<ProductResponse, 'id'>;

    return {
      id,
      ...data,
      notaMedia: Number(data.notaMedia ?? 0.0),
      totalAvaliacoes: data.totalAvaliacoes ?? 0,
    };
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<string> {
    const ref = await this.firebaseService.getDatabase().ref('products').push();

    await ref.set(product);

    return ref.key as string;
  }

  async updateProduct(
    id: string,
    product: Omit<ProductResponse, 'id'>,
  ): Promise<ProductResponse> {
    await this.firebaseService
      .getDatabase()
      .ref(`products/${id}`)
      .update(product);

    return {
      id,
      ...product,
      notaMedia: Number(product.notaMedia ?? 0.0),
      totalAvaliacoes: product.totalAvaliacoes ?? 0,
    };
  }

  async deleteProduct(id: string): Promise<void> {
    await this.firebaseService.getDatabase().ref(`products/${id}`).remove();
  }

  async clearPromotion(id: string): Promise<void> {
    await this.firebaseService.getDatabase().ref(`products/${id}`).update({
      isPromotional: false,
      discountPercentage: null,
      promotionEndDate: null,
    });
  }

  async atualizarAvaliacaoProduto(
    id: string,
    nota: number,
    notaAnterior?: number,
  ): Promise<{ notaMedia: number; totalAvaliacoes: number }> {
    interface ProductAvaliacao {
      totalAvaliacoes?: number;
      notaMedia?: number;
    }

    const ref = this.firebaseService.getDatabase().ref(`products/${id}`);

    const snapshot = await ref.get();
    const produto = snapshot.val() as ProductAvaliacao | null;

    const totalAtual = produto?.totalAvaliacoes ?? 0;
    const mediaAtual = produto?.notaMedia ?? 0;

    let novoTotal = totalAtual;
    let novaMedia: number;

    if (notaAnterior == null) {
      // Nova avaliação
      novoTotal = totalAtual + 1;
      novaMedia = Number(
        ((mediaAtual * totalAtual + nota) / novoTotal).toFixed(2),
      );
    } else {
      // Edição de avaliação
      const somaNotas = mediaAtual * totalAtual;
      novaMedia = Number(
        ((somaNotas - notaAnterior + nota) / totalAtual).toFixed(2),
      );
    }

    await ref.update({
      totalAvaliacoes: novoTotal,
      notaMedia: novaMedia.toFixed(2),
    });

    return { notaMedia: novaMedia, totalAvaliacoes: novoTotal };
  }
}
