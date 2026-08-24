import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CorpusVisibility } from 'src/corpus/entities/corpus-visibility';
import { Corpus } from 'src/corpus/entities/corpus.entity';
import { UserCorpusAccess } from 'src/user-corpus-access/entities/user-corpus-access.entity';
import { EntityManager } from 'typeorm';

@Injectable()
export class UserCorpusAccessGuard implements CanActivate {
    constructor(
        @InjectEntityManager() private readonly entityManager: EntityManager,
    ) {}

    //User has permissions if:
    //1. User is the uploader
    //2. Corpus is public
    //3. Corpus is protected and user has access to it
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; //From AuthGuard
    const corpusId = request.params.corpusId || request.params.id;

    if (!user) {
      throw new ForbiddenException('httpErrors.unauthenticated');
    }

    if (!corpusId) {
      throw new BadRequestException('httpErrors.missingCorpusId'); //TODO: translate
    }

    const corpus = await this.entityManager.findOne(Corpus, {
        where: {
            id: corpusId,
        },
        relations: {
            userCorpusAccesses: true,
        }
    });

    if(!corpus) throw new NotFoundException('httpErrors.corpusNotFound'); //TODO: translate

    if(corpus.uploaderId === user.id) return true;
    if(corpus.visibility === CorpusVisibility.PUBLIC) return true;
    if(corpus.visibility === CorpusVisibility.PROTECTED) return corpus.userCorpusAccesses.some(access => access.userId === user.id);

    return false;
  }
}
