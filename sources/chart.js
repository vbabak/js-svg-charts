'use strict';

/**
 *
 * Chart class, depends on dom.js, helper.js, chart_math.js
 *
 * @param {object} config Chart init configuration
 * @param {string} config.container Container selector to bind chart to
 *
 * @constructor
 *
 * @author Vladyslav Babak <marmalade.vlad@gmail.com>
 */
function Chart(config) {
  this.ChartMath = new ChartMath(55, 40);

  if (typeof config !== "object") {
    throw "'config' must be an 'object'";
  }

  if (typeof config.container !== "string") {
    throw "'config.container' must be a 'string'";
  }

  let container = this.getDomHelper().findOne(config.container);
  if (!container) {
    throw "Unknown node 'container': " + config.container;
  }
  this.container = container;

  this.deley = 1;
  this.config = config;
  this.chart = null;
  this.axis_container = null;
  this.circles_container = null;
  this.lines_container = null;
  this.pan_container = null;
  this.pan_interactive_container = null;
  this.data = []; // loaded data
  this.x_data = []; // x column
  this.x_data_sliced = [];
  this.y_data = {}; // y columns
  this.y_data_sliced = {};
  this.namespace = ""; // css prefix
  this.tooltip_title_formatter = null; // callback
  this.axis_y_value_formatter = null; // callback
  this.axis_title_formatters = {}; // callbacks
  this.on_finish = null; // callback
  this.y_min = null;
  this.y_min_real = null;
  this.y_max = null;
  this.y_max_real = null;
  this.x1_range = null;
  this.x2_range = null;
  this.svgns = "http://www.w3.org/2000/svg"; // svg namespace
  this.max_points = 500; // max points allowed on line
  this.container_width = this.container.offsetWidth;
  this.container_height = this.container.offsetHeight;
  this.axis_padding = [30, 50, 270, 50]; // css padding-style
  this.pan_height = 100;
  this.pan_fg_width = null;
  this.pan_fg_left = null;
  this.pan_x_space = 12;
  this.pan_top_space = 50;
  this.inter_line = null;
  this.tooltip = null;
  this.line_color = "#cf6300"; // default color
  this.lines = {}; // chart lines
  this.pan_lines = {}; // pan lines
  this.finish_props = {
    tooltip: false,
    legend: false,
    interactive: false,
    lines: false,
    pan: false
  };
  this.y_inactive = {};
  this.performance = {};
  this.debug_mode = false;
  this.lock_event = false;
}

Chart.prototype.setDebugMode = function (is_debug) {
  this.debug_mode = !!is_debug;
};

Chart.prototype.setPanHeight = function (v) {
  this.pan_height = v;
};

Chart.prototype.setChartPadding = function (top, right, bottom, left) {
  this.axis_padding = [top, right, bottom, left];
};

Chart.prototype.onFinish = function (callback) {
  this.checkIsCallback(callback);
  this.on_finish = callback;
};

Chart.prototype.finish = function () {
  for (let i in this.finish_props) {
    if (this.finish_props[i] !== true) {
      return false;
    }
  }
  if (typeof this.on_finish == "function") {
    this.on_finish();
    this.on_finish = null;
  }
};

Chart.prototype.makeClassName = function (cls) {
  let cls_name = cls;
  if (this.namespace) {
    cls_name = this.namespace + '-' + cls;
  }
  return cls_name;
};

Chart.prototype.getDomHelper = function () {
  if (typeof DomHelper === "undefined") {
    throw "'DomHelper' is undefined";
  }
  return DomHelper;
};


Chart.prototype.getDomHelper = function () {
  if (typeof DomHelper === "undefined") {
    throw "'DomHelper' is undefined";
  }
  return DomHelper;
};

Chart.prototype.load = function (data) {
  this.startTime('Chart.load');
  this.data = [];
  if (typeof data === "object") {
    if (typeof data.columns === "object") {
      // object
      this.validate(data);
      this.findMaxMin();
    } else {
      throw "Only array or object is supported.";
    }
  }
  this.endTime('Chart.load', 1);
};

