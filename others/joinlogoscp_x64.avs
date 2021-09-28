#SetMemoryMax(1024)

global Plugins = "C:\Program Files (x86)\AviSynth+\plugins64+\"
global Scripts = "__path__\avs\"

Import(Scripts + "function.avsi")

video = __video__
audio = __audio__
AudioDub(video, audio)
DelayAudio(last, __delay__)
return last
