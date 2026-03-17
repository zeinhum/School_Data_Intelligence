/**
 * @class Connection
 * @description
 * Handles all communication between the frontend and the server —
 * HTML fragment fetching, JS module loading, and page redirects.
 *
 * Used exclusively by the Navigation class. Each Navigation instance
 * holds one Connection, which manages the lifecycle of the currently
 * active JS module (jsContainer). When a new partial view loads,
 * Connection destroys the previous module before importing the next,
 * preventing memory leaks on low-spec devices.
 *
 * @param {string} controller - Active MVC controller name.
 *                              Used to resolve JS module paths:
 *                              /js/{controller}/{module}.js
 */
export class Connection {
  constructor(controller) {
    this.jsContainer = null;
    this.controller = controller;
  }

  /**
   * Redirects to a server route, optionally scoped to a record id.
   * Produces: /{url}?id={id} or /{url}/ when no id is given.
   */
  redirect(url, id) {
    window.location.href = `/${url}/${id ? `?id=${id}` : ""}`;
  }

  /**
   * Fetches an HTML fragment from the server.
   * Returns the response as a string, or a fallback message on failure.
   *
   * NOTE: Response is assigned to innerHTML by the caller (Navigation).
   * HTML is sourced from controlled server endpoints only — not user input.
   *
   * @param {string}           url - Route path, e.g. "Admin/students"
   * @param {string|number}   [id] - Optional record id appended as ?id=
   * @returns {Promise<string>}
   */
  async getHTML(url, id) {
    try {
      const response = await fetch(`/${url}${id ? `?id=${id}` : ""}`);

      // Treat non-OK responses (404, 500, etc.) as failures
      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const text = await response.text();
      if (text) return text;
    } catch (err) {
      console.error("[Connection] getHTML failed:", err);
      return "No content loaded.";
    }
  }

  /**
   * Dynamically imports a JS module for the current partial view.
   *
   * Destroys the previous jsContainer (if any) before importing,
   * ensuring only one module is active at a time.
   *
   * Defers instantiation to requestAnimationFrame so the module
   * initialises after the browser has committed the innerHTML update
   * to the DOM — preventing the module from querying elements that
   * don't exist yet.
   *
   * Expects the module to export a default class with an optional
   * destroy() method for cleanup on next navigation.
   *
   * @param {string} [url] - Module filename (without .js extension).
   *                         Resolves to: /js/{controller}/{url}.js
   * @returns {Promise<object|undefined>} The instantiated module, or undefined.
   */
  async importjs(url = undefined) {
    // Destroy previous partial module before loading the next
    if (this.jsContainer) {
      this.jsContainer.destroy();
      this.jsContainer = null;
    }

    if (!url) return;

    try {
      const jsurl = `/js/${this.controller.toLowerCase()}/${url}.js`;
      const module = await import(jsurl);

      // Defer instantiation until after the browser commits the DOM update
      return new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          this.jsContainer = new module.default();
          resolve(this.jsContainer);
        });
      });
    } catch (err) {
      console.error("[Connection] importjs failed:", err);
    }
  }
}