Chart.prototype.findMaxMin = function () {
  let x_ratio = this.ChartMath.getXRatio(this.getPanWidth(), this.getPanHeight(), this.x_data.length, this.pan_x_space);
  let fg_width_init = this.ChartMath.getInitFGWidth(this.getPanWidth(), x_ratio.axis_x_step);
  let fg_width = this.pan_fg_width === null ? fg_width_init : this.pan_fg_width;
  let fg_left = this.pan_fg_left === null ? (this.getPanWidth() - fg_width) : this.pan_fg_left;

  let x1_index = Math.floor(this.x_data.length * (fg_left / this.getPanWidth()));
  let x2_index = Math.floor(this.x_data.length * (fg_left + fg_width) / this.getPanWidth());

  let y_min = null, y_max = null, y_min_real = null, y_max_real = null;
  for (let i in this.y_data) {
    if (this.y_inactive[i]) {
      continue;
    }
    if (this.data.types[i] === "line") {
      if (y_min === null) {
        y_min = getArrayMin(this.y_data[i]);
        y_min_real = getArrayMin(this.y_data[i]);
      } else {
        y_min = Math.min(y_min, getArrayMin(this.y_data[i].slice(x1_index, x2_index)));
        y_min_real = Math.min(y_min_real, getArrayMin(this.y_data[i].slice(1)));
      }
      y_max = Math.max(y_max, getArrayMax(this.y_data[i].slice(x1_index, x2_index)));
      y_max_real = Math.max(y_max_real, getArrayMax(this.y_data[i].slice(1)));
    }
  }
  this.y_min = y_min;
  this.y_min_real = y_min_real;
  this.y_max = y_max;
  this.y_max_real = y_max_real;
  this.x1_range = x1_index;
  this.x2_range = x2_index;

  this.loadXYData();
};

Chart.prototype.validate = function (obj) {
  let props = ["columns", "types", "names", "colors"];
  for (let p in props) {
    if (typeof obj[props[p]] !== "object") {
      throw new Error("'" + p + "' undefined");
    }
  }
  let column_x = '';
  for (let i in obj.types) {
    if (obj.types[i] === 'x') {
      column_x = i;
    }
  }
  if (!column_x) {
    throw "Column 'x' not specified";
  }
  let num_points = 0;
  for (let i in obj.columns) {
    if (obj.types[obj.columns[i][0]] === undefined) {
      throw "type '" + obj.columns[i][0] + "' not specified"
    }
    if (!num_points) {
      num_points = obj.columns[i].length;
    } else {
      if (obj.types[obj.columns[i][0]] === "line" && num_points !== obj.columns[i].length) {
        throw new RangeError("Number of line points on axis does not match");
      }
    }
    if (obj.columns[i].length > this.max_points) {
      throw new Error("columns['" + i + "'] exceed max points (" + this.max_points + ")");
    }
    if (obj.columns[i][0] === column_x) {
      this.x_data = obj.columns[i].slice(1);
    } else {
      this.y_data[obj.columns[i][0]] = obj.columns[i].slice(1);
    }
  }
  this.data = obj;
};
Chart.prototype.loadXYData = function () {
  let column_x = '';
  for (let i in this.data.types) {
    if (this.data.types[i] === 'x') {
      column_x = i;
    }
  }
  let j = 0;
  for (let i in this.data.columns) {
    if (this.data.columns[i][0] === column_x) {
      this.x_data_sliced = this.data.columns[i].slice(this.x1_range, this.x2_range + 1);
    } else {
      this.y_data_sliced[this.data.columns[i][0]] = this.data.columns[i].slice(this.x1_range, this.x2_range + 1);
    }
    j++;
  }
};

Chart.prototype.checkIsCallback = function (a) {
  if (typeof a !== "function") {
    throw new Error("'callback' must be a function");
  }
};

Chart.prototype.setAxisTitleFormatter = function (col_name, callback) {
  this.checkIsCallback(callback);
  this.axis_title_formatters[col_name] = callback;
};

Chart.prototype.setYValueFormatter = function (callback) {
  this.checkIsCallback(callback);
  this.axis_y_value_formatter = callback;
};

Chart.prototype.formatYValue = function (v) {
  if (typeof this.axis_y_value_formatter == "function") {
    return this.axis_y_value_formatter(v);
  }
  return v;
};

Chart.prototype.formatTitle = function (col, v) {
  if (typeof this.axis_title_formatters[col] == "function") {
    return this.axis_title_formatters[col](v);
  }
  return v;
};

Chart.prototype.setTooltipTitleFormatter = function (callback) {
  this.checkIsCallback(callback);
  this.tooltip_title_formatter = callback;
};

Chart.prototype.formatTooltipTitle = function (v) {
  if (typeof this.tooltip_title_formatter == "function") {
    return this.tooltip_title_formatter(v);
  }
  return v;
};

