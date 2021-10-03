#SetMemoryMax(4096)
SetMemoryMax(16384)
SetMemoryMax(2048, type=DEV_TYPE_CUDA)
SetDeviceOpt(DEV_CUDA_PINNED_HOST)

AddAutoloadDir("__path__\bin\AviSynthNeo\plugins64")
AddAutoloadDir("__path__\plugins64")

__video__

OnCPU(2)

KFMDeint(mode=__mode__, pass=__times__, preset="Faster", thswitch=-1, ucf=false, filepath=__kfmprefix__, cuda=true, threads=12)

AssumeBFF()

OnCUDA(2)

return last
