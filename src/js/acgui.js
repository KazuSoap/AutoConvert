/* global oHta, $, aclib, achta, Folder, File, AutoConvertUtility */
$(function() {
    var global = new Function("return this")();

    // Add logo arg
    achta.model.acutil.args.logo = "string";

    // Define acgui
    var acgui = {
        items: [],
        processing: null,
        timeout: null,
        addItem: function(input) {
            var item = {
                util: new AutoConvertUtility({
                    path: {
                        input: input,
                        output: achta.settings.acutil.path.output === "" ?
                                new File(input).parent().path() :
                                achta.settings.acutil.path.output,
                        move: achta.settings.acutil.path.move,
                        rplsinfo: achta.settings.acutil.path.rplsinfo,
                        screname: achta.settings.acutil.path.screname
                    },
                    args: achta.settings.acutil.args,
                    params: achta.settings.acutil.params,
                    macro: achta.settings.acutil.macro,
                    settings: achta.settings.acutil.settings,
                    config: achta.settings.config,
                    log: aclib.log
                }),
                ready: false,
                processing: false,
                done: false,
                result: null,
                helper: null,
                log: null,
                lastModified: null,
                prepare: [],
                error: [],
                output: []
            };

            item.util.log = function(message, level) {
                item.prepare.push({
                    icon: level ? "failed" : "warning",
                    message: message
                });
            };

            if (!item.util.getInfo() ||
                !item.util.getConfig() ||
                !item.util.getMacro() ||
                !item.util.setMacro()) {
                if (item.error.length !== 0) {
                    alert(item.error[item.error.length - 1].message);
                }
                return -1;
            }

            item.util.checkDrop();

            item.util.log = function(message, level) {
                item.error.push({
                    icon: level ? "failed" : "warning",
                    message: message
                });
            };

            acgui.items.push(item);

            updateProgress();

            return acgui.items.length - 1;
        },
        removeItem: function(index) {
            var item = acgui.items[index];

            if (!item) return false;
            if (item.processing) return false;

            acgui.items.splice(index, 1);

            updateProgress();

            return true;
        },
        checkItem: function(index) {
            var item = acgui.items[index];

            if (!item) return;
            if (item.processing) return;

            item.error = [];
            item.ready = item.util.checkSettings();
        },
        observing: function(oldIndex, newIndex) {
            var oldItem = acgui.items[oldIndex];
            var newItem = acgui.items[newIndex];

            if (!oldItem || !newItem) return false;

            acgui.items.splice(newIndex, 0, acgui.items.splice(oldIndex, 1)[0]);

            updateProgress();

            return true;
        },
        execute: function() {
            function next() {
                var item = acgui.processing;
                var item_index = acgui.items.indexOf(item);

                acgui.processing = null;

                acgui.items.some(function(value, index) {
                    if (index <= item_index) return false;
                    if (!value.ready) return false;
                    if (value.done) return false;

                    acgui.processing = value;
                    return true;
                });
            }

            function timeout() {
                var item = acgui.processing;
                var item_index = acgui.items.indexOf(item);

                if (item === null) {
                    $("#menu_start").show();
                    $("#menu_stop").hide();

                    updateProgress();

                    if ($("#menu_autoexit").prop("checked")) {
                        window.close();
                    }

                    return;
                }

                var list = $("#list");
                var selected = list.list("selectedItems");
                var selected_index = list.list("index", selected.index());

                var same = selected.size() === 1 && selected_index === item_index;

                if (item.processing) {
                    if (item.helper.getStatus() === 0) {
                        var lastModified = String(item.log.lastModified());

                        if (item.lastModified !== lastModified) {
                            var json = achta.loadJSON(item.log.path());

                            if (json !== null) {
                                item.output = json.map(function(value) {
                                    return {
                                        message: value.message,
                                        icon: value.level ? "failed" : ""
                                    };
                                });

                                if (same) resetTabs();
                            }

                            item.lastModified = lastModified;
                        }

                        acgui.timeout = setTimeout(timeout, 500);
                    } else {
                        var exitcode = item.helper.getExitCode();

                        item.util.moveInput();

                        item.log.remove();

                        item.processing = false;
                        item.done = exitcode === 0;
                        item.result = exitcode === 0;
                        item.helper = null;
                        item.log = null;
                        item.lastModified = null;

                        styleList(item_index);
                        if (same) resetTabs();

                        next();

                        if (exitcode === 0 && $("#menu_remove").prop("checked")) {
                            list.list("remove", item_index);
                            acgui.removeItem(item_index);
                        }

                        timeout();
                    }
                } else {
                    item.processing = true;
                    item.log = new Folder("Temporary").childFile(Math.random().toString(36).slice(2));
                    item.helper = item.util.execute({
                        args: "-log \"" + item.log.path() + "\"",
                        window: 0
                    });

                    updateProgress();
                    styleList(item_index);
                    if (same) resetTabs();

                    acgui.timeout = setTimeout(timeout, 500);
                }

            }

            next();
            timeout();
        },
        terminate: function() {
            var item = acgui.processing;
            var item_index = acgui.items.indexOf(item);

            if (item === null) return;

            var list = $("#list");
            var selected = list.list("selectedItems");
            var selected_index = list.list("index", selected.index());

            var same = selected.size() === 1 && selected_index === item_index;

            item.helper.terminate();
            item.log.remove();

            item.processing = false;
            item.helper = null;
            item.log = null;
            item.lastModified = null;

            acgui.processing = null;

            updateProgress();
            styleList(item_index);
            if (same) resetTabs();

            clearTimeout(acgui.timeout);
        }
    };

    var args = {
        autoStart: false,
        autoEnd: false
    };

    function resetFiles() {
        Object.keys(achta.model.acutil.args).forEach(function(key) {
            var select = $("#settings_args_" + key);

            select.children().remove();

            if (key === "logo") {
                select.append(achta.createOptionItem(""));
            }

            achta.files[key].forEach(function(value) {
                select.append(achta.createOptionItem(value.base()));
            });

            select.val("");
        });
    }

    function resetTabs() {
        var list = $("#list");
        var selected = list.list("selectedItems");
        var selected_index = list.list("index", selected.index());

        if (selected.size() === 0) {
            //settings
            $("#settings_done").prop("checked", false).prop("disabled", true);

            ["input", "output"].forEach(function(value) {
                $("#settings_" + value).val("").prop("disabled", true);
                $("#settings_" + value + "_browse").prop("disabled", true);
            });

            Object.keys(achta.model.acutil.args).forEach(function(key) {
                $("#settings_args_" + key).val("").prop("disabled", true);
            });

            Object.keys(achta.model.acutil.params).forEach(function(key) {
                if (achta.model.acutil.params[key] === "string") {
                    $("[name=settings_params_" + key + "]").val([""])
                                                           .prop("disabled", true);
                } else {
                    $("#settings_params_" + key).prop("checked", false)
                                                .prop("disabled", true)
                                                .removeClass("indeterminate");
                }
            });

            //error
            $("#error_output").empty();
            $("#error_tab").toggleClass("icon-warning", false)
                           .toggleClass("icon-failed", false);

            //output
            $("#output_output").empty();
        } else if (selected.size() === 1) {
            var item = acgui.items[selected_index];

            //settings
            $("#settings_done").prop("checked", item.done).prop("disabled", item.processing);

            ["input", "output"].forEach(function(value) {
                var obj = item.util.args;
                $("#settings_" + value).val(obj[value]).prop("disabled", item.processing);
                $("#settings_" + value + "_browse").prop("disabled", item.processing);
            });

            Object.keys(achta.model.acutil.args).forEach(function(key) {
                var obj = item.util.args;
                $("#settings_args_" + key).val(obj[key]).prop("disabled", item.processing);
            });

            Object.keys(achta.model.acutil.params).forEach(function(key) {
                var obj = item.util.params;
                if (achta.model.acutil.params[key] === "string") {
                    $("[name=settings_params_" + key + "]").val([obj[key]])
                                                           .prop("disabled", item.processing);
                } else {
                    $("#settings_params_" + key).prop("checked", obj[key])
                                                .prop("disabled", item.processing)
                                                .removeClass("indeterminate");
                }
            });

            //error
            $("#error_output").empty();
            item.prepare.forEach(function(value) {
                $("#error_output").append(achta.createListItem(value.message, {class: "icon-" + value.icon}));
            });

            item.error.forEach(function(value) {
                $("#error_output").append(achta.createListItem(value.message, {class: "icon-" + value.icon}));
            });

            $("#error_tab").toggleClass("icon-warning", item.error.length !== 0 && item.ready)
                           .toggleClass("icon-failed", !item.ready);

            //output
            $("#output_output").empty();

            item.output.forEach(function(value) {
                $("#output_output").append(achta.createListItem(value.message, {class: "icon-" + value.icon}));
            });
        } else {
            //settings
            $("#settings_done").prop("checked", false).prop("disabled", false);

            ["input", "output"].forEach(function(value) {
                $("#settings_" + value).val("").prop("disabled", true);
                $("#settings_" + value + "_browse").prop("disabled", true);
            });

            Object.keys(achta.settings.acutil.args).forEach(function(key) {
                $("#settings_args_" + key).val("").prop("disabled", false);
            });

            Object.keys(achta.settings.acutil.params).forEach(function(key) {
                if (typeof achta.settings.acutil.params[key] === "string") {
                    $("[name=settings_params_" + key + "]").val([""])
                                                           .prop("disabled", false);
                } else {
                    $("#settings_params_" + key).prop("checked", false)
                                                .prop("disabled", false)
                                                .addClass("indeterminate");
                }
            });

            //error
            $("#error_output").empty();

            $("#error_tab").toggleClass("icon-warning", false)
                           .toggleClass("icon-failed", false);

            //output
            $("#output_output").empty();
        }
    }

    function styleList(index) {
        var list = $("#list");
        var elem = list.list("items").eq(index);

        var item = acgui.items[index];

        var icon = item.processing ? "processing" :
                   item.done ? "successful" :
                   item.result === false ? "failed" : "";

        elem.toggleClass("warning", !item.ready);
        elem.toggleClass("processing", icon === "processing");
        elem.toggleClass("successful", icon === "successful");
        elem.toggleClass("failed", icon === "failed");
    }

    function changeList(index) {
        var item = acgui.items[index];

        if (item.processing) return;

        acgui.checkItem(index);

        styleList(index);
    }

    function updateProgress() {
        var item = acgui.processing;

        if (item === null) {
            $("#progress").hide();
        } else {
            var index = acgui.items.indexOf(item);
            var length = acgui.items.length;

            $("#progress").show();
            $("#progress_info").text(parseInt(index / length * 100, 10) + "% " + (index + 1) + "/" + length);
            $("#progress_bar").width((index / length * 100) + "%");
        }
    }

    // Tab
    $("ul.tab li a").click(function(event) {
        var elem = $(event.currentTarget);
        var id = elem.attr("id").replace("_tab", "");
        var tab = elem.parent().parent();
        var parent = tab.parent();

        // Hide
        tab.find("li a").removeClass("active");
        parent.find("div.tab-page:visible").hide();

        // Show
        elem.addClass("active");
        $("#" + id).show();
    });

    // List
    $("#list").list({
        multiselectable: false,
        multiselectOnKey: true,
        selected: resetTabs,
        unselected: resetTabs,
        observing: acgui.observing
    });

    $("#list_add").click(function() {
        var list = $("#list");
        var path = aclib.browse({ multi: true });

        if (path.length === 0) return;

        path.forEach(function(value) {
            var index = acgui.addItem(value);

            if (index === -1) return;

            var item = acgui.items[index];

            acgui.checkItem(index);

            list.list("add", achta.createListItem(item.util.args.input, {class: "icon" + (item.ready ? "" : " warning")}));
            list.list("select", index, true);
        });
    });

    $("#list_remove").click(function() {
        var list = $("#list");
        var selected = list.list("selectedItems");
        var selecte_index = list.list("index", selecte_index);

        if (!selected.size()) return;

        selected.each(function(index, elem) {
            elem = $(elem);
            var elem_index = list.list("index", elem.index());

            var item = acgui.items[elem_index];

            if (item.processing) return;

            list.list("remove", elem_index);
            acgui.removeItem(elem_index);
        });
    });

    $("#list_up").click(function() {
        $("#list").list("shiftUp");
    });

    $("#list_down").click(function() {
        $("#list").list("shiftDown");
    });

    $("#list_done").click(function() {
        var list = $("#list");

        acgui.items.filter(function(value) {
            if (value.processing) return false;
            if (!value.done) return false;

            return true;
        }).forEach(function(value) {
            var index = acgui.items.indexOf(value);

            list.list("remove", index);
            acgui.removeItem(index);
        });
    });

    // Settings
    $("#settings_done").change(function() {
        var list = $("#list");
        var selected = list.list("selectedItems");

        selected.each(function(index, elem) {
            elem = $(elem);
            var elem_index = list.list("index", elem.index());

            var item = acgui.items[elem_index];
            if (item.processing) return;

            item.done = $("#settings_done").prop("checked");
            changeList(elem_index);
        });

        if (selected.size() === 1) resetTabs();
    });

    ["input", "output"].forEach(function(value) {
        $("#settings_" + value).change(function(event) {
            var elem = $(event.currentTarget);

            var list = $("#list");
            var selected = list.list("selectedItems");
            var selected_index = list.list("index", selected.index());

            var item = acgui.items[selected_index];

            item.util.args[value] = elem.val();
            if (value === "input") selected.text(elem.val());

            changeList(selected_index);
            resetTabs();
        });

        $("#settings_" + value + "_browse").click(function(event) {
            var elem = $(event.currentTarget).prev();

            var list = $("#list");
            var selected = list.list("selectedItems");
            var selected_index = list.list("index", selected.index());

            var item = acgui.items[selected_index];

            var path = aclib.browse({
                save: value === "output",
                dest: new File(item.util.args[value]).parent().path()
            });

            if (path.length === 0) return;

            elem.val(path[0]);
            elem.change();
        });
    });

    Object.keys(achta.model.acutil.args).forEach(function(key) {
        $("#settings_args_" + key).change(function(event) {
            var elem = $(event.currentTarget);

            var list = $("#list");
            var selected = list.list("selectedItems");

            selected.each(function(index2, elem2) {
                elem2 = $(elem2);
                var elem2_index = list.list("index", elem2.index());

                var item = acgui.items[elem2_index];
                if (item.processing) return;

                item.util.args[key] = elem.val();
                changeList(elem2_index);
            });

            if (selected.size() === 1) resetTabs();
        });
    });
    Object.keys(achta.model.acutil.params).forEach(function(key) {
        if (achta.model.acutil.params[key] === "string") {
            $("[name=settings_params_" + key + "]").change(function() {
                var elem = $("[name=settings_params_" + key + "]");

                var list = $("#list");
                var selected = list.list("selectedItems");

                selected.each(function(index2, elem2) {
                    elem2 = $(elem2);
                    var elem2_index = list.list("index", elem2.index());

                    var item = acgui.items[elem2_index];
                    if (item.processing) return;

                    item.util.params[key] = elem.filter(":checked").val();
                    changeList(elem2_index);
                });

                if (selected.size() === 1) resetTabs();
            });
        } else {
            $("#settings_params_" + key).change(function(event) {
                var elem = $(event.currentTarget);
                elem.removeClass("indeterminate");

                var list = $("#list");
                var selected = list.list("selectedItems");

                selected.each(function(index2, elem2) {
                    elem2 = $(elem2);
                    var elem2_index = list.list("index", elem2.index());

                    var item = acgui.items[elem2_index];
                    if (item.processing) return;

                    item.util.params[key] = elem.prop("checked");
                    changeList(elem2_index);
                });

                if (selected.size() === 1) resetTabs();
            });
        }
    });

    //start
    $("#menu_start").click(function() {
        $("#menu_start").hide();
        $("#menu_stop").show();

        acgui.execute();
    });

    $("#menu_stop").click(function() {
        $("#menu_start").show();
        $("#menu_stop").hide();

        acgui.terminate();
    });

    //processing
    (function() {
        var angle = 0;
        var styleSheet = document.styleSheets[0];

        styleSheet.addRule("li.processing:before", "transform: rotate(0deg)");

        var rule = styleSheet.cssRules[styleSheet.cssRules.length - 1];

        setInterval(function() {
            rule.style.msTransform = "rotate(" + angle + "deg)";
            angle = angle + 6 % 360;
        }, 16);
    })();

    //about
    $("#about_version").text(oHta.version);
    $("#about_modified").text($("meta[name='update']").prop("content"));
    $("#about, #about_close").click(function(event) {
        if (event.currentTarget !== event.target) return;
        $("#about").fadeOut();
    });
    $("#menu_about").mousedown(function() {
        $("#about").fadeIn();
    });

    //Check Build
    if (!achta.checkBuild()) window.close();

    //Load Settings
    if (!achta.loadSettings()) window.close();

    //Replace Settings
    achta.replaceSettings();

    //Scan Files
    achta.scanFiles();

    //Reset Views
    resetTabs();

    //Reset Files
    resetFiles();

    //Add Arguments
    achta.getArguments().forEach(function(value, index_) {
        if (index_ === 0) return;

        if (value[0] === "-") {
            switch (value) {
                case "-s":
                    args.autoStart = true;
                    break;

                case "-e":
                    args.autoEnd = true;
                    break;
            }
        } else {
            var list = $("#list");

            var item_index = acgui.addItem(value);
            if (item_index === -1) return;
            var item = acgui.items[item_index];

            acgui.checkItem(item_index);
            var list_item = achta.createListItem(item.util.args.input, {
                class: "icon" + (item.ready ? "" : " warning")
            });
            list.list("add", list_item);
            list.list("select", item_index, true);
        }
    });

    if (args.autoStart) {
        if (acgui.processing !== null) return;

        $("#menu_start").hide();
        $("#menu_stop").show();

        acgui.execute();
    }

    if (args.autoEnd) {
        $("#menu_autoexit").prop("checked", true);
    }

    global.acgui = acgui;
});
