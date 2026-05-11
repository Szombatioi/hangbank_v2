class RecorderProcessor extends AudioWorkletProcessor {
    process(inputs) {
      const input = inputs[0];
      if (input.length > 0) {
        this.port.postMessage(input[0].slice());
      }
      return true;
    }
  }
  
  registerProcessor("recorder-processor", RecorderProcessor);