var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.getTrim = function(avs_script) {
        var arr = avs_script.split(/\r\n|\r|\n/);
        var format = / *(\+\+|) *trim *\( *(\d+) *, *(\d+) *\)/ig;
        var trim_obj = {};
        var trim_idx = 0;

        arr.forEach(function (value) {
            if (/^ *#/.test(value) || !format.test(value)) return;

            var trim_tmp = [];
            value.replace(format, function ($0, $1, $2, $3) {
                trim_tmp.push({
                    start: parseInt($2, 10),
                    end: parseInt($3, 10)
                });
            });

            trim_idx++;
            trim_obj["trim"+trim_idx] = trim_tmp;

            return;
        });

        return trim_obj;
    };

    // -----------------------------------------------------------
    nsAC.replaceTrim = function(trim_obj, avs_script) {
        var trim_key = Object.keys(trim_obj).sort();
        trim_key.forEach(function(item) {
            if (trim_obj[item].length === 0)  return;

            var trim_str = trim_obj[item].map(function(value) {
                return "Trim(" + value.start + ", " + value.end + ")";
            }).join(" ++ ");

            var regex = new RegExp("#__" + item + "__", "g");
            avs_script = avs_script.replace(regex, trim_str);
            return;
        });

        return avs_script;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.readTrim = function() {
        var input = new File(this.args.input);
        var trim_json = input.parent().childFile(input.base() + ".trim_" + this.params.source + ".json");

        if (!trim_json.exists()) return true;

        // Remove
        // if (this.params.onlytrim && !this.params.edittrim) {
        //     if (!trim_json.remove()) {
        //         aclib.log("Can't delete file. [" + trim_json.path() + "]", 1);
        //         return false;
        //     }
        //     return true;
        // }

        // Read
        var trim_out = trim_json.read();
        if (trim_out === null) {
            aclib.log("Can't read file. [" + trim_json.path() + "]", 1);
            return false;
        }

        var trim_obj;
        try {
            trim_obj = JSON.parse(trim_out);
        } catch (err) {
            aclib.log("Can't parse JSON. [" + trim_json.path() + "]", 1);
            return false;
        }

        this.options.avs.trim = trim_obj;

        return true;
    };

    // -----------------------------------------------------------
    nsAC.ms2hhmmss_sss = function(msec) {
        var date = new Date(msec);
        var hhmmss_sss = ( "00" + date.getUTCHours()       ).slice(-2) + ":"
                       + ( "00" + date.getUTCMinutes()     ).slice(-2) + ":"
                       + ( "00" + date.getUTCSeconds()     ).slice(-2) + "."
                       + ("000" + date.getUTCMilliseconds()).slice(-3);

        return hhmmss_sss;
    }

    // -----------------------------------------------------------
    nsAC.ms2neroChaptFmt = function(msec, idx) {
        var hhmmss_sss = nsAC.ms2hhmmss_sss(msec);
        var chpt_idx = ("00" + idx).slice(-2);
        var ncfmt = "CHAPTER" + chpt_idx + "=" + hhmmss_sss + "\r\n"
                  + "CHAPTER" + chpt_idx + "NAME=Chapt" + chpt_idx + "\r\n";

        return ncfmt;
    }

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.genNeroChapter = function() {
        var trim_obj = this.options.avs.trim;
        if (Object.keys(trim_obj).length === 0)  return true;
        if (this.params.autovfr) return true;

        var nero_chapter = new File(this.options.temp + ".nero_chapter.txt");
        var tmbase = 1001.0, tmscale = 30000.0;

        var nchptr_obj = trim_obj.trim1.reduce(function(acc,xobj,idx,ary) {
            if (ary.length === idx+1) return acc;
            acc.bound += xobj.end - xobj.start + 1;
            acc.str += nsAC.ms2neroChaptFmt(Math.round(1000 * acc.bound * tmbase / tmscale), idx+2);

            return acc;
        },{bound:0, str:"CHAPTER01=00:00:00.000\r\nCHAPTER01NAME=Chapt01\r\n"});

        if (!nero_chapter.write(nchptr_obj.str, "Shift-JIS")) {
            aclib.log("Can't write file. [" + nero_chapter.path() + "]", 1);
            return false;
        }

        this.options.mux.chapter.push(nero_chapter.path());

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.writeTrim = function() {
        if (Object.keys(this.options.avs.trim).length === 0) return true;

        var input = new File(this.args.input);
        var avs = new File(this.options.temp + ".avs");
        var trim_json = input.parent().childFile(input.base() + ".trim_" + this.params.source + ".json");
        var trim = this.options.avs.trim;

        // Write
        var str = JSON.stringify(trim);
        if (!trim_json.write(str)) {
            aclib.log("Can't write file. [" + trim_json.path() + "]", 1);
            return false;
        }

        if (!this.params.onlytrim) {
            this.options.clean.push(input.parent().childFile(input.base() + ".trim").path());

            // Read
            var script = avs.read("Shift-JIS");
            if (script === null) {
                aclib.log("Can't read file. [" + avs.path() + "]", 1);
                return false;
            }

            // Replace & Write
            if (this.params.autovfr && Object.keys(this.options.avs.trim).length === 2) {
                var kfmprefix = input.base() + ".kfm_" + this.params.source;
                var procKFM_dur = input.parent().childFile(kfmprefix + ".duration.txt");
                var durations = procKFM_dur.read("Shift-JIS");
                if (durations === null) {
                    aclib.log("Can't read file. [" + procKFM_dur.path() + "]", 1);
                    return false;
                }
                trim = nsAC.fixCfrTrim(durations, trim, false);
            }

            script = nsAC.replaceTrim(trim, script);
            if (!avs.write(script, "Shift-JIS")) {
                aclib.log("Can't write file. [" + avs.path() + "]", 1);
                return false;
            }

            this.options.avs.trim = trim;
        }

        return true;
    };

    // -----------------------------------------------------------
}());
