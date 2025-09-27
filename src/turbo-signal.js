let EMPTY_ARRAY = [];

let values = [];
let id = 0;
let lastComputationIndex = -1;
let effects = [];
let registeringComputedSignalDependencies;
let registeredComputations = [];
let registeredSignalIndices = [];
let registry = new FinalizationRegistry(id => (values[id] = null));

let _update = registeredComputationIndex => {
  let signalIndex = registeredSignalIndices[registeredComputationIndex];
  let newValue = registeredComputations[registeredComputationIndex]();
  _value(signalIndex, newValue);
};

let _value = (index, newValue) => {
  values[index] = newValue;
  for (let thisEffect of effects[index] || EMPTY_ARRAY) {
    let type = typeof thisEffect;
    if (type === 'function') {
      thisEffect();
    } else if (type === 'number') {
      _update(thisEffect);
    }
  }
  return newValue;
};

let _effect = (index, callback, initial) => {
  if (initial) callback();
  let callbacks = (effects[index] = effects[index] || []);
  let callbackIndex = callbacks.length;
  callbacks[callbackIndex] = callback;
  return [index, callbackIndex];
};

export let uneffect = ([index, callbackIndex]) => {
  effects[index][callbackIndex] = null;
};

class Signal {
  #id;

  constructor() {
    this.#id = ++id;
    registry.register(this, id);
  }

  get value() {
    let index = this.#id;
    let dependencies = registeringComputedSignalDependencies;
    if (dependencies?.indexOf(index) < 0) {
      dependencies.push(index);
      dependencies.sort();
    }
    return values[index];
  }

  set value(newValue) {
    return _value(this.#id, newValue);
  }

  valueOf = () => this.value;

  toString = () => String(this.value);

  effect = (callback, initial) => _effect(this.#id, callback, initial);
}

export let signal = value => {
  let _signal = new Signal();

  let dependencies = registeringComputedSignalDependencies || EMPTY_ARRAY;

  for (let dependencyId; (dependencyId = dependencies.shift()); ) {
    if (!effects[dependencyId]) {
      effects[dependencyId] = [];
    }
    let dependencyEffects = effects[dependencyId];
    dependencyEffects.push(lastComputationIndex);
  }

  _signal.value = value;

  return _signal;
};

export let computed = callback => {
  registeringComputedSignalDependencies = [];
  let index = ++lastComputationIndex;
  registeredComputations[index] = callback;
  registeredSignalIndices[index] = id + 1;
  let _signal = signal(
    /* fills registeringComputedSignalDependencies */ callback()
  );
  registeringComputedSignalDependencies = null;
  return _signal;
};
