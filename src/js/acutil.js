/* eslint quotes: "off" */
/* global WScript, aclib, Process, Folder, File */
(function() {
    var global = new Function("return this")();

    var zerofill = function(number, length, force) {
        var str = number.toString();

        return (force || str.length < length) ? (new Array(length).join("0") + str).slice(-length) : str;
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

    function AutoConvertUtilityHelper() {
        this.initialize.apply(this, arguments);
    }

    AutoConvertUtilityHelper.prototype.initialize = function(args) {
        this.args = args;
        this.settings = {};
    };

    AutoConvertUtilityHelper.prototype.usage = function() {
        aclib.log("-------------------------------------------------------------------------------");
        aclib.log("    AutoConvertUtility");
        aclib.log("-------------------------------------------------------------------------------");
        aclib.log("usage: cscript acutil.wsf input.ts input2.ts ...");
    };

    AutoConvertUtilityHelper.prototype.splash = function() {
        aclib.log("--------------------");
        aclib.log(" AutoConvertUtility ");
        aclib.log("--------------------");
    };

    AutoConvertUtilityHelper.prototype.getArguments = function() {
        return this.args.every(function(value) {
            var file = new File(value);

            if (!file.exists()) {
                aclib.log("File doesn't exist. [" + file.path() + "]", 1);
                return false;
            }

            return true;
        });
    };

    AutoConvertUtilityHelper.prototype.loadSettings = function() {
        var file = new File(aclib.path() + "\\settings\\acutil.json");
        var file2 = new File(aclib.path() + "\\settings\\config.json");

        var json = file.read();

        if (json === null) return false;

        try {
            json = JSON.parse(json);
        } catch (e) {
            aclib.log("Can't parse JSON. [" + e.message + "]", 1);

            return false;
        }

        Object.keys(json.path).forEach(function(key) {
            json.path[key] = aclib.replace(json.path[key], {path: aclib.path()});
        });

        this.settings = json;

        var json2 = file2.read();

        if (json2 === null) return false;

        try {
            json2 = JSON.parse(json2);
        } catch (e) {
            aclib.log("Can't parse JSON. [" + e.message + "]", 1);

            return false;
        }

        this.config = json2;

        return true;
    };
    AutoConvertUtilityHelper.prototype.checkSettings = function() {
        if (this.settings.settings.move) {
            var move = new Folder(this.settings.path.move);

            if (!move.exists()) {
                aclib.log("Move path doesn't exist. [" + move.path() + "]", 1);

                return false;
            }
        }

        if (this.settings.settings.rplsinfo) {
            var rplsinfo = new File(this.settings.path.rplsinfo);

            if (!rplsinfo.exists()) {
                aclib.log("Rplsinfo path doesn't exist. [" + rplsinfo.path() + "]", 1);

                return false;
            }
        }

        if (this.settings.settings.screname) {
            var screname = new File(this.settings.path.screname);

            if (!screname.exists()) {
                aclib.log("SCRename path doesn't exist. [" + screname.path() + "]", 1);

                return false;
            }
        }
        return true;
    };

    AutoConvertUtilityHelper.prototype.execute = function() {
        for (var i = 0; i < this.args.length; i++) {
            aclib.log("");

            var input = this.args[i];
            var output = this.settings.path.output === "" ?
                new File(this.args[i]).parent().path() :
                this.settings.path.output;
            var acu = new AutoConvertUtility({
                path: {
                    input: input,
                    output: output,
                    move: this.settings.path.move,
                    rplsinfo: this.settings.path.rplsinfo,
                    screname: this.settings.path.screname
                },
                args: this.settings.args,
                params: this.settings.params,
                macro: this.settings.macro,
                settings: this.settings.settings,
                config: this.config,
                log: aclib.log
            });

            if (acu.checkDrop() && acu.getInfo() && acu.getConfig() &&
                acu.getMacro() && acu.setMacro() && acu.checkSettings()) {
                acu.showSettings();

                aclib.log("");

                var exec = acu.execute();
                while (exec.getStatus() === 0) WScript.Sleep(100);

                var exitcode = exec.getExitCode();
                var log_txt = new Folder(aclib.path()).childFile("log.txt");
                var log_out = "";

                if (this.settings.settings.log) {
                    if (log_txt.exists()) {
                        log_out = log_txt.read() + "\r\n";
                    } else {
                        log_txt.make();
                    }
                }

                if (exitcode === 0) {
                    aclib.log("Successful!");

                    if (this.settings.settings.log) {
                        log_out += 'O: "' + this.args[i] + '"';
                        log_txt.write(log_out);
                    }

                    if (acu.moveInput()) continue;
                } else if (exitcode === -1073741510) {
                    if (this.settings.settings.log) {
                        log_out += 'X: "' + this.args[i] + '" [Stopped]';
                        log_txt.write(log_out);
                    }

                    aclib.log("Stopped...");
                } else {
                    if (this.settings.settings.log) {
                        log_out += 'X: "' + this.args[i] + '" [' + (exitcode - 1) + ']';
                        log_txt.write(log_out);
                    }

                    aclib.log("Failed... [" + (exitcode - 1) + "]");
                }
            } else {
                aclib.log(this.args[i], 1);
            }
            if (this.settings.settings.pause) {
                aclib.log("Continue? [y / n]");

                if (WScript.StdIn.readLine() === "y") {
                    aclib.log("Continue...");

                    continue;
                } else {
                    aclib.log("Exit...");

                    return i + 1;
                }
            } else {
                aclib.log("Continue...");

                continue;
            }
        }
        aclib.log("All process finished.");

        return 0;
    };

    function AutoConvertUtility() {
        this.initialize.apply(this, arguments);
    }

    AutoConvertUtility.prototype.initialize = function(options) {
        var input = new File(options.path.input);
        var output = new Folder(options.path.output).childFile(input.base());
        var inputDir = new File(options.path.input).parent();
        var outputDir = new Folder(options.path.output);

        this.args = {
            input: input.path(),
            output: output.path(),
            inputDir: inputDir.path(),
            outputDir: outputDir.path(),
            avs: options.args.avs,
            preset: options.args.preset,
            logo: null
        };
        this.path = {
            move: options.path.move,
            rplsinfo: options.path.rplsinfo,
            screname: options.path.screname
        };
        this.params = aclib.clone(options.params);
        this.macro = aclib.clone(options.macro);
        this.settings = aclib.clone(options.settings);
        this.config = aclib.clone(options.config);
        this.options = {
            info: {
                start: null,
                end: null,
                service: "",
                title: "",
                content: "",
                genre: ["", ""]
            },
            macro: {},
            debug: false
        };
        this.log = options.log;
    };

    AutoConvertUtility.prototype.showSettings = function() {
        this.log(" input  : " + formatline(this.args.input, 10));
        this.log(" output : " + formatline(this.args.output, 10));

        if (!this.params.onlytrim) {
            // this.log(" output : " + formatline(this.args.output, 10));
            this.log(" avs    : " + formatline(this.args.avs, 10));
            this.log(" preset : " + formatline(this.args.preset, 10));
        }

        if (this.params.trim !== "none" || this.params.eraselogo) {
            this.log(" logo   : " + formatline(this.args.logo, 10));
        }

        return true;
    };

    AutoConvertUtility.prototype.checkDrop = function() {
        if (!this.settings.checkdrop) return true;

        var input_err = new File(this.args.input + ".err");

        if (!input_err.exists()) return true;

        var input_out = input_err.read("Shift-JIS");

        if (input_out === null) {
            this.log("Can't read file. [" + input_err.path() + "]");
            return false;
        }

        var input_arr = input_out.split(/\r\n|\r|\n/g);
        var reg = /^PID: *0x[\dA-F]+ *Total: *\d+ *Drop: *(\d+) *Scramble: *\d+ *(.+)$/;

        return input_arr.every(function(value) {
            var match = value.match(reg);

            if (!match) return true;

            var stream = match[2];
            var drop = parseInt(match[1], 10);

            if (stream !== "MPEG2 VIDEO" && stream !== "MPEG2 AAC") return true;

            if (drop !== 0) {
                this.log(drop + " drops in " + stream + ".");

                return false;
            }

            return true;
        }, this);
    };

    AutoConvertUtility.prototype.getInfo = function() {
        if (this.settings.programtxt && new File(this.args.input + ".program.txt").exists()) {
            if (this.getInfoFromProgramtxt()) return true;
        }

        if (this.settings.rplsinfo) {
            if (this.getInfoFromRplsinfo()) return true;
        }

        if (!this.getInfoFromFile()) return false;

        return true;
    };

    AutoConvertUtility.prototype.getInfoFromProgramtxt = function() {
        var program_txt = new File(this.args.input + ".program.txt");
        var program_out = program_txt.read("Shift-JIS");

        if (program_out === null) {
            this.log("Can't read file. [" + program_txt.path() + "]");
            return false;
        }

        var program_arr = program_out.split(/\r\n|\r|\n/);

        for (var i = 0; i < program_arr.length; i++) {
            if (i === 0) {
                var match = program_arr[i].match(/(\d+)\/(\d+)\/(\d+)\(.\) (\d+):(\d+)\uff5e(\d+):(\d+)/);
                this.options.info.start = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10),
                                                   parseInt(match[4], 10), parseInt(match[5], 10), 0);
                this.options.info.end = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10),
                                                 parseInt(match[6], 10), parseInt(match[7], 10), 0);
                if (+this.options.info.end - +this.options.info.start < 0) {
                    this.options.info.end.setTime(+this.options.info.end + 24 * 60 * 60 * 1000);
                }
            }

            if (i === 1) {
                this.options.info.service = aclib.toHalf(program_arr[i]);
            }

            if (i === 2) {
                this.options.info.title = aclib.toHalf(program_arr[i]);
            }

            if (i === 4) {
                for (; i < program_arr.length && program_arr[i] !== "" && program_arr[i] !== "\u8a73\u7d30\u60c5\u5831"; i++)
                    this.options.info.content += aclib.toHalf(program_arr[i]);
            }

            if (/\u30b8\u30e3\u30f3\u30eb : /.test(program_arr[i])) {
                this.options.info.genre = program_arr[++i].split(" - ");
            }
        }

        if (this.options.debug)
            this.log("getInfoFromProgramtxt: " + JSON.stringify(this.options.info, null, "    "));

        return true;
    };

    AutoConvertUtility.prototype.getInfoFromRplsinfo = function() {
        var proc = new Process('"${rplsinfo}" "${input}" -T -dtpcbig');

        proc.prepare({
            rplsinfo: this.path.rplsinfo,
            input: this.args.input
        }, {window: 0, stdout: true});

        var exec = proc.run();

        if (exec.exitcode !== 0 || exec.stdout === null) {
            this.log("rplsinfo: Process failed.");

            return false;
        }

        var info = exec.stdout.split(/\r\n|\r|\n/)[0].split("\t");
        var match, match2;

        match = info[0].match(/(\d+)\/(\d+)\/(\d+)/);
        match2 = info[1].match(/(\d+):(\d+):(\d+)/);
        this.options.info.start = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10),
                                           parseInt(match2[1], 10), parseInt(match2[2], 10), parseInt(match2[3], 10));

        match = info[2].match(/(\d+):(\d+):(\d+)/);
        this.options.info.end = new Date(+this.options.info.start +
                                         parseInt(match[1], 10) * 60 * 60 * 1000 +
                                         parseInt(match[2], 10) * 60 * 1000 +
                                         parseInt(match[3], 10) * 1000);

        match = info[6].match(/(.*?) \u3014(.*?)\u3015/);
        this.options.info.service = aclib.toHalf(info[3]);
        this.options.info.title = aclib.toHalf(info[4]);
        this.options.info.content = aclib.toHalf(info[5]);
        this.options.info.genre = [match[1], match[2]];

        if (this.options.debug)
            this.log("getInfoFromRplsinfo: " + JSON.stringify(this.options.info, null, "    "));

        return true;
    };

    AutoConvertUtility.prototype.getInfoFromFile = function() {
        var input = new File(this.args.input);

        this.options.info.start = new Date(input.created());
        this.options.info.end = new Date(input.lastModified());
        this.options.info.title = aclib.toHalf(input.base());

        if (this.options.debug)
            this.log("getInfoFromFile: " + JSON.stringify(this.options.info, null, "    "));

        return true;
    };

    AutoConvertUtility.prototype.getConfig = function() {
        var info = this.options.info;

        this.config.forEach(function(obj) {
            var config = obj.config;

            if (!(config in info)) return;

            obj.content.forEach(function(obj2) {
                var reg = new RegExp(obj2.contain.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1"), "g");

                if (!reg.test(info[config].toString())) return;

                if ("rep" in obj2 && config !== "genre" && config !== "start" && config !== "end")
                    info[config] = info[config].replace(reg, obj2.rep);
                if ("dir" in obj2) this.macro.dir = obj2.dir;
                if ("file" in obj2) this.macro.file = obj2.file;
                if ("avs" in obj2) this.args.avs = obj2.avs;
                if ("preset" in obj2) this.args.preset = obj2.preset;

                for (var key in obj2.params) {
                    if (!(key in this.params)) continue;
                    this.params[key] = obj2.params[key];
                }
            }, this);
        }, this);

        if (this.options.debug) {
            this.log("getConfig_info: " + JSON.stringify(info, null, "    "));
            this.log("getConfig_macro: " + JSON.stringify(this.macro, null, "    "));
            this.log("getConfig_args: " + JSON.stringify(this.args, null, "    "));
            this.log("getConfig_params: " + JSON.stringify(this.params, null, "    "));
        }

        return true;
    };

    AutoConvertUtility.prototype.getMacro = function() {
        var self = this;
        var macro = this.options.macro;

        macro.original = new File(this.args.input).base();
        macro.service = this.options.info.service;
        macro.title = this.options.info.title.replace(/ *[\u300c\u300e].*[\u300d\u300f] */g, "");
        macro.title2 = this.options.info.title.replace(/ *\[.*?\] */g, "");
        macro.genre = this.options.info.genre[0];
        macro.genre2 = this.options.info.genre[1];

        var obj, title, content, part, number, subtitle, start, end;

        title = this.options.info.title.replace(/ *\[.*?\] */g, "");
        content = this.options.info.content;
        start = this.options.info.start;
        end = this.options.info.end;

        var getScrename = function() {
            var _macro = "$SCtitle$\\$SCpart$\\$SCnumber1$\\$SCsubtitle$\\$SCdate2$\\$SCtime2$\\$SCeddate2$\\$SCedtime2$";
            var date = self.options.info.start;
            var day = zerofill(date.getFullYear(), 4) + zerofill(date.getMonth() + 1, 2) + zerofill(date.getDate(), 2);
            var time = zerofill(date.getHours(), 2) + zerofill(date.getMinutes(), 2);
            var input = day + time + "_" + self.options.info.title + " _" + self.options.info.service;

            var proc = new Process('cscript //nologo "${screname}" -t "${input}" "${macro}"');

            proc.prepare({
                screname: self.path.screname,
                input: input,
                macro: _macro
            }, {window: 0, stdout: true});

            var exec = proc.run();

            if (exec.exitcode !== 0 || exec.stdout === null) {
                self.log("SCRename: Process failed.");

                return false;
            }

            var info = exec.stdout.split(/\r\n|\r|\n/)[0];

            if (info === input) {
                self.log("SCRename: Can't get info.");

                return false;
            }

            info = info.split("\\");

            if (self.options.debug)
                self.log("SCRename: " + JSON.stringify(info, null, "    "));

            title = info[0] === "" ? title : info[0];
            part = info[1] === "" ? part : info[1];
            number = info[2] === "" ? number : parseInt(info[2], 10);
            subtitle = info[3] === "" ? subtitle : info[3];

            if (info[4] !== "" && info[5] !== "") {
                start = new Date(parseInt(info[4].slice(0, 4), 10),
                                 parseInt(info[4].slice(4, 6), 10) - 1,
                                 parseInt(info[4].slice(6, 8), 10),
                                 parseInt(info[5].slice(0, 2), 10),
                                 parseInt(info[5].slice(2, 4), 10),
                                 parseInt(info[5].slice(4, 6), 10));
            }

            if (info[6] !== "" && info[7] !== "") {
                end = new Date(parseInt(info[6].slice(0, 4), 10),
                               parseInt(info[6].slice(4, 6), 10) - 1,
                               parseInt(info[6].slice(6, 8), 10),
                               parseInt(info[7].slice(0, 2), 10),
                               parseInt(info[7].slice(2, 4), 10),
                               parseInt(info[7].slice(4, 6), 10));
            }

            return true;
        };
        var getPart = function(str) {
            var _part;
            var strPart = "\u524d\u4e2d\u5f8c";
            var reg = new RegExp(" *[" + strPart + "]\u7de8 *");
            var match = str.match(reg);
            if (!match) return null;

            _part = match[0];
            str = str.replace(reg, "");

            return {
                part: _part,
                replaced: str
            };
        };
        var getNumber = function(str) {
            var _number;
            var strNumber = "\u3007\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u96f6\u58f1\u5f10\u53c2\u8086\u4f0d\u9678\u8cea\u634c\u7396\u58f9\u8cb3\u53c3\u5341\u767e\u5343\u62fe\u4f70\u4edf\u964c\u9621";
            var strNumber1 = "\u3007\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u4e03\u516b\u4e5d\u96f6\u58f1\u5f10\u53c2\u8086\u4f0d\u9678\u8cea\u634c\u7396 \u58f9\u8cb3\u53c3";
            var strNumber2 = "\u5341\u767e\u5343\u62fe\u4f70\u4edf \u964c\u9621";
            var arrNumber = [["\u7b2c", "\u8a71"], ["\u7b2c", "\u56de"], ["#", ""]];

            var fn = function() {
                return arrNumber.some(function(value) {
                    var reg = new RegExp(" *" + value[0] + "(\\d+)" + value[1] + " *");
                    var match = str.match(reg);

                    if (!match) return false;

                    _number = parseInt(match[1], 10);
                    str = str.replace(reg, "");

                    return true;
                });
            };

            var fn2 = function() {
                return arrNumber.some(function(value) {
                    var reg = new RegExp(" *" + value[0] + "([" + strNumber + "]+)" + value[1] + " *");
                    var match = str.match(reg);

                    if (!match) return false;

                    var num = 0;
                    var temp = 1;
                    var arr = match[1].split("");

                    arr.reverse();
                    arr.forEach(function(value2, index, array) {
                        if (strNumber1.indexOf(value2) === -1) {
                            num += Math.pow(10, strNumber2.indexOf(value2) % 3 + 1) * temp;
                            temp = 1;
                        } else {
                            temp = strNumber1.indexOf(value2) % 10;
                            if (index === array.length - 1) num += temp;
                        }
                    });

                    _number = num;
                    str = str.replace(reg, "");

                    return true;
                });
            };

            if (!fn() && !fn2()) return null;

            return {
                number: _number,
                replaced: str
            };
        };
        var getSubtitle = function(str, top) {
            var _subtitle;
            //var strPart = "\u524d\u4e2d\u5f8c";
            var arrBracket = [["\u300c", "\u300d"], ["\u300e", "\u300f"]];
            var flag = arrBracket.some(function(value) {
                var reg = new RegExp((top ? "^" : " *") + value[0] + "(.*?)" + value[1] + " *");
                var match = str.match(reg);

                if (!match) return false;

                _subtitle = match[1];
                str = str.replace(reg, "");

                return true;
            });

            if (!flag) return null;

            return {
                subtitle: _subtitle,
                replaced: str
            };
        };

        if (!this.settings.screname || !getScrename()) {
            obj = getNumber(title) || getPart(title);

            if (obj !== null) {
                title = obj.replaced;
                if ("part" in obj) {
                    part = obj.part;
                } else {
                    number = obj.number;
                }
            }

            obj = getNumber(content) || getPart(content);

            if (obj !== null) {
                content = obj.replaced;
                if (part === void(0) && number === void(0)) {
                    if ("part" in obj) {
                        part = obj.part;
                    } else {
                        number = obj.number;
                    }
                }
            }

            obj = getSubtitle(title);

            if (obj !== null) {
                title = obj.replaced;
                subtitle = obj.subtitle;
            }

            obj = getSubtitle(content);

            if (obj !== null) {
                content = obj.replaced;
                if (subtitle === void(0)) {
                    subtitle = obj.subtitle;
                }
            }
        }

        macro.title2 = title === "" ? macro.title2 : title;
        macro.subtitle = subtitle === void 0 ? "" : subtitle;
        macro.part = part === void 0 ? "" : part;

        if (number === void 0) {
            macro.number = macro.number2 = macro.number3 = macro.number4 = "";
        } else {
            macro.number = number.toString();
            macro.number2 = zerofill(number, 2);
            macro.number3 = zerofill(number, 3);
            macro.number4 = zerofill(number, 4);
        }

        macro.YY = zerofill(start.getFullYear(), 2, true);
        macro.YYYY = zerofill(start.getFullYear(), 4);
        macro.M = (start.getMonth() + 1).toString();
        macro.MM = zerofill(start.getMonth() + 1, 2);
        macro.D = start.getDate().toString();
        macro.DD = zerofill(start.getDate(), 2);
        macro.W = ["\u65e5", "\u6708", "\u706b", "\u6c34", "\u6728", "\u91d1", "\u571f"][start.getDay()];
        macro.h = start.getHours().toString();
        macro.hh = zerofill(start.getHours(), 2);
        macro.m = start.getMinutes().toString();
        macro.mm = zerofill(start.getMinutes(), 2);
        macro.s = start.getSeconds().toString();
        macro.ss = zerofill(start.getSeconds(), 2);

        macro._YY = zerofill(end.getFullYear(), 2, true);
        macro._YYYY = zerofill(end.getFullYear(), 4);
        macro._M = (end.getMonth() + 1).toString();
        macro._MM = zerofill(end.getMonth() + 1, 2);
        macro._D = end.getDate().toString();
        macro._DD = zerofill(end.getDate(), 2);
        macro._W = ["\u65e5", "\u6708", "\u706b", "\u6c34", "\u6728", "\u91d1", "\u571f"][end.getDay()];
        macro._h = end.getHours().toString();
        macro._hh = zerofill(end.getHours(), 2);
        macro._m = end.getMinutes().toString();
        macro._mm = zerofill(end.getMinutes(), 2);
        macro._s = end.getSeconds().toString();
        macro._ss = zerofill(end.getSeconds(), 2);

        if (this.options.debug)
            this.log("getMacro: " + JSON.stringify(macro, null, "    "));

        return true;
    };

    AutoConvertUtility.prototype.setMacro = function() {
        var macro = this.options.macro;
        var replaceMacro = function(str) {
            var reg = /\${(.*?)}/g;
            var reg2 = /\(\((.*?)\)\)/g;

            function rep(p0, p1) {
                if (!(p1 in macro)) return p0;

                return macro[p1];
            }

            function rep2(p0, p1) {
                var exists = true;

                p1 = p1.replace(reg, function(_p0) {
                    _p0 = _p0.replace(reg, rep);

                    if (_p0 === "") exists = false;

                    return _p0;
                });

                if (!exists) return "";

                return p1;
            }

            str = str.replace(reg2, rep2);
            str = str.replace(reg, rep);

            return str;
        };

        var dir = replaceMacro(this.macro.dir).trim();
        var file = replaceMacro(this.macro.file).trim();

        if (dir !== "") {
            dir = aclib.escape(dir);
        }

        this.args.outputDir = new Folder(this.args.outputDir).childFolder(dir).path();

        if (file === "") {
            file = new File(this.args.output).base();
        } else {
            file = aclib.escape(file).replace(/\\/g, aclib.toFull);
        }

        this.args.output = new Folder(this.args.outputDir).childFile(file).path();

        if (this.settings.move) {
            var move = replaceMacro(this.path.move);

            if (!/^.:\\/.test(move))
                move = new Folder(this.args.inputDir).childFolder(move).path();

            this.path.move = move;
        }

        this.args.logo = macro.service;

        if (this.options.debug)
            this.log("setMacro: " + JSON.stringify(this.args, null, "    "));

        return true;
    };

    AutoConvertUtility.prototype.checkSettings = function() {
        var output = new Folder(this.args.outputDir);
        var avs = new Folder(aclib.path()).childFolder("avs").childFile(this.args.avs + ".avs");
        var preset = new Folder(aclib.path()).childFolder("preset").childFile(this.args.preset + ".json");
        var logo_data = new Folder(aclib.path()).childFolder("logo").childFile(this.args.logo + ".lgd");
        var logo_param = new Folder(aclib.path()).childFolder("logo").childFile(this.args.logo + ".lgd.autoTune.param");

        switch (this.params.source) {
            case "lssource":
                if (this.params.demuxer === "ts2aac") {
                    this.log("Can't use ts2aac with lssource.", 1);
                    this.log("Turn off demuxer.");
                    this.params.demuxer = "none";
                }
                break;
        }

        switch (this.params.trim) {
            case "joinlogoscp":
                if (!logo_data.exists()) {
                    this.log("LogoData doesn't exist. [" + logo_data.path() + "]");
                    this.log("Turn off trim.");

                    this.params.trim = "none";
                }
                break;
        }
        if (this.params.eraselogo) {
            if (!logo_data.exists()) {
                this.log("LogoData doesn't exist. [" + logo_data.path() + "]");
                this.log("Turn off eraselogo.");
                this.params.eraselogo = false;
            }
        }

        if (this.params.onlytrim) {
            //if (this.params.trim === "none" && !this.params.edittrim) {
            //    this.log("No trim params.", 1);
            //    return false;
            //}

            if (this.params.caption2ass ||
                // this.params.autovfr ||
                this.params.eraselogo) {
                this.log("Enable onlytrim.");

                if (this.params.caption2ass) {
                    this.log("Turn off caption2ass.");
                    this.params.caption2ass = false;
                }

                // if (this.params.autovfr) {
                //     this.log("Turn off autovfr.");
                //     this.params.autovfr = false;
                // }

                if (this.params.eraselogo) {
                    this.log("Turn off eraselogo.");
                    this.params.eraselogo = false;
                }
            }
        } else {
            if (!avs.exists()) {
                this.log("Avs doesn't exist. [" + avs.path() + "]", 1);
                return false;
            }

            if (!preset.exists()) {
                this.log("Preset doesn't exist. [" + preset.path() + "]", 1);
                return false;
            }

            var preset_obj = preset.read();

            if (preset_obj === null) return false;

            try {
                preset_obj = JSON.parse(preset_obj);
            } catch (e) {
                this.log("Can't parse JSON. [" + e.message + "]", 1);
                return false;
            }

            if (preset_obj.video.type === "general") {
                if (this.params.caption2ass) {
                    this.log("Can't use Caption2Ass with general encoder.", 1);
                    return false;
                }

                if (this.params.autovfr) {
                    this.log("Can't use AutoVfr with general encoder.", 1);
                    return false;
                }
            }

            if (this.params.source === "lssource" &&
                this.params.demuxer === "none" &&
                preset_obj.audio.type === "fakeaacwav") {
                this.log("Can't use FakeAacWav without demux.", 1);
                return false;
            }

            // if (preset_obj.muxer === "lsmuxer" && this.params.caption2ass) {
            //     this.log("Can't use Caption2Ass with lsmuxer.");
            //     this.log("Turn off caption2ass.");
            //     this.params.caption2ass = false;
            // }
        }

        var folder = output, folder_arr = [];

        while (folder.path() !== "") {
            folder_arr.push(folder);
            folder = folder.parent();
        }

        var flag = folder_arr.every(function(value) {
            if (value.exists()) return true;
            if (!value.make()) return false;

            return true;
        });

        if (!flag) {
            this.log("Can't make output folder", 1);
            return false;
        }

        if (this.options.debug)
            this.log("checkSettings: " + JSON.stringify(this.params, null, "    "));

        return true;
    };

    AutoConvertUtility.prototype.execute = function(options) {
        options = options || {};

        var args = "";

        args += ' -input "' + this.args.input + '"';
        args += ' -output "' + this.args.output + '"';

        if (!this.params.onlytrim) {
            // args += ' -output "' + this.args.output + '"';
            args += ' -avs "' + new Folder(aclib.path()).childFolder("avs").childFile(this.args.avs + ".avs").path() + '"';
            // args += ' -preset "' + new Folder(aclib.path()).childFolder("preset").childFile(this.args.preset + ".json").path() + '"';
        }
        args += ' -preset "' + new Folder(aclib.path()).childFolder("preset").childFile(this.args.preset + ".json").path() + '"';

        if (this.params.trim !== "none" || this.params.eraselogo) {
            args += ' -logo "' + new Folder(aclib.path()).childFolder("logo").childFile(this.args.logo).path() + '"';
        }

        args += Object.keys(this.params).map(function(key) {
            var str = "";

            if (typeof this.params[key] === "string") {
                str = " -" + key + " " + this.params[key];
            } else {
                str = this.params[key] ? " -" + key : "";
            }

            return str;
        }, this).join("");

        args += "args" in options ? " " + options.args : "";

        var proc = new Process('cscript.exe /nologo "${autoconvert}"${args}');

        proc.prepare({
            autoconvert: new Folder(aclib.path()).childFolder("src").childFile("ac.wsf").path(),
            args: args
        }, {window: "window" in options ? options.window : 7});

        var helper = proc.helper();

        return helper;
    };

    AutoConvertUtility.prototype.moveInput = function() {
        if (!this.settings.move || this.path.move === "") return true;

        var input = new File(this.args.input);
        var move = new Folder(this.path.move).childFile(input.name());

        if (!input.move(move.path())) {
            this.log("Can't move input. [" + move.path() + "]", 1);
        }

        return true;
    };

    global.AutoConvertUtilityHelper = AutoConvertUtilityHelper;
    global.AutoConvertUtility = AutoConvertUtility;
})();
