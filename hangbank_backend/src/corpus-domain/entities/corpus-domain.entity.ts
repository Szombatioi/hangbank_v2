import { Entity, PrimaryColumn } from "typeorm";

@Entity()
export class CorpusDomain {
    @PrimaryColumn()
    name!: string;
}
