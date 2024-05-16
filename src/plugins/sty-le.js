/* adapted from an idea in https://eisenbergeffect.medium.com/sharing-styles-in-declarative-shadow-dom-c5bf84ffd311 */
(() => {
  // static, cross-instance cache of style sheets
  let cache = new Map();

  // custom element definition
  class StyLe extends HTMLElement {
    // when connected to DOM...
    async connectedCallback() {
      // extract own id="<styleIdentifier>"
      let { id } = this;
      // try to get cached style sheet for <styleIdentifier>
      let styleSheet = cache.get(id);

      // cache match?
      if (!styleSheet) {
        // no cache match: prepare a new style sheet
        styleSheet = new CSSStyleSheet();
        // determine style content
        let src = this.getAttribute("src");
        // promise to yield a style sheet
        let promise = new Promise(async resolve => {
          let content = src
            ? /* fetch from assumed .css file */ await (await fetch(src)).text()
            : /* *immediately preceding inline <style>* content */ this
                .previousElementSibling.textContent;
          // fill it with the style content
          styleSheet.replaceSync(content);
          // yield the style sheet
          resolve(styleSheet);
        });
        // cache the promise under the <id> key
        cache.set(id, promise);
      }
      if (styleSheet) {
        // yes, use it inside our ShadowDOM domain (or under document.body, if there is none)
        this.getRootNode().adoptedStyleSheets.push(await styleSheet);
      }
      // remove ourselves from DOM, now that the work is done!
      this.remove();
    }
  }
  // register the newly defined custom element
  customElements.define("sty-le", StyLe);
})();
