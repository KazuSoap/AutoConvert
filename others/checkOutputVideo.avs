#input=__input__
#SetMemoryMax(1024)
SetDeviceOpt(DEV_CUDA_PINNED_HOST) # CUDAデータ転送最適化

global Plugins = "__path__\plugins64\"
global Scripts = "__path__\avs\"

LoadPlugin(Plugins + "AvsCUDA.dll")
LoadPlugin(Plugins + "KFM.dll")
LoadPlugin(Plugins + "KUtil.dll")
LoadPlugin(Plugins + "KTGMC.dll")
LoadPlugin(Plugins + "KNNEDI3.dll")

Import(Scripts + "function.avsi")
Import(Scripts + "KFMDeint.avsi")
Import(Scripts + "KTGMC.avsi")

video = __video__
audio = __audio__
AudioDub(video, audio)

return last
