import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProjectRoleType } from './project-role.enum';
import { Project } from './project.entity';

@Entity()
export class ProjectRole {
  @PrimaryColumn()
  userId!: string; // cross-service reference

  @PrimaryColumn()
  projectId!: string;

  @ManyToOne(() => Project, (p) => p.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project!: Project;

  @Column({ type: 'enum', enum: ProjectRoleType })
  role!: ProjectRoleType;
}
