/* eslint quotes: "off" */
/* global WScript, ActiveXObject, aclib, Process, Folder */
(function() {
    var global = new Function("return this")();

    var getTrim = function(str) {
        var arr = str.split(/\r\n|\r|\n/);
        var format = / *(\+\+|) *trim *\( *(\d+) *, *(\d+) *\)/ig;
        var trim = [];

        arr.some(function (value) {
            if (/^ *#/.test(value)) return false;

            var test = format.test(value);

            if (!test) return false;

            value.replace(format, function ($0, $1, $2, $3) {
                trim.push({
                    start: parseInt($2, 10),
                    end: parseInt($3, 10)
                });
            });

            return true;
        });

        return trim;
    };

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

    function AutoConvert() {
        this.initialize.apply(this, arguments);
    }

    AutoConvert.prototype.initialize = function(args) {
        this.args = {
            input: "",
            output: "",
            avs: "",
            preset: "",
            logo: ""
        };

        this.params = {
            "reset": false,
            "clean": false,
            "onlytrim": false,
            "tssplitter": false,
            "ffprobe": false,
            "source": "lssource",
            "demuxer": "none",
            "trim": "none",
            "edittrim": false,
            "caption2ass": false,
            "autovfr": false,
            "eraselogo": false,
            "editavs": false
        };

        this.preset = {
            video: {
                type: 0,
                extension: "",
                encoder: "",
                option: ""
            },
            audio: {
                type: 0,
                extension: "",
                encoder: "",
                option: ""
            }
        };

        this.options = {
            args: args,
            temp: "",
            opt: "",
            info: {
                video: [],
                audio: []
            },
            avs: {
                video: [],
                audio: [],
                delay: [],
                trim: []
            },
            mux: {
                video: [],
                audio: [],
                timecode: [],
                subtitle: []
            },
            move: "",
            clean: [],
            log: false,
            debug: false
        };
    };

    AutoConvert.prototype.execute = function() {
        if (this.options.args.length === 0) {
            this.usage();

            return 0;
        }

        aclib.log("-------------");
        aclib.log(" AutoConvert ");
        aclib.log("-------------");
        aclib.log("");

        aclib.log("> Get Arguments");

        if (!this.getArguments()) return 1;

        aclib.log("> Load Settings");

        if (!this.loadSettings()) return 2;

        aclib.log("> Check Settings");

        if (!this.checkSettings()) return 3;

        aclib.log("> Show Settings");

        this.showSettings();

        for (var i = 0; i < 8; i++) {
            if (!this.phase(i)) {
                if (this.settings.pause && !this.options.log) {
                    aclib.log("");
                    aclib.log("Retry? [y / n]");

                    var ans = WScript.StdIn.ReadLine();

                    if (ans === "y") {
                        aclib.log("Continue...");
                        aclib.log("");
                        i--;

                        continue;
                    } else if (!isNaN(parseInt(ans, 10))) {
                        aclib.log("Continue...");
                        aclib.log("");
                        i = parseInt(ans, 10) - 1;

                        continue;
                    } else {
                        aclib.log("Exit...");

                        return i + 4;
                    }
                } else {
                    aclib.log("Failed...");

                    return i + 4;
                }
            }
        }

        aclib.log("Successful!");

        return 0;
    };

    AutoConvert.prototype.phase = function(number) {
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
                    if (!this.autovfr()) return false;
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
                if (this.params.onlytrim) break;

                aclib.log("> Encode/Mux");

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

    AutoConvert.prototype.usage = function() {
        aclib.log("-------------------------------------------------------------------------------");
        aclib.log("    AutoConvert");
        aclib.log("-------------------------------------------------------------------------------");
        aclib.log("usage: cscript ac.wsf -input input.ts -o output -a avs.avs -p preset.json -l logo params...");
    };

    AutoConvert.prototype.getArguments = function() {
        var args = this.options.args;

        function checkNextArgument(index, arr) {
            if (index === args.length - 1) {
                aclib.log("Invalid last argument. [" + args[index] + "]", 1);
                return false;
            }

            if (arr !== void(0) && arr.indexOf(args[index + 1]) === -1) {
                aclib.log("Invalid " + args[index] + " param. [" + args[index + 1] + "]", 1);
                return false;
            }

            return true;
        }

        function createLog(path) {
            var file = new File(path);
            var log = [];

            return function(message, level) {
                log.push({
                    message: message,
                    level: level || 0
                });

                file.write(JSON.stringify(log));
            };
        }

        for (var i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "-input":
                    if (!checkNextArgument(i)) return false;
                    this.args.input = args[++i];
                    break;
                case "-output":
                    if (!checkNextArgument(i)) return false;
                    this.args.output = args[++i];
                    break;
                case "-avs":
                    if (!checkNextArgument(i)) return false;
                    this.args.avs = args[++i];
                    break;
                case "-preset":
                    if (!checkNextArgument(i)) return false;
                    this.args.preset = args[++i];
                    break;
                case "-logo":
                    if (!checkNextArgument(i)) return false;
                    this.args.logo = args[++i];
                    break;
                case "-log":
                    if (!checkNextArgument(i)) return false;
                    this.options.log = true;
                    aclib.log = createLog(args[++i]);
                    break;
                case "-debug":
                    this.options.debug = true;
                    break;
                case "-reset":
                    this.params.reset = true;
                    break;
                case "-clean":
                    this.params.clean = true;
                    break;
                case "-onlytrim":
                    this.params.onlytrim = true;
                    break;
                case "-tssplitter":
                    this.params.tssplitter = true;
                    break;
                case "-ffprobe":
                    this.params.ffprobe = true;
                    break;
                case "-source":
                    if (!checkNextArgument(i, ["lssource", "dgindex", "dgindexnv", "dgindexim"])) return false;
                    this.params.source = args[++i];
                    break;
                case "-demuxer":
                    if (!checkNextArgument(i, ["none", "tsparser", "ts2aac"])) return false;
                    this.params.demuxer = args[++i];
                    break;
                case "-trim":
                    if (!checkNextArgument(i, ["none", "comskip", "logoguillo", "joinlogoscp"])) return false;
                    this.params.trim = args[++i];
                    break;
                case "-edittrim":
                    this.params.edittrim = true;
                    break;
                case "-caption2ass":
                    this.params.caption2ass = true;
                    break;
                case "-autovfr":
                    this.params.autovfr = true;
                    break;
                case "-eraselogo":
                    this.params.eraselogo = true;
                    break;
                case "-editavs":
                    this.params.editavs = true;
                    break;
                default:
                    aclib.log("Invalid arguments. [" + args[i] + "]", 1);
                    return false;
            }
        }

        return true;
    };

    AutoConvert.prototype.loadSettings = function() {
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

    AutoConvert.prototype.checkSettings = function() {
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
        if (!this.params.onlytrim) {
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
        }

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
        if (!this.params.onlytrim) {
            check.push(["output", new File(this.args.output).parent()]);
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
            if (this.params.trim === "none" && !this.params.edittrim) {
                aclib.log("No trim params.", 1);
                return false;
            }
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

        if (!check.every(function(value) {
            if (value[1].exists()) return true;

            aclib.log(value[0] + " doesn't exist. [" + value[1].path() + "]", 1);

            return false;
        })) return false;

        return true;
    };

    AutoConvert.prototype.showSettings = function() {
        aclib.log("");
        aclib.log(" input  : " + formatline(this.args.input, 10));

        if (!this.params.onlytrim) {
            aclib.log(" output : " + formatline(this.args.output, 10));
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

    AutoConvert.prototype.tssplitter = function() {
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

    AutoConvert.prototype.ffprobe = function() {
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

    AutoConvert.prototype.lssource = function() {
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

    AutoConvert.prototype.dgindex = function() {
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

    AutoConvert.prototype.dgindexnv = function() {
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

    AutoConvert.prototype.dgindexim = function() {
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

    AutoConvert.prototype.tsparser = function() {
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

    AutoConvert.prototype.ts2aac = function() {
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

    AutoConvert.prototype.avisynth = function() {
        var avs = new File(this.options.temp + ".avs");
        var template_avs = new File(this.args.avs);

        var script = template_avs.read("Shift-JIS");
        if (script === null) {
            aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
            return false;
        }

        var script_video = "", script_audio = "", script_delay = "";

        script_video = this.options.avs.video[0];

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

    AutoConvert.prototype.readTrim = function() {
        var input = new File(this.args.input);
        var trim_json = input.parent().childFile(input.base() + ".trim_" + this.params.source + ".json");

        if (!trim_json.exists()) return true;

        // Remove
        if (this.params.onlytrim && !this.params.edittrim) {
            if (!trim_json.remove()) {
                aclib.log("Can't delete file. [" + trim_json.path() + "]", 1);
                return false;
            }
            return true;
        }

        // Read
        var trim_out;

        trim_out = trim_json.read();

        if (trim_out === null) {
            aclib.log("Can't read file. [" + trim_json.path() + "]", 1);
            return false;
        }

        var trim_obj;

        try {
            trim_obj = JSON.parse(trim_out);
        } catch (err) {
            aclib.log("Can't parse JSON. [" + trim_json.path() + "]", 1);
            return false;
        }

        this.options.avs.trim = trim_obj;

        return true;
    };

    AutoConvert.prototype.comskip = function() {
        if (this.options.avs.trim.length !== 0) return true;

        var input = new File(this.args.input);
        var comskip_avs = new File(this.args.input + ".avs");
        var logo_txt = new File(this.args.logo + ".logo.txt");
        var logo_ini = new File(this.args.logo + ".ini");

        this.options.clean.push(comskip_avs.path());
        this.options.clean.push(input.parent().childFile(input.base() + ".logo.txt").path());

        // Args
        var args = this.command.comskip;

        if (logo_txt.exists()) {
            args += ' --logo="' + logo_txt.path() + '"';
        }

        if (logo_ini.exists()) {
            args += ' --ini="' + logo_ini.path() + '"';
        } else {
            args += ' --ini="' + this.path.comskip_ini + '"';
        }

        // Run process
        var proc = new Process('"${comskip}" -t ${args} "${input}"');

        proc.prepare({
            comskip: this.path.comskip,
            args: args,
            input: input.path()
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Read
        var trim_script = comskip_avs.read("Shift-JIS");

        if (trim_script === null) {
            aclib.log("Can't read file. [" + comskip_avs.path() + "]", 1);
            return false;
        }

        var trim_arr = getTrim(trim_script);

        if (trim_arr.length === 0) {
            aclib.log("Can't get trim.", 1);
            return false;
        }

        this.options.avs.trim = trim_arr;

        return true;
    };

    AutoConvert.prototype.logoguillo = function() {
        if (this.options.avs.trim.length !== 0) return true;

        var logoguillo_avs = new File(this.options.temp + ".logoguillo.avs");
        var template_avs = new File(this.path.logoguillo_avs);
        var output_avs = new File(this.options.temp + ".logoguillo.output.avs");

        var script = template_avs.read("Shift-JIS");

        if (script === null) {
            aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
            return false;
        }

        // Replace
        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, this.options.avs.video[0]);
        script = script.replace(/__audio__/g, this.options.avs.audio[0]);
        script = script.replace(/__delay__/g, this.options.avs.delay[0]);

        if (!logoguillo_avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + logoguillo_avs.path() + "]", 1);
            return false;
        }

        //run process
        var proc = new Process('"${logoguillo}" -video "${input}" -lgd "${lgd}" -avs2x "${avs2x}" -avsPlg "USE_AVS" -prm "${prm}" -out "${output}" -outFmt avs ${args}');

        proc.prepare({
            logoguillo: this.path.logoguillo,
            input: logoguillo_avs.path(),
            lgd: this.args.logo + ".lgd",
            avs2x: this.path.avs2pipemod,
            prm: this.args.logo + ".lgd.autoTune.param",
            output: output_avs.path(),
            args: this.command.logoguillo
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run(-1, -9)) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Read
        var trim_script = output_avs.read("Shift-JIS");

        if (trim_script === null) {
            aclib.log("Can't read file. [" + output_avs.path() + "]", 1);
            return false;
        }

        var trim_arr = getTrim(trim_script);

        if (trim_arr.length === 0) {
            aclib.log("Can't get trim.", 1);
            return false;
        }

        this.options.avs.trim = trim_arr;

        return true;
    };

    AutoConvert.prototype.joinlogoscp = function() {
        if (this.options.avs.trim.length !== 0) return true;

        var input = new File(this.args.input);
        var joinlogoscp_avs = new File(this.options.temp + ".joinlogoscp.avs");
        var joinlogoscp_cmd = new File(this.path.joinlogoscp_cmd);
        var template_avs = new File(this.path.joinlogoscp_avs);
        var output_avs = new File(this.options.temp + ".joinlogoscp.output.avs");
        var logoframe_txt = new File(this.options.temp + ".logoframe.txt");
        var chapterexe_txt = new File(this.options.temp + ".chapterexe.txt");
        var eraselogo_json = input.parent().childFile(input.base() + ".eraselogo_" + this.params.source + ".json");

        if (new File(this.args.logo + ".joinlogoscp.txt").exists()) {
            joinlogoscp_cmd = new File(this.args.logo + ".joinlogoscp.txt");
        }

        var script = template_avs.read("Shift-JIS");

        if (script === null) {
            aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
            return false;
        }

        // Replace
        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, this.options.avs.video[0]);
        script = script.replace(/__audio__/g, this.options.avs.audio[0]);
        script = script.replace(/__delay__/g, this.options.avs.delay[0]);

        if (!joinlogoscp_avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + joinlogoscp_avs.path() + "]", 1);
            return false;
        }

        // Run process
        var proc = new Process('"${logoframe}" "${input}" -logo "${logo}" -oa "${output}" ${args}');

        proc.prepare({
            logoframe: this.path.logoframe,
            input: joinlogoscp_avs.path(),
            logo: this.args.logo + ".lgd",
            output: logoframe_txt.path(),
            args: this.command.logoframe
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        var proc2 = new Process('"${chapterexe}" -v "${input}" -o "${output}" ${args}');

        proc2.prepare({
            chapterexe: this.path.chapterexe,
            input: joinlogoscp_avs.path(),
            output: chapterexe_txt.path(),
            args: this.command.chapterexe
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc2.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        var proc3 = new Process('"${joinlogoscp}" -inlogo "${inlogo}" -inscp "${inscp}" -incmd "${incmd}" -o "${output}" ${args}');

        proc3.prepare({
            joinlogoscp: this.path.joinlogoscp,
            inlogo: logoframe_txt.path(),
            inscp: chapterexe_txt.path(),
            incmd: joinlogoscp_cmd.path(),
            output: output_avs.path(),
            args: this.command.joinlogoscp
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc3.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Read
        var trim_script = output_avs.read("Shift-JIS");

        if (trim_script === null) {
            aclib.log("Can't read file. [" + output_avs.path() + "]", 1);
            return false;
        }

        var trim_arr = getTrim(trim_script);

        if (trim_arr.length === 0) {
            aclib.log("Can't get trim.", 1);
            return false;
        }

        this.options.avs.trim = trim_arr;

        if (!this.params.reset && eraselogo_json.exists()) return true;

        var eraselogo_arr = [];
        var obj = null;
        var reg = /^ *(\d+) *(S|E) *(\d+) *(ALL|TOP|BTM) *\d+ *\d+$/;
        var logoframe_out = logoframe_txt.read();

        if (logoframe_out === null) {
            aclib.log("Can't read file. [" + logoframe_txt.path() + "]", 1);
            return false;
        }

        var logoframe_arr = logoframe_out.split(/\r\n|\r|\n/);

        logoframe_arr.forEach(function(value) {
            var match = value.match(reg);

            if (!match) return;

            if (match[2] === "S") {
                obj = {};
                obj.start = parseInt(match[1], 10);
                obj.fadein = parseInt(match[3], 10);
                obj.fieldin = ["ALL", "TOP", "BTM"].indexOf(match[4]);
            }

            if (match[2] === "E") {
                obj.end = parseInt(match[1], 10);
                obj.fadeout = parseInt(match[3], 10);
                obj.fieldout = ["ALL", "TOP", "BTM"].indexOf(match[4]);
                eraselogo_arr.push(obj);
                obj = null;
            }
        });

        var str = JSON.stringify(eraselogo_arr);

        if (!eraselogo_json.write(str)) {
            aclib.log("Can't write file. [" + eraselogo_json.path() + "]", 1);
            return false;
        }

        return true;
    };

    AutoConvert.prototype.editTrim = function() {
        var avspmod_avs = new File(this.options.temp + ".avspmod.avs");
        var template_avs = new File(this.path.avspmod_avs);
        var trim = this.options.avs.trim;

        var script = template_avs.read("Shift-JIS");

        if (script === null) {
            aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
            return false;
        }

        // Replace
        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, this.options.avs.video[0]);
        script = script.replace(/__audio__/g, this.options.avs.audio[0]);
        script = script.replace(/__delay__/g, this.options.avs.delay[0]);

        if (trim.length !== 0) {
            var trim_str = trim.map(function(value) {
                return "Trim(" + value.start + ", " + value.end + ")";
            }).join(" ++ ");
            script = script.replace(/#__trim__/g, trim_str);
        }

        if (!avspmod_avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + avspmod_avs.path() + "]", 1);
            return false;
        }

        // Run process
        var proc = new Process('"${avspmod}" "${input}"');

        proc.prepare({
            avspmod: this.path.avspmod,
            input: avspmod_avs.path()
        }, {window: this.settings.window, debug: this.options.debug});

        proc.run();

        // Read
        var trim_script = avspmod_avs.read("Shift-JIS");

        if (trim_script === null) {
            aclib.log("Can't read file. [" + avspmod_avs.path() + "]", 1);
            return false;
        }

        var trim_arr = getTrim(trim_script);

        if (trim_arr.length === 0) {
            aclib.log("Can't get trim.", 1);
            return false;
        }

        this.options.avs.trim = trim_arr;

        return true;
    };

    AutoConvert.prototype.writeTrim = function() {
        if (this.options.avs.trim.length === 0) return true;

        var input = new File(this.args.input);
        var avs = new File(this.options.temp + ".avs");
        var trim_json = input.parent().childFile(input.base() + ".trim_" + this.params.source + ".json");
        var trim = this.options.avs.trim;

        if (!this.params.onlytrim) {
            this.options.clean.push(input.parent().childFile(input.base() + ".trim").path());

            // Read
            var script = avs.read("Shift-JIS");

            if (script === null) {
                aclib.log("Can't read file. [" + avs.path() + "]", 1);
                return false;
            }

            var trim_str = trim.map(function(value) {
                return "Trim(" + value.start + ", " + value.end + ")";
            }).join(" ++ ");

            // Replace
            script = script.replace(/#__trim__/g, trim_str);

            if (!avs.write(script, "Shift-JIS")) {
                aclib.log("Can't write file. [" + avs.path() + "]", 1);
                return false;
            }
        }

        // Write
        var str = JSON.stringify(trim);

        if (!trim_json.write(str)) {
            aclib.log("Can't write file. [" + trim_json.path() + "]", 1);
            return false;
        }

        return true;
    };

    AutoConvert.prototype.caption2ass = function() {
        var caption2ass_srt = new File(this.options.temp + ".caption2ass.srt");
        var caption2ass_trim = new File(this.options.temp + ".caption2ass.trim.srt");

        // Run process
        var proc = new Process('"${caption2ass}" -format srt "${input}" "${output}"');

        proc.prepare({
            caption2ass: this.path.caption2ass,
            input: this.args.input,
            output: caption2ass_srt.path()
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!caption2ass_srt.exists()) {
            aclib.log("No subtitle file.", 1);
            return true;
        }

        if (this.options.avs.trim.length === 0) {
            this.options.mux.subtitle.push(caption2ass_srt.path());
        } else {
            var proc2 = new Process('cscript //nologo "${srttrim}" -i "${input}" -a "${avs}" -o "${output}" -e');

            proc2.prepare({
                srttrim: new Folder(aclib.path()).childFolder("src").childFolder("lib").childFile("srttrim.js").path(),
                input: caption2ass_srt.path(),
                avs: this.options.temp + ".avs",
                output: caption2ass_trim.path()
            }, {window: this.settings.window, debug: this.options.debug});

            if (!proc2.run()) {
                aclib.log("Process failed.", 1);
                return false;
            }

            if (!caption2ass_trim.exists()) {
                aclib.log("Can't trim subtitle.", 1);
                return false;
            }

            this.options.mux.subtitle.push(caption2ass_trim.path());
        }

        return true;
    };

    AutoConvert.prototype.autovfr = function() {
        var avs = new File(this.options.temp + ".avs");
        var autovfr_avs = new File(this.options.temp + ".autovfr.avs");
        var template_avs = new File(this.path.autovfr_avs);
        var autovfr_txt = new File(this.options.temp + ".autovfr.txt");
        var autovfr_def = new File(this.options.temp + ".autovfr.def");
        var autovfr_tmc = new File(this.options.temp + ".autovfr.tmc");
        var trim = this.options.avs.trim;
        var trim_crc = (function() {
            var trim_arr = trim.reduce(function(prev, value) {
                prev.push(value.start);
                prev.push(value.end);
                return prev;
            }, []);
            return trim_arr.length === 0 ? "" : aclib.crc32(trim_arr);
        })();
        var input = new File(this.args.input);
        var output = input.parent().childFile(input.base() + ".autovfr_" + this.params.source + "_" + trim_crc + ".json");

        this.options.clean.push(input.parent().childFile(input.base() + ".autovfr").path());

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

            if (!autovfr_def.write(output_obj.def, "Shift-JIS")) {
                aclib.log("Can't write file. [" + autovfr_def.path() + "]", 1);
                return false;
            }

            script = avs.read("Shift-JIS");
            if (script === null) {
                aclib.log("Can't read file. [" + avs.path() + "]", 1);
                return false;
            }
            script = script.replace(/__def__/g, autovfr_def.path());
            script = script.replace(/__tmc__/g, autovfr_tmc.path());

            if (!avs.write(script, "Shift-JIS")) {
                aclib.log("Can't write file. [" + avs.path() + "]", 1);
                return false;
            }

            this.options.mux.timecode.push(autovfr_tmc.path());

            return true;
        }

        // Read
        var script = template_avs.read("Shift-JIS");

        if (script === null) {
            aclib.log("Can't read file. [" + template_avs.path() + "]", 1);
            return false;
        }

        // Replace
        script = script.replace(/__path__/g, aclib.path());
        script = script.replace(/__video__/g, this.options.avs.video[0]);
        script = script.replace(/__audio__/g, this.options.avs.audio[0]);
        script = script.replace(/__delay__/g, this.options.avs.delay[0]);

        if (trim.length !== 0) {
            var trim_str = trim.map(function(value) {
                return "Trim(" + value.start + ", " + value.end + ")";
            }).join(" ++ ");
            script = script.replace(/#__trim__/g, trim_str);
        }

        script = script.replace(/__autovfr__/g, autovfr_txt.path());

        if (!autovfr_avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + autovfr_avs.path() + "]", 1);
            return false;
        }

        // Run process
        var proc = new Process('"${avs2pipemod}" -benchmark "${input}"');

        proc.prepare({
            avs2pipemod: this.path.avs2pipemod,
            input: autovfr_avs.path()
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!autovfr_txt.exists()) {
            aclib.log("Can't find file. [" + autovfr_txt.path() + "]", 1);
            return false;
        }

        // Run process
        var proc2 = new Process('"${autovfr}" -i "${input}" -o "${output}" -ini "${ini}" ${args}');

        proc2.prepare({
            autovfr: this.path.autovfr,
            input: autovfr_txt.path(),
            output: autovfr_def.path(),
            ini: this.path.autovfr_ini,
            args: this.command.autovfr
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc2.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!autovfr_def.exists()) {
            aclib.log("Can't find file. [" + autovfr_def.path() + "]", 1);
            return false;
        }

        // Read
        script = avs.read("Shift-JIS");

        if (script === null) {
            aclib.log("Can't read file. [" + avs.path() + "]", 1);
            return false;
        }

        script = script.replace(/__def__/g, autovfr_def.path());
        script = script.replace(/__tmc__/g, autovfr_tmc.path());

        if (!avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + avs.path() + "]", 1);
            return false;
        }

        this.options.mux.timecode.push(autovfr_tmc.path());

        // Read def
        var output_def = autovfr_def.read("Shift-JIS");

        if (output_def === null) {
            aclib.log("Can't read file. [" + autovfr_def.path() + "]", 1);
            return false;
        }

        // Write output
        var str = JSON.stringify({
            def: output_def
        });

        if (!output.write(str)) {
            aclib.log("Can't write file. [" + output.path() + "]", 1);
            return false;
        }

        return true;
    };

    AutoConvert.prototype.eraselogo = function() {
        var input = new File(this.args.input);
        var avs = new File(this.options.temp + ".avs");
        var eraselogo_json = input.parent().childFile(input.base() + ".eraselogo_" + this.params.source + ".json");

        var eraselogo_str;
        if (eraselogo_json.exists()) {
            var eraselogo_out;

            eraselogo_out = eraselogo_json.read();

            if (eraselogo_out === null) {
                aclib.log("Can't read file. [" + eraselogo_json.path() + "]", 1);
                return false;
            }

            var eraselogo_obj;
            try {
                eraselogo_obj = JSON.parse(eraselogo_out);
            } catch (err) {
                aclib.log("Can't parse JSON. [" + eraselogo_json.path() + "]", 1);
                return false;
            }

            eraselogo_str = eraselogo_obj.map(function(value) {
                value.logofile = this.args.logo + ".lgd";
                return aclib.replace('EraseLOGO_("${logofile}", start=${start}, fadein=${fadein}, fadeout=${fadeout}, ' +
                                     'fieldin=${fieldin}, fieldout=${fieldout}, end=${end}, interlaced=true)', value);
            }, this).join("\r\n");
        } else {
            eraselogo_str = 'EraseLOGO_("' + this.args.logo + '.lgd", interlaced=true)';
        }

        // Read
        var script = avs.read("Shift-JIS");

        if (script === null) {
            aclib.log("Can't read file. [" + avs.path() + "]", 1);
            return false;
        }

        // Replace
        script = script.replace(/#__eraselogo__/g, eraselogo_str);

        if (!avs.write(script, "Shift-JIS")) {
            aclib.log("Can't write file. [" + avs.path() + "]", 1);
            return false;
        }

        return true;
    };

    AutoConvert.prototype.editAvs = function() {
        // Run process
        var proc = new Process('"${avspmod}" "${input}"');

        proc.prepare({
            avspmod: this.path.avspmod,
            input: this.options.temp + ".avs"
        }, {window: this.settings.window, debug: this.options.debug});

        proc.run();

        return true;
    };

    AutoConvert.prototype.wav = function() {
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

    AutoConvert.prototype.encAudio = function() {
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

    AutoConvert.prototype.fakeaacwav = function() {
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

    AutoConvert.prototype.encVideo = function() {
        var avs = new File(this.options.temp + ".avs");
        var encVideo_ext = new File(this.options.temp + ".encVideo." + this.preset.video.extension);

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
            output: '"' + encVideo_ext.path() + '"'
        }, {window: this.settings.window, debug: this.options.debug});

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

    AutoConvert.prototype.encMedia = function() {
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
        }, {window: this.settings.window, debug: this.options.debug});

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

    AutoConvert.prototype.mp4box = function() {
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
        var proc = new Process('"${mp4box}" ${args} -new "${output}"');

        proc.prepare({
            mp4box: this.path.mp4box,
            args: args,
            output: mp4box_mp4.path()
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

    AutoConvert.prototype.lsmuxer = function() {
        var self = this;
        var lsmuxer_mp4 = new File(this.options.temp + ".lsmuxer.mp4");

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

        function mux(source, dest) {
            var lsmuxer_source = new File(source);
            var lsmuxer_dest = new File(dest);

            var proc = new Process('"${lsmuxer}" --isom-version 6 -i "${input}" -o "${output}"');

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

        var args = "";

        this.options.mux.video.forEach(function(value, index) {
            args += ' -i "' + value + '"' + (index === 0 ? '' : '?1:disable');
        });

        this.options.mux.audio.forEach(function(value, index) {
            args += ' -i "' + value + '"' + (index === 0 ? '' : '?1:disable');
        });

        // Run process
        var proc = new Process('"${lsremuxer}" ${args} -o "${output}"');

        proc.prepare({
            lsremuxer: this.path.lsremuxer,
            args: args,
            output: lsmuxer_mp4.path()
        }, {window: this.settings.window, debug: this.options.debug});

        if (!proc.run()) {
            aclib.log("Process failed.", 1);
            return false;
        }

        // Check files
        if (!lsmuxer_mp4.exists()) {
            aclib.log("Can't mux mp4.", 1);
            return false;
        }

        this.options.move = lsmuxer_mp4.path();

        return true;
    };

    AutoConvert.prototype.mkvmerge = function() {
        var mkvmerge_mkv = new File(this.options.temp + ".mkvmerge.mkv");

        var args = "";

        this.options.mux.video.forEach(function(value, index) {
            if (this.params.autovfr) {
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

    AutoConvert.prototype.timelineeditor = function() {
        var timelineeditor_mp4 = new File(this.options.temp + ".timelineeditor.mp4");

        if (this.preset.muxer === "lsmuxer") {
            // Nothing
        } else {
            var mp4box_mp4 = new File(this.options.temp + ".timelineeditor.mp4box.mp4");

            var args = "";
            this.options.mux.video.forEach(function(value, index) {
                args += ' -add "' + value + '"#video' + (index === 0 ? '' : ':disable');
            });

            // Run process
            var proc = new Process('"${mp4box}" ${args} -new "${output}"');

            proc.prepare({
                mp4box: this.path.mp4box,
                args: args,
                output: mp4box_mp4.path()
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
        }

        // Run process
        var proc2 = new Process('"${timelineeditor}" --media-timescale 120000 --media-timebase 1001 --timecode "${timecode}" "${input}" "${output}"');

        proc2.prepare({
            timelineeditor: this.path.timelineeditor,
            timecode: this.options.mux.timecode[0],
            input: this.options.move,
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

        this.options.move = timelineeditor_mp4.path();

        return true;
    };

    AutoConvert.prototype.move = function() {
        var move_ext = new File(this.options.move);
        var dest_ext = new File(this.args.output + "." + move_ext.ext());

        if (dest_ext.exists()) {
            dest_ext = new File(this.args.output + "_" + Math.random().toString(16).slice(2) + "." + move_ext.ext());
        }

        if (!move_ext.move(dest_ext.path())) {
            aclib.log("Can't move file.", 1);
            return false;
        }

        return true;
    };

    AutoConvert.prototype.clean = function() {
        var clean_arr = this.params.clean ? this.options.clean : [];

        clean_arr.push(this.options.temp);

        clean_arr.forEach(function(value) {
            var file = new File(value);
            var reg = new RegExp(file.name().replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1"));
            var files = file.parent().findFiles(reg);

            files.forEach(function(_file) {
                _file.remove();
            });
        });

        return true;
    };

    global.AutoConvert = AutoConvert;
})();
