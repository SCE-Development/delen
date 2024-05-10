const ytdl = require('ytdl-core');
const { exec } = require('child_process');


let PAUSE = 'echo \'{ "command": ["set_property", "pause", true] }\' | socat - /tmp/mpvsocket'
let RESUME = 'echo \'{ "command": ["set_property", "pause", false] }\' | socat - /tmp/mpvsocket'
module.exports = class AudioStream {
    constructor() {
        this.mpvs = [] // buffered queue
        this.queue = [] // total queue
        this.total = 0 // used for pausing the buffered element
        this.isPlaying = false // used to check if playing
        this.current = 0 // used for pausing/playing
        this.PIDs = [] // used for keeping track of PIDs
        this.totalQueue = [] // used for the entire queue to display 
        this.lastSkipTime = 0; // used to rate limit the skip 
        this.currentPID = 0; // used to skip the current PID 
    }

    newMPV(index) {
        let temp = exec(`mpv --cache=yes --pulse-buffer=2000 --cache-pause=yes --cache-pause-initial=yes --input-ipc-server=/tmp/mpvsocket${index} -`)
        this.PIDs.push(temp.pid)
        console.log(temp.pid, 'here')
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
                console.log(this.PIDs, '76')
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
        const elapsedTime = currentTime - this.lastSkipTime;

        if (elapsedTime < (10 * 1000)) { // 30 seconds put the amount of seconds you want on the left 
            return false; 
        } else {
            this.lastSkipTime = currentTime; // Update last skip time
            exec(`echo '{ "command": ["quit", "9"] }' | socat - /tmp/mpvsocket${this.current}`)
            return true
        }
    }
    
    getTotal() {
        return this.total
    }

    getQueue() {
        return this.totalQueue
    }
}
