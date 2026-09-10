# Tabbit 🐇

[简体中文](README.md) · [English](README_EN.md)

[![CI](https://github.com/xichengpro/tabbit/actions/workflows/ci.yml/badge.svg)](https://github.com/xichengpro/tabbit/actions/workflows/ci.yml)

A tiny rabbit that roams across web pages and reacts to the rhythm of your tabs.

Tabbit does not judge your productivity or pressure you to close everything. It turns aggregate signals—tab count, recent opening bursts, long-idle tabs, and audible tabs—into a pet mood, making a busy browsing space easier to notice and understand.

> Version `0.1.0` is a prototype for developer testing and feedback. It is not yet available in the Chrome Web Store.

## What you get

- **A responsive tab rabbit**: calm, curious, busy, and overwhelmed states, each with its own color and animation.
- **Page roaming**: Tabbit wanders around regular web pages; left-click to make it flee, or right-click to select it and open its controls.
- **Smoother and less obstructive**: nearby continuous movement prefers paths that do not cross or cover visible text, with adjustable opacity from 30% to 100%.
- **Expressive actions**: waving, hopping, napping, alert ear shakes, and mood-aware speech.
- **Idle-tab reminders**: a gentle in-page bubble appears when tabs have been untouched for a long time, with a separate off switch.
- **Plain-language explanations**: see not only a load score, but also whether tab count, opening bursts, idle tabs, or audible tabs contributed most.
- **A one-minute adoption flow**: name your rabbit and choose a light, daily, or heavy browsing rhythm.
- **Gentle feedback**: more tabs do not mean lower productivity. Tabbit describes the situation without blame, punishment, illness, or death mechanics.
- **Reduced-motion support**: follows `prefers-reduced-motion` and also provides a manual animation preference.

## Privacy by default

The Tabbit MVP does not read:

- Page content or form data
- Tab titles or URLs
- Browsing history
- Account, email, or identity information

Pet state and preferences stay in the current browser. There is no registration, application backend, or browsing-data upload.

To display the rabbit on a page, Tabbit's content script creates an isolated Shadow DOM layer on regular `http://` and `https://` pages. To avoid covering text, it only checks rendered character rectangles at candidate landing spots; it does not read, store, or upload the characters themselves. It also does not read titles, URLs, forms, or input, and cannot run on browser-internal pages such as `chrome://`. You can disable the roaming pet from its right-click menu or the options page.

The extension currently requests only three permissions:

| Permission | Why it is needed |
| --- | --- |
| `sidePanel` | Display Tabbit in the Chrome side panel |
| `storage` | Save the pet name, preferences, and state locally |
| `alarms` | Perform a low-frequency state correction once per minute |

Those are the three Manifest API permissions. The roaming content script is separately restricted to `http://*/*` and `https://*/*`, with no additional `host_permissions`. Every build audits both API permissions and content-script scope; an unreviewed change fails CI.

## Try it from source

You will need Chrome 114+, Node.js 22, and npm.

```bash
git clone https://github.com/xichengpro/tabbit.git
cd tabbit
npm ci
npm run build
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `.output/chrome-mv3` directory in the project.
5. Click the Tabbit toolbar icon to open the side panel.

On first launch, Tabbit guides you through a three-step adoption flow. After adoption, refresh a regular web page to meet the roaming rabbit. Left-click to make it flee; right-click to toggle idle-tab reminders, open full settings, or hide it. The options page can turn it back on.

## How moods are calculated

Tabbit uses aggregate counts only and produces a browser-load score from 0 to 100:

| Signal | Weight |
| --- | ---: |
| Tab count | 55% |
| Tabs opened in the last 10 minutes | 25% |
| Ratio of long-idle tabs | 15% |
| Audible tabs | 5% |

Debouncing and mood hysteresis prevent the rabbit from flickering between moods during rapid tab changes or near a score boundary.

## Project status

Available now:

- Side-panel pet home and three-step adoption
- Free page roaming, left-click fleeing, and a right-click control menu
- Wave, hop, nap, and alert mood actions
- Long-idle tab reminders with a 30-minute cooldown
- Live browser-load score with contributing reasons
- Four-state SVG animation with reduced-motion support
- Local preferences, versioned storage, migrations, and corrupt/future-data protection
- Typed Simplified Chinese mood copy, late-night variants, and six-hour repetition avoidance
- Automated type checks, unit tests, production builds, permission audits, and build artifacts

Planned:

- A 25-minute focus timer and completion celebrations
- An optional tab-organizing assistant; closing, moving, or grouping tabs will always require preview and confirmation
- A richer decoration and progression system
- User-uploaded pet photos or animations, stored locally with validation and a restore-default option
- Chrome Web Store release, store artwork, and a privacy-policy page
- Edge and Firefox support

The **Start focus** and **Organize tabs** buttons currently shown in the interface are previews and are not enabled yet.

## FAQ

**Why does Tabbit avoid criticizing me when I have many tabs?**

It is a companion, not a productivity score. You can choose limits that match your own browsing style during adoption or in settings.

**Will it close tabs automatically?**

No. The current version never closes, moves, or groups tabs. Any future organizing feature will require explicit confirmation.

**How do I hide the rabbit on web pages?**

Right-click the rabbit and choose **Hide roaming rabbit**. You can turn it back on from Tabbit settings, and idle-tab reminders have their own switch.

**What happens to my data if I uninstall it?**

Chrome normally removes an extension's local storage during uninstall. This prototype has no account or cloud-recovery feature.

**Why is there no store installation link?**

The project is still being validated. A store submission will follow real-browser verification, accessibility review, and completion of the privacy materials.

## Feedback and contributing

Found a bug or have an idea for the rabbit? Open an [Issue](https://github.com/xichengpro/tabbit/issues). Please remove private page content, access tokens, and other sensitive information from logs or screenshots.

Developer documentation is currently maintained in Chinese:

- [Product requirements](docs/PRD.md)
- [Interaction and visual design](docs/DESIGN.md)
- [Technical design](docs/TECHNICAL_DESIGN.md)
- [Testing and release](docs/TEST_AND_RELEASE.md)
- [Delivery plan](docs/DELIVERY_PLAN.md)
- [Contributing guide](CONTRIBUTING.md)

## License

[MIT](LICENSE)
