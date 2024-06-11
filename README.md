# In memory of Jessabele Delen Ramos

## **SCE Room Speakers**

### Instructions to use

Get the sound card you want to use <br>
`aplay -l` <br>

Put the Index in the place
```
pcm.custom
{
    type plug
    slave
    {
        pcm "dmix:<SOUND_CARD_INDEX>,0"
    }
}

ctl.custom
{
    type hw
    card Creative
}

pcm.!default pcm.custom
ctl.!default ctl.custom
```
Copy this into ~/.asoundrc or wherever your alsa sound file is configured

`sudo alsactl --no-ucm store`
