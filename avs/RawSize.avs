#SetMemoryMax(4096)
SetMemoryMax(16384)
SetMemoryMax(2048, type=DEV_TYPE_CUDA)
SetDeviceOpt(DEV_CUDA_PINNED_HOST)

AddAutoloadDir("__path__\bin\AviSynthNeo\plugins64")
AddAutoloadDir("__path__\plugins64")

audio = __audio__
__videotmp__

OnCPU(2).AudioDub(audio).OnCUDA(2).DelayAudio(__delay__)

OnCPU(2)
# trim for audio
#__trim1__
OnCUDA(2)

audio = KillVideo()

__video__
#__eraselogo__

OnCPU(2)
# deint
KFMDeint(mode=0, pass=3, preset="Slower", sourceMatch=3, lossless=1, thswitch=-1, ucf=true, filepath=__kfmprefix__, cuda=true, threads=12)

#trim for video
#__trim2__

# Resize & Cropping
# Spline64Resize(w,h,left,top,-right,-bottom)

AssumeBFF().AudioDubEx(audio)
OnCUDA(2)

return last