Chart.prototype.draw = function () {
  this.startTime('Chart.draw');
  let svg = this.getDomHelper().createElementNS(this.svgns, "svg", this.makeClassName("chart-root"));

  let g_axis = this.getDomHelper().createElementNS(this.svgns, 'g', 'axis');
  this.axis_container = g_axis;

  let drawXAxis = function () {
    this.addXAxis(g_axis);
  };
  setTimeout(drawXAxis.bind(this), this.deley);

  let drawYAxis = function () {
    this.addYAxis(g_axis);
  };
  setTimeout(drawYAxis.bind(this), this.deley);

  let g_lines = this.getDomHelper().createElementNS(this.svgns, 'g', 'chart-lines');
  let g_circles = this.getDomHelper().createElementNS(this.svgns, 'g', 'lines-circles');

  let drawChartLines = function () {
    this.addChartLines(g_lines, g_circles);
  };
  setTimeout(drawChartLines.bind(this), this.deley);
  this.lines_container = g_lines;
  this.circles_container = g_circles;

  let axis_interactive = this.getDomHelper().createElementNS(this.svgns, 'g', 'axis-interactive');
  this.inter_line = this.getDomHelper().createElementNS(this.svgns, 'line');
  axis_interactive.appendChild(this.inter_line);
  svg.appendChild(axis_interactive);

  svg.appendChild(g_axis);
  svg.appendChild(g_lines);
  svg.appendChild(g_circles);

  let g_interactive = this.getDomHelper().createElementNS(this.svgns, "g");
  let drawInteractiveArea = function () {
    this.makeAxisInteractiveRect(g_interactive);
    svg.appendChild(g_interactive);
    this.finish_props.interactive = true;
    this.finish();
  };
  setTimeout(drawInteractiveArea.bind(this), this.deley);

  if (this.chart) {
    this.container.replaceChild(svg, this.chart);
  } else {
    this.pan_container = this.getDomHelper().createElementNS(this.svgns, 'g');
    this.pan_interactive_container = this.getDomHelper().createElement('div', 'pan-interactive')
    this.getDomHelper().setAttributes(this.pan_container, {
      "class": "pan"
    });
    svg.appendChild(this.pan_container);
    let drawPan = function () {
      this.addPan();
      this.container.appendChild(this.pan_interactive_container);
      this.finish_props.pan = true;
      this.finish();
    };
    setTimeout(drawPan.bind(this), this.deley);

    let drawTooltip = function () {
      this.addTooltip();
      this.finish_props.tooltip = true;
      this.finish();
    };
    setTimeout(drawTooltip.bind(this), this.deley);

    let drawLegend = function () {
      this.addLegend();
      this.finish_props.legend = true;
      this.finish();
    };
    setTimeout(drawLegend.bind(this), this.deley);

    this.container.appendChild(svg);
  }

  this.chart = svg;
  this.endTime('Chart.draw', 1);
};

Chart.prototype.addTooltip = function () {
  this.startTime('Chart.addTooltip');
  let tooltip = this.getDomHelper().createElement('div', this.makeClassName('chart-tooltip'));
  let title = this.getDomHelper().createElement('div', 'tooltip-title');
  tooltip.appendChild(title);
  let body = this.getDomHelper().createElement('div', 'tooltip-body');

  let cols = {}, values = {};
  for (let i in this.y_data) {
    let col = this.getDomHelper().createElement('div', 'col-' + i);
    this.getDomHelper().setAttributes(col, {
      "style": "color: " + (this.data.colors[i] || this.line_color)
    });

    let val = this.getDomHelper().createElement('div', 'val');
    col.appendChild(val);

    let name = this.getDomHelper().createElement('div', 'name');
    name.textContent = (this.data.names[i] || i);
    col.appendChild(name);

    body.appendChild(col);
    values[i] = val;
    cols[i] = col;
  }


  tooltip.appendChild(body);

  this.tooltip = {
    tooltip: tooltip,
    title: title,
    cols: cols,
    values: values
  };

  this.container.appendChild(tooltip);
  this.endTime('Chart.addTooltip', 1);
};

Chart.prototype.getPanWidth = function () {
  return this.getAxisWidth();
};

Chart.prototype.getPanHeight = function () {
  let top = this.getAxisBottom() + this.pan_top_space;
  let bottom = top + this.pan_height;
  let height = bottom - top;
};

