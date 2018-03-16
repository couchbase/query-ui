#!/bin/sh
#
# This script is used to launch a stand-alone program which supports a web-based query
# workbench for Couchbase on its HTTP listen port. While there exists a query workbench
# integrated into the Couchbase Admin UI (from 4.5 onward), the purpose of this script
# is to support querying for people without admin credentials. 
#
# Before running this script, you must "cd" to the directory where the script is
# located.
#
# The following variables should work for a basic install of Couchbase on the local
# machine:
#  GUI_PORT is the port that you can go to with a web browser to see the GUI, 
#           e.g., :8095
#  COUCHBASE_URL is the URL you would go to to see the Couchbase web console, 
#           e.g., http://localhost:8091
#  USER and PASS and the administrator login/password for the Couchbase cluster. 
#  You may or may not need these depending on the Couchbase version. E.g.
#           Couchbase Server 4.1.2
#
export GUI_PORT=:8097
export COUCHBASE_URL=http://127.0.0.1:8091
export CBUSER=
export CBPASS=
export STATIC=./static/
#
# Check to make sure we are in the same directory as the necessary files
#
if ([ ! -f query-ui  ] || [ ! -d static]); then
    echo "You must run this script in the same directory as query-ui and the static folder."
    exit 0
fi

export COMMAND="./query-ui -datastore=$COUCHBASE_URL -localPort=$GUI_PORT -user=$CBUSER -pass=$CBPASS -webcontent=$STATIC"
echo Running: $COMMAND 
$COMMAND
    
