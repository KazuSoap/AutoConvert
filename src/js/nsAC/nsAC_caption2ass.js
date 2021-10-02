var nsAC = nsAC || {};

(function() {
    nsAC.AutoConvert.prototype.caption2ass = function() {
        var caption2ass_srt = new File(this.options.temp + ".caption2ass.srt");
        var caption2ass_trim = new File(this.options.temp + ".caption2ass.trim.srt");

        // Run process
        var proc = new Process('"${caption2ass}" -format srt "${input}" "${output}"');

        proc.prepare({
            caption2ass: this.path.caption2ass,
            input: this.args.input,
            output: caption2ass_srt.path()
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!caption2ass_srt.exists()) {
            aclib.log("No subtitle file.", 1);
            return true;
        }

        if (this.options.avs.trim.length === 0) {
            this.options.mux.subtitle.push(caption2ass_srt.path());
        } else {
            var proc2 = new Process('cscript //nologo "${srttrim}" -i "${input}" -a "${avs}" -o "${output}" -e');

            proc2.prepare({
                srttrim: new Folder(aclib.path()).childFolder("src").childFolder("lib").childFile("srttrim.js").path(),
                input: caption2ass_srt.path(),
                avs: this.options.temp + ".avs",
                output: caption2ass_trim.path()
            }, {window: this.settings.window, debug: this.options.debug});

            if (!proc2.run()) {
                aclib.log("Process failed.", 1);
                return false;
            }

            if (!caption2ass_trim.exists()) {
                aclib.log("Can't trim subtitle.", 1);
                return false;
            }

            this.options.mux.subtitle.push(caption2ass_trim.path());
        }

        return true;
    };
}());
