var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.preprocKFM = function() {
        var preprocKFM_avs  = new File(this.options.temp + ".preprocKFM.avs");
        var template_avs    = new File(this.path.autovfr_avs);
        var preprocKFM_dat  = new File(this.options.temp + ".result.dat");
        var preprocKFM_dur  = new File(this.options.temp + ".duration.txt");
        var preprocKFM_tmc  = new File(this.options.temp + ".timecode.txt");

        var trim = this.options.avs.trim;

        // Read
        var script = template_avs.read("Shift-JIS");

        if (script === null) {
            aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
            return false;
        }

        // Replace
        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, this.options.avs.video[0]);
        script = script.replace(/__kfmfilepath__/g,'"' + this.options.temp + '"');

        if (trim.length !== 0) {
            var trim_str = trim.map(function(value) {
                return "Trim(" + value.start + ", " + value.end + ")";
            }).join(" ++ ");
            script = script.replace(/#__trim__/g, trim_str);
        }

        for (var i = 1; i < 3; i++) {
            if (!preprocKFM_avs.write(script.replace(/__times__/g, i), "Shift-JIS")) {
                aclib.log("Can't write file. [" + preprocKFM_avs.path() + "]", 1);
                return false;
            }

            // Run process
            var proc = new Process('"${avs2pipemod}" -benchmark "${input}"');

            proc.prepare({
                avs2pipemod: this.path.avs2pipemod,
                input: preprocKFM_avs.path()
            }, {window: this.settings.window, debug: this.options.debug});

            if (!proc.run()) {
                aclib.log("Process failed.", 1);
                return false;
            }
        }

        // Check files
        if (!preprocKFM_dat.exists()) {
            aclib.log("Can't find file. [" + preprocKFM_dat.path() + "]", 1);
            return false;
        }

        if (!preprocKFM_dur.exists()) {
            aclib.log("Can't find file. [" + preprocKFM_dur.path() + "]", 1);
            return false;
        }

        if (!preprocKFM_tmc.exists()) {
            aclib.log("Can't find file. [" + preprocKFM_tmc.path() + "]", 1);
            return false;
        }

        this.options.mux.timecode.push(preprocKFM_tmc.path());

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.autovfr = function() {
        var avs = new File(this.options.temp + ".avs");
        var autovfr_avs = new File(this.options.temp + ".autovfr.avs");
        var template_avs = new File(this.path.autovfr_avs);
        var autovfr_txt = new File(this.options.temp + ".autovfr.txt");
        var autovfr_def = new File(this.options.temp + ".autovfr.def");
        var autovfr_tmc = new File(this.options.temp + ".autovfr.tmc");
        var trim = this.options.avs.trim;
        var trim_crc = (function() {
            var trim_arr = trim.reduce(function(prev, value) {
                prev.push(value.start);
                prev.push(value.end);
                return prev;
            }, []);
            return trim_arr.length === 0 ? "" : aclib.crc32(trim_arr);
        })();
        var input = new File(this.args.input);
        var output = input.parent().childFile(input.base() + ".autovfr_" + this.params.source + "_" + trim_crc + ".json");

        this.options.clean.push(input.parent().childFile(input.base() + ".autovfr").path());

        if (!this.params.reset && output.exists()) {
            var output_out;
            output_out = output.read();
            if (output_out === null) {
                aclib.log("Can't read file. [" + output.path() + "]", 1);
                return false;
            }

            var output_obj;
            try {
                output_obj = JSON.parse(output_out);
            } catch (err) {
                aclib.log("Can't parse JSON. [" + output.path() + "]", 1);
                return false;
            }

            if (!autovfr_def.write(output_obj.def, "Shift-JIS")) {
                aclib.log("Can't write file. [" + autovfr_def.path() + "]", 1);
                return false;
            }

            script = avs.read("Shift-JIS");
            if (script === null) {
                aclib.log("Can't read file. [" + avs.path() + "]", 1);
                return false;
            }
            script = script.replace(/__def__/g, autovfr_def.path());
            script = script.replace(/__tmc__/g, autovfr_tmc.path());

            if (!avs.write(script, "Shift-JIS")) {
                aclib.log("Can't write file. [" + avs.path() + "]", 1);
                return false;
            }

            this.options.mux.timecode.push(autovfr_tmc.path());

            return true;
        }

        // Read
        var script = template_avs.read("Shift-JIS");

        if (script === null) {
            aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
            return false;
        }

        // Replace
        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, this.options.avs.video[0]);
        script = script.replace(/__audio__/g, this.options.avs.audio[0]);
        script = script.replace(/__delay__/g, this.options.avs.delay[0]);

        if (trim.length !== 0) {
            var trim_str = trim.map(function(value) {
                return "Trim(" + value.start + ", " + value.end + ")";
            }).join(" ++ ");
            script = script.replace(/#__trim__/g, trim_str);
        }

        script = script.replace(/__autovfr__/g, autovfr_txt.path());

        if (!autovfr_avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + autovfr_avs.path() + "]", 1);
            return false;
        }

        // Run process
        var proc = new Process('"${avs2pipemod}" -benchmark "${input}"');

        proc.prepare({
            avs2pipemod: this.path.avs2pipemod,
            input: autovfr_avs.path()
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!autovfr_txt.exists()) {
            aclib.log("Can't find file. [" + autovfr_txt.path() + "]", 1);
            return false;
        }

        // Run process
        var proc2 = new Process('"${autovfr}" -i "${input}" -o "${output}" -ini "${ini}" ${args}');

        proc2.prepare({
            autovfr: this.path.autovfr,
            input: autovfr_txt.path(),
            output: autovfr_def.path(),
            ini: this.path.autovfr_ini,
            args: this.command.autovfr
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc2.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!autovfr_def.exists()) {
            aclib.log("Can't find file. [" + autovfr_def.path() + "]", 1);
            return false;
        }

        // Read
        script = avs.read("Shift-JIS");

        if (script === null) {
            aclib.log("Can't read file. [" + avs.path() + "]", 1);
            return false;
        }

        script = script.replace(/__def__/g, autovfr_def.path());
        script = script.replace(/__tmc__/g, autovfr_tmc.path());

        if (!avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + avs.path() + "]", 1);
            return false;
        }

        this.options.mux.timecode.push(autovfr_tmc.path());

        // Read def
        var output_def = autovfr_def.read("Shift-JIS");

        if (output_def === null) {
            aclib.log("Can't read file. [" + autovfr_def.path() + "]", 1);
            return false;
        }

        // Write output
        var str = JSON.stringify({
            def: output_def
        });

        if (!output.write(str)) {
            aclib.log("Can't write file. [" + output.path() + "]", 1);
            return false;
        }

        return true;
    };

    // -----------------------------------------------------------
}());
