(() => {
  // helper function
  let domStream = targetElement => {
    // create a private top-level document
    let newDocument = document.implementation.createHTMLDocument();
    // string-write empty <article> tag into it as a container
    // (<article>s allow e.g. top-level <h1> again...)
    newDocument.write("<article>");
    // now, using the DOM view of that document, get the container
    let container = newDocument.body.firstElementChild;
    // ... and connect our 'real-DOM' target element to the container
    targetElement.appendChild(container);
    // return a stream that will...
    return new WritableStream({
      write(chunk) {
        // ... string-write more HTML chunks into our private document as
        // they arrive, i.e. in streaming fashion
        newDocument.write(chunk);
      },
      close() {
        // ... close our private document once the stream stops ...
        newDocument.close();
        // ... and execute a declarative-shadow-dom polyfill on our container
        // (since declarative ShadowDOM is a toplevel-HTML-parser-only construct for now)
        (function attachShadowRoots(root) {
          root
            .querySelectorAll("template[shadowrootmode]")
            .forEach(template => {
              let shadowRoot = template.parentNode.attachShadow({
                mode: "open",
              });
              shadowRoot.appendChild(template.content);
              template.remove();
              attachShadowRoots(shadowRoot);
            });
        })(container);
      },
      abort(reason) {
        // ... handle any stream errors by closing the private document first ...
        newDocument.close();
        // ... then logging an error
        console.error(`part-ial aborted: ${reason}`);
      },
    });
  };

  // web component for streaming, network-fetched insertion of HTML partials into DOM
  class PartIal extends HTMLElement {
    // declare private class fields:
    #src; // URL (default: undefined)

    // 'src' property getter: if property set, return its value, otherwise initialize from *attribute*
    get src() {
      return this.#src || (this.#src = this.getAttribute("src"));
    }

    // 'src' property setter: set 'src' to value (do *not* reflect to attribute) and re-render
    set src(value) {
      this.#src = value;
      this.connectedCallback();
    }

    // initial render + re-render method:
    async connectedCallback() {
      return (
        // if src URL is defined...
        this.src &&
        (await // ... fetch it over the network, ...
        (
          await fetch(this.src)
        ).body // ... using the readableStream body of the fetch response, then ...
          // ... decoding the UTF-8 bytes of the streamed response into JavaScript strings ...
          .pipeThrough(new TextDecoderStream())
          // ... to be streamed into DOM via our helper function
          .pipeTo(domStream(this)))
      );
    }
  }

  // register the web component
  customElements.define("part-ial", PartIal);
})();
