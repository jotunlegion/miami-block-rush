import numpy as np
sr=22050
x=np.fromfile("track.f32",dtype=np.float32)
hop=256; n=1024
frames=(len(x)-n)//hop
win=np.hanning(n)
S=np.abs(np.array([np.fft.rfft(x[i*hop:i*hop+n]*win) for i in range(frames)]))
logS=np.log1p(S*10)
flux=np.maximum(0,np.diff(logS,axis=0)).sum(1)
freqs=np.fft.rfftfreq(n,1/sr)
low=np.maximum(0,np.diff(logS[:,freqs<150],axis=0)).sum(1)
t=np.arange(len(flux))*hop/sr
def peaks(f,thr_k,mind):
    f=(f-f.mean())/f.std()
    out=[];last=-1
    for i in range(1,len(f)-1):
        loc=f[max(0,i-8):i+8]
        if f[i]==loc.max() and f[i]>thr_k and t[i]-last>mind:
            out.append((round(t[i],3),round(float(f[i]),1)));last=t[i]
    return out
print("ONSETS(all):",peaks(flux,1.5,0.08))
print("KICKS(low):",peaks(low,1.8,0.15))
# tempo via autocorrelation
f=(flux-flux.mean());ac=np.correlate(f,f,'full')[len(f)-1:]
lags=np.arange(len(ac))*hop/sr
m=(lags>0.3)&(lags<1.0)
bl=lags[m][np.argmax(ac[m])]
print("beat period",bl,"bpm",60/bl)
# RMS per 0.1s
rms=[float(np.sqrt((x[int(i*sr/10):int((i+1)*sr/10)]**2).mean())) for i in range(int(len(x)/sr*10))]
print("RMS/0.1s:",' '.join(f"{v:.2f}" for v in rms))
