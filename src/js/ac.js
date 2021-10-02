/* eslint quotes: "off" */
/* global WScript, ActiveXObject, aclib, Process, Folder */
var nsAC = nsAC || {};

(function() {
    var global = new Function("return this")();

    nsAC.AutoConvert = function() {
        this.initialize.apply(this, arguments);
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.usage = function() {
        aclib.log("-------------------------------------------------------------------------------");
        aclib.log("    AutoConvert");
        aclib.log("-------------------------------------------------------------------------------");
        aclib.log("usage: cscript ac.wsf -input input.ts -o output -a avs.avs -p preset.json -l logo params...");
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.initialize = function(args) {
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

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.execute = function() {
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

    // -----------------------------------------------------------

    global.AutoConvert = nsAC.AutoConvert;
}());
