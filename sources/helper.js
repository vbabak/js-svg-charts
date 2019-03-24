'use strict';

/**
 * @param {string} btn Selector
 * @param {string} chart_container Selector
 * @constructor
 *
 * @author Vladyslav Babak <marmalade.vlad@gmail.com>
 */
function ChartMode(btn, chart_container) {
  let mode_btn = DomHelper.findOne(btn);
  if (!mode_btn) {
    throw "Unknown node 'btn_selector': " + btn;
  }
  this.mode_btn = mode_btn;
  let container = DomHelper.findOne(chart_container);
  if (!container) {
    throw "Unknown node 'chart_container': " + chart_container;
  }
  this.container = container;
  this.night_class = 'night';
  this.event_type = 'click';
}

ChartMode.prototype.init = function () {
  this.eventListener = this.switchDayMode.bind(this);
  this.mode_btn.addEventListener(this.event_type, this.eventListener);
};
ChartMode.prototype.switchDayMode = function (e) {
  e.preventDefault();
  e.stopPropagation();
  DomHelper.toggleClass(this.mode_btn, this.night_class);
  DomHelper.toggleClass(this.container, this.night_class);
};
ChartMode.prototype.reset = function () {
  this.mode_btn.removeEventListener(this.event_type, this.eventListener);
  DomHelper.removeClass(this.mode_btn, this.night_class);
  DomHelper.removeClass(this.container, this.night_class);
};

function isArray(a) {
  return typeof a.unshift === "function";
}

function getArrayMax(arr) {
  let max = 0;
  if (arr.length) {
    max = arr.reduce(function (acc, curr) {
      return Math.max(acc, curr);
    });
  }
  return max;
}

function getArrayMin(arr) {
  let min = 0;
  if (arr.length) {
    min = arr.reduce(function (acc, curr) {
      return Math.min(acc, curr);
    });
  }
  return min;
}

function XAxisDateFormat(v, full_day) {
  let d = new Date(v), res = null;

  let m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  res = m[d.getMonth()] + " " + d.getDate();

  if (full_day !== undefined) {
    let days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    res = days[d.getDay()] + ", " + res;
  }
  return res;
}


function XAxisDateFormatLong(v) {
  return XAxisDateFormat(v, true);
}

function YValRound(v) {
  let res = v;
  if (v >= 10 ** 9) {
    res = (v / 10 ** 9).toFixed(1) * 10 ** 9;
  } else if (v >= 10 ** 6) {
    res = (v / 10 ** 6).toFixed(1) * 10 ** 6;
  } else if (v >= 10 ** 3) {
    res = (v / 10 ** 3).toFixed(1) * 10 ** 3;
  } else {
    res = Math.ceil(v / 10) * 10;
  }
  return res;
}

function YAxisFormat(v) {
  let res = v;
  if (v >= 10 ** 9) {
    res = (v / 10 ** 9).toFixed(1) + 'B';
  } else if (v >= 10 ** 6) {
    res = (v / 10 ** 6).toFixed(1) + 'M';
  } else if (v >= 10 ** 3) {
    res = (v / 10 ** 3).toFixed(1) + 'k';
  } else {
    res = YValRound(v);
  }
  return res;
}

function getObjLength(obj) {
  return Object.keys(obj).length;
}
