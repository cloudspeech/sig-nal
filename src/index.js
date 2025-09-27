// imports
import { signal, computed } from './turbo-signal.js';

// module globals

// an initializable WeakMap

class initWeakMap extends WeakMap {
  use = (key, initializer = {}) =>
    this.get(key) || this.set(key, initializer).get(key);
}

let signalMap = new initWeakMap(),
  plugins = {},
  loaded = {};

// helpers

// convert a string value
let convert = (stringValue, type) =>
  type === 'number' ? stringValue | 0 : stringValue;

// construct a a context for handlers in hydration descriptions
let context = (self, id, specialAttribute, kind, name) => {
  // self is a sig-nal *instance*:
  // extract interesting public methods from it
  let { getById, ctx } = self;
  // given an 'id' value, get its DOM node
  let domNode = getById(id);
  // get the signal name from the value of the special attribute
  // (e.g. 'counter' from .textContent="counter")
  let signalName = domNode.getAttribute(specialAttribute);
  // get the map of all signals registered in the present scope
  let signals = signalMap.get(ctx.scope) || NONE;
  // get the particular signal that the special attribute references
  let signal = signals[signalName];
  // now that we have dealt with the special attribute, schedule its removal
  queueMicrotask(() => domNode.removeAttribute(specialAttribute));
  // return a handler function factory that gets the context info
  // assembled above. A concrete handler function instance is
  // usable as an e(vent) handler.
  return handler => e =>
    handler({ getById, ctx, name, signal, signals, id, kind, e });
};

// <sig-nal> class
class SigNal extends HTMLElement {
  // private class fields
  #GA = name => this.getAttribute(name); // shorthand method

  // public class fields
  getById = null; // will contain a function to get a DOM node by 'id' value

  ctx = null; // will contain a c(on)t(e)x(t)

  // static public class fields

  // re-export signal creator function
  static signal = signal; // e.g. signal(3)
  static computed = computed; // e.g. computed(() => signal.value % 2)

  // hydrate the DOM tree under root from a hydration 'description',
  // using the named sig-nal instance 'self'

  static hydrate = description => self => {
    // for all 'id' values in outermost layer of description:
    for (let id in description) {
      // get the special attributes on the node referenced by 'id'
      let specialAttributes = description[id];
      // for each special attribute (s.a.):
      for (let specialAttribute in specialAttributes) {
        // interpret it
        let [handler, attributeName, firstChar, options = {}] = [
          specialAttributes[specialAttribute], // the s.a. value
          specialAttribute.slice(1), // the rest of the s.a.
          specialAttribute[0] // the s.a.'s first character
        ];
        // handle special-case handler format: [handlerFunction, eventListenerOptions]
        if (Array.isArray(handler)) {
          [handler, options] = [handler[0], handler[1]];
        }
        // classify special attribute by its first character's index
        let kind = '@.?!:'.indexOf(firstChar); // @ = 0, . = 1, ...
        // skip non-special attributes (must be an error in the description)
        if (kind < 0) continue;
        // construct a callback function by passing the handler to a context
        let callback = context(
          self,
          id,
          specialAttribute,
          kind,
          attributeName
        )(handler);
        // if not the event listener kind
        if (kind) {
          // execute callback right away
          callback();
        } else {
          // register event listener using callback
          self.getById(id).addEventListener(attributeName, callback, options);
        }
      }
    }
  };

  // plugin-extension-mechanis methods

  static plugin = (name, code) =>
    (plugins[name] = code) && loaded[name] && loaded[name]();

  static usable = (arrayOfPluginNames, promises = []) => {
    for (let name of arrayOfPluginNames) {
      if (!plugins[name])
        promises.push(new Promise(resolve => (loaded[name] = resolve)));
    }
    return Promise.all(promises);
  };

  // convenience methods to be used in hydration descriptions:

