const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const client = require('prom-client');

let register = new client.Registry();

const AudioStream = require('./AudioStream');
let audioStream = new AudioStream();

app.use(express.static(path.join(__dirname, 'public')));

// Define counter metrics
const streamCounter = new client.Counter({
    name: 'total_stream_endpoint_hits',
    help: 'Total number of times the stream endpoint was hit',
});

const songsQueuedCounter = new client.Counter({
  name: 'total_songs_queued',
  help: 'Total number of songs queued',
});

const pauseCounter = new client.Counter({
  name: 'total_pause_events',
  help: 'Total number of times playback was paused',
});

const playCounter = new client.Counter({
  name: 'total_play_events',
  help: 'Total number of times playback was resumed',
});

const skipCounter = new client.Counter({
  name: 'total_skip_events',
  help: 'Total number of times playback was skipped',
});

const gauge = new client.Gauge({
    name: 'last_health_check_request',
    help: 'checks the last time the health check was checked',
});

register.registerMetric(streamCounter);
register.registerMetric(songsQueuedCounter);
register.registerMetric(pauseCounter);
register.registerMetric(playCounter);
register.registerMetric(skipCounter);
register.registerMetric(gauge);

register.setDefaultLabels ({
    app: 'delen'
});

client.collectDefaultMetrics({ register });

app.post('/stream', bodyParser.json(), async (req, res) => {
    const videoUrl = req.body.url;
    audioStream.queueUp(videoUrl);

    // Increment the stream counter
    streamCounter.inc();

    res.json({ playing: 'queued' });
});

app.post('/togglePause', async (req, res) => {
    audioStream.togglePauseResume();
    res.status(200).json('Paused.');
});

app.get('/queued', async (req, res) => {
    songsQueuedCounter.inc();
    return res.status(200).json({ queue: audioStream.getQueue() });
});

app.post('/skip', async (req, res) => {
    let resp = audioStream.skip();
    if(resp == true){
        // Increment the skip counter
        skipCounter.inc();
        res.status(200).json({ 'resp ': resp });
    } 
    else res.status(500).json({'resp' : 'please wait 10 seconds before skipping'})
});

app.post('/pause', async (req, res) => {
    audioStream.pause();
    // Increment the pause counter
    pauseCounter.inc();
    res.status(200).json('Paused.');
});

app.post('/rewind', async (req, res) => {
    audioStream.rewind();
    res.status(200).json('Rewinded.');
});

app.post('/forward', async (req, res) => {
    audioStream.forward();
    res.status(200).json('forward.');
});

app.post('/resume', async (req, res) => {
    audioStream.resume();
    // Increment the play counter after resuming
    playCounter.inc();
    res.status(200).json('Resumed.');
});


app.get('/total', async (req, res) => {
    res.json({ total: audioStream.getTotal() })
})

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


