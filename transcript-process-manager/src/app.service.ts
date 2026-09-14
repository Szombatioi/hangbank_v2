import { Inject, Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { spawn } from 'child_process';
import Redis from 'ioredis';
import * as Docker from 'dockerode';
import { DOCKER_CLIENT } from './docker/docker.constants';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private readonly MAX_PROCESSES = 2; //TODO env
  private readonly BATCH_SIZE = 50;
  private readonly REDIS_URL;
  private readonly redis;

  constructor(
    @Inject(DOCKER_CLIENT) private readonly docker: Docker,
    @InjectQueue('jobs') private readonly jobQueue: Queue,
    @InjectQueue('results') private readonly resultsQueue: Queue,
    private readonly httpService: HttpService,
    private configService: ConfigService
  ){
    this.REDIS_URL = this.configService.get<string>("REDIS_URL", "redis://localhost:6379");
    this.redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  }

  @Interval(5_000)
  async pollQueueSize(){
    console.log("Queue size polled")
    //How many tasks are in the queue (except those that are already picked up!)
    const waitingCount = await this.jobQueue.getWaitingCount();
    const workerCount = await this.getActiveWorkerCount();

    //Try to spawn a new worker if there are twice as much tasks
    if (waitingCount > workerCount * 2 && workerCount < this.MAX_PROCESSES) {
      this.startWorker();
    }


    //Kill processes if they are inactive for too long
      //No: the script will end itself
    // const now = Date.now();
    // const times = await this.redis.hgetall('worker:last_active');
    // const idleWorkers = Object.entries(times)
    //   .filter(([, lastActive]) => now - Number(lastActive) >= 10 * 60 * 1000)
    //   .map(([name]) => name);
    
    // idleWorkers.forEach(name => {
    //   spawn("docker", ["stop", "-t", String(60 * 10), name]);
    // });
  }

  //Poll results and send them for saving back to the backend
  @Interval(10_000)
  async pollResultsQueue(): Promise<void>{
    console.log("Polled results")
    const resultJobs = await this.resultsQueue.getWaiting(0, this.BATCH_SIZE - 1);
    
    if (!resultJobs || resultJobs.length === 0) {
      console.log("No result jobs found in the results queue.");
      return;
    }

    console.log(`Found ${resultJobs.length} result jobs in the results queue. Sending to backend...`);

    //job.data = { audio_id, transcription }
    const payload = resultJobs.map((job) => job.data);
    await this.httpService.patch(
      `${this.configService.get<string>("BACKEND_URL", "localhost:3001")}/audio/transcriptions/batch`, //TODO maintain endpoint in backend
      payload
    )
    
    //TODO remove this post-testing
    console.log("Arrived results:")
    for(const job of resultJobs){
      console.log(job.data);
    }

    await Promise.all(resultJobs.map((job) => job.remove()));
  }

  async getActiveWorkerCount(): Promise<number> {
    const containers = await this.docker.listContainers({
      filters: {
        label: ['app.service=whisper-batch-worker'],
        status: ['running'],
      },
    });

    return containers.length;
  }

  private async startWorker(): Promise<void> {
    const containerName = `whisper-batch-worker-${Date.now()}`;
    const container = await this.docker.createContainer({
      Image: this.configService.get<string>("FW_IMAGE", "fw-worker:latest"),
      name: containerName,
      Labels: {
        'app.service': this.configService.get<string>("FW_LABEL", "whisper-batch-worker"),
        'app.managed-by': 'tms',
      },
      Env: [
        `REDIS_URL=${this.configService.get<string>("REDIS_ID", this.REDIS_URL)}`,
        `JOBS_QUEUE=${this.configService.get<string>("JOBS_QUEUE", "jobs")}`,
        `RESULTS_QUEUE=${this.configService.get<string>("RESULTS_QUEUE", "results")}`,
        `MODEL_NAME=${this.configService.get<string>("MODEL_NAME", "tiny")}`,
        `S3_URL=${this.configService.get<string>("S3_URL", "http://host.docker.internal:3005")}`,
        `AUDIO_BUCKET=${this.configService.get<string>("AUDIO_BUCKET", "audio")}`,
      ],
      HostConfig: {
        // AutoRemove: true, //TODO: true in prod
        NetworkMode: 'hangbank_test', //TODO: needed?
        // DeviceRequests: [ //TODO: remove for testing, uncomment for prod
        //   {
        //     Driver: 'nvidia',
        //     Count: -1,
        //     Capabilities: [['gpu']],
        //   },
        // ],
      },
    });

    await container.start();
    console.log("Started new worker container:", containerName);
  }
}
