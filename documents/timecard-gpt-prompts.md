# Timecard Generation — GPT Image 2 Prompts

**How to use:** For each card below, open GPT Image 2, **attach the blank weekly ticket**
(`templates/weekly-labor-ticket-blank.png`), and paste the prompt. Generate 2–3 and pick the
cleanest. After you have the final images, we set the app's extraction "ground truth" to match
what the cards actually show (reconcile-from-output).

**4 cards total:** 3 real (weeks 1–3, gypsum crew) + 1 wrong-project decoy.
Traps: Week 1 = low-quality scan · Week 2 = extra-0 improbable data · Wrong-project = rejected.

Common to the 3 real cards: Contractor **Navillus Contracting**, Project **633 Third Ave – 17th Fl Fit-Out**,
Job # **2412**, Cost Code **09 29 00**, Phase **Partitions – 17th Fl**, Approved By **T. Brennan**.
Leave Materials and Equipment/Misc blank. Blue ballpoint, natural handwriting.

---

## CARD 1 — Week 1  (TRAP: low-quality scan → manual entry)

> Using the attached blank "Weekly Labor Ticket" as the exact form, fill it in with realistic
> **blue ballpoint handwriting**, then make the whole image look like a **poor-quality photocopy/scan**:
> low contrast, slightly dark and blotchy, faint streaks, a little skew — legible to a human who
> looks closely but hard for OCR. Handwrite these values:
> - Week Ending: **7/3/26**   No.: **3041**
> - Contractor: **Navillus Contracting**   Project: **633 Third Ave – 17th Fl Fit-Out**
> - Job #: **2412**   Cost Code: **09 29 00**   Phase: **Partitions – 17th Fl**
> - Description of Work: **Partition layout & metal framing, 17th fl east**
> - LABOR rows (Class | Worker | Hours | Rate/Hr | Extension):
>   - Foreman | M. Torres | 44 | 95.00 | 4,180.00
>   - Carpenter | J. Okafor | 40 | 85.00 | 3,400.00
>   - Carpenter | D. Russo | 40 | 85.00 | 3,400.00
>   - Apprentice | K. Park | 36 | 55.00 | 1,980.00
> - Total Labor: **12,960.00**   Ticket Total: **12,960.00**
> - Approved By: **T. Brennan**   Date: **7/6/26**
> Leave Materials and Equipment/Misc blank. Keep the printed form and layout intact; output one image.

---

## CARD 2 — Week 2  (TRAP: extra-0 improbable data → flagged & corrected)

> Using the attached blank "Weekly Labor Ticket" as the exact form, fill it in with realistic
> **blue ballpoint handwriting**, clean and clearly legible. Handwrite these values:
> - Week Ending: **7/10/26**   No.: **3068**
> - Contractor: **Navillus Contracting**   Project: **633 Third Ave – 17th Fl Fit-Out**
> - Job #: **2412**   Cost Code: **09 29 00**   Phase: **Partitions – 17th Fl**
> - Description of Work: **Framing & board hang, 17th fl east; shim at out-of-plumb shafts**
> - LABOR rows (Class | Worker | Hours | Rate/Hr | Extension):
>   - Foreman | M. Torres | 48 | 95.00 | 4,560.00
>   - Carpenter | J. Okafor | 44 | 85.00 | 3,740.00
>   - Carpenter | D. Russo | 44 | 85.00 | 3,740.00
>   - Apprentice | K. Park | **440** | 55.00 | 24,200.00   ← (intentional data error: extra zero)
> - Total Labor: **36,240.00**   Ticket Total: **36,240.00**
> - Approved By: **T. Brennan**   Date: **7/13/26**
> Leave Materials and Equipment/Misc blank. Keep the printed form and layout intact; output one image.
>
> NOTE: the **440** and the inflated totals are deliberate — this card tests the app catching an
> impossible weekly hours value. (True value is 44 → 2,420 → correct total 14,460.)

---

## CARD 3 — Week 3  (clean → auto-approves)

> Using the attached blank "Weekly Labor Ticket" as the exact form, fill it in with realistic
> **blue ballpoint handwriting**, clean and clearly legible. Handwrite these values:
> - Week Ending: **7/17/26**   No.: **3095**
> - Contractor: **Navillus Contracting**   Project: **633 Third Ave – 17th Fl Fit-Out**
> - Job #: **2412**   Cost Code: **09 29 00**   Phase: **Partitions – 17th Fl**
> - Description of Work: **Board hang east/central; taping east; patch at MEP penetrations**
> - LABOR rows (Class | Worker | Hours | Rate/Hr | Extension):
>   - Foreman | M. Torres | 54 | 95.00 | 5,130.00
>   - Carpenter | J. Okafor | 50 | 85.00 | 4,250.00
>   - Carpenter | D. Russo | 48 | 85.00 | 4,080.00
>   - Apprentice | K. Park | 48 | 55.00 | 2,640.00
> - Total Labor: **16,100.00**   Ticket Total: **16,100.00**
> - Approved By: **T. Brennan**   Date: **7/17/26**
> Leave Materials and Equipment/Misc blank. Keep the printed form and layout intact; output one image.

---

## CARD 4 — Wrong-project decoy  (TRAP: rejected, not counted)

> Using the attached blank "Weekly Labor Ticket" as the exact form, fill it in with realistic
> **blue ballpoint handwriting**, clean and clearly legible. This is a card from a DIFFERENT
> project (it should be recognizably not the 633 Third Ave job). Handwrite these values:
> - Week Ending: **7/10/26**   No.: **1177**
> - Contractor: **Navillus Contracting**   Project: **215 Water Street – Lobby Renovation**
> - Job #: **2388**   Cost Code: **09 29 00**   Phase: **Lobby – Level 1**
> - Description of Work: **Furring & gypsum at lobby feature wall**
> - LABOR rows (Class | Worker | Hours | Rate/Hr | Extension):
>   - Foreman | L. Mendez | 40 | 95.00 | 3,800.00
>   - Carpenter | T. Walsh | 40 | 85.00 | 3,400.00
>   - Carpenter | A. Ruiz | 38 | 85.00 | 3,230.00
>   - Apprentice | J. Kim | 36 | 55.00 | 1,980.00
> - Total Labor: **12,410.00**   Ticket Total: **12,410.00**
> - Approved By: **R. Doyle**   Date: **7/13/26**
> Leave Materials and Equipment/Misc blank. Keep the printed form and layout intact; output one image.
>
> NOTE: Job # **2388** / Project **215 Water Street** deliberately differ from the current job
> (2412 / 633 Third Ave) — this tests the app rejecting a ticket that belongs to another project.

---

## Ground-truth reference (what the app should end up with after review)

| Card | Week | Crew hours | Correct total labor | Outcome |
|---|---|--:|--:|---|
| 1 | Wk 1 | 160 | $12,960 | low-conf → manual entry |
| 2 | Wk 2 | 180 | $14,460 | 440→44 flagged & corrected |
| 3 | Wk 3 | 200 | $16,100 | auto-approved |
| 4 | — | — | — | rejected (wrong project) |

Reconciled gypsum actuals (cards 1–3): **540 hrs / $43,520** → productivity 0.75, projecting ~+$41K over labor budget.
