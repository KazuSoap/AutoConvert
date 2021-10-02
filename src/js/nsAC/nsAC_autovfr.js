var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.fixCfrTrim = function(durations, trim_obj, is_editTrim) {
        if (Object.keys(trim_obj).length === 0)  return {};
        if (Object.keys(trim_obj).length === 1)  return trim_obj;

        var dur_ary = durations.split(/\r\n|\r|\n/);
        var vfrflame = {num:0,idx:0};
        var trim1_ary = trim_obj.trim2.map(function(trim_item){
            var otrim_item = {start:0,end:0};
            dur_ary.slice(vfrflame.idx).some(function(x,idx){
                vfrflame.num += Number(x);
                if ( vfrflame.idx + idx + 1 <= trim_item.start ) {
                    otrim_item.start = vfrflame.num;
                }
                if (vfrflame.idx + idx + 1 <= trim_item.end) {
                    otrim_item.end = vfrflame.num;
                } else {
                    vfrflame.idx += idx + 1;
                    return true;
                }
                return false;
            });
            return otrim_item;
        });

        if ( is_editTrim ) {
            trim1_ary.forEach(function(trim_item,idx,ary){
                ary[idx].start = Math.floor(trim_item.start/2);
                ary[idx].end = Math.floor(trim_item.end/2);
            })
        }

        return {trim1:trim1_ary, trim2:trim_obj.trim2};
    }

    // -----------------------------------------------------------
    nsAC.getVfrTrim = function(durations, trim_obj) {
        if (Object.keys(trim_obj).length === 0)  return {};
        if (Object.keys(trim_obj).length === 2)  return trim_obj;

        var dur_ary = durations.split(/\r\n|\r|\n/);
        var vfrflame = {num:0,idx:0};
        var trim2_ary = trim_obj.trim1.map(function(trim_item){
            var otrim_item = {start:0,end:0};
            dur_ary.slice(vfrflame.idx).some(function(x,idx){
                vfrflame.num += Number(x);
                if(vfrflame.num <= trim_item.start *2){
                    otrim_item.start = vfrflame.idx + idx + 1;
                }
                if(vfrflame.num <= trim_item.end *2){
                    otrim_item.end = vfrflame.idx + idx + 1;
                } else {
                    vfrflame.idx += idx + 1;
                    return true;
                }
                return false;
            });
            return otrim_item;
        });

        return {trim1:trim_obj.trim1, trim2:trim2_ary};
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
    nsAC.timecodeTrim = function(durations, trim_obj) {
        if (trim_obj["trim2"].length === 0)  return "";

        var dur_ary = durations.split(/\r\n|\r|\n/);
        var elapsed = 0.0;
        var fps_denominator = 1001.0;
        var fps_numerator = 60000.0;
        var tick = fps_denominator / fps_numerator;
        var tmcode_ary = trim_obj["trim2"].reduce(function(acc,xobj) {
            var tmctmp_ary = [];
            for (var i = xobj.start; i < xobj.end+1 && i < dur_ary.length; ++i){
                elapsed += dur_ary[i] * tick;
                tmctmp_ary.push(Math.round(elapsed*1000));
            }
            return acc.concat(tmctmp_ary);
        },[]);
        tmcode_ary.pop();

        return "# timecode format v2\r\n0\r\n" + tmcode_ary.join("\r\n");
    }

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
        tmcode = nsAC.timecodeTrim(durations, trim_obj);
        if (tmcode === null) {
            aclib.log("Failed Timecode Trim.", 1);
            return false;
        }

        if (!mod_tmc.write(tmcode, "Shift-JIS")) {
            aclib.log("Can't write file. [" + mod_tmc.path() + "]", 1);
            return false;
        }

        this.options.mux.timecode.push(mod_tmc.path());

        return true;
    }

    // -----------------------------------------------------------
}());
