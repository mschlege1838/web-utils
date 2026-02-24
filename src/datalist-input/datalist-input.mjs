import { SimpleEventDispatcherMixin, WebComponentMixin, loadTemplate } from '../util.mjs';

const template = await loadTemplate(import.meta.resolve('./datalist-input.html'));

customElements.define('datalist-input', class extends WebComponentMixin(
    SimpleEventDispatcherMixin(HTMLElement, ['match']), template, true, [
      { attribute: 'data-base-url', field: 'baseUrl' },
      { attribute: 'size', field: 'size' },
      { attribute: 'value', field: 'value' },
      { attribute: 'data-case-sensitive', field: 'caseSensitive', type: 'boolean' }
    ]
) {

  constructor() {
    super();
  }
  
  get baseUrl() {
    return this.attributeGet('baseUrl');
  }
  
  set baseUrl(value) {
    this.attributeSync('baseUrl', value);
  }
  
  get size() {
    return this.shadowRoot.querySelector('input').size;
  }
  
  set size(value) {
    this.shadowRoot.querySelector('input').size = value;
  }
  
  get value() {
    return this.shadowRoot.querySelector('input').value;
  }
  
  set value(value) {
    const input = this.shadowRoot.querySelector('input');
    if (input.value != value) {
      input.value = value;
      this.doCheck();
    }
  }
  
  get caseSensitive() {
    return this.attributeGet('caseSensitive');
  }
  
  set caseSensitive(value) {
    this.attributeSync('caseSensitive', value);
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.querySelector('input').addEventListener('input', this);
  }
  
  disconnectedCallback() {
    this.disconnect();
    this.shadowRoot.querySelector('input').removeEventListener('input', this);
  }
  
  handleEvent(event) {
    if (event.type === 'input') {
      this.doCheck();
    }
  }
  
  async doCheck() {
    let value = this.value;
    if (!value) {
      return;
    }
    const caseInsensitive = !this.caseSensitive;
    if (caseInsensitive) {
      value = value.toLowerCase();
    }
    
    const resp = await fetch(this.baseUrl + value);
    if (resp.status !== 200) {
      return;
    }
    
    let data = await resp.json();
    if (caseInsensitive) {
      data = data.map(e => e.toLowerCase());
    }
    
    this.emitEvent('match', { match: data.indexOf(value) !== -1 });
    
    const datalist = this.shadowRoot.querySelector('datalist');
    if (datalist.querySelector(`option[value="${value.replaceAll('"', '\\"')}"]`)) {
      return;
    }
    
    while (datalist.childNodes.length) datalist.removeChild(datalist.childNodes[0]);
    
    for (const item of data) {
      const opt = document.createElement('option');
      opt.value = item;
      datalist.appendChild(opt);
    }
  }
});