Chart.prototype.addPan = function () {
  this.startTime('Chart.addPan');

  let top = this.getAxisBottom() + this.pan_top_space;
  let bottom = top + this.pan_height;
  let left = this.getAxisLeft();
  let right = this.getAxisRight();
  let pan_width = right - left;
  let pan_height = bottom - top;
  let y_ratio = this.ChartMath.getYRatio(pan_width, pan_height, this.y_min_real, this.y_max_real, this.formatYValue.bind(this));
  let x_ratio = this.ChartMath.getXRatio(pan_width, pan_height, this.x_data.length, this.pan_x_space);
  let p_lines = this.getDomHelper().createElementNS(this.svgns, "g", "pan-lines");
  let curve_num_arg = 2;
  let points = {};
  if (x_ratio.axis_x_num >= this.x_data.length) {
    return true;
  }
  for (let i = 0, j = 0; i < x_ratio.axis_x_num; i++, j += x_ratio.axis_x_step) {
    let is_last_iteration = ((i + 1) === x_ratio.axis_x_num);
    let x1 = parseInt(left + (parseInt(j) * x_ratio.x_ratio));
    for (let yp in this.y_data) {
      if (this.y_inactive[yp] || this.data.types[yp] !== "line") {
        continue;
      }
      let y1 = parseInt(bottom - parseInt(this.y_data[yp][j]) * y_ratio.y_ratio);
      let line_point = "";
      if (i === 0) {
        line_point = "M";
        points[yp] = [];
      } else if (i === 1) {
        line_point += " Q ";
      }
      line_point += "" + x1 + " " + y1 + "";
      points[yp].push(line_point);
      if (is_last_iteration) {
        let points_incomplete = (points[yp].length - 1) % curve_num_arg;
        if (points_incomplete) {
          for (let z = 0; z < (curve_num_arg - points_incomplete); z++) {
            // points[yp].pop()
            points[yp].push(points[yp][points[yp].length - 1]);
          }
        }
        if (j < this.y_data[yp].length - 1) {
          // connect current point to the last point with a line
          points[yp].push("L" + x1 + " " + y1 + "");
          points[yp].push("" + (left + (parseInt(this.y_data[yp].length - 1) * x_ratio.x_ratio)) + " " + (bottom - parseInt(this.y_data[yp][this.y_data[yp].length - 1]) * y_ratio.y_ratio) + "");
        }
      }
    }
  }
  this.pan_lines = {};
  for (let i in points) {
    let color = this.data.colors[i] || this.line_color;
    this.drawPanLine(p_lines, i, points[i].join(" "), color);
  }
  this.pan_container.appendChild(p_lines);

  let fo_root = this.getDomHelper().createElement('div', "pan-root");
  this.getDomHelper().setStyles(this.pan_interactive_container, {
    "left": left + "px",
    "top": top + "px",
    "width": pan_width + "px",
    "height": pan_height + "px"
  });
  let fg = this.getDomHelper().createElement('div', 'fg');
  this.getDomHelper().setStyles(fg, {"height": (pan_height - 2) + "px"});
  let fg_width = this.ChartMath.getInitFGWidth(pan_width, x_ratio.axis_x_step);
  let fg_relative_x = pan_width - fg_width;
  let fg_max_x = pan_width - fg_width;
  let resize_left = this.getDomHelper().createElement('div', "resize-left");
  fg.appendChild(resize_left);
  let resize_right = this.getDomHelper().createElement('div', "resize-right");
  fg.appendChild(resize_right);
  this.getDomHelper().setStyles(fg, {"width": fg_width + "px"});
  let fg_left = this.getDomHelper().createElement('div', 'fg-left');
  let fg_right = this.getDomHelper().createElement('div', 'fg-right');
  this.getDomHelper().setStyles(fg_left, {"width": (pan_width - fg_width) + "px"});
  // this.getDomHelper().setStyles(fg_right, {"left": (pan_width - fg_relative_x - 4) + "px"});
  fo_root.appendChild(fg_left);
  fo_root.appendChild(fg);
  fo_root.appendChild(fg_right);

  this.pan_interactive_container.appendChild(fo_root);

  let fg_geom = {
    "width": fg_width,
    "min_width": 20,
    "left": fg_relative_x,
    "max": fg_max_x,
    "min": 0,
    "x_start": fg_relative_x,
    "x_curr": fg_relative_x
  };
  let fg_left_geom = {"width": (pan_width - fg_width), "left": 0, "width_curr": (pan_width - fg_width)};
  let fg_right_geom = {"width": 0, "right": 0, "width_curr": 0};

  let dragMouseMove = (function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.lock_event = true;
    let x = e.pageX;
    let dx = x - fg_geom.x_start;
    let new_x = fg_geom.left + dx;
    if (new_x < fg_geom.min) {
      fg_geom.x_curr = fg_geom.min;
      fg_left_geom.width_curr = fg_geom.min;
      fg_right_geom.width_curr = pan_width - fg_geom.width;
    } else if (new_x > fg_geom.max) {
      fg_geom.x_curr = fg_geom.max;
      fg_left_geom.width_curr = fg_geom.max;
      fg_right_geom.width_curr = 0;
    } else {
      fg_geom.x_curr = new_x;
      fg_left_geom.width_curr = new_x;
      fg_right_geom.width_curr = pan_width - new_x - fg_geom.width
    }
    this.getDomHelper().setStyles(fg, {"right": "auto", "left": (fg_geom.x_curr) + "px"});
    this.getDomHelper().setStyles(fg_left, {"right": "auto", "width": (fg_left_geom.width_curr) + "px"});
    this.getDomHelper().setStyles(fg_right, {"left": "auto", "width": (fg_right_geom.width_curr) + "px"});
  }).bind(this);
  let dragMouseDown = (function (e) {
    if (e.target !== fg) {
      return false;
    }
    fg_geom.x_start = e.pageX;
    document.body.addEventListener("mousemove", dragMouseMove);
    document.body.addEventListener("mouseup", dragMouseUp);
  }).bind(this);
  fg.addEventListener("mousedown", dragMouseDown);
  let dragMouseUp = (function (e) {
    this.lock_event = false;
    fg_geom.left = fg_geom.x_curr;
    fg_left_geom.width = fg_left_geom.width_curr;
    fg_right_geom.width = fg_right_geom.width_curr;
    document.body.removeEventListener("mousemove", dragMouseMove);
    document.body.removeEventListener("mouseup", dragMouseUp);
    updateChart();
  }).bind(this);

  let is_resize_left = false;
  let resizeMouseMove = (function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.lock_event = true;
    let x = e.pageX;
    let x_min, x_max, dx, new_x;
    dx = x - fg_geom.x_start;
    if (is_resize_left) {
      x_min = 0;
      x_max = fg_geom.left + fg_geom.width - fg_geom.min_width;
      new_x = fg_geom.left + dx;
    } else {
      x_min = fg_geom.left + fg_geom.min_width;
      x_max = pan_width;
      new_x = fg_geom.left + fg_geom.width + dx;
    }
    if (new_x < x_min) {
      if (is_resize_left) {
        fg_geom.width_curr = pan_width - fg_right_geom.width_curr;
        fg_geom.x_curr = x_min;
        fg_left_geom.width_curr = fg_geom.min;
        fg_right_geom.width_curr = pan_width - fg_geom.width_curr;
      } else {
        fg_geom.width_curr = fg_geom.min_width;
        fg_right_geom.width_curr = pan_width - fg_geom.width_curr - fg_geom.left;
      }
    } else if (new_x > x_max) {
      if (is_resize_left && (fg_left_geom.width_curr + fg_geom.width_curr) <= pan_width) {
        fg_geom.x_curr = x_max;
        fg_geom.width_curr = fg_geom.min_width;
        fg_left_geom.width_curr = x_max;
        fg_right_geom.width_curr = pan_width - fg_geom.width_curr - fg_left_geom.width_curr;
      } else if (!is_resize_left) {
        fg_geom.width_curr = pan_width - fg_geom.left;
        fg_right_geom.width_curr = 0;
      }
    } else {
      if (is_resize_left) {
        fg_geom.x_curr = new_x;
        fg_geom.width_curr = (fg_geom.left + fg_geom.width) - new_x;
        fg_left_geom.width_curr = fg_left_geom.width + dx;
        fg_right_geom.width_curr = pan_width - new_x - fg_geom.width_curr
      } else {
        fg_geom.width_curr = new_x - fg_geom.left;
        fg_right_geom.width_curr = pan_width - new_x;
      }
    }

    this.getDomHelper().setStyles(fg_left, {"right": "auto", "width": (fg_left_geom.width_curr) + "px"});
    this.getDomHelper().setStyles(fg_right, {"left": "auto", "width": (fg_right_geom.width_curr) + "px"});
    this.getDomHelper().setStyles(fg, {
      "right": "auto",
      "left": (fg_geom.x_curr) + "px",
      "width": fg_geom.width_curr + "px"
    });

  }).bind(this);

  let resizeMouseDown = (function (e) {
    if (e.target === resize_left) {
      is_resize_left = true;
    } else if (e.target === resize_right) {
      is_resize_left = false;
    } else {
      return false;
    }
    fg_geom.x_start = e.pageX;
    document.body.addEventListener("mousemove", resizeMouseMove);
    document.body.addEventListener("mouseup", resizeMouseup);

  }).bind(this);
  resize_left.addEventListener("mousedown", resizeMouseDown);
  resize_right.addEventListener("mousedown", resizeMouseDown);

  let resizeMouseup = (function (e) {
    this.lock_event = false;
    fg_geom.width = fg_geom.width_curr;
    fg_geom.left = fg_geom.x_curr;
    fg_geom.max = pan_width - fg_geom.width;
    fg_left_geom.width = fg_left_geom.width_curr;
    fg_right_geom.width = fg_right_geom.width_curr;
    document.body.removeEventListener("mousemove", resizeMouseMove);
    document.body.removeEventListener("mouseup", resizeMouseup);
    updateChart();
  }).bind(this);

  this.endTime('Chart.addPan', 1);

  let updateChart = (function () {
    this.pan_fg_width = fg_geom.width;
    this.pan_fg_left = fg_geom.left;
    setTimeout(this.reDraw.bind(this), this.deley);
  }).bind(this);
};

