const axios = require('axios');
const { exec } = require('child_process');

const ytdl = require('ytdl-core');

let PAUSE = 'echo \'{ "command": ["set_property", "pause", true] }\' | socat - /tmp/mpvsocket'
let RESUME = 'echo \'{ "command": ["set_property", "pause", false] }\' | socat - /tmp/mpvsocket'
let PLAY = 'mpv --no-video --force-window=no --input-ipc-server=/tmp/mpvsocket -'
let KILL = 'killall mpv && killall ytdl'
let BASE_URL = "https://www.youtube.com/oembed";

module.exports = class AudioStream {
  constructor() {
    this.queue = [];
    this.playing = false;
    this.paused = false;
    this.ytdl = null;
    this.mpv = null;
  }

  async updateSign(url) {
    try {
        const response = await axios.post(
            'http://192.168.69.143/api/update-sign',
            {
                'text': await this.getTitle(url),
                'scrollSpeed': '25',
                'backgroundColor': '#0000ff',
                'textColor': '#00ff00',
                'borderColor': '#ff0000',
                'email': 'sceadmin@sjsu.edu',
                'firstName': 'SCE'
            },
            {
                headers: {
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"'
                }
            }
        );
    } catch (error) {
        console.log(error);
    }
  }

  async getTitle(url) {
      try {
          const response = await axios.get(`${BASE_URL}?url=${encodeURIComponent(url)}`);
          return response.data.title;
      } catch (error) {
          console.log(error);
      }
  }

  async streamYouTubeAudio(url) {
    if (this.playing || this.paused) {
      this.queue.push(url);
      console.log(`Queued: ${url}`);
      return;
    }
    try {
      console.log(`Now Playing: ${url}`);
      this.updateSign(url);
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
          console.log("H")
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
    if (this.paused) {
      this.ytdl.resume();
    }

    this.ytdl.end();
    console.log("here")
    this.ytdl.destroy();
    console.log("here2")
    this.mpv.kill();
    console.log("here3")
    exec(KILL)
    console.log("here4")
    this.playing = false;
    // Need to have a sleep statement otherwise it doesnt work 
    await new Promise(r => setTimeout(r, 100)); 
    this.playNext();
    console.log("here5")
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


