customElements.whenDefined("sig-nal").then(
  // register new plugin using static class method 'plugin'
  ({ Signal, plugin }) =>
    plugin(".classMap", map => parameters => {
      // get the classList of the referenced DOM node
      let cl = parameters.domNode.classList;
      // init a signal-valued dependencies set to empty
      let signals = new Set(); // using a set automatically de-duplicates!
      // define helpers
      let isFunction = value => typeof value === "function";
      let classMap = action => {
        // for all classes-as-keys in the map object:
        for (let aClass in map) {
          // get the Boolean value for the current class
          let value = map[aClass];
          if (isFunction(value)) value = value(parameters);
          // is it a time-changing signal value?
          if (value instanceof Signal) {
            // yes, run an action function with the signal value as parameter (e.g. to initialize something)
            if (isFunction(action)) action(value);
            // dereference the signal's value
            value = value.value;
          }
          // set or delete the class based on the truthiness of 'value'
          cl[value ? "add" : "remove"](aClass);
        }
        return;
      };
      // harvest all signal values in the class map and initialize the classes
      classMap(signal => signals.add(signal));
      // if no signals were found, the initialization in the previous step is enough...
      if (!signals.size) return; // ... so early exit here
      // otherwise, transform signals to array form
      let allSignals = [...signals.keys()];
      // arbitrarily, make first-in-array signal the master signal for reacting to changes
      // - re-executing classMap when a value update happens in the master signal -, with the remaing signals
      // in the array functioning as dependencies to the master signal that *also* trigger an update!
      allSignals[0].when(classMap, allSignals.slice(1));
    }),
);