Chart.prototype.addLegend = function () {
  this.startTime('Chart.addLegend');
  let padding_left = this.getAxisLeft();
  let vertical_pos = this.getAxisBottom() + this.pan_height + this.pan_top_space + 20;
  let legend = this.getDomHelper().createElement('div', this.makeClassName('legend'));
  this.getDomHelper().setStyles(legend, {
    "top": "" + vertical_pos + "px",
    "left": "" + padding_left + "px"
  });
  let j = 0;
  for (let i in this.y_data) {
    let group = this.getDomHelper().createElement('div', 'legend-item');
    this.getDomHelper().addClass(group, this.makeClassName('legend-item-' + i));
    let color = this.data.colors[i] || this.line_color;
    let circle = this.getDomHelper().createElement('div', 'circle');
    this.getDomHelper().setStyles(circle, {"border-color": color, "background": color});
    group.appendChild(circle);
    let txt = this.getDomHelper().createElement('div', 'title');
    txt.textContent = this.data.names[i];
    group.appendChild(txt);

    let handler = function (e) {
      if (this.getDomHelper().classExists(circle, 'inactive')) {
        this.y_inactive[i] = false;
      } else {
        this.y_inactive[i] = true;
      }
      this.getDomHelper().toggleClass(circle, 'inactive');
      this.getDomHelper().setStyles(circle, {"background": color});
      if (this.lines[i]) {
        if (this.y_inactive[i]) {
          this.getDomHelper().setStyles(circle, {"background": "transparent"});
          this.getDomHelper().addClass(this.lines[i], 'inactive');
          this.getDomHelper().addClass(this.pan_lines[i], 'inactive');
          this.getDomHelper().addClass(this.tooltip.cols[i], 'inactive');
        } else {
          this.getDomHelper().removeClass(this.lines[i], 'inactive');
          this.getDomHelper().removeClass(this.pan_lines[i], 'inactive');
          this.getDomHelper().removeClass(this.tooltip.cols[i], 'inactive');
        }
      }
      setTimeout(this.reDraw.bind(this), this.deley);
    };

    group.addEventListener("click", handler.bind(this));

    legend.appendChild(group);
    j++;
  }
  this.container.appendChild(legend);
  this.endTime('Chart.addLegend', 1);
};

