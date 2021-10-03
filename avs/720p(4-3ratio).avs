#SetMemoryMax(1024)

AddAutoloadDir("__path__\bin\AviSynthPlus\plugins64")
AddAutoloadDir("__path__\plugins64")

video = __video__
audio = __audio__
AudioDub(video, audio)
DelayAudio(last, __delay__)
#__eraselogo__
#__trim__
TDeint_()
BilinearResize(960, 720, 0, 0.6)
return last
