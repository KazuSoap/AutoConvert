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
            //---------------------------------------------------------------------------
            // aacfaw.dll (AACをFAWとして読み込むプラグイン) を用いて avs 上で直接 aac を
            // fakeaacwav に変換して読み込むする場合はアンコメント
            // fawcl.exe で aac を fakeaacwav に変換後 avs で読み込む場合はコメントアウト
            //---------------------------------------------------------------------------
            var audio = this.preset.audio.type === "fakeaacwav" ? value.replace(/LWLibavAudioSource_/g, "AACFaw_") : value;
            //---------------------------------------------------------------------------
            // aacfaw.dll (AACをFAWとして読み込むプラグイン) を用いて avs 上で直接 aac を
            // fakeaacwav に変換して読み込むする場合はコメントアウト
            // fawcl.exe で aac を fakeaacwav に変換後 avs で読み込む場合はアンコメント
            //---------------------------------------------------------------------------
            // var audio = this.preset.audio.type === "fakeaacwav" ? value.replace(/LWLibavAudioSource_/g, "WavSource") : value;
            // audio = this.preset.audio.type === "fakeaacwav" ? audio.replace(/ms.aac/g, "ms.wav") : audio;
            //---------------------------------------------------------------------------
            // See also "nsAC_tsDemuxer.js"
            //---------------------------------------------------------------------------

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
        if (this.params.autovfr) {
            script = script.replace(/__videotmp__/g, script_video.slice(0, -1) + ',fpsnum=60000,fpsden=1001)');
        }
        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, script_video);
        script = script.replace(/__audio__/g, script_audio);
        script = script.replace(/__delay__/g, script_delay);

        if (!avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + avs.path() + "]", 1);
            return false;
        }

        return true;
    };
}());
