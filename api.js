const express = require('express');
const app = express();
const path = require('path');
const ytdl = require('ytdl-core');
const { spawn } = require('child_process')

let playing = false;
let queue = [];

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to fetch video info from YouTube URL
app.get('/stream', async (req, res) => {
    try {
        const videoUrl = req.query.url;
        streamYouTubeAudio(videoUrl);
        
        res.json({ playing: playing });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching video info.' });
    }
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const streamYouTubeAudio = async (url) => {
    if (playing) {
        queue.push(url);
        console.log(`Queued: ${url}`);
        return;
    }
    try {
        console.log(`Now Playing: ${url}`);
        const audioStream = ytdl(url, { filter: 'audioonly' });

        const ffmpeg = spawn('ffmpeg', [ '-i', 'pipe:0', '-ar', '48000', '-f', 'wav', '-b:a', '256','-ac', '2', 'pipe:1' ]);
        const ffplay = spawn('ffplay', [ '-i', 'pipe:0', '-nodisp', '-autoexit' ]);

        playing = true;

        audioStream.pipe(ffmpeg.stdin);
        ffmpeg.stdout.pipe(ffplay.stdin);

       ffmpeg.on('error', (err) => {
            console.log(`ffmpeg error: ${err}`);
        });

        ffplay.on('error', (err) => {
            console.log(`ffplay error: ${err}`);
        });

        ffmpeg.on('close', (code) => {
            console.log(`ffmpeg process exited with code ${code}`);
            playing = false;
            if (queue.length > 0) {
                streamYouTubeAudio(queue.shift());
            }
        });

        ffplay.on('close', (code) => {
            console.log(`ffplay process exited with code ${code}`);
            playing = false;
            if (queue.length > 0) {
                streamYouTubeAudio(queue.shift());
            }
        });
    } catch (error) {
        console.error('Error streaming audio:', error);
        playing = false;
    }
};
