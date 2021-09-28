/*
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
    
    LoadPlugin(Plugins + "TIVTC.dll")
    
    h=c.height()      
    count=c.framecount() 
    dwc=c.DoubleWeave()
    dcount=dwc.framecount() 
    
    Iscut=Defined(cut)?true:false
    Isnumber=Defined(number)?true:false
    
    #Assert(Iscut==Isnumber,"specify 'cut' and 'number'")
    #Assert(number>0,"'number' should be more than 0.") 
    #Assert(number<=cut,"'number' should be less than or equal to 'cut'.")
        
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
           
   ScriptClip(dwc,"""
       prg="0"
       cmb="1"
       start="""+string(start)+"""
       count="""+string(count)+"""
       dcount="""+string(dcount)+"""
       file=""""+file+""""       
       cth="""+string(cthresh)+"""
       mi="""+string(mi)+"""
       chrm="""+string(chroma)+"""
       bx="""+string(blockx)+"""
       by="""+string(blocky)+"""       
       int_t="""+string(int_t)+""" 
       int_b="""+string(int_b)+"""
       show="""+string(show_crop)+"""
       isDup="""+string(IsDup)+"""  
       thr_m="""+string(thr_m)+"""
       thr_luma="""+string(thr_luma)+"""     
       crnt=current_frame+start  
       str_num=string(crnt)    
       str_line=string("-")          
       str_total=(start==0)?string("total_f-")+string(count):""
       str_dtotal=string("doubleweave_f-")+string(dcount)       
       (current_frame==0)?WriteFile(last,file,"str_total",append=false):nop
       (crnt==0)?WriteFile(last,file,"str_dtotal",append=true):nop                     
       str_main=(IsCombedTIVTC(last,
       \cthresh=cth,MI=mi,chroma=chrm,blockx=bx,blocky=by)==true)?cmb:prg     
       str_crop=(int_t>0 || int_b>0)?(IsCombedTIVTC(last.crop(0,int_t,0,-int_b),
       \cthresh=cth,MI=mi,chroma=chrm,blockx=bx,blocky=by)==true)?cmb:prg
       \:str_main
       str_motion=(isDup==true && crnt%2 == 0)?
       \(Interleave(SelectEven().mt_motion(thY2=thr_m),SelectOdd()).AverageLuma() >thr_luma)?cmb:prg
       \:prg            
       result=str_num+str_line+str_main+str_line+str_crop+str_line+str_motion
       (show==false)?WriteFile(last,file,"string(result)",append=true,flush=false):last
       """)
       return (show_crop==true)?last.crop(0,int_t,0,-int_b):last
}

/*
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
    
    LoadPlugin(Plugins + "TIVTC.dll")
    
    #クリップを一度DoubleWeave().SelectOdd()とするのは30pを捕捉するため。
    
    h=c.height()
    total=c.framecount()
    c1=c.DoubleWeave().SelectOdd().SelectEvery(3,1)
    total2=c1.framecount()
    
    Iscut=Defined(cut)?true:false
    Isnumber=Defined(number)?true:false
    
    #Assert(Iscut==Isnumber,"specify 'cut' and 'number'")
    #Assert(number>0,"'number' should be more than 0.") 
    #Assert(number<=cut,"'number' should be less than or equal to 'cut'.") 
    
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
    
    return WriteFile(c1,file,"string(current_frame+start)",""""-""""
        \,"""string((IsCombedTIVTC(cthresh="""+string(cth)+""",MI="""+string(mi)+""",chroma="""
        \+string(chrm)+""",blockx="""+string(bx)+""",blocky="""+string(by)+"""))?"1":"0")"""
        \,flush=false)
}