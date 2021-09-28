/* global oHta, $, aclib, Folder, File, DotNetBuilder */
$(function() {
    var global = new Function("return this")();

    var achta = {
        settings: null,
        backup: null,
        files: null,
        model: {
            ac: {
                path: {
                    temp: "folder",
                    avs2pipemod: "file",
                    tssplitter: "file",
                    ffprobe: "file",
                    dgindex: "file",
                    dgindexnv: "file",
                    dgindexim: "file",
                    tsparser: "file",
                    ts2aac: "file",
                    comskip: "file",
                    comskip_ini: "file",
                    logoguillo: "file",
                    logoguillo_avs: "file",
                    logoframe: "file",
                    chapterexe: "file",
                    joinlogoscp: "file",
                    joinlogoscp_avs: "file",
                    joinlogoscp_cmd: "file",
                    avspmod: "file",
                    avspmod_avs: "file",
                    caption2ass: "file",
                    autovfr: "file",
                    autovfr_avs: "file",
                    autovfr_ini: "file",
                    lsmuxer: "file",
                    lsremuxer: "file",
                    timelineeditor: "file",
                    mp4box: "file",
                    mkvmerge: "file"
                },
                command: {
                    tssplitter: "string",
                    dgindex: "string",
                    dgindexnv: "string",
                    dgindexim: "string",
                    comskip: "string",
                    logoguillo: "string",
                    logoframe: "string",
                    chapterexe: "string",
                    joinlogoscp: "string",
                    autovfr: "string"
                },
                settings: {
                    pause: "boolean",
                    window: "number"
                }
            },
            acutil: {
                path: {
                    output: "folder",
                    move: "folder",
                    rplsinfo: "file",
                    screname: "file"
                },
                args: {
                    avs: "string",
                    preset: "string"
                },
                params: {
                    reset: "boolean",
                    clean: "boolean",
                    onlytrim: "boolean",
                    tssplitter: "boolean",
                    ffprobe: "boolean",
                    source: "string",
                    demuxer: "string",
                    trim: "string",
                    edittrim: "boolean",
                    caption2ass: "boolean",
                    autovfr: "boolean",
                    eraselogo: "boolean",
                    editavs: "boolean"
                },
                macro: {
                    dir: "string",
                    file: "string"
                },
                settings: {
                    log: "boolean",
                    pause: "boolean",
                    move: "boolean",
                    programtxt: "boolean",
                    rplsinfo: "boolean",
                    screname: "boolean",
                    checkdrop: "boolean"
                }
            },
            config: {
                config: "string",
                content: {
                    contain: "string",
                    rep: "string",
                    dir: "string",
                    file: "string",
                    avs: "string",
                    preset: "string",
                    params: "object"
                }
            }
        },
        configList: {
            service: "サービス",
            title: "タイトル",
            content: "番組内容",
            genre: "ジャンル",
            start: "開始時刻",
            end: "終了時刻"
        },
        loadJSON: function(path) {
            var file = new File(path);
            var json = file.read();

            if (json === null) {
                // aclib.log("設定の読み込みに失敗しました [" + file.path() + "]");
                return null;
            }

            var obj;
            try {
                obj = JSON.parse(json);
            } catch (e) {
                // aclib.log("設定の読み込みに失敗しました [" + file.path() + "]");
                return null;
            }

            return obj;
        },
        saveJSON: function(path, value) {
            var file = new File(path);
            var json = JSON.stringify(value, null, "    ").replace(/\r\n|\r|\n/g, "\r\n");

            if (!file.write(json)) {
                aclib.log("設定の書き込みに失敗しました [" + file.path() + "]");
                return false;
            }

            return true;
        },
        loadSettings: function() {
            var settings = {};
            var parent = new Folder(aclib.path()).childFolder("settings");
            var flag = Object.keys(achta.model).every(function(key) {
                var file = parent.childFile(key + ".json");
                var obj = achta.loadJSON(file.path());
                if (obj === null) return false;
                settings[key] = obj;
                return true;
            });

            if (!flag) return false;

            achta.settings = settings;
            achta.backup = aclib.clone(settings);

            return true;
        },
        saveSettings: function() {
            var parent = new Folder(aclib.path()).childFolder("settings");
            var flag = Object.keys(achta.model).every(function(key) {
                var file = parent.childFile(key + ".json");
                return achta.saveJSON(file.path(), achta.settings[key]);
            });

            if (!flag) return false;

            achta.backup = aclib.clone(achta.settings);

            return true;
        },
        restoreSettings: function() {
            if (achta.backup === null) return false;

            achta.settings = aclib.clone(achta.backup);

            return true;
        },
        replaceSettings: function() {
            Object.keys(achta.model.ac.path).forEach(function(key) {
                var obj = achta.settings.ac.path;
                obj[key] = aclib.replace(obj[key], {path: aclib.path()});
            });

            Object.keys(achta.model.acutil.path).forEach(function(key) {
                var obj = achta.settings.acutil.path;
                obj[key] = aclib.replace(obj[key], {path: aclib.path()});
            });
        },
        scanFiles: function() {
            var files = {};

            Object.keys(achta.model.acutil.args).forEach(function(key) {
                var parent = new Folder(aclib.path()).childFolder(key);
                var ext;
                switch (key) {
                    case "avs":
                        ext = /\.avs$/;
                        break;
                    case "preset":
                        ext = /\.json$/;
                        break;
                    case "logo":
                        ext = /\.lgd$/;
                        break;
                }
                files[key] = parent.findFiles(ext).sort(function(a, b) {
                    return a.base() > b.base() ? 1 : -1;
                });
            });

            achta.files = files;
        },
        checkBuild: function() {
            var parent = new Folder(aclib.path()).childFolder("src").childFolder("cs");
            var dialog = parent.childFile("dialog.exe");
            var dragdrop = parent.childFile("dragdrop.dll");
            var dialog_src = parent.childFile("dialog.cs");
            var dragdrop_src = parent.childFile("dragdrop.cs");

            if (dialog.exists() && dragdrop.exists()) return true;

            alert("初回起動時のビルドを行います");

            var ans = confirm("dragdrop.dllを登録して、ドラッグ&ドロップを有効にしますか?");

            var builder = new DotNetBuilder({framework: 32});

            if (!builder.prepare()) {
                aclib.log("DotNetBuilderの初期化に失敗しました");
                return false;
            }

            if (!builder.build(dialog_src.path(), ["System.dll", "System.Windows.Forms.dll"])) {
                aclib.log("dialog.csのビルドに失敗しました");
                return false;
            }

            if (!builder.build(dragdrop_src.path(), ["System.dll", "System.Windows.Forms.dll", "System.Drawing.dll"], true, ans)) {
                aclib.log("dragdrop.csのビルドに失敗しました");
                return false;
            }

            return true;
        },
        createListItem: function(text, options) {
            return $("<li>", $.extend({
                text: text,
                tabindex: 0
            }, options || {}));
        },
        createOptionItem: function(text, options) {
            return $("<option>", $.extend({
                text: text
            }, options || {}));
        },
        getArguments: function() {
            var args = [];

            oHta.commandLine.replace(/"([^"]+)"|([^ ]+)/g, function(whole, p1, p2) {
                args.push(p1 || p2);
            });

            return args;
        },
        dialog: function(options) {
            options.callback = options.callback || function() {/* Nothing */};
            options.message = options.message || "";
            options.text = options.text || "";

            $("#dialog").show();
            $("#dialog_msg").text(options.message);
            $("#dialog_text").val(options.text);

            var ok = function() {
                $("#dialog").hide();
                $("#dialog_ok").off("click", ok);
                $("#dialog_cancel").off("click", cancel);

                if (options.type === 1) {
                    options.callback(true);
                } else if (options.type === 2) {
                    options.callback($("#dialog_text").val());
                } else {
                    options.callback();
                }
            };
            var cancel = function() {
                $("#dialog").hide();
                $("#dialog_ok").off("click", ok);
                $("#dialog_cancel").off("click", cancel);

                if (options.type === 1) {
                    options.callback(false);
                } else if (options.type === 2) {
                    options.callback(null);
                }
            };
            $("#dialog_ok").on("click", ok);
            $("#dialog_cancel").on("click", cancel);

            if (options.type === 1) {
                $("#dialog_text").hide();
                $("#dialog_cancel").show();
            } else if (options.type === 2) {
                $("#dialog_text").show();
                $("#dialog_cancel").show();
            } else {
                $("#dialog_text").hide();
                $("#dialog_cancel").hide();
            }
        }
    };

    global.achta = achta;
});
