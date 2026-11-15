# 3-minute demo script

Record your screen with QuickTime (File → New Screen Recording, with your mic on). Have the n8n form, the Google Sheet and the n8n canvas open in three browser tabs. Use one real receipt you shared with someone.

**0:00–0:25 · The problem** (show the sheet with a few rows, or just your face)
> "Students spend in small amounts: coffee, groceries split with roommates, the pharmacy. Budgeting apps want your bank login, spreadsheets need discipline, and the receipts end up in the trash, including the ones you need at tax time. So we built Receipt-to-Ledger."

**0:25–1:30 · Live run** (the n8n form tab)
> "I snap this grocery receipt I split with Lucy and upload it."
(Upload it, choose Debit, type `Lucy` in "Split with", submit.)
> "AI reads it, and then our workflow checks the math: subtotal plus GST plus PST has to equal the total. It also checks that GST is 5%."
(The review page appears.)
> "Nothing gets logged until a person checks it. I can approve it, fix the category or reject it."
(Pick Approve.)
> "It's logged. I've used $X of my $600 budget, and Lucy owes me $Y."
(Switch to the sheet tab.)
> "Here's the new row, with GST and PST separated, my share, and who owes what."

**1:30–2:15 · How it works** (the n8n canvas)
> "It's all built in n8n. A form trigger, OpenAI vision for reading, a code step that validates the taxes, a second form page for the human check, then Google Sheets and a budget calculation."
(Point at the bottom flow.)
> "Every Sunday, a second flow reads your ledger and AI writes you a short recap: what you spent, who owes you, and one thing to try next week."

**2:15–2:45 · Why it matters**
> "It's built for students: Canadian GST and PST, roommate splits, and it flags receipts worth keeping, like medical expenses for the tax credit. Your data lives in your own Google Sheet."

**2:45–3:00 · Next**
> "Next, we want e-receipts by email, subscription detection and IOU reminders. Thanks!"

Tips: say real numbers out loud, and keep it under 3:00 (they stop watching after that). Run through it once before you record.
