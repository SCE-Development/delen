const { exec } = require('child_process');
const ytdl = require('ytdl-core');

let PAUSE = 'echo \'{ "command": ["set_property", "pause", true] }\' | socat - /tmp/mpvsocket';
let RESUME = 'echo \'{ "command": ["set_property", "pause", false] }\' | socat - /tmp/mpvsocket';

module.exports = class AudioStream {
    constructor() {
        this.mpvs = []; // buffered queue
        this.queue = []; // total queue
        this.total = 0; // used for pausing the buffered element
        this.isPlaying = false; // used to check if playing
        this.current = 0; // used for pausing/playing
        this.PIDs = []; // used for keeping track of PIDs
        this.totalQueue = []; // used for the entire queue to display 
        this.lastSkipTime = 0; // used to rate limit the skip 
        this.currentPID = 0; // used to skip the current PID 
    }

    newMPV(index, url) {
        // Create MPV instance with no video and specified socket
        let temp = exec(`mpv --cache=yes --no-video --force-window=no --cache-pause=yes --cache-pause-initial=yes --input-ipc-server=/tmp/mpvsocket${index}  "${url}"`);
        this.PIDs.push(temp.pid);
        console.log(temp.pid, 'MPV process created');
        return temp;
    }

    pause(index = -1) {
        if (index == -1) {
            console.log('pausing', this.current);
            return exec(`${PAUSE}${this.current}`);
        } else {
            console.log('pausing index', index);
            return exec(`${PAUSE}${index}`);
        }
    }

    resume(index = -1) {
        if (index == -1) {
            console.log('resuming', this.current);
            return exec(`${RESUME}${this.current}`);
        } else {
            console.log('resuming index', index);
            return exec(`${RESUME}${index}`);
        }
    }

    rewind() {
        return exec(`echo '{ "command": ["seek", -10] }' | socat - /tmp/mpvsocket${this.current}`);
    }

    forward() {
        return exec(`echo '{ "command": ["seek", 5] }' | socat - /tmp/mpvsocket${this.current}`);
    }

    togglePauseResume() {
        return exec(`echo '{ "command": ["cycle", "pause"] }' | socat - /tmp/mpvsocket${this.current}`);
    }

    isName(str) {
        let start_index = str.indexOf("}]},\"title\":{\"runs\":[{\"text\"");
        if (start_index === -1) return true;
        let isName = str.substring(start_index + 30);
        isName = isName.substring(isName.indexOf('"'), isName.indexOf('"') + 24);
        return isName.includes("navigationEndpoint");
    }

    async extractVideoInfo(url) {
        if (url.includes("playlist")) {
            console.log(url)
            try {
                let remainingOutput = await fetch(url).then(res => res.text());
                let videoCount = 0;

                while (remainingOutput.length > 0) {
                    console.log(remainingOutput.length)
                    try {
                        const ind = remainingOutput.indexOf("videoId");
                        const temp = remainingOutput.substring(ind, ind + 1500);

                        if (this.isName(temp)) throw new Error("Is a name pass");
                        let videoId = temp.substring(temp.indexOf('"') + 3, temp.indexOf('"') + 20);
                        videoId = videoId.substring(0, videoId.indexOf('"'));

                        let thumbnail = temp.substring(temp.indexOf("thumbnails\":[{\"url\"") + 21, temp.indexOf("thumbnails\":[{\"url\"") + 221);
                        thumbnail = thumbnail.substring(0, thumbnail.indexOf('"'));

                        let title = temp.substring(temp.indexOf("}]},\"title\":{\"runs\":[{\"text\"") + 30, temp.indexOf("}]},\"title\":{\"runs\":[{\"text\"") + 145);
                        title = title.substring(0, title.indexOf('"'));

                        remainingOutput = remainingOutput.substring(ind + 1500);

                        const mediaItem = { title, url: `https://www.youtube.com/watch?v=${videoId}`, thumbnail };
                        
                        this.queue.push(mediaItem)
                        this.totalQueue.push(mediaItem)
                    }
                    catch {
                        remainingOutput = remainingOutput.substring(300);
                    }
                }
                if (this.mpvs.length < 2) {
                    this.buffer(this.queue.shift().url);
                }
            }
            catch (error) {
                console.log(error)
                console.error("Error fetching video info:", error);
            }
        }
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
            console.log("Added to queue:", title);
        } catch (error) {
            console.error("Error fetching video info:", error);
        }
    }

    // This is the function that handles placing the urls into the queue
    queueUp(url) {
        // if it is a playlist, run the function that gets each of the URLs
        if (url.includes("playlist")) {
            this.extractVideoInfo(url);
        } else {
            // Otherwise we want to check if mpv array is less than 2, if it is, buffer it
            if (this.mpvs.length < 2) {
                this.buffer(url);
            }
            else {
                // otherwise just push it to the queue
                this.addToQueue(url);
            }
            // add to total queue for displaying 
            this.totalQueue.push(url);
        }
    }

    play() {
        let tuple = this.mpvs.shift();
        this.totalQueue.shift();
        console.log('here', this.queue, this.totalQueue, tuple, 'tuple')
        if (tuple != null) {
            if (tuple[1]) {
                this.resume(tuple[1]);
            }
            if (this.queue.length > 0) this.buffer(this.queue.shift().url);
            if (!this.isPlaying) this.isPlaying = true;
            this.current = tuple[1];
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
                    s.add("https://www.youtube.com/watch?v=" + videoId);
                }
                temp = temp.substring(ind + 21);
            }
        } catch (error) {
            console.error('Error:', error);
        }
        for (const video of Array.from(s)) {
            this.queueUp(video);
        }
    }

    // Function responsible for buffering the audio using yt-dlp command
    // Function responsible for buffering the audio using yt-dlp command
async buffer(url) {
    this.total += 1;
    const socketPath = `/tmp/mpvsocket${this.total}`;
    
    console.log(`Getting audio URL for ${url}...`);
    
    // Get the audio URL first
    exec(`yt-dlp -f bestaudio -g "${url}"`, async (error, stdout, stderr) => {
        if (error) {
            console.error(`Error getting audio URL: ${error.message}`);
            return;
        }
        
        const audioURL = stdout.trim();
        console.log(`Audio URL obtained: ${audioURL.substring(0, 30)}...`);
        
        let mpv = this.newMPV(this.total, audioURL)
        
        // Push to queue and pause initially
        this.mpvs.push([mpv, this.total]);
        
        // Add delay to ensure MPV has started
        setTimeout(() => {
            this.pause(this.total);
            if (!this.isPlaying) this.play();
        }, 1000);
        
        mpv.stdout.on('data', (data) => {
            // console.log(data.toString());
            if (data.toString().includes("Exiting") || data.toString().includes("underrun")) {
                exec(`rm -f ${socketPath}`);
                console.log('MPV exited');
                this.isPlaying = false;
                this.PIDs.shift();
                this.play();
            }
        });
    });
}
    skip() {
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.lastSkipTime;

        if (elapsedTime < (30 * 1000)) { // 30 seconds cooldown
            return false;
        } else {
            this.lastSkipTime = currentTime; // Update last skip time
            exec(`echo '{ "command": ["quit", "9"] }' | socat - /tmp/mpvsocket${this.current}`);
            return true;
        }
    }

    setVolume(volume) {
        return exec(`echo '{ "command": ["set_property", "volume", ${volume}] }' | socat - /tmp/mpvsocket${this.current}`);
    }
    
    getTotal() {
        return this.total;
    }

    getQueue() {
        return this.totalQueue;
    }
};