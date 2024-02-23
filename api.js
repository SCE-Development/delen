const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const client = require('prom-client');

let register = new client.Registry();

const AudioStream = require('./AudioStream');
let audioStream = new AudioStream();

app.use(express.static(path.join(__dirname, 'public')));

const gauge = new client.Gauge({
  name: 'last_health_check_request',
  help: 'checks the last time the health check was checked',
});
register.registerMetric(gauge);
client.collectDefaultMetrics({ register });

app.post('/stream', bodyParser.json(), async (req, res) => {
  try {
    const videoUrl = req.body.url;
    audioStream.queueUp(videoUrl);
    res.json({ playing: audioStream.isPlaying() });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching video info.' });
  }
});

app.post('/pauseplay', async (req, res) => {
  audioStream.togglePauseResume()
  res.status(200).json('pause/play request sent');
});

app.post('/skip', async (req, res) => {
  res.status(500).json('Not implemented Yet.');
});

app.get('/queued', async (req, res) => {
  return res.status(200).json({ queue: audioStream.getQueue() });
});

app.get('/healthCheck', async (req, res) => {
  gauge.set(Date.now() / 1000);
  return res.status(200).json({ success: 'True' });
});

app.get('/metrics', async (request, response) => {
  response.setHeader('Content-type', register.contentType);
  response.end(await register.metrics());
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
