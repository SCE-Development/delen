from fastapi import FastAPI, BackgroundTasks
import uvicorn
from audio43 import get_youtube_audio_urls, mpv_queue

MAX_URL_DISPLAY_LENGTH = 50

app = FastAPI() 
  
@app.post("/play")
async def play_youtube_playlist(url: str, background_tasks: BackgroundTasks):
    # Get the URLs
    audio_urls = get_youtube_audio_urls(url)
    
    # Start playing in the background
    background_tasks.add_task(mpv_queue, audio_urls)
    
    return {
        "message": "Started playing playlist",
        "playlist_url": url,
        "videos_found": len(audio_urls)
    }

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000)