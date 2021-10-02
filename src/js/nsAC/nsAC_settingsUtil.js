var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.loadSettings = function() {
        var file = new File(aclib.path() + "\\settings\\ac.json");
        var json = file.read();

        if (json === null) return false;

        try {
            json = JSON.parse(json);
        } catch (e) {
            aclib.log("Can't parse JSON. [" + e.message + "]", 1);
            return false;
        }

        for (var key in json) {
            this[key] = json[key];
        }

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.checkSettings = function() {
        // Check Args
        if (!this.args.input) {
            aclib.log("No input.", 1);
            return false;
        }

        if (!this.args.output && !this.params.onlytrim) {
            aclib.log("No output.", 1);
            return false;
        }

        if (!this.args.avs && !this.params.onlytrim) {
            aclib.log("No avs.", 1);
            return false;
        }

        if (!this.args.preset && !this.params.onlytrim) {
            aclib.log("No preset.", 1);
            return false;
        }

        // Load preset
        // if (!this.params.onlytrim) {
        var file = new File(this.args.preset);
        var json = file.read();

        if (json === null) return false;

        try {
            json = JSON.parse(json);
        } catch (e) {
            aclib.log("Can't parse JSON.", 1);
            return false;
        }

        this.preset = json;
        this.preset.video.encoder = aclib.replace(this.preset.video.encoder, {path: aclib.path()});
        this.preset.audio.encoder = aclib.replace(this.preset.audio.encoder, {path: aclib.path()});
        // }

        // Replace path
        for (var key in this.path) {
            this.path[key] = aclib.replace(this.path[key], {path: aclib.path()});
        }

        // Check temp
        if (!this.path.temp) {
            aclib.log("No temp.", 1);
            return false;
        }

        var temp = new Folder(this.path.temp);

        if (!temp.exists()) {
            aclib.log("Temp doesn't exist.", 1);
            return false;
        }

        this.options.temp = temp.childFile("temp_" + Math.random().toString(16).slice(2)).path();

        // Check files
        var check = [];

        // Args
        check.push(["input", new File(this.args.input)]);
        check.push(["output", new File(this.args.output).parent()]);

        if (!this.params.onlytrim) {
            // check.push(["output", new File(this.args.output).parent()]);
            check.push(["avs", new File(this.args.avs)]);
            check.push(["preset", new File(this.args.preset)]);
        }

        check.push(["avs2pipemod", new File(this.path.avs2pipemod)]);

        // Prepare
        if (this.params.tssplitter) {
            check.push(["TsSplitter", new File(this.path.tssplitter)]);
        }

        if (this.params.ffprobe) {
            check.push(["ffprobe", new File(this.path.ffprobe)]);
        }

        // Source
        switch (this.params.source) {
        case "lssource":
            if (this.params.demuxer === "ts2aac") {
                aclib.log("Can't use ts2aac with lssource.", 1);
                return false;
            }
            break;
        case "dgindex":
            check.push(["DGIndex", new File(this.path.dgindex)]);
            break;
        case "dgindexnv":
            if (this.params.demuxer !== "none") {
                aclib.log("Can't use demuxer with dgindexnv.", 1);
                return false;
            }
            check.push(["DGIndexNV", new File(this.path.dgindexnv)]);
            break;
        case "dgindexim":
            if (this.params.demuxer !== "none") {
                aclib.log("Can't use demuxer with dgindexim.", 1);
                return false;
            }
            check.push(["DGIndexIM", new File(this.path.dgindexim)]);
            break;
        }

        // Trim
        if (this.params.onlytrim) {
            // if (this.params.trim === "none" && !this.params.edittrim) {
            //    aclib.log("No trim params.", 1);
            //    return false;
            // }
            this.params.caption2ass = false;
            this.params.autovfr = false;
        }

        switch (this.params.trim) {
        case "comskip":
            check.push(["Comskip", new File(this.path.comskip)]);
            check.push(["Comskip ini", new File(this.path.comskip_ini)]);
            break;
        case "logoguillo":
            check.push(["logoGuillo", new File(this.path.logoguillo)]);
            check.push(["logoguillo avs", new File(this.path.logoguillo_avs)]);
            check.push(["LogoData", new File(this.args.logo + ".lgd")]);
            check.push(["LogoParam", new File(this.args.logo + ".lgd.autoTune.param")]);
            break;
        case "joinlogoscp":
            check.push(["logoframe", new File(this.path.logoframe)]);
            check.push(["chapter_exe", new File(this.path.chapterexe)]);
            check.push(["join_logo_scp", new File(this.path.joinlogoscp)]);
            check.push(["join_logo_scp avs", new File(this.path.joinlogoscp_avs)]);
            check.push(["join_logo_scp cmd", new File(this.path.joinlogoscp_cmd)]);
            check.push(["LogoData", new File(this.args.logo + ".lgd")]);
            break;
        }

        if (this.params.edittrim || this.params.editavs) {
            check.push(["AvsPmod", new File(this.path.avspmod)]);
            check.push(["AvsPmod avs", new File(this.path.avspmod_avs)]);
        }

        // Demuxer
        switch (this.params.demuxer) {
        case "tsparser":
            check.push(["tsparser", new File(this.path.tsparser)]);
            break;
        case "ts2aac":
            check.push(["ts2aac", new File(this.path.ts2aac)]);
            break;
        }

        if (!this.params.onlytrim) {
            //demuxer
            if (this.params.demuxer === "none" &&
                this.params.source === "lssource" &&
                this.preset.audio.type === "fakeaacwav") {
                aclib.log("Can't use FakeAacWav without demux.", 1);
                return false;
            }

            //audio encoder
            switch (this.preset.audio.type) {
            case "normal":
            case "fakeaacwav":
                check.push(["Audio Encoder", new File(this.preset.audio.encoder)]);
                break;
            }

            //video encoder
            switch (this.preset.video.type) {
            case "specific":
                //muxer
                switch (this.preset.muxer) {
                case "lsmuxer":
                    if (this.params.caption2ass) {
                        aclib.log("Can't use Caption2Ass with lsmuxer.", 1);
                        return false;
                    }
                    check.push(["L-SMASH muxer", new File(this.path.lsmuxer)]);
                    check.push(["L-SMASH remuxer", new File(this.path.lsremuxer)]);
                    break;
                case "mp4box":
                    check.push(["MP4Box", new File(this.path.mp4box)]);
                    break;
                case "mkvmerge":
                    check.push(["mkvmerge", new File(this.path.mkvmerge)]);
                    break;
                }
                break;
            case "general":
                if (this.params.caption2ass) {
                    aclib.log("Can't use Caption2Ass with general encoder.", 1);
                    return false;
                }

                if (this.params.autovfr) {
                    aclib.log("Can't use AutoVfr with general encoder.", 1);
                    return false;
                }
                break;
            }

            check.push(["Encoder", new File(this.preset.video.encoder)]);

            // Other
            if (this.params.caption2ass) {
                check.push(["Caption2Ass", new File(this.path.caption2ass)]);
            }
            if (this.params.autovfr) {
                check.push(["AutoVfr", new File(this.path.autovfr)]);
                check.push(["AutoVfr avs", new File(this.path.autovfr_avs)]);
                check.push(["AutoVfr ini", new File(this.path.autovfr_ini)]);
                check.push(["L-SMASH timelineeditor", new File(this.path.timelineeditor)]);
            }
            if (this.params.eraselogo) {
                check.push(["LogoData", new File(this.args.logo + ".lgd")]);
            }
        }

        // add ---------------------
        if (this.params.onlytrim && this.params.trim == "none" && !this.params.edittrim) {
            return true;
        }
        // end add -----------------

        if (!check.every(function(value) {
            if (value[1].exists()) return true;

            aclib.log(value[0] + " doesn't exist. [" + value[1].path() + "]", 1);

            return false;
        })) return false;

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.showSettings = function() {
        var formatline = function(str, offset) {
            offset = offset || 0;

            var add = 0, pos = 0;
            var arr = str.split("");

            for (var i = 0; i < arr.length; i++) {
                add = arr[i] === aclib.toFull(arr[i]) ? 2 : 1;
                pos += add;

                if (pos < 80 - offset) continue;

                arr.splice(i++, 0, "\n" + new Array(offset + 1).join(" "));

                pos = add;
            }

            return arr.join("");
        };

        aclib.log("");
        aclib.log(" input  : " + formatline(this.args.input, 10));
        aclib.log(" output : " + formatline(this.args.output, 10));

        if (!this.params.onlytrim) {
            // aclib.log(" output : " + formatline(this.args.output, 10));
            aclib.log(" avs    : " + formatline(this.args.avs, 10));
            aclib.log(" preset : " + formatline(this.args.preset, 10));
        }

        if (this.args.logo !== "") {
            aclib.log(" logo   : " + formatline(this.args.logo, 10));
        }

        aclib.log(" temp   : " + formatline(this.options.temp, 10));

        aclib.log(" params : " + formatline(Object.keys(this.params).map(function(key) {
            return key + ":" + this.params[key];
        }, this).join(", "), 10));

        aclib.log("");

        return true;
    };

    // -----------------------------------------------------------
}());
