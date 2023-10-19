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

/**
 * /setVolume post request expects the following JSON body:
 * @param {number} volume - The volume to set the stream to. Must be between 0 and 100.
 */
app.post('/setVolume', bodyParser.json(), async (req, res) => {
  try {
    const volume = Number(req.body.volume);
    if (volume <= 0 || volume >= 100) {
      return res.status(400).json({ error: 'Volume must be between 0 and 100.' });
    }
    if (Number.isNaN(volume)) {
      return res.status(400).json({ error: 'Volume must be a number.' });
    }
    audioStream.setVolume(volume);
    res.json({ volume: volume });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while setting volume.' });
  }
});

app.get('/volume', async (req, res) =>
  res.json({ volume: audioStream.getVolume() })
);

app.post('/pause', async (req, res) => {
  if (!audioStream.isPlaying() || audioStream.isPaused()) {
    return res.status(400).json({ error: 'Cannot pause. Stream is not playing.' });
  }
  audioStream.pause();
  res.json('Paused.');
});

app.post('/resume', async (req, res) => {
  if (audioStream.isPlaying() && !audioStream.isPaused()) {
    return res.status(400).json({ error: 'Already playing. '});
  }
  if (!audioStream.isPlaying()) {
    return res.status(400).json({ error: 'Cannot resume. Stream is not playing.' });
  }
  audioStream.resume();
  res.json('Resumed.');
});

app.post('/skip', async (req, res) => {
  if (audioStream.getQueue().length == 0 && !audioStream.isPlaying()) {
    return res.status(400).json({ error: 'Nothing in queue!' });
  }
  audioStream.skip();
  res.json('Skipped.');
});

app.get('/queued', async (req, res) => {
  return res.json({ queue: audioStream.getQueue() });
});

app.get('/healthCheck', async (req, res) => {
  return res.json({ success: 'True' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
