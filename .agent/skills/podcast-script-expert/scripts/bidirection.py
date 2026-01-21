#!/usr/bin/env python3
import argparse
import asyncio
import copy
import json
import logging
import uuid
import os

import websockets

from protocols import (
    EventType,
    MsgType,
    finish_connection,
    finish_session,
    receive_message,
    start_connection,
    start_session,
    task_request,
    wait_for_event,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_resource_id(voice: str) -> str:
    if voice.startswith("S_"):
        return "volc.megatts.default"
    return "volc.service_type.10029"


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--appid", required=True, help="APP ID")
    parser.add_argument("--access_token", required=True, help="Access Token")
    parser.add_argument("--resource_id", default="", help="Resource ID")
    parser.add_argument("--text", help="Text to convert")
    parser.add_argument("--input_file", help="Path to input text file")
    parser.add_argument("--voice_type", default="", required=True, help="Voice type")
    parser.add_argument("--encoding", default="mp3", help="Output file encoding")
    parser.add_argument(
        "--speed",
        type=int,
        default=-15,
        help="Speech rate: -50 (0.5x) to 100 (2x), default -15 for teaching"
    )
    parser.add_argument(
        "--prompt",
        default="你是一位资深英语老师，请用缓慢、娓娓道来的语气说话，语调要轻松幽默，像在和朋友聊天一样自然亲切。",
        help="Context prompt for TTS 2.0 (affects tone, speed, emotion)"
    )
    parser.add_argument(
        "--silence_duration",
        type=int,
        default=800,
        help="Silence duration in ms to append after each segment"
    )
    parser.add_argument(
        "--endpoint",
        default="wss://openspeech.bytedance.com/api/v3/tts/bidirection",
        help="WebSocket endpoint URL",
    )
    # Add optional output filename to control where the file goes
    parser.add_argument("--output_file", default="", help="Output filename")

    args = parser.parse_args()

    # Connect to server
    headers = {
        "X-Api-App-Key": args.appid,
        "X-Api-Access-Key": args.access_token,
        "X-Api-Resource-Id": (
            args.resource_id if args.resource_id else get_resource_id(args.voice_type)
        ),
        "X-Api-Connect-Id": str(uuid.uuid4()),
    }

    logger.info(f"Connecting to {args.endpoint} with headers: {headers}")
    websocket = await websockets.connect(
        args.endpoint, additional_headers=headers, max_size=10 * 1024 * 1024
    )
    logger.info(
        f"Connected to WebSocket server, Logid: {websocket.response.headers['x-tt-logid']}",
    )

    try:
        # Start connection
        await start_connection(websocket)
        await wait_for_event(
            websocket, MsgType.FullServerResponse, EventType.ConnectionStarted
        )

        # Determine text source
        if args.input_file:
            with open(args.input_file, "r", encoding="utf-8") as f:
                full_text = f.read()
        elif args.text:
            full_text = args.text
        else:
            raise ValueError("Either --text or --input_file must be provided")

        # Process text by lines to ensure pauses
        # Split by newlines to respect script structure
        sentences = [line.strip() for line in full_text.splitlines() if line.strip()]
        logger.info(f"Splitting text into {len(sentences)} segments for pacing control.")

        audio_received = False
        final_audio_data = bytearray()

        for i, sentence in enumerate(sentences):
            if not sentence:
                continue

            # every session can have different parameters
            base_request = {
                "user": {
                    "uid": str(uuid.uuid4()),
                },
                "namespace": "BidirectionalTTS",
                "req_params": {
                    "speaker": args.voice_type,
                    "audio_params": {
                        "format": args.encoding,
                        "sample_rate": 24000,
                        "speech_rate": args.speed,
                        "enable_timestamp": True,
                    },
                    "additions": json.dumps(
                        {
                            "disable_markdown_filter": True,
                            "context_texts": [args.prompt] if args.prompt else [],
                            "silence_duration": args.silence_duration, # Add silence at end of each segment
                        }
                    ),
                },
            }

            # Start session
            start_session_request = copy.deepcopy(base_request)
            start_session_request["event"] = EventType.StartSession
            session_id = str(uuid.uuid4())
            await start_session(
                websocket, json.dumps(start_session_request).encode(), session_id
            )
            await wait_for_event(
                websocket, MsgType.FullServerResponse, EventType.SessionStarted
            )

            # Send sentence at once
            async def send_chars():
                synthesis_request = copy.deepcopy(base_request)
                synthesis_request["event"] = EventType.TaskRequest
                synthesis_request["req_params"]["text"] = sentence
                await task_request(
                    websocket, json.dumps(synthesis_request).encode(), session_id
                )
                await finish_session(websocket, session_id)

            # Start sending characters in background
            send_task = asyncio.create_task(send_chars())

            # Receive audio data
            while True:
                msg = await receive_message(websocket)

                if msg.type == MsgType.FullServerResponse:
                    if msg.event == EventType.SessionFinished:
                        break
                elif msg.type == MsgType.AudioOnlyServer:
                    if not audio_received:
                        audio_received = True
                    final_audio_data.extend(msg.payload)
                else:
                    raise RuntimeError(f"TTS conversion failed: {msg}")

            # Wait for send_chars to complete
            await send_task

        if not audio_received:
            raise RuntimeError("No audio data received")
            
        # Save output
        output_filename = args.output_file if args.output_file else f"{args.voice_type}_output.{args.encoding}"
        with open(output_filename, "wb") as f:
            f.write(final_audio_data)
        logger.info(f"Audio received: {len(final_audio_data)}, saved to {output_filename}")


    finally:
        # Finish connection
        await finish_connection(websocket)
        msg = await wait_for_event(
            websocket, MsgType.FullServerResponse, EventType.ConnectionFinished
        )
        await websocket.close()
        logger.info("Connection closed")


if __name__ == "__main__":
    asyncio.run(main())
