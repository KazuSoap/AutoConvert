var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.tssplitter = function() {
        var input = new File(this.args.input);
        var output = input.parent().childFile(input.base() + "_HD.ts");

        this.options.clean.push(output.path());

        if (!this.params.reset && output.exists()) {
            this.args.input = output.path();
            return true;
        }

        // Run process
        var proc = new Process('"${tssplitter}" ${settings} "${input}" ${args}');

        proc.prepare({
            tssplitter: this.path.tssplitter,
            settings: this.command.tssplitter,
            input: input.path(),
            args: this.command.tssplitter
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!output.exists()) {
            aclib.log("File doesn't exist. [" + output.path() + "]", 1);
            return false;
        }

        this.args.input = output.path();

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.ffprobe = function() {
        var input = new File(this.args.input);
        var output = input.parent().childFile(input.base() + ".ffprobe.json");
        var ffprobe_json = new File(this.options.temp + ".ffprobe.json");

        this.options.clean.push(input.parent().childFile(input.base() + ".ffprobe").path());

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

            this.options.info.video = output_obj.video;
            this.options.info.audio = output_obj.audio;

            return true;
        }

        // Run process
        var proc = new Process('"${ffprobe}" -i "${input}" ${args} > "${stdout}"');

        proc.prepare({
            ffprobe: this.path.ffprobe,
            input: input.path(),
            args: "-show_packets -show_streams -print_format json",
            stdout: ffprobe_json.path()
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Read ffprobe_json
        var ffprobe_out;
        try {
            var stream = aclib.fso.OpenTextFile(ffprobe_json.path());
            ffprobe_out = stream.ReadAll();
            stream.Close();
        } catch (e) {
            aclib.log("Can't read file. [" + ffprobe_json.path() + "]", 1);
            return false;
        }

        // Parse ffprobe_out
        var ffprobe_obj;
        try {
            ffprobe_obj = eval("(" + ffprobe_out + ")");
        } catch (err) {
            aclib.log("Can't parse JSON. [" + ffprobe_json.path() + "]", 1);
            return false;
        }

        // Stream
        var out = {
            video: {},
            audio: {}
        };

        ffprobe_obj.streams.forEach(function (value) {
            if (!("codec_type" in value)) return;
            if (!(value.codec_type in out)) return;
            out[value.codec_type][value.index] = {
                id: parseInt(value.id, 16),
                duration: 0,
                dts: 0
            };
        });

        ffprobe_obj.packets.forEach(function (value) {
            if (!("codec_type" in value)) return;
            if (!(value.codec_type in out)) return;
            var _stream = out[value.codec_type][value.stream_index];
            var prev_dts = _stream.dts;
            var dts = _stream.dts = parseFloat(value.dts_time);
            var duration = dts - prev_dts;
            if (duration < 0 || duration > 1) return;
            _stream.duration += duration;
        });

        var key, duration;
        var video = [];
        var audio = [];

        duration = 0;
        for (key in out.video) {
            if (out.video[key].duration > duration) {
                video[0] = {
                    index: parseInt(key, 10),
                    id: out.video[key].id
                };
                duration = out.video[key].duration;
            }
        }

        duration = 0;
        for (key in out.audio) {
            if (out.audio[key].duration > duration) {
                duration = out.audio[key].duration;
            }
        }

        for (key in out.audio) {
            if (out.audio[key].duration >= duration * 0.75) {
                audio.push({
                    index: parseInt(key, 10),
                    id: out.audio[key].id
                });
            }
        }

        if (video.length === 0 || audio.length === 0) {
            aclib.log("Can't find stream.", 1);
            return false;
        }

        // Write output
        var str = JSON.stringify({
            video: video,
            audio: audio
        });
        if (!output.write(str)) {
            aclib.log("Can't write file. [" + output.path() + "]", 1);
            return false;
        }

        // Replace options
        this.options.info.video = video;
        this.options.info.audio = audio;

        return true;
    };

    // -----------------------------------------------------------
}());
