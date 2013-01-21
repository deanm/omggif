// (c) Dean McNamee <dean@gmail.com>, 2013.
// Node omggif example to write out a few example images.

var fs = require('fs');
var omggif = require('./omggif');

// Needs to be large enough for the final full file size.  Can be any type of
// buffer that supports [] (an Array, Uint8Array, Node Buffer, etc).
var buf = new Buffer(1024 * 1024);

function gen_static_global() {
  var gf = new omggif.GifWriter(buf, 2, 2, {palette: [255, 0, 0, 0, 0, 255]});
  gf.addFrame(0, 0, 2, 2,
              [0, 1, 1, 0]);
  return buf.slice(0, gf.end());
}

function gen_static_local() {
  var gf = new omggif.GifWriter(buf, 2, 2);
  gf.addFrame(0, 0, 2, 2,
              [0, 1, 1, 0],
              {palette: [255, 0, 0, 0, 0, 255]});
  return buf.slice(0, gf.end());
}

function gen_anim() {
  // The loop parameter is the number of times to loop, or 0 for forever.
  // A value of 1 will play twice (first time, and then one loop time).
  // To play only once do not specify loop or pass null.
  var gf = new omggif.GifWriter(buf, 2, 2, {loop: 1});
  gf.addFrame(0, 0, 2, 2,
              [0, 1, 1, 0],
              {palette: [255, 0, 0, 0, 0, 255]});
  gf.addFrame(0, 0, 2, 2,
              [1, 0, 0, 1],
              {palette: [255, 0, 0, 0, 0, 255],
               delay: 10});  // Delay in hundredths of a sec (100 = 1s).
  return buf.slice(0, gf.end());
}

function gen_gray_strip() {
  var gf = new omggif.GifWriter(buf, 256, 1);
  var palette = [ ];
  var indices = [ ];
  for (var i = 0; i < 256; ++i) {
    palette.push(i); palette.push(i); palette.push(i);
    indices.push(i);
  }
  gf.addFrame(0, 0, 256, 1, indices, {palette: palette});
  return buf.slice(0, gf.end());
}

function gen_color_strip() {
  var gf = new omggif.GifWriter(buf, 256, 256, {palette: [0, 0, 0, 255, 0, 0],
                                               background: 1});

  var indices = [ ];
  for (var i = 0; i < 256; ++i) indices.push(i);

  for (var j = 0; j < 256; ++j) {
    var palette = [ ];
    for (var i = 0; i < 256; ++i) {
      palette.push(j); palette.push(i); palette.push(i);
    }
    gf.addFrame(0, j, 256, 1, indices, {palette: palette, disposal: 1});
  }
  return buf.slice(0, gf.end());
}

// 1x1 white, generates the same as Google's 35 byte __utm.gif, except for some
// reason that I'm not sure of they set their background index to 255.
function gen_empty_white() {
  var gf = new omggif.GifWriter(buf, 1, 1, {palette: [255, 255, 255, 0, 0, 0]});
  gf.addFrame(0, 0, 1, 1, [0]);
  return buf.slice(0, gf.end());
}

// 1x1 transparent 43 bytes.
function gen_empty_trans() {
  var gf = new omggif.GifWriter(buf, 1, 1, {palette: [0, 0, 0, 0, 0, 0]});
  gf.addFrame(0, 0, 1, 1, [0], {transparent: 0});
  return buf.slice(0, gf.end());
}

fs.writeFileSync('./test_static_global_palette.gif', gen_static_global());
fs.writeFileSync('./test_static_local_palette.gif', gen_static_local());
fs.writeFileSync('./test_anim.gif', gen_anim());
fs.writeFileSync('./test_gray_strip.gif', gen_gray_strip());
fs.writeFileSync('./test_color_strip.gif', gen_color_strip());
fs.writeFileSync('./test_empty_white.gif', gen_empty_white());
fs.writeFileSync('./test_empty_trans.gif', gen_empty_trans());
