from fastapi import FastAPI, BackgroundTasks
import subprocess
import uvicorn
from typing import Dict, List
from pydantic import BaseModel

app = FastAPI()

class PlaylistRequest(BaseModel):
    url: str

@app.get("/")
def root():
    return {"Hello": "World"}
  
@app.post("/play")
async def play_youtube_playlist(request: PlaylistRequest, background_tasks: BackgroundTasks):
    # Get the URLs
    audio_urls = get_youtube_audio_urls(request.url)
    
    # Start playing in the background
    background_tasks.add_task(mpv_queue, audio_urls)
    
    return {
        "message": "Started playing playlist",
        "playlist_url": request.url,
        "videos_found": len(audio_urls)
    }

def get_youtube_audio_urls(playlist_url):
    # Create a list to store the URLs
    audio_urls = []
    
    # Run the yt-dlp command and capture its output
    command = f'yt-dlp -f bestaudio -g "{playlist_url}"'
    try:
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        
        # Check for errors
        if process.returncode != 0:
            print(f"Error extracting URLs: {stderr.decode('utf-8')}")
            return []
        
        # Decode the output and split by newlines to get individual URLs
        output = stdout.decode('utf-8')
        urls = [url for url in output.strip().split('\n') if url and url.startswith('http')]
        
        print(f"Found {len(urls)} audio URLs")
        return urls
    except Exception as e:
        print(f"Exception while extracting URLs: {str(e)}")
        return []

def mpv_queue(audio_urls):
    total_count = len(audio_urls)
    played_count = 0
    
    if total_count == 0:
        print("No audio URLs found.")
        return
    
    # Initialize playing queue
    playing_queue = audio_urls[:3]  # Take the first 3 URLs
    remaining_queue = audio_urls[3:]  # The rest of the URLs
    
    print(f"Total videos: {total_count}, Initially in play queue: {len(playing_queue)}")
    
    # Process each URL in the playing queue
    while playing_queue:
        audio_url = playing_queue.pop(0)  # Get the next URL
        played_count += 1
        
        print(f"Playing video {played_count}/{total_count}: {audio_url[:50]}...")
        
        try:
            # Play the audio
            command = f'mpv --cache=yes --no-video --force-window=no "{audio_url}"'
            process = subprocess.Popen(command, shell=True)
            process.wait()
            
            # If there are more URLs in the remaining queue, add one to the playing queue
            if remaining_queue:
                next_url = remaining_queue.pop(0)
                playing_queue.append(next_url)
                print(f"Added next video to queue. Remaining: {len(remaining_queue)}")
        except Exception as e:
            print(f"Error playing {audio_url[:50]}: {str(e)}")
            # If an error occurs, still try to continue with the next URL
            continue
    
    print(f"Finished playing {played_count}/{total_count} videos")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)