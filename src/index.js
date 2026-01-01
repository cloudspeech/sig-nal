// imports
import { signal, computed } from './turbo-signal.js';

// module globals

let _document = document, // improve minification
  SIGNAL = 'sig-nal',
  REPLACE = { '&': 'amp', '<': 'lt', '"': 'quot', "'": 'apos' };

/**
 * A WeakMap that initializes values on first access
 * @extends WeakMap
 */
class initWeakMap extends WeakMap {
  /**
   * Get or create a value for the given key
   * @param {object} key - The key to retrieve
   * @param {object} initializer - The initial value to set if key doesn't exist
   * @returns {object} The value associated with the key
   */
  use = (key, initializer = {}) =>
    this.get(key) || this.set(key, initializer).get(key);
}

let signalMap = new initWeakMap();

let plugins = new Proxy(
  {},
  {
    async get(target, prop) {
      return (await import('./plugins/' + prop + '.js')).default;
    }
  }
);

// helpers

/**
 * Convert a string value to the specified type
 * @param {string} stringValue - The string value to convert
 * @param {string} type - The type to convert to ('number' or any other type)
 * @returns {number|string} The converted value
 */
let convert = (stringValue, type) =>
  type === 'number' ? stringValue | 0 : stringValue;

/**
 * Construct a context for handlers in hydration descriptions
 * @param {SigNal} self - The sig-nal instance
 * @param {string} id - The element ID
 * @param {string} specialAttribute - The special attribute name (e.g., @click, .textContent)
 * @param {number} kind - The kind of special attribute (0=event, 1=property, 2=boolean, 3=attribute, 4=method)
 * @param {string} name - The attribute/method/property name
 * @param {HTMLElement} domNode - The DOM node to bind to
 * @param {Proxy} nodes - Proxy for accessing nodes by ID
 * @returns {Function} A handler function that receives a handler and returns an event handler
 */
let context = (self, id, specialAttribute, kind, name, domNode, nodes) => {
  // self is a sig-nal *instance*:
  // extract interesting public methods from it
  let { ctx } = self;
  // get the map of all signals registered in the present scope
  let signals = signalMap.get(ctx.scope);
  // get the particular signal via the signal instance's name,
  // cf. <sig-nal new="theName" ...>)
  let signal = signals && signals[self.name];
  // return a handler function factory that gets the context info
  // assembled above. A concrete handler function instance is
  // usable as an e(vent) handler.
  return handler => e =>
    handler({
      ctx,
      name,
      signal,
      signals,
      domNode,
      nodes,
      id,
      kind,
      e,
      plugins
    });
};

/**
 * Apply a value to a DOM node based on the kind of update
 * Kinds: @ = 0 (event listener), . = 1 (property), ? = 2 (boolean attribute), ! = 3 (attribute), : = 4 (method)
 * @param {*} value - The value to apply (can be a function that returns a value)
 * @param {string} name - The property/attribute/method name
 * @param {HTMLElement} domNode - The DOM node to update
 * @param {number} kind - The kind of DOM update to perform (0-4)
 */
let domEffect = (value, name, domNode, kind) => {
  // evaluate function values
  if (typeof value === 'function') value = value();
  // bail on null values
  if (value === null) return;
  switch (kind) {
    case 1:
      return (
        /* property-value-in-DOM
           not already identical
           to value? */ domNode[name] !== value &&
        /* Then set it */ (domNode[name] = value)
      );
    case 2:
      return domNode[value ? 'setAttribute' : 'removeAttribute'](name, '');
    case 3:
      return domNode.setAttribute(name, value);
    case 4:
      if (!Array.isArray(value)) value = [value];
      domNode[name](...value);
  }
};

