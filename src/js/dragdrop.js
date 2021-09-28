if ("SetText" in objOLEDragDrop) {
    objOLEDragDrop.SetText("ここにドロップして追加");
    objOLEDragDrop.SetFont(null, "18", 0x0003a679);

    function objOLEDragDrop::ControlDragLeave() {
        $("#list").show();
        $("#objOLEDragDrop").hide();
    }

    function objOLEDragDrop::ControlDragEnter() {
        $("#list").hide();
        $("#objOLEDragDrop").show();
    }

    function objOLEDragDrop::ControlDragDrop(files) {
        $("#list").show();
        $("#objOLEDragDrop").hide();

        var list = $("#list");
        for (var e = new Enumerator(files); !e.atEnd(); e.moveNext()) {
            var item_index = acgui.addItem(e.item());
            if (item_index === -1) continue;
            var item = acgui.items[item_index];

            acgui.checkItem(item_index);
            var list_item = achta.createListItem(item.util.args.input, {
                class: "icon" + (item.ready ? "" : " warning")
            });
            list.list("add", list_item);
            list.list("select", item_index, true);
        }
    }

    $("#list").bind("dragenter", function() {
        $("#list").hide();
        $("#objOLEDragDrop").show();
    });
    
    $("#objOLEDragDrop").bind("dragleave", function() {
        $("#list").show();
        $("#objOLEDragDrop").hide();
    });
}