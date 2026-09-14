## Redis queue design

`jobs` queue: \
Format: {  }

`workers` queue:\
Format: {  }

`results` queue:\
Format: {  }

## TPM service
* Polls queue info every 5 sec
* Spawns new workers (up to a limit) if the queue is too big
* ~~Stops workers if they are idle for 10mins~~

## Worker design
...


0. modify fw-worker to use faster-whisper instead of mlx_whisper
0. build fw-worker image
