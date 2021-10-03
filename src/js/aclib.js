/* eslint quotes: "off" */
/* global oHta, WScript, ActiveXObject, GetObject, Enumerator, GetObjectHelper */
(function() {
    var global = new Function("return this")();
    var isScript = typeof window === "undefined";

    var createAdo = function() {
        if (isScript) {
            return new ActiveXObject("ADODB.Stream");
        } else {
            var obj = null;

            var _GetObject = (typeof GetObject === "function") ? GetObject : (function() {
                var script = window.document.createElement("script");
                script.setAttribute("language", "VBScript");
                script.innerHTML = "Function GetObjectHelper(name)\nSet GetObjectHelper = GetObject(name)\nEnd Function";
                window.document.body.appendChild(script);
                return function(name) {
                    return GetObjectHelper(name);
                };
            })();

            try {
                var temp = fso.BuildPath(fso.GetSpecialFolder(2), fso.GetTempName() + ".wsc");
                var otf = fso.OpenTextFile(temp, 2, true);
                otf.Write('<?XML version="1.0"?><package><component id="activexHelper"><public><method name="_ActiveXObject"/></public><script language="JScript">function _ActiveXObject(name){return new ActiveXObject(name)}</script></component></package>');
                otf.Close();
                obj = _GetObject("script:" + temp)._ActiveXObject("ADODB.Stream");
                fso.DeleteFile(temp, true);
            } catch (err) {
                alert("Error: Can not create ADOOB.Stream object." + err);
            }

            return obj;
        }
    };

    var shell = new ActiveXObject("WScript.Shell");
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var ado = createAdo();
    var wmi = new ActiveXObject("WbemScripting.SWbemLocator").ConnectServer();

    /*
    var pid = (function() {
        var pid = -1;
        var process = shell.Exec('mshta.exe "javascript:while(1)"');
        var objSet = wmi.ExecQuery('Select * from Win32_Process Where ProcessId = "' + process.ProcessId + '"');
        var enumObjSet = new Enumerator(objSet);

        for (; !enumObjSet.atEnd(); enumObjSet.moveNext()) {
            var item = enumObjSet.item();
            pid = item.ParentProcessId;
            item.Terminate();
        }

        return pid;
    })();
    */

    var log = function(message, level) {
        level = level || 0;

        if (level === 1) {
            message = "Error: " + message;
        } else if (level === 2) {
            message = "Debug: " + message;
        }

        if (isScript) {
            WScript.Echo(message);
        } else {
            alert(message);
        }
    };

    var aclib = {
        shell: shell,
        fso: fso,
        ado: ado,
        wmi: wmi,
        log: log,
        clone: function(obj) {
            var clone = Object.prototype.toString.call(obj) === "[object Array]" ? [] : {};

            for (var key in obj) {
                var prop = obj[key];

                if (typeof prop === "object") {
                    if (Array.isArray(prop)) {
                        clone[key] = [];

                        for (var i = 0; i < prop.length; i++) {
                            if (typeof prop[i] !== "object") {
                                clone[key].push(prop[i]);
                            } else {
                                clone[key].push(aclib.clone(prop[i]));
                            }
                        }
                    } else {
                        clone[key] = aclib.clone(prop);
                    }
                } else {
                    clone[key] = prop;
                }
            }
            return clone;
        },
        escape: function(path, flag) {
            return path.replace(flag ? /([/\?\*:\|"<>\\])/g : /([/\?\*:\|"<>])/g, aclib.toFull);
        },
        replace: function(str, obj) {
            for (var key in obj) {
                var reg;

                try {
                    reg = new RegExp("\\${" + key + "}", "g");
                } catch (e) {
                    continue;
                }

                str = str.replace(reg, obj[key]);
            }

            return str;
        },
        toHalf: function(str) {
            return str.replace(/[\uff01-\uff5e]/g, function(s) {
                return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
            }).split("\u3000").join(" ");
        },
        toFull: function(str) {
            return str.replace(/[\!-\~]/g, function(s) {
                return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);
            }).split(" ").join("\u3000");
        },
        browse: function(options) {
            options = options || {};

            var args = "";

            if (options.folder) args += ' -folder';
            if (options.multi) args += ' -multi';
            if (options.save) args += ' -save';
            if (options.dest) args += ' -dest "' + options.dest + '"';
            if (options.filter) args += ' -filter "' + options.filter + '"';

            var exec = shell.Exec('"' + aclib.path() + '\\src\\cs\\dialog.exe"' + args);
            var line = exec.StdOut.ReadLine();

            if (line === "") return [];

            return line.split("\t");
        },
        crc32: (function() {
            var crcTable = new Array(256);

            for (var i = 0; i < crcTable.length; i++) {
                var value = i;

                for (var j = 0; j < 8; j++) {
                    value = (value & 1) ? (0xEDB88320 ^ (value >>> 1)) : value >>> 1;
                }

                crcTable[i] = value;
            }

            return function(array) {
                var crc = -1;

                for (var k = 0; k < array.length; k++) {
                    var index = (crc ^ array[k]) & 0xFF;
                    crc = crcTable[index] ^ (crc >>> 8);
                }

                return (crc ^ -1) >>> 0;
            };
        })(),
        args: function() {
            var args = [];

            if (isScript) {
                var objArgs = WScript.Arguments;

                for (var i = 0; i < objArgs.length; i++) {
                    args.push(objArgs(i));
                }
            } else {
                var command = oHta.commandLine;

                command.replace(/"([^"]+)"|([^ ]+)/g, function(p0, p1, p2) {
                    args.push(p2 === void(0) ? p1 : p2);
                });
            }

            return args;
        },
        path: function() {
            return fso.GetParentFolderName(fso.GetParentFolderName(isScript ? WScript.ScriptFullName : aclib.args()[0]));
        }
    };

    function Process() {
        this.initialize.apply(this, arguments);
    }

    Process.prototype = {
        initialize: function(args) {
            this.command = args;
            this.options = {
                window: 0,
                stdout: false,
                debug: false,
                charset: "Shift-JIS"
            };
        },
        prepare: function(args, options) {
            for (var key in args) {
                var reg;

                try {
                    reg = new RegExp("\\${" + key + "}", "g");
                } catch (err) {
                    continue;
                }

                this.command = this.command.replace(reg, args[key]);
            }

            if (options) {
                for (var key in options) {
                    this.options[key] = options[key];
                }
            }
        },
        run: function() {
            var list, stdout;

            if (this.options.stdout) {
                stdout = new Folder("Temporary").childFile(Math.random().toString(36).slice(2));
            } else {
                list = Array.prototype.slice.call(arguments);
                list.push(-1073741510);
            }

            var ret = shell.Run(
                'cmd.exe /c "' + this.command +
                (this.options.stdout ? '>"' + stdout.path() + '"' : this.options.debug ? '&pause' : '') + '"',
                this.options.window, true);

            if (this.options.stdout) {
                var read = stdout.read(this.options.charset);
                // alert(this.options.encode + "\n--------------\n" +
                //       this.command + "\n--------------\n" +
                //       read + "\n--------------\n");

                stdout.remove();

                return {
                    exitcode: ret,
                    stdout: read
                };
            } else {
                for (var i = 0; i < list.length; i++) {
                    if (ret === list[i]) return false;
                }

                return true;
            }
        },
        exec: function() {
            var objExec = shell.Exec(this.command);

            return objExec;
        },
        helper: function() {
            var exechelper = new Folder(aclib.path()).childFolder("src").childFolder("lib").childFile("exechelper.js");
            var objExec = shell.Exec('wscript.exe //nologo "' + exechelper.path() + '" ' + this.command + ' ' + this.options.window);
            var line = parseInt(objExec.StdErr.ReadLine(), 10);

            return {
                getStatus: function() {
                    return objExec.Status;
                },
                getExitCode: function() {
                    return parseInt(objExec.StdErr.ReadLine(), 10);
                },
                terminate: function() {
                    var objSet = wmi.ExecQuery('Select * from Win32_Process Where ProcessId = "' + line + '"');
                    var enumObjSet = new Enumerator(objSet);

                    for (var i = 0; !enumObjSet.atEnd(); enumObjSet.moveNext()) {
                        var item = enumObjSet.item();
                        item.Terminate();
                    }

                    if (i === 0) return false;

                    return true;
                }
            };
        }
    };

    function File() {
        this.initialize.apply(this, arguments);
    }
    File.prototype = {
        initialize: function(args) {
            this._path = args === "" ? args : fso.GetAbsolutePathName(args);
        },
        exists: function() {
            return fso.FileExists(this._path);
        },
        copy: function(dest, overwrite) {
            try {
                fso.CopyFile(this._path, dest, !!overwrite);
            } catch (err) {
                //log("Error: Copy source[" + this._path + "], destination[" + dest + "].");
                return false;
            }

            return true;
        },
        move: function(dest) {
            try {
                fso.MoveFile(this._path, dest);
            } catch (err) {
                //log("Error: Move source[" + this._path + "], destination[" + dest + "].");
                return false;
            }

            return true;
        },
        make: function(overwrite, unicode) {
            try {
                fso.CreateTextFile(this._path, !!overwrite, !!unicode);
            } catch (err) {
                //log("Error: Create filename[" + this._path + "].");
                return false;
            }

            return true;
        },
        remove: function(force) {
            try {
                fso.DeleteFile(this._path, !!force);
            } catch (err) {
                //log("Error: Delete filespec[" + this._path + "].");
                return false;
            }

            return true;
        },
        read: function(charset) {
            var str;
            if (!charset) charset = "UTF-8";
            try {
                ado.Type = 2;
                ado.Charset = charset;
                ado.Open();
                ado.LoadFromFile(this._path);
                str = ado.ReadText();
                ado.Close();
            } catch (err) {
                //log("Error: Read filename[" + this._path + "].");
                ado = createAdo();
                aclib.ado = ado;

                return null;
            }

            return str;
        },
        write: function(str, charset) {
            if (!charset) charset = "UTF-8";
            try {
                ado.Type = 2;
                ado.Charset = charset;
                ado.Open();
                ado.WriteText(str);
                if (charset === "UTF-8") {
                    ado.Position = 0;
                    ado.Type = 1;
                    ado.Position = 3;
                    var binary = ado.Read();
                    ado.Close();
                    ado.Open();
                    ado.Write(binary);
                }
                ado.SaveToFile(this._path, 2);
                ado.Close();
            } catch (err) {
                //log("Error: Write filename[" + this._path + "]."+err);
                ado = createAdo();
                aclib.ado = ado;

                return false;
            }

            return true;
        },
        parent: function() {
            return new Folder(fso.GetParentFolderName(this._path));
        },
        path: function() {
            return this._path;
        },
        name: function() {
            return fso.GetFileName(this._path);
        },
        base: function() {
            return fso.GetBaseName(this._path);
        },
        ext: function() {
            return fso.GetExtensionName(this._path);
        },
        size: function() {
            var fo;

            try {
                fo = fso.GetFile(this._path);
            } catch (err) {
                return -1;
            }

            return fo.Size;
        },
        created: function() {
            var fo;

            try {
                fo = fso.GetFile(this._path);
            } catch (err) {
                return "";
            }

            return fo.DateCreated;
        },
        lastAccessed: function() {
            var fo;

            try {
                fo = fso.GetFile(this._path);
            } catch (err) {
                return "";
            }

            return fo.DateLastAccessed;
        },
        lastModified: function() {
            var fo;

            try {
                fo = fso.GetFile(this._path);
            } catch (err) {
                return "";
            }

            return fo.DateLastModified;
        }
    };

    function Folder() {
        this.initialize.apply(this, arguments);
    }

    Folder.prototype = {
        initialize: function(args) {
            switch (args) {
                case "":
                    this._path = args;
                    break;
                case "Windows":
                    this._path = fso.GetSpecialFolder(0);
                    break;
                case "System":
                    this._path = fso.GetSpecialFolder(1);
                    break;
                case "Temporary":
                    this._path = fso.GetSpecialFolder(2);
                    break;
                default:
                    this._path = fso.GetAbsolutePathName(args);
                    break;
            }
        },
        exists: function() {
            return fso.FolderExists(this._path);
        },
        copy: function(dest, overwrite) {
            try {
                fso.CopyFolder(this._path, dest, !!overwrite);
            } catch (err) {
                //log("Error: Copy source[" + this._path + "], destination[" + dest + "].");
                return false;
            }

            return true;
        },
        move: function(dest) {
            try {
                fso.MoveFolder(this._path, dest);
            } catch (err) {
                //log("Error: Move source[" + this._path + "], destination[" + dest + "].");
                return false;
            }

            return true;
        },
        make: function() {
            try {
                fso.CreateFolder(this._path);
            } catch (err) {
                //log("Error: Create foldername[" + this._path + "].");
                return false;
            }

            return true;
        },
        remove: function(force) {
            try {
                fso.DeleteFolder(this._path, !!force);
            } catch (err) {
                //log("Error: Delete folderspec[" + this._path + "].");
                return false;
            }

            return true;
        },
        parent: function() {
            return new Folder(fso.GetParentFolderName(this._path));
        },
        path: function() {
            return this._path;
        },
        name: function() {
            return fso.GetFileName(this._path);
        },
        size: function() {
            var fo;

            try {
                fo = fso.GetFolder(this._path);
            } catch (err) {
                return -1;
            }

            return fo.Size;
        },
        created: function() {
            var fo;

            try {
                fo = fso.GetFolder(this._path);
            } catch (err) {
                return "";
            }

            return fo.DateCreated;
        },
        lastAccessed: function() {
            var fo;

            try {
                fo = fso.GetFolder(this._path);
            } catch (err) {
                return "";
            }

            return fo.DateLastAccessed;
        },
        lastModified: function() {
            var fo;

            try {
                fo = fso.GetFolder(this._path);
            } catch (err) {
                return "";
            }

            return fo.DateLastModified;
        },
        childFile: function(name) {
            return new File(fso.BuildPath(this._path, name));
        },
        childFolder: function(name) {
            return new Folder(fso.BuildPath(this._path, name));
        },
        childFiles: function() {
            return this.findFiles(/.*/);
        },
        childFolders: function() {
            return this.findFolders(/.*/);
        },
        findFiles: function(reg) {
            if (Object.prototype.toString.call(reg) !== "[object RegExp]") {
                reg = new RegExp(reg);
            }

            var fo, files = [];

            try {
                fo = fso.GetFolder(this._path);
            } catch (err) {
                //log("Error: Find folderspec[" + this._path + "].");
                return files;
            }

            for (var e = new Enumerator(fo.Files); !e.atEnd(); e.moveNext()) {
                if (reg.test(e.item())) {
                    files.push(new File(e.item().Path));
                }
            }

            return files;
        },
        findFolders: function(reg) {
            if (Object.prototype.toString.call(reg) !== "[object RegExp]") {
                reg = new RegExp(reg);
            }

            var fo, folders = [];

            try {
                fo = fso.GetFolder(this._path);
            } catch (err) {
                //log("Error: Find folderspec[" + this._path + "].");
                return folders;
            }

            for (var e = new Enumerator(fo.SubFolders); !e.atEnd(); e.moveNext()) {
                if (reg.test(e.item())) {
                    folders.push(new Folder(e.item().Path));
                }
            }

            return folders;
        }
    };

    global.aclib = aclib;
    global.Process = Process;
    global.File = File;
    global.Folder = Folder;
})();
