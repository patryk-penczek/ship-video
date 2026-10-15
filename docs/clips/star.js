/* README clip for the closing "star it" section: a star floats while a shine sweeps across it. Seamless 4 s loop. */
Film({
  duration: 4, bpm: 120, track: null, hits: [],
  fonts: ["700 40px 'Inter Variable'"],
  build({ tl, $, scene }) {
    const STAR = "M12 1.8l3.1 6.4 7 .9-5.1 4.9 1.3 6.9L12 17.6l-6.3 3.3 1.3-6.9-5.1-4.9 7-.9z";
    const s = scene(`<div class="bigstar"><svg viewBox="0 0 24 24">
        <defs><clipPath id="sc"><path d="${STAR}"/></clipPath>
          <linearGradient id="sh" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
        <g clip-path="url(#sc)"><rect x="0" y="0" width="24" height="24" fill="#ffc83d"/><rect class="shine" x="0" y="-4" width="7" height="32" fill="url(#sh)" transform="skewX(-20)"/></g>
        <path d="${STAR}" fill="none" stroke="#ffde7a" stroke-width=".35" stroke-linejoin="round"/></svg></div>
      <div class="starline">If it made you a film you like, <span>star it</span></div>`, 0, null);
    tl.fromTo($(s, ".shine"), { attr: { x: -16 } }, { attr: { x: 34 }, duration: 4, ease: "none" }, 0);   // outside the star at both ends
    tl.fromTo($(s, ".bigstar"), { y: 0, rotation: -4 }, { y: -18, rotation: 4, duration: 2, ease: "sine.inOut" }, 0);
    tl.to($(s, ".bigstar"), { y: 0, rotation: -4, duration: 2, ease: "sine.inOut" }, 2);
  },
});
