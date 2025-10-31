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
  in the card editor. Leave the bill index blank to list every available bill.

The card defaults to the title **Utilities** when a custom title isn't
provided. All matching bills are rendered with their provider, status, and key
details so you can scan every utility in one place. The provider filter
performs a flexible match against the bill attributes, so you can enter a
partial provider name (for example just `PSNC`) or sender address to target the
correct bill.

The card automatically formats dates using your Home Assistant locale and
displays the first matching bill based on your filter or index.
