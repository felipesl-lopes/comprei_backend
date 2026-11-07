import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from 'src/auth/firebase_auth_guard';
import { Preferences } from './user.interface';
import type { AuthenticatedRequest } from 'src/address/authenticate_request.interface';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(FirebaseAuthGuard)
  @Get('preferences')
  async getPreferences(@Req() req: AuthenticatedRequest): Promise<Preferences> {
    return this.usersService.getPreferences(req.user.uid);
  }

  @UseGuards(FirebaseAuthGuard)
  @Patch('preferences')
  async updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() preferences: Partial<Preferences>,
  ): Promise<void> {
    await this.usersService.updatePreferences(req.user.uid, preferences);
  }
}
