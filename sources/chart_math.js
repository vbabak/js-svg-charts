'use strict';

/**
 * Charts Math class
 *
 * @param {number} axis_x_min_space
 * @param {number} axis_y_min_space
 * @constructor
 *
 * @author Vladyslav Babak <marmalade.vlad@gmail.com>
 */
function ChartMath(axis_x_min_space, axis_y_min_space) {
  this.axis_x_space = axis_x_min_space;
  this.axis_y_space = axis_y_min_space;
}

ChartMath.prototype.getXRatio = function (box_w, box_h, x_num, x_space) {
  let axis_x_num, axis_x_space, axis_x_step, x_ratio;

  axis_x_space = x_space || this.axis_x_space;
  axis_x_num = Math.floor(box_w / axis_x_space); // lines num, -1
  if (x_num < axis_x_num) {
    axis_x_num = x_num;
  }
  axis_x_step = Math.ceil(x_num / axis_x_num);
  axis_x_num = Math.ceil(x_num / axis_x_step);
  x_ratio = box_w / x_num;

  let data = {
    "axis_x_num": axis_x_num,
    "axis_x_step": axis_x_step,
    "x_ratio": x_ratio
  };

  return data;
};

ChartMath.prototype.getYRatio = function (box_w, box_h, y_min, y_max, YValFormatter) {
  let axis_y_num, axis_y_space, axis_y_step, y_axis_min_v, y_axis_max_v, y_ratio, axis_y_last_pos;

  axis_y_space = this.axis_y_space; // px
  axis_y_num = Math.floor(box_h / axis_y_space); // lines num, -1
  axis_y_step = Math.ceil(y_max / axis_y_num); // val
  axis_y_step = YValFormatter(axis_y_step);
  y_axis_min_v = YValFormatter(Math.min(y_min, 0));
  y_axis_max_v = YValFormatter(y_max);
  axis_y_last_pos = axis_y_num * axis_y_space; // px
  let axis_y_last_val = axis_y_num * axis_y_step; // val
  let axis_y_first_val = y_axis_min_v; // val
  y_ratio = (axis_y_last_pos) / (axis_y_last_val - axis_y_first_val); // px

  let data = {
    "axis_y_num": axis_y_num,
    "axis_y_space": axis_y_space,
    "axis_y_step": axis_y_step,
    "y_axis_min_v": y_axis_min_v,
    "y_axis_max_v": y_axis_max_v,
    "y_ratio": y_ratio,
    "axis_y_last_pos": axis_y_last_pos
  };

  return data;
};

ChartMath.prototype.getInitFGWidth = function (width, axis_x_step) {
  let fg_width = (width * (200 / axis_x_step) / 100);
  return fg_width;
};

ChartMath.prototype.getNumDisabled = function (y_inactive) {
  let n = 0;
  for (let i in y_inactive) {
    if (y_inactive[i] == true) {
      n++;
    }
  }
  return n;
};