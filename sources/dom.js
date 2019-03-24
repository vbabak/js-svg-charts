'use strict';
/**
 * @author Vladyslav Babak <marmalade.vlad@gmail.com>
 */
var DomHelper = {
  /**
   * @param {string} selector Css selector
   * @returns {(Element|null)}
   */
  findOne: function (selector) {
    let node = document.querySelector(selector);
    return node;
  },

  /**
   * @param {string} selector Css selector
   * @returns {NodeList}
   */
  findAll: function (selector, parentNode) {
    parentNode = parentNode || document;
    let nodes = parentNode.querySelectorAll(selector);
    return nodes;
  },

  classExists: function (el, cls) {
    return el.classList.contains(cls);
  },

  toggleClass: function (el, cls) {
    return el.classList.toggle(cls);
  },

  addClass: function (el, cls) {
    return el.classList.add(cls);
  },

  removeClass: function (el, cls) {
    return el.classList.remove(cls);
  },
  setStyles: function (el, styles_obj) {
    for (let s in styles_obj) {
      el.style[s] = styles_obj[s];
    }
  },
  setAttributes: function (el, attrs_obj) {
    for (let a in attrs_obj) {
      el.setAttribute(a, attrs_obj[a]);
    }
  },
  getAttribute: function (el, attr) {
    return el.getAttribute(attr);
  },
  createElementNS: function (ns, tag, class_name) {
    let el = document.createElementNS(ns, tag);
    if (class_name) {
      DomHelper.addClass(el, class_name);
    }
    return el;
  },
  createElement: function (tag, class_name) {
    let el = document.createElement(tag);
    if (class_name) {
      DomHelper.addClass(el, class_name);
    }
    return el;
  },
  createTextNode: function (text) {
    let el = document.createTextNode(text);
    return el;
  },
  deleteChildNodes: function (el, nodes) {
    for (let i = 0; i < nodes.length; i++) {
      el.removeChild(nodes[i]);
    }
  }
};
