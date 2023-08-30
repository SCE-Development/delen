const express = require('express');
const app = express();
const path = require('path');

const AudioStream = require('./AudioStream')
let audioStream = new AudioStream();

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to fetch video info from YouTube URL
app.get('/stream', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    audioStream.streamYouTubeAudio(videoUrl);
    
    res.json({ playing: audioStream.isPlaying() });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching video info.' });
  }
});

app.get('/pause', async (req, res) => {
  if (!audioStream.isPlaying() || audioStream.isPaused()) {
    return res.status(400).json({ error: 'Cannot pause. Stream is not playing.' });
  }
  audioStream.pause();
  res.status(200).json('Paused.');
});

app.get('/resume', async (req, res) => {
  if (audioStream.isPlaying() && !audioStream.isPaused()) {
    return res.status(400).json({ error: 'Already playing. '});
  }
  if (!audioStream.isPlaying()) {
    return res.status(400).json({ error: 'Cannot resume. Stream is not playing.' });
  }
  audioStream.resume();
  res.status(200).json('Resumed.');
});

app.get('/skip', async (req, res) => {
  if (audioStream.getQueue().length == 0 && !audioStream.isPlaying()) {
    return res.status(400).json({ error: 'Nothing in queue!' });
  }
  audioStream.skip();
  res.status(200).json('Skipped.');
});

app.get('/queued', async (req, res) => {
  return res.status(200).json({ queue: audioStream.getQueue() });
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
