@echo off
net stop HTTP /y
node "%~dp0/app.js"
pause