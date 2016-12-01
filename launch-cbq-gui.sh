#!/bin/sh
#
# This script is used to launch a stand-alone program which supports a web-based query workbench
# for Couchbase on its HTTP listen port. It also supports a "describe" command, which samples 
# documents in a Couchbase bucket an infers a schema for them.
#
# Before running this script, you must "cd" to the directory where the script is located.
#
# The following variables should work for a basic install of Couchbase on the local machine.
# GUI_PORT is the port that you can go to with a web browser to see the GUI, e.g., http://localhost:8094
# COUCHBASE_URL is the URL you would go to to see the Couchbase web console
# USER and PASS and the administrator login/password for the Couchbase web console. You should
#  not need to set them unless you run into errors.
#
export GUI_PORT=:8095
export COUCHBASE_URL=http://127.0.0.1:8091
export USER=
export PASS=
export STATIC=./static/
#
# Check to make sure we are in the same directory as the necessary files
#
if ([ ! -f query-ui  ] || [ ! -d static]); then
    echo "You must run this script in the same directory as query-ui and the static folder."
    exit 0
fi

export COMMAND="./query-ui -datastore=$COUCHBASE_URL -localPort=$GUI_PORT -user=$USER -pass=$PASS -webcontent=$STATIC"
echo Running: $COMMAND 
$COMMAND
    
