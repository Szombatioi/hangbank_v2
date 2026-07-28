import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SupportText } from './entities/support-text.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SupportTextService {
    constructor(
        @InjectRepository(SupportText) private readonly supportTextRepository: Repository<SupportText>
    ){}

    async findAll(){
        const supportTexts = await this.supportTextRepository.find();
        return supportTexts;
    }

    //When creating one, make sure an English version already exists!
    async create(){

    }

    // modify
}
