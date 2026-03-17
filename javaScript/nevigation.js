/**
 * @class Navigation
 * @description
 * Singleton router for the application shell. Mounts once on page load
 * and persists for the entire session lifetime — it is never destroyed.
 *
 * Manages all UI navigation through a single event delegation pattern:
 * one listener on document.body handles every click and change event
 * in the application, routing actions based on CSS classes and data
 * attributes on the triggering element.
 *
 * Supported navigation types:
 *  - partial   : fetches an HTML fragment from the server and renders
 *                it into the dashboard container. Optionally imports
 *                a JS module to back the partial view.
 *  - redirect  : performs a full server-side redirect.
 *  - external  : opens a URL in a new tab.
 *
 * Partial views loaded by this class manage their own JS lifecycle —
 * modules are imported on demand and destroyed when the partial is
 * replaced, preventing memory leaks on low-spec devices.
 *
 * HTML rendered via innerHTML is sourced exclusively from controlled
 * server endpoints, not user input — XSS risk is acknowledged and
 * mitigated at the server level.
 *
 * @param {string} controller - The active MVC controller name, used
 *                              to prefix server request URLs.
 * @param {HTMLElement} dashboard - The container element where partial
 *                                  views are rendered.
 * @param {Connection} connection - Optional. Injected connection instance
 *                                  for server communication. Defaults to
 *                                  new Connection(controller). Accepts a
 *                                  mock for testing.
 *
 * @example
 * const nav = new Navigation("Admin", document.getElementById("dashboard"));
 */



import { Connection } from "../connection/connection.js";

export class Navigation {
  constructor(controller, dashboard, connection = new Connection(controller)) {
    this.dashboard = dashboard;
    this.controller = controller;
    this.connection = connection;
    this.#eventDelegation();
  }

  /**
 * Attaches delegated listeners to document.body.
 * A single click handler and a single change handler cover
 * all interactive elements in the application.
 */
  #eventDelegation() {
    document.body.addEventListener("click", async (e) => {
      await this.#handleClick(e);
    });
    document.body.addEventListener("change", async (e) => {
      await this.#handleSelect(e);
    });
  }

  /**
 * Routes click events based on the target's CSS class.
 * Reads data-to, data-js, and data-id attributes to determine
 * the request URL, optional JS module, and optional record ID.
 */
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
        // HTML sourced from server endpoints only — not user input
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

  /**
 * Routes select/dropdown change events.
 * Reads data attributes from the selected <option> rather than
 * the <select> itself, allowing each option to target a different
 * partial view.
 */
  async #handleSelect(e) {
    try{
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
  } catch(error){
      
console.error("[Navigation] select handler error:", error);
  
}
