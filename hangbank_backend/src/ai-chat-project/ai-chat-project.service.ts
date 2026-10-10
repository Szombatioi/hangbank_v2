import { Injectable } from '@nestjs/common';
import { Language } from 'src/language/entities/language.entity';
import { Project } from 'src/project/entities/project.entity';
import { Speaker } from 'src/project/entities/speaker.entity';
import { OneToOne, Column, ManyToOne } from 'typeorm';

@Injectable()
export class AiChatProjectService {}