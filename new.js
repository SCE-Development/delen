const ytdl = require('ytdl-core');
const { spawn } = require('child_process');

const videoUrl = 'https://www.youtube.com/watch?v=8xy8qIjdC3g'; // Replace with the YouTube video URL you want to play

// Create a readable stream from the YouTube video URL
const audioStream = ytdl(videoUrl, { filter: 'audioonly' });

// Spawn mpv and pipe the audio stream to it
const mpv = spawn('mpv', ['--no-video', '--force-window=no', '-'], {
  stdio: ['pipe', 'pipe', 'ignore'], // Pipe stdin and stdout
});

audioStream.pipe(mpv.stdin);

mpv.on('exit', (code) => {
  console.log(`mpv process exited with code ${code}`);
});

process.on('SIGINT', () => {
  // Close the mpv process when Ctrl+C is pressed
  mpv.kill('SIGINT');
});

