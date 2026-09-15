from faster_whisper import WhisperModel
import sys, subprocess, json
src=sys.argv[1]; tag=sys.argv[2]
m=WhisperModel("large-v3",device="cpu",compute_type="int8")
chunks=[(0,6),(5,11),(10,17),(16,22),(21,27),(26,33.3)]
res=[]
for a,b in chunks:
    fn=f"chunk_{tag}_{a}.wav"
    subprocess.run(["ffmpeg","-v","error","-y","-ss",str(a),"-to",str(b),"-i",src,"-ac","1","-ar","16000",fn],check=True)
    segs,_=m.transcribe(fn,word_timestamps=True,language="en",vad_filter=False,condition_on_previous_text=False,beam_size=5)
    print(f"=== chunk {a}-{b}")
    for s in segs:
        print(f"  [{s.start+a:6.2f}-{s.end+a:6.2f}] {s.text}")
        for w in s.words:
            print(f"     {w.start+a:6.2f}-{w.end+a:6.2f} {w.word} ({w.probability:.2f})")
            res.append(dict(s=w.start+a,e=w.end+a,w=w.word,p=w.probability,chunk=a))
    sys.stdout.flush()
json.dump(res,open(f"words_{tag}.json","w"),indent=1)
