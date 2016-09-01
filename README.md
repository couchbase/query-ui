# query-ui

This repository contains the resources used for the Couchbase Query Workbench,
which is a plug-in for the Couchbase Administrative Console. This code can also 
be run in a stand-alone mode, for users who are not administrators. This document 
primarily describes the latter use, in stand-alone mode.

## Steps to create a build

You will need to have golang installed on your platform.

### Get a working repository

     $ mkdir $HOME/standalone
     $ export GOPATH=$HOME/standalone
     $ mkdir -p $GOPATH/src/github.com/couchbase/
     $ cd $HOME/standalone
     $ mkdir bin pkg

Clone the git repo into the current working directory, to get the
source, so as to be able to make a build. This clones it into query:

     $ cd $GOPATH/src/github.com/couchbase/
     $ git clone ssh://github.com/couchbase/query-ui query-ui
     $ cd query-ui
     $ go get .
     $ cd $GOPATH
     $ go install -v -gcflags "-N -l" ./src/github.com/couchbase/query-ui

This creates an executable called 'query-ui' in the $GOPATH/bin directory.

## Running the tool

To run in standalone mode, you need to tell the executable where to find a
Couchbase server, and where to find all the web resources.

    $GOPATH/bin/query-ui -webcontent=$GOPATH/src/github.com/couchbase/query-ui/ -datastore=http://localhost:8091
    
which should produce the following output messages:
    
    Launching query web service.
    Using CB Server at: http://localhost:8091
    Using N1QL query service on: localhost:8093
    Using mgmt query service on: localhost:8091
    Using web content at: /Users/eben/src/standalone/src/github.com/couchbase/query-ui/query-ui
    Launching UI server, to use, point browser at http://localhost:8095

The UI will be accessible via a web browser, by default on http://localhost:8095.

The UI is the same as is found in the Couchbase administrative console.

Have fun!
