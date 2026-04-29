export class CreateCorpusProjectDto{
    projectName!: string;
    description?: string | undefined | null;
    samplingRate!: number;
    recordingEnvironment?: string | undefined | null;
    corpusId!: string;
    speaker!: {
        id: string;
        speechCharacteristics?: string | undefined | null;
    };
    microphoneDeviceId!: string; //To tell if the mic is available for recording everytime we start the project
}