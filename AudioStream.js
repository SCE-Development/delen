const ytdl = require('ytdl-core');
const { exec } = require('child_process');


let PAUSE = 'echo \'{ "command": ["set_property", "pause", true] }\' | socat - /tmp/mpvsocket'
let RESUME = 'echo \'{ "command": ["set_property", "pause", false] }\' | socat - /tmp/mpvsocket'
module.exports = class AudioStream {
    constructor() {
        this.mpvs = []
        this.queue = []
        this.total = 0
        this.isPlaying = false
        this.current = 0
        this.PIDs = []
        this.totalQueue = []
        this.lastSkipTime = 0;
    }

    newMPV(index) {
        let temp = exec(`mpv --no-video --force-window=no --input-ipc-server=/tmp/mpvsocket${index} -`)
        this.PIDs.push(temp.pid)
        console.log(temp.pid)
        return temp
    }

    pause(index = -1) {
        if (index == -1) {
            console.log('pausing', this.current)
            console.log(`${PAUSE}${this.current}`)
            return exec(`${PAUSE}${this.current}`)
        } else {
            console.log('pausing index', index)
            return exec(`${PAUSE}${index}`)
        }
    }

    resume(index = -1) {
        if (index == -1) {
            console.log('resuming', this.current)
            return exec(`${RESUME}${this.current}`)
        } else {
            console.log('resuming index', index)
            return exec(`${RESUME}${index}`)
        }
    }

    togglePauseResume() {
        return exec(`echo '{ "command": ["cycle", "pause"] }' | socat - /tmp/mpvsocket${this.current}`)
    }

    queueUp(url) {
        if(url.includes("playlist")){
            this.extractVideoIds(url)
        }else{
            if (this.mpvs.length < 2) {
                console.log('first if')
                this.buffer(url)
            }
            else {
                console.log('second if')
                this.queue.push(url)
                console.log(this.queue)
            }
            this.totalQueue.push(url)
        }
    }

    play() {
        let tuple = this.mpvs.shift()
        this.totalQueue.shift()
        if (tuple != null) {
            if (tuple[1]) {
                console.log('in here ')
                this.resume(tuple[1])
                console.log(this.PIDs)
            }
            console.log(this.queue.length)
            if (this.queue.length > 0) this.buffer(this.queue.shift())
            if(!this.isPlaying) this.isPlaying = true
            this.current = tuple[1]
        }
    }


    async extractVideoIds(url) {
        const s = new Set();
        try {
            let temp = await fetch(url).then(res => res.text());
            while (temp !== "") {
                const ind = temp.indexOf('videoId');
                if (temp.substring(ind, ind + 40).includes("videoId")) {
                    const videoIdStart = ind + 10;
                    const videoIdEnd = ind + 23;
                    const videoId = temp.substring(videoIdStart, videoIdEnd).replace(/["\[\],]/g, "");
                    console.log(temp.substring(ind, ind + 40))
                    s.add("https://www.youtube.com/watch?v=" + videoId);
                }
                temp = temp.substring(ind + 21);
            }
        } catch (error) {
            console.error('Error:', error);
        }
        for (const video of Array.from(s)) {
            this.queueUp(video)
            // You can print something for each video ID here
        };
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
                console.log(data.toString())
                if (data.toString().includes('AO: ')) {
                    console.log('pausing?')
                    this.pause(this.total)
                    if (!this.isPlaying) this.play()
                }
                if (data.toString().includes("Exiting") || data.toString().includes("underrun")) {
                    exec(`rm -f /tmp/mpvsocket${this.current}`)
                    console.log('exiting')
                    this.isPlaying = false
                    this.PIDs.shift()
                    this.play()
                    resolve()
                }
            });
        })
    }

    skip() {
        const currentTime = Date.now();
        const elapsedTime = currentTime - lastSkipTime;

        if (elapsedTime < 30000) { // 30 seconds in milliseconds
            return false; // If less than 30 seconds have passed since last call, return false
        } else {
            this.lastSkipTime = currentTime; // Update last skip time
            exec(`kill -9 ${this.PIDs.shift()}`);
            return true; // If 30 seconds or more have passed since last call, return true
        }
    }
    
    getTotal() {
        return this.total
    }

    getQueue() {
        return this.totalQueue
    }
}
