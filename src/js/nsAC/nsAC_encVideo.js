var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.encVideo = function() {
        var avs = new File(this.options.temp + ".avs");
        var encVideo_ext = new File(this.options.temp + ".encVideo." + this.preset.video.extension);

        // Run process
        var proc = new Process('"${avs2pipemod}" ${mode} "${input}" | "${encoder}" ' + this.preset.video.option);
        //var proc = new Process('"${encoder}" ' + this.preset.video.option);

        proc.prepare({
            avs2pipemod: this.path.avs2pipemod,
            mode: (function(self) {
                if (/\${videot}/.test(self.preset.video.option)) {
                    return "-y4mt";
                }
                if (/\${videob}/.test(self.preset.video.option)) {
                    return "-y4mb";
                }
                return "-y4mp";
            })(this),
            input: avs.path(),
            //input: '"' + avs.path() + '"',
            encoder: this.preset.video.encoder,
            video: '-',
            videot: '-',
            videob: '-',
            output: '"' + encVideo_ext.path() + '"'
        }, {window: this.settings.window, debug: this.options.debug, charset: "UTF-8"});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!encVideo_ext.exists()) {
            aclib.log("Can't encode video.", 1);
            return false;
        }

        this.options.mux.video.push(encVideo_ext.path());

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.encMedia = function() {
        var avs = new File(this.options.temp + ".avs");
        var encMedia_ext = new File(this.options.temp + ".encMedia." + this.preset.video.extension);

        // Run process
        var proc = new Process('"${avs2pipemod}" ${mode} "${input}" | "${encoder}" ' + this.preset.video.option);

        proc.prepare({
            avs2pipemod: this.path.avs2pipemod,
            mode: (function(self) {
                if (/\${videot}/.test(self.preset.video.option)) {
                    return "-y4mt";
                }
                if (/\${videob}/.test(self.preset.video.option)) {
                    return "-y4mb";
                }
                return "-y4mp";
            })(this),
            input: avs.path(),
            encoder: this.preset.video.encoder,
            video: '-',
            videot: '-',
            videob: '-',
            audio: '"' + this.options.mux.audio[0] + '"',
            output: '"' + encMedia_ext.path() + '"'
        }, {window: this.settings.window, debug: this.options.debug, charset: "UTF-8"});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!encMedia_ext.exists()) {
            aclib.log("Can't encode video.", 1);
            return false;
        }

        this.options.move = encMedia_ext.path();

        return true;
    };

    // -----------------------------------------------------------
}());
