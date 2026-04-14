import { PartialType } from '@nestjs/mapped-types';
import { CreateCorpusDomainDto } from './create-corpus-domain.dto';

export class UpdateCorpusDomainDto extends PartialType(CreateCorpusDomainDto) {}
