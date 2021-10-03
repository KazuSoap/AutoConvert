#SetMemoryMax(4096)
SetMemoryMax(16384)

AddAutoloadDir("__path__\bin\AviSynthPlus\plugins64")
AddAutoloadDir("__path__\plugins64")

video = __video__
audio = __audio__
AudioDub(video, audio)
DelayAudio(last, __delay__)
return last
