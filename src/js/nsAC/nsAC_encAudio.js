var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.fakeaacwav = function() {
        var avs = new File(this.options.temp + ".avs");

        for (var i = 0; i < this.options.avs.audio.length; i++) {
            var fakeaacwav_ext = new File(this.options.temp + ".fakeaacwav_" + i + "." + this.preset.audio.extension);
            var fakeaacwav_wav = new File(this.options.temp + ".fakeaacwav_" + i + ".wav");
            var fakeaacwav_avs = new File(this.options.temp + ".fakeaacwav_" + i + ".avs");

            var script = avs.read("Shift-JIS");

            if (script === null) {
                aclib.log("Can't read file. [" + avs.path() + "]", 1);
                return false;
            }

            // Replace
            script = script.replace(/__audioid__/g, i);

            if (!fakeaacwav_avs.write(script, "Shift-JIS")) {
                aclib.log("Can't write file. [" + fakeaacwav_avs.path() + "]", 1);
                return false;
            }

            // Run process
            var proc = new Process('"${avs2pipemod}" -wav "${input}" > "${wav}" & "${encoder}" ' + this.preset.audio.option);

            proc.prepare({
                avs2pipemod: this.path.avs2pipemod,
                input: fakeaacwav_avs.path(),
                encoder: this.preset.audio.encoder,
                wav: '"' + fakeaacwav_wav.path() + '"',
                output: '"' + fakeaacwav_ext.path() + '"'
            }, {window: this.settings.window, debug: this.options.debug});

            if (!proc.run()) {
                aclib.log("Process failed.", 1);
                return false;
            }

            // Check files
            if (!fakeaacwav_ext.exists()) {
                aclib.log("Can't encode audio.", 1);
                return false;
            }

            this.options.mux.audio.push(fakeaacwav_ext.path());
        }

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.encAudio = function() {
        var avs = new File(this.options.temp + ".avs");

        for (var i = 0; i < this.options.avs.audio.length; i++) {
            var encAudio_ext = new File(this.options.temp + ".encAudio_" + i + "." + this.preset.audio.extension);
            var encAudio_avs = new File(this.options.temp + ".encAudio_" + i + ".avs");

            var script = avs.read("Shift-JIS");

            if (script === null) {
                aclib.log("Can't read file. [" + avs.path() + "]", 1);
                return false;
            }

            // Replace
            script = script.replace(/__audioid__/g, i);

            if (!encAudio_avs.write(script, "Shift-JIS")) {
                aclib.log("Can't write file. [" + encAudio_avs.path() + "]", 1);
                return false;
            }

            // Run process
            var proc = new Process('"${avs2pipemod}" -wav "${input}" | "${encoder}" ' + this.preset.audio.option);

            proc.prepare({
                avs2pipemod: this.path.avs2pipemod,
                input: encAudio_avs.path(),
                encoder: this.preset.audio.encoder,
                wav: '-',
                output: '"' + encAudio_ext.path() + '"'
            }, {window: this.settings.window, debug: this.options.debug});

            if (!proc.run()) {
                aclib.log("Process failed.", 1);
                return false;
            }

            // Check files
            if (!encAudio_ext.exists()) {
                aclib.log("Can't encode audio.", 1);
                return false;
            }

            this.options.mux.audio.push(encAudio_ext.path());
        }

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.wav = function() {
        var avs = new File(this.options.temp + ".avs");

        for (var i = 0; i < this.options.avs.audio.length; i++) {
            var wav_wav = new File(this.options.temp + ".wav_" + i + ".wav");
            var wav_avs = new File(this.options.temp + ".wav_" + i + ".avs");

            var script = avs.read("Shift-JIS");

            if (script === null) {
                aclib.log("Can't read file. [" + avs.path() + "]", 1);
                return false;
            }

            // Replace
            script = script.replace(/__audioid__/g, i);

            if (!wav_avs.write(script, "Shift-JIS")) {
                aclib.log("Can't write file. [" + wav_avs.path() + "]", 1);
                return false;
            }

            // Run process
            var proc = new Process('"${avs2pipemod}" -wav "${input}" > "${output}"');

            proc.prepare({
                avs2pipemod: this.path.avs2pipemod,
                input: wav_avs.path(),
                output: wav_wav.path()
            }, {window: this.settings.window, debug: this.options.debug});

            if (!proc.run()) {
                aclib.log("Process failed.", 1);
                return false;
            }

            // Check files
            if (!wav_wav.exists()) {
                aclib.log("Can't encode audio.", 1);
                return false;
            }

            this.options.mux.audio.push(wav_wav.path());
        }

        return true;
    };


    // -----------------------------------------------------------
}());
