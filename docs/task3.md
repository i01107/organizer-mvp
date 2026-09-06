# Task 3 — Question Analysis (BDM Lens)

## Review of Current Questions

### Q1: "The detected client is [X]. Is this correct?"
**Verdict: Good, but incomplete.**

The client (brand) is only one part of the picture. In agency work, a note often involves both a **client (brand)** and a **vendor**. The current note structure clearly shows this — e.g., `Brand: Bonteh` + `Vendor: WRPR`. The app should detect and confirm both separately, not just the client.

**Suggested improvement:**
- "The detected brand/client is **[X]**. Is this correct?"
- "The detected vendor is **[Y]** (contact: **[Z]**). Is this correct?"

Also, contact persons embedded in notes (e.g., "Tyo & Adhyt", "Nasya & Lynette", "Citra & Steffi") should be surfaced too, as they're often the direct point of contact for follow-up.

---

### Q2: "Which project of [client name] is this note for?"
**Verdict: Directionally right, but the term "project" can be misleading.**

In a BDM context at an agency, the unit of work is more often a **campaign**, **proposal**, or **deal**, not a generic "project." Using the right terminology reduces friction and cognitive load.

**Suggested improvement:**
- Rename to "campaign" or "deal" depending on the stage (pre-sale vs. active).
- Add a status indicator: Is this an **ongoing campaign**, an **active proposal**, or a **new opportunity**?

---

### Q3: "Is this an action item?" (Yes/No) + Priority + Deadline
**Verdict: Too binary. Needs more categories.**

A single sentence in a note can be one of many things:

| Type | Example from notes |
|------|-------------------|
| **Action item (me)** | "Info ke vendor WRPR untuk kasih budgeting segera" |
| **Waiting on someone** | "Nunggu jingle selesai" |
| **Financial/budget note** | "Invoicing per kampus dengan DP 50%" |
| **Deadline** | "Sebelum 14 Agustus udah harus ada" |
| **Status update / context** | "Sudah maju sendiri ke management langsung" |
| **Risk / blocker** | "Masih ada bottleneck di internal" |
| **Decision made** | "Kena harga 300 jt untuk 3 bulan" |

Collapsing all of this into a yes/no action item question loses a lot of value. The app won't be able to help you prioritize, alert, or track these appropriately.

---

## Missing Questions

### Q4: "Who needs to act on this?"
- **Me** — I'm the one doing the follow-up
- **Vendor** — I'm waiting for the vendor to deliver something
- **Client / Boss** — They need to approve or move something
- **Internal team** — Someone internally needs to handle this

This is critical for separating *my to-do list* from my *waiting list*.

---

### Q5: "What type of action is needed?"
For sentences classified as action items, knowing *what kind* of action helps with automation later:

- **Send a message** (WhatsApp, email) → connects to WhatsApp integration
- **Schedule a meeting**
- **Prepare a document / proposal**
- **Follow up on a payment / invoice**
- **Internal coordination**

---

### Q6: "Is there a financial component?"
BDM notes are often tied to money. Flagging a sentence as finance-related lets the app track:
- Budget estimates vs. actuals
- Invoice milestones (e.g., "DP 50%")
- Deal values for pipeline reporting

---

### Q7: "Is this a blocker or risk?"
Some sentences describe a bottleneck or a risk that could derail a campaign (e.g., "bottleneck di internal", "belum ada timeline"). These should be flagged separately so they can be escalated or monitored.

---

### Q8: "Does this need to be communicated to someone?"
Not every action item is something you *do* — sometimes it's something you *relay*. The app should ask whether a note needs to be forwarded to a team member, client, or vendor via WhatsApp or email.

---

## Recommended Question Flow (Revised)

```
1. Confirm detected brand/client → [Edit / Create new]
2. Confirm detected vendor + contact → [Edit / Skip if not applicable]
3. Link to campaign/deal → [Searchable dropdown + "New deal" option]
4. What kind of note is this?
   [ ] Action item (I need to do something)
   [ ] Waiting / follow-up expected from someone else
   [ ] Financial note (budget, invoice, payment)
   [ ] Deadline
   [ ] Status update / context
   [ ] Risk / blocker
   [ ] Decision made

   → If "Action item":
     - What type? (Message / Meeting / Document / Payment / Other)
     - Who acts? (Me / Vendor / Client / Internal)
     - Priority (1–5)
     - Deadline

   → If "Waiting":
     - Who are you waiting on?
     - Expected by? (optional date)
     - Remind me if no update by: [date]

   → If "Financial note":
     - Amount (if detectable, pre-fill)
     - Type: Budget estimate / Invoice / Payment received / Other

   → If "Risk / blocker":
     - Severity: Low / Medium / High
     - Escalate to boss? Yes / No

5. Should this trigger a message to someone? (Yes → pick contact + draft)
```

---

## Summary

The existing 3 questions are a good starting point, but they were designed for a generic task manager. For a BDM at an agency, the app needs to understand the **type** of each piece of information, **who owns it**, and **whether money or risk is involved**. Adding these dimensions will make the app genuinely useful — not just a fancier sticky note.
