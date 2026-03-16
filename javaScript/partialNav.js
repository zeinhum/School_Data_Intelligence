export class PartialNav {
  constructor(rootSelector = ".partial-container", map) {
    this.root = document.querySelector(rootSelector);
    this.funMap = map;

    if (!this.root) {
      console.warn(`Root element "${rootSelector}" not found.`);
      return;
    }

    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);

    this.init();
  }

  init() {
    this.root.addEventListener("click", this.handleClick);
    this.root.addEventListener("change", this.handleChange);
  }

  async handleClick(e) {
    try {
      const actionEl = e.target.closest("[data-action]");
      if (!actionEl || !this.root.contains(actionEl)) return;

      const { action, id } = actionEl.dataset;
      const handler = this.funMap[action];
      if (!action || !handler) return;

      await handler(id, e);
    } catch (err) {
      console.error("handleClick error:", err);
    }
  }

  async handleChange(e) {
    try {
      const actionEl = e.target.closest("[data-change]");
      if (!actionEl || !this.root.contains(actionEl)) return;

      const { change, id } = actionEl.dataset;
      const handler = this.funMap[change];
      if (!change || !handler) return;

      await handler(id, e);
    } catch (err) {
      console.error("handleChange error:", err);
    }
  }

  destroy() {
    if (this.root) {
      this.root.removeEventListener("click", this.handleClick);
      this.root.removeEventListener("change", this.handleChange);
    }

    this.root = null;
    this.funMap = null;
    this.handleClick = null;
    this.handleChange = null;
  }
}