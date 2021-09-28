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
Its_("__def__", "__tmc__")
(Width() != 1920) ? BilinearResize(1920, 1080, 0, 0.6) : last
return last