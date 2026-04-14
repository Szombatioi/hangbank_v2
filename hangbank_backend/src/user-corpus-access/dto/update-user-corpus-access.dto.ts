import { PartialType } from '@nestjs/mapped-types';
import { CreateUserCorpusAccessDto } from './create-user-corpus-access.dto';

export class UpdateUserCorpusAccessDto extends PartialType(CreateUserCorpusAccessDto) {}
