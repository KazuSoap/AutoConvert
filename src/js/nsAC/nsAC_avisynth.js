var nsAC = nsAC || {};

(function() {
    nsAC.AutoConvert.prototype.avisynth = function() {
        var avs = new File(this.options.temp + ".avs");
        var template_avs = new File(this.args.avs);

        var script = template_avs.read("Shift-JIS");
        if (script === null) {
            aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
            return false;
        }

        var script_audio = "", script_delay = "";
        this.options.avs.audio.forEach(function (value, index) {
            var audio = this.preset.audio.type === "fakeaacwav" ? value.replace(/LWLibavAudioSource_/g, "AACFaw_") : value;
            var delay = this.preset.audio.type === "fakeaacwav" ? 0 : this.options.avs.delay[index];
            if (index === 0) {
                script_audio = audio;
                script_delay = delay;
            } else {
                script_audio = '"__audioid__" == "' + index + '" ? ' + audio + ' : ' + script_audio;
                script_delay = '"__audioid__" == "' + index + '" ? ' + delay + ' : ' + script_delay;
            }
        }, this);

        // Replace
        var script_video = this.options.avs.video[0];
        if (this.params.deint === "kfm_vfr") {
            script = script.replace(/__videotmp__/g, script_video.slice(0, -1) + ').ChangeFPS(60000, 1001)');
        }
        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, script_video);
        script = script.replace(/__audio__/g, script_audio);
        script = script.replace(/__delay__/g, script_delay);

        var trim_obj = this.options.avs.trim;
        if (Object.keys(trim_obj).length > 0) {
            if (this.params.deint === "kfm_vfr" && Object.keys(trim_obj).length === 2) {
                var input = new File(this.args.input);
                var procKFM_dur = input.parent().childFile(input.base() + ".kfm_" + this.params.source + ".duration.txt");
                var durations = procKFM_dur.read("Shift-JIS");
                if (durations === null) {
                    aclib.log("Can't read file. [" + procKFM_dur.path() + "]", 1);
                    return false;
                }
                trim_obj = nsAC.fixCfrTrim(durations, trim_obj, false);
            }

            script = nsAC.replaceTrim(trim_obj, script);
            this.options.avs.trim = trim_obj;
        }

        if (!avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + avs.path() + "]", 1);
            return false;
        }

        return true;
    };
}());
