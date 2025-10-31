## Utilities Email Tracker Card

A minimal Lovelace card for surfacing the most recent bill discovered by the
Utilities Email Tracker integration. The card highlights the provider, masked
account number, billing period, due date, and amount due.

### Installation

Copy `utilities-email-tracker-card.js` into your Home Assistant `www`
directory (for example: `/config/www/utilities-email-tracker-card.js`) and add
the following resource entry:

```yaml
url: /local/utilities-email-tracker-card.js?v=1
type: module
```

### Usage

Add the card from the Lovelace dashboard editor and configure:

- **Entity** – the Utilities Email Tracker sensor (e.g.
  `sensor.my_account_utility_bills`)
- Optional **Title**, **Provider filter**, and **Bill index** can be adjusted
  in the card editor.

The card automatically formats dates using your Home Assistant locale and
displays the first matching bill based on your filter or index.
