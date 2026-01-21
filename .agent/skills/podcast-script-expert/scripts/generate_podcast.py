import os
import subprocess
import argparse
import sys

# Default Configuration
APP_ID = "3452023099"
ACCESS_TOKEN = "HOaMOZ-ugk_nf3YtDIdWxzpOS_Ewb5Ko"
RESOURCE_ID = "seed-tts-2.0"
VOICE_TYPE = "zh_male_taocheng_uranus_bigtts" # Default voice
SPEED = "-15"
SILENCE_DURATION = "600" # 600ms silence after each line
PROMPT = "你是一位资深英语老师，请用缓慢、娓娓道来的语气说话，语调要轻松幽默，像在和朋友聊天一样自然亲切。"

def generate_podcast_audio(input_file, output_file, voice_type=None, resource_id=None):
    """
    Generates audio from a text file using Volcengine TTS.
    """
    if not os.path.exists(input_file):
        print(f"Error: Input file not found: {input_file}")
        return False

    with open(input_file, 'r', encoding='utf-8') as f:
        text = f.read()

    print(f"Generating audio for {input_file}...")
    print(f"Text length: {len(text)} chars")
    
    # Get the directory of the current script to locate bidirection.py
    script_dir = os.path.dirname(os.path.abspath(__file__))
    bidirection_script = os.path.join(script_dir, "bidirection.py")

    cmd = [
        sys.executable, bidirection_script,
        "--appid", APP_ID,
        "--access_token", ACCESS_TOKEN,
        "--resource_id", resource_id if resource_id else RESOURCE_ID,
        "--voice_type", voice_type if voice_type else VOICE_TYPE,
        "--speed", SPEED,
        "--prompt", PROMPT,
        "--silence_duration", SILENCE_DURATION,
        "--input_file", input_file,
        "--output_file", output_file
    ]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(result.stdout)
        print(f"Success! Audio saved to: {output_file}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error generating audio: {e}")
        print(f"STDOUT: {e.stdout}")
        print(f"STDERR: {e.stderr}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Podcast Audio from Text Script")
    parser.add_argument("input_file", help="Path to input text file")
    parser.add_argument("output_file", help="Path to output mp3 file")
    parser.add_argument("--voice_type", help="Volcengine Voice ID", default=None)
    parser.add_argument("--resource_id", help="Volcengine Resource ID", default=None)
    
    args = parser.parse_args()
    
    generate_podcast_audio(args.input_file, args.output_file, args.voice_type, args.resource_id)
