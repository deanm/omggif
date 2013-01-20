// (c) Dean McNamee <dean@gmail.com>, 2013.
//
// https://github.com/deanm/omggif
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.
//
// omggif is a JavaScript implementation of a GIF 89a encoder, including
// animation and compression.  It does not rely on any specific underlying
// system, so should run in the browser, Node, or Plask.

function GifWriter(buf, width, height, gopts) {
  var p = 0;

  var gopts = gopts === undefined ? { } : gopts;
  var loop_count = gopts.loop === undefined ? null : gopts.loop;
  var global_palette = gopts.palette === undefined ? null : gopts.palette;

  if (width <= 0 || height <= 0 || width > 65535 || height > 65535)
    throw "Width/Height invalid."

  function check_palette_and_num_colors(palette) {
    var num_colors = (palette.length / 3) >> 0;
    if (num_colors * 3 !== palette.length)
      throw "Palette must be a multiple of 3 (RGB components).";
    if (num_colors < 2 || num_colors > 256 ||  num_colors & (num_colors-1))
      throw "Invalid code/color length, must be power of 2 and 2 .. 256.";
    return num_colors;
  }

  // TODO(deanm): Accept optional global palette.

  // - Header.
  buf[p++] = 0x47; buf[p++] = 0x49; buf[p++] = 0x46;  // GIF
  buf[p++] = 0x38; buf[p++] = 0x39; buf[p++] = 0x61;  // 89a

  // Handling of Global Color Table (palette) and background index.
  var gp_num_colors_pow2 = 0;
  var background = 0;
  if (global_palette !== null) {
    var gp_num_colors = check_palette_and_num_colors(global_palette);
    while (gp_num_colors >>= 1) ++gp_num_colors_pow2;
    gp_num_colors = 1 << gp_num_colors_pow2;
    --gp_num_colors_pow2;
    if (gopts.background !== undefined) {
      background = gopts.background;
      if (background >= gp_num_colors) throw "Background index out of range.";
    }
  }

  // - Logical Screen Descriptor.
  // NOTE(deanm): w/h apparently ignored by implementations, but set anyway.
  buf[p++] = width & 0xff; buf[p++] = width >> 8 & 0xff;
  buf[p++] = height & 0xff; buf[p++] = height >> 8 & 0xff;
  // NOTE: Indicates 0-bpp original color resolution (unused?).
  buf[p++] = (global_palette !== null ? 0x80 : 0) |  // Global Color Table Flag.
             gp_num_colors_pow2;  // NOTE: No sort flag (unused?).
  buf[p++] = background;  // Background Color Index.
  buf[p++] = 0;  // Pixel aspect ratio (unused?).

  // - Global Color Table
  if (global_palette !== null) {
    for (var i = 0, il = global_palette.length; i < il; ++i) {
      buf[p++] = global_palette[i];
    }
  }

  if (loop_count !== null) {  // Netscape block for looping.
    if (loop_count < 0 || loop_count > 65535)
      throw "Loop count invalid."
    // Extension code, label, and length.
    buf[p++] = 0x21; buf[p++] = 0xff; buf[p++] = 0x0b;
    // NETSCAPE2.0
    buf[p++] = 0x4e; buf[p++] = 0x45; buf[p++] = 0x54; buf[p++] = 0x53;
    buf[p++] = 0x43; buf[p++] = 0x41; buf[p++] = 0x50; buf[p++] = 0x45;
    buf[p++] = 0x32; buf[p++] = 0x2e; buf[p++] = 0x30;
    // Sub-block
    buf[p++] = 0x03; buf[p++] = 0x01;
    buf[p++] = loop_count & 0xff; buf[p++] = loop_count >> 8 & 0xff;
    buf[p++] = 0x00;  // Terminator.
  }

  // Main compression routine, palette indexes -> LZW code stream.
  function outputLZWCodeStream(min_code_size, index_stream) {
    buf[p++] = min_code_size;
    var cur_subblock = p++;  // Pointing at the length field.

    var clear_code = 1 << min_code_size;
    var eoi_code = clear_code + 1;
    var next_code = eoi_code + 1;

    var cur_code_size = min_code_size + 1;  // Number of bits per code.
    var cur_shift = 0;
    // We have at most 12-bit codes, so we should have to hold a max of 19
    // bits here (and then we would write out).
    var cur = 0;

    function emit_bits_to_buffer(bit_block_size) {
      while (cur_shift >= bit_block_size) {
        buf[p++] = cur & 0xff;
        cur >>= 8;
        cur_shift -= 8;
        // If we've finished a subblock.
        if (p - cur_subblock === 256) {
          buf[cur_subblock] = 255;
          cur_subblock = p++;
        }
      }
    }

    function emit_code(c) {
      cur |= c << cur_shift;
      cur_shift += cur_code_size;
      emit_bits_to_buffer(8);
    }

    // TODO(deanm): Very badly implemented code table...
    var code_table = { };
    var index_buffer = null;

    emit_code(clear_code);

    for (var i = 0, il = index_stream.length; i < il; ++i) {
      var k = index_stream[i];

      if (k >= clear_code)
        throw "Index stream contains index outside of palette range.";

      // First index of stream, just load into the index buffer.
      if (i === 0) {
        index_buffer = [ k ];
        continue;
      }

      // Otherwise check if we have to create a new code table entry.
      index_buffer.push(k);  // buffer + k.
      var key = index_buffer.join(',');
      if (!(key in code_table)) {  // Do we not have buffer + k?
        // NOTE(deanm): It's a bit tricky to understand exactly when to move
        // to the next bit size.  Looks like the right approach is to first
        // first emit any pending codes, then increase.

        index_buffer.pop(k);
        // Emit buffer (without k).
        if (index_buffer.length === 1) {
          emit_code(index_buffer[0]);
        } else {
          emit_code(code_table[index_buffer.join(',')]);
        }

        if (next_code === 4096) {  // Table full, need a clear.
          next_code = eoi_code + 1;
          cur_code_size = min_code_size + 1;
          emit_code(clear_code);
          code_table = { };
        } else {
          if (next_code >= (1 << cur_code_size)) ++cur_code_size;
          code_table[key] = next_code++;  // Insert code
        }
        // index_buffer then becomes k.
        index_buffer = [ k ];
      }
    }

    if (index_buffer.length === 0)
      throw "Finished with an empty index buffer, something is wrong.";

    if (index_buffer.length === 1) {
      emit_code(index_buffer[0]);
    } else {
      emit_code(code_table[index_buffer.join(',')]);
    }

    emit_code(eoi_code);

    // Flush / finalize the sub-blocks stream.
    emit_bits_to_buffer(1);

    if (p + 1 === cur_subblock) {
      // Can just use the current empty sub-block as the terminator.
      buf[cur_subblock] = 0;
    } else {
      // Finish the current sub-block and terminate.
      buf[cur_subblock] = p - cur_subblock - 1;
      buf[p++] = 0;
    }
  }

  var ended = false;

  this.addFrame = function(x, y, w, h, indexed_pixels, opts) {
    if (ended === true) { --p; ended = false; }  // Un-end.

    opts = opts === undefined ? { } : opts;

    // TODO(deanm): Bounds check x, y.  Do they need to be within the virtual
    // canvas width/height, I imagine?
    if (x < 0 || y < 0 || x > 65535 || y > 65535)
      throw "x/y invalid."

    if (w <= 0 || h <= 0 || w > 65535 || h > 65535)
      throw "Width/Height invalid."

    var using_local_palette = true;
    var palette = opts.palette;
    if (palette === undefined || palette === null) {
      using_local_palette = false;
      palette = global_palette;
    }

    if (palette === undefined || palette === null)
      throw "Must supply either a local or global palette.";

    var num_colors = check_palette_and_num_colors(palette);

    // Compute the min_code_size (power of 2), destroying num_colors.
    var min_code_size = 0;
    while (num_colors >>= 1) ++min_code_size;
    num_colors = 1 << min_code_size;  // Now we can easily get it back.

    var delay = opts.delay === undefined ? 0 : opts.delay;

    // - Graphics Control Extension
    buf[p++] = 0x21; buf[p++] = 0xf9;  // Extension / Label.
    buf[p++] = 4;  // Byte size.

    //buf[p++] = 0x05;  // Disposal 1 + Transparent.
    //buf[p++] = 0x04;  // Disposal 1.
    buf[p++] = 0x00;
    buf[p++] = delay & 0xff; buf[p++] = delay >> 8 & 0xff;
    buf[p++] = 0;  // Transparent color index.
    buf[p++] = 0;  // Block Terminator.

    // - Image Descriptor
    buf[p++] = 0x2c;  // Image Seperator.
    buf[p++] = 0; buf[p++] = 0;  // Left.
    buf[p++] = 0; buf[p++] = 0;  // Top.
    buf[p++] = width & 0xff; buf[p++] = width >> 8 & 0xff;
    buf[p++] = height & 0xff; buf[p++] = height >> 8 & 0xff;
    // NOTE: No sort flag (unused?).
    // TODO(deanm): Support interlace.
    buf[p++] = using_local_palette === true ? (0x80 | (min_code_size-1)) : 0;

    // - Local Color Table
    if (using_local_palette === true) {
      for (var i = 0, il = palette.length; i < il; ++i) {
        buf[p++] = palette[i];
      }
    }

    outputLZWCodeStream(min_code_size < 2 ? 2 : min_code_size, indexed_pixels);
  };

  this.end = function() {
    if (ended === false) {
      buf[p++] = 0x3b;  // Trailer.
      ended = true;
    }
    return p;
  };
}

try { exports.GifWriter = GifWriter; } catch(e) { }  // CommonJS.
