/*!
ISC License

Copyright (c) 2020, Kiril Vatev

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
import confetti from 'canvas-confetti';
let canvas = null,
  fire = null;
window.TallerEffects = Object.freeze({
  celebrate() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!fire) {
      canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.className = 'quest-celebration';
      canvas.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:999';
      document.body.appendChild(canvas);
      fire = confetti.create(canvas, {
        resize: true,
        useWorker: false,
        disableForReducedMotion: true,
      });
    }
    fire({
      particleCount: 75,
      spread: 75,
      startVelocity: 32,
      ticks: 150,
      gravity: 1.1,
      origin: { x: 0.6, y: 0.58 },
      colors: ['#ac4829', '#718565', '#d7b58e', '#f3dfad'],
      disableForReducedMotion: true,
    });
  },
  stop() {
    fire?.reset();
    canvas?.remove();
    canvas = null;
    fire = null;
  },
});
