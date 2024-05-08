/* adapted from an idea in https://eisenbergeffect.medium.com/sharing-styles-in-declarative-shadow-dom-c5bf84ffd311 */
(() => {
  // static, cross-instance cache of style sheets
  let cache = new Map();

  // custom element definition
  class StyLe extends HTMLElement {
    // when connected to DOM...
    connectedCallback() {
      // extract own id="<styleIdentifier>"
      let { id } = this;
      // try to get cached style sheet for <styleIdentifier>
      let styleSheet = cache.get(id);

      // cache match?
      if (styleSheet) {
        // yes, use it inside our ShadowDOM domain (or under document.body, if there is none)
        this.getRootNode().adoptedStyleSheets.push(styleSheet);
      } else {
        // no cache match: prepare a new style sheet
        styleSheet = new CSSStyleSheet();
        // fill it with the *immediately preceding inline <style>* content
        styleSheet.replaceSync(this.previousElementSibling.textContent);
        // and cache the newly minted style sheet under <styleIdentifier>
        cache.set(id, styleSheet);
      }
      // remove ourselves from DOM, now that the work is done!
      this.remove();
    }
  }
  // register the newly defined custom element
  customElements.define("sty-le", StyLe);
})();
