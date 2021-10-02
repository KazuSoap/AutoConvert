(function() {
    var global = new Function("return this")();

    var shell = new ActiveXObject("WScript.Shell");
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var app = new ActiveXObject("shell.application");

    function DotNetBuilder(options) {
        options = options || {};
        this.init = false;
        this.path = "";
        this.framework = options.framework || null;
    }
    DotNetBuilder.prototype.prepare = function() {
        if (this.init) return true;
        var path;

        var dotnet = fso.BuildPath(fso.GetSpecialFolder(0).Path, "Microsoft.NET");
        if (!fso.FolderExists(dotnet)) return false;

        var framework = "";
        var fw = fso.BuildPath(dotnet, "Framework");
        var fw64 = fso.BuildPath(dotnet, "Framework64");
        switch(this.framework) {
            case 32:
                framework = fw;
                break;
            case 64:
                framework = fw64;
                break;
            default:
                if (fso.FolderExists(fw64)) {
                    framework = fw64;
                } else if (fso.FolderExists(fw)) {
                    framework = fw;
                } else {
                    return false;
                }
                break;
        }

        var sub = new Enumerator(fso.GetFolder(framework).SubFolders);
        for (; !sub.atEnd(); sub.moveNext()) {
            var item = sub.item();
            if (!fso.FileExists(fso.BuildPath(item, "vbc.exe"))) continue;
            if (!fso.FileExists(fso.BuildPath(item, "csc.exe"))) continue;
            if (!fso.FileExists(fso.BuildPath(item, "jsc.exe"))) continue;
            if (!fso.FileExists(fso.BuildPath(item, "RegAsm.exe"))) continue;
            path = item;
        }
        if (!path) return false;

        this.path = path;
        this.init = true;

        return true;
    };
    DotNetBuilder.prototype.build = function(path, references, islib, isreg) {
        if (!this.init) return false;
        path = fso.GetAbsolutePathName(path);
        islib = islib || false;
        isreg = isreg || false;
        var compiler;

        var dest = fso.BuildPath(fso.GetParentFolderName(path), fso.GetBaseName(path) + (islib ? ".dll" : ".exe"));
        var ext = fso.GetExtensionName(path);

        //if (fso.FileExists(dest)) return true;
        if (!fso.FileExists(path)) return false;

        if (ext === "vb") {
            compiler = "vbc.exe";
        } else if (ext === "cs") {
            compiler = "csc.exe";
        } else if (ext === "js") {
            compiler = "jsc.exe";
        } else {
            return false;
        }
        compiler = fso.BuildPath(this.path, compiler);

        shell.Run('cmd /c ""' + compiler + '" /target:' + (islib ? 'library' : 'winexe') + ' /reference:' + references.join(";") + ' /out:"' + dest + '" "' + path + '""', 1, true);
        if (!fso.FileExists(dest)) return false;

        if (isreg) {
            var regasm = fso.BuildPath(this.path, "RegAsm.exe");
            app.ShellExecute(regasm, '"' + dest + '" /codebase', "", "RunAs", 1);
        }

        return true;
    };

    global.DotNetBuilder = DotNetBuilder;
})();
