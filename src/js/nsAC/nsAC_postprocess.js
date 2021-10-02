var nsAC = nsAC || {};

(function() {
    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.move = function() {
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

    // -----------------------------------------------------------
    nsAC.AutoConvert.prototype.clean = function() {
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

    // -----------------------------------------------------------
}());
