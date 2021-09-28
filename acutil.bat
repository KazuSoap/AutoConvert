@echo off

cd %~dp0
title AutoConvertUtility
cscript //nologo "%~dp0src\acutil.wsf" %*
