export enum ProjectRoleType {
  VIEW = 'VIEW',
  EDITOR = 'EDITOR',
  OWNER = 'OWNER',
}

// Higher number = higher authority
export const PROJECT_ROLE_PRIORITY: Record<ProjectRoleType, number> = {
  [ProjectRoleType.VIEW]: 1,
  [ProjectRoleType.EDITOR]: 2,
  [ProjectRoleType.OWNER]: 3,
};
