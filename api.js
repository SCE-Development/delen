const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');

const AudioStream = require('./AudioStream')
let audioStream = new AudioStream();

app.use(express.static(path.join(__dirname, 'public')));

app.post('/stream', bodyParser.json(), async (req, res) => {
  try {
    const videoUrl = req.body.url;
    audioStream.streamYouTubeAudio(videoUrl);
    
    res.json({ playing: audioStream.isPlaying() });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching video info.' });
  }
});

app.post('/pause', async (req, res) => {
  if (!audioStream.isPlaying() || audioStream.isPaused()) {
    return res.status(400).json({ error: 'Cannot pause. Stream is not playing.' });
  }
  audioStream.pause();
  res.status(200).json('Paused.');
});

app.post('/resume', async (req, res) => {
  if (audioStream.isPlaying() && !audioStream.isPaused()) {
    return res.status(400).json({ error: 'Already playing. '});
  }
  if (!audioStream.isPlaying()) {
    return res.status(400).json({ error: 'Cannot resume. Stream is not playing.' });
  }
  audioStream.resume();
  res.status(200).json('Resumed.');
});

app.post('/skip', async (req, res) => {
  if (audioStream.getQueue().length == 0 && !audioStream.isPlaying()) {
    return res.status(400).json({ error: 'Nothing in queue!' });
  }
  audioStream.skip();
  res.status(200).json('Skipped.');
});

app.get('/queued', async (req, res) => {
  return res.status(200).json({ queue: audioStream.getQueue() });
});

app.get('/healthCheck', async (req, res) => {
  return res.status(200).json({ success: 'True' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
