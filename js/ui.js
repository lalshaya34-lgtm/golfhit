const starfield = {
  canvas: document.getElementById('bgStars'),
  ctx: null,
  stars: [],
  dpr: window.devicePixelRatio || 1,

  init() {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.animate();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    const panel = document.querySelector('.course-panel');
    if (!panel) return;
    const rect = panel.getBoundingClientRect();

    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      radius: 0.8 + Math.random() * 2.6,
      alpha: 0.2 + Math.random() * 0.8,
      speed: 0.3 + Math.random() * 1.1
    }));
  },

  animate() {
    const ctx = this.ctx;
    const panel = document.querySelector('.course-panel');
    if (!ctx || !panel) return;

    const rect = panel.getBoundingClientRect();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    for (const star of this.stars) {
      star.y += star.speed;
      if (star.y > rect.height + 8) {
        star.y = -8;
        star.x = Math.random() * rect.width;
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(() => this.animate());
  }
};

window.addEventListener('DOMContentLoaded', () => {
  starfield.init();
});
