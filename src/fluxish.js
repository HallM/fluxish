class Fluxish {
  constructor() {
    this._storeStates = {};
    this._stores = {};
    this._actions = {};
    this._writableContext = {
      stores: {},
      actions: {}
    };
    this._readOnlyContext = {
      stores: {},
      actions: {}
    };
    this._listeners = {};
  }

  getContext() {
    return this._readOnlyContext;
  }

  loadStores(stores, replaceIfExists = false) {
    for (const storeName in stores) {
      const notExisting = !this._stores.hasOwnProperty(storeName);
      if (notExisting || replaceIfExists) {
        const store = stores[storeName];

        let storeWriteContext = {};
        let storeReadContext = {};

        for (const funtionName in store.mutators) {
          storeWriteContext[funtionName] = this._createMutatorFuncWrapper(store.mutators[funtionName], storeName);
        }

        for (const funtionName in store.getters) {
          const wrappedFunction = this._createGetterFuncWrapper(store.getters[funtionName], storeName);
          storeReadContext[funtionName] = wrappedFunction;
          storeWriteContext[funtionName] = wrappedFunction;
        }

        this._writableContext.stores[storeName] = storeWriteContext;
        this._readOnlyContext.stores[storeName] = storeReadContext;
        this._stores[storeName] = store;

        if (notExisting && store.initialState) {
          this._storeStates[storeName] = store.initialState();
        }
      }
    }
  }

  loadActions(actions, replaceIfExists = false) {
    for (const actionName in actions) {
      if (!this._actions.hasOwnProperty(actionName) || replaceIfExists) {
        const action = actions[actionName];

        const wrappedFunction = this._createActionFuncWrapper(action);

        this._writableContext.actions[actionName] = wrappedFunction;
        this._readOnlyContext.actions[actionName] = wrappedFunction;
        this._actions[actionName] = action;
      }
    }
  }

  listen(storeName, listener) {
    if (!this._listeners.hasOwnProperty(storeName)) {
      this._listeners[storeName] = [listener];
    } else {
      this._listeners[storeName].push(listener);
    }

    return () => {
      const index = this._listeners[storeName].indexOf(listener);
      this._listeners[storeName].splice(index, 1);
    };
  }

  _createMutatorFuncWrapper(fn, storeName) {
    return (...params) => {
      let newData = fn.apply(this._stores[storeName].mutators, [this._readOnlyContext, this._storeStates[storeName], ...params]);
      if (newData !== undefined) {
        this._storeStates[storeName] = newData;
        if (this._listeners[storeName]) {
          this._listeners[storeName].forEach(listener => listener(this._readOnlyContext));
        }
      }
    };
  }

  _createGetterFuncWrapper(fn, storeName) {
    return (...params) => {
      return fn.apply(this._stores[storeName].getters, [this._storeStates[storeName], ...params]);
    };
  }

  _createActionFuncWrapper(fn) {
    return (...params) => {
      return fn(this._writableContext, ...params);
    };
  }
}

export default Fluxish;
