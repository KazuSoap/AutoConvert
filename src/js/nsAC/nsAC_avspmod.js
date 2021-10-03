var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.editAvs = function() {
        var proc = new Process('"${avspmod}" "${input}"');
        proc.prepare({
            avspmod: this.path.avspmod,
            input: this.options.temp + ".avs"
        }, {window: this.settings.window, debug: this.options.debug});

        proc.run();

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.editTrim = function() {
        var avspmod_avs = new File(this.options.temp + ".avspmod.avs");

        var template_avs = new File(this.path.avspmod_avs);
        var script = template_avs.read("Shift-JIS");
        if (script === null) {
            aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
            return false;
        }

        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, this.options.avs.video[0]);
        script = nsAC.replaceTrim(this.options.avs.trim, script);

        if (this.params.deint === "kfm_vfr") {
            var input = new File(this.args.input);
            var kfmprefix = input.base() + ".kfm_" + this.params.source;
            script = script.replace(/__kfmprefix__/g,'"' + input.parent().path() + "\\" + kfmprefix + '"');
        }

        if (!avspmod_avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + avspmod_avs.path() + "]", 1);
            return false;
        }

        var proc = new Process('"${avspmod}" "${input}"');
        proc.prepare({
            avspmod: this.path.avspmod,
            input: avspmod_avs.path()
        }, {window: this.settings.window, debug: this.options.debug});

        proc.run();

        var trim_script = avspmod_avs.read("Shift-JIS");
        if (trim_script === null) {
            aclib.log("Can't read file. [" + avspmod_avs.path() + "]", 1);
            return false;
        }

        var trim_obj = nsAC.getTrim(trim_script);
        if (Object.keys(trim_obj).length === 0) {
            aclib.log("Can't get trim.", 1);
            return false;
        }

        if (this.params.deint === "kfm_vfr" && Object.keys(this.options.avs.trim).length !== 0) {
            var procKFM_dur = input.parent().childFile(kfmprefix + ".duration.txt");
            var durations = procKFM_dur.read("Shift-JIS");
            if (durations === null) {
                aclib.log("Can't read file. [" + procKFM_dur.path() + "]", 1);
                return false;
            }
            trim_obj = {trim1:this.options.avs.trim.trim1, trim2:trim_obj.trim1};
            this.options.avs.trim = nsAC.fixCfrTrim(durations, trim_obj, true);
        } else {
            this.options.avs.trim = trim_obj;
        }

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.mkVindex = function() {
        var avspmod_avs = new File(this.options.temp + ".avspmod.avs");

        var template_avs = new File(this.path.avspmod_avs);
        var script = template_avs.read("Shift-JIS");
        if (script === null) {
            aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
            return false;
        }

        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, this.options.avs.video[0]);

        if (!avspmod_avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + avspmod_avs.path() + "]", 1);
            return false;
        }

        var proc = new Process('"${avs2pipemod}" ${mode} "${input}"');
        proc.prepare({
            avs2pipemod: this.path.avs2pipemod,
            mode: "-info",
            input: avspmod_avs.path()
        }, {window: this.settings.window, debug: this.options.debug});

        proc.run();

        return true;
    };

    // -----------------------------------------------------------
}());
