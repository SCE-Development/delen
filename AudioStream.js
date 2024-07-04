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
        let temp = exec(`mpv --cache=yes --no-video --force-window=no --cache-pause=yes --cache-pause-initial=yes --input-ipc-server=/tmp/mpvsocket${index} -`)
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

    rewind(){
        return exec(`echo '{ "command": ["seek", -10] }' | socat - /tmp/mpvsocket${this.current}`)
    }

    forward(){
        return exec(`echo '{ "command": ["seek", 5] }' | socat - /tmp/mpvsocket${this.current}`)
    }

    togglePauseResume() {
        return exec(`echo '{ "command": ["cycle", "pause"] }' | socat - /tmp/mpvsocket${this.current}`)
    }

    async addToQueue(url) {
        try {
            const info = await ytdl.getInfo(url);
            // Extract the video title
            const title = info.videoDetails.title;
            // Extract the array of thumbnails
            const thumbnails = info.videoDetails.thumbnails;
            // Retrieve the URL of the largest thumbnail (usually the last one in the array)
            const largestThumbnail = thumbnails[thumbnails.length - 1].url;
            const mediaItem = { title, url, thumbnail: largestThumbnail };
            this.queue.push(mediaItem);
            console.log(this.queue)
        } catch (error) {
            console.error("Error fetching video info:", error);
        }
    }

    // This is the function that handles placing the urls into the queue
    queueUp(url) {
        // if it is a playlist, run the function that gets each of the URLs
        if(url.includes("playlist")){
            this.extractVideoIds(url)
        }else{
            // Otherwise we want to check if mpv array is less than 2, if it is, buffer it
            if (this.mpvs.length < 2) {
                this.buffer(url)
            }
            else {
                // otherwise just push it to the queue
                // this.queue.push(url)
                this.addToQueue(url);
            }
            // add to total queue for displaying 
            this.totalQueue.push(url)
        }
    }

    play() {
        let tuple = this.mpvs.shift()
        this.totalQueue.shift()
        if (tuple != null) {
            if (tuple[1]) {
                this.resume(tuple[1])
            }
            if (this.queue.length > 0) this.buffer(this.queue.shift().url)
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
        };
    }


    // Function responsible for buffering the audio
    async buffer(url) {
        // increase the total so know what it is Useful for later
        this.total += 1
        // create a new mpv 
        let mpv = this.newMPV(this.total)
        // push the MPV into the mpv queue 
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

        if (elapsedTime < (30 * 1000)) { // 30 seconds put the amount of seconds you want on the left 
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
