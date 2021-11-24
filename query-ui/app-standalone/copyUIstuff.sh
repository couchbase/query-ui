#!/bin/sh

# Copyright 2018-Present Couchbase, Inc.
#
# Use of this software is governed by the Business Source License included in
# the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
# file, in accordance with the Business Source License, use of this software
# will be governed by the Apache License, Version 2.0, included in the file
# licenses/APL2.txt.

#
# the standalone app relies upon a bunch of components from ns-server. 
#
# this script copies them over.
#
cp -r ../../../ns_server/priv/public/ui/app/components .
cp -r ../../../ns_server/priv/public/ui/app/constants .
cp -r ../../../ns_server/priv/public/ui/app/css .
cp -r ../../../ns_server/priv/public/ui/app/mn_admin .
cp -r ../../../ns_server/priv/public/ui/app/mn_auth .
cp -r ../../../ns_server/priv/public/ui/app/mn_wizard .