let policy = trustedTypes.createPolicy(SIGNAL, {
  createHTML: string =>
    string.replace(/[&<"']/g, match => `&${REPLACE[match]};`)
});

// <sig-nal> class
class SigNal extends HTMLElement {
  // private class fields
  #getAttribute = name => this.getAttribute(name); // shorthand method

  // static public class fields

  /**
   * Re-export signal creator function
   * @param {*} value - The initial value for the signal
   * @returns {Signal} A new signal instance
   */
  static signal = signal;

  /**
   * Re-export computed signal creator function
   * @param {Function} fn - The function to compute the derived value
   * @returns {Signal} A new computed signal instance
   */
  static computed = computed;

  /**
   * Plugin-call helper for executing plugins
   * @param {Function} parametersToArgsFunction - Function to transform parameters to plugin arguments
   * @returns {Function} A function that accepts parameters and returns a promise resolving to the plugin result
   * @example
   * // Usage: .classMap: plugin(({signal}) => ({even: computed(() => !(signal.value & 1)), odd: computed(() => signal.value & 1) }))
   */
  static plugin = parametersToArgsFunction => parameters =>
    parameters.plugins[parameters.name].then(callback =>
      callback(parameters)(parametersToArgsFunction(parameters))
    );

  /**
   * Hydrate the DOM tree under root from a hydration description
   * @param {Object} description - The hydration description object mapping IDs to special attributes
   * @returns {Function} A function that accepts a sig-nal instance and performs the hydration
   */
  static hydrate = description => self => {
    let { getById, root } = self;
    // install a convenience proxy to get (DOM) nodes by id
    let nodes = new Proxy(
      {},
      {
        get(_, id) {
          return getById(id);
        }
      }
    );
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
        // given an 'id' value, get its DOM node
        let domNode = id ? getById(id) : root;
        let callback = context(
          self,
          id,
          specialAttribute,
          kind,
          attributeName,
          domNode,
          nodes
        )(handler);
        // if not the event-listener kind
        if (kind) {
          // execute callback right away
          callback();
        } else {
          // otherwise register event listener using callback
          domNode.addEventListener(attributeName, callback, options);
        }
      }
    }
  };

  // convenience methods to be used in hydration descriptions:

  /**
   * Create an HTML template function from a DOM node or template
   * @param {HTMLElement|HTMLTemplateElement} node - The DOM node or template element
   * @param {Object} placeholders - Object mapping placeholder names to values
   * @param {boolean} [lazy=false] - If true, returns the function; if false, executes it immediately
   * @returns {Function|string} The template function or its result
   */
  static html = (node, placeholders, lazy) => {
    // is the (DOM) node a <template>?
    if (node instanceof HTMLTemplateElement) {
      // yes, get its actual content
      node = node.content.firstElementChild;
    }
    // make a string of comma-separated placeholder names/keys
    let commaSeparatedPlaceholders = Object.keys(placeholders).join(',');
    // construct a function that maps the placeholder values
    // to a template literal made from the node's string representation (outerHTML)
    // (assumed to exhibit the placeholder names, in-order)
    let fun = new Function(
      commaSeparatedPlaceholders,
      'return \`' + node.outerHTML + '\`'
    );
    // return the function itself, if lazy evaluation is desired, otherwise return
    // the *result* of eagerly invoking the function with the placeholder values, in-order
    return lazy ? fun : fun(...Object.values(placeholders));
  };

  static sane = string => policy.createHTML(string);

  /**
   * Create a renderer for object-based models that updates DOM element properties
   * @param {Object} context - The context object containing nodes, name, and signal
   * @param {Proxy} context.nodes - Proxy to get elements by ID
   * @param {Object} context.ctx - C(on)t(e)x(t) object with name property
   * @param {Signal} context.signal - The signal containing the model
   * @returns {Function} A renderer function that updates DOM elements based on the model
   */
  static object =
    ({ nodes, ctx: { name }, signal }) =>
    (model = signal.value) => {
      for (let i = 0, n = model?.length | 0, item, node; i < n; i++) {
        item = model[i];
        node = nodes[name + i];
        if (item === undefined || !node) continue;
        for (let property in item)
          domEffect(item[property], property, node, /* kind: .property */ 1);
      }
    };

  /**
   * Default DOM renderer: produces a signal.effect callback that updates DOM elements
   * @param {Object} context - The render context
   * @param {Signal} context.signal - The signal to observe
   * @param {Proxy} context.nodes - Proxy to get elements by ID
   * @param {string} context.id - The element ID
   * @param {string} context.name - The property/attribute/method name
   * @param {number} context.kind - The kind of DOM update (0-4)
   * @returns {Function} A render function that can be used with signal.effect
   */
  static render =
    ({ signal, nodes, id, name, kind }) =>
    (value = signal.value, domNode = nodes[id]) =>
      domEffect(value, name, domNode, kind);

  /**
   * Create a function that maps context parameters to a signal.effect registration
   * @param {Function} callback - The callback function to bind to the context
   * @param {boolean} [initial=true] - Whether to execute the callback initially
   * @returns {Function} A function that accepts parameters and registers the effect
   */
  static renderWith =
    (callback, initial = true) =>
    parameters =>
      parameters.signal.effect(callback(parameters), initial);

  /**
   * Re-render the DOM upon signal changes using the default DOM renderer
   * @type {Function}
   */
  static rerender = SigNal.renderWith(SigNal.render);

  constructor() {
    super();
    // cache lots of attribute values determining the
    // behaviour of this <sig-nal> instance
    let root = (this.root = this[this.#getAttribute('for') || 'parentNode']);
    let scope = this.#getAttribute('scope');
    scope = scope ? this.closest(scope) : this.getRootNode();
    let isSignal = this.#getAttribute('new');
    let name =
      (this.name = isSignal) ||
      this.#getAttribute('ref') ||
      crypto.randomUUID();
    let type = this.#getAttribute('type');
    let [defaultAttribute, defaultId] = (
      this.#getAttribute('default') || ''
    ).split('#');

    // define a generic id-getter function
    let pureIdGetter =
      'getElementById' in scope // true iff scope instanceof Document
        ? id => scope.getElementById(id) // fastest
        : id => scope.querySelector('#' + id);

    this.getById = id =>
      /* first character of id looks like a full CSS selector (.#[)? */ id[0] <
      'a'
        ? /* yes */ scope.querySelector(id)
        : /* no */ pureIdGetter(id);

    // bundle up attributes of this instance (some derived,
    // some directly cached), to later serve as callback context
    this.ctx = { root, scope, name, type };

    // are we asked to create a signal instance?
    if (isSignal) {
      // yes, determine its initial value-as-string
      let value = defaultAttribute
        ? this.getById(defaultId)[defaultAttribute.slice(1)]
        : this.#getAttribute('value');
      // then create and enter it into a map under our current scope
      // with type-appropriate value conversion
      signalMap.use(scope)[name] = signal(convert(value, type));
    }

    // are we asked to automatically enrich the DOM tree under
    // our root with 'id' values if they are missing?
    if (this.#getAttribute('index') !== null) {
      // yes, set up
      let indexWalker = _document.createTreeWalker(
        root,
        1 // NodeFilter.SHOW_ELEMENT
      );
      // now walk the DOM tree starting from root:
      for (let i = 0, node, id; indexWalker.nextNode(); ) {
        // get the current node,
        node = indexWalker.currentNode;
        // (skipping our own <sig-nal> node, of course)
        if (node === this) continue;
        // if marked as needing an index,
        // assign a *computed* unique 'id' value scoped to the <sig-nal new=name>
        if (node.id === name) node.id = name + i++;
      }
    }

    // do we need to evaluate an inline hydration description?
    if (this.#getAttribute('hydrate') !== null) {
      // yes, first define a helper function to evaluate it
      let hydrateInline = () => {
        // is our inline hydration description fully constructed in DOM,
        // using a heuristic test of it ending in a curly right bracket?
        let textContent = this.textContent.trim();
        let incompleteHydrationDescription =
          textContent.charCodeAt(textContent.length - 1) !== 125; // '}'
        if (incompleteHydrationDescription) {
          // no, so wait for the next frame and repeat
          return requestAnimationFrame(hydrateInline);
        }
        // yes, thus we can use our own text content as inline hydration description -
        // evaluate a carefully constructed function with the text content as parameter!
        new Function(
          `let{hydrate,render,rerender,renderWith,object,plugin,computed,html,sane}=customElements.get('${SIGNAL}');return hydrate(${textContent})`
        )()(this);
        // send an init(ial) event to our root node - if there is an {": {"@init": initHandler} } in the hydration
        // description, the handler will be invoked synchronously and can perform arbitrary initialization work
        root.dispatchEvent(new Event('init'));
        // unless the presence of some CSS class(es) rescues it...
        if (!this.className) {
          // ... commit harakiri
          this.remove();
        }
      };
      // execute our helper function
      hydrateInline();
    }
  } // end constructor
} // end class SigNal

// register custom element
customElements.define(SIGNAL, SigNal);
