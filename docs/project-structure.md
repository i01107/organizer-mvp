# Project Structure

## Overview

This repository contains a front-end proof of concept for **My Productivity Tool**: a note organizer for business-development work. A user enters free-form notes, the app splits them into sentences, guides the user through a structured decision for each sentence in sequence, and displays saved records in a priority-ordered table.

The application is entirely client-side. It has no build step, backend, database, or test suite at present.

## Directory Layout

```text
organizer-candra/
├── client/                       # Runnable static web application
│   ├── index.html                # Page markup, CDN dependencies, modal/table layout
│   ├── script.js                 # Application state, UI behavior, persistence, rendering
│   └── compromise.min.js         # Local Compromise NLP library used for sentence splitting
└── docs/                         # Product discovery and project documentation
    ├── example1.txt              # Sample mixed Indonesian/English business note
    ├── prompts.md                # Original requirements and task history
    ├── task1.md                  # Product plan and analysis of the sample note
    ├── task3.md                  # BDM-oriented review of the classification questions
    └── project-structure.md      # This document
```

## Client Application

### `client/index.html`

Defines the complete page shell and imports its runtime dependencies:

- **Tailwind CSS CDN** for styling, including an inline perfect-fourth type scale.
- **jQuery CDN** for DOM access and event handling.
- **Compromise** (`compromise.min.js`) for client-side sentence detection.
- **Google Fonts / Inter** for typography.
- **`script.js`** for all application behavior.

The visible interface is organized into these areas:

1. **Free Note** — textarea and the “Analyze Notes” action.
2. **Saved Items** — a horizontally scrollable table of persisted decisions.
3. **New Client modal** — collects a client name and optional default campaign.
4. **Decision modal** — an editable sentence field and a three-step flow for classifying and saving each detected sentence in turn.

### `client/script.js`

Contains all business logic and UI behavior. Its main sections are:

| Area | Responsibility |
|---|---|
| Constants | Defines storage key, note-type metadata, and badge styles. |
| Mock data | Supplies the initial client and campaign dropdown values. |
| State | Tracks currently analyzed sentences and the active decision modal. |
| Storage | Loads and upserts saved items in browser `localStorage`. |
| Helpers | Escapes displayed text, formats dates, and builds select options. |
| Detection | Cleans note text, splits it with Compromise NLP, and detects known client names. |
| Modal flow | Renders and collects the three decision steps, then opens the next detected sentence after each save. |
| Table rendering | Sorts saved items and renders the summary table. |
| Event handlers | Wires buttons, chips, modals, client creation, and status changes. |

## User and Data Flow

```text
Free-text note
    ↓
splitSentences()
    ↓
First sentence opens in the decision modal
    ↓
Three-step decision modal
    ├── Context: client, campaign, vendor, contact
    ├── Note type: action, waiting, financial, deadline, status, risk, decision
    └── Type-specific details
    ↓
commitSave()
    ↓
localStorage["organizer_items"]
    ↓
Next sentence, or the priority/deadline-sorted “Saved Items” table when complete
```

## Decision Modal

The modal makes a decision one sentence at a time.

1. **Context** — choose or create a client, then add campaign/project and optional vendor information.
2. **Note type** — select one of seven categories: action item, waiting, financial, deadline, status update, risk/blocker, or decision made.
3. **Details** — fields change according to the selected type:
   - Action item: actor, action type, priority, deadline.
   - Waiting: responsible party, expected date, reminder date.
   - Financial: amount and financial category.
   - Risk/blocker: severity and escalation decision.
   - Other types: no extra fields currently required.

## Persistence Model

Saved decisions are stored only in the current browser under the `organizer_items` localStorage key. The value is a JSON array. A representative record is:

```json
{
  "id": "uuid",
  "sentence": "Follow up with WRPR for the budget.",
  "client": "Bonteh",
  "campaign": "Campus Ambassador",
  "vendor": "WRPR",
  "vendorContact": "Tyo & Adhyt",
  "noteType": "action_item",
  "whoActs": "me",
  "actionType": "message",
  "priority": 5,
  "deadline": "2026-08-14",
  "waitingOn": null,
  "expectedBy": null,
  "remindBy": null,
  "amount": null,
  "financialType": null,
  "severity": null,
  "escalate": null,
  "status": "open",
  "dateAdded": "2026-08-25T10:00:00.000Z"
}
```

The item table orders records by descending priority (5 first), then ascending deadline. A status badge can cycle through `open`, `done`, and `waiting`.

## Documentation and Product Inputs

- [`prompts.md`](prompts.md) is the original product brief and records the POC requirements.
- [`task1.md`](task1.md) explains the intended product roadmap and analyzes the supplied sample note.
- [`task3.md`](task3.md) expands the original yes/no task questions into a BDM-specific classification model.
- [`example1.txt`](example1.txt) is sample input used to guide sentence types, client/vendor context, deadlines, and financial details.

## Current Boundaries and Next Steps

The POC deliberately keeps several concerns in the browser:

- Client/campaign data begins as in-memory mock data; newly created clients last only until refresh.
- Saved items persist per browser and device only; there is no shared database, authentication, backup, or synchronization.
- Sentence splitting uses a generic local NLP library. The planned LLM-assisted extraction of mixed-language context, entities, intent, and urgency is not yet implemented.
- Reminder delivery, WhatsApp integration, dashboard analytics, and automated message drafts are future capabilities described in the planning documents.

To evolve this into a production application, separate the UI from a durable API/data layer, persist client/campaign records as well as decisions, add a migration/version strategy for stored items, and introduce an LLM service behind a secure server-side boundary.