Chart.prototype.addHVLine = function (container, cls, x1, y1, x2, y2, tx, ty, title) {
  let color = "#bbbbbb";
  let line = this.getDomHelper().createElementNS(this.svgns, 'line');
  this.getDomHelper().setAttributes(line, {"x1": x1, "x2": x2, "y1": y1, "y2": y2, "stroke": color});
  let txt = this.getDomHelper().createElementNS(this.svgns, 'text');
  this.getDomHelper().setAttributes(txt, {
    "x": tx,
    "y": ty,
    "text-anchor": (cls === "x" ? "middle" : "inherit"),
    "fill": color
  });
  this.getDomHelper().addClass(txt, this.makeClassName('title'));
  this.getDomHelper().addClass(txt, this.makeClassName(cls));
  let textNode = this.getDomHelper().createTextNode(title);
  txt.appendChild(textNode);
  this.getDomHelper().addClass(line, this.makeClassName(cls));
  container.appendChild(line);
  container.appendChild(txt);
  return line;
};

Chart.prototype.getAxisLeft = function () {
  return this.axis_padding[3];
};

Chart.prototype.getAxisRight = function () {
  return this.container_width - this.axis_padding[1];
};

Chart.prototype.getAxisTop = function () {
  return this.axis_padding[0];
};

Chart.prototype.getAxisBottom = function () {
  return this.container_height - this.axis_padding[2];
};

Chart.prototype.getAxisWidth = function () {
  return this.getAxisRight() - this.getAxisLeft();
};

Chart.prototype.getAxisHeight = function () {
  return this.getAxisBottom() - this.getAxisTop();
};

