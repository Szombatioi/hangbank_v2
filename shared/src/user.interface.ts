import type { IUserRole } from './user-role.interface.js';

export interface IUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  gender?: string | null;
  birthDate?: Date | string | null;
  roles: IUserRole[];
}
