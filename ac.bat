@echo off

cd %~dp0
title AutoConvert
cscript //nologo "%~dp0src\ac.wsf" %*
