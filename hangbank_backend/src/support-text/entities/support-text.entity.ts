import { Language } from "src/language/entities/language.entity";
import { Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class SupportText {
    @PrimaryGeneratedColumn('uuid')
    id!: string;


    title!: string;
    shortDescription!: string;
    longDescription!: string;

    //language
    @ManyToOne(() => Language)
    @JoinColumn()
    language!: Language;
}