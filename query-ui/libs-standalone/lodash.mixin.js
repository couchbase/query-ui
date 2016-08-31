_.mixin({isCollection: function (collection) {
  return _.isArray(collection) && _.every(collection, _.isPlainObject);
}});