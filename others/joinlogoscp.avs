#SetMemoryMax(4096)
SetMemoryMax(16384)
SetMemoryMax(2048, type=DEV_TYPE_CUDA)
SetDeviceOpt(DEV_CUDA_PINNED_HOST)

AddAutoloadDir("__path__\bin\AviSynthNeo\plugins64")
AddAutoloadDir("__path__\plugins64")

audio = __audio__
__video__

OnCPU(2).AudioDub(audio).OnCUDA(2).DelayAudio(__delay__)

return last
