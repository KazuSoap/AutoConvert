var nsAC = nsAC || {};

(function() {
    nsAC.AutoConvert.prototype.caption2ass = function() {
        var caption2ass_srt = new File(this.options.temp + ".caption2ass.srt");
        var proc = new Process('"${caption2ass}" -format srt "${input}" "${output}"');
        proc.prepare({
            caption2ass: this.path.caption2ass,
            input: this.args.input,
            output: caption2ass_srt.path().slice(0, -4)
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

        if (Object.keys(this.options.avs.trim).length === 0) {
            this.options.mux.subtitle.push(caption2ass_srt.path());
        } else {
            var trim = this.options.avs.trim
            var script = nsAC.replaceTrim(trim, "#__trim1__\n");
            var avs = new File(this.options.temp + "caption2ass.avs");
            if (!avs.write(script)) {
                aclib.log("Can't write file. [" + avs.path() + "]", 1);
                return false;
            }

            var caption2ass_trim = new File(this.options.temp + ".caption2ass.trim.srt");
            var proc2 = new Process('cscript //nologo "${srttrim}" -i "${input}" -a "${avs}" -o "${output}" -f "${fps}" -e');
            proc2.prepare({
                srttrim: new Folder(aclib.path()).childFolder("src").childFolder("lib").childFile("srttrim.js").path(),
                input: caption2ass_srt.path(),
                avs: avs.path(),
                output: caption2ass_trim.path(),
                fps: "60000/1001"
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
