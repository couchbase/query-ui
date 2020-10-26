import angular from "/ui/web_modules/angular.js";

import { Injectable } from '/ui/web_modules/@angular/core.js';
import { HttpClient } from '/ui/web_modules/@angular/common/http.js';

import _ from "/ui/web_modules/lodash.js";

export { $http };

class $http {
  static get annotations() { return [
    new Injectable()
  ]}

  static get parameters() { return [
    HttpClient,
  ]}

  constructor(http) {
    this.http = http;
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
   if (config.headers)
     options.headers = config.headers;
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
    var config = {};
    config.url = url;
    config.method = 'POST';
    return(this.http.post(config.url,data,this.configToOptions(config)).toPromise().then(this.handleSuccess,this.handleFailure));
  }

  put(url, data, config) {
    var config = {};
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

