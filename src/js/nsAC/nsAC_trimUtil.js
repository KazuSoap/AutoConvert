var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.getTrim = function(str) {
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

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.readTrim = function() {
        var input = new File(this.args.input);
        var trim_json = input.parent().childFile(input.base() + ".trim_" + this.params.source + ".json");

        if (!trim_json.exists()) return true;

        // Remove
        // if (this.params.onlytrim && !this.params.edittrim) {
        //     if (!trim_json.remove()) {
        //         aclib.log("Can't delete file. [" + trim_json.path() + "]", 1);
        //         return false;
        //     }
        //     return true;
        // }

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

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.writeTrim = function() {
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

    // -----------------------------------------------------------
}());
