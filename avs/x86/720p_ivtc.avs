#SetMemoryMax(1024)

global Plugins = "__path__\plugins\"
global Scripts = "__path__\avs\"

Import(Scripts + "function.avsi")

video = __video__
audio = __audio__
AudioDub(video, audio)
DelayAudio(last, __delay__)
#__eraselogo__
#__trim__
TIVTC24P2()
BilinearResize(1280, 720, 0, 0.6)
return last
