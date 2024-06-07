// module constants
let NONE = {};
let INIT = [
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
let shadowMap = {};
let scopeMap = new initWeakMap();
let rootMap = new initWeakMap();
let signalMap = new initWeakMap();

// helpers
let convert = (value, type) => (type === "number" ? value | 0 : value);

// reactive signals class
class Signal {
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
    dependencies.map(dependency => dependency.onChange(this.#change));
    return derivedSignal;
  }
}

// <sig-nal> class

let plugins = {},
  loaded = {};

class SigNal extends HTMLElement {
  #GA = (name, node = this) => node.getAttribute(name);

  #add = (attribute, root) => {
    let firstChar = attribute[0],
      attributeName = attribute.slice(1),
      name = this.#GA(attribute, root),
      specialAttribute = ".?!@".indexOf(firstChar);
    if (specialAttribute >= 0) {
      let init = INIT[specialAttribute](root, attributeName);
      rootMap.use(root)[attribute] = { init, name };
      queueMicrotask(() => root.removeAttribute(attribute));
    }
  };

  static Signal = Signal;

  static hydrate = (selectors, descriptors, exportedSignals) => {
    let scopes =
      typeof selectors === "string"
        ? shadowMap[selectors]
        : selectors.map(
            selector => document.querySelector(selector).shadowRoot,
          );
    for (let scope of scopes) {
      // scope already h(ydrated)?
      if (!scope.h) {
        // no, mark it as such to de-duplicate hydrate requests per scope
        scope.h = 1;
        let signals = signalMap.get(scope) || NONE;
        for (let name in descriptors) {
          let domNode = scopeMap.get(scope)[name];
          let mapping = rootMap.get(domNode);
          if (mapping) {
            let properties = descriptors[name];
            for (let property in properties) {
              let handler = properties[property];
              if (property in plugins) handler = plugins[property](handler);
              let { name, init } = mapping[property.toLowerCase()] || NONE;
              let { signal, type, id } = (name && signals[name]) || NONE;
              if (exportedSignals instanceof Object && id && signal)
                exportedSignals[id] = signal;
              let attribute = property.slice(1);
              let callback = e =>
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
      }
    }
  };

  static plugin = (name, code) =>
    (plugins[name] = code) && loaded[name] && loaded[name]();

  static usable = (arrayOfPluginNames, promises = []) => {
    for (let name of arrayOfPluginNames) {
      if (!plugins[name])
        promises.push(new Promise(resolve => (loaded[name] = resolve)));
    }
    return Promise.all(promises);
  };

  static render =
    value =>
    ({ domNode, name }) => {
      value = typeof value === "function" ? value() : value;
      if (/^dataset\.\S+/.test(name)) {
        domNode.dataset[name.slice(8)] = value;
      } else {
        domNode[name] = value;
      }
    };

  static rerender = (parameters, initial = true) =>
    parameters.signal.onChange(
      value => SigNal.render(value)(parameters),
      initial,
    );

  connectedCallback() {
    let root = this[this.#GA("for") || "parentNode"];
    let scope = this.getRootNode();
    let isSignal = this.#GA("new");
    let name = isSignal || this.#GA("ref") || crypto.randomUUID();
    let type = this.#GA("type");
    let { id, textContent } = this;

    (shadowMap[name] = shadowMap[name] || []).push(scope);
    scopeMap.use(scope)[name] = root;

    if (isSignal) {
      signalMap.use(scope)[name] = {
        signal: new Signal(convert(textContent || this.#GA("value"), type)),
        type,
        id,
      };
    }

    for (let attribute of root.getAttributeNames()) {
      this.#add(attribute, root);
    }

    if (this.#GA("hydrate") !== null) {
      new Function(
        `let{hydrate,render,rerender}=customElements.get('sig-nal');hydrate('${name}',${textContent})`,
      )();
      textContent = "";
    }

    if (!this.className) {
      this.replaceWith(textContent);
    }
  }
}

customElements.define("sig-nal", SigNal);
