/*
	AviSynth Neo用 Auto_VFR_Fast v1

	based on
    Auto_VFR_Fast  ver 0.1.0.1
    written by putin
    
    <対応バージョン>
        AutoVfr.exe ver0.1.1.0以降
        
    <必要なプラグイン>
        TIVTC              必須
            
    <解説>
        Auto_VFRの高速版です。
        機能的には下記のように制限されますが、解析フレーム数が通常版の1/6になります。
        
        ・機能は24/60fps、または24/30fpsの分割のみ。
        ・iniで指定した自動関数のみが使用され、マニュアルプルダウン解除はできません。     
        
    
    <使用例>
        基本的にはAuto_VFRと同じです。
                
        ※avs例    
        MPEG2Source("video_file")
        Trim()#CMカット
        Auto_VFR_Fast("log_file")   
        return last    
    
        ※コマンド例
        AutoVfr.exe -i "log_file" -o "output.def" -ref 150 -30f 1 -60f 1 -fix 0
        
        Auto_VFR_Fastで作成したログを入力すると自動的にFast-Modeになります。
        この時、-REF は非24fps区間の最小フレーム数を指定するコマンドとして使われます(最小30 / 15フレーム単位)
        
*/


function Auto_VFR_Fast(clip c,string file,int "cut",int "number"
                                  \,int "cthresh",int "mi", bool "chroma", int "blockx", int "blocky"){
  
    #クリップを一度DoubleWeave().SelectOdd()とするのは30pを捕捉するため。
    
    h=c.height()
    total=c.framecount()
    c1=c.DoubleWeave().SelectOdd().SelectEvery(3,1)
    total2=c1.framecount()
    
    Iscut=Defined(cut)?true:false
    Isnumber=Defined(number)?true:false
    
    Assert(Iscut==Isnumber,"specify 'cut' and 'number'")
    Assert(!Isnumber||number>0,"'number' should be more than 0.") 
    Assert(!Isnumber||number<=cut,"'number' should be less than or equal to 'cut'.")
    
    global start=Isnumber?int(total2 *float(float(number-1)/float(cut))):0
    end=Isnumber?int((total2 *float(float(number)/float(cut))))-1:0   
    c1=Iscut?c1.Trim(start,end):c1
             
    HDsize=720
    cthresh_default=(h>=HDsize)?9:7
    mi_default=(h>=HDsize)?80:50
    blocks_default=(h>=HDsize)?16:32    
    
    cth=default(cthresh,cthresh_default)
    mi=default(mi,mi_default)
    chrm=default(chroma,false)
    bx=default(blockx,blocks_default)
    by=default(blocky,blocks_default)    
                                      
    
    str_total=(start==0)?"total_f-" + string(total):""
    WriteFileStart(c1, file,"str_total",append=false)   
    (start==0)?WriteFileStart(c1, file,""""fast_f-"""","string(total2)",append=true):nop    
    
    return WriteFile(c1,file,function[cth,mi,chrm,bx,by,start](c1){
		combed=c1.IsCombedTIVTC(cthresh=cth,MI=mi,chroma=chrm,blockx=bx,blocky=by)
		return string(current_frame+start)+"-"+string(combed?"1":"0")
	},append=true,flush=false)
}