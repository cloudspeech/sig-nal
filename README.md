# sig-nal

&lt;sig-nal&gt; is a zero-dependencies Web Component for Server-Side Rendering with Signals (SSRS) in [**907**](https://raw.githubusercontent.com/cloudspeech/sig-nal/main/dist/index.min.js) bytes (minified + Brotli-11-compressed).

## Demo

<img width="289" alt="Screenshot 2024-04-21 at 00 12 15" src="https://github.com/cloudspeech/sig-nal/assets/850521/fbddeff4-84fb-4ea5-a8c0-42528b33d1d0">

Here is a live [demo](https://cloudspeech.github.io/sig-nal/demo.html).

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
    const {hydrate,
           rerender} = await customElements.whenDefined("sig-nal");
    hydrate(["div#counter"],{
 	     counter: { ".textContent": rerender },
	     inc: { "@click": ({ signal }) => signal.value++ },
	     dec: { "@click": ({ signal }) => signal.value-- },
	     });
    </script>
```

