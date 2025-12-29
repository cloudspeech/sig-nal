// module globals

// list parameters of each unit of the countdown: name, subtraction offset, highest state
const units = [
  'hundredth',
  100,
  '900',
  'seconds',
  1,
  '59',
  'minutes',
  1,
  '59',
  'hours',
  1,
  '23',
  'days',
  1,
  '366'
];

// count-down update function:
const update = parameters => () => {
  // set up
  const { model, signal, event, last } = parameters;
  let unit, name, step, highest, formatted;
  // for all units from most frequently updated to least frequently updated:
  for (let i = 0, j = i, n = units.length; i < n; i += 3, j++) {
    // fetch per-unit parameters
    name = units[i];
    step = units[i + 1];
    highest = units[i + 2];
    // count down this unit
    unit = (model[j].textContent | 0) - step;
    // and remember its new value in the array of last-updated values
    last[j] = Math.abs(unit);
    // format new value with the right amount of digits
    formatted = `00${unit}`.slice(-1 - (Math.log10(highest | 0) | 0));
    model[j].textContent = formatted;
    // if new name not negative, stop here
    if (unit >= 0) break;
    // new name would have been negative,
    // so reset it to highest name for this unit ...
    model[j].textContent = highest;
    // ... and loop to next unit
  }
  // update signal, causing rerendering
  signal.value = model;
  // did count down reach all-zero end state
  // (sum up last-updated values to determine that state)?
  if (last.reduce((a, b) => a + b, 0) === 0) {
    // yes, stop counting down
    clearInterval(parameters.timer);
    // and tell the world
    event.dispatchEvent(new Event('countdownstopped'));
  }
};

export const start = (signal, event) => {
  // initialize signal value from DOM
  let model = [...event.querySelectorAll('[id]')].map(node => ({
    textContent: node.textContent
  }));
  signal.value = model;
  let parameters = { model, signal, event, last: [] };
  // update count down every 100 milliseconds
  parameters.timer = setInterval(update(parameters), 100);
};