Chart.prototype.addChartLines = function (container_lines, container_circles) {
  this.startTime('Chart.addChartLines');
  let y_ratio = this.ChartMath.getYRatio(this.getAxisWidth(), this.getAxisHeight(), this.y_min, this.y_max, this.formatYValue.bind(this));
  let x_ratio = this.ChartMath.getXRatio(this.getAxisWidth(), this.getAxisHeight(), this.x_data_sliced.length);
  let axis_y_zero_pos = this.getAxisBottom() - y_ratio.y_ratio * Math.abs(y_ratio.y_axis_min_v);
  // this.lines = {};
  for (let i in this.y_data_sliced) {
    if (this.y_inactive[i]) {
      continue;
    }
    let color = this.data.colors[i] || this.line_color;
    if (this.data.types[i] === "line") {
      let points = this.y_data_sliced[i];
      let points_line = "";
      let circle_data = [];
      for (let p in points) {
        let x1 = this.getAxisLeft() + (parseInt(p) * x_ratio.x_ratio);
        let y1 = axis_y_zero_pos - parseInt(points[p]) * y_ratio.y_ratio;
        points_line += "" + x1 + "," + y1 + " ";
        if (container_circles) {
          circle_data.push({"x1": x1, "y1": y1, color: color, p});
        }
      }
      let addCircles = function () {
        this.startTime("Chart.addChartLines.addCircles");
        for (let c in circle_data) {
          let circle = this.makeCircle(circle_data[c].x1, circle_data[c].y1, circle_data[c].color, circle_data[c].p);
          container_circles.appendChild(circle);
        }
        this.endTime("Chart.addChartLines.addCircles", 1);
      };
      setTimeout(addCircles.bind(this), this.deley);
      if (this.lines[i] === undefined) {
        this.drawChartLine(container_lines, i, points_line, color);
      } else {
        this.getDomHelper().setAttributes(this.lines[i], {"points": points_line});
      }
    }
  }
  let fin = function () {
    this.finish_props.lines = true;
    this.finish();
  };
  setTimeout(fin.bind(this), this.deley);
  this.endTime('Chart.addChartLines', 1);
};

Chart.prototype.drawChartLine = function (container, i, points_line, color) {
  let polyline = this.getDomHelper().createElementNS(this.svgns, 'polyline', 'line');
  this.getDomHelper().setAttributes(polyline, {"points": points_line, "fill": "none", "stroke": color});
  this.getDomHelper().addClass(polyline, "line-" + i);
  this.lines[i] = polyline;
  container.appendChild(polyline);
};

Chart.prototype.drawPanLine = function (container, i, points_line, color) {
  let spline = this.getDomHelper().createElementNS(this.svgns, 'path', 'line');
  this.getDomHelper().setAttributes(spline, {"d": points_line, "fill": "none", "stroke": color});
  this.getDomHelper().addClass(spline, "line-" + i);
  this.pan_lines[i] = spline;
  container.appendChild(spline);
};

Chart.prototype.makeCircle = function (x, y, color, idx) {
  let circle = this.getDomHelper().createElementNS(this.svgns, 'circle', 'point');
  this.getDomHelper().setAttributes(circle, {
    "cx": x,
    "cy": y,
    "r": 4,
    "stroke": color,
    "stroke-width": 2
  });
  this.getDomHelper().addClass(circle, 'point-' + idx);
  return circle;
};

Chart.prototype.reDraw = function () {
  let DomHelper = this.getDomHelper();
  let prev_y_max = this.y_max, x1_range_prev = this.x1_range, x2_range_prev = this.x2_range;
  this.findMaxMin();
  if (prev_y_max === this.y_max && x1_range_prev === this.x1_range && x2_range_prev === this.x2_range && getObjLength(this.lines) === getObjLength(this.y_data)) {
    return true;
  }

  let re_draw_lines = (function () {
    while (this.circles_container.firstChild) {
      this.circles_container.removeChild(this.circles_container.firstChild);
    }
    this.addChartLines(this.lines_container, this.circles_container);
  }).bind(this);

  let re_draw_axis = (function () {
    while (this.axis_container.firstChild) {
      this.axis_container.removeChild(this.axis_container.firstChild);
    }
    this.addXAxis(this.axis_container);
    this.addYAxis(this.axis_container);
  }).bind(this);

  re_draw_axis();
  re_draw_lines();
};

Chart.prototype.addXAxis = function (container) {
  this.startTime('Chart.addXAxis');
  let x_ratio = this.ChartMath.getXRatio(this.getAxisWidth(), this.getAxisHeight(), this.x_data_sliced.length);
  let axis_left = this.getAxisLeft();
  let axis_top = this.getAxisTop();
  let axis_bottom = this.getAxisBottom();
  let x_data = this.x_data_sliced;
  let shift_text_y = 15; // bottom text space
  for (let i = 0, j = 0; i < x_ratio.axis_x_num; i++, j += x_ratio.axis_x_step) {
    let title = this.formatTitle('x', x_data[j]);
    let left = axis_left + (j * x_ratio.x_ratio);
    this.addHVLine(container, "x", left, axis_top, left, axis_bottom, left, axis_bottom + shift_text_y, title);
  }
  this.endTime('Chart.addXAxis', 1);
};

