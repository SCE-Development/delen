const ytdl = require('ytdl-core');
const { exec } = require('child_process');

let PAUSE = 'echo \'{ "command": ["set_property", "pause", true] }\' | socat - /tmp/mpvsocket'
let RESUME = 'echo \'{ "command": ["set_property", "pause", false] }\' | socat - /tmp/mpvsocket'
let PLAY = 'mpv --no-video --force-window=no --input-ipc-server=/tmp/mpvsocket -'
let KILL = 'killall mpv && killall ytdl'

module.exports = class AudioStream {
  constructor() {
    this.queue = [];
    this.playing = false;
    this.paused = false;
    this.ytdl = null;
    this.mpv = null;
  }

  async streamYouTubeAudio(url) {
    if (this.playing || this.paused) {
      this.queue.push(url);
      console.log(`Queued: ${url}`);
      return;
    }
    try {
      console.log(`Now Playing: ${url}`);

      if(this.ytdl != null){
        this.ytdl.end();
        this.ytdl.destroy();
      }

      this.ytdl = ytdl(url, { filter: 'audioonly' });
      this.mpv = exec(PLAY)
      this.playing = true;
      this.ytdl.pipe(this.mpv.stdin);

      this.mpv.stdout.on('data', (data) => {
        if(data.toString().includes("End of file")){
          this.playing  = false
          this.paused = false
          this.playNext() 
        }
      });
    } catch (error) {
      console.error('Error streaming audio:', error);
      this.playing = false;
    }
  }

  async pause() {
    if (!this.paused) {
      this.ytdl.pause();
      exec(PAUSE)
      this.paused = true;
      console.log('Paused.');
    }
  }

  async resume() {
    if (this.paused) {
      this.ytdl.resume();
      exec(RESUME)
      this.paused = false;
      console.log('Resumed.');
    }
  }

  async skip() {
    // Resume paused stream before killing everything
    if (this.paused) {
      this.ytdl.resume();
    }

    this.ytdl.end();
    this.ytdl.destroy();
    await new Promise(r => setTimeout(r, 2000)); // lets see if this work
    this.mpv.kill();
    exec(KILL)
    this.playing = false;
    this.playNext();
  }

  playNext() {
    if (this.queue.length > 0)
      this.streamYouTubeAudio(this.queue.shift());
  }

  isPlaying() {
    return this.playing;
  }

  isPaused() {
    return this.paused;
  }

  getQueue() {
    return this.queue;
  }
}


