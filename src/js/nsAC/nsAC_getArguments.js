var nsAC = nsAC || {};

(function() {
    nsAC.AutoConvert.prototype.getArguments = function() {
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

                file.write(JSON.stringify(log), "UTF-8");
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
                case "-multi2decdos":
                    this.params.multi2decdos = true;
                    break;
                case "-source":
                    if (!checkNextArgument(i, ["lssource", "dgindex"])) return false;
                    this.params.source = args[++i];
                    break;
                case "-demuxer":
                    if (!checkNextArgument(i, ["none", "tsparser", "ts2aac"])) return false;
                    this.params.demuxer = args[++i];
                    break;
                case "-trim":
                    if (!checkNextArgument(i, ["none", "joinlogoscp"])) return false;
                    this.params.trim = args[++i];
                    break;
                case "-edittrim":
                    this.params.edittrim = true;
                    break;
                case "-deint":
                    if (!checkNextArgument(i, ["kfm_24p", "kfm_vfr"])) return false;
                    this.params.deint = args[++i];
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
}());
