`cd` to whisperlivekit, then
`git clone https://github.com/QuentinFuxa/WhisperLiveKit repo`

WebSocket: ws://localhost:8000/asr

Parameters:
**--pcm-input**: because we send raw s16le 16kHz PCM
--model: large-v3
--language: auto
--backend: faster-whisper
--backend-policy: localagreement or simulstreaming
--host: 0.0.0.0
--port: 8000

For GPU usage: (TODO?)
* Build Dockerfile image (not Dockerfile.cpu)


recorder.tsx connects once per record block