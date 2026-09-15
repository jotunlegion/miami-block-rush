import numpy as np, subprocess
sr=16000
raw=subprocess.run(["ffmpeg","-v","error","-i","sep/htdemucs/track/vocals.wav","-ac","1","-ar",str(sr),"-f","f32le","-"],capture_output=True).stdout
x=np.frombuffer(raw,dtype=np.float32)
hop=160; n=512
fr=(len(x)-n)//hop
env=np.array([np.sqrt((x[i*hop:i*hop+n]**2).mean()) for i in range(fr)])
t=np.arange(fr)*hop/sr
env_db=20*np.log10(env+1e-5)
# onset: positive jump of db envelope smoothed
sm=np.convolve(env_db,np.ones(3)/3,'same')
d=np.diff(sm,prepend=sm[0])
ons=[];last=-1
for i in range(2,fr-2):
    if d[i]>=d[i-2:i+3].max() and d[i]>2.5 and sm[i+3]>-38 and t[i]-last>0.07:
        ons.append(round(t[i],3)); last=t[i]
print("VOCAL ONSETS:",ons)
# voiced regions
on=sm>-35
segs=[];st=None
for i,v in enumerate(on):
    if v and st is None: st=t[i]
    if not v and st is not None:
        if t[i]-st>0.04: segs.append((round(st,2),round(t[i],2)))
        st=None
print("VOICED:",segs)
