/*
Copyright 2020-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import angular from "angular";

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import _ from "lodash";

export { QwHttp };

class QwHttp {
  static get annotations() { return [
    new Injectable()
  ]}

  static get parameters() { return [
    HttpClient,
  ]}

  constructor(http) {
    this.http = http;
  }

  // for transition to using RXJS, unpack the HttpRequest and send it
  // using HttpClient, returning an observable
  do_request(config) {
    switch (config.method) {
      case 'GET':
        return(this.http.get(config.url,this.configToOptions(config)));
      case 'POST':
        return(this.http.post(config.url,config.data,this.configToOptions(config)));
      case 'PUT':
        return(this.http.put(config.url,config.data,this.configToOptions(config)));
      case 'DELETE':
        return(this.http.delete(config.url,this.configToOptions(config)));
    }
  }

  //simulate old $http from angular 1.x
  do(config) {

    if (!config || !config.url || !config.method)
      return(null);

    switch (config.method) {
    case 'GET':
      return this.get(config.url,config);
    case 'POST':
      return this.post(config.url,config.data,config);
    case 'PUT':
      return this.put(config.url,config.data,config);
    case 'DELETE':
      return this.delete(config.url,config);
    }

    // shouldn't get here
    return(Promise.reject(new Error('unable to handle http request: ' + JSON.stringify(config))));
  }

  // convert the $http config to an HttpClient options object
  // config object might have:
  //  method - 'GET', 'POST' etc
  //  url
  //  params - map to use as parameters for GET
  //  data - for POST
  //  headers - HTTP header
  //  transformResponse - method to call on response

  configToOptions(config) {
   var options = {observe: 'response'};
   if (config.headers) {
     // can't pass options to HttpHeaders constructor, because it can't
     // handle headers with numeric values
     options.headers = new HttpHeaders();
     Object.keys(config.headers).forEach(key =>
       options.headers = options.headers.set(key,config.headers[key]));
   }

   if (config.params)
     options.params = config.params;
   return(options);
  }

  get(url, config) {
    config = config || {};
    config.url = url;
    config.method = 'GET';

    return(this.http.get(url,this.configToOptions(config)).toPromise().then(this.handleSuccess,this.handleFailure));
  };


  post(url, data, config) {
    config = config || {};
    config.url = url;
    config.method = 'POST';

    return(this.http.post(config.url,data,this.configToOptions(config)).toPromise().then(this.handleSuccess,this.handleFailure));
  }

  put(url, data, config) {
    config = config || {};
    config.url = url;
    config.method = 'PUT';

    return(this.http.post(config.url,data,this.configToOptions(config)).toPromise().then(this.handleSuccess,this.handleFailure));
  }

  delete(url, config) {
    config = {};
    config.url = url;
    config.method = 'DELETE';

    return(this.http.delete(config.url,this.configToOptions(config)).toPromise().then(this.handleSuccess,this.handleFailure));
  }


  handleSuccess(resp) {
    if (resp && resp.status == 200 && resp.body) {
      if (_.isString(resp.body)) try {
        resp.data = JSON.parse(resp.body);
      } catch (e) {}
      else
        resp.data = resp.body;
    }
    return(resp);
  }

  handleFailure(resp) {
    if (_.isString(resp.error)) try {
      resp.data = JSON.parse(resp.error);
    } catch (e) {}

    return(Promise.reject(resp));
  }

}
