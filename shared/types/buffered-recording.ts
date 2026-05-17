export interface BufferedRecording {
    blob: Blob;
    blockId: string;
    blockIndex: number; //only needed on the UI recording page
    durationSeconds: number; 
  }
  