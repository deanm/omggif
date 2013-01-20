// (c) Dean McNamee <dean@gmail.com>, 2013.
// Node omggif example to write out a few example images.

var fs = require('fs');
var omggif = require('./omggif');

// Needs to be large enough for the final full file size.  Can be any type of
// buffer that supports [] (an Array, Uint8Array, Node Buffer, etc).
var buf = new Buffer(1024 * 1024);

function gen_static() {
  var gf = new omggif.GifWriter(buf, 2, 2);
  gf.addFrame(0, 0, 2, 2,
              [0, 1, 1, 0],
              [255, 0, 0, 0, 0, 255]);
  return buf.slice(0, gf.end());
}

function gen_anim() {
  // The loop parameter is the number of times to loop, or 0 for forever.
  // A value of 1 will play twice (first time, and then one loop time).
  // To play only once do not specify loop or pass null.
  var gf = new omggif.GifWriter(buf, 2, 2, {loop: 1});
  gf.addFrame(0, 0, 2, 2,
              [0, 1, 1, 0],
              [255, 0, 0, 0, 0, 255]);
  gf.addFrame(0, 0, 2, 2,
              [1, 0, 0, 1],
              [255, 0, 0, 0, 0, 255],
              {delay: 10});  // Delay in hundredths of a sec (100 = 1s).
  return buf.slice(0, gf.end());
}

fs.writeFileSync('./test_static.gif', gen_static());
fs.writeFileSync('./test_anim.gif', gen_anim());
