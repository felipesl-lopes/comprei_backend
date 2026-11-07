import { Injectable } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Preferences } from './user.interface';

@Injectable()
export class UsersRepository {
  constructor(private readonly firebaseService: FirebaseService) {}

  async carregarNomeUsuario(userId: string): Promise<string> {
    const snapshot = await this.firebaseService
      .getDatabase()
      .ref(`users/${userId}`)
      .get();

    const user = snapshot.val() as { name?: string } | null;

    return user?.name ?? '';
  }

  async getPreferences(userId: string): Promise<Preferences> {
    const ref = this.firebaseService
      .getDatabase()
      .ref(`users/${userId}/preferences`);

    const snapshot = await ref.get();

    if (snapshot.exists()) {
      return snapshot.val() as Preferences;
    }

    const preferences: Preferences = {
      exibirProdutosFavoritos: true,
      exibirProdutosVisualizados: true,
      notificarAtualizacaoPedido: true,
      notificarPromocoes: true,
      receberNotificacoes: true,
      salvarHistoricoVisualizacao: true,
    };

    await ref.set(preferences);

    return preferences;
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<Preferences>,
  ): Promise<void> {
    await this.firebaseService
      .getDatabase()
      .ref(`users/${userId}/preferences`)
      .update(preferences);
  }
}
