"""Build the LOOP demo video: HTML slides + real app screenshots + macOS `say` narration -> mp4."""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
V = os.path.join(HERE, "vid")
CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
ROW = json.load(open(os.path.join(HERE, "ledger_rows.json")))

CSS = """
*{box-sizing:border-box;margin:0}
body{width:1280px;height:720px;overflow:hidden;position:relative;font-family:-apple-system,'SF Pro Display','Helvetica Neue',sans-serif;
background:#0f1412;color:#f3f1ea;display:flex;flex-direction:column;justify-content:center;padding:80px 96px}
.k{font:600 18px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#7fd6a4;margin-bottom:28px}
h1{font-size:76px;line-height:1.02;letter-spacing:-.03em;font-weight:750}
h2{font-size:54px;line-height:1.08;letter-spacing:-.02em;font-weight:700;margin-bottom:34px}
p{font-size:28px;line-height:1.45;color:#c9c6bb;max-width:1000px}
.acc{color:#7fd6a4}
.row{display:flex;gap:8px;flex-wrap:nowrap;align-items:center}
.box{background:#1b2420;border:1px solid #2c3a33;border-radius:12px;padding:12px 13px;font-size:17px;white-space:nowrap;line-height:1.25}
.box b{display:block;color:#7fd6a4;font:600 13px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px}
.arr{color:#55665d;font-size:20px}
table{border-collapse:collapse;font-size:19px;margin-top:8px}
th{font:600 13px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;color:#7fd6a4;text-align:left;padding:10px 14px;border-bottom:1px solid #2c3a33}
td{padding:14px;white-space:nowrap;border-bottom:1px solid #222c27;color:#e9e6dc}
.foot{position:absolute;bottom:40px;left:96px;font:500 16px ui-monospace,Menlo,monospace;color:#6c7a72}
ul{font-size:28px;line-height:1.7;color:#c9c6bb;padding-left:30px}
"""

def page(body):
    return "<!doctype html><meta charset=utf-8><style>%s</style><body>%s<div class=foot>Receipt-to-Ledger · LOOP 2026 · built with n8n</div></body>" % (CSS, body)

def ledger_table():
    cols = ["Date", "Vendor", "Total", "GST", "PST", "Your share", "Split with", "Category", "Keep for taxes"]
    th = "".join("<th>%s</th>" % c for c in cols)
    trs = "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % (r.get(c, "") or "—") for c in cols) for r in ROW)
    return "<div class=k>Your Google Sheet</div><h2>Every receipt becomes a clean row</h2><table><tr>%s</tr>%s</table>" % (th, trs)

FLOW = """<div class=k>How it's built · n8n</div><h2>Two flows, one human in the loop</h2>
<div class=row>
<div class=box><b>Trigger</b>Form upload</div><span class=arr>→</span>
<div class=box><b>AI</b>OpenAI vision<br>reads receipt</div><span class=arr>→</span>
<div class=box><b>Code</b>GST/PST + total<br>checks, split</div><span class=arr>→</span>
<div class=box><b>Human</b>Approve · fix · reject</div><span class=arr>→</span>
<div class=box><b>Sheets</b>Append row,<br>read month</div><span class=arr>→</span>
<div class=box><b>Result</b>Budget, IOUs,<br>tax flag</div></div>
<div class=row style="margin-top:34px">
<div class=box><b>Schedule</b>Sunday 6 PM</div><span class=arr>→</span>
<div class=box><b>Sheets</b>Read the week</div><span class=arr>→</span>
<div class=box><b>Code</b>Totals, IOUs</div><span class=arr>→</span>
<div class=box><b>AI</b>Writes a 4-line recap</div><span class=arr>→</span>
<div class=box><b>Email</b>Sunday digest</div></div>"""

