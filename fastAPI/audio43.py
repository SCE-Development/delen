import subprocess
import argparse
from datetime import datetime

MAX_URL_DISPLAY_LENGTH = 50

# Open error log file in append mode
def get_error_logger():
    return open('errors.log', 'a')

def get_youtube_audio_urls(playlist_url):
    # Run the yt-dlp command and capture its output
    command = f'yt-dlp -f bestaudio -g "{playlist_url}"'
    try:
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate()
        
        # Check for errors
        if process.returncode != 0:
            error_msg = f"[{datetime.now()}] Error extracting URLs: {stderr.decode('utf-8')}"
            print(error_msg)
            with get_error_logger() as error_log:
                error_log.write(error_msg + '\n')
                error_log.flush()
            return []
        
        # Decode the output and split by newlines to get individual URLs
        output = stdout.decode('utf-8')
        urls = [url for url in output.strip().split('\n') if url and url.startswith('http')]
        
        print(f"Found {len(urls)} audio URLs")
        return urls
    except Exception as e:
        error_msg = f"[{datetime.now()}] Exception while extracting URLs: {str(e)}"
        print(error_msg)
        with get_error_logger() as error_log:
            error_log.write(error_msg + '\n')
            error_log.flush()
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
        
        print(f"Playing video {played_count}/{total_count}: {audio_url[:MAX_URL_DISPLAY_LENGTH]}...")
        
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
            error_msg = f"[{datetime.now()}] Error playing {audio_url[:MAX_URL_DISPLAY_LENGTH]}: {str(e)}"
            print(error_msg)
            with get_error_logger() as error_log:
                error_log.write(error_msg + '\n')
                error_log.flush()
            # If an error occurs, still try to continue with the next URL
            continue
    
    print(f"Finished playing {played_count}/{total_count} videos")

# This function parses command line arguments
def parse_arguments():
    parser = argparse.ArgumentParser(description='Play audio from YouTube playlists using mpv')
    parser.add_argument('--url', '-u', type=str, required=True,
                        help='YouTube playlist URL to extract audio from')
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_arguments()
    audio_urls = get_youtube_audio_urls(args.url)
    mpv_queue(audio_urls)