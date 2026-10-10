import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12; // 96-bit IV
  private readonly tagLength = 16; // 128-bit Auth Tag
  private readonly key;

  constructor(@Inject() private readonly configService: ConfigService) {
    const enc_key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!enc_key) throw new BadRequestException();
    this.key = Buffer.from(enc_key, 'hex');
  }

  encrypt(text: string): string {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    const ciphertext = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const packed = Buffer.concat([iv, tag, ciphertext]);
    return packed.toString('base64');
  }

  decrypt(encrypted: string): string {
    const buffer = Buffer.from(encrypted, 'base64');
    const iv = buffer.subarray(0, this.ivLength);
    const tag = buffer.subarray(this.ivLength, this.ivLength + this.tagLength);
    const ciphertext = buffer.subarray(this.ivLength + this.tagLength);

    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}
