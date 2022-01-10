/*
Copyright 2022-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import { QwHttp }            from '../angular-services/qw.http.js';
import _                     from 'lodash';

export { QwMetadataService };

//
// replace validateQueryService, mnPools, MnPoolsDefault, and mnPermissions
//

class QwMetadataService {
    static get annotations() {
        return [
            new Injectable()
        ]
    }

    static get parameters() {
        return [
            QwHttp,
        ]
    }
    
    constructor(qwHttp) {
        this.qwHttp = qwHttp;

        this.compat = {init:false};
        this.pools = {init:false};
        this.rbac = {init:false};
        this.validNodes = [];
        this.bucketList = [];
        this.metaReady = this.updateBuckets();

        qwHttp.get('/pools')
            .then(pools => {this.pools.export = pools.data; this.pools.init=true;},
                error => {this.pools = {err: error}});
    }

    valid() {
        return this.validNodes && this.validNodes.length > 0
    };

    isEnterprise() {
        return this.pools.export && this.pools.export.isEnterprise;
    };

    monitoringAllowed() {
        return this.rbac.init && this.rbac.cluster.n1ql.meta.read;
    }

    updateBuckets() {
        let This = this;
        return this.qwHttp.get('/pools/default')
            .then(poolsDefault => This.decodePoolsDefault(poolsDefault.data),
                error => {This.compat = {err: error}});
    }

    decodePoolsDefault(poolDefault) {
        let This = this;
        // figure out compat version
        let thisNode = poolDefault.nodes.find(node => node.thisNode);

        this.compat.atLeast51 = thisNode.clusterCompatibility >= encodeCompatVersion(5, 1);
        this.compat.atLeast55 = thisNode.clusterCompatibility >= encodeCompatVersion(5, 5);
        this.compat.atLeast65 = thisNode.clusterCompatibility >= encodeCompatVersion(6, 5);
        this.compat.atLeast66 = thisNode.clusterCompatibility >= encodeCompatVersion(6, 6);
        this.compat.atLeast70 = thisNode.clusterCompatibility >= encodeCompatVersion(7, 0);
        this.compat.atLeast71 = thisNode.clusterCompatibility >= encodeCompatVersion(7, 1);
        this.compat.init = true;

        // figure out which nodes are running query service
        this.validNodes = poolDefault.nodes.filter(node => node.services.includes('n1ql'))
            .map(node => node.hostname);

        // get bucket names
        if (_.isArray(poolDefault.bucketNames)) {
            this.bucketList.push(...poolDefault.bucketNames.map(bucket => bucket.bucketName));
            this.bucketList.sort();
        }

        // permissions that the workbench needs to know about
        let perms = [
            'cluster.collection[.:.:.].collections!read',
            'cluster.collection[.:.:.].data.docs!read',
            'cluster.collection[.:.:.].data.docs!write',
            'cluster.collection[.:.:.].n1ql.index!all',
            'cluster.collection[.:.:.].n1ql.select!execute',
            'cluster.collection[.:.:.].n1ql.udf_external!manage',
            'cluster.collection[.:.:.].n1ql.udf!manage',
            'cluster.collection[.:.:.].stats!read',
            'cluster.n1ql.meta!read',
            'cluster.n1ql.udf!manage',
            'cluster.n1ql.udf_external!manage',
            ...this.bucketList.map(bucketName => 'cluster.bucket[' + bucketName + '].data.docs!upsert'),
            ...this.bucketList.map(bucketName => 'cluster.collection[' + bucketName + ':.:.].data.docs!upsert'),
        ];

        let promise = this.qwHttp.post('/pools/default/checkPermissions',perms.join(','))
            .then(result => This.decodePermissions(result.data),
                err => {this.rbac = err});

        return(promise);
    }


    // decode permissions from the array of 'name':<bool> to a tree
    decodePermissions(permissions) {
        this.rbac.init = true;
        Object.keys(permissions).forEach(key => {
            let value = permissions[key];
            var path = [];
            key.split(/[[\]]+/).forEach(subpath => {
                subpath.includes(':') ? path.push(subpath) : path.push(...subpath.split(/[.!]+/))});
            let perm = this.rbac;
            // fill out the path as needed
            path.forEach((pName,i) => {
                if (pName.length)
                {perm[pName] = perm[pName] || (i < path.length - 1 ? {} : value); perm = perm[pName];}
            });
        });
    }

    // do we have enough permissions to run queries?
    queryPermitted() {
        return this.rbac.init && ((this.rbac.cluster.collection['.:.:.'].data.docs.read &&
                this.rbac.cluster.collection['.:.:.'].n1ql.select.execute) ||
            this.rbac.cluster.collection['.:.:.'].n1ql.index.all);
    }
}

// counterpart of ns_heart:effective_cluster_compat_version/0
function encodeCompatVersion(major, minor) {
    if (major < 2) {
        return 1;
    }
    return major * 0x10000 + minor;
}

