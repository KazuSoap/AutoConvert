#input=__input__
SetMemoryMax(4096)

global Plugins = "__path__\plugins64\"
global Scripts = "__path__\avs\"

Import(Scripts + "function.avsi")

video = __video__
audio = __audio__
AudioDub(video, audio)
return last
