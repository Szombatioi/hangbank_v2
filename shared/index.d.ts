export interface IUserRole {
  id: string;
  role: string;
  priority: number;
}

export interface IUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  roles: IUserRole[];
}

export interface IJwtPayload {
  id: string;
  email: string;
}
