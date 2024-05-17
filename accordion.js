customElements.whenDefined("sig-nal").then( ({hydrate}) =>
  hydrate(['acc-ordion'], {
   'accordion': {'@click':
       ({e}) => {
       const buttons = e.composedPath().filter(node => node.tagName === 'BUTTON');
       if (!buttons.length) return;
       const button = buttons[0];
       const slot = button.parentNode.nextElementSibling;
       const isOpen = button.classList.contains('open');
       button.classList[isOpen ? 'remove' : 'add']('open');
       button.title = isOpen ? 'open' : 'close';
       slot.classList[isOpen ? 'remove' : 'add']('show');
       }
     }
  })
);

