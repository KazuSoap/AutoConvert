var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.fixCfrTrim = function(durations, trim_obj, is_editTrim) {
        if (Object.keys(trim_obj).length === 0)  return {};
        if (Object.keys(trim_obj).length === 1)  return trim_obj;

        var dur_ary = durations.split(/\r\n|\r|\n/);
        var trim1_obj = trim_obj.trim2.reduce(function(acc,trim_item,trim_idx){
            acc.trim1.push({start:0,end:0});
            dur_ary.slice(acc.idx).some(function(dur,idx){
                acc.num += Number(dur);
                if ( acc.idx + idx + 1 <= trim_item.start ) {
                    acc.trim1[trim_idx].start = acc.num;
                }
                if (acc.idx + idx + 1 > trim_item.end) {
                    acc.trim1[trim_idx].end = acc.num - 1;
                    acc.idx += idx + 1;
                    return true;
                }
                return false;
            });

            return acc;
        }, { num:0, idx:0, trim1:[] });

        if ( is_editTrim ) {
            trim1_obj.trim1.forEach(function(trim_item,idx,ary){
                ary[idx].start = Math.floor(trim_item.start/2);
                ary[idx].end = Math.floor(trim_item.end/2);
            })
        }

        return {trim1:trim1_obj.trim1, trim2:trim_obj.trim2};
    }

    // -----------------------------------------------------------
    nsAC.getVfrTrim = function(durations, trim_obj) {
        if (Object.keys(trim_obj).length === 0)  return {};
        if (Object.keys(trim_obj).length === 2)  return trim_obj;

        var dur_ary = durations.split(/\r\n|\r|\n/);
        var trim2_obj = trim_obj.trim1.reduce(function(acc,trim_item,trim_idx){
            acc.trim2.push({start:0,end:0});
            dur_ary.slice(acc.idx).some(function(dur,idx){
                acc.num += Number(dur);
                if ( acc.num <= trim_item.start*2) {
                    acc.trim2[trim_idx].start = acc.idx + idx + 1;
                }
                if (acc.num - 1 > trim_item.end*2) {
                    acc.trim2[trim_idx].end = acc.idx + idx + 1;
                    acc.idx += idx + 1;
                    return true;
                }
                return false;
            });

            return acc;
        }, { num:0, idx:0, trim2:[] });

        return {trim1:trim_obj.trim1, trim2:trim2_obj.trim2};
    }

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.preprocKFM = function() {
        var input = new File(this.args.input);
        var kfmprefix = input.base() + ".kfm_" + this.params.source;
        var procKFM_dat = input.parent().childFile(kfmprefix + ".result.dat");
        var procKFM_dur = input.parent().childFile(kfmprefix + ".duration.txt");
        var procKFM_tmc = input.parent().childFile(kfmprefix + ".timecode.txt");

        if (!procKFM_tmc.exists()) {
            var template_avs = new File(this.path.autovfr_avs);
            var script = template_avs.read("Shift-JIS");
            if (script === null) {
                aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
                return false;
            }

            script = script.replace(/__kfmprefix__/g,'"' + input.parent().path() + "\\" + kfmprefix + '"');
            script = script.replace(/__path__/g, aclib.path());
            script = script.replace(/__video__/g, this.options.avs.video[0]);

            var preprocKFM_avs = new File(this.options.temp + ".preprocKFM.avs");
            var proc = new Process('"${avs2pipemod}" -benchmark "${input}"');
            proc.prepare({
                avs2pipemod: this.path.avs2pipemod,
                input: preprocKFM_avs.path()
            }, {window: this.settings.window, debug: this.options.debug});

            for (var i = 1; i < 3; i++) {
                if (!preprocKFM_avs.write(script.replace(/__times__/g, i), "Shift-JIS")) {
                    aclib.log("Can't write file. [" + preprocKFM_avs.path() + "]", 1);
                    return false;
                }

                if (!proc.run()) {
                    aclib.log("Process failed.", 1);
                    return false;
                }
            }

            if (!procKFM_dat.exists() || !procKFM_dur.exists() || !procKFM_tmc.exists()) {
                aclib.log("Can't find KFMDeint Output files.", 1);
                return false;
            }
        }

        var trim_obj = this.options.avs.trim;
        var durations = procKFM_dur.read("Shift-JIS");
        if (durations === null) {
            aclib.log("Can't read file. [" + procKFM_dur.path() + "]", 1);
            return false;
        }

        this.options.avs.trim = nsAC.getVfrTrim(durations, this.options.avs.trim);

        return true;
    };

    // -----------------------------------------------------------
    var is23 = function(dur_ary, offset, bound_end) {
        return (offset+1 < dur_ary.length && offset+1 <= bound_end) ? (
            (dur_ary[offset] == 2) && (dur_ary[offset+1] == 3)
        ) : (false);
    }

    var is32 = function(dur_ary, offset, bound_end) {
        return (offset+1 < dur_ary.length && offset+1 <= bound_end) ? (
            (dur_ary[offset] == 3) && (dur_ary[offset+1] == 2)
        ) : (false);
    }

    var is2224 = function(dur_ary, offset, bound_end) {
        return (offset+3 < dur_ary.length && offset+3 <= bound_end) ? (
            (dur_ary[offset] == 2) && (dur_ary[offset+1] == 2) && (dur_ary[offset+2] == 2) && (dur_ary[offset+3] == 4)
        ) : (false);
    }

    var setTmcElps = function(tmcNchpt_acc, timebase, timescale, duration) {
        tmcNchpt_acc.elapsed += duration;

        var msec = Math.round(1000 * tmcNchpt_acc.elapsed * timebase / timescale);
        tmcNchpt_acc.tmc += msec + "\r\n";
        tmcNchpt_acc.msec_ary.push(msec)
        return tmcNchpt_acc;
    }

    // -----------------------------------------------------------
    nsAC.fixVfrTmcNchpt = function(durations, trim_obj, is120fps) {
        if (trim_obj["trim2"].length === 0)  return "";

        var tmbase = 1001.0, tmscale = 120000.0;
        var dur_ary = durations.split(/\r\n|\r|\n/);
        var trimed_obj = trim_obj["trim2"].reduce(function(acc,xobj,idx) {
            acc.chpt_pos.push(acc.dur_ary.length);
            acc.dur_ary = acc.dur_ary.concat(dur_ary.slice(xobj.start,xobj.end+1).map(Number));
            return acc;
        }, { dur_ary:[], chpt_pos:[] });

        var tmcNchpt_obj = { tmc:"# timecode format v2\r\n0\r\n", msec_ary:[0], elapsed:0}
        if (is120fps) {
            for (var i=0, end=trimed_obj.dur_ary.length; i<end;) {
                if ( is23(trimed_obj.dur_ary, i, end) || is32(trimed_obj.dur_ary, i, end) ) {
                    for (var j=0; j < 2; ++i, ++j) tmcNchpt_obj = setTmcElps(tmcNchpt_obj, tmbase, tmscale, 5);
                } else if ( is2224(trimed_obj.dur_ary, i, end) ) {
                    for (var j=0; j < 4; ++i, ++j) tmcNchpt_obj = setTmcElps(tmcNchpt_obj, tmbase, tmscale, 5);
                } else {
                    tmcNchpt_obj = setTmcElps(tmcNchpt_obj, tmbase, tmscale, trimed_obj.dur_ary[i++]*2);
                }
            }
        } else {
            for (var i=0, end=trimed_obj.dur_ary.length; i<end; ++i){
                tmcNchpt_obj = setTmcElps(tmcNchpt_obj, tmbase, tmscale, trimed_obj.dur_ary[i]*2);
            }
        }

        tmcNchpt_obj.tmc += "# total: "
            + nsAC.ms2hhmmss_sss(tmcNchpt_obj.msec_ary.slice(-1)[0])
            + " ("
            + tmcNchpt_obj.msec_ary.slice(-1)[0]
            + " msec)\r\n"

        var nchpt = "";

        trimed_obj.chpt_pos.forEach(function(msec_idx, chpt_idx) {
            nchpt += nsAC.ms2neroChaptFmt(tmcNchpt_obj.msec_ary[msec_idx], chpt_idx+1);
        });

        // aclib.log("elapsed: " + nsAC.ms2hhmmss_sss(tmcNchpt_obj.msec_ary.slice(-1)[0]), 0);

        return {tmc:tmcNchpt_obj.tmc, nchpt:nchpt};
    }

    // // -----------------------------------------------------------
    // var is23 = function(dur_ary, offset, bound_end) {
    //     return (offset+1 < dur_ary.length && offset+1 <= bound_end) ? (
    //         Number(dur_ary[offset]  ) == 2
    //      && Number(dur_ary[offset+1]) == 3
    //     ) : (false);
    // }

    // var is32 = function(dur_ary, offset, bound_end) {
    //     return (offset+1 < dur_ary.length && offset+1 <= bound_end) ? (
    //         Number(dur_ary[offset]  ) == 3
    //      && Number(dur_ary[offset+1]) == 2
    //     ) : (false);
    // }

    // var is2224 = function(dur_ary, offset, bound_end) {
    //     return (offset+3 < dur_ary.length && offset+3 <= bound_end) ? (
    //         Number(dur_ary[offset]  ) == 2
    //      && Number(dur_ary[offset+1]) == 2
    //      && Number(dur_ary[offset+2]) == 2
    //      && Number(dur_ary[offset+3]) == 4
    //     ) : (false);
    // }

    // var setTmcElps = function(tmcNchpt_acc, timebase, timescale, duration) {
    //     var msec = Math.round(1000 * tmcNchpt_acc.elapsed * timebase / timescale);
    //     tmcNchpt_acc.tmc += msec + "\r\n";
    //     tmcNchpt_acc.elapsed += Number(duration);
    //     return tmcNchpt_acc;
    // }

    // // -----------------------------------------------------------
    // nsAC.fixVfrTmcNchpt = function(durations, trim_obj, is120fps) {
    //     if (trim_obj["trim2"].length === 0)  return "";

    //     var dur_ary = durations.split(/\r\n|\r|\n/);
    //     var tmbase = 1001.0, tmscale = 120000.0;

    //     var tmcNchpt_obj = trim_obj["trim2"].reduce(function(acc,xobj) {
    //         var msec = Math.round(1000 * acc.elapsed * tmbase / tmscale);
    //         acc.nchpt += nsAC.ms2neroChaptFmt(msec, ++acc.chpt_idx);

    //         if (is120fps) {
    //             for (var i = xobj.start; i < xobj.end+1;) {
    //                 if ( is23(dur_ary, i, xobj.end) || is32(dur_ary, i, xobj.end) ) {
    //                     for (var j=0; j < 2; ++i, ++j) acc = setTmcElps(acc, tmbase, tmscale, 5);
    //                 } else if ( is2224(dur_ary, i, xobj.end) ) {
    //                     for (var j=0; j < 4; ++i, ++j) acc = setTmcElps(acc, tmbase, tmscale, 5);
    //                 } else {
    //                     acc = setTmcElps(acc, tmbase, tmscale, dur_ary[i++]*2);
    //                 }
    //             }
    //         } else {
    //             for (var i = xobj.start; i < xobj.end+1; ++i){
    //                 acc = setTmcElps(acc, tmbase, tmscale, dur_ary[i]*2);
    //             }
    //         }

    //         return acc;
    //     }, { elapsed:0.0, chpt_idx:0, tmc:"# timecode format v2\r\n", nchpt:"" });

    //     var total_microsec = Math.round(1000000 * (tmcNchpt_obj.elapsed + Number(dur_ary.slice(-2)[0])*2) * tmbase / tmscale);
    //     aclib.log("elapsed: " + nsAC.ms2hhmmss_sss(total_microsec/1000), 0);
    //     tmcNchpt_obj.tmc += "# total: " + total_microsec/1000000 + " seconds\r\n"

    //     return {tmc:tmcNchpt_obj.tmc, nchpt:tmcNchpt_obj.nchpt};
    // }

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.postprocKFM = function() {
        var input = new File(this.args.input);
        var kfmprefix = input.base() + ".kfm_" + this.params.source;
        var procKFM_dur = input.parent().childFile(kfmprefix + ".duration.txt");
        var procKFM_tmc = input.parent().childFile(kfmprefix + ".timecode.txt");
        var trim_obj = this.options.avs.trim;
        if (Object.keys(trim_obj).length === 0) {
            this.options.mux.timecode.push(procKFM_tmc.path());
            return true;
        } else if (Object.keys(trim_obj).length === 1) {
            return false;
        }

        var avs = new File(this.options.temp + ".avs");
        var script = avs.read("Shift-JIS");
        if (script === null) {
            aclib.log("Can't read file. [" + avs.path() + "]", 1);
            return false;
        }

        script = script.replace(/__kfmprefix__/g,'"' + input.parent().path() + "\\" + kfmprefix + '"');
        if (!avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + avs.path() + "]", 1);
            return false;
        }

        var durations = procKFM_dur.read("Shift-JIS");
        if (durations === null) {
            aclib.log("Can't read file. [" + procKFM_dur.path() + "]", 1);
            return false;
        }

        var mod_tmc = new File(this.options.temp + ".timecode.txt");
        var nero_chapter = new File(this.options.temp + ".nero_chapter.txt");
        var tmcNchpt_obj = nsAC.fixVfrTmcNchpt(durations, trim_obj, true);
        // var tmcNchpt_obj = nsAC.fixVfrTmcNchpt(durations, trim_obj, false);
        if (tmcNchpt_obj.tmc === null || tmcNchpt_obj.nchpt === null) {
            aclib.log("Failed fixVfrTmcNchpt()", 1);
            return false;
        }

        if (!mod_tmc.write(tmcNchpt_obj.tmc, "Shift-JIS")) {
            aclib.log("Can't write file. [" + mod_tmc.path() + "]", 1);
            return false;
        }

        if (!nero_chapter.write(tmcNchpt_obj.nchpt, "Shift-JIS")) {
            aclib.log("Can't write file. [" + nero_chapter.path() + "]", 1);
            return false;
        }

        this.options.mux.chapter.push(nero_chapter.path());
        this.options.mux.timecode.push(mod_tmc.path());

        return true;
    }

    // -----------------------------------------------------------
}());
