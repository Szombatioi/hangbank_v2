import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Corpus } from 'src/corpus/entities/corpus.entity';
import { EntityManager } from 'typeorm';

@Injectable()
export class CorpusOwnerGuard implements CanActivate {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; //From AuthGuard
    const corpusId = request.params.corpusId || request.params.id;

    if (!user) {
      throw new ForbiddenException('httpErrors.unauthenticated');
    }
    if (!corpusId) {
      throw new BadRequestException('httpErrors.missingCorpusId');
    }

    const corpus = await this.entityManager.findOne(Corpus, {
      where: { id: corpusId },
      select: { id: true, uploaderId: true },
    });

    if (!corpus) {
      throw new NotFoundException('httpErrors.corpusNotFound');
    }
    if (corpus.uploaderId !== user.id) {
      throw new ForbiddenException('httpErrors.notCorpusOwner');
    }

    return true;
  }
}
