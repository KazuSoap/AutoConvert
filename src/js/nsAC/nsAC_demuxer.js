var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.tsparser = function() {
        var input = new File(this.args.input);
        var output = input.parent().childFile(input.base() + ".tsparser_" + this.params.source + ".json");
        var tsparser_txt = new File(this.options.temp + ".tsparser.txt");

        this.options.clean.push(input.parent().childFile(input.base() + ".tsparser").path());

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

            output_obj.audio.forEach(function(value) {
                this.options.avs.audio.push('LWLibavAudioSource_("' + value + '")');
            }, this);
            output_obj.delay.forEach(function(value) {
                this.options.avs.delay.push(value);
            }, this);

            return true;
        }

        // Run process
        var proc = new Process('"${tsparser}" --output "${output}" --mode da --delay-type ${delaytype} --debug 2 --log "${log}" "${input}"');

        proc.prepare({
            tsparser: this.path.tsparser,
            output: input.parent().childFile(input.base() + ".tsparser_" + this.params.source).path(),
            delaytype: this.params.source === "lssource" ? 3 : 2,
            log: tsparser_txt.path(),
            input: input.path()
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        //check files
        var tsparser_out = tsparser_txt.read("Shift-JIS");

        if (tsparser_out === null) {
            aclib.log("Can't read file. [" + tsparser_txt.path() + "]", 1);
            return false;
        }

        var tsparser_arr = tsparser_out.split(/\r\n|\r|\n/);

        // Get pid
        var info_video_id = this.options.info.video.map(function(value) {
            return value.id;
        });

        var info_audio_id = this.options.info.audio.map(function(value) {
            return value.id;
        });

        var video_id = [], audio_id = [];

        tsparser_arr.forEach(function (value) {
            var match = value.match(/\[check\] ([^ ]+) PID:(0x[\dA-F]+)  stream_type:(0x[\dA-F]+)/);

            if (!match) return;

            var id = parseInt(match[2], 16);

            if (match[1] === "video" &&
                (info_video_id.length === 0 ||
                 info_video_id.indexOf(id) !== -1)) {
                video_id.push(id);
            }

            if (match[1] === "audio" &&
                (info_audio_id.length === 0 ||
                 info_audio_id.indexOf(id) !== -1)) {
                audio_id.push(id);
            }
        });

        if (video_id.length === 0) {
            aclib.log("Can't get video pid.", 1);
            return false;
        }

        if (audio_id.length === 0) {
            aclib.log("Can't get audio pid.", 1);
            return false;
        }

        // Check files
        var output_audio = [], output_delay = [];
        var regexp_base = (new File(this.args.input).base() + ".tsparser_" + this.params.source).replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");

        for (var i = 0; i < audio_id.length; i++) {
            var files = input.parent().findFiles(new RegExp(regexp_base + " PID " + audio_id[i].toString(16)));

            if (files.length !== 1) {
                aclib.log("Can't find audio file.", 1);
                return false;
            }

            //---------------------------------------------------------------------------
            // aacfaw.dll (AACをFAWとして読み込むプラグイン) を用いて avs 上で直接 aac を
            // fakeaacwav に変換して読み込むする場合はコメントアウト
            // fawcl.exe で aac を fakeaacwav に変換後 avs で読み込む場合はアンコメント
            //---------------------------------------------------------------------------
            // if ( this.preset.audio.type === "fakeaacwav" ) {
            //     // Run process
            //     var proc = new Process('"${encoder}" "${input}" "${output}"');

            //     proc.prepare({
            //         encoder: this.preset.audio.encoder,
            //         input: files[0].path(),
            //         output: files[0].parent().childFile(files[0].base() + ".wav").path()
            //     }, {window: this.settings.window, debug: this.options.debug});

            //     if (!proc.run()) {
            //         aclib.log("Process failed. (aac to fakeaacwav)", 1);
            //         return false;
            //     }
            // }
            //---------------------------------------------------------------------------
            // See also "nsAC_avisynth.js"
            //---------------------------------------------------------------------------

            var match = files[0].base().match(/DELAY (-*\d+)ms/);

            if (!match) {
                aclib.log("Can't get delay info.", 1);
                return false;
            }

            output_audio.push(files[0].path());
            output_delay.push(parseInt(match[1], 10) / 1000);
        }

        output_audio.forEach(function(value) {
            this.options.avs.audio.push('LWLibavAudioSource_("' + value + '")');
        }, this);

        output_delay.forEach(function(value) {
            this.options.avs.delay.push(value);
        }, this);

        // Write output
        var str = JSON.stringify({
            audio: output_audio,
            delay: output_delay
        });

        if (!output.write(str)) {
            aclib.log("Can't write file. [" + output.path() + "]", 1);
            return false;
        }

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.ts2aac = function() {
        var input = new File(this.args.input);
        var output = input.parent().childFile(input.base() + ".ts2aac.json");
        var ts2aac_txt = new File(this.options.temp + ".ts2aac.txt");

        this.options.clean.push(input.parent().childFile(input.base() + ".ts2aac").path());

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

            output_obj.audio.forEach(function(value) {
                this.options.avs.audio.push('LWLibavAudioSource_("' + value + '")');
            }, this);
            output_obj.delay.forEach(function(value) {
                this.options.avs.delay.push(value);
            }, this);

            return true;
        }

        var output_audio = [], output_delay = [];
        var video_id =
            this.options.info.video.length === 0 ? -1 : this.options.info.video[0].id;
        var audio_id =
            this.options.info.video.length === 0 ? [-1] : this.options.info.audio.map(function(value) {
                return value.id;
            });


        for (var i = 0; i < audio_id.length; i++) {
            // Args
            var ts2aac_args = "-B";

            if (video_id !== -1) {
                ts2aac_args += " -v " + video_id;
            }

            if (audio_id[i] !== -1) {
                ts2aac_args += " -a " + audio_id[i];
            }

            // Run process
            var proc = new Process('"${ts2aac}" -i "${input}" -o "${output}" ${args} > "${stdout}"');

            proc.prepare({
                ts2aac: this.path.ts2aac,
                input: input.path(),
                output: input.parent().childFile(input.base() + ".ts2aac").path(),
                args: ts2aac_args,
                stdout: ts2aac_txt.path()
            }, {window: this.settings.window, debug: this.options.debug});

            if (!proc.run()) {
                aclib.log("Process failed.", 1);
                return false;
            }

            // Check files
            var ts2aac_out = ts2aac_txt.read("Shift-JIS");

            if (ts2aac_out === null) {
                aclib.log("Can't read file. [" + ts2aac_txt.path() + "]", 1);
                return false;
            }

            var ts2aac_arr = ts2aac_out.split(/\r\n|\r|\n/);

            var audio, delay;
            for (var j = 0; j < ts2aac_arr.length; j++) {
                if (/^outfile/.test(ts2aac_arr[j])) {
                    audio = ts2aac_arr[j].replace("outfile:", "");
                }

                if (/^audio/.test(ts2aac_arr[j])) {
                    delay = parseInt(ts2aac_arr[j].match(/(-*\d+)ms/)[1], 10) / 1000;
                }
            }

            if (!audio || !delay) {
                aclib.log("Can't get audio and delay info.", 1);
                return false;
            }

            output_audio.push(audio);
            output_delay.push(delay);
        }

        output_audio.forEach(function(value) {
            this.options.avs.audio.push('LWLibavAudioSource_("' + value + '")');
        }, this);

        output_delay.forEach(function(value) {
            this.options.avs.delay.push(value);
        }, this);

        // Write output
        var str = JSON.stringify({
            audio: output_audio,
            delay: output_delay
        });

        if (!output.write(str)) {
            aclib.log("Can't write file. [" + output.path() + "]", 1);
            return false;
        }

        return true;
    };

    // -----------------------------------------------------------
}());
