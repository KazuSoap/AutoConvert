var nsAC = nsAC || {};

(function() {
    var global = new Function("return this")();

    nsAC.AutoConvert.prototype.phase = function(number) {
        switch (number) {
        case 0:
            aclib.log("> Prepare");

            if (this.params.tssplitter) {
                aclib.log(">> TsSplitter");
                if (!this.tssplitter()) return false;
            }

            if (this.params.ffprobe) {
                aclib.log(">> ffprobe");
                if (!this.ffprobe()) return false;
            }

            break;
        case 1:
            aclib.log("> Source");

            switch (this.params.source) {
            case "lssource":
                aclib.log(">> L-SMASH Works");
                if (!this.lssource()) return false;
                break;
            case "dgindex":
                aclib.log(">> DGIndex");
                if (!this.dgindex()) return false;
                break;
            case "dgindexnv":
                aclib.log(">> DGIndexNV");
                if (!this.dgindexnv()) return false;
                break;
            case "dgindexim":
                aclib.log(">> DGIndexIM");
                if (!this.dgindexim()) return false;
                break;
            }

            break;
        case 2:
            aclib.log("> Demux");

            switch (this.params.demuxer) {
            case "none":
                aclib.log(">> None");
                break;
            case "tsparser":
                aclib.log(">> ts_parser");
                if (!this.tsparser()) return false;
                break;
            case "ts2aac":
                aclib.log(">> ts2aac");
                if (!this.ts2aac()) return false;
                break;
            }

            break;
        case 3:
            aclib.log("> Avisynth");

            if (this.params.onlytrim) {
                aclib.log(">> None");
            } else {
                aclib.log(">> Avisynth");
                if (!this.avisynth()) return false;
            }

            break;
        case 4:
            aclib.log("> Trim");
            aclib.log(">> Read Trim");

            if (!this.readTrim()) return false;

            switch (this.params.trim) {
            case "none":
                aclib.log(">> None");
                if (this.params.onlytrim && !this.params.edittrim) {
                    aclib.log(">> Check Output Video");
                    if (!this.checkOutputVideo()) return false;
                }
                break;
            case "comskip":
                aclib.log(">> Comskip");
                if (!this.comskip()) return false;
                break;
            case "logoguillo":
                aclib.log(">> logoGuillo");
                if (!this.logoguillo()) return false;
                break;
            case "joinlogoscp":
                aclib.log(">> join_logo_scp");
                if (!this.joinlogoscp()) return false;
                break;
            }

            if (this.params.edittrim) {
                aclib.log(">> Edit Trim");
                if (!this.editTrim()) return false;
            }

            aclib.log(">> Write Trim");
            if (!this.writeTrim()) return false;

            break;
        case 5:
            if (this.params.onlytrim) break;

            aclib.log("> Other");

            if (this.params.caption2ass) {
                aclib.log(">> Caption2Ass");
                if (!this.caption2ass()) return false;
            }

            if (this.params.autovfr) {
                aclib.log(">> AutoVfr");
                // if (!this.autovfr()) return false;
                if (!this.preprocKFM()) return false;
            }

            if (this.params.eraselogo) {
                aclib.log(">> EraseLOGO");
                if (!this.eraselogo()) return false;
            }

            if (this.params.editavs) {
                aclib.log(">> Edit Avs");
                if (!this.editAvs()) return false;
            }

            break;
        case 6:
            aclib.log("> Encode/Mux");

            if (this.params.onlytrim) {
                aclib.log(">> make Video Index");
                if (!this.mkVindex()) return false;
                break
            };

            switch (this.preset.audio.type) {
            case "none":
                switch (this.preset.video.type) {
                case "specific":
                    aclib.log(">> None");
                    break;
                case "general":
                    aclib.log(">> Wav");
                    if (!this.wav()) return false;
                    break;
                }
                break;
            case "normal":
                aclib.log(">> Encode Audio");
                if (!this.encAudio()) return false;
                break;
            case "fakeaacwav":
                aclib.log(">> FakeAacWav");
                if (!this.fakeaacwav()) return false;
                break;
            }

            switch (this.preset.video.type) {
            case "specific":
                aclib.log(">> Encode Video");
                if (!this.encVideo()) return false;
                switch (this.preset.muxer) {
                case "lsmuxer":
                    aclib.log(">> L-SMASH muxer/remuxer");
                    if (!this.lsmuxer()) return false;
                    break;
                case "mp4box":
                    aclib.log(">> MP4Box");
                    if (!this.mp4box()) return false;
                    break;
                case "mkvmerge":
                    aclib.log(">> mkvmerge");
                    if (!this.mkvmerge()) return false;
                    break;
                }
                if (this.params.autovfr) {
                    if (this.preset.muxer === "lsmuxer" ||
                        this.preset.muxer === "mp4box") {
                        aclib.log(">> L-SMASH timelineeditor");
                        if (!this.timelineeditor()) return false;
                    }
                }
                break;
            case "general":
                aclib.log(">> Encode Media");
                if (!this.encMedia()) return false;
                break;
            }

            break;
        case 7:
            aclib.log("> Postprocess");

            if (!this.params.onlytrim) {
                aclib.log(">> Move Video");
                if (!this.move()) return false;
            }

            aclib.log(">> Clean Files");
            if (!this.clean()) return false;

            break;
        }

        global.CollectGarbage();

        return true;
    };
}());
