// Ensure React 19 act() warnings stay silent in Jest
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
if (typeof globalThis.eval === 'function') {
  globalThis.eval('var IS_REACT_ACT_ENVIRONMENT = true');
}
