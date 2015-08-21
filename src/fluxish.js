class Fluxish {
  constructor() {
    this._storeStates = {};
    this._writableContext = {stores: {}, actions: {}};
    this._readOnlyContext = {stores: {}, actions: {}};
    this._listeners = {};
    this._actionhooks = {pre: [], post: []};
  }

  getContext() {
    return this._readOnlyContext;
  }

  loadStores(stores) {
    for (const storeName in stores) {
      const store = stores[storeName];

      let storeWriteContext = {};
      let storeReadContext = {};

      for (const funtionName in store.mutators) {
        storeWriteContext[funtionName] = _wrapMutator.call(this, store.mutators[funtionName], storeName, store.mutators);
      }

      for (const funtionName in store.getters) {
        const wrappedFunction = _wrapGetter.call(this, store.getters[funtionName], storeName, store.getters);
        storeWriteContext[funtionName] = storeReadContext[funtionName] = wrappedFunction;
      }

      this._writableContext.stores[storeName] = storeWriteContext;
      this._readOnlyContext.stores[storeName] = storeReadContext;

      if (!this._storeStates.hasOwnProperty(storeName)) {
        this._listeners[storeName] = [];

        if (store.initialState) {
          this._storeStates[storeName] = store.initialState();
        }
      }
    }
  }

  loadActions(actions) {
    for (const actionName in actions) {
      const action = actions[actionName];

      const wrappedFunction = _wrapAction.call(this, action);

      this._writableContext.actions[actionName] = this._readOnlyContext.actions[actionName] = wrappedFunction;
    }
  }

  addPreHook(hook) {
    return _addHook(this._actionhooks.pre, listener);
  }

  addPostHook(hook) {
    return _addHook(this._actionhooks.post, listener);
  }

  listen(storeName, listener) {
    return _addHook(this._listeners[storeName], listener);
  }
}

export default Fluxish;

function _wrapMutator(fn, storeName, ctx) {
  return (...params) => {
    const newData = fn.apply(ctx, [this._readOnlyContext, this._storeStates[storeName], ...params]);
    if (newData !== undefined) {
      this._storeStates[storeName] = newData;
      this._listeners[storeName].forEach(listener => listener(this._readOnlyContext));
    }
  };
}

function _wrapGetter(fn, storeName, ctx) {
  return (...params) => {
    return fn.apply(ctx, [this._storeStates[storeName], ...params]);
  };
}

function _wrapAction(fn, fnName) {
  return (...params) => {
    this._actionhooks.pre.forEach(hook => hook(this._readOnlyContext, fnName, ...params));
    fn(this._writableContext, ...params);
    this._actionhooks.post.forEach(hook => hook(this._readOnlyContext, fnName, ...params));
  };
}

function _addHook(hooks, fn) {
  if (hooks.indexOf(fn) === -1) {
    hooks.push(fn);
  }

  return () => {
    hooks.splice(hooks.indexOf(fn), 1);
  };
}
