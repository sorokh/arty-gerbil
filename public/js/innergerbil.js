/* Service for accessing the core API inner gerbil */

angular.module('arty').factory('innergerbil', ['$http', '$q', function ($http, $q) {
  var that = {};

  var generateGUID = function () {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
    return uuid;
  };
  that.generateGUID = generateGUID;

  /* Retrieve a single resource */
  that.getResource = function (url, params, cancelPromise) {
    params = params || {};
    var d = $q.defer();
    $http({
      method: "GET",
      url: url,
      params: params,
      withCredentials: true,
      cache: false,
      timeout: cancelPromise
  }).success(function (resp) {
    //hrefToResource[resp.$$meta.permalink];
    hrefToResource[resp.permalink];
    d.resolve(resp);
    }).error(function (error) {
      //if (error.status === 403) {
      //  $notification.error('Geen Rechten', 'U hebt onvoldoende rechten tot ' + url);
      //} else if (error.status === 404) {
      //  $notification.error('Niet gevonden', url + ' kon niet worden gevonden');
      //} else if (error.status === 500) {
      //  $notification.error('Connectie Probleem', 'Er is een interne fout opgetreden op de server van ' + url);
      //} else if (error.status === 502 || error.status === 504) {
      //  $notification.error('Connectie Probleem', 'De server van ' + url + ' is niet beschikbaar.');
      //} else {
      //  $notification.error('Connectie Probleem', 'Er is een probleem met de VSKO-services voor ' + url);
      //}
      d.reject(error);
    });
    return d.promise;
  };

  var getAllFromResults = function (data) {
    var defer = $q.defer();
    var results = [];
    for (var i = 0; i < data.results.length; i++) {
      results.push(data.results[i].$$expanded);
    }

    if (data.$$meta.next) {
      that.getResource(data.$$meta.next).then(function (next) {
        getAllFromResults(next).then(function (next_results) {
          results = results.concat(next_results);
          defer.resolve(results);
        });
      }, function (error) {
        // TODO : Error notification to the user ?
        // or send to /log...
        defer.reject(error);
      });
    } else {
      defer.resolve(results);
    }

    return defer.promise;
  };

  /* Retrieve a list resource (single page)
  that.getListResource = function (url, params, cancelPromise) {
      var d = $q.defer();
      $http({
          method: "GET",
          url: url,
          params: params,
          cache: false,
          timeout: cancelPromise
      }).success(function(resp) {
              var results = [];
              for(var i = 0; i < resp.results.length; i++) {
                  results.push(resp.results[i].$$expanded);
              }
              d.resolve({results: results, meta: resp.$$meta});
          }).error(function(error) {
              // TODO : Error to the user ? Or /log
              if(error.status === 403) {
                  $notification.error('Geen Rechten', 'U hebt onvoldoende rechten tot '+url);
              } else if(error.status === 404) {
                  $notification.error('Niet gevonden', href+' kon niet worden gevonden');
              } else if(error.status === 500) {
                  $notification.error('Connectie Probleem', 'Er is een interne fout opgetreden op de server van '+url);
              } else if(error.status === 502 || error.status === 504){
                  $notification.error('Connectie Probleem', 'De server van '+url+' is niet beschikbaar.');
              } else {
                  $notification.error('Connectie Probleem', 'Er is een probleem met de VSKO-services voor '+url);
              }
              d.reject(error);
          });
      return d.promise;
  };*/

  /* Retrieve a list resource, perform paging to get all pages */
  that.getListResourcePaged = function (url, params, cancelPromise) {
    var d = $q.defer();
    $http({
      method: "GET",
      url: url,
      params: params,
      withCredentials: true,
      cache: false,
      timeout: cancelPromise
    }).success(function (resp) {
      getAllFromResults(resp).then(function (allResults) {
        // Add individual resources to resource cache.
        angular.forEach(allResults, function (element) {
          if (element.$$meta && element.$$meta.permalink) {
            hrefToResource[element.$$meta.permalink] = element;
          }
        });
        d.resolve({ results: allResults, meta: resp.$$meta });
      });
    }).error(function (error) {
      // TODO : Error to the user ? or /log ? Or generic message + /log
      //if (error.status === 403) {
      //  $notification.error('Geen Rechten', 'U hebt onvoldoende rechten tot ' + url);
      //} else if (error.status === 404) {
      //  $notification.error('Niet gevonden', url + ' kon niet worden gevonden');
      //} else if (error.status === 500) {
      //  $notification.error('Connectie Probleem', 'Er is een interne fout opgetreden op de server van ' + url);
      //} else if (error.status === 502 || error.status === 504) {
      //  $notification.error('Connectie Probleem', 'De server van ' + url + ' is niet beschikbaar.');
      //} else {
      //  $notification.error('Connectie Probleem', 'Er is een probleem met de VSKO-services voor ' + url);
      //}
      d.reject(error);
    });

    return d.promise;
  };

  that.createOrUpdateResource = function (baseUrl, resource) {
    var defer = $q.defer();

    $http({
      method: 'PUT',
      url: baseUrl + resource.$$meta.permalink,
      data: resource,
      withCredentials: true,
      contentType: 'application/json',
      dataType: 'json'
    }).success(function (data, status) {
      var resp = {
        statusCode: status
      };

      // Remove from expand cache.
      delete hrefToResource[resource.$$meta.permalink];

      defer.resolve(resp);
    }).error(function (error) {
      console.error("createOrUpdateResource failed, rejecting promise.");
      console.error(error);
      defer.reject(error);
    });

    return defer.promise;
  };

  that.updateResource = function (baseUrl, resource) {
    var defer = $q.defer();

    $http({
      method: 'PUT',
      url: baseUrl + resource.$$meta.permalink,
      data: resource,
      withCredentials: true,
      contentType: 'application/json',
      dataType: 'json'
    }).success(function (data, status) {
      var resp = {
        statusCode: status
      };

      // Remove from expand cache.
      delete hrefToResource[resource.$$meta.permalink];

      defer.resolve(resp);
    }).error(function (resp) {
      defer.reject(resp);
    });

    return defer.promise;
  };

  that.deleteResource = function (baseUrl, resource) {
    var defer = $q.defer();

    $http({
      method: 'DELETE',
      url: baseUrl + resource.$$meta.permalink,
      withCredentials: true
    }).success(function (data, status) {
      var resp = {
        statusCode: status
      };

      // Remove from expand cache.
      delete hrefToResource[resource.$$meta.permalink];

      defer.resolve(resp);
    }).error(function (resp) {
      var resp = {
        statusCode: status
      };
      defer.reject(resp);
    });

    return defer.promise;
  };

  that.batch = function (baseUrl, batch) {
    var defer = $q.defer();

    $http({
      method: 'PUT',
      url: baseUrl + '/batch',
      data: batch,
      withCredentials: true,
      contentType: 'application/json',
      dataType: 'json'
    }).success(function (data, status) {
      var resp = {
        statusCode: status
      };

      // Remove from expand cache.
      for (var i = 0; i < batch.length; i++) {
        delete hrefToResource[batch[i].href];
      }

      defer.resolve(resp);
    }).error(function (resp) {
      defer.reject(resp);
    });

    return defer.promise;
  };

  /*
  Retrieve the given url for the given values in batch
  So GET /message?postedinParties=*, [a,b,c,d,e,f,g,...] will
  generate a sequence of GET operations, batching a,b,c,d,... first and
  in a second get using e,f,g,... to avoid URLs longer than 1 kb, and
  to batch as much as possible.
  */
  that.getPatternBatch = function(urlPatternWithStar, valuesForStar, params) {
    var defer = $q.defer();

    var urls = [];
    var url = urlPatternWithStar;
    var i;
    var promises = [];
    var ret;

    while(valuesForStar.length > 0) {
      url = url.replace(/\*/,valuesForStar.pop() + ',*');
      if(url.length > 900) {
        url = url.replace(/,\*/,'');
        urls.push(url);
        url = urlPatternWithStar;
      }
    }
    if(url !== urlPatternWithStar) {
      url = url.replace(/,\*/,'');
      urls.push(url);
    }

    for(i=0; i<urls.length; i++) {
      promises.push(that.getListResourcePaged(urls[i], params));
    }

    $q.all(promises).then(function (results) {
      ret = [];
      for(i=0; i<results.length; i++) {
        ret = ret.concat(results[i].results);
      }
      defer.resolve(ret);
    }).catch(function (error) {
      defer.reject(error);
    });

    return defer.promise;
  }

  var toArray = function (list) {
    var ret = {};

    angular.forEach(list.results, function (value, key) {
      ret[value.$$meta.href] = value;
    });

    return ret;
  };

  var hrefToResource = {};

  expandOne = function (resource, key) {
    var defer = $q.defer();

    var cached = hrefToResource[resource[key].href];
    if (!cached) {
      that.getResource(resource[key].href)
          .then(function (data) {
            resource[key].$$expanded = data;
            hrefToResource[resource[key].href] = data;
            defer.resolve(resource);
          }, function (error) {
            // TODO
          });
    } else {
      resource[key].$$expanded = cached;
      defer.resolve(resource);
    }

    return defer.promise;
  };

  // Do client-side expansion (with local caching) on a list of resources, for one or more keys.
  that.expand = function (resources, keys) {
    var promises = [];

    if (!(resources instanceof Array)) {
      resources = [resources];
    }

    if (!(keys instanceof Array)) {
      keys = [keys];
    }

    angular.forEach(resources, function (resource) {
      angular.forEach(keys, function (key) {
        promises.push(expandOne(resource, key));
      });
    });

    return $q.all(promises);
  };

  return that;
}]);
