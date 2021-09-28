#SetMemoryMax(1024)

global Plugins = "__path__\plugins\"
global Scripts = "__path__\avs\"

Import(Scripts + "function.avsi")

__video__
#__trim__
TDeint_()
return last
