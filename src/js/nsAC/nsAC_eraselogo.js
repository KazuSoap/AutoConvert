var nsAC = nsAC || {};

(function() {
    nsAC.AutoConvert.prototype.eraselogo = function() {
        var input = new File(this.args.input);
        var avs = new File(this.options.temp + ".avs");
        var eraselogo_json = input.parent().childFile(input.base() + ".eraselogo_" + this.params.source + ".json");

        var eraselogo_str;
        if (eraselogo_json.exists()) {
            var eraselogo_out;

            eraselogo_out = eraselogo_json.read("UTF-8");

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
                // return aclib.replace('EraseLOGO_("${logofile}", start=${start}, fadein=${fadein}, fadeout=${fadeout}, ' +
                //                      'fieldin=${fieldin}, fieldout=${fieldout}, end=${end}, interlaced=true)', value);
                return aclib.replace('ExtErsLOGO("${logofile}", start=${start}, fadein=${fadein}, fadeout=${fadeout}, ' +
                                     'itype_s=${fieldin}, itype_e=${fieldout}, end=${end})', value);
            }, this).join("\r\n");
        } else {
            eraselogo_str = 'EraseLOGO_("' + this.args.logo + '.lgd", interlaced=true)';
        }

        // Read
        var script = avs.read("UTF-8");

        if (script === null) {
            aclib.log("Can't read file. [" + avs.path() + "]", 1);
            return false;
        }

        // Replace
        script = script.replace(/#__eraselogo__/g, eraselogo_str);

        if (!avs.write(script, "UTF-8")) {
            aclib.log("Can't write file. [" + avs.path() + "]", 1);
            return false;
        }

        return true;
    };
}());
