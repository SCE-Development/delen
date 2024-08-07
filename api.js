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
    const videoUrl = req.body.url;
    audioStream.queueUp(videoUrl);
    res.json({ playing: 'queued' });
});

app.post('/togglePause', async (req, res) => {
    audioStream.togglePauseResume();
    res.status(200).json('Paused.');
});

app.get('/queued', async (req, res) => {
    return res.status(200).json({ queue: audioStream.getQueue() });
});

app.post('/skip', async (req, res) => {
    let resp = audioStream.skip();
    if(resp == true) res.status(200).json({ 'resp ': resp });
    else res.status(500).json({'resp' : 'please wait 10 seconds before skipping'})
});

app.post('/pause', async (req, res) => {
    audioStream.pause();
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
    res.status(200).json('Resumed.');
});

app.post('/volume', bodyParser.json(),async (req, res) => {
    audioStream.setVolume(req.body.volume);
    res.status(200).json(`Volume set to ${volume}%.`);
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


