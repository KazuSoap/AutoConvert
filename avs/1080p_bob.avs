SetMemoryMax(1024)

global Plugins = "__path__\plugins\"
global Scripts = "__path__\avs\"

Import(Scripts + "function.avsi")

video = __video__
audio = __audio__
AudioDub(video, audio)
DelayAudio(last, __delay__)
#__eraselogo__
#__trim__
TDeint_(bob=true)
(Width() != 1920) ? BilinearResize(1920, 1080, 0, 0.6) : last
return last