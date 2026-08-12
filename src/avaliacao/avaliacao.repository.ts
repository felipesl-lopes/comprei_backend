import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';
import { OrdersRepository } from 'src/orders/orders.repository';
import {
  Avaliacao,
  AvaliacaoResponse,
  GerenciaAvaliacao,
} from './avaliacao.interface';
import { ProductsRepository } from 'src/products/products.repository';
import { UsersRepository } from 'src/users/users.repository';

@Injectable()
export class AvaliacaoRepository {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly orderRepository: OrdersRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async carregarAvaliacoesPorProduto(
    productId: string,
    userId: string,
  ): Promise<AvaliacaoResponse[]> {
    const snapshot = await this.firebaseService
      .getDatabase()
      .ref(`avaliacao/${productId}`)
      .get();

    const data = snapshot.val() as Record<string, Omit<Avaliacao, 'id'>> | null;

    if (!data) {
      return [];
    }

    const avaliacoes = await Promise.all(
      Object.entries(data).map(async ([id, avaliacao]) => {
        const nomeUsuario = await this.usersRepository.carregarNomeUsuario(
          avaliacao.usuarioId,
        );

        const { usuarioId, ...resto } = avaliacao;

        return {
          id,
          ...resto,
          nomeUsuario,
          dataCriacao: new Date(avaliacao.dataCriacao),
          minhaAvaliacao: usuarioId == userId,
        };
      }),
    );

    return avaliacoes;
  }

  async enviarAvaliacao(
    productId: string,
    avaliacao: GerenciaAvaliacao,
  ): Promise<{
    avaliacaoId: string;
    notaMedia: number;
    totalAvaliacoes: number;
  }> {
    const ref = await this.firebaseService
      .getDatabase()
      .ref(`avaliacao/${productId}`)
      .push();

    await ref.set({
      nota: avaliacao.nota,
      comentario: avaliacao.comentario,
      dataCriacao: avaliacao.dataCriacao,
      usuarioId: avaliacao.usuarioId,
    });

    await this.orderRepository.atualizarAvaliacaoId(
      avaliacao.usuarioId,
      avaliacao.orderId!,
      productId,
      ref.key!,
    );

    const { notaMedia, totalAvaliacoes } =
      await this.productsRepository.atualizarAvaliacaoProduto(
        productId,
        avaliacao.nota,
      );

    return {
      avaliacaoId: ref.key!,
      notaMedia,
      totalAvaliacoes,
    };
  }

  async editarAvaliacao(
    productId: string,
    avaliacao: GerenciaAvaliacao,
  ): Promise<{
    notaMedia: number;
    totalAvaliacoes: number;
  }> {
    const ref = this.firebaseService
      .getDatabase()
      .ref(`avaliacao/${productId}/${avaliacao.avaliacaoId}`);

    const snapshot = await ref.get();

    if (!snapshot.exists()) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    const avaliacaoAtual = snapshot.val() as GerenciaAvaliacao;

    if (avaliacaoAtual.usuarioId !== avaliacao.usuarioId) {
      throw new ForbiddenException('Você não pode editar esta avaliação.');
    }

    await ref.update({
      nota: avaliacao.nota,
      comentario: avaliacao.comentario,
    });

    const { notaMedia, totalAvaliacoes } =
      await this.productsRepository.atualizarAvaliacaoProduto(
        productId,
        avaliacao.nota,
        avaliacaoAtual.nota,
      );

    return {
      notaMedia,
      totalAvaliacoes,
    };
  }
}
