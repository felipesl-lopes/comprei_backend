import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { Preferences } from './user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getPreferences(userId: string): Promise<Preferences> {
    const preferences = await this.usersRepository.getPreferences(userId);

    return preferences;
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<Preferences>,
  ): Promise<void> {
    await this.usersRepository.updatePreferences(userId, preferences);
  }
}
