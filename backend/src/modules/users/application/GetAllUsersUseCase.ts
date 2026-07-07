import { UserRepository } from '../domain/UserRepository';
import { toPublicUser, UserPublic } from '../domain/User';

export class GetAllUsersUseCase {
  constructor(private readonly repo: UserRepository) {}

  async execute(): Promise<UserPublic[]> {
    const users = await this.repo.findAll();
    return users.map(toPublicUser);
  }
}
