SetMemoryMax(4096)
SetMemoryMax(2048, type=DEV_TYPE_CUDA)
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

__video__

OnCPU(2)
# deint
KFMDeint(mode=0, pass=3, preset="Faster", ucf=true, filepath=__kfmprefix__, cuda=true)

# trim for video
##__trim2__

AssumeBFF()
OnCUDA(2)

return last
