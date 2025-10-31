const CARD_VERSION = "0.1.0";
const UET_VALID_FIELDS = [
  "amount_due",
  "due_date",
  "account",
  "billing_period",
];
const UET_DEFAULT_FIELDS = [...UET_VALID_FIELDS];
const UET_FIELD_LABELS = {
  amount_due: "Amount Due",
  due_date: "Due Date",
  account: "Account Number",
  billing_period: "Billing Period",
};
const UET_FIELD_ALIASES = {
  amount: "amount_due",
  amountdue: "amount_due",
  amount_due: "amount_due",
  due: "due_date",
  duedate: "due_date",
  due_date: "due_date",
  account: "account",
  accountnumber: "account",
  account_number: "account",
  billing: "billing_period",
  billingperiod: "billing_period",
  billing_period: "billing_period",
  period: "billing_period",
};

class UtilitiesEmailTrackerCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Entity is required");
    }

    const parsedIndex = Number(config.bill_index);
    const hasBillIndex =
      config.bill_index !== undefined &&
      config.bill_index !== null &&
      Number.isInteger(parsedIndex);

    const fields = this._normalizeFields(
      config.fields ?? config.display_fields
    );

    this._config = {
      title: config.title,
      provider: config.provider,
      entity: config.entity,
      ...(hasBillIndex ? { bill_index: parsedIndex } : {}),
      ...(fields ? { fields } : {}),
    };

    if (!this._card) {
      this._card = document.createElement("ha-card");
      this._card.classList.add("uet-card");
      this.appendChild(this._card);
    }

    this._renderStyle();
  }

  getCardSize() {
    return 3;
  }

  set hass(hass) {
    this._hass = hass;
    this._updateCard();
  }

  static getConfigElement() {
    return document.createElement("utilities-email-tracker-card-editor");
  }

  static getStubConfig(hass, entities) {
    const sensor = entities?.find((ent) => ent.startsWith("sensor."));
    return {
      type: "custom:utilities-email-tracker-card",
      entity: sensor || "",
    };
  }

  _renderStyle() {
    if (this._styleInjected) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = `
      .uet-card {
        --uet-label-color: var(--secondary-text-color);
      }
      .uet-wrapper {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
      }
      .uet-status {
        font-size: 0.75rem;
        text-transform: uppercase;
        border-radius: 12px;
        padding: 4px 10px;
        letter-spacing: 0.06em;
        background-color: var(--primary-color);
        color: var(--primary-text-color);
      }
      .uet-status.overdue {
        background-color: var(--error-color);
        color: var(--text-primary-color, #fff);
      }
      .uet-bill {
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        border-radius: 10px;
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .uet-bill + .uet-bill {
        margin-top: 8px;
      }
      .uet-bill-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .uet-bill-provider {
        font-size: 1.05rem;
        font-weight: 600;
      }
      .uet-data {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px 16px;
      }
      .uet-label {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--uet-label-color);
      }
      .uet-value {
        font-size: 1rem;
        word-break: break-word;
      }
      .uet-empty {
        padding: 16px;
        text-align: center;
        color: var(--secondary-text-color);
      }
    `;
    this.appendChild(style);
    this._styleInjected = true;
  }

  _updateCard() {
    if (!this._card || !this._config || !this._hass) {
      return;
    }

    const title = this._config.title || "Utilities";
    const stateObj = this._hass.states[this._config.entity];

    if (!stateObj) {
      this._card.innerHTML = `<div class="uet-empty">Entity ${this._config.entity} not found</div>`;
      this._card.setAttribute("header", title);
      return;
    }

    const bills = Array.isArray(stateObj.attributes?.bills)
      ? stateObj.attributes.bills
      : [];

    const list = this._collectBills(bills);

    this._card.setAttribute("header", title);

    if (!list.length) {
      this._card.innerHTML = `<div class="uet-wrapper"><div class="uet-empty">No bills available</div></div>`;
      return;
    }

    this._card.innerHTML = `
      <div class="uet-wrapper">
        ${list.map((item) => this._renderBill(item)).join("")}
      </div>
    `;
  }

  _renderRow(label, value) {
    return `
      <div>
        <div class="uet-label">${label}</div>
        <div class="uet-value">${value}</div>
      </div>
    `;
  }

  _normalizeFields(fields) {
    if (fields === undefined || fields === null || fields === "") {
      return null;
    }

    let list = [];
    if (Array.isArray(fields)) {
      list = fields;
    } else if (typeof fields === "string") {
      list = fields
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else {
      return null;
    }

    const seen = new Set();
    const normalized = [];

    list.forEach((item) => {
      const key = this._normalizeFieldKey(item);
      if (key && !seen.has(key)) {
        seen.add(key);
        normalized.push(key);
      }
    });

    if (!normalized.length) {
      return null;
    }

    return normalized;
  }

  _normalizeFieldKey(value) {
    if (value === undefined || value === null) {
      return null;
    }

    const lower = `${value}`.toLowerCase().trim();
    if (!lower) {
      return null;
    }

    const simple = lower.replace(/[\s-]+/g, "_");
    const sanitized = simple.replace(/[^a-z_]/g, "");
    const candidates = [lower, simple, sanitized];

    for (const candidate of candidates) {
      if (UET_VALID_FIELDS.includes(candidate)) {
        return candidate;
      }
      if (UET_FIELD_ALIASES[candidate]) {
        return UET_FIELD_ALIASES[candidate];
      }
    }

    return null;
  }

  _collectBills(bills) {
    if (!Array.isArray(bills) || bills.length === 0) {
      return [];
    }

    let filtered = bills;
    if (this._config.provider) {
      const providerFilter = this._config.provider;
      filtered = bills.filter((item) =>
        this._matchesProvider(item, providerFilter)
      );
      if (filtered.length === 0) {
        filtered = bills;
      }
    }

    if (Number.isInteger(this._config.bill_index)) {
      const index = this._config.bill_index;
      if (index >= 0 && index < filtered.length) {
        return [filtered[index]];
      }
      return [];
    }

    return filtered;
  }

  _renderBill(bill) {
    const provider =
      bill.provider ||
      bill.provider_name ||
      bill.providerName ||
      bill.from ||
      bill.subject ||
      "Utility";

    const account =
      bill.account_number || bill.account || bill.accountNumber || "";
    const due = this._formatDate(bill.due_date_iso, bill.due_date);
    const billing = this._resolveBillingPeriod(bill);
    const amount = this._formatAmount(bill.amount_due, bill.amount_due_value);
    const status = (bill.status || "").toLowerCase();

    const fields =
      Array.isArray(this._config.fields) && this._config.fields.length
        ? this._config.fields
        : UET_DEFAULT_FIELDS;

    const fieldValues = {
      amount_due: amount,
      due_date: due,
      account,
      billing_period: billing,
    };

    const rows = fields
      .map((field) => {
        const value = fieldValues[field];
        if (!value) {
          return "";
        }
        const label = UET_FIELD_LABELS[field] || field;
        return this._renderRow(label, value);
      })
      .filter(Boolean);

    const statusBadge = status
      ? `<div class="uet-status ${status === "overdue" ? "overdue" : ""}">${status}</div>`
      : "";

    return `
      <div class="uet-bill">
        <div class="uet-bill-header">
          <div class="uet-bill-provider">${provider}</div>
          ${statusBadge}
        </div>
        ${
          rows.length
            ? `<div class="uet-data">${rows.join("")}</div>`
            : ""
        }
      </div>
    `;
  }

  _matchesProvider(bill, filter) {
    if (!bill || !filter) {
      return false;
    }

    const rawFilter = `${filter}`.toLowerCase().trim();
    const normalizedFilter = this._normalizeString(filter);

    const candidates = [
      bill.provider,
      bill.provider_name,
      bill.providerName,
      bill.from,
      bill.subject,
      bill.from_address,
    ]
      .filter(Boolean)
      .map((value) => `${value}`);

    return candidates.some((candidate) => {
      const lower = candidate.toLowerCase();
      if (lower === rawFilter || lower.includes(rawFilter)) {
        return true;
      }

      const normalizedCandidate = this._normalizeString(candidate);
      return (
        normalizedCandidate === normalizedFilter ||
        normalizedCandidate.includes(normalizedFilter)
      );
    });
  }

  _normalizeString(value) {
    return `${value}`
      .toLowerCase()
      .replace(/[_\s-]+/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  _formatDate(iso, fallback) {
    if (iso) {
      try {
        const locale = this._hass?.locale?.language || "en";
        const formatted = new Date(iso);
        if (!Number.isNaN(formatted.getTime())) {
          return new Intl.DateTimeFormat(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }).format(formatted);
        }
      } catch (err) {
        // fallback to raw value
      }
    }
    return fallback || "";
  }

  _resolveBillingPeriod(bill) {
    if (bill.billing_period) {
      return bill.billing_period;
    }
    return this._formatDate(bill.billing_date_iso, bill.billing_date);
  }

  _formatAmount(display, numeric) {
    if (display) {
      return display;
    }

    if (typeof numeric === "number") {
      try {
        const locale = this._hass?.locale?.language || "en";
        const currency = this._hass?.locale?.currency || "USD";
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
        }).format(numeric);
      } catch (err) {
        return `${numeric}`;
      }
    }

    return "";
  }
}

class UtilitiesEmailTrackerCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass) {
      return;
    }

    if (!this._root) {
      this._root = document.createElement("div");
      this._root.classList.add("uet-editor");
      this.appendChild(this._root);
    }

    if (!this._style) {
      this._style = document.createElement("style");
      this._style.textContent = `
        .uet-editor {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 8px;
        }
        .uet-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .uet-label {
          font-weight: 600;
          font-size: 0.9rem;
        }
        .uet-description {
          color: var(--secondary-text-color);
          font-size: 0.8rem;
        }
        .uet-section {
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
          border-radius: 8px;
          padding: 12px;
          background: var(--card-background-color, transparent);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .uet-section-title {
          font-weight: 600;
          font-size: 1rem;
          color: var(--primary-text-color);
        }
        .uet-no-entities {
          padding: 8px 12px;
          background: var(--warning-color, #ffa726);
          color: var(--text-primary-color, #000);
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .uet-checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .uet-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
        }
        ha-combo-box,
        ha-textfield {
          width: 100%;
        }
      `;
      this.appendChild(this._style);
    }

    if (!this._rendered) {
      const selectedFields =
        Array.isArray(this._config?.fields) && this._config.fields.length
          ? this._config.fields
          : UET_DEFAULT_FIELDS;

      const fieldOptions = UET_VALID_FIELDS.map((field) => {
        const checked = selectedFields.includes(field) ? "checked" : "";
        const label = UET_FIELD_LABELS[field] || field;
        return `
          <label class="uet-checkbox">
            <input type="checkbox" class="uet-field-option" data-field="${field}" ${checked}>
            <span>${label}</span>
          </label>
        `;
      }).join("");

      this._root.innerHTML = `
        <div class="uet-section">
          <div class="uet-section-title">Entity</div>
          <div class="uet-field">
            <div class="uet-label">Entity</div>
            <div class="uet-description">Select the Utilities Email Tracker sensor.</div>
            <ha-combo-box
              class="entity"
              label="Entity"
              item-value-path="value"
              item-label-path="label"
              allow-custom-value
            ></ha-combo-box>
            <div class="uet-no-entities" hidden>
              No matching utility bill sensors were found. Ensure the Utilities Email Tracker integration is configured.
            </div>
          </div>
          <div class="uet-field">
            <div class="uet-label">Title</div>
            <ha-textfield
              class="title"
              label="Title (optional)"
            ></ha-textfield>
          </div>
          <div class="uet-field">
            <div class="uet-label">Provider Filter</div>
            <div class="uet-description">Match by provider name (optional).</div>
            <ha-textfield
              class="provider"
              label="Provider"
            ></ha-textfield>
          </div>
        </div>
        <div class="uet-section">
          <div class="uet-section-title">Display</div>
          <div class="uet-field">
            <div class="uet-label">Displayed Fields</div>
            <div class="uet-description">Choose which bill details to show.</div>
            <div class="uet-checkbox-group">
              ${fieldOptions}
            </div>
          </div>
          <div class="uet-field">
            <div class="uet-label">Bill Index</div>
            <div class="uet-description">Select a specific bill (0 = newest). Leave blank to show all.</div>
            <ha-textfield
              class="bill-index"
              type="number"
              min="0"
              label="Bill index"
            ></ha-textfield>
          </div>
        </div>
      `;

      this._entityCombo = this._root.querySelector(".entity");
      this._titleField = this._root.querySelector(".title");
      this._providerField = this._root.querySelector(".provider");
      this._billIndexField = this._root.querySelector(".bill-index");
      this._noEntitiesNotice = this._root.querySelector(".uet-no-entities");
      this._fieldCheckboxes = Array.from(
        this._root.querySelectorAll(".uet-field-option")
      );

      if (this._entityCombo) {
        this._entityCombo.addEventListener("value-changed", (ev) => {
          const value = ev.detail?.value ?? ev.target?.value ?? "";
          this._updateConfig("entity", value || null);
        });
      }
      this._titleField.addEventListener("input", (ev) =>
        this._updateConfig("title", ev.target.value)
      );
      this._providerField.addEventListener("input", (ev) =>
        this._updateConfig("provider", ev.target.value)
      );
      this._fieldCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const selected = this._fieldCheckboxes
            .filter((box) => box.checked)
            .map((box) => box.dataset.field)
            .filter(Boolean);
          this._updateConfig("fields", selected.length ? selected : null);
        });
      });
      this._billIndexField.addEventListener("input", (ev) => {
        const raw = ev.target.value;
        if (raw === "") {
          this._updateConfig("bill_index", null);
          return;
        }

        const value = Number(raw);
        this._updateConfig("bill_index", Number.isNaN(value) ? null : value);
      });

      this._rendered = true;
    }

    if (this._entityCombo) {
      const items = this._getUtilityEntities();
      this._entityCombo.hass = this._hass;
      this._entityCombo.items = items;
      this._entityCombo.value = this._config?.entity || "";
      if (this._noEntitiesNotice) {
        this._noEntitiesNotice.hidden = items.length > 0;
      }
    }
    if (this._titleField) {
      this._titleField.value = this._config?.title || "";
    }
    if (this._providerField) {
      this._providerField.value = this._config?.provider || "";
    }
    if (this._fieldCheckboxes) {
      const selectedFields =
        Array.isArray(this._config?.fields) && this._config.fields.length
          ? this._config.fields
          : [];
      this._fieldCheckboxes.forEach((checkbox) => {
        const field = checkbox.dataset.field;
        if (!field) {
          return;
        }
        const isChecked = selectedFields.length
          ? selectedFields.includes(field)
          : UET_DEFAULT_FIELDS.includes(field);
        checkbox.checked = isChecked;
      });
    }
    if (this._billIndexField) {
      const indexValue =
        this._config?.bill_index === undefined || this._config?.bill_index === null
          ? ""
          : `${this._config.bill_index}`;
      this._billIndexField.value = indexValue;
    }
  }

  _updateConfig(key, value) {
    if (!this._config) {
      this._config = {};
    }

    if (value === "" || value === null || value === undefined) {
      delete this._config[key];
    } else {
      this._config = {
        ...this._config,
        [key]: value,
      };
    }

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  _getUtilityEntities() {
    if (!this._hass || !this._hass.states) {
      return [];
    }

    const entries = Object.values(this._hass.states)
      .filter((state) =>
        state &&
        typeof state.entity_id === "string" &&
        state.entity_id.startsWith("sensor.") &&
        Array.isArray(state.attributes?.bills)
      )
      .map((state) => {
        const friendly = state.attributes?.friendly_name || state.entity_id;
        return {
          value: state.entity_id,
          label: `${friendly} (${state.entity_id})`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    return entries;
  }
}

if (!customElements.get("utilities-email-tracker-card")) {
  customElements.define(
    "utilities-email-tracker-card",
    UtilitiesEmailTrackerCard
  );
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "utilities-email-tracker-card",
    name: "Utilities Email Tracker Card",
    description:
      "Display the most recent utility bill parsed by the Utilities Email Tracker integration.",
    preview: true,
    version: CARD_VERSION,
  });
  console.info(
    `%cUTILITIES-EMAIL-TRACKER-CARD v${CARD_VERSION}`,
    "color: #4caf50; font-weight: 700;"
  );
}

if (!customElements.get("utilities-email-tracker-card-editor")) {
  customElements.define(
    "utilities-email-tracker-card-editor",
    UtilitiesEmailTrackerCardEditor
  );
}
