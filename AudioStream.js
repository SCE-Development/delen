const ytdl = require('ytdl-core');
const { exec } = require('child_process');

let PAUSE = 'echo \'{ "command": ["set_property", "pause", true] }\' | socat - /tmp/mpvsocket'
let RESUME = 'echo \'{ "command": ["set_property", "pause", false] }\' | socat - /tmp/mpvsocket'
module.exports = class AudioStream {
    constructor() {
        this.mpvs = []
        this.queue = []
        this.queuetoshow = []
        this.total = 0
        this.isPlaying = false
        this.current = 0
    }
    
    newMPV(index) {
        return exec(`mpv --no-video --force-window=no --input-ipc-server=/tmp/mpvsocket${index} -`)
    }

    pause(index=-1) {
        if(index == -1){
            console.log('pausing', this.current)
            console.log(`${PAUSE}${this.current}`)
            return exec(`${PAUSE}${this.current}`)
        }else{
            console.log('pausing index', index)
            return exec(`${PAUSE}${index}`)
        }
    }
    
    resume(index=-1) {
        if(index == -1){
            console.log('resuming', this.current)
            return exec(`${RESUME}${this.current}`)
        }else{
            console.log('resuming index', index)
            return exec(`${RESUME}${index}`)
        }
    }

    togglePauseResume() {
        return exec(`echo '{ "command": ["cycle", "pause"] }' | socat - /tmp/mpvsocket${this.current}`)
    }

    queueUp(url) {
        if(this.mpvs.length < 2){
            console.log('first if')
            this.buffer(url)
        }
        else{
            console.log('second if')
            this.queue.push(url)
            console.log(this.queue)
        }
        this.queuetoshow.push(url)
    }

    play() {
        let tuple = this.mpvs.shift()
        if(tuple[1]) this.resume(tuple[1])
        console.log(this.queue.length)
        if(this.queue.length > 0) this.buffer(this.queue.shift())
        this.isPlaying = true
        this.current = tuple[1]
    }

    isPlaying() {
      return this.isPlaying;
    }

    getQueue() {
      return this.queuetoshow;
    }

    async buffer(url) {
        this.total += 1
        let mpv = this.newMPV(this.total)
        this.mpvs.push([mpv, this.total])
        
        let stream = ytdl(url, { filter: 'audioonly' });
        stream.pipe(mpv.stdin);
        console.log('here')
        return new Promise((resolve) => {
            mpv.stdout.on('data', (data) => {
                if (data.toString().includes('AO: ')) {
                    console.log('pausing?')
                    this.pause(this.total)
                    if(!this.isPlaying){
                      this.queuetoshow.shift()
                      this.play()
                    }
                }
                if (data.toString().includes("Exiting")) {
                    this.isPlaying = false
                    this.queuetoshow.shift()
                    this.play()
                    resolve()
                }
            });
        })
    }

    skip() {
        this.pause(this.current)
        this.isPlaying = false
        this.play()
        return exec(`rm -f /tmp/mpvsocket${this.current} -`)
    }

    getTotal(){
        return this.total
    }
}
