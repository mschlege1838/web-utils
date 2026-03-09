import { WebComponentMixin, loadTemplate, urlPathJoin } from '../util.mjs';
import templateStyle from './import-img.css' with { type: 'css' }

const importImgTemplate = await loadTemplate(import.meta.resolve('./import-img.html'));

export function initImportImg(rootElement, importMetaUrl) {
  importMetaUrl = importMetaUrl.substring(0, importMetaUrl.lastIndexOf('/'));
  for (const importImg of rootElement.querySelectorAll('import-img')) {
    importImg.importRoot = importMetaUrl;
  }
}

customElements.define('import-img', class extends WebComponentMixin(HTMLElement, importImgTemplate, false, [
  { attribute: 'data-import-root', field: 'importRoot' },
  { attribute: 'data-import-src', field: 'importSrc' },
]) {
  constructor() {
    super();
    this.addInternalStylesheet(templateStyle);
  }
  
  get importRoot() {
    return this.attributeGet('importRoot');
  }
  
  set importRoot(value) {
    this.attributeSync('importRoot', value);
  }
  
  get importSrc() {
    return this.attributeGet('importSrc');
  }
  
  set importSrc(value) {
    this.attributeSync('importSrc', value);
    this.shadowRoot.querySelector('img').src = urlPathJoin(this.importRoot, value);
  }
});