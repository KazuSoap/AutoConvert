function main() {
    var global = new Function("return this")();
    
    var shell = new ActiveXObject("WScript.shell");
    var wmi = new ActiveXObject("WbemScripting.SWbemLocator").ConnectServer();
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
    var log = function(str) {
        try {
            WScript.StdErr.WriteLine(str);
        } catch(e) {
            //nothing
        }
    };
    
    var args = [];
    var objArgs = WScript.Arguments;
    for (var i = 0; i < objArgs.length; i++) {
        args.push(objArgs(i));
    }
    if (args.length < 2) return -1;
    
    var path = args[0];
    var command = args.slice(1, -1);
    var window = parseInt(args[args.length - 1]);
    var cscmd = /^\/(B|D|E:.*|H:.*|I|Job:.*|Logo|Nologo|S|T:.*|X|U)$/i;
    var space = /[ \u3000]/;
    
    path = space.test(path) ? '"' + path + '"' : path;
    command = (function() {
        for (var i = 0; i < command.length; i++) {
            command[i] = command[i].replace(cscmd, "//$1");
            if (!space.test(command[i])) continue;
            command[i] = '"' + command[i] + '"';
        }
        return command.join(" ");
    })();
    window = isNaN(window) ? 1 : window;
    
    var done = false;
    var sink = WScript.CreateObject("WbemScripting.SWbemSink", "SINK_");
    wmi.ExecNotificationQueryAsync(sink, 'Select * from __InstanceCreationEvent Within 1 Where TargetInstance ISA "Win32_Process"');
    global.SINK_OnObjectReady = function(event, context) {
        if (event.TargetInstance.ParentProcessId !== pid) return;
        log(event.TargetInstance.ProcessId);
        done = true;
    };
    var ret = shell.Run(path + ' ' + command, window, true);
    if (!done) log(-1);
    log(ret);
    return ret;
}
WScript.Quit(main());