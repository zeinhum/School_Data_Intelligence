import { Connection } from "../connection/connection.js";

export class Navigation {
  constructor(controller, dashboard, connection = new Connection(controller)) {
    this.dashboard = dashboard;
    this.controller = controller;
    this.connection = connection;
    this.#eventDelegation();
  }

  #eventDelegation() {
    document.body.addEventListener("click", async (e) => {
      await this.#handleClick(e);
    });
    document.body.addEventListener("change", async (e) => {
      await this.#handleSelect(e);
    });
  }

  async #handleClick(e) {
    const target = e.target;
    const { to, js, id } = target.dataset;

    try {
      if (target.classList.contains("partial")) {
        if (!to)
          throw new Error("Missing data-to attribute on partial element.");

        const htmlText = await this.connection.getHTML(
          `${this.controller}/${to}`,
          id,
        );
        this.dashboard.innerHTML = htmlText;
        if (js) await this.connection.importjs(js);
      } else if (target.classList.contains("redirect")) {
        if (!to)
          throw new Error("Missing data-to attribute on redirect element.");
        this.connection.redirect(`${this.controller}/${to}`, id);
      } else if (target.classList.contains("external")) {
        if (!to)
          throw new Error("Missing data-to attribute on external element.");
        window.open(to, "_blank");
      }
    } catch (error) {
      console.error("[Navigation] Click handler error:", error);
    }
  }

  async #handleSelect(e) {
    const select = e.target.closest("select[data-partial]");
    if (!select) return;

    const selectedOption = select.options[select.selectedIndex];
    const { to, js, id } = selectedOption.dataset;
    if (!to) return;
    const htmlText = await this.connection.getHTML(
      `${this.controller}/${to}`,
      id,
    );
    this.dashboard.innerHTML = htmlText;
    if (js) await this.connection.importjs(js);
  }

  
}
