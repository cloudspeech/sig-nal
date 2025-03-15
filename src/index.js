// module constants
let NONE = {};
let INIT = [
  (root, attributeName) => root[attributeName],
  (root, attributeName) => root.hasAttribute(attributeName),
  (root, attributeName) => root.getAttribute(attributeName),
  root => 1,
  root => 0
];
let EXTRA_NON_BODY_PROPERTIES = ['selectedIndex'];

class initWeakMap extends WeakMap {
  use = (key, initializer = {}) =>
    this.get(key) || this.set(key, initializer).get(key);
}

// module globals
let shadowMap = {};
let scopeMap = new initWeakMap();
let rootMap = new initWeakMap();
let signalMap = new initWeakMap();
let { body } = document;

// e.g. ".textcontent" |-> "textContent", ...
let specialAttributesToProperties = {};

// helpers
let convert = (value, type) => (type === 'number' ? value | 0 : value);

let getAllProperties = (e = body, props = []) =>
  e.__proto__
    ? getAllProperties(e.__proto__, props.concat(Object.getOwnPropertyNames(e)))
    : [...new Set(props.concat(Object.getOwnPropertyNames(e)))];

// initialize special-attributes |-> propertyNames mapping from <body> properties
for (let property of [...getAllProperties(), ...EXTRA_NON_BODY_PROPERTIES]) {
  let propertyType = typeof body[property];
  let special = propertyType === 'function' ? ':' : '.';
  specialAttributesToProperties[special + property.toLowerCase()] = property;
}

// reactive signals class
class Signal {
  #value;
  #effects = [];
  #dirty = 0;

  constructor(newValue) {
    this.#value = newValue;
  }

  #changed = () =>
    ++this.#dirty === 1 &&
    queueMicrotask(() => {
      this.#effects.map(effect => effect());
      this.#dirty = 0;
    });

  get value() {
    return this.#value;
  }

  set value(newValue) {
    this.#value = newValue;
    this.#changed();
  }

  onChange(
    doThis,
    initial,
    index = this.#effects.length,
    effect = () => doThis(this.#value)
  ) {
    if (initial) effect();
    this.#effects[index] = effect;
    return index;
  }

  when(callback, dependencies = []) {
    let derivedSignal = new Signal();
    this.onChange(value => (derivedSignal.value = callback(value)), true);
    dependencies.map(dependency => dependency.onChange(this.#changed));
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
      kind = '.?!@:'.indexOf(firstChar);
    if (kind >= 0) {
      let init = INIT[kind](root, attributeName);
      rootMap.use(root)[attribute] = { init, name, kind };
      queueMicrotask(() => root.removeAttribute(attribute));
    }
  };

  static Signal = Signal;

  static hydrate = (selectors, descriptors, exportedSignals) => {
    let scopes =
      typeof selectors === 'string'
        ? shadowMap[selectors]
        : selectors.map(
            selector => document.querySelector(selector).shadowRoot
          );
    for (let scope of scopes) {
      // scope already h(ydrated)?
      if (!scope.h) {
        // no, mark it as such to de-duplicate hydrate requests per scope
        scope.h = 1;
        let signals = signalMap.get(scope) || NONE;
        for (let name in descriptors) {
          let descriptor = name;
          let domNodes = scopeMap.get(scope);
          let domNode = domNodes[name];
          let mapping = rootMap.get(domNode);
          if (mapping) {
            let properties = descriptors[name];
            for (let property in properties) {
              let handler = properties[property];
              if (property in plugins) handler = plugins[property](handler);
              let { name, init, kind } =
                mapping[property.toLowerCase()] || NONE;
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
                  kind,
                  domNode,
                  domNodes,
                  scope,
                  descriptor,
                  e
                });
              name &&
                (property.startsWith('@')
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
    ({ domNode, name, kind }) => {
      value = typeof value === 'function' ? value() : value;
      if (/^dataset\.\S+/.test(name)) {
        domNode.dataset[name.slice(8)] = value;
      } else if (value !== null) {
        kind === 4 ? domNode[name](value) : (domNode[name] = value);
      }
    };

  static renderWith =
    (callback, initial = true) =>
    parameters =>
      parameters.signal.onChange(callback(parameters), initial);

  static rerender = SigNal.renderWith(
    parameters => value => SigNal.render(value)(parameters)
  );

  static index =
    ({ scope, descriptor }) =>
    model => {
      for (let i = 0, n = model.length, item, node, selector; i < n; i++) {
        item = model[i];
        if (item !== undefined) {
          selector = descriptor + i;
          node =
            scope instanceof DocumentFragment
              ? scope.getElementById(selector)
              : scope.querySelector('#' + selector);
          for (
            let a = 0,
              attributeNames = node.getAttributeNames(),
              m = attributeNames.length,
              j = 0,
              isArray = Array.isArray(item),
              attribute;
            a < m;
            a++
          ) {
            attribute = attributeNames[a];
            if (attribute in specialAttributesToProperties) {
              node[specialAttributesToProperties[attribute]] = isArray
                ? item[j++]
                : item;
            }
          }
        }
      }
    };

  connectedCallback() {
    let root = this[this.#GA('for') || 'parentNode'];
    let scope = this.#GA('scope');
    scope = scope ? this.closest(scope) : this.getRootNode();
    let isSignal = this.#GA('new');
    let name = isSignal || this.#GA('ref') || crypto.randomUUID();
    let type = this.#GA('type');
    let { id, textContent } = this;

    (shadowMap[name] = shadowMap[name] || []).push(scope);
    scopeMap.use(scope)[name] = root;

    if (isSignal) {
      signalMap.use(scope)[name] = {
        signal: new Signal(convert(textContent || this.#GA('value'), type)),
        type,
        id
      };
    }

    for (let attribute of root.getAttributeNames()) {
      this.#add(attribute, root);
    }

    if (this.#GA('index') !== null) {
      let indexWalker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT
      );
      let i = 0,
        current;
      while (indexWalker.nextNode()) {
        let current = indexWalker.currentNode;
        if (current.id === name) current.id = `${name}${i++}`;
      }
    }

    if (this.#GA('hydrate') !== null) {
      new Function(
        `let{hydrate,render,rerender,renderWith,index}=customElements.get('sig-nal');hydrate('${name}',${textContent})`
      )();
      textContent = '';
      root.dispatchEvent(new Event('init'));
    }

    if (!this.className) {
      this.replaceWith(textContent);
    }
  } // end connectedCallback
} // end class SigNal

customElements.define('sig-nal', SigNal);
