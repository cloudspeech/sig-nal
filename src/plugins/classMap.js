// given sufficient context parameters that allow to get a specific DOM node...
export default ({ getById, id }) =>
  // yield a function from a class map (e.g. {even: a_signal_truthy_if_even, odd: a_signal_truthy_if_odd})...
  classMapObject => {
    // to this function body:
    // determine the specific DOM node
    let domNode = getById(id);
    // define a helper closure that - given a (possibly computed) signal and a class name - ...
    let mutateClass = (signal, className) =>
      // registers a signal effect...
      signal.effect(
        // which adds the named class to the DOM node if the just-changed signal value is truthy, and removes it otherwise...
        () => domNode.classList[signal.value ? 'add' : 'remove'](className),
        //
        true
      );
    // for all class names in the class map:
    for (let className in classMapObject) {
      // register the appropriate signal-change-triggered class-name addition/removal
      mutateClass(classMapObject[className], className);
    }
  };