  static index =
    (attrs, props = attrs.map(attr => attr.slice(1))) =>
    ({ getById, ctx: { name }, signal }) =>
    (model = signal.value) => {
      for (let i = 0, n = model.length, item, node, isArray, j; i < n; i++) {
        item = model[i];
        isArray = Array.isArray(item);
        if (item === undefined) continue;
        node = getById(name + i);
        j = 0;
        for (let attr of attrs) {
          if (node.hasAttribute(attr)) {
            node[props[j]] = isArray ? item[j] : item;
          }
          j++;
        }
      }
    };

  // default DOM renderer: given a context, produce a signal.effect callback that
  // knows how to render familiar DOM property/method updates
  static render =
    ({ signal, getById, id, name, kind }) =>
    (value = signal.value, domNode = getById(id)) => {
      value = typeof value === 'function' ? value() : value;
      if (/^dataset\.\S+/.test(name)) {
        domNode.dataset[name.slice(8)] = value;
      } else if (value !== null) {
        kind === 4 ? domNode[name](value) : (domNode[name] = value);
      }
    };

  // given a callback, produce a function mapping context parameter to a
  // signal.effect registration with the callback bound to said context.
  // (by default, also execute the callback initially, not just when the signal
  // value changes)
  static renderWith =
    (callback, initial = true) =>
    parameters =>
      parameters.signal.effect(callback(parameters), initial);

  // upon signal changes, re-render using the default DOM renderer
  static rerender = SigNal.renderWith(SigNal.render);

  constructor() {
    super();
    // cache lots of attribute values determining the
    // behaviour of this <sig-nal> instance
    let root = this[this.#GA('for') || 'parentNode'];
    let scope = this.#GA('scope');
    scope = scope ? this.closest(scope) : this.getRootNode();
    let isShadowDOM = scope instanceof ShadowRoot;
    let isSignal = this.#GA('new');
    let name = isSignal || this.#GA('ref') || crypto.randomUUID();
    let type = this.#GA('type');
    let [defaultAttribute, defaultId] = (this.#GA('default') || '').split('#');

    let { id, textContent } = this;

    // determine the fastest id-getter function, taking into account whether
    // we're inside ShadowDOM or not
    this.getById = isShadowDOM
      ? id => root.querySelector('#' + id)
      : id => document.getElementById(id); // fastest
    // bundle up attributes of this instance (some derived,
    // some directly cached), to later serve as callback context
    this.ctx = { root, scope, name, type, id, description: textContent };

    // are we asked to create a signal instance?
    if (isSignal) {
      // yes, determine its initial value-as-string
      let value = defaultAttribute
        ? this.getById(defaultId)[defaultAttribute.slice(1)]
        : this.#GA('value');
      // then create and enter it into a map under our current scope
      // with type-appropriate value conversion
      signalMap.use(scope)[name] = signal(convert(value, type));
    }

    // are we asked to automatically enrich the DOM tree under
    // our root with 'id' values if they are missing?
    if (this.#GA('index') !== null) {
      // yes, set up
      let indexWalker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT
      );
      let i = 0,
        node,
        id;
      // now walk the DOM tree starting from root:
      while (indexWalker.nextNode()) {
        // get the current node,
        let node = indexWalker.currentNode;
        // (skipping our own <sig-nal> node, of course)
        if (node === this) continue;
        // if marked as needing an index,
        // assign a *computed* unique 'id' value scoped to the <sig-nal new=name>
        if (node.id === name) node.id = `${name}${i++}`;
      }
    }

    // do we have an inlined-as-text-child-node hydration description?
    if (this.#GA('hydrate') !== null) {
      // yes, evaluate it
      new Function(
        `let{hydrate,render,rerender,renderWith,index}=customElements.get('sig-nal');return hydrate(${textContent})`
      )()(this);
      // remove the text child node
      textContent = '';
      // send an initial event
      root.dispatchEvent(new Event('init'));
    }

    // unless the presence of some CSS class(es) rescues it...
    if (!this.className) {
      // ... this element will be replaced by its child text
      // (which we can do because we rescued all its parameters into closures living inside hydrate)
      this.replaceWith(textContent);
    }
  } // end constructor
} // end class SigNal

// register custom element
customElements.define('sig-nal', SigNal);
