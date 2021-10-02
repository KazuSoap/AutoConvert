var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.editAvs = function() {
        // Run process
        var proc = new Process('"${avspmod}" "${input}"');

        proc.prepare({
            avspmod: this.path.avspmod,
            input: this.options.temp + ".avs"
        }, {window: this.settings.window, debug: this.options.debug});

        proc.run();

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.checkOutputVideo = function() {
        var othersAvsDir = (new File(this.path.avspmod_avs)).parent();
        var checkOutputVideo_avs = new File(this.options.temp + ".avspmod.avs");
        var template_avs = othersAvsDir.childFile("checkOutputVideo.avs");
        var dest_ext = new File(this.args.output + ".mp4");

        // Check files
        if (!dest_ext.exists()) {
            aclib.log("File doesn't exist. [" + dest_ext.path() + "]");
            aclib.log("Skip This Process");
            return true;
        }

        var script = template_avs.read("Shift-JIS");
        if (script === null) {
            aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
            return false;
        }

        // Replace
        script = script.replace(/__input__/g, '"' + this.args.input + '"');
        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, 'LWLibavVideoSource_("' + dest_ext.path() + '",fpsnum=60000,fpsden=1001,format="YUV420P8")');
        script = script.replace(/__audio__/g, 'LWLibavAudioSource_("' + dest_ext.path() + '")');

        if (!checkOutputVideo_avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + checkOutputVideo_avs.path() + "]", 1);
            return false;
        }

        // Run process
        var proc = new Process('"${avspmod}" "${input}"');

        proc.prepare({
            avspmod: this.path.avspmod,
            input: checkOutputVideo_avs.path()
        }, {window: this.settings.window, debug: this.options.debug});

        proc.run();

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.editTrim = function() {
        var avspmod_avs = new File(this.options.temp + ".avspmod.avs");
        var template_avs = new File(this.path.avspmod_avs);
        var trim = this.options.avs.trim;

        var script = template_avs.read("Shift-JIS");
        if (script === null) {
            aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
            return false;
        }

        // Replace
        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, this.options.avs.video[0]);

        if (trim.length !== 0) {
            var trim_str = trim.map(function(value) {
                return "Trim(" + value.start + ", " + value.end + ")";
            }).join(" ++ ");
            script = script.replace(/#__trim__/g, trim_str);
        }

        if (!avspmod_avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + avspmod_avs.path() + "]", 1);
            return false;
        }

        // Run process
        var proc = new Process('"${avspmod}" "${input}"');

        proc.prepare({
            avspmod: this.path.avspmod,
            input: avspmod_avs.path()
        }, {window: this.settings.window, debug: this.options.debug});

        proc.run();

        // Read
        var trim_script = avspmod_avs.read("Shift-JIS");

        if (trim_script === null) {
            aclib.log("Can't read file. [" + avspmod_avs.path() + "]", 1);
            return false;
        }

        var trim_arr = nsAC.getTrim(trim_script);

        if (trim_arr.length === 0) {
            aclib.log("Can't get trim.", 1);
            return false;
        }

        this.options.avs.trim = trim_arr;

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

        // Replace
        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, this.options.avs.video[0]);

        if (!avspmod_avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + avspmod_avs.path() + "]", 1);
            return false;
        }

        // Run process
        var proc = new Process('"${avs2pipemod}" ${mode} "${input}"');

        proc.prepare({
            avs2pipemod: this.path.avs2pipemod,
            mode: "-info",
            input: avspmod_avs.path()
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        return true;
    };

    // -----------------------------------------------------------
}());
