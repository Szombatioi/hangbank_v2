import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AudioFile } from './entities/audio-file.entity';
import { Repository } from 'typeorm';
import { S3StorageService } from 'src/s3-storage/s3-storage.service';
import { CreateAudioFileDto } from './dto/create-audio-file.dto';
import { Project } from 'src/project/entities/project.entity';
import { ProjectRoleType } from 'src/project/entities/project-role.enum';

@Injectable()
export class AudioFileService {
  constructor(
    @InjectRepository(AudioFile)
    private readonly audioFileRepository: Repository<AudioFile>,
    @Inject() private readonly s3StorageService: S3StorageService,
  ) {}

  /** Uploads the blob to S3 and persists the AudioFile metadata row pointing at it. */
  async create(dto: CreateAudioFileDto): Promise<AudioFile> {
    const buffer = Buffer.from(await dto.blob.arrayBuffer());
    const uploadable = {
      fieldname: 'audio',
      originalname: dto.name,
      encoding: '7bit',
      mimetype: dto.blob.type || 'audio/wav',
      size: buffer.length,
      buffer,
    } as Express.Multer.File;

    const { url } = await this.s3StorageService.uploadObject(
      uploadable,
      this.s3StorageService.audioBucket,
    );

    return this.audioFileRepository.save(
      this.audioFileRepository.create({
        name: dto.name,
        s3Link: url,
        durationSeconds: dto.durationSeconds,
        transcription: dto.transcription,
        project: { id: dto.projectId } as Project, //TODO ez jó?
      }),
    );
  }

  //Get db entity
  async get(id: string): Promise<AudioFile> {
    const audioFile = await this.audioFileRepository.findOne({
      where: { id },
      relations: ['project', 'audioQualities'],
    });
    if (!audioFile) {
      throw new NotFoundException(`AudioFile with id '${id}' not found`);
    }
    return audioFile;
  }

  // Loads an audio file and verifies the requester owns the file's project.
  async getForUser(id: string, requesterId: string): Promise<AudioFile> {
    const audioFile = await this.audioFileRepository.findOne({
      where: { id },
      relations: ['project', 'project.roles'],
    });
    if (!audioFile) {
      throw new NotFoundException(`AudioFile with id '${id}' not found`);
    }
    const isOwner = audioFile.project?.roles?.some(
      (r) => r.userId === requesterId && r.role === ProjectRoleType.OWNER,
    );
    if (!isOwner) {
      throw new ForbiddenException(`No access to audio file '${id}'`);
    }
    return audioFile;
  }

  /** Removes the AudioFile row and its underlying S3 object. */
  async remove(audioFile: AudioFile): Promise<void> {
    await this.audioFileRepository.delete({ id: audioFile.id });
    await this.s3StorageService.deleteObject(
      audioFile.s3Link,
      this.s3StorageService.audioBucket,
    );
  }
}
