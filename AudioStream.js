const ytdl = require('ytdl-core');
const { spawn } = require('child_process');

module.exports = class AudioStream {
  constructor() {
    this.queue = [];
    this.playing = false;
    this.paused = false;
    this.ytdl = null;
    this.ffmpeg = null;
    this.ffplay = null;
  }

  async streamYouTubeAudio(url) {
    if (this.playing || this.paused) {
      this.queue.push(url);
      console.log(`Queued: ${url}`);
      return;
    }
    try {
      console.log(`Now Playing: ${url}`);

      this.ytdl = ytdl(url, { filter: 'audioonly' });
      this.ffmpeg = spawn('ffmpeg', [ '-i', 'pipe:0', '-ar', '48000', '-f', 'wav', '-b:a', '256','-ac', '2', 'pipe:1' ]);
      this.ffplay = spawn('ffplay', [ '-i', 'pipe:0', '-nodisp', '-autoexit' ]);

      this.playing = true;

      this.ytdl.pipe(this.ffmpeg.stdin);
      this.ffmpeg.stdout.pipe(this.ffplay.stdin);

      this.ffmpeg.on('error', (err) => {
        console.log(`ffmpeg error: ${err}`);
      });

      this.ffplay.on('error', (err) => {
        console.log(`ffplay error: ${err}`);
      });

      this.ffmpeg.on('close', (code) => {
        console.log(`ffmpeg process exited with code ${code}`);
        this.ffplay.kill();
      });

      this.ffplay.on('close', (code) => {
        console.log(`ffplay process exited with code ${code}`);

        this.playing = false;
        this.playNext();
      });
    } catch (error) {
      console.error('Error streaming audio:', error);
      this.playing = false;
    }
  }

  pause() {
    if (!this.paused) {
      this.ytdl.pause();
      this.ffmpeg.kill('SIGSTOP');
      this.ffplay.kill('SIGSTOP');
      this.paused = true;
      console.log('Paused.');
    }
  }

  resume() {
    if (this.paused) {
      this.ytdl.resume();
      this.ffmpeg.kill('SIGCONT');
      this.ffplay.kill('SIGCONT');
      this.paused = false;
      console.log('Resumed.');
    }
  }

  skip() {
    //resume paused stream before killing everything
    if (this.paused) {
      this.ytdl.resume();
      this.ffmpeg.kill('SIGCONT');
      this.ffplay.kill('SIGCONT');
    }

    this.ytdl.end();
    this.ytdl.destroy();

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