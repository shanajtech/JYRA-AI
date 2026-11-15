import sys, json, asyncio, re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'runtime' / 'voice-deps'))
import edge_tts
async def main():
    data=json.loads(sys.stdin.buffer.read().decode('utf-8'))
    text=data['text']
    voices=['bn-BD-NabanitaNeural','bn-IN-TanishaaNeural'] if re.search(r'[\u0980-\u09ff]',text) else ['hi-IN-SwaraNeural'] if re.search(r'[\u0900-\u097f]',text) else ['ar-SA-ZariyahNeural'] if re.search(r'[\u0600-\u06ff]',text) else ['en-US-JennyNeural']
    text=re.sub(r'\b(?:jyra|zyra)\b','জায়রা' if voices[0].startswith('bn') else 'Jaira',text,flags=re.I)
    failure=None
    for voice in voices + voices[:1]:
        try:
            await asyncio.wait_for(edge_tts.Communicate(text,voice).save(sys.argv[1]),timeout=10)
            if Path(sys.argv[1]).stat().st_size>1000:return
        except Exception as error:failure=error
    raise RuntimeError('Online voice service did not return audio') from failure
asyncio.run(main())
