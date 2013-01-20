// Node text example to write out a red/blue image.
var fs = require('fs');
var omggif = require('./omggif');
var buf = new Buffer(1024 * 1024);  // Needs to be large enough for full size.
var gf = new omggif.GifWriter(buf, 2, 2);
gf.addFrame(0, 0, 2, 2,
            [0, 1, 1, 0],
            [255, 0, 0, 0, 0, 255]);
fs.writeFileSync('./test.gif', buf.slice(0, gf.end()));
