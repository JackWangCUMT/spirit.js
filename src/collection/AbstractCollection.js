/* jshint ignore:start */

(function(ns) {

	'use strict';


	// Default options for `Collection#set`.
	var setOptions = {add: true, remove: true, merge: true};
	var addOptions = {add: true, remove: false};


	ns.AbstractCollection = function(models, options) {

		// parse model!
		this.model = exist(this.model) ? use(this.model) : use('spirit.model').AbstractModel;

		options || (options = {});
		if (options.model) {
			this.model = options.model;
		}
		if (options.comparator !== void 0) {
			this.comparator = options.comparator;
		}
		this._reset();
		this.initialize.apply(this, arguments);
		if (models) {
			this.reset(models, _.extend({silent: true}, options));
		}
	};


	ns.AbstractCollection.extend = _.extendObjectWithSuper;
	_.extend(ns.AbstractCollection.prototype, use('spirit.event').Events, {


		// The default model for a collection is just a **Backbone.Model**.
		// This should be overridden in most cases.
		model: 'spirit.model.AbstractModel',

		// Initialize is an empty function by default. Override it with your own
		// initialization logic.
		initialize: function() {},

		// The JSON representation of a Collection is an array of the
		// models' attributes.
		toJSON: function(options) {
			return this.map(function(model) { return model.toJSON(options); });
		},

		// Add a model, or list of models to the set.
		add: function(models, options) {
			return this.set(models, _.extend({merge: false}, options, addOptions));
		},

		// Remove a model, or a list of models from the set.
		remove: function(models, options) {
			var singular = !_.isArray(models);
			models = singular ? [models] : _.clone(models);
			options || (options = {});
			var i, l, index, model;
			for (i = 0, l = models.length; i < l; i++) {
				model = models[i] = this.get(models[i]);
				if (!model) {
					continue;
				}
				delete this._byId[model.id];
				delete this._byId[model.cid];
				index = this.indexOf(model);
				this.models.splice(index, 1);
				this.length--;
				if (!options.silent) {
					options.index = index;
					model.trigger('remove', model, this, options);
				}
				this._removeReference(model);
			}
			return singular ? models[0] : models;
		},

		// Update a collection by `set`-ing a new list of models, adding new ones,
		// removing models that are no longer present, and merging models that
		// already exist in the collection, as necessary. Similar to **Model#set**,
		// the core operation for updating the data contained by the collection.
		set: function(models, options) {
			options = _.defaults({}, options, setOptions);
			if (options.parse) {
				models = this.parse(models, options);
			}
			var singular = !_.isArray(models);
			models = singular ? (models ? [models] : []) : _.clone(models);
			var i, l, id, model, attrs, existing, sort;
			var at = options.at;
			var targetModel = this.model;
			var sortable = this.comparator && (at == null) && options.sort !== false;
			var sortAttr = _.isString(this.comparator) ? this.comparator : null;
			var toAdd = [], toRemove = [], modelMap = {};
			var add = options.add, merge = options.merge, remove = options.remove;
			var order = !sortable && add && remove ? [] : false;

			// Turn bare objects into model references, and prevent invalid models
			// from being added.
			for (i = 0, l = models.length; i < l; i++) {
				attrs = models[i];
				if (attrs instanceof use('spirit.model').AbstractModel) {
					id = model = attrs;
				} else {
					id = attrs[targetModel.prototype.idAttribute];
				}

				// If a duplicate is found, prevent it from being added and
				// optionally merge it into the existing model.
				if (existing = this.get(id)) {
					if (remove) {
						modelMap[existing.cid] = true;
					}
					if (merge) {
						attrs = attrs === model ? model.attributes : attrs;
						if (options.parse) {
							attrs = existing.parse(attrs, options);
						}
						existing.set(attrs, options);
						if (sortable && !sort && existing.hasChanged(sortAttr)) {
							sort = true;
						}
					}
					models[i] = existing;

					// If this is a new, valid model, push it to the `toAdd` list.
				} else if (add) {
					model = models[i] = this._prepareModel(attrs, options);
					if (!model) {
						continue;
					}
					toAdd.push(model);

					// Listen to added models' events, and index models for lookup by
					// `id` and by `cid`.
					model.on('all', this._onModelEvent, this);
					this._byId[model.cid] = model;
					if (model.id != null) {
						this._byId[model.id] = model;
					}
				}
				if (order) {
					order.push(existing || model);
				}
			}

			// Remove nonexistent models if appropriate.
			if (remove) {
				for (i = 0, l = this.length; i < l; ++i) {
					if (!modelMap[(model = this.models[i]).cid]) {
						toRemove.push(model);
					}
				}
				if (toRemove.length) {
					this.remove(toRemove, options);
				}
			}

			// See if sorting is needed, update `length` and splice in new models.
			if (toAdd.length || (order && order.length)) {
				if (sortable) {
					sort = true;
				}
				this.length += toAdd.length;
				if (at != null) {
					for (i = 0, l = toAdd.length; i < l; i++) {
						this.models.splice(at + i, 0, toAdd[i]);
					}
				} else {
					if (order) {
						this.models.length = 0;
					}
					var orderedModels = order || toAdd;
					for (i = 0, l = orderedModels.length; i < l; i++) {
						this.models.push(orderedModels[i]);
					}
				}
			}

			// Silently sort the collection if appropriate.
			if (sort) {
				this.sort({silent: true});
			}

			// Unless silenced, it's time to fire all appropriate add/sort events.
			if (!options.silent) {
				for (i = 0, l = toAdd.length; i < l; i++) {
					(model = toAdd[i]).trigger('add', model, this, options);
				}
				if (sort || (order && order.length)) {
					this.trigger('sort', this, options);
				}
			}

			// Return the added (or merged) model (or models).
			return singular ? models[0] : models;
		},

		// When you have more items than you want to add or remove individually,
		// you can reset the entire set with a new list of models, without firing
		// any granular `add` or `remove` events. Fires `reset` when finished.
		// Useful for bulk operations and optimizations.
		reset: function(models, options) {
			options || (options = {});
			for (var i = 0, l = this.models.length; i < l; i++) {
				this._removeReference(this.models[i]);
			}
			options.previousModels = this.models;
			this._reset();
			models = this.add(models, _.extend({silent: true}, options));
			if (!options.silent) {
				this.trigger('reset', this, options);
			}
			return models;
		},

		// Add a model to the end of the collection.
		push: function(model, options) {
			return this.add(model, _.extend({at: this.length}, options));
		},

		// Remove a model from the end of the collection.
		pop: function(options) {
			var model = this.at(this.length - 1);
			this.remove(model, options);
			return model;
		},

		// Add a model to the beginning of the collection.
		unshift: function(model, options) {
			return this.add(model, _.extend({at: 0}, options));
		},

		// Remove a model from the beginning of the collection.
		shift: function(options) {
			var model = this.at(0);
			this.remove(model, options);
			return model;
		},

		// Slice out a sub-array of models from the collection.
		slice: function() {
			return slice.apply(this.models, arguments);
		},

		// Get a model from the set by id.
		get: function(obj) {
			if (obj == null) {
				return void 0;
			}
			return this._byId[obj.id] || this._byId[obj.cid] || this._byId[obj];
		},

		// Get the model at the given index.
		at: function(index) {
			return this.models[index];
		},

		// Return models with matching attributes. Useful for simple cases of
		// `filter`.
		where: function(attrs, first) {
			if (_.isEmpty(attrs)) {
				return first ? void 0 : [];
			}
			return this[first ? 'find' : 'filter'](function(model) {
				for (var key in attrs) {
					if (attrs[key] !== model.get(key)) {
						return false;
					}
				}
				return true;
			});
		},

		// Return the first model with matching attributes. Useful for simple cases
		// of `find`.
		findWhere: function(attrs) {
			return this.where(attrs, true);
		},

		// Force the collection to re-sort itself. You don't need to call this under
		// normal circumstances, as the set will maintain sort order as each item
		// is added.
		sort: function(options) {
			if (!this.comparator) {
				throw new Error('Cannot sort a set without a comparator');
			}
			options || (options = {});

			// Run sort based on type of `comparator`.
			if (_.isString(this.comparator) || this.comparator.length === 1) {
				this.models = this.sortBy(this.comparator, this);
			} else {
				this.models.sort(_.bind(this.comparator, this));
			}

			if (!options.silent) {
				this.trigger('sort', this, options);
			}
			return this;
		},

		// Pluck an attribute from each model in the collection.
		pluck: function(attr) {
			return _.invoke(this.models, 'get', attr);
		},


		// Create a new instance of a model in this collection. Add the model to the
		// collection immediately, unless `wait: true` is passed, in which case we
		// wait for the server to agree.
		create: function(model, options) {
			options = options ? _.clone(options) : {};
			if (!(model = this._prepareModel(model, options))) {
				return false;
			}
			if (!options.wait) {
				this.add(model, options);
			}
			var collection = this;
			var success = options.success;
			options.success = function(model, resp, options) {
				if (options.wait) {
					collection.add(model, options);
				}
				if (success) {
					success(model, resp, options);
				}
			};
			model.save(null, options);
			return model;
		},

		// **parse** converts a response into a list of models to be added to the
		// collection. The default implementation is just to pass it through.
		parse: function(resp, options) {
			return resp;
		},

		// Create a new collection with an identical list of models as this one.
		clone: function() {
			return new this.constructor(this.models);
		},

		// Private method to reset all internal state. Called when the collection
		// is first initialized or reset.
		_reset: function() {
			this.length = 0;
			this.models = [];
			this._byId = {};
		},

		// Prepare a hash of attributes (or other model) to be added to this
		// collection.
		_prepareModel: function(attrs, options) {
			if (attrs instanceof use('spirit.model').AbstractModel) {
				if (!attrs.collection) {
					attrs.collection = this;
				}
				return attrs;
			}
			options = options ? _.clone(options) : {};
			options.collection = this;
			var model = new this.model(attrs, options);
			if (!model.validationError) {
				return model;
			}
			this.trigger('invalid', this, model.validationError, options);
			return false;
		},

		// Internal method to sever a model's ties to a collection.
		_removeReference: function(model) {
			if (this === model.collection) {
				delete model.collection;
			}
			model.off('all', this._onModelEvent, this);
		},

		// Internal method called every time a model in the set fires an event.
		// Sets need to update their indexes when models change ids. All other
		// events simply proxy through. "add" and "remove" events that originate
		// in other collections are ignored.
		_onModelEvent: function(event, model, collection, options) {
			if ((event === 'add' || event === 'remove') && collection !== this) {
				return;
			}
			if (event === 'destroy') {
				this.remove(model, options);
			}
			if (model && event === 'change:' + model.idAttribute) {
				delete this._byId[model.previous(model.idAttribute)];
				if (model.id != null) {
					this._byId[model.id] = model;
				}
			}
			this.trigger.apply(this, arguments);
		}

	});

	/**
	 * Mark as parseable
	 * In model.defaults {} we can provide class, while creating instance defaults will be set
	 * @type {boolean}
	 */
	ns.AbstractCollection.parseable = true;


	// Underscore methods that we want to implement on the Collection.
	// 90% of the core usefulness of Backbone Collections is actually implemented
	// right here:
	var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
	               'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
	               'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
	               'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
	               'tail', 'drop', 'last', 'without', 'difference', 'indexOf', 'shuffle',
	               'lastIndexOf', 'isEmpty', 'chain'];

	// Mix in each Underscore method as a proxy to `Collection#models`.
	_.each(methods, function(method) {
		ns.AbstractCollection.prototype[method] = function() {
			var args = [].slice.call(arguments);
			args.unshift(this.models);
			return _[method].apply(_, args);
		};
	});


	// Underscore methods that take a property name as an argument.
	var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

	// Use attributes instead of properties.
	_.each(attributeMethods, function(method) {
		ns.AbstractCollection.prototype[method] = function(value, context) {
			var iterator = _.isFunction(value) ? value : function(model) {
				return model.get(value);
			};
			return _[method](this.models, iterator, context);
		};
	});


})(use('spirit.collection'));


/* jshint ignore:end */