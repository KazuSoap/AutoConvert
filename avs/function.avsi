function LWLibavVideoSource_(string source, int "stream_index") {
    LoadPlugin(Plugins + "LSMASHSource.dll")

    stream_index = default(stream_index, -1)

    clip = LWLibavVideoSource(source=source, stream_index=stream_index, repeat=true).AssumeFPS(30000, 1001)
    return clip
}

function LWLibavAudioSource_(string source, int "stream_index", bool "av_sync") {
    LoadPlugin(Plugins + "LSMASHSource.dll")

    stream_index = default(stream_index, -1)
    av_sync = default(av_sync, false)

    clip = LWLibavAudioSource(source=source, stream_index=stream_index, av_sync=av_sync)
    return clip
}

function MPEG2Source_(string source) {
    LoadPlugin(Plugins + "DGDecode.dll")

    clip = MPEG2Source(source)
    return clip
}

function DGSource_(string source) {
    LoadPlugin(Plugins + "DGDecodeNV.dll")

    clip = DGSource(source)
    return clip
}

function DGSourceIM_(string source) {
    LoadPlugin(Plugins + "DGDecodeIM.dll")

    clip = DGSourceIM(source)
    return clip
}

function AACFaw_(string source) {
    LoadPlugin(Plugins + "aacfaw.aui")

    clip = AACFaw(source)
    return clip
}

function TDeint_(clip clip, bool "bob") {
    LoadPlugin(Plugins + "TDeint.dll")

    bob = default(bob, false)

    clip = clip.TDeint(mode=(bob == true) ? 1 : 0, type=3, full=false, tryWeave=true)
    return clip
}

function TomsMoComp_(clip clip, bool "bob") {
    LoadPlugin(Plugins + "TomsMoComp.dll")

    bob = default(bob, false)

    clip1 = clip.TomsMoComp(1, 5, 0)
    clip2 = (bob == true) ? clip.ComplementParity().TomsMoComp(1, 5, 0) : clip
    clip = (bob == true) ? Interleave(clip1, clip2) : clip1
    return clip
}

function TIVTC24P2(clip clip) {
    LoadPlugin(Plugins + "nnedi3.dll")
    LoadPlugin(Plugins + "TDeint.dll")
    LoadPlugin(Plugins + "TIVTC.dll")

    parity = clip.GetParity() ? 1 : 0
    Interp = clip.nnedi3(field=parity)
    Deinted = clip.TDeint(order=parity, field=parity, edeint=Interp)
    Matched = clip.TFM(order=parity, field=parity, mode=6, PP=7, slow=2, mChroma=true, clip2=Deinted)
    Cropped = Matched.CropBottom(250).MergeHints(hintClip=Matched)
    clip = Cropped.TDecimate(mode=1, dupThresh=2.5, clip2=Matched)
    return clip
}

function ivtc_txt60mc(clip clip, int frame_ref, bool "srcbob", bool "draft") {
    LoadPlugin(Plugins + "TDeint.dll")
    LoadPlugin(Plugins + "mvtools2.dll")

    srcbob    = Default(srcbob, false)
    draft     = Default(draft,  false)

    field_ref = (srcbob) ? frame_ref : frame_ref * 2
    field_ref =      field_ref  % 5
    invpos    = (5 - field_ref) % 5
    pel       = (draft) ? 1 : 2

    clip
      (srcbob) ? last
\	: (draft ) ? Bob()
\	:            Tdeint(mode=1)
#\	:            QTGMC (SourceMatch=3, Lossless=2, tr0=1, tr1=1, tr2=1)

    clean  = SelectEvery(5, 1 - invpos)
    jitter = SelectEvery(5, 3 - invpos, 4 - invpos)
    jsup   = jitter.MSuper(pel=pel)
    vect_f = jsup.MAnalyse(isb=false, delta=1, overlap=4)
    vect_b = jsup.MAnalyse(isb=true,  delta=1, overlap=4)
    comp   = jitter.MFlowInter(jsup, vect_b, vect_f, time=50, thSCD1=400)
    fixed  = comp.SelectEvery(2, 0)
    Interleave(clean, fixed)
    Trim(invpos / 2, 0)
}

function Its_(clip clip, string def, string tmc) {
    LoadPlugin(Plugins + "Its.dll")

    clip
    clip = Its(def=def, output=tmc)
    return clip
}

function EraseLOGO_(clip clip, string logofile, int "start", int "fadein", int "fadeout", int "fieldin", int "fieldout", int "end", bool "interlaced") {
    LoadPlugin(Plugins + "delogo.dll")

    start = default(start, 0)
    fadein = default(fadein, 0)
    fadeout = default(fadeout, 0)
    fieldin = default(fieldin, 0)
    fieldout = default(fieldout, 0)
    end = default(end , -1)
    interlaced = default(interlaced, false)

    clip = clip.EraseLOGO(logofile=logofile, start=start, fadein=fadein, fadeout=fadeout, end=end, interlaced=interlaced)
    return clip
}