Chart.prototype.addYAxis = function (container) {
  this.startTime('Chart.addYAxis');
  let y_ratio = this.ChartMath.getYRatio(this.getAxisWidth(), this.getAxisHeight(), this.y_min, this.y_max, this.formatYValue.bind(this));
  let axis_left = this.getAxisLeft();
  let axis_right = this.getAxisRight();
  let shift_text_y = -5;
  let shift_text_x = 0;
  let dy_bottom = this.getAxisBottom();
  for (let i = 0, j = y_ratio.y_axis_min_v; i <= y_ratio.axis_y_num; i++, j += y_ratio.axis_y_step) {
    let title = this.formatYValue(j);
    let bottom = dy_bottom;
    let ax_line = this.addHVLine(container, "y", axis_left, bottom, axis_right, bottom, axis_left + shift_text_x, bottom + shift_text_y, this.formatTitle('y', title));
    dy_bottom -= y_ratio.axis_y_space;
  }
  this.endTime('Chart.addYAxis', 1);
};

Chart.prototype.makeAxisInteractiveRect = function (container) {
  this.startTime('Chart.makeAxisInteractiveRect');
  let axis_left = this.getAxisLeft();
  let axis_right = this.getAxisRight();
  let axis_top = this.getAxisTop();
  let axis_bottom = this.getAxisBottom();
  let axis_area_width = axis_right - axis_left;
  let axis__area_height = axis_bottom - axis_top;
  let lines_interactive_container = this.getDomHelper().createElement('div', 'rect-interactive');
  let inter_line = this.inter_line;
  let y_ratio = this.ChartMath.getYRatio(this.getAxisWidth(), this.getAxisHeight(), this.y_min, this.y_max, this.formatYValue.bind(this));
  this.getDomHelper().setStyles(lines_interactive_container, {
    "left": axis_left + "px",
    "top": axis_top + "px",
    "width": axis_area_width + "px",
    "height": axis__area_height + "px"
  });

  let handler = function (e) {
    if (this.lock_event) {
      return false;
    }
    let ratio = e.offsetX / axis_area_width;
    let idx = Math.floor(ratio * this.x_data_sliced.length);
    if (idx < 0 || idx >= this.x_data_sliced.length) {
      return false;
    }
    this.getDomHelper().addClass(inter_line, 'hover');
    let circles = this.getDomHelper().findAll(this.config.container + " circle.hover");
    for (let i = 0; i < circles.length; i++) {
      this.getDomHelper().removeClass(circles[i], 'hover');
    }
    circles = this.getDomHelper().findAll(this.config.container + " circle.point-" + idx);
    if (circles.length) {
      this.getDomHelper().setAttributes(inter_line, {
        "x1": circles[0].getAttribute("cx"),
        "y1": (axis_bottom - y_ratio.axis_y_last_pos),
        "x2": circles[0].getAttribute("cx"),
        "y2": axis_bottom
      });
    }
    for (let i = 0; i < circles.length; i++) {
      this.getDomHelper().addClass(circles[i], 'hover');
    }

    let xData = this.x_data_sliced;
    this.tooltip.title.textContent = this.formatTooltipTitle(xData[idx]);
    this.getDomHelper().setAttributes(this.tooltip.tooltip, {
      "style": "left: " + e.screenX + "px; top: " + e.screenY + "px;"
    });

    for (let i in this.y_data) {
      this.tooltip.values[i].textContent = this.y_data[i][idx];
    }

    this.getDomHelper().addClass(this.tooltip.tooltip, 'hover');
  };

  let clean = function (e) {
    this.getDomHelper().removeClass(this.tooltip.tooltip, 'hover');
    this.getDomHelper().removeClass(inter_line, 'hover');
    let circles = this.getDomHelper().findAll(this.config.container + " circle.hover");
    for (let i = 0; i < circles.length; i++) {
      this.getDomHelper().removeClass(circles[i], 'hover');
    }
  };

  lines_interactive_container.addEventListener("mousemove", handler.bind(this));
  lines_interactive_container.addEventListener("mouseout", clean.bind(this));

  this.getDomHelper().addClass(inter_line, this.makeClassName('interactive-line'));
  this.container.appendChild(lines_interactive_container);

  this.endTime('Chart.makeAxisInteractiveRect', 1);
};

Chart.prototype.startTime = function (title) {
  this.performance[title] = {
    "start": +new Date(),
    "end": null
  };
};
Chart.prototype.endTime = function (title, log) {
  this.performance[title]['end'] = +new Date();
  if (log && this.debug_mode) {
    console.log("'" + title + "' took " + (this.performance[title]['end'] - this.performance[title]['start']).toFixed(1) + " ms")
  }
};