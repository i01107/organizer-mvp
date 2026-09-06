# Task 1 — App Plan & Sample Note Analysis

## App Plan

### Core Concept
A personal organizer app tailored for a Business Development Manager. The fundamental flow is:

1. **Free-text note input** — Write notes however you want (no enforced format), similar to Google Keep or Apple Notes.
2. **LLM-powered sentence detection** — The app parses the note and breaks it into individual sentences/clauses.
3. **Per-sentence action prompting** — For each detected sentence, the app asks: *"What do you want to do with this?"* Options could include: set a reminder, mark as action item, log as FYI, assign to someone, or ignore.
4. **Prioritization engine** — Based on user responses + LLM inference (urgency keywords, deadlines, names), items get auto-ranked.
5. **Reminder & alert system** — Scheduled notifications, with a WhatsApp integration for sending follow-up messages.
6. **Dashboard** — Overview of open action items, upcoming deadlines, clients, and vendors.

### Key Features (Phased)

| Phase | Feature |
|-------|---------|
| 1 | Note input + sentence splitting + action prompting |
| 2 | Priority tagging + reminder/alert system |
| 3 | WhatsApp message generation/sending |
| 4 | Dashboard (by client, vendor, brand, deadline) |
| 5 | LLM-assisted tasks (draft emails, summarize status, suggest next steps) |

### Tech Considerations
- **LLM**: Needed for sentence detection in mixed-language notes (Indonesian/English), extracting named entities (vendors, people, brands), and inferring urgency.
- **Language handling**: Notes will likely be Bahasa Indonesia, English, or a mix — the LLM layer must handle this gracefully.
- **Format-agnostic**: The app must handle wildly different note formats. No strict schema enforced on input.

---

## Analysis of `example1.txt`

### Format Observed
The sample note is semi-structured, grouped by `--` separators. Each block has:
- `Brand:` — the client/brand involved
- `Notes:` — free-text narrative (Indonesian + English mix)
- `Vendor:` — vendor name and contacts
- `Estimate budget:` — budget range

However, since the format may vary wildly in real usage, the app should not depend on these labels being present.

### Sentence-by-Sentence Breakdown

**Block 1 — Brand: Bonteh / Vendor: WRPR**

| # | Sentence | Inferred Intent |
|---|----------|----------------|
| 1 | Info ke vendor WRPR untuk kasih budgeting segera dan kasih nama kampus yang bisa ready segera. | **Action item** — follow up with WRPR |
| 2 | Top urgent, sebelum 14 Agustus udah harus ada. | **Deadline** — August 14 (hard deadline, high priority) |
| 3 | Invoicing per kampus dengan DP 50%. | **FYI / reference note** — invoicing structure |

**Block 2 — Brand: Bonteh / Vendor: Atisfy**

| # | Sentence | Inferred Intent |
|---|----------|----------------|
| 4 | Sudah maju sendiri ke management langsung Mingse (Bunga Reyza), kena harga 300 jt untuk 3 bulan dengan SOW 1x videoshoot & 1x photoshoot. | **Status update** — price agreed with Mingse directly |
| 5 | Kalo lewat Atisfyreach bisa lebih mahal tetapi tetap dapet bonus influencer untuk bantu boost campaign dan pake AI jadi more efficient & less drama. | **Decision note** — pros of using Atisfyreach |
| 6 | Next action minta 3 bulan juga ke atisfyreach karena 1 tahun nyentuh 1,5 M. | **Action item** — request 3-month proposal from Atisfyreach |

**Block 3 — Brand: Bonteh / Vendor: Playup (Warkop)**

| # | Sentence | Inferred Intent |
|---|----------|----------------|
| 7 | Warkop sudah rooting, nunggu jingle selesai. | **Status update** — blocked/waiting on jingle |
| 8 | PIC: Citra & Steffi. Belum ada timeline. | **Note** — missing timeline, needs follow-up |
| 9 | Sebenernya September harus jalan biar barengan bonteh campus ambassador & standupindo kota Bogor. | **Soft deadline** — September target, implied urgency |

**Block 4 — Brand: Bonteh / Vendor: TJ**

| # | Sentence | Inferred Intent |
|---|----------|----------------|
| 10 | TJ dipegang Steffi dan masih ada bottleneck di internal (hectic + internal outing + campaign lain). | **Status update** — internal blocker noted |
| 11 | Budget sebenernya unlimited, but TJ juga cuma 50 bus. | **Budget note** — budget context |
| 12 | Steffi udah tertarik. | **Positive signal** — Steffi is interested, potential next step |

### What the App Would Do With This Note
1. Split the note into the 12 sentences above (using LLM to handle language mix and abbreviations like "bus" = "bus" unit / "50 bus" = 50 juta).
2. Present each sentence one by one and ask: *"What's your action for this?"*
3. Auto-suggest based on inference:
   - Sentences with deadlines → suggest creating a reminder
   - Sentences starting with "Next action" → pre-flag as action item
   - Sentences with PIC names → suggest assigning follow-up
4. After prompting, build a prioritized task list with reminders set for deadlines (e.g., Aug 14 for WRPR, September for Playup/Warkop).

---

## Key Challenges to Address
- **Mixed language + informal writing**: Words like "maju sendiri", "nunggu jingle selesai", abbreviations, and casual phrasing need LLM to interpret correctly.
- **Implicit deadlines**: "September harus jalan" is a soft deadline — the app needs to surface it even without an exact date.
- **Context continuity**: Multiple blocks about the same brand (Bonteh) should be linkable in the dashboard view.
- **Varying formats**: Real notes may have none of the Brand/Vendor/Budget labels. The LLM must extract what it can from raw free text.
