/*
	AviSynth Neo用 Auto_VFR v1

	based on
    Auto_VFR  ver 0.1.0.6
    written by putin
    
    <解説>
        AutoVfr.exeに入力するログを作るための関数です。

    <必要なプラグイン>
        TIVTC              必須
        mt_masktools     IsDup=trueの場合

    <使用例>
        (1)高速でエンコードするかデコードしてログを作成します。 
        [avs]       
        Mpeg2Source("d2v")
        Trim()++Trim()++Trim()
        Auto_VFR("log.txt")
        return last
        
        (2)AutoVfr.exeにログを入力してdefファイルかまたはavsを出力します。
        [bat]
        AutoVfr.exe -i "log.txt" -o "its.def"
*/

function Auto_VFR(clip c,string file,int "cut",int "number"
                        \,int "cthresh",int "mi", bool "chroma", int "blockx", int "blocky"
                        \,bool "IsCrop",int "crop_height",bool "IsTop",bool "IsBottom",bool "show_crop"
                        \,bool "IsDup",int "thr_m",float "thr_luma"){  
                        
    h=c.height()      
    count=c.framecount() 
    dwc=c.DoubleWeave()
    dcount=dwc.framecount() 
    
    Iscut=Defined(cut)?true:false
    Isnumber=Defined(number)?true:false
    
    Assert(Iscut==Isnumber,"specify 'cut' and 'number'")
    Assert(!Isnumber||number>0,"'number' should be more than 0.") 
    Assert(!Isnumber||number<=cut,"'number' should be less than or equal to 'cut'.")
        
    start=Isnumber?int(dcount*float(float(number-1)/float(cut))):0
    end=Isnumber?int((dcount *float(float(number)/float(cut))))-1:0
    dwc=Iscut?dwc.Trim(start,end):dwc
        
    HDsize=720
    IsDup=default(IsDup,false)   
    cthresh_default=(IsDup==true)?7:(h>=HDsize)?9:7
    mi_default=(IsDup==true)?50:(h>=HDsize)?80:50
    blocks_default=(h>=HDsize)?16:32    
    
    cthresh=default(cthresh,cthresh_default)
    mi=default(mi,mi_default)
    chroma=default(chroma,false)
    blockx=default(blockx,16)
    blocky=default(blocky,blocks_default)    
 
    crop_height=default(crop_height,(h==HDsize)?280:120)
    mod=(IsYV12(c)==true)?4:2
    Assert((h-crop_height)%mod==0,"crop_height is invalid.")
    IsCrop=default(IsCrop,false)
    IsTop=default(IsTop,false)
    IsBottom=default(IsBottom,true)    
    show_crop=Default(show_crop,false)    

    thr_m=default(thr_m,10)
    thr_luma=default(thr_luma,0.010)
    
    int_t=( IsCrop==true && IsTop==true)?crop_height:0
    int_b=( IsCrop==true && IsBottom==true)?crop_height:0    
    
	dwc

    if(start == 0) {
        str_total = "total_f-" + string(count)
        str_dtotal = "doubleweave_f-" + string(dcount)       
        WriteFileStart(file, "str_total", append=false)
        WriteFileStart(file, "str_dtotal", append=true)
    }
    else {
        WriteFileStart(file, "", append=false) # ファイルを空にする
    }
    
    content = function [start, cthresh, mi, chroma, blockx, blocky, int_t, int_b, IsDup, thr_m, thr_luma](clip c) {
		crnt = current_frame + start
		str_main = (IsCombedTIVTC(c,cthresh=cthresh,MI=mi,chroma=chroma,blockx=blockx,blocky=blocky) == true) ? "1" : "0"
		str_crop = str_main
		str_motion = "0"
		if(int_t > 0 || int_b > 0) {
			str_crop = (IsCombedTIVTC(c.crop(0,int_t,0,-int_b),cthresh=cthresh,MI=mi,chroma=chroma,blockx=blockx,blocky=blocky) == true) ? "1" : "0"
		}
		if(IsDup == true && crnt%2 == 0) {
			str_motion = (Interleave(SelectEven().mt_motion(thY2=thr_m),SelectOdd()).AverageLuma() >thr_luma) ? "1" : "0"
		}
		return string(crnt) + "-" + str_main + "-" + str_crop + "-" + str_motion
    }

	show_crop ? crop(0,int_t,0,-int_b) : WriteFile(file, content, append=true, flush=false)
}

