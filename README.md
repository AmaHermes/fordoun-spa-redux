# Fordoun Spa — Booking Concept

A booking page concept for [Fordoun Hotel & Spa](https://fordoun.com), KZN
Midlands. Turns a 6-message WhatsApp back-and-forth into one perfect
WhatsApp request — without changing how the spa actually runs.

**Live demo:** https://amahermes.github.io/fordoun-spa-redux/

## What it does

- Browses the full treatment menu (68 treatments across 10 categories)
- Lets the visitor select multiple treatments, see the running total and
  duration
- Captures preferred date / time of day / number of guests / notes
- Generates a perfectly formatted WhatsApp message to the spa's existing
  WhatsApp Business number (`+27 78 165 5087`)

## What it intentionally doesn't do

- **No real-time availability.** The spa team still confirms the slot
  manually — but they receive a structured request instead of a vague
  enquiry. No new system for the spa to learn or maintain.
- **No payment.** Deposit / payment logistics stay where they are
  (typically on arrival or via EFT after WhatsApp confirmation).

## Stack

Pure static HTML/CSS/JS — no framework, no build step. Hero photo and
menu data sourced from fordoun.com (March 2026 PDF).

## Local preview

```bash
cd docs && python3 -m http.server 8765
```

## Credit

Photography © Fordoun Hotel & Spa.
Booking concept built by [Razz](https://woolies-redux.app), 2026.
