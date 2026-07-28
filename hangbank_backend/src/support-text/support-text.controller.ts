import { Controller } from '@nestjs/common';
import { SupportTextService } from './support-text.service';

@Controller('support-text')
export class SupportTextController {
  constructor(private readonly supportTextService: SupportTextService) {}
}
