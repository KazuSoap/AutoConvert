var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.joinlogoscp = function() {
        if (Object.keys(this.options.avs.trim).length !== 0) return true;

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

        var trim_obj = nsAC.getTrim(trim_script);
        if (Object.keys(trim_obj).length === 0) {
            aclib.log("Can't get trim.", 1);
            return false;
        }

        this.options.avs.trim = trim_obj;

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

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.comskip = function() {
        if (Object.keys(this.options.avs.trim).length !== 0) return true;

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

        var trim_obj = nsAC.getTrim(trim_script);
        if (Object.keys(trim_obj).length === 0) {
            aclib.log("Can't get trim.", 1);
            return false;
        }

        this.options.avs.trim = trim_obj;

        return true;
    };

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.logoguillo = function() {
        if (Object.keys(this.options.avs.trim).length !== 0) return true;

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

        var trim_obj = nsAC.getTrim(trim_script);
        if (Object.keys(trim_obj).length === 0) {
            aclib.log("Can't get trim.", 1);
            return false;
        }

        this.options.avs.trim = trim_obj;

        return true;
    };

    // -----------------------------------------------------------
}());
