# sig-nal

&lt;sig-nal&gt; is a zero-dependencies Web Component for Server-Side Rendering with Signals (SSS), using [**871**](https://raw.githubusercontent.com/cloudspeech/sig-nal/main/dist/index.min.js) bytes (Brotli-11-compressed).

## Demo

Here is a [demo](https://cloudspeech.github.io/sig-nal/demo.html){:target="_blank" rel="noopener"}.

## Status
This is alpha-quality software and as such not ready for production.

## Counter Example

```html
    <div id="counter">
      <template shadowrootmode="open">
	<h1>Counter Example</h1>
	<div class="container">
	  <button @click="counter">
	    <sig-nal ref="inc">+</sig-nal>
	  </button>
	  <span .textContent="counter">
	    <sig-nal new="counter" type="number">0</sig-nal>
          </span>
	  <button @click="counter">
	    <sig-nal ref="dec">-</sig-nal>
	  </button>
	</div>
      </template>
    </div>
    <script type="module">
    const {hydrate, rerender} = await customElements.whenDefined("sig-nal");
    hydrate(["div#counter"],{
      			     counter: { ".textContent": rerender },
			     inc: { "@click": ({ signal }) => signal.value++ },
  			     dec: { "@click": ({ signal }) => signal.value-- },
			     });
    </script>
```

