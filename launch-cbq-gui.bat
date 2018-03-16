echo off

rem This script is used to launch a stand-alone program which supports a web-based query workbench
rem for Couchbase on its HTTP listen port. It also supports a "describe" command, which samples 
rem documents in a Couchbase bucket an infers a schema for them.
rem
rem Before running this script, you must "cd" to the directory where the script is located.
rem
rem The following variables should work for a basic install of Couchbase on the local machine.
rem GUI_PORT is the port that you can go to with a web browser to see the GUI, e.g., http://localhost:8094
rem COUCHBASE_URL is the URL you would go to to see the Couchbase web console
rem USER and PASS and the administrator login/password for the Couchbase web console. You should
rem  not need to set them unless you run into errors.

set GUI_PORT=:8097
set COUCHBASE_URL=http://127.0.0.1:8091
set USER=
set PASS=
set STATIC=./static/

rem Check to make sure we are in the same directory as the necessary files

if not exist query-ui.exe (
    echo You must run this script in the same directory as query-ui.exe.
    goto error
)

if not exist static (
    echo You must run this script in the same directory as the static folder.
    goto error
)

echo Go to %UI_SEVER_URL%/ui to use the query UI.
set COMMAND=query-ui.exe -datastore=%COUCHBASE_URL% -localPort=%GUI_PORT% -user=%USER% -pass=%PASS% -webcontent=%STATIC%
echo Running: %COMMAND%
%COMMAND%
goto eof

:error
echo Failed with error %ERRORLEVEL%.
exit /b %ERRORLEVEL%

:eof
