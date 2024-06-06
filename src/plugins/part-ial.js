(() => {
  // helper function
  let domStream = (targetElement, domOp) => {
    // create a private top-level document
    let newDocument = document.implementation.createHTMLDocument();
    // create a container <article>. <article>, so it can again host <h1>,
    // and container, so one can stream multi-rooted HTML
    newDocument.write("<article>");
    let container = newDocument.body.firstElementChild;
    // connect target and container
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
        if (domOp) targetElement[domOp](container.firstElementChild);
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
          await fetch(
            this.src,
            JSON.parse(this.getAttribute("options") || "{}"),
          )
        ).body // ... using the readableStream body of the fetch response, then ...
          // ... decoding the UTF-8 bytes of the streamed response into JavaScript strings ...
          .pipeThrough(new TextDecoderStream())
          // ... to be streamed into DOM via our helper function
          .pipeTo(domStream(this, this.getAttribute("mode"))))
      );
    }
  }

  // register the web component
  customElements.define("part-ial", PartIal);
})();
