import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import { DOCKER_CLIENT } from './docker.constants';

@Global() // Optional: Makes DOCKER_CLIENT available across all modules without re-importing
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DOCKER_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Docker => {
        const socketPath = configService.get<string>(
          'DOCKER_SOCKET_PATH',
          process.platform === 'win32'
            ? '//./pipe/docker_engine'
            : '/var/run/docker.sock',
        );

        return new Docker({ socketPath });
      },
    },
  ],
  exports: [DOCKER_CLIENT],
})
export class DockerModule {}