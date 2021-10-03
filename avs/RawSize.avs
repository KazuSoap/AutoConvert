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

videotmp = __videotmp__
audio = __audio__
AudioDub(videotmp, audio)
DelayAudio(last, __delay__)

OnCPU(2)
# trim for audio
#__trim1__
OnCUDA(2)

KillVideo()
audio = last

__video__
#__eraselogo__

OnCPU(2)
# deint
KFMDeint(mode=0, pass=3, preset="Slower", sourceMatch=3, lossless=1, thswitch=-1, ucf=true, filepath=__kfmprefix__, cuda=true, threads=12)
#KFMDeint(mode=0, pass=3, preset="Slower", sourceMatch=3, lossless=1, thswitch=-1, ucf=true, filepath=__kfmprefix__, cuda=true, threads=12, is120=true)

# trim for video
#__trim2__

# Resize & Cropping
# Spline64Resize(w,h,left,top,-right,-bottom)

AssumeBFF()
OnCUDA(2)

AudioDubEx(last, audio)

return last