SLIDES = [
    ("s01", page("<div class=k>LOOP 2026 · n8n Track · Investly Finance Track</div><h1>Receipt-to-<span class=acc>Ledger</span></h1><p style='margin-top:28px'>Snap a receipt. AI reads it. You approve it. It lands in your ledger.<br>By Braxton Hauw (UBC) and Lucy Liu (NYU).</p>"),
     "This is Receipt to Ledger, by Braxton Hauw and Lucy Liu. Snap a receipt, A I reads it, you approve it, and it lands in your ledger."),
    ("s02", page("<div class=k>The problem</div><h2>Student money leaks in small amounts</h2><ul><li>Coffee, groceries split with roommates, a pharmacy run</li><li>Budget apps want your bank login</li><li>Spreadsheets need discipline nobody has in midterms</li><li>Receipts end up in the trash, including the ones you need at tax time</li></ul>"),
     "Students lose track of money in small amounts. Coffee, groceries split with roommates, a pharmacy run. Budgeting apps want your bank login, spreadsheets need discipline, and receipts end up in the trash, including the ones you need at tax time."),
    ("s03", None, "Here's the live app, built in n eight n. You upload a receipt photo, say how you paid, and who you split it with."),
    ("s04", page("<div class=row style='gap:70px'><img src='file://%s' style='height:560px;border-radius:10px;box-shadow:0 20px 60px #0008'><div><div class=k>Live demo</div><h2>A prescription receipt</h2><p>Uploaded through the form. No typing.</p></div></div>" % os.path.join(HERE, "receipt_pharmacy.png")),
     "Let's try this pharmacy receipt for a prescription."),
    ("s05", None, "An A I vision model reads the store, the date, and the G S T and P S T. Then our code checks the math. Subtotal plus taxes has to equal the total, and G S T has to be five percent. Nothing is saved until a person checks it. You approve it, change the category, or reject it."),
    ("s06", None, "Approved. It's logged, and you instantly see your month. How much of your budget you've used, what's left, who owes you money, and a reminder to keep this receipt, because prescriptions count toward the medical expense tax credit."),
    ("s07", page(ledger_table()),
     "Every receipt becomes a clean row in your own Google Sheet, with taxes split out, your share, and who owes what. Earlier I split a coffee with Lucy, so she owes me nine dollars sixty six."),
    ("s08", page(FLOW),
     "Under the hood it's two n eight n flows. A form trigger, OpenAI vision, a code step that validates Canadian taxes, a human in the loop form, an approve or reject branch, Google Sheets, and a budget calculation. A second flow runs every Sunday. It reads your week, and A I writes you a short, specific recap."),
    ("s09", page("<div class=k>What's next</div><h2>The lowest-effort way to know where your money went</h2><ul><li>Forward e-receipts by email</li><li>Spot recurring subscriptions</li><li>IOU reminders with a “settled” button</li><li>Tax-ready export for your return</li></ul>"),
     "Next, we want e-receipts by email, subscription detection, and I O U reminders. Receipt to Ledger. The lowest effort way to know where your money went. Thanks!"),
]

def run(*a):
    subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

segs = []
for name, html, text in SLIDES:
    png = os.path.join(V, name + ".png")
    if html is not None:
        hp = os.path.join(V, name + ".html")
        open(hp, "w").write(html)
        run(CH, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
            "--user-data-dir=" + os.path.join(HERE, "chromeprof2"), "--window-size=1280,720",
            "--screenshot=" + png, "file://" + hp)
    assert os.path.exists(png), png
    aiff = os.path.join(V, name + ".aiff")
    run("say", "-v", "Samantha", "-r", "185", "-o", aiff, text)
    mp4 = os.path.join(V, name + ".mp4")
    run(FF, "-y", "-loop", "1", "-i", png, "-i", aiff, "-af", "apad=pad_dur=0.6", "-shortest",
        "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x0f1412,format=yuv420p",
        "-c:v", "libx264", "-tune", "stillimage", "-r", "30", "-c:a", "aac", "-b:a", "160k", mp4)
    segs.append(mp4)

lst = os.path.join(V, "list.txt")
open(lst, "w").write("".join("file '%s'\n" % s for s in segs))
out = os.path.join(HERE, "receipt-to-ledger-demo.mp4")
run(FF, "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out)
dur = subprocess.run([FF, "-i", out], capture_output=True, text=True).stderr
print([l.strip() for l in dur.splitlines() if "Duration" in l][0], out)
