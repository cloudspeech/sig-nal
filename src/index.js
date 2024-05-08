// module constants
const NONE = {};
const INIT = [
  (root, attributeName) => root[attributeName],
  (root, attributeName) => root.hasAttribute(attributeName),
  (root, attributeName) => root.getAttribute(attributeName),
  root => 1,
];

class initWeakMap extends WeakMap {
  use = (key, initializer = {}) =>
    this.get(key) || this.set(key, initializer).get(key);
}

// module globals
const scopeMap = new initWeakMap();
const rootMap = new initWeakMap();
const signalMap = new initWeakMap();

// helpers
const convert = (value, type) => (type === "number" ? value | 0 : value);

// reactive signals class
export class Signal {
  #value;
  #changes = [];
  #dirty = 0;

  constructor(newValue) {
    this.#value = newValue;
  }

  #change = () =>
    ++this.#dirty === 1 &&
    queueMicrotask(() => {
      this.#changes.map(fun => fun());
      this.#dirty = 0;
    });

  get value() {
    return this.#value;
  }

  set value(newValue) {
    this.#value = newValue;
    this.#change();
  }

  onChange(doThis, initial) {
    if (initial) doThis(this.#value);
    this.#changes.push(() => doThis(this.#value));
  }

  when(callback, dependencies = []) {
    let derivedSignal = new Signal(callback(this.#value));
    this.onChange(value => (derivedSignal.value = callback(value)));
    dependencies.forEach(dependency => dependency.when(this.#change));
    return derivedSignal;
  }
}

// <sig-nal> class

class SigNal extends HTMLElement {
  #GA = (name, node = this) => node.getAttribute(name);

  #add = (attribute, root) => {
    let firstChar = attribute[0],
      attributeName = attribute.slice(1),
      name = this.#GA(attribute, root),
      specialAttribute = ".?!@".indexOf(firstChar);
    if (specialAttribute >= 0) {
      const init = INIT[specialAttribute](root, attributeName);
      rootMap.use(root)[attribute] = { init, name };
      queueMicrotask(() => root.removeAttribute(attribute));
    }
  };

  static #plugins = {};

  static Signal = Signal;

  static hydrate = (selectors, descriptors, exportedSignals) => {
    for (let selector of selectors) {
      const scope = document.querySelector(selector).shadowRoot;
      const signals = signalMap.get(scope) || NONE;
      for (let name in descriptors) {
        const domNode = scopeMap.get(scope)[name];
        const mapping = rootMap.get(domNode);
        if (!mapping) continue;
        const properties = descriptors[name];
        for (let property in properties) {
          let handler = properties[property];
          if (property in SigNal.#plugins)
            handler = SigNal.#plugins[property](handler);
          const { name, init } = mapping[property.toLowerCase()] || NONE;
          const { signal, type, id } = (name && signals[name]) || NONE;
          if (exportedSignals instanceof Object && id && signal)
            exportedSignals[id] = signal;
          const attribute = property.slice(1);
          const callback = e =>
            handler({
              type,
              name: attribute,
              signal,
              signals,
              init,
              domNode,
              e,
            });
          name &&
            (property.startsWith("@")
              ? domNode.addEventListener(attribute, callback)
              : queueMicrotask(callback));
        }
      }
    }
  };

  static plugin = (name, code) => (SigNal.#plugins[name] = code);

  static rerender = ({ signal, name, domNode }, initial = true) =>
    signal.onChange(value => (domNode[name] = value), initial);

  static render =
    value =>
    ({ domNode, name }) =>
      (domNode[name] = typeof value === "function" ? value() : value);

  connectedCallback() {
    const root = this[this.#GA("for") || "parentNode"];
    const scope = this.getRootNode();
    const isSignal = this.#GA("new");
    const name = isSignal || this.#GA("ref");
    const type = this.#GA("type");
    const { id, textContent } = this;

    scopeMap.use(scope)[name] = root;

    if (isSignal) {
      signalMap.use(scope)[name] = {
        signal: new Signal(convert(textContent, type)),
        type,
        id,
      };
    }

    for (let attribute of root.getAttributeNames()) {
      this.#add(attribute, root);
    }

    if (!this.className) {
      this.replaceWith(textContent);
    }
  }
}

customElements.define("sig-nal", SigNal);
