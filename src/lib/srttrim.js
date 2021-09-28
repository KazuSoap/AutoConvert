(function() {
    function SrtTrim() {
        this.initialize.apply(this, arguments);
    }
    SrtTrim.prototype.initialize = function(args) {
        this.options = {
            args: args,
            input: "",
            avs: "",
            output: "",
            delay: 0,
            fps: {
                num: 30000,
                den: 1001
            },
            charset: {
                input: "UTF-8",
                avs: "UTF-8",
                output: "UTF-8"
            },
            exclude: false
        };
        this.temp = {
            srt: [],
            trim: []
        };
    };
    SrtTrim.prototype.read = function(path, charset) {
        var str;
        try {
            var ado = new ActiveXObject("ADODB.Stream");
            ado.Type = 2;
            ado.Charset = charset;
            ado.Open();
            ado.LoadFromFile(path);
            str = ado.ReadText();
            ado.Close();
            ado = null;
        } catch(e) {
            return null;
        }
        return str;
    };
    SrtTrim.prototype.write = function(path, charset, str) {
        try {
            var ado = new ActiveXObject("ADODB.Stream");
            ado.Type = 2;
            ado.Charset = charset;
            ado.Open();
            ado.WriteText(str);
            ado.SaveToFile(path, 2);
            ado.Close();
            ado = null;
        } catch(e) {
            return false;
        }
        return true;
    };
    SrtTrim.prototype.getTrim = function(str) {
        var arr = str.split(/\r\n|\r|\n/);
        var format = / *(\+\+|) *trim *\( *(\d+) *, *(\d+) *\)/ig;
        var trim = [];
        var replace = function ($0, $1, $2, $3) {
            trim.push({
                start: parseInt($2, 10),
                end: parseInt($3, 10)
            });
        };
        for (var i = 0; i < arr.length; i++) {
            if (/^ *#/.test(arr[i])) continue;
            var test = format.test(arr[i]);
            if (!test) continue;
            arr[i].replace(format, replace);
            break;
        }
        
        return trim;
    };
    SrtTrim.prototype.zerofill = function(number, length, force) {
        var str = number.toString();
        return (force || str.length < length) ? (new Array(length).join("0") + str).slice(-length) : str;
    };
    SrtTrim.prototype.log = function(message) {
        WScript.Echo(message);
    };
    SrtTrim.prototype.execute = function() {
        if (!this.getArguments()) return 1;
        if (!this.loadSrt()) return 2;
        if (!this.loadTrim()) return 3;
        if (!this.trimSrt()) return 4;
        if (!this.saveSrt()) return 5;
        return 0;
    };
    SrtTrim.prototype.getArguments = function() {
        var args = this.options.args;
        for (var i = 0; i < args.length; i++) {
            switch(args[i]) {
                case "-i":
                    this.options.input = args[++i];
                    break;
                case "-a":
                    this.options.avs = args[++i];
                    break;
                case "-o":
                    this.options.output = args[++i];
                    break;
                case "-d":
                    this.options.delay = parseInt(args[++i], 10);
                    if (isNaN(this.options.delay)) {
                        this.log("Invalid delay");
                        return false;
                    }
                    break;
                case "-f":
                    var fps = String(args[++i]);
                    if (fps.indexOf("/") === -1) {
                        this.options.fps = {
                            num: parseInt(fps, 10),
                            den: 1
                        };
                    } else {
                        this.options.fps = {
                            num: parseInt(fps.split("/")[0], 10),
                            den: parseInt(fps.split("/")[1], 10)
                        };
                    }
                    if (isNaN(this.options.fps.num) || isNaN(this.options.fps.den)) {
                        this.log("Invalid fps");
                        return false;
                    }
                    break;
                case "-c":
                    var charset = String(args[++i]);
                    this.options.charset = {
                        input: charset.split(":")[0],
                        avs: charset.split(":")[1],
                        output: charset.split(":")[2]
                    };
                    break;
                case "-e":
                    this.options.exclude = true;
                    break;
                default:
                    this.log("Invalid args [" + args[i] + "]");
                    return false;
            }
        }
        if (this.options.input === "" || this.options.avs === "" || this.options.output === "") {
            this.log("Input, avs, output are needed");
            return false;
        }
        return true;
    };
    SrtTrim.prototype.loadSrt = function() {
        var input = this.read(this.options.input, this.options.charset.input);
        if (input === null) {
            this.log("Can't read input");
            return false;
        }
        input = input.replace(/\r\n|\r|\n/g, "\n").split("\n");
        //input = input.split(/\r\n|\r|\n/);
        
        var srt = [];
        for (var i = 0; i < input.length; i++) {
            if (parseInt(input[i]) !== srt.length + 1) continue;
            var obj = {};
            var time = input[++i].split(" --> ");
            obj.start = Date.UTC(1970, 0, 1,
                                 parseInt(time[0].split(/[:,]/)[0], 10),
                                 parseInt(time[0].split(/[:,]/)[1], 10),
                                 parseInt(time[0].split(/[:,]/)[2], 10),
                                 parseInt(time[0].split(/[:,]/)[3], 10)) + this.options.delay;
            obj.end = Date.UTC(1970, 0, 1,
                               parseInt(time[1].split(/[:,]/)[0], 10),
                               parseInt(time[1].split(/[:,]/)[1], 10),
                               parseInt(time[1].split(/[:,]/)[2], 10),
                               parseInt(time[1].split(/[:,]/)[3], 10)) + this.options.delay;
            obj.sub = this.options.exclude ? input[++i].replace(/\[\u5916:.+?\]/g, "") : input[++i];
            for (i++; i < input.length; i++) {
                if (input[i] === "") break;
                obj.sub += "\n" + (this.options.exclude ? input[i].replace(/\[\u5916:.+?\]/g, "") : input[i]);
            }
            srt.push(obj);
        }
        
        if (srt.length === 0) {
            this.log("No subtitle");
            return false;
        }
        this.temp.srt = srt;
        
        return true;
    };
    SrtTrim.prototype.loadTrim = function() {
        var avs = this.read(this.options.avs, this.options.charset.avs);
        if (avs === null) {
            this.log("Can't read avs");
            return false;
        }
        
        var trim = this.getTrim(avs);
        if (trim.length === 0) {
            this.log("No trim");
            return false;
        }
        this.temp.trim = trim;
        
        return true;
    };
    SrtTrim.prototype.trimSrt = function() {
        var fps = this.options.fps;
        var oldSrt = this.temp.srt;
        var srt = [];
        var trim = this.temp.trim;
        
        var offset = 0;
        for (var i = 0; i < trim.length; i++) {
            var start = parseInt(trim[i].start * 1000 * fps.den / fps.num);
            var end = parseInt(trim[i].end * 1000 * fps.den / fps.num);
            for (var j = 0; j < oldSrt.length; j++) {
                if (oldSrt[j].end < start) continue;
                if (oldSrt[j].start >= end) break;
                
                srt.push({
                    start: oldSrt[j].start < start ?
                           start - start + offset :
                           oldSrt[j].start - start + offset,
                    end: oldSrt[j].end >= end ?
                         end - start + offset :
                         oldSrt[j].end - start + offset,
                    sub: oldSrt[j].sub
                });
            }
            offset += end - start;
        }
        
        if (srt.length === 0) {
            this.log("No subtitle");
            return false;
        }
        this.temp.srt = srt;
        
        return true;
    };
    SrtTrim.prototype.saveSrt = function() {
        var srt = this.temp.srt;
        
        var arr = [];
        for (var i = 0; i < srt.length; i++) {
            var start = new Date(srt[i].start);
            var end = new Date(srt[i].end);
            arr.push(i + 1);
            arr.push(this.zerofill(start.getUTCHours(), 2) + ":" +
                     this.zerofill(start.getUTCMinutes(), 2) + ":" +
                     this.zerofill(start.getUTCSeconds(), 2) + "," +
                     this.zerofill(start.getUTCMilliseconds(), 3) + " --> " +
                     this.zerofill(end.getUTCHours(), 2) + ":" +
                     this.zerofill(end.getUTCMinutes(), 2) + ":" +
                     this.zerofill(end.getUTCSeconds(), 2) + "," +
                     this.zerofill(end.getUTCMilliseconds(), 3));
            arr.push(srt[i].sub);
            arr.push("");
        }
        
        if (!this.write(this.options.output, this.options.charset.output, arr.join("\r\n"))) {
            this.log("Can't write output");
            return false;
        }
        return true;
    };
    
    
    var args = [];
    var objArgs = WScript.Arguments;
    for (var i = 0; i < objArgs.length; i++) {
        args.push(objArgs(i));
    }
    var st = new SrtTrim(args);
    var ret;
    try {
        ret = st.execute();
    } catch(e) {
        WScript.Echo(e.message);
        ret = -1;
    }
    WScript.Quit(ret);
})();