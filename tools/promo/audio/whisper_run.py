from faster_whisper import WhisperModel
import json,sys
name=sys.argv[1]
m=WhisperModel(name,device="cpu",compute_type="int8")
segs,info=m.transcribe("track.mp3",word_timestamps=True,language="en",vad_filter=False,initial_prompt="Run run run run run it up, push that limit. Whole crew locked in, every second in it.")
out=[]
for s in segs:
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text}")
    for w in s.words:
        print(f"   {w.start:6.2f}-{w.end:6.2f} {w.word} ({w.probability:.2f})")
        out.append(dict(s=w.start,e=w.end,w=w.word,p=w.probability))
json.dump(out,open(f"words_{name}.json","w"),indent=1)
