var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.lssource = function() {
        var input = new File(this.args.input);

        this.options.clean.push(input.path() + ".lwi");

        this.options.avs.video.push('LWLibavVideoSource_("' + this.args.input + '")');

        if (this.params.demuxer === "none") {
            if (this.options.info.audio.length === 0) {
                this.options.avs.audio.push('LWLibavAudioSource_("' + this.args.input + '", av_sync=true)');
                this.options.avs.delay.push(0);
            } else {
                for (var i = 0; i < this.options.info.audio.length; i++) {
                    var index = this.options.info.audio[0].index;
                    this.options.avs.audio.push('LWLibavAudioSource_("' + this.args.input + '", stream_index=' + index + ', av_sync=true)');
                    this.options.avs.delay.push(0);
                }
            }
        }

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.dgindex = function() {
        var input = new File(this.args.input);
        var output = input.parent().childFile(input.base() + ".dgindex.json");
        var dgindex_avs = input.parent().childFile(input.base() + ".dgindex.avs");
        var fake_avs = new File(this.options.temp + ".dgindex.avs");

        this.options.clean.push(input.parent().childFile(input.base() + ".dgindex").path());
        this.options.clean.push(input.parent().childFile(input.base() + ".log").path());

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

            this.options.avs.video.push('MPEG2Source_("' + output_obj.video + '")');
            if (this.params.demuxer === "none") {
                this.options.avs.audio.push('LWLibavAudioSource_("' + output_obj.audio + '")');
                this.options.avs.delay.push(output_obj.delay);
            }

            return true;
        }

        // Write fake_script
        var fake_script = "__vid__\r\n__aud__\r\n__del__";

        if (!(fake_avs.write(fake_script, "Shift-JIS"))) {
            aclib.log("Can't write file. [" + fake_avs.path() + "]", 1);
            return false;
        }

        // Args
        var args = this.command.dgindex;

        args += " -exit";

        if (this.options.info.video.length !== 0) {
            args += " -vp " + this.options.info.video[0].id.toString(16);
        }

        if (this.options.info.audio.length !== 0) {
            args += " -ap " + this.options.info.audio[0].id.toString(16);
        }

        args += " -om 1";

        // Run process
        var proc = new Process('"${dgindex}" -i "${input}" -o "${output}" -at "${avs}" ${args}');

        proc.prepare({
            dgindex: this.path.dgindex,
            input: input.path(),
            output: input.parent().childFile(input.base() + ".dgindex").path(),
            avs: fake_avs.path(),
            args: args
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        var dgindex_script = dgindex_avs.read("Shift-JIS");

        if (dgindex_script === null) {
            aclib.log("Can't read file. [" + fake_avs.path() + "]", 1);
            return false;
        }

        var dgindex_arr = dgindex_script.split(/\r\n|\r|\n/);
        var video = dgindex_arr[0];
        var audio = dgindex_arr[1];
        var delay = dgindex_arr[2];

        if (video === "__vid__") {
            aclib.log("Can't get video info.", 1);
            return false;
        }

        if (!/[\\/]/.test(video)) {
            video = new File(this.options.temp).parent().childFile(video).path();
        }

        if (!(new File(video).exists())) {
            aclib.log("Can't get video path. [" + video + "]", 1);
            return false;
        }

        this.options.avs.video.push('MPEG2Source_("' + video + '")');

        if (audio === "__aud__" || delay === "__del__") {
            aclib.log("Can't get audio and delay info.", 1);
            return false;
        }

        if (!/[\\/]/.test(audio)) {
            audio = new File(this.options.temp).parent().childFile(audio).path();
        }

        if (!(new File(audio).exists())) {
            aclib.log("Can't get audio path. [" + audio + "]", 1);
            return false;
        }

        if (this.params.demuxer === "none") {
            this.options.avs.audio.push('LWLibavAudioSource_("' + audio + '")');
            this.options.avs.delay.push(delay);
        }

        // Write output
        var str = JSON.stringify({
            video: video,
            audio: audio,
            delay: delay
        });

        if (!output.write(str)) {
            aclib.log("Can't write file. [" + output.path() + "]", 1);
            return false;
        }

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.dgindexnv = function() {
        var input = new File(this.args.input);
        var output = input.parent().childFile(input.base() + ".dgindexnv.json");
        var dgindexnv_avs = input.parent().childFile(input.base() + ".dgindexnv.avs");
        var fake_avs = new File(this.options.temp + ".dgindexnv.avs");

        this.options.clean.push(input.parent().childFile(input.base() + ".dgindexnv").path());
        this.options.clean.push(input.parent().childFile(input.base() + ".log").path());

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

            this.options.avs.video.push('DGSource_("' + output_obj.video + '")');
            if (this.params.demuxer === "none") {
                this.options.avs.audio.push('LWLibavAudioSource_("' + output_obj.audio + '")');
                this.options.avs.delay.push(output_obj.delay);
            }

            return true;
        }

        // Write fake_script
        var fake_script = "__vid__\r\n__aud__\r\n__del__";

        if (!(fake_avs.write(fake_script, "Shift-JIS"))) {
            aclib.log("Can't write file. [" + fake_avs.path() + "]", 1);
            return false;
        }

        // Args
        var args = this.command.dgindexnv;

        args += " -e";

        if (this.options.info.video.length !== 0) {
            args += " -v " + this.options.info.video[0].id.toString(16);
        }

        args += " -a";

        // Run process
        var proc = new Process('"${dgindexnv}" -i "${input}" -o "${output}" -at "${avs}" ${args}');

        proc.prepare({
            dgindexnv: this.path.dgindexnv,
            input: input.path(),
            output: input.parent().childFile(input.base() + ".dgindexnv.dgi").path(),
            avs: fake_avs.path(),
            args: args
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        var dgindexnv_script = dgindexnv_avs.read("Shift-JIS");

        if (dgindexnv_script === null) {
            aclib.log("Can't read file. [" + fake_avs.path() + "]", 1);
            return false;
        }

        var dgindexnv_arr = dgindexnv_script.split(/\r\n|\r|\n/);
        var video = dgindexnv_arr[0];
        var audio = dgindexnv_arr[1];
        var delay = dgindexnv_arr[2];

        if (video === "__vid__") {
            aclib.log("Can't get video info.", 1);
            return false;
        }

        if (!/[\\/]/.test(video)) {
            video = new File(this.options.temp).parent().childFile(video).path();
        }

        if (!(new File(video).exists())) {
            aclib.log("Can't get video path. [" + video + "]", 1);
            return false;
        }

        this.options.avs.video.push('DGSource_("' + video + '")');

        if (audio === "__aud__" || delay === "__del__") {
            aclib.log("Can't get audio and delay info.", 1);
            return false;
        }

        if (!/[\\/]/.test(audio)) {
            audio = new File(this.options.temp).parent().childFile(audio).path();
        }

        if (!(new File(audio).exists())) {
            aclib.log("Can't get audio path. [" + audio + "]", 1);
            return false;
        }

        if (this.params.demuxer === "none") {
            this.options.avs.audio.push('LWLibavAudioSource_("' + audio + '")');
            this.options.avs.delay.push(delay);
        }

        // Write output
        var str = JSON.stringify({
            video: video,
            audio: audio,
            delay: delay
        });

        if (!output.write(str)) {
            aclib.log("Can't write file. [" + output.path() + "]", 1);
            return false;
        }

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.dgindexim = function() {
        var input = new File(this.args.input);
        var output = input.parent().childFile(input.base() + ".dgindexim.json");
        var dgindexim_avs = input.parent().childFile(input.base() + ".dgindexim.avs");
        var fake_avs = new File(this.options.temp + ".dgindexim.avs");

        this.options.clean.push(input.parent().childFile(input.base() + ".dgindexim").path());
        this.options.clean.push(input.parent().childFile(input.base() + ".log").path());

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

            this.options.avs.video.push('DGSourceIM_("' + output_obj.video + '")');
            if (this.params.demuxer === "none") {
                this.options.avs.audio.push('LWLibavAudioSource_("' + output_obj.audio + '")');
                this.options.avs.delay.push(output_obj.delay);
            }

            return true;
        }

        // Write fake_script
        var fake_script = "__vid__\r\n__aud__\r\n__del__";

        if (!(fake_avs.write(fake_script, "Shift-JIS"))) {
            aclib.log("Can't write file. [" + fake_avs.path() + "]", 1);
            return false;
        }

        // Args
        var args = this.command.dgindexim;

        args += " -e";

        if (this.options.info.video.length !== 0) {
            args += " -v " + this.options.info.video[0].id.toString(16);
        }

        args += " -a";

        // Run process
        var proc = new Process('"${dgindexim}" -i "${input}" -o "${output}" -at "${avs}" ${args}');

        proc.prepare({
            dgindexim: this.path.dgindexim,
            input: input.path(),
            output: input.parent().childFile(input.base() + ".dgindexim.dgi").path(),
            avs: fake_avs.path(),
            args: args
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        var dgindexim_script = dgindexim_avs.read("Shift-JIS");

        if (dgindexim_script === null) {
            aclib.log("Can't read file. [" + fake_avs.path() + "]", 1);
            return false;
        }

        var dgindexim_arr = dgindexim_script.split(/\r\n|\r|\n/);
        var video = dgindexim_arr[0];
        var audio = dgindexim_arr[1];
        var delay = dgindexim_arr[2];

        if (video === "__vid__") {
            aclib.log("Can't get video info.", 1);
            return false;
        }

        if (!/[\\/]/.test(video)) {
            video = input.parent().childFile(video).path();
        }

        if (!(new File(video).exists())) {
            aclib.log("Can't get video path. [" + video + "]", 1);
            return false;
        }

        this.options.avs.video.push('DGSourceIM_("' + video + '")');

        if (audio === "__aud__" || delay === "__del__") {
            aclib.log("Can't get audio and delay info.", 1);
            return false;
        }

        if (!/[\\/]/.test(audio)) {
            audio = input.parent().childFile(audio).path();
        }

        if (!(new File(audio).exists())) {
            aclib.log("Can't get audio path. [" + audio + "]", 1);
            return false;
        }

        if (this.params.demuxer === "none") {
            this.options.avs.audio.push('LWLibavAudioSource_("' + audio + '")');
            this.options.avs.delay.push(delay);
        }

        // Write output
        var str = JSON.stringify({
            video: video,
            audio: audio,
            delay: delay
        });

        if (!output.write(str)) {
            aclib.log("Can't write file. [" + output.path() + "]", 1);
            return false;
        }

        return true;
    };

    // -----------------------------------------------------------
}());
