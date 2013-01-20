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

fs.writeFileSync('./test_static_global_palette.gif', gen_static_global());
fs.writeFileSync('./test_static_local_palette.gif', gen_static_local());
fs.writeFileSync('./test_anim.gif', gen_anim());
fs.writeFileSync('./test_gray_strip.gif', gen_gray_strip());
