@echo off
net stop HTTP /y
node "%~dp0/index.js"
pause