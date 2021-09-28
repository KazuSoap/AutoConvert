SetMemoryMax(1024)

global Plugins = "__path__\plugins\"
global Scripts = "__path__\avs\"

Import(Scripts + "function.avsi")
Import("__path__\others\autovfr.avsi")

video = __video__
audio = __audio__
AudioDub(video, audio)
DelayAudio(last, __delay__)
#__trim__
Auto_VFR("__autovfr__")
return last