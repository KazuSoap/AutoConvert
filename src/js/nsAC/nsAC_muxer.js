var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    function check(path) {
        var ftyp;
        try {
            var ado = new ActiveXObject("ADODB.Stream");
            ado.Type = 2;
            ado.Charset = "ascii";
            ado.Open();
            ado.LoadFromFile(path);
            ado.Position = 4;
            ftyp = ado.ReadText(4);
            ado.Close();
        } catch (err) {
            return null;
        }
        return ftyp === "ftyp";
    }

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.lsmuxer = function() {
        var self = this;

        function mux(source, dest) {
            var lsmuxer_source = new File(source);
            var lsmuxer_dest = new File(dest);

            var proc = new Process('"${lsmuxer}" --isom-version 6 -i "${input}"?fps=60000/1001 -o "${output}"');
            proc.prepare({
                lsmuxer: self.path.lsmuxer,
                input: lsmuxer_source.path(),
                output: lsmuxer_dest.path()
            }, {window: self.settings.window, debug: self.options.debug});

            if (!proc.run()) {
                aclib.log("Process failed.", 1);
                return false;
            }

            if (!lsmuxer_dest.exists()) {
                aclib.log("Can't mux mp4.", 1);
                return false;
            }

            return true;
        }

        function every(value, index, array) {
            if (check(value)) return true;

            var source = new File(value);
            var dest = source.parent().childFile(source.base() + ".lsmuxer.mp4");

            array[index] = dest.path();

            return mux(source.path(), dest.path());
        }

        if (!this.options.mux.video.every(every)) return false;
        if (!this.options.mux.audio.every(every)) return false;

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.timelineeditor = function() {
        var timelineeditor_mp4 = new File(this.options.temp + ".timelineeditor.mp4");

        // Run process
        var proc2 = new Process('"${timelineeditor}" --timecode "${timecode}" "${input}" "${output}"');

        proc2.prepare({
            timelineeditor: this.path.timelineeditor,
            timecode: this.options.mux.timecode[0],
            input: this.options.mux.video[0],
            output: timelineeditor_mp4.path()
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc2.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!timelineeditor_mp4.exists()) {
            aclib.log("Can't add timecode.", 1);
            return false;
        }

        this.options.mux.video[0] = timelineeditor_mp4.path();

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.lsremuxer = function() {
        var lsmuxer_mp4 = new File(this.options.temp + ".lsmuxer.mp4");
        var args = "";

        this.options.mux.video.forEach(function(value, index) {
            args += ' -i "' + value + '"' + (index === 0 ? '' : '?1:disable');
        });

        this.options.mux.audio.forEach(function(value, index) {
            args += ' -i "' + value + '"' + (index === 0 ? '' : '?1:disable');
        });

        // Run process
        var proc = new Process('"${lsremuxer}" --chapter "${chapter}" ${args} -o "${output}"');

        proc.prepare({
            lsremuxer: this.path.lsremuxer,
            args: args,
            output: lsmuxer_mp4.path(),
            chapter: this.options.mux.chapter[0]
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!lsmuxer_mp4.exists()) {
            aclib.log("Can't remux mp4.", 1);
            return false;
        }

        this.options.move = lsmuxer_mp4.path();

        return true;
    }

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.mp4box_mux = function() {
        var self = this;

        function mux(source, dest) {
            var mp4box_source = new File(source);
            var mp4box_dest = new File(dest);

            // Run process
            var proc = new Process('"${mp4box}" -fps 59.94 -add ${input} -new "${output}"');
            proc.prepare({
                mp4box: self.path.mp4box,
                input: mp4box_source.path(),
                output: mp4box_dest.path()
            }, {window: self.settings.window, debug: self.options.debug});

            if (!proc.run()) {
                aclib.log("Process failed.", 1);
                return false;
            }

            // Check files
            if (!mp4box_dest.exists()) {
                aclib.log("Can't mux mp4.", 1);
                return false;
            }

            return true;
        }

        function every(value, index, array) {
            if (check(value)) return true;

            var source = new File(value);
            var dest = source.parent().childFile(source.base() + ".mp4box_mux.mp4");

            array[index] = dest.path();

            return mux(source.path(), dest.path());
        }

        if (!this.options.mux.video.every(every)) return false;
        if (!this.options.mux.audio.every(every)) return false;

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.mp4box_remux = function() {
        var mp4box_mp4 = new File(this.options.temp + ".mp4box.mp4");

        var args = "";
        this.options.mux.video.forEach(function(value, index) {
            args += ' -add "' + value + '"#video' + (index === 0 ? '' : ':disable');
        });
        this.options.mux.audio.forEach(function(value, index) {
            args += ' -add "' + value + '"#audio' + (index === 0 ? '' : ':disable');
        });
        this.options.mux.subtitle.forEach(function(value) {
            args += ' -add "' + value + '":disable';
        });

        // Run process
        var proc = new Process('"${mp4box}" -chap "${chapter}" ${args} -new "${output}"');

        proc.prepare({
            mp4box: this.path.mp4box,
            args: args,
            output: mp4box_mp4.path(),
            chapter: this.options.mux.chapter[0]
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!mp4box_mp4.exists()) {
            aclib.log("Can't mux mp4.", 1);
            return false;
        }

        this.options.move = mp4box_mp4.path();

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.mkvmerge = function() {
        var mkvmerge_mkv = new File(this.options.temp + ".mkvmerge.mkv");

        var args = "";

        this.options.mux.video.forEach(function(value, index) {
            if (this.params.deint === "kfm_vfr") {
                args += ' --timecodes 0:"' + this.options.mux.timecode[index] + '"';
            }
            args += index === 0 ? ' --default-track 0' : '';
            args += ' "' + value + '"';
        }, this);

        this.options.mux.audio.forEach(function(value, index) {
            args += index === 0 ? ' --default-track 0' : '';
            args += ' "' + value + '"';
        });

        this.options.mux.subtitle.forEach(function(value) {
            args += ' "' + value + '"';
        });

        // Run process
        var proc = new Process('"${mkvmerge}" -o "${output}" ${args}');

        proc.prepare({
            mkvmerge: this.path.mkvmerge,
            output: mkvmerge_mkv.path(),
            args: args
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!mkvmerge_mkv.exists()) {
            aclib.log("Can't mux mkv.", 1);
            return false;
        }

        this.options.move = mkvmerge_mkv.path();

        return true;
    };

    // -----------------------------------------------------------
}());
