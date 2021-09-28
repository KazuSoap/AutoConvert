/* global $, aclib, Folder, File, achta */
$(function() {
    // Define Functions
    var change = (function() {
        var changed = false;

        return function(value) {
            if (value === void(0)) return changed;
            if (value === changed) return void 0;

            changed = !!value;
            $("#save").prop("disabled", !value);
            $("#reset").prop("disabled", !value);

            return void 0;
        };
    })();

    var resetViews = function() {
        // AutoConvert path
        Object.keys(achta.model.ac.path).forEach(function(key) {
            $("#ac_path_" + key).val(achta.settings.ac.path[key]);
        });

        // AutoConvert command
        Object.keys(achta.model.ac.command).forEach(function(key) {
            $("#ac_command_" + key).val(achta.settings.ac.command[key]);
        });

        // AutoConvert settings
        $("#ac_settings_pause").prop("checked", achta.settings.ac.settings.pause);
        $("input[name=ac_settings_window]").val([achta.settings.ac.settings.window]);

        // AutoConvertUtility path
        Object.keys(achta.model.acutil.path).forEach(function(key) {
            $("#acutil_path_" + key).val(achta.settings.acutil.path[key]);
        });

        // AutoConvertUtility macro
        Object.keys(achta.model.acutil.macro).forEach(function(key) {
            $("#acutil_macro_" + key).val(achta.settings.acutil.macro[key]);
        });

        // AutoConvertUtility settings
        Object.keys(achta.model.acutil.settings).forEach(function(key) {
            $("#acutil_settings_" + key).prop("checked", achta.settings.acutil.settings[key]);
        });

        // AutoConvertUtility params
        Object.keys(achta.model.acutil.args).forEach(function(key) {
            $("#acutil_params_" + key).val(achta.settings.acutil.args[key]);
        });

        Object.keys(achta.model.acutil.params).forEach(function(key) {
            if (achta.model.acutil.params[key] === "string") {
                $("[name=acutil_params_" + key + "]").val([achta.settings.acutil.params[key]]);
            } else {
                $("#acutil_params_" + key).prop("checked", achta.settings.acutil.params[key]);
            }
        });

        // Config
        $("#config_list_parent").list("empty");
        achta.settings.config.forEach(function(value) {
            $("#config_list_parent").list("add", achta.createListItem(achta.configList[value.config]));
        });
    };

    var resetFiles = function() {
        // AutoConvertUtility params & config
        Object.keys(achta.model.acutil.args).forEach(function(key) {
            var select = $("#acutil_params_" + key + ", #config_" + key);

            select.children().remove();

            achta.files[key].forEach(function(value) {
                select.append(achta.createOptionItem(value.base()));
            });

            $("#acutil_params_" + key).val(achta.settings.acutil.args[key]);
            $("#config_" + key).val("");
        });

        // Preset
        var list_prev = $("#preset_list").children().map(function(index, elem) {
            return $(elem).text();
        }).get();

        var list_next = achta.files.preset.map(function(value) {
            return value.base();
        });

        [list_prev, list_next].reduce(function(prev, value) {
            value.forEach(function(value2) {
                if (prev.indexOf(value2) === -1) prev.push(value2);
            });

            return prev;
        }, []).sort().reduce(function(prev, value, index) {
            if (list_prev.indexOf(value) === -1) {
                $("#preset_list").list("add", achta.createListItem(value), index + prev);
            }
            if (list_next.indexOf(value) === -1) {
                $("#preset_list").list("remove", index + prev--);
            }

            return prev;
        }, 0);
    };

    // Events
    // Menu
    $("ul#menu li a").click(function(event) {
        var elem = $(event.currentTarget);
        var id = elem.attr("id").replace("menu_", "");

        // Hide
        $("#menu .active").removeClass("active");
        $("#wrap > div:visible").hide();

        // Show
        elem.addClass("active");
        $("#content_" + id).show();
        $("h1").text(elem.text());

        // Buttons
        $("#save").toggle(id !== "preset");
        $("#reset").toggle(id !== "preset");
    });

    // AutoConvert
    // AutoConvert path
    Object.keys(achta.model.ac.path).forEach(function(key) {
        $("#ac_path_" + key).change(function(event) {
            var elem = $(event.currentTarget);
            var obj = achta.settings.ac.path;
            var replaced = elem.val().split(aclib.path()).join("${path}");

            elem.val(replaced);
            obj[key] = replaced;
            change(true);
        });

        $("#ac_path_" + key + "_browse").click(function(event) {
            var elem = $(event.currentTarget).prev();
            var obj = achta.settings.ac.path;
            var folder = achta.model.ac.path[key] === "folder";
            var dest = obj[key].split("${path}").join(aclib.path());

            var path = aclib.browse({
                dest: folder ? dest : new File(dest).parent().path(),
                folder: folder
            });

            if (path.length === 0) return;

            elem.val(path[0]);
            elem.change();
        });
    });

    // AutoConvert command
    Object.keys(achta.model.ac.command).forEach(function(key) {
        $("#ac_command_" + key).change(function(event) {
            var elem = $(event.currentTarget);
            var obj = achta.settings.ac.command;

            obj[key] = elem.val();
            change(true);
        });
    });

    // AutoConvert settings
    $("#ac_settings_pause").click(function(event) {
        var elem = $(event.currentTarget);
        var obj = achta.settings.ac.settings;

        obj.pause = elem.prop("checked");
        change(true);
    });

    $("[name=ac_settings_window]").click(function(event) {
        var elem = $(event.currentTarget);
        var obj = achta.settings.ac.settings;

        obj.window = parseInt(elem.val(), 10);
        change(true);
    });

    // AutoConvertUtility
    // AutoConvertUtility path
    Object.keys(achta.model.acutil.path).forEach(function(key) {
        $("#acutil_path_" + key).change(function(event) {
            var elem = $(event.currentTarget);
            var obj = achta.settings.acutil.path;
            var replaced = elem.val().split(aclib.path()).join("${path}");

            elem.val(replaced);
            obj[key] = replaced;
            change(true);
        });

        $("#acutil_path_" + key + "_browse").click(function(event) {
            var elem = $(event.currentTarget).prev();
            var obj = achta.settings.acutil.path;
            var folder = achta.model.acutil.path[key] === "folder";
            var dest = obj[key].split("${path}").join(aclib.path());

            var path = aclib.browse({
                dest: folder ? dest : new File(dest).parent().path(),
                folder: folder
            });

            if (path.length === 0) return;

            elem.val(path[0]);
            elem.change();
        });
    });

    // AutoConvertUtility macro
    Object.keys(achta.model.acutil.macro).forEach(function(key) {
        $("#acutil_macro_" + key).change(function(event) {
            var elem = $(event.currentTarget);
            var obj = achta.settings.acutil.macro;

            obj[key] = elem.val();
            change(true);
        });
    });

    // AutoConvertUtility settings
    Object.keys(achta.model.acutil.settings).forEach(function(key) {
        $("#acutil_settings_" + key).change(function(event) {
            var elem = $(event.currentTarget);
            var obj = achta.settings.acutil.settings;

            obj[key] = elem.prop("checked");
            change(true);
        });
    });

    // AutoConvertUtility params
    Object.keys(achta.model.acutil.args).forEach(function(key) {
        $("#acutil_params_" + key).change(function(event) {
            var elem = $(event.currentTarget);
            var obj = achta.settings.acutil.args;

            obj[key] = elem.val();
            change(true);
        });
    });

    Object.keys(achta.model.acutil.params).forEach(function(key) {
        if (achta.model.acutil.params[key] === "string") {
            $("[name=acutil_params_" + key + "]").change(function() {
                var elem = $("[name=acutil_params_" + key + "]");
                var obj = achta.settings.acutil.params;

                obj[key] = elem.filter(":checked").val();
                change(true);
            });
        } else {
            $("#acutil_params_" + key).change(function(event) {
                var elem = $(event.currentTarget);
                var obj = achta.settings.acutil.params;

                obj[key] = elem.prop("checked");
                change(true);
            });
        }
    });

    // Config
    // Config parent
    $("#config_list_parent").list({
        multiselectable: false,
        multiselectOnKey: false,
        selected: function(event, target) {
            var list = $("#config_list_parent");
            var target_index = list.list("index", target.index());
            var child_list = $("#config_list_child");

            var obj = achta.settings.config[target_index];

            // Active
            $("#config_list_parent_add_" + obj.config).addClass("active");

            // List
            obj.content.forEach(function(value) {
                child_list.list("add", achta.createListItem(value.contain));
            });

            // Icon
            $("#config_list_parent_add").removeClass("icon-add")
                                        .addClass("icon-edit")
                                        .prop("title", "編集");
        },
        unselected: function() {
            var child_list = $("#config_list_child");

            // Active
            $("#config_list_parent_add + ul a").removeClass("active");

            // List
            child_list.list("empty");

            // Icon
            $("#config_list_parent_add").removeClass("icon-edit")
                                        .addClass("icon-add")
                                        .prop("title", "追加");
        },
        observing: function(oldIndex, newIndex) {
            var obj = achta.settings.config;

            obj.splice(newIndex, 0, obj.splice(oldIndex, 1)[0]);
            change(true);
        }
    });

    $("#config_list_parent_add + ul a").mousedown(function(event) {
        var elem = $(event.currentTarget);
        var id = elem.attr("id").replace("config_list_parent_add_", "");
        var text = achta.configList[id];

        var list = $("#config_list_parent");
        var selected = list.list("selectedItems");
        var selected_index = list.list("index", selected.index());

        var obj = achta.settings.config;

        if (selected.size()) {
            obj[selected_index].config = id;

            selected.text(text);

            $("#config_list_parent_add + ul a").removeClass("active");

            elem.addClass("active");
        } else {
            obj.push({
                "config": id,
                "content": []
            });

            list.list("add", achta.createListItem(text));
            list.list("select", obj.length - 1);
        }

        change(true);
    });

    $("#config_list_parent_remove").click(function() {
        var list = $("#config_list_parent");
        var selected = list.list("selectedItems");
        var selected_index = list.list("index", selected.index());

        if (!selected.size()) return;

        var obj = achta.settings.config;

        obj.splice(selected_index, 1);
        list.list("remove", selected_index);
        change(true);
    });

    $("#config_list_parent_up").click(function() {
        var list = $("#config_list_parent");

        list.list("shiftUp");
    });

    $("#config_list_parent_down").click(function() {
        var list = $("#config_list_parent");

        list.list("shiftDown");
    });

    // Config child
    $("#config_list_child").list({
        multiselectable: false,
        multiselectOnKey: false,
        selected: function(event, target) {
            var parent_list = $("#config_list_parent");
            var parent_selected = parent_list.list("selectedItems");
            var parent_selected_index = parent_list.list("index", parent_selected.index());

            var list = $("#config_list_child");
            var target_index = list.list("index", target.index());

            var obj = achta.settings.config[parent_selected_index].content[target_index];

            Object.keys(achta.model.config.content).forEach(function(key) {
                var exists = key in obj;
                switch (key) {
                    case "contain":
                        $("#config_" + key).val(obj[key]);
                        break;
                    case "rep":
                    case "dir":
                    case "file":
                    case "avs":
                    case "preset":
                        $("#config_" + key + "_check").prop("checked", exists);
                        $("#config_" + key).val(exists ? obj[key] : "").prop("disabled", !exists);
                        break;
                    case "params":
                        var obj2 = obj[key];
                        Object.keys(achta.model.acutil.params).forEach(function(key2) {
                            var exists2 = key2 in obj2;

                            if (achta.model.acutil.params[key2] === "string") {
                                $("[name=config_" + key2 + "]").val([exists2 ? obj2[key2] : ""]);
                            } else {
                                $("#config_" + key2).prop("checked", exists2 && obj2[key2])
                                                    .toggleClass("indeterminate", !exists2);
                            }
                        });
                        break;
                }
            });

            // Icon
            $("#config_list_child_add").removeClass("icon-add")
                                       .addClass("icon-copy")
                                       .prop("title", "コピー");
        },
        unselected: function() {
            Object.keys(achta.model.config.content).forEach(function(key) {
                switch (key) {
                    case "contain":
                        $("#config_" + key).val("");
                        break;
                    case "rep":
                    case "dir":
                    case "file":
                    case "avs":
                    case "preset":
                        $("#config_" + key + "_check").prop("checked", false);
                        $("#config_" + key).val("").prop("disabled", true);
                        break;
                    case "params":
                        Object.keys(achta.model.acutil.params).forEach(function(key2) {
                            if (achta.model.acutil.params[key2] === "string") {
                                $("[name=config_" + key2 + "]").val([""]);
                            } else {
                                $("#config_" + key2).prop("checked", false)
                                                    .toggleClass("indeterminate", true);
                            }
                        });
                        break;
                }
            });

            // Icon
            $("#config_list_child_add").removeClass("icon-copy")
                                       .addClass("icon-add")
                                       .prop("title", "追加");
        },
        observing: function(oldIndex, newIndex) {
            var list = $("#config_list_parent");
            var selected = list.list("selectedItems");
            var selected_index = list.list("index", selected.index());
            var obj = achta.settings.config[selected_index].content;

            obj.splice(newIndex, 0, obj.splice(oldIndex, 1)[0]);
            change(true);
        }
    });

    $("#config_list_child_add").click(function() {
        var parent_list = $("#config_list_parent");
        var parent_selected = parent_list.list("selectedItems");
        var parent_selected_index = parent_list.list("index", parent_selected.index());
        if (!parent_selected.size()) return;

        var list = $("#config_list_child");
        var selected = list.list("selectedItems");
        var selected_index = list.list("index", selected.index());

        var obj = achta.settings.config[parent_selected_index].content;

        if (selected.size()) {
            obj.splice(selected_index + 1, 0, aclib.clone(obj[selected_index]));
            list.list("add", achta.createListItem(obj[selected_index].contain), selected_index + 1);
            list.list("select", selected.index() + 1);
        } else {
            if (!$("#config_contain").val()) {
                achta.dialog({message: "含まれる文字列がありません"});
                return;
            }
            var item = {};
            Object.keys(achta.model.config.content).forEach(function(key) {
                switch (key) {
                    case "contain":
                        item[key] = $("#config_" + key).val();
                        break;
                    case "rep":
                    case "dir":
                    case "file":
                    case "avs":
                    case "preset":
                        if (!$("#config_" + key + "_check").prop("checked")) break;
                        item[key] = $("#config_" + key).val();
                        break;
                    case "params":
                        var obj2 = item.params = {};
                        Object.keys(achta.model.acutil.params).forEach(function(key2) {
                            if (achta.model.acutil.params[key2] === "string") {
                                obj2[key2] = $("[name=config_" + key2 + "]:checked").val();
                            } else {
                                if ($("#config_" + key2).hasClass("indeterminate")) return;
                                obj2[key2] = $("#config_" + key2).prop("checked");
                            }
                        });
                        break;
                }
            });

            obj.push(item);

            list.list("add", achta.createListItem(item.contain));
            list.list("select", obj.length - 1, true);
        }
        change(true);
    });

    $("#config_list_child_remove").click(function() {
        var parent_list = $("#config_list_parent");
        var parent_selected = parent_list.list("selectedItems");
        var parent_selected_index = parent_list.list("index", parent_selected.index());

        if (!parent_selected.size()) return;

        var list = $("#config_list_child");
        var selected = list.list("selectedItems");
        var selected_index = list.list("index", selected.index());

        if (!selected.size()) return;

        var obj = achta.settings.config[parent_selected_index].content;

        list.list("remove", selected_index);
        obj.splice(selected_index, 1);
        change(true);
    });

    $("#config_list_child_up").click(function() {
        var list = $("#config_list_child");

        list.list("shiftUp");
    });

    $("#config_list_child_down").click(function() {
        var list = $("#config_list_child");

        list.list("shiftDown");
    });

    Object.keys(achta.model.config.content).forEach(function(key) {
        switch (key) {
            case "contain":
                $("#config_" + key).change(function(event) {
                    var elem = $(event.currentTarget);

                    var parent_list = $("#config_list_parent");
                    var parent_selected = parent_list.list("selectedItems");
                    var parent_selected_index = parent_list.list("index", parent_selected.index());

                    if (!parent_selected.size()) return;

                    var list = $("#config_list_child");
                    var selected = list.list("selectedItems");
                    var selected_index = list.list("index", selected.index());

                    if (!selected.size()) return;

                    var obj = achta.settings.config[parent_selected_index].content[selected_index];

                    if (!elem.val()) {
                        achta.dialog({message: "含まれる文字列がありません"});
                        elem.val(obj[key]);
                        return;
                    }
                    selected.text(elem.val());
                    obj[key] = elem.val();
                    change(true);
                });
                break;
            case "rep":
            case "dir":
            case "file":
            case "avs":
            case "preset":
                $("#config_" + key).change(function(event) {
                    var elem = $(event.currentTarget);

                    var parent_list = $("#config_list_parent");
                    var parent_selected = parent_list.list("selectedItems");
                    var parent_selected_index = parent_list.list("index", parent_selected.index());

                    if (!parent_selected.size()) return;

                    var list = $("#config_list_child");
                    var selected = list.list("selectedItems");
                    var selected_index = list.list("index", selected.index());

                    if (!selected.size()) return;

                    var obj = achta.settings.config[parent_selected_index].content[selected_index];

                    obj[key] = elem.val();
                    change(true);
                });
                $("#config_" + key + "_check").change(function(event) {
                    var check = $(event.currentTarget);
                    var elem = check.next().next();
                    var checked = check.prop("checked");
                    var default_value = (key === "avs" || key === "preset") ? achta.settings.acutil.args[key] : "";

                    elem.prop("disabled", !checked);
                    elem.val(checked ? default_value : "");

                    var parent_list = $("#config_list_parent");
                    var parent_selected = parent_list.list("selectedItems");
                    var parent_selected_index = parent_list.list("index", parent_selected.index());

                    if (!parent_selected.size()) return;

                    var list = $("#config_list_child");
                    var selected = list.list("selectedItems");
                    var selected_index = list.list("index", selected.index());

                    if (!selected.size()) return;

                    var obj = achta.settings.config[parent_selected_index].content[selected_index];

                    if (checked) {
                        obj[key] = default_value;
                    } else {
                        delete obj[key];
                    }

                    change(true);
                });
                break;
            case "params":
                Object.keys(achta.model.acutil.params).forEach(function(key2) {
                    if (achta.model.acutil.params[key2] === "string") {
                        var prev = void(0);

                        $("[name=config_" + key2 + "]").focusin(function() {
                            var elem = $("[name=config_" + key2 + "]");
                            var value = elem.filter(":checked").val();

                            prev = value;
                        });

                        $("[name=config_" + key2 + "]").click(function() {
                            var elem = $("[name=config_" + key2 + "]");
                            var value = elem.filter(":checked").val();
                            var same = value === prev;

                            if (same) elem.val([""]);
                            prev = value;

                            var parent_list = $("#config_list_parent");
                            var parent_selected = parent_list.list("selectedItems");
                            var parent_selected_index = parent_list.list("index", parent_selected.index());

                            if (!parent_selected.size()) return;

                            var list = $("#config_list_child");
                            var selected = list.list("selectedItems");
                            var selected_index = list.list("index", selected.index());

                            if (!selected.size()) return;

                            var obj = achta.settings.config[parent_selected_index].content[selected_index];
                            var obj2 = obj.params;

                            if (same) {
                                delete obj2[key2];
                            } else {
                                obj2[key2] = value;
                            }

                            change(true);
                        });
                    } else {
                        $("#config_" + key2).click(function(event) {
                            var elem = $(event.currentTarget);
                            var checked;

                            if (elem.hasClass("indeterminate")) {
                                //indeterminate -> on
                                checked = true;
                                elem.prop("checked", true);
                                elem.removeClass("indeterminate");
                            } else if (!elem.prop("checked")) {
                                //on -> off
                                checked = false;
                                elem.prop("checked", false);
                                elem.removeClass("indeterminate");
                            } else {
                                //off -> indeterminate
                                checked = void(0);
                                elem.prop("checked", false);
                                elem.addClass("indeterminate");
                            }

                            var parent_list = $("#config_list_parent");
                            var parent_selected = parent_list.list("selectedItems");

                            if (!parent_selected.size()) return;

                            var list = $("#config_list_child");
                            var selected = list.list("selectedItems");

                            if (!selected.size()) return;

                            var obj = achta.settings.config[parent_selected.index()].content[selected.index()];
                            var obj2 = obj.params;

                            if (checked === void(0)) {
                                delete obj2[key2];
                            } else {
                                obj2[key2] = checked;
                            }

                            change(true);
                        });
                    }
                });
                break;
        }
    });

    // Preset
    $("ul.tab li a").click(function(event) {
        var elem = $(event.currentTarget);
        var id = elem.attr("id").replace("_tab", "");
        var tab = elem.parent().parent();
        var parent = tab.parent();

        // Remove
        tab.find("li a").removeClass("active");
        parent.find("div.tab-page:visible").hide();

        // Add
        elem.addClass("active");
        $("#" + id).show();
    });
    $("#preset_list").list({
        sortable: false,
        multiselectable: false,
        multiselectOnKey: false,
        selected: function(event, target) {
            var text = target.text();
            var parent = new Folder(aclib.path()).childFolder("preset");
            var file = parent.childFile(text + ".json");

            var obj = achta.loadJSON(file.path());
            if (obj === null) window.close();

            // Check
            $("[name=preset_muxer]").val([obj.muxer]);

            // Disabled
            $("[name=preset_muxer]").prop("disabled", obj.video.type === "general");
            $("#preset_audio_settings").prop("disabled", obj.audio.type === "none");

            // Text
            ["video", "audio"].forEach(function(value) {
                $("[name=preset_" + value + "_type]").val([obj[value].type]);
                $("#preset_" + value + "_extension").val(obj[value].extension);
                $("#preset_" + value + "_encoder").val(obj[value].encoder);
                $("#preset_" + value + "_option").val(obj[value].option);
            });

            // Icon
            $("#preset_list_add").removeClass("icon-add")
                                 .addClass("icon-copy")
                                 .prop("title", "コピー");
        },
        unselected: function() {
            // Check
            $("[name=preset_video_type]").val(["specific"]);
            $("[name=preset_audio_type]").val(["normal"]);
            $("[name=preset_muxer]").val(["lsmuxer"]);

            // Disabled
            $("[name=preset_muxer]").prop("disabled", false);
            $("#preset_audio_settings").prop("disabled", false);

            // Text
            $("#content_preset input[type=text],textarea").val("");

            // Icon
            $("#preset_list_add").removeClass("icon-copy")
                                 .addClass("icon-add")
                                 .prop("title", "追加");
        }
    });

    $("#preset_list_add").click(function() {
        var list = $("#preset_list");
        var selected = list.list("selectedItems");

        achta.dialog({
            type: 2,
            message: "名前を入力してください",
            text: selected.size() ? selected.text() + "_copy" : "",
            callback: function(name) {
                if (name === null) return;
                if (name === "") {
                    achta.dialog({message: "名前がありません"});
                    return;
                }
                name = aclib.escape(name, true);

                var parent = new Folder(aclib.path()).childFolder("preset");
                var file = parent.childFile(name + ".json");
                if (file.exists()) {
                    achta.dialog({message: "その名前は既に存在しています"});
                    return;
                }

                var item = {};
                ["video", "audio", "muxer"].forEach(function(value) {
                    if (value === "muxer") {
                        item[value] = $("[name=preset_" + value + "]:checked").val() || "none";
                    } else {
                        item[value] = {};
                        item[value].type = $("[name=preset_" + value + "_type]:checked").val();
                        item[value].extension = $("#preset_" + value + "_extension").val();
                        item[value].encoder = $("#preset_" + value + "_encoder").val();
                        item[value].option = $("#preset_" + value + "_option").val();
                    }
                });

                if (!achta.saveJSON(file.path(), item)) window.close();

                achta.scanFiles();
                resetFiles();

                var files_base = achta.files.preset.map(function(value) {
                    return value.base();
                });

                list.list("select", files_base.indexOf(name));
            }
        });
    });

    $("#preset_list_remove").click(function() {
        var list = $("#preset_list");
        var selected = list.list("selectedItems");

        if (!selected.size()) return;

        var text = selected.text();

        var parent = new Folder(aclib.path()).childFolder("preset");
        var file = parent.childFile(text + ".json");

        if (!file.remove()) {
            achta.dialog({message: "削除に失敗しました"});
            return;
        }

        achta.scanFiles();
    });
    $("#preset_list_rename").click(function() {
        var list = $("#preset_list");
        var selected = list.list("selectedItems");

        if (!selected.size()) return;

        achta.dialog({
            type: 2,
            message: "名前を入力してください",
            text: selected.text(),
            callback: function(name) {
                if (name === null) return;
                if (name === "") {
                    achta.dialog({message: "名前がありません"});
                    return;
                }
                name = aclib.escape(name, true);

                var parent = new Folder(aclib.path()).childFolder("preset");
                var file = parent.childFile(selected.text() + ".json");
                var dest = parent.childFile(name + ".json");
                if (dest.exists()) {
                    achta.dialog({message: "その名前は既に存在しています"});
                    return;
                }
                if (!file.move(dest.path())) {
                    achta.dialog({message: "名前の変更に失敗しました"});
                    return;
                }

                achta.scanFiles();
                resetFiles();
                var files_base = achta.files.preset.map(function(value) {
                    return value.base();
                });
                list.list("select", files_base.indexOf(name));
            }
        });
    });
    ["video", "audio", "muxer"].forEach(function(value) {
        var field = [];

        switch (value) {
            case "muxer":
                field = [""];
                break;
            case "video":
                field = ["type", "extension", "encoder", "option"];
                $("[name=preset_video_type]").change(function(event) {
                    var elem = $(event.currentTarget);

                    $("[name=preset_muxer]").prop("disabled", elem.val() === "general");
                    if (elem.val() === "general") {
                        $("[name=preset_muxer]").val([""]);
                    } else {
                        $("[name=preset_muxer]").val(["lsmuxer"]);
                    }
                });
                break;
            case "audio":
                field = ["type", "extension", "encoder", "option"];
                $("[name=preset_audio_type]").change(function(event) {
                    var elem = $(event.currentTarget);

                    $("#preset_audio_settings").prop("disabled", elem.val() === "none");
                    if (elem.val() === "none") {
                        $("#preset_audio_settings").find("input[type=text],textarea").val("");
                    }
                });
                break;
        }

        field.forEach(function(value2) {
            var selector = value2 ? "preset_" + value + "_" + value2 : "preset_" + value;
            selector = (value === "muxer" || value2 === "type") ? "[name=" + selector + "]" : "#" + selector;
            $(selector).change(function(event) {
                var elem = $(event.currentTarget);

                var list = $("#preset_list");
                var selected = list.list("selectedItems");

                if (!selected.size()) return;

                elem.val(elem.val().split(aclib.path()).join("${path}"));

                var parent = new Folder(aclib.path()).childFolder("preset");
                var file = parent.childFile(selected.text() + ".json");

                var item = {};
                ["video", "audio", "muxer"].forEach(function(value3) {
                    if (value3 === "muxer") {
                        item[value3] = $("[name=preset_" + value3 + "]:checked").val() || "none";
                    } else {
                        item[value3] = {};
                        item[value3].type = $("[name=preset_" + value3 + "_type]:checked").val();
                        item[value3].extension = $("#preset_" + value3 + "_extension").val();
                        item[value3].encoder = $("#preset_" + value3 + "_encoder").val();
                        item[value3].option = $("#preset_" + value3 + "_option").val();
                    }
                });

                if (!achta.saveJSON(file.path(), item)) window.close();
            });

            if (value2 === "encoder") {
                $(selector + "_browse").click(function(event) {
                    var elem = $(event.currentTarget).prev();
                    var folder = false;
                    var dest = elem.val().split("${path}").join(aclib.path());

                    var path = aclib.browse({
                        dest: folder ? dest : new File(dest).parent().path(),
                        folder: folder
                    });
                    if (path.length === 0) return;

                    elem.val(path[0]);
                    elem.change();
                });
            }
        });
    });

    // Buttons
    $("#save").click(function() {
        if (!achta.saveSettings()) window.close();
        change(false);
    });

    $("#reset").click(function() {
        achta.restoreSettings();
        resetViews();
        change(false);
    });

    $("#close").click(function() {
        window.close();
    });

    $(window).on("beforeunload", function() {
        return change() ? "現在の設定を破棄して終了しますか?" : void(0);
    });

    // Check Build
    if (!achta.checkBuild()) window.close();

    // Load Settings
    if (!achta.loadSettings()) window.close();

    // Scan Files
    achta.scanFiles();

    // Reset Views
    resetViews();

    // Reset Files
    resetFiles();
});
