/*
Copyright 2022-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import { QwHttp }            from '../angular-services/qw.http.js';
import { QwQueryService}     from "./qw.query.service.js";
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
            QwQueryService,
        ]
    }

    constructor(
        qwHttp,
        qwQueryService,
    ) {
        this.qwHttp = qwHttp;
        this.qqs = qwQueryService;
        this.compat = {init:false};
        this.pools = {init:false};
        this.rbac = {init:false};
        this.queryNodes = [];
        this.bucketList = [];
        this.permittedBucketList = [];
        this.indexes = {};
        this.errors = [];
        this.metaReady = this.updateBuckets();

        qwHttp.get('/pools')
            .then(pools => {this.pools.export = pools.data; this.pools.init=true;},
                error => {this.pools = {err: error}});
    }

    valid() {
        return this.queryNodes && this.queryNodes.length > 0
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
        this.compat.atLeast72 = thisNode.clusterCompatibility >= encodeCompatVersion(7, 2);
        this.compat.atLeast76 = thisNode.clusterCompatibility >= encodeCompatVersion(7, 6);
        this.compat.init = true;

        // figure out which nodes are running query service
        this.queryNodes = poolDefault.nodes.filter(node => node.services.includes('n1ql'))
            .map(node => node.hostname);

        // get bucket names
        this.bucketList.length = 0;
        if (_.isArray(poolDefault.bucketNames)) {
            this.bucketList.push(...poolDefault.bucketNames.map(bucket => bucket.bucketName));
            this.bucketList.sort();
        }

        // permissions that the workbench needs to know about
        let perms = [
            'cluster.collection[.:.:.].collections!read',
            'cluster.collection[.:.:.].data.docs!read',
            'cluster.collection[.:.:.].data.docs!upsert',
            'cluster.collection[.:.:.].n1ql.index!all',
            'cluster.collection[.:.:.].n1ql.select!execute',
            'cluster.collection[.:.:.].n1ql.udf_external!manage',
            'cluster.collection[.:.:.].n1ql.udf!manage',
            'cluster.collection[.:.:.].stats!read',
            'cluster.n1ql.meta!read',
            'cluster.n1ql.udf!manage',
            'cluster.n1ql.udf_external!manage',
            ...this.bucketList.map(bucketName => 'cluster.bucket[' + bucketName + '].data.docs!read'),
            ...this.bucketList.map(bucketName => 'cluster.bucket[' + bucketName + '].data.docs!upsert'),
            ...this.bucketList.map(bucketName => 'cluster.bucket[' + bucketName + '].data.docs!delete'),

            ...this.bucketList.map(bucketName => 'cluster.collection[' + bucketName + ':.:.].data.docs!read'),
            ...this.bucketList.map(bucketName => 'cluster.collection[' + bucketName + ':.:.].data.docs!upsert'),
            ...this.bucketList.map(bucketName => 'cluster.collection[' + bucketName + ':.:.].data.docs!delete'),

            ...this.bucketList.map(bucketName => 'cluster.collection[' + bucketName + ':.:.].n1ql.udf!manage'),
            ...this.bucketList.map(bucketName => 'cluster.collection[' + bucketName + ':.:.].n1ql.udf_external!manage'),
        ];

        let promise = this.qwHttp.post('/pools/default/checkPermissions',perms.join(','))
            .then(result => This.decodePermissions(result.data),
                err => {this.rbac = err});

        return(promise);
    }


    // decode permissions from the array of 'name':<bool> to a tree
    decodePermissions(permissions) {
        //console.log("Got permissions: " + JSON.stringify(permissions,null,2));

        this.rbac.init = true;
        Object.keys(permissions).forEach(key => {
            let value = permissions[key];
            var path = [];
            let sections = key.split(/[[\]]+/);
            for (var i=0; i < sections.length; i++)
                if (i==1)
                    path.push(sections[i]); // bucket/coll info inside brackets
                else
                    path.push(...sections[i].split(/[.!]+/));

            let perm = this.rbac;
            // fill out the path as needed
            path.forEach((pName,i) => {
                if (pName.length)
                {perm[pName] = perm[pName] || (i < path.length - 1 ? {} : value); perm = perm[pName];}
            });
        });

        // need to record which buckets we are allowed to access the data

        this.permittedBucketList.length = 0;
        this.bucketList.forEach(bucketName => {
            if (this.rbac.cluster.bucket[bucketName].data.docs.read ||
                this.rbac.cluster.bucket[bucketName].data.docs.upsert ||
                this.rbac.cluster.bucket[bucketName].data.docs.delete ||
                this.rbac.cluster.collection[bucketName + ':.:.'].data.docs.read ||
                this.rbac.cluster.collection[bucketName + ':.:.'].data.docs.upsert ||
                this.rbac.cluster.collection[bucketName + ':.:.'].data.docs.delete ||
                this.rbac.cluster.collection[bucketName + ':.:.'].n1ql.udf.manage ||
                this.rbac.cluster.collection[bucketName + ':.:.'].n1ql.udf_external.manage)
                this.permittedBucketList.push(bucketName);
        });

        // get index info, if possible. If query nodes exist, use a query,
        // which works even if /indexStatus API is forbidden
        if (this.queryNodes.length > 0)
            return this.getIndexesN1QL();
        else
            return this.getIndexesREST();
    }

    // do we have enough permissions to run queries?
    queryPermitted() {
        return this.rbac.init && ((this.rbac.cluster.collection['.:.:.'].data.docs.read &&
                this.rbac.cluster.collection['.:.:.'].n1ql.select.execute) ||
            this.rbac.cluster.collection['.:.:.'].n1ql.index.all);
    }

    // get indexes via N1QL (preferable if possible)
    getIndexesN1QL() {
        return this.qqs.executeQueryUtil('select indexes.* from system:indexes')
            .then(success_resp => {
                    Object.keys(this.indexes).forEach(key => {delete this.indexes[key]});
                    if (success_resp.status == 200 && success_resp.data && Array.isArray(success_resp.data.results))
                        success_resp.data.results.forEach(index => {
                            // indexes on default collections have bucket name in the keyspace_id
                            if (!index.bucket_id)
                                this.addIndexToMetadata(index.keyspace_id,"_default","_default",index.is_primary);
                            else
                                this.addIndexToMetadata(index.bucket_id,index.scope_id,index.keyspace_id,index.is_primary);
                        });
                },
                error_resp => {
                    Object.keys(this.indexes).forEach(key => {delete this.indexes[key]});
                    this.errors.push(JSON.stringify(error_resp));
                    console.log("Error getting indexes via n1ql: " + JSON.stringify(error_resp));
                });

    }

    // get indexes from REST API (which doesn't work for less privileged users)
    getIndexesREST() {
        let This = this;
        return this.qwHttp.do({
            url: "../indexStatus",
            method: "GET"
        }).then(success_resp => {
            Object.keys(This.indexes).forEach(key => {delete This.indexes[key]});
            if (success_resp.status == 200 && success_resp.body && _.isArray(success_resp.body.indexes)) {
                success_resp.body.indexes.forEach(index =>
                    This.addIndexToMetadata(index.bucket,index.scope,index.collection,index.definition.startsWith("CREATE PRIMARY")));
            }
        }, error_resp => {
            Object.keys(This.indexes).forEach(key => {delete This.indexes[key]});
            console.log("Error getting indexes via REST: " + JSON.stringify(error_resp));
        })
    }

    // add an index to the metadata
    addIndexToMetadata(bucketName,scopeName,collName,primary) {
        this.indexes[bucketName] = this.indexes[bucketName] || {};
        this.indexes[bucketName][scopeName] = this.indexes[bucketName][scopeName] || {};
        this.indexes[bucketName][scopeName][collName] = this.indexes[bucketName][scopeName][collName] || {};
        if (primary)
            this.indexes[bucketName][scopeName][collName].primary = true;
        else
            this.indexes[bucketName][scopeName][collName].secondary = true;
    }
}

// counterpart of ns_heart:effective_cluster_compat_version/0
function encodeCompatVersion(major, minor) {
    if (major < 2) {
        return 1;
    }
    return major * 0x10000 + minor;
}
