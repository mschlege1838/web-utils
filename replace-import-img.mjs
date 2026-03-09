import * as fs from 'node:fs/promises';
import path from 'node:path';

import { parse, serialize } from 'parse5';

import { getMimeTypeFromExt } from './common-mime-types.mjs';

function wrap(node) {
  return node && !(node instanceof Parse5Node) ? new Parse5Node(node) : node;
}

function unwrap(node) {
  return node instanceof Parse5Node ? node.root : node;
}

function createElement(tagName) {
  return new Parse5Node({
    nodeName: tagName,
    tagName: tagName,
    namespaceURI: 'http://www.w3.org/1999/xhtml',
    attrs: [],
    childNodes: []
  });
}

function createTextNode(value) {
  return new Parse5Node({
    nodeName: '#text',
    value: value
  });
}


export class Parse5Node {
  root;
  
  constructor(root) {
    this.root = unwrap(root);
  }
  
  get content() {
    return wrap(this.root.content);
  }
  
  get parentNode() {
    return wrap(this.root.parentNode);
  }
  
  appendChild(newNode) {
    if (!newNode) {
      throw new ReferenceError('No newNode');
    }
    
    newNode = unwrap(newNode);
    if (newNode.parentNode) {
      new Parse5Node(newNode.parentNode).removeChild(newNode);
    }
    
    const childNodes = this.root.childNodes;
    if (childNodes.find(e => e.root === newNode)) {
      return;
    }
    
    childNodes.push(newNode);
    newNode.parentNode = this.root;
  }
  
  insertBefore(newNode, referenceNode) {
    if (!newNode) {
      throw new ReferenceError('No newNode');
    }
    
    newNode = unwrap(newNode);
    if (newNode.parentNode) {
      new Parse5Node(newNode.parentNode).removeChild(newNode);
    }
    
    const childNodes = this.root.childNodes;
    if (childNodes.find(e => e.root === newNode)) {
      return;
    }
    
    let insertIndex = childNodes.length;
    
    if (referenceNode) {
      referenceNode = unwrap(referenceNode);
      const referenceParent = referenceNode.parentNode;
      if (referenceParent && referenceParent.childNodes) {
        const referenceIndex = referenceParent.childNodes.indexOf(referenceNode)
        if (referenceIndex !== -1) {
          insertIndex = referenceIndex;
        }
      }
    }
    
    childNodes.splice(insertIndex, 0, newNode);
    newNode.parentNode = this.root;
  }
  
  removeChild(node) {
    if (!node) {
      return;
    }
    node = unwrap(node);
    
    const childNodes = this.root.childNodes;
    const nodeIndex = childNodes.indexOf(node);
    if (nodeIndex === -1) {
      return;
    }
    
    childNodes.splice(nodeIndex, 1);
    delete node.parentNode;
  }
  
  getAttributeNames() {
    return this.root.attrs?.map(e => e.name);
  }
  
  getAttribute(name) {
    const attributes = this.root.attrs;
    if (!attributes) {
      return null;
    }
    return attributes.find(a => a.name === name)?.value ?? null;
  }
  
  setAttribute(name, value) {
    const attributes = this.root.attrs;
    if (!attributes) {
      return null;
    }
    
    const attrIndex = attributes.findIndex(a => a.name === name);
    if (attrIndex === -1) {
      if (value) {
        attributes.push({name: name, value: value });
      }
    } else {
      if (value ?? null) {
        attributes[attrIndex].value = value;
      } else {
        attributes.splice(attrIndex, 1);
      }
    }
  }
  
  getFirstByTagName(tagName) {
    return wrap(this.process({
      result: null,
      test: (node) => node.tagName === tagName,
      process(node) {
        this.result = node;
      },
      done() {
        return this.result;
      }
    }).result);
  }
  
  getElementsByTagName(tagName) {
    const result = [];
    this.process({
      test: (node) => node.tagName === tagName,
      process: (node) => result.push(new Parse5Node(node))
    });
    return result;
  }
  
  process(processor, node) {
    node = node || this.root;
    if (typeof processor.test !== 'function' || processor.test(node)) {
      typeof processor.process === 'function' ? processor.process(node) : processor(node);
    }
    if (typeof processor.done === 'function' && processor.done()) {
      return processor;
    }
    if (node.childNodes) {
      for (const childNode of node.childNodes) {
        this.process(processor, childNode);
      }
    }
    return processor;
  }
}

export async function replaceImportImg(fname) {
  const astRoot = new Parse5Node(parse(await fs.readFile(fname, { encoding: 'utf8' })));
  
  const templateProcessor = astRoot.getFirstByTagName('template').content;
  
  for (const importImgNode of templateProcessor.getElementsByTagName('import-img')) {
    const srcPath = path.join(path.dirname(fname), importImgNode.getAttribute('data-import-src'));
    const data = (await fs.readFile(srcPath)).toString('base64');
    const mimeType = getMimeTypeFromExt(path.extname(srcPath));
    
    const imgNode = createElement('img');
    imgNode.setAttribute('src', `data:${mimeType};base64,${data}`);
    imgNode.setAttribute('class', importImgNode.getAttribute('class'));
    importImgNode.parentNode.insertBefore(imgNode, importImgNode);
    
    importImgNode.parentNode.removeChild(importImgNode);
  }


  return serialize(astRoot.root);
}

