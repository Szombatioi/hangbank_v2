import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import path from 'path';
import FormData_ from 'form-data';
import axios from 'axios';

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService
  ) {}


  private whisperProcesses: Map<string, any> = new Map(); //language - process pairs
  //TODO: add whisper process-port pairs to support multiple whisper servers for different languages
  private whisperTimers: Map<string, NodeJS.Timeout> = new Map(); //language - timer pairs
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  // private languageMap: Map<string, string> = new Map();
  private supportedLanguages = ['en', 'de', 'hu'];

  //Starts a process with a whisper server
  //Model: optional, by default: ggml-large-v3-turbo-q5_0.bin
  startWhisperServer(language: string){
    //Check language - splitting along "-" in case of language codes like "en-US"
    const lang = language.split("-")[0];
    if (!this.supportedLanguages.includes(lang)) {
      throw new Error(`Language not supported: ${language}`); //TODO: the controller should post a message to a separate kafka topic
    }

    if (this.whisperProcesses.has(lang)) {
      console.log(`Whisper server for language ${lang} is already running.`);
      return;
    }

    //Start the whisper server process
    const whisperPath = path.join(process.cwd(), 'whisper.cpp', 'build', 'bin', 'whisper-server');
    const whisperProcess = spawn(
      whisperPath, [
        '-l', lang,
        '-m', path.join(process.cwd(), 'whisper.cpp', 'models', 'ggml-large-v3-turbo-q5_0.bin'), //TODO: replace model
        '--port', '8888' //TODO: replace port with dynamic port assignment for multiple whisper servers
      ]
    );

    whisperProcess.stdout.on('data', (data) => {
      console.log(`Whisper server (${lang}) stdout: ${data}`);
    });

    whisperProcess.on('close', () => {
      this.whisperProcesses.delete(lang);
    });
    this.whisperProcesses.set(lang, whisperProcess);

    //Start timer for process
    const idleTimer = setTimeout(() => {
      if(this.whisperProcesses.has(lang)){
        console.log(`Whisper server for language ${lang} has been idle for ${this.IDLE_TIMEOUT_MS / 1000} seconds. Stopping the server.`);
        this.whisperProcesses.get(lang).kill('SIGTERM');
        this.whisperProcesses.delete(lang);
        this.whisperTimers.delete(lang);
      }
    }, this.IDLE_TIMEOUT_MS);
    this.whisperTimers.set(lang, idleTimer);
  }

  //Sends the audio file to the whisper server for transcription and returns the transcribed text
  //Starts the server for the given language if it does not exists
  submitAudioFile(language: string){
    const lang = language.split("-")[0];
    if (!this.supportedLanguages.includes(lang)) {
      throw new Error(`Language not supported: ${language}`); //TODO: the controller should post a message to a separate kafka topic
    }
    
    //Does the process exist? IF not, start, if yes, reset the timer
    if(this.whisperProcesses.has(lang)){
      //reset timer
      this.whisperTimers.get(lang)?.refresh();
    }else{
      this.startWhisperServer(lang);
    }


  }

  async sendHttpRequestToWhisperServer(file: Buffer){
    let buffer: any;
    let filename: string = 'x';

    const form = new FormData_();
    form.append('file', buffer, {
      filename: filename,
      contentType: 'audio/wav'
    });
    form.append('temperature', '0.0');
    form.append('temperature_inc', '0.2');
    form.append('no_speech_thold', '0.6');
    form.append('response_format', 'text');

    const url = process.env.WHISPER_SERVER_URL ?? 'http://localhost:8888/inference';
    
    try{
      const res = await axios.post(url, form, {
        headers: {
          ...form.getHeaders()
        }
      });

      return res.data;
    } catch(err){
      console.log(`Error sending request to whisper server: ${err}`);
      throw err;
    }

  }
}
