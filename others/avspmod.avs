#SetMemoryMax(4096)
SetMemoryMax(16384)
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
KFMDeint(mode=__mode__, pass=3, preset="Faster", thswitch=-1, ucf=false, filepath=__kfmprefix__, cuda=true, threads=12)
#KFMDeint(mode=__mode__, pass=3, preset="Slower", thswitch=-1, ucf=true, filepath=__kfmprefix__, cuda=true, threads=12)
#KFMDeint(mode=__mode__, pass=3, preset="Slower", thswitch=-1, ucf=true, filepath=__kfmprefix__, cuda=true, threads=12, is120=true)

# trim for video
##__trim2__

AssumeBFF()
OnCUDA(2)

return last
