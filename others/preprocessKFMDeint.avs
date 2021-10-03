#SetMemoryMax(4096)
SetMemoryMax(16384)
SetMemoryMax(2048, type=DEV_TYPE_CUDA)
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

KFMDeint(mode=__mode__, pass=__times__, preset="Faster", thswitch=-1, ucf=false, filepath=__kfmprefix__, cuda=true, threads=12)

AssumeBFF()

OnCUDA(2) # GPU処理ここまで

return last
