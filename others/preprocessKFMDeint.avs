#SetMemoryMax(1024)
SetDeviceOpt(DEV_CUDA_PINNED_HOST) # CUDAデータ転送最適化

global Plugins = "__path__\plugins64\"
global Scripts = "__path__\avs\"

Import(Scripts + "function.avsi")
LoadPlugin(Plugins + "AvsCUDA.dll")
LoadPlugin(Plugins + "KFM.dll")
LoadPlugin(Plugins + "KUtil.dll")
LoadPlugin(Plugins + "KTGMC.dll")
LoadPlugin(Plugins + "KNNEDI3.dll")

Import(Scripts + "function.avsi")
Import(Scripts + "KFMDeint.avsi")
Import(Scripts + "KTGMC.avsi")

__video__

OnCPU(2) # CPU処理ここまで

#__trim__

KFMDeint(mode=0, pass=__times__, preset="Faster", ucf=true, filepath=__kfmfilepath__, cuda=true)
#AssumeBFF()

OnCUDA(2) # GPU処理ここまで

return last
