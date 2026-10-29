import os
import pptx
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
import shutil

# Initialize 16:9 Presentation (13.333 in x 7.50 in)
prs = pptx.Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# VibeSift Rich Emerald & Soft Mint Brand Palette (Non-Flat, Premium SaaS)
COLOR_BG_PAGE = RGBColor(243, 248, 244)     # #F3F8F4 - Rich soft ambient background (not flat sterile white!)
COLOR_WHITE = RGBColor(255, 255, 255)       # #FFFFFF - Crisp elevated card white
COLOR_INK = RGBColor(17, 26, 21)            # #111A15 - Ultra-deep high-contrast charcoal
COLOR_INK_MUTED = RGBColor(65, 80, 72)      # #415048 - Secondary text
COLOR_MUTED = RGBColor(105, 120, 112)       # #697870 - Meta & counters
COLOR_EMERALD = RGBColor(22, 163, 74)       # #16A34A - Primary leaf green
COLOR_EMERALD_DEEP = RGBColor(21, 128, 61)  # #15803D - Deep forest green
COLOR_EMERALD_LIGHT = RGBColor(34, 197, 94) # #22C55E - Vibrant neon-glow green
COLOR_MINT_TINT = RGBColor(234, 244, 236)   # #EAF4EC - Pill / badge tint
COLOR_BORDER = RGBColor(215, 228, 220)      # #D7E4DC - Crisp premium border
COLOR_BORDER_GLOW = RGBColor(34, 197, 94)   # Accent border for highlight cards

def set_slide_background(slide):
    # Rich soft ambient mint gradient feel
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = COLOR_BG_PAGE
    bg.line.fill.background()

    # Subtle ambient accent line at top
    top_line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.06))
    top_line.fill.solid()
    top_line.fill.fore_color.rgb = COLOR_EMERALD
    top_line.line.fill.background()

    return bg

def add_slide_header(slide, tag_text, title_text, count_text=""):
    # Category Tag Pill
    pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.38), Inches(2.6), Inches(0.34))
    pill.fill.solid()
    pill.fill.fore_color.rgb = COLOR_MINT_TINT
    pill.line.color.rgb = COLOR_BORDER
    pill.line.width = Pt(1)
    ptf = pill.text_frame
    ptf.margin_left = ptf.margin_top = ptf.margin_right = ptf.margin_bottom = 0
    pp = ptf.paragraphs[0]
    pp.alignment = PP_ALIGN.CENTER
    pp.text = tag_text.upper()
    pp.font.name = "Arial"
    pp.font.size = Pt(10)
    pp.font.bold = True
    pp.font.color.rgb = COLOR_EMERALD_DEEP

    # Slide Counter
    if count_text:
        tx_cnt = slide.shapes.add_textbox(Inches(9.8), Inches(0.38), Inches(2.733), Inches(0.34))
        tf_cnt = tx_cnt.text_frame
        tf_cnt.margin_left = tf_cnt.margin_top = tf_cnt.margin_right = tf_cnt.margin_bottom = 0
        p_cnt = tf_cnt.paragraphs[0]
        p_cnt.alignment = PP_ALIGN.RIGHT
        p_cnt.text = count_text
        p_cnt.font.name = "Arial"
        p_cnt.font.size = Pt(12)
        p_cnt.font.bold = True
        p_cnt.font.color.rgb = COLOR_MUTED

    # Big Title
    tx_title = slide.shapes.add_textbox(Inches(0.8), Inches(0.76), Inches(11.733), Inches(0.65))
    tf_title = tx_title.text_frame
    tf_title.word_wrap = True
    tf_title.margin_left = tf_title.margin_top = tf_title.margin_right = tf_title.margin_bottom = 0
    p_title = tf_title.paragraphs[0]
    p_title.text = title_text
    p_title.font.name = "Arial"
    p_title.font.size = Pt(27)
    p_title.font.bold = True
    p_title.font.color.rgb = COLOR_INK

# ==========================================================
# SLIDE 1: COVER SLIDE
# ==========================================================
def build_slide_1():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.65), Inches(3.6), Inches(0.42))
    pill.fill.solid()
    pill.fill.fore_color.rgb = COLOR_WHITE
    pill.line.color.rgb = COLOR_EMERALD_LIGHT
    pill.line.width = Pt(1.5)
    ptf = pill.text_frame
    ptf.margin_left = ptf.margin_top = ptf.margin_right = ptf.margin_bottom = 0
    pp = ptf.paragraphs[0]
    pp.alignment = PP_ALIGN.CENTER
    pp.text = "● PITCH DECK • LAUNCH-READINESS"
    pp.font.name = "Arial"
    pp.font.size = Pt(11)
    pp.font.bold = True
    pp.font.color.rgb = COLOR_EMERALD_DEEP

    tx = slide.shapes.add_textbox(Inches(0.8), Inches(1.25), Inches(11.733), Inches(1.6))
    tf = tx.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "VibeSift"
    p.font.name = "Arial"
    p.font.size = Pt(58)
    p.font.bold = True
    p.font.color.rgb = COLOR_INK

    p2 = tf.add_paragraph()
    p2.text = "The Pre-Launch Safety Net for AI-Built Websites"
    p2.font.name = "Arial"
    p2.font.size = Pt(24)
    p2.font.bold = True
    p2.font.color.rgb = COLOR_EMERALD_DEEP
    p2.space_before = Pt(6)

    cards = [
        {"num": "< 60s", "title": "Automated Quality Gate", "desc": "Audit security headers, secret leaks, mobile speed & SEO in under one minute before public launch."},
        {"num": "0–100", "title": "Launch-Readiness Score", "desc": "A weighted, evidence-backed score telling founders whether their website is truly safe to ship."},
        {"num": "1-Click", "title": "AI Code Remediations", "desc": "Generates exact copy-paste code snippets for Next.js, Vite, Tailwind & Nginx to fix issues immediately."}
    ]

    card_w = Inches(3.68)
    card_h = Inches(2.7)
    gap = Inches(0.34)
    for i, c in enumerate(cards):
        cx = Inches(0.8) + i * (card_w + gap)
        cy = Inches(3.35)

        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, card_w, card_h)
        box.fill.solid()
        box.fill.fore_color.rgb = COLOR_WHITE
        box.line.color.rgb = COLOR_BORDER_GLOW if i == 0 else COLOR_BORDER
        box.line.width = Pt(2 if i == 0 else 1)

        ctf = box.text_frame
        ctf.word_wrap = True
        ctf.margin_left = Inches(0.28)
        ctf.margin_right = Inches(0.28)
        ctf.margin_top = Inches(0.25)
        ctf.margin_bottom = Inches(0.2)

        p_num = ctf.paragraphs[0]
        p_num.text = c["num"]
        p_num.font.name = "Arial"
        p_num.font.size = Pt(32)
        p_num.font.bold = True
        p_num.font.color.rgb = COLOR_EMERALD

        p_t = ctf.add_paragraph()
        p_t.text = c["title"]
        p_t.font.name = "Arial"
        p_t.font.size = Pt(16.5)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_INK
        p_t.space_before = Pt(8)

        p_d = ctf.add_paragraph()
        p_d.text = c["desc"]
        p_d.font.name = "Arial"
        p_d.font.size = Pt(12.5)
        p_d.font.color.rgb = COLOR_INK_MUTED
        p_d.space_before = Pt(8)

    bot = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.35), Inches(11.733), Inches(0.65))
    bot.fill.solid()
    bot.fill.fore_color.rgb = COLOR_WHITE
    bot.line.color.rgb = COLOR_BORDER
    bot.line.width = Pt(1)
    btf = bot.text_frame
    bp = btf.paragraphs[0]
    bp.alignment = PP_ALIGN.CENTER
    bp.text = "⚡ Live SaaS Production Deployment: vibesift.pixir.in  •  Presented by Pixir"
    bp.font.name = "Arial"
    bp.font.size = Pt(13)
    bp.font.bold = True
    bp.font.color.rgb = COLOR_EMERALD_DEEP

# ==========================================================
# SLIDE 2: THE MODERN SHIFT
# ==========================================================
def build_slide_2():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)
    add_slide_header(slide, "The Modern Trend", "Nowadays, Anyone Can Build An App in Hours with AI", "Slide 2 of 10")

    trends = [
        {
            "tag": "10X BUILD SPEED",
            "stat": "1 Day",
            "title": "Generative Coding Tools",
            "points": [
                "Cursor, v0, Bolt, Lovable & Claude let founders ship apps in a single weekend.",
                "No more waiting months for an engineering agency.",
                "Ideas become interactive software almost instantly."
            ]
        },
        {
            "tag": "NEW DEMOGRAPHIC",
            "stat": "Millions",
            "title": "A New Wave of Builders",
            "points": [
                "Solo founders, designers & marketers write code without DevOps teams.",
                "Fast prototyping replaces slow corporate development cycles.",
                "The focus is entirely on product speed and fast validation."
            ]
        },
        {
            "tag": "INSTANT PRODUCTION",
            "stat": "1-Click",
            "title": "Zero-Barrier Cloud Hosting",
            "points": [
                "Platforms like Vercel & Netlify deploy apps to the world in seconds.",
                "Live URLs are shared on Twitter, LinkedIn & Product Hunt immediately.",
                "The friction between idea and production has completely vanished."
            ]
        }
    ]

    card_w = Inches(3.68)
    card_h = Inches(4.7)
    gap = Inches(0.34)

    for i, t in enumerate(trends):
        cx = Inches(0.8) + i * (card_w + gap)
        cy = Inches(1.58)

        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, card_w, card_h)
        box.fill.solid()
        box.fill.fore_color.rgb = COLOR_WHITE
        box.line.color.rgb = COLOR_BORDER
        box.line.width = Pt(1)

        ctf = box.text_frame
        ctf.word_wrap = True
        ctf.margin_left = Inches(0.26)
        ctf.margin_right = Inches(0.26)
        ctf.margin_top = Inches(0.26)

        p_tag = ctf.paragraphs[0]
        p_tag.text = t["tag"]
        p_tag.font.name = "Arial"
        p_tag.font.size = Pt(11)
        p_tag.font.bold = True
        p_tag.font.color.rgb = COLOR_EMERALD_DEEP

        p_stat = ctf.add_paragraph()
        p_stat.text = t["stat"]
        p_stat.font.name = "Arial"
        p_stat.font.size = Pt(38)
        p_stat.font.bold = True
        p_stat.font.color.rgb = COLOR_EMERALD
        p_stat.space_before = Pt(4)

        p_t = ctf.add_paragraph()
        p_t.text = t["title"]
        p_t.font.name = "Arial"
        p_t.font.size = Pt(16)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_INK
        p_t.space_before = Pt(6)

        for pt in t["points"]:
            bp = ctf.add_paragraph()
            bp.text = f"• {pt}"
            bp.font.name = "Arial"
            bp.font.size = Pt(12)
            bp.font.color.rgb = COLOR_INK_MUTED
            bp.space_before = Pt(10)

    bot = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.45), Inches(11.733), Inches(0.55))
    bot.fill.solid()
    bot.fill.fore_color.rgb = COLOR_WHITE
    bot.line.color.rgb = COLOR_BORDER
    bot.line.width = Pt(1)
    btf = bot.text_frame
    bp = btf.paragraphs[0]
    bp.alignment = PP_ALIGN.CENTER
    bp.text = "The Reality: Building software is faster than ever—but who is checking if the code is actually safe to launch?"
    bp.font.name = "Arial"
    bp.font.size = Pt(12.5)
    bp.font.bold = True
    bp.font.color.rgb = COLOR_INK

# ==========================================================
# SLIDE 3: THE PROBLEM
# ==========================================================
def build_slide_3():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)
    add_slide_header(slide, "The Big Problem", "AI Code Looks Good on Outside, But Ships Broken Inside", "Slide 3 of 10")

    problems = [
        {
            "tag": "ACCIDENTAL LEAKS",
            "stat": "60%+",
            "title": "Secret & Asset Exposure",
            "points": [
                "AI tools frequently leak .env variables & API keys into client bundles.",
                "Unbundled source maps (.map) expose your complete backend logic.",
                "Unauthenticated debug routes are left exposed online."
            ]
        },
        {
            "tag": "SECURITY RISKS",
            "stat": "78%",
            "title": "Missing Security Headers",
            "points": [
                "No Content-Security-Policy (CSP) exposes users to XSS attacks.",
                "Missing HSTS allows traffic downgrades on public WiFi.",
                "Session cookies lack Secure and SameSite protection flags."
            ]
        },
        {
            "tag": "USER BOUNCE",
            "stat": "< 52",
            "title": "Poor Mobile Speed & SEO",
            "points": [
                "Bloated packages cause agonizingly slow mobile load times.",
                "Unoptimized fonts cause massive layout shifts (CLS).",
                "Missing meta descriptions destroy launch day Google ranking."
            ]
        }
    ]

    card_w = Inches(3.68)
    card_h = Inches(4.7)
    gap = Inches(0.34)

    for i, p in enumerate(problems):
        cx = Inches(0.8) + i * (card_w + gap)
        cy = Inches(1.58)

        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, card_w, card_h)
        box.fill.solid()
        box.fill.fore_color.rgb = COLOR_WHITE
        box.line.color.rgb = COLOR_BORDER
        box.line.width = Pt(1)

        ctf = box.text_frame
        ctf.word_wrap = True
        ctf.margin_left = Inches(0.26)
        ctf.margin_right = Inches(0.26)
        ctf.margin_top = Inches(0.26)

        p_tag = ctf.paragraphs[0]
        p_tag.text = p["tag"]
        p_tag.font.name = "Arial"
        p_tag.font.size = Pt(11)
        p_tag.font.bold = True
        p_tag.font.color.rgb = COLOR_EMERALD_DEEP

        p_stat = ctf.add_paragraph()
        p_stat.text = p["stat"]
        p_stat.font.name = "Arial"
        p_stat.font.size = Pt(38)
        p_stat.font.bold = True
        p_stat.font.color.rgb = COLOR_EMERALD
        p_stat.space_before = Pt(4)

        p_t = ctf.add_paragraph()
        p_t.text = p["title"]
        p_t.font.name = "Arial"
        p_t.font.size = Pt(16)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_INK
        p_t.space_before = Pt(6)

        for pt in p["points"]:
            bp = ctf.add_paragraph()
            bp.text = f"• {pt}"
            bp.font.name = "Arial"
            bp.font.size = Pt(12)
            bp.font.color.rgb = COLOR_INK_MUTED
            bp.space_before = Pt(10)

    bot = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.45), Inches(11.733), Inches(0.55))
    bot.fill.solid()
    bot.fill.fore_color.rgb = COLOR_WHITE
    bot.line.color.rgb = COLOR_BORDER
    bot.line.width = Pt(1)
    btf = bot.text_frame
    bp = btf.paragraphs[0]
    bp.alignment = PP_ALIGN.CENTER
    bp.text = "The Consequence: Founders launch on Product Hunt or social media, only to get hacked or lose customers on day one."
    bp.font.name = "Arial"
    bp.font.size = Pt(12.5)
    bp.font.bold = True
    bp.font.color.rgb = COLOR_INK

# ==========================================================
# SLIDE 4: THE SOLUTION
# ==========================================================
def build_slide_4():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)
    add_slide_header(slide, "The Solution", "Meet VibeSift: The Automated Launch-Readiness Auditor", "Slide 4 of 10")

    pillars = [
        {
            "badge": "1. INSTANT AUDIT",
            "title": "Comprehensive 60s Scan",
            "desc": "Paste your URL. VibeSift immediately checks HTTP security headers, TLS ciphers, Core Web Vitals, leaking secrets & SEO.",
            "points": [
                "Zero authorization barrier for public scans",
                "Non-destructive, safe automated inspection",
                "Instant verdict before announcing to the world"
            ]
        },
        {
            "badge": "2. QUANTIFIED CONFIDENCE",
            "title": "Launch Score (0–100)",
            "desc": "A single weighted score telling you immediately whether your website is safe and ready for public launch.",
            "points": [
                "Deducts points based on real severity risks",
                "Clear visual breakdown across Security, Speed & SEO",
                "Live score increases as you resolve issues"
            ]
        },
        {
            "badge": "3. NO GUESSWORK",
            "title": "AI Code Remediations",
            "desc": "We don't just dump raw error logs. VibeSift uses AI to give you exact before-and-after copy-paste code snippets.",
            "points": [
                "Tailored for Next.js, Vite, Tailwind & Nginx",
                "Fixes issues in minutes, not days",
                "Built for AI developers and solo builders"
            ]
        }
    ]

    card_w = Inches(3.68)
    card_h = Inches(4.7)
    gap = Inches(0.34)

    for i, p in enumerate(pillars):
        cx = Inches(0.8) + i * (card_w + gap)
        cy = Inches(1.58)

        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, card_w, card_h)
        box.fill.solid()
        box.fill.fore_color.rgb = COLOR_WHITE
        box.line.color.rgb = COLOR_BORDER_GLOW if i == 1 else COLOR_BORDER
        box.line.width = Pt(2 if i == 1 else 1)

        ctf = box.text_frame
        ctf.word_wrap = True
        ctf.margin_left = Inches(0.28)
        ctf.margin_right = Inches(0.28)
        ctf.margin_top = Inches(0.28)

        p_b = ctf.paragraphs[0]
        p_b.text = p["badge"]
        p_b.font.name = "Arial"
        p_b.font.size = Pt(11)
        p_b.font.bold = True
        p_b.font.color.rgb = COLOR_EMERALD_DEEP

        p_t = ctf.add_paragraph()
        p_t.text = p["title"]
        p_t.font.name = "Arial"
        p_t.font.size = Pt(19)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_INK
        p_t.space_before = Pt(8)

        p_d = ctf.add_paragraph()
        p_d.text = p["desc"]
        p_d.font.name = "Arial"
        p_d.font.size = Pt(13)
        p_d.font.color.rgb = COLOR_INK_MUTED
        p_d.space_before = Pt(8)

        for pt in p["points"]:
            bp = ctf.add_paragraph()
            bp.text = f"✔ {pt}"
            bp.font.name = "Arial"
            bp.font.size = Pt(12)
            bp.font.color.rgb = COLOR_EMERALD_DEEP
            bp.space_before = Pt(8)

    bot = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.45), Inches(11.733), Inches(0.55))
    bot.fill.solid()
    bot.fill.fore_color.rgb = COLOR_WHITE
    bot.line.color.rgb = COLOR_BORDER
    bot.line.width = Pt(1)
    btf = bot.text_frame
    bp = btf.paragraphs[0]
    bp.alignment = PP_ALIGN.CENTER
    bp.text = "Think Grammarly for Website Launches: We catch critical security, speed & SEO mistakes before your users do."
    bp.font.name = "Arial"
    bp.font.size = Pt(12.5)
    bp.font.bold = True
    bp.font.color.rgb = COLOR_INK

# ==========================================================
# SLIDE 5: HOW IT WORKS
# ==========================================================
def build_slide_5():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)
    add_slide_header(slide, "Simple Workflow", "How It Works: 3 Simple Steps for Any Builder", "Slide 5 of 10")

    steps = [
        {
            "num": "STEP 1",
            "title": "Paste Your URL",
            "subtitle": "Zero installation needed",
            "points": [
                "Enter any staging, preview, or production link.",
                "Choose an instant Public Scan or verify ownership for deep containerized checks.",
                "Automated SSRF validation protects against malformed links."
            ]
        },
        {
            "num": "STEP 2",
            "title": "Watch Live Audit",
            "subtitle": "Real-time automated telemetry",
            "points": [
                "Multi-engine workers evaluate TLS, security headers, mobile CWV & secrets in parallel.",
                "Deduplicates overlapping findings across engines.",
                "Generates your Launch Score (0–100) in under 60 seconds."
            ]
        },
        {
            "num": "STEP 3",
            "title": "Apply AI Code Fixes",
            "subtitle": "Ship with complete confidence",
            "points": [
                "Review clear before-and-after code diffs generated by Amazon Bedrock Claude 3 Haiku.",
                "Copy and paste fixes directly into your codebase.",
                "Re-scan in 1 click and watch your score hit 100%."
            ]
        }
    ]

    card_w = Inches(3.68)
    card_h = Inches(4.7)
    gap = Inches(0.34)

    for i, s in enumerate(steps):
        cx = Inches(0.8) + i * (card_w + gap)
        cy = Inches(1.58)

        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, card_w, card_h)
        box.fill.solid()
        box.fill.fore_color.rgb = COLOR_WHITE
        box.line.color.rgb = COLOR_BORDER_GLOW if i == 2 else COLOR_BORDER
        box.line.width = Pt(2 if i == 2 else 1)

        ctf = box.text_frame
        ctf.word_wrap = True
        ctf.margin_left = Inches(0.28)
        ctf.margin_right = Inches(0.28)
        ctf.margin_top = Inches(0.28)

        p_num = ctf.paragraphs[0]
        p_num.text = s["num"]
        p_num.font.name = "Arial"
        p_num.font.size = Pt(11)
        p_num.font.bold = True
        p_num.font.color.rgb = COLOR_EMERALD_DEEP

        p_t = ctf.add_paragraph()
        p_t.text = s["title"]
        p_t.font.name = "Arial"
        p_t.font.size = Pt(22)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_INK
        p_t.space_before = Pt(6)

        p_s = ctf.add_paragraph()
        p_s.text = s["subtitle"]
        p_s.font.name = "Arial"
        p_s.font.size = Pt(12.5)
        p_s.font.color.rgb = COLOR_EMERALD_DEEP
        p_s.space_before = Pt(2)

        for pt in s["points"]:
            bp = ctf.add_paragraph()
            bp.text = f"✔ {pt}"
            bp.font.name = "Arial"
            bp.font.size = Pt(12)
            bp.font.color.rgb = COLOR_INK_MUTED
            bp.space_before = Pt(10)

    bot = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.45), Inches(11.733), Inches(0.55))
    bot.fill.solid()
    bot.fill.fore_color.rgb = COLOR_WHITE
    bot.line.color.rgb = COLOR_BORDER
    bot.line.width = Pt(1)
    btf = bot.text_frame
    bp = btf.paragraphs[0]
    bp.alignment = PP_ALIGN.CENTER
    bp.text = "⚡ Zero Friction: No complex configs or agent installs. Get your pre-launch verdict in seconds."
    bp.font.name = "Arial"
    bp.font.size = Pt(12.5)
    bp.font.bold = True
    bp.font.color.rgb = COLOR_EMERALD_DEEP

# ==========================================================
# SLIDE 6: WHAT DEVELOPERS GET
# ==========================================================
def build_slide_6():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)
    add_slide_header(slide, "Developer Experience", "Evidence-Backed Reports & AI Copy-Paste Fixes", "Slide 6 of 10")

    left_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.58), Inches(5.68), Inches(5.1))
    left_box.fill.solid()
    left_box.fill.fore_color.rgb = COLOR_WHITE
    left_box.line.color.rgb = COLOR_BORDER
    left_box.line.width = Pt(1)

    ltf = left_box.text_frame
    ltf.word_wrap = True
    ltf.margin_left = Inches(0.35)
    ltf.margin_right = Inches(0.35)
    ltf.margin_top = Inches(0.35)

    lp1 = ltf.paragraphs[0]
    lp1.text = "QUANTIFIABLE READINESS"
    lp1.font.name = "Arial"
    lp1.font.size = Pt(11)
    lp1.font.bold = True
    lp1.font.color.rgb = COLOR_EMERALD_DEEP

    lp2 = ltf.add_paragraph()
    lp2.text = "The 0–100 Launch Scorecard"
    lp2.font.name = "Arial"
    lp2.font.size = Pt(22)
    lp2.font.bold = True
    lp2.font.color.rgb = COLOR_INK
    lp2.space_before = Pt(6)

    bullets_l = [
        "Risk-Weighted Grading: Severe risks (exposed .env, open source maps) deduct high points; minor issues deduct less.",
        "Categorized Breakdown: Clear ratings across Security, Performance, SEO, and Accessibility.",
        "Verifiable Evidence: Inspect exact HTTP headers, DOM nodes, and leaking assets.",
        "Live Score Update: Watch your readiness score increase in real time as you resolve items."
    ]
    for b in bullets_l:
        bp = ltf.add_paragraph()
        bp.text = f"✔ {b}"
        bp.font.name = "Arial"
        bp.font.size = Pt(12.5)
        bp.font.color.rgb = COLOR_INK_MUTED
        bp.space_before = Pt(11)

    right_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.85), Inches(1.58), Inches(5.68), Inches(5.1))
    right_box.fill.solid()
    right_box.fill.fore_color.rgb = COLOR_WHITE
    right_box.line.color.rgb = COLOR_BORDER_GLOW
    right_box.line.width = Pt(2)

    rtf = right_box.text_frame
    rtf.word_wrap = True
    rtf.margin_left = Inches(0.35)
    rtf.margin_right = Inches(0.35)
    rtf.margin_top = Inches(0.35)

    rp1 = rtf.paragraphs[0]
    rp1.text = "AMAZON BEDROCK ENGINE"
    rp1.font.name = "Arial"
    rp1.font.size = Pt(11)
    rp1.font.bold = True
    rp1.font.color.rgb = COLOR_EMERALD_DEEP

    rp2 = rtf.add_paragraph()
    rp2.text = "One-Click Code Remediations"
    rp2.font.name = "Arial"
    rp2.font.size = Pt(22)
    rp2.font.bold = True
    rp2.font.color.rgb = COLOR_INK
    rp2.space_before = Pt(6)

    bullets_r = [
        "Framework Context: Generates exact fixes for Next.js, Vite, Tailwind CSS, or Nginx.",
        "Before/After Diffs: Clean copy-paste code snippets so you don't have to read security documentation.",
        "Sub-2s Streaming: High-speed streaming fixes via Amazon Bedrock Claude 3 Haiku.",
        "100% Reliability: Built-in deterministic rule engine ensures fixes work even if offline."
    ]
    for b in bullets_r:
        bp = rtf.add_paragraph()
        bp.text = f"✔ {b}"
        bp.font.name = "Arial"
        bp.font.size = Pt(12.5)
        bp.font.color.rgb = COLOR_INK_MUTED
        bp.space_before = Pt(11)

# ==========================================================
# SLIDE 7: ARCHITECTURE HERO SLIDE
# ==========================================================
def build_slide_7():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.38), Inches(2.2), Inches(0.34))
    pill.fill.solid()
    pill.fill.fore_color.rgb = COLOR_MINT_TINT
    pill.line.color.rgb = COLOR_BORDER
    pill.line.width = Pt(1)
    ptf = pill.text_frame
    ptf.margin_left = ptf.margin_top = ptf.margin_right = ptf.margin_bottom = 0
    pp = ptf.paragraphs[0]
    pp.alignment = PP_ALIGN.CENTER
    pp.text = "UNDER THE HOOD"
    pp.font.name = "Arial"
    pp.font.size = Pt(10)
    pp.font.bold = True
    pp.font.color.rgb = COLOR_EMERALD_DEEP

    tx_cnt = slide.shapes.add_textbox(Inches(9.0), Inches(0.38), Inches(3.533), Inches(0.34))
    tf_cnt = tx_cnt.text_frame
    p_cnt = tf_cnt.paragraphs[0]
    p_cnt.alignment = PP_ALIGN.RIGHT
    p_cnt.text = "Slide 7 of 10"
    p_cnt.font.name = "Arial"
    p_cnt.font.size = Pt(12)
    p_cnt.font.bold = True
    p_cnt.font.color.rgb = COLOR_MUTED

    tx_title = slide.shapes.add_textbox(Inches(0.8), Inches(0.76), Inches(11.733), Inches(0.45))
    tf_title = tx_title.text_frame
    p_title = tf_title.paragraphs[0]
    p_title.text = "Enterprise AWS Cloud Architecture (Serverless + Isolated Containers)"
    p_title.font.name = "Arial"
    p_title.font.size = Pt(22)
    p_title.font.bold = True
    p_title.font.color.rgb = COLOR_INK

    img_path = "C:/vibesift/vibesift-architecture.png"
    if os.path.exists(img_path):
        frame = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.22), Inches(11.733), Inches(5.8))
        frame.fill.solid()
        frame.fill.fore_color.rgb = COLOR_WHITE
        frame.line.color.rgb = COLOR_BORDER_GLOW
        frame.line.width = Pt(1.5)

        slide.shapes.add_picture(img_path, Inches(0.95), Inches(1.32), width=Inches(11.433), height=Inches(5.6))

# ==========================================================
# SLIDE 8: MARKET ADVANTAGE
# ==========================================================
def build_slide_8():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)
    add_slide_header(slide, "Market Advantage", "Why Traditional Security & Audit Tools Fall Short", "Slide 8 of 10")

    columns = [
        {
            "tag": "LEGACY ENTERPRISE",
            "title": "Enterprise Scanners",
            "subtitle": "Qualys, Nessus, Rapid7",
            "points": [
                "❌ Extremely expensive ($5k–$20k+/yr), locking out startups and solo builders.",
                "❌ Complex multi-hour scans that produce 100-page noisy PDF reports.",
                "❌ Zero code fixes: tells you what broke, but not how to fix it in code."
            ]
        },
        {
            "tag": "FREE DEV TOOLS",
            "title": "Basic Lighthouse",
            "subtitle": "Chrome DevTools, PageSpeed",
            "points": [
                "⚠️ Great for basic performance, but completely blind to security vulnerabilities.",
                "⚠️ Completely misses secret leaks (.env, source maps) and missing HTTP headers.",
                "⚠️ Zero active DAST or vulnerability fuzzing capabilities."
            ]
        },
        {
            "tag": "THE WINNER",
            "title": "VibeSift",
            "subtitle": "Built for the AI Era",
            "points": [
                "🏆 < 60s instantaneous audits covering Security, CWV, SEO & Secret Leaks.",
                "🏆 Quantified 0–100 Launch Score built for developer clarity.",
                "🏆 Amazon Bedrock AI generates exact copy-paste code diffs for your framework."
            ]
        }
    ]

    card_w = Inches(3.68)
    card_h = Inches(4.7)
    gap = Inches(0.34)

    for i, c in enumerate(columns):
        cx = Inches(0.8) + i * (card_w + gap)
        cy = Inches(1.58)

        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, card_w, card_h)
        box.fill.solid()
        box.fill.fore_color.rgb = COLOR_WHITE
        box.line.color.rgb = COLOR_BORDER_GLOW if i == 2 else COLOR_BORDER
        box.line.width = Pt(2 if i == 2 else 1)

        ctf = box.text_frame
        ctf.word_wrap = True
        ctf.margin_left = Inches(0.26)
        ctf.margin_right = Inches(0.26)
        ctf.margin_top = Inches(0.26)

        p_tag = ctf.paragraphs[0]
        p_tag.text = c["tag"]
        p_tag.font.name = "Arial"
        p_tag.font.size = Pt(11)
        p_tag.font.bold = True
        p_tag.font.color.rgb = COLOR_EMERALD_DEEP

        p_t = ctf.add_paragraph()
        p_t.text = c["title"]
        p_t.font.name = "Arial"
        p_t.font.size = Pt(20)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_INK
        p_t.space_before = Pt(6)

        p_s = ctf.add_paragraph()
        p_s.text = c["subtitle"]
        p_s.font.name = "Arial"
        p_s.font.size = Pt(12)
        p_s.font.color.rgb = COLOR_EMERALD_DEEP
        p_s.space_before = Pt(2)

        for pt in c["points"]:
            bp = ctf.add_paragraph()
            bp.text = pt
            bp.font.name = "Arial"
            bp.font.size = Pt(12.5)
            bp.font.color.rgb = COLOR_INK_MUTED
            bp.space_before = Pt(12)

    bot = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.45), Inches(11.733), Inches(0.55))
    bot.fill.solid()
    bot.fill.fore_color.rgb = COLOR_WHITE
    bot.line.color.rgb = COLOR_BORDER
    bot.line.width = Pt(1)
    btf = bot.text_frame
    bp = btf.paragraphs[0]
    bp.alignment = PP_ALIGN.CENTER
    bp.text = "Our Value Prop: Fast, affordable, and actionable. We bridge speed with production-grade quality."
    bp.font.name = "Arial"
    bp.font.size = Pt(12.5)
    bp.font.bold = True
    bp.font.color.rgb = COLOR_INK

# ==========================================================
# SLIDE 9: STRATEGIC ROADMAP
# ==========================================================
def build_slide_9():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)
    add_slide_header(slide, "Strategic Vision", "From Pre-Launch Auditor to Everyday Quality Gate", "Slide 9 of 10")

    milestones = [
        {
            "badge": "PHASE 1 • Q1 2027",
            "title": "GitHub Action CI/CD Gate",
            "desc": "Automate audits on every pull request. Automatically block merging if security score drops below threshold.",
            "points": [
                "Pre-merge pull request comment bot",
                "Fails build if new secrets are leaked",
                "Integrates directly into existing GitHub workflows"
            ]
        },
        {
            "badge": "PHASE 2 • Q2 2027",
            "title": "Team Workspaces & RBAC",
            "desc": "Shared audit dashboards for development agencies, venture studios, and engineering organizations.",
            "points": [
                "Multi-site portfolio monitoring",
                "Organization-wide compliance standards",
                "Role-based access & automated client reports"
            ]
        },
        {
            "badge": "PHASE 3 • Q3 2027",
            "title": "Cursor & Vercel Plugins",
            "desc": "1-click pre-launch audits directly integrated inside AI code editors and hosting deployment platforms.",
            "points": [
                "Instant audit inside Cursor & Claude Code",
                "1-click Vercel & Netlify deploy verification",
                "Continuous weekly secret drift detection"
            ]
        }
    ]

    card_w = Inches(3.68)
    card_h = Inches(4.7)
    gap = Inches(0.34)

    for i, m in enumerate(milestones):
        cx = Inches(0.8) + i * (card_w + gap)
        cy = Inches(1.58)

        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, card_w, card_h)
        box.fill.solid()
        box.fill.fore_color.rgb = COLOR_WHITE
        box.line.color.rgb = COLOR_BORDER_GLOW if i == 2 else COLOR_BORDER
        box.line.width = Pt(2 if i == 2 else 1)

        ctf = box.text_frame
        ctf.word_wrap = True
        ctf.margin_left = Inches(0.28)
        ctf.margin_right = Inches(0.28)
        ctf.margin_top = Inches(0.28)

        p_b = ctf.paragraphs[0]
        p_b.text = m["badge"]
        p_b.font.name = "Arial"
        p_b.font.size = Pt(11)
        p_b.font.bold = True
        p_b.font.color.rgb = COLOR_EMERALD_DEEP

        p_t = ctf.add_paragraph()
        p_t.text = m["title"]
        p_t.font.name = "Arial"
        p_t.font.size = Pt(19)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_INK
        p_t.space_before = Pt(6)

        p_d = ctf.add_paragraph()
        p_d.text = m["desc"]
        p_d.font.name = "Arial"
        p_d.font.size = Pt(13)
        p_d.font.color.rgb = COLOR_INK_MUTED
        p_d.space_before = Pt(8)

        for pt in m["points"]:
            bp = ctf.add_paragraph()
            bp.text = f"✔ {pt}"
            bp.font.name = "Arial"
            bp.font.size = Pt(12)
            bp.font.color.rgb = COLOR_EMERALD_DEEP
            bp.space_before = Pt(8)

    bot = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.45), Inches(11.733), Inches(0.55))
    bot.fill.solid()
    bot.fill.fore_color.rgb = COLOR_WHITE
    bot.line.color.rgb = COLOR_BORDER
    bot.line.width = Pt(1)
    btf = bot.text_frame
    bp = btf.paragraphs[0]
    bp.alignment = PP_ALIGN.CENTER
    bp.text = "Our Goal: To become the universal quality and security gate every AI application passes before launching."
    bp.font.name = "Arial"
    bp.font.size = Pt(12.5)
    bp.font.bold = True
    bp.font.color.rgb = COLOR_INK

# ==========================================================
# SLIDE 10: THANK YOU & LIVE DEMO
# ==========================================================
def build_slide_10():
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide)

    pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.65), Inches(3.6), Inches(0.42))
    pill.fill.solid()
    pill.fill.fore_color.rgb = COLOR_WHITE
    pill.line.color.rgb = COLOR_EMERALD_LIGHT
    pill.line.width = Pt(1.5)
    ptf = pill.text_frame
    ptf.margin_left = ptf.margin_top = ptf.margin_right = ptf.margin_bottom = 0
    pp = ptf.paragraphs[0]
    pp.alignment = PP_ALIGN.CENTER
    pp.text = "● WRAP-UP • LIVE DEMO • Q&A"
    pp.font.name = "Arial"
    pp.font.size = Pt(11)
    pp.font.bold = True
    pp.font.color.rgb = COLOR_EMERALD_DEEP

    tx = slide.shapes.add_textbox(Inches(0.8), Inches(1.25), Inches(11.733), Inches(1.5))
    tf = tx.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Thank You!"
    p.font.name = "Arial"
    p.font.size = Pt(58)
    p.font.bold = True
    p.font.color.rgb = COLOR_INK

    p2 = tf.add_paragraph()
    p2.text = "Let's Explore the Live Demo & Open for Questions"
    p2.font.name = "Arial"
    p2.font.size = Pt(24)
    p2.font.bold = True
    p2.font.color.rgb = COLOR_EMERALD_DEEP
    p2.space_before = Pt(6)

    actions = [
        {
            "tag": "LIVE APPLICATION",
            "title": "Try VibeSift Live",
            "points": [
                "Production SaaS: vibesift.pixir.in",
                "1-click developer demo login",
                "Run a live URL audit in < 60 seconds",
                "Inspect evidence & generated code diffs"
            ]
        },
        {
            "tag": "CODEBASE & SPECS",
            "title": "Production Engineering",
            "points": [
                "Full AWS CDK infrastructure definitions",
                "React 19 + Vite 6 + Tailwind CSS design",
                "25 passing Vitest unit & integration tests",
                "Zero-trust containerized worker isolation"
            ]
        },
        {
            "tag": "DISCUSSION",
            "title": "Q&A & Next Steps",
            "points": [
                "Architecture, safety & elasticity deep dive",
                "Integration with developer workflows",
                "Partnership & early adopter pilot programs",
                "Open floor for feedback & questions"
            ]
        }
    ]

    card_w = Inches(3.68)
    card_h = Inches(2.7)
    gap = Inches(0.34)
    for i, a in enumerate(actions):
        cx = Inches(0.8) + i * (card_w + gap)
        cy = Inches(3.35)

        box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, card_w, card_h)
        box.fill.solid()
        box.fill.fore_color.rgb = COLOR_WHITE
        box.line.color.rgb = COLOR_BORDER_GLOW if i == 0 else COLOR_BORDER
        box.line.width = Pt(2 if i == 0 else 1)

        ctf = box.text_frame
        ctf.word_wrap = True
        ctf.margin_left = Inches(0.28)
        ctf.margin_right = Inches(0.28)
        ctf.margin_top = Inches(0.25)
        ctf.margin_bottom = Inches(0.2)

        p_tag = ctf.paragraphs[0]
        p_tag.text = a["tag"]
        p_tag.font.name = "Arial"
        p_tag.font.size = Pt(11)
        p_tag.font.bold = True
        p_tag.font.color.rgb = COLOR_EMERALD_DEEP

        p_t = ctf.add_paragraph()
        p_t.text = a["title"]
        p_t.font.name = "Arial"
        p_t.font.size = Pt(18)
        p_t.font.bold = True
        p_t.font.color.rgb = COLOR_INK
        p_t.space_before = Pt(4)

        for pt in a["points"]:
            bp = ctf.add_paragraph()
            bp.text = f"✔ {pt}"
            bp.font.name = "Arial"
            bp.font.size = Pt(12)
            bp.font.color.rgb = COLOR_INK_MUTED
            bp.space_before = Pt(6)

    bot = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.35), Inches(11.733), Inches(0.65))
    bot.fill.solid()
    bot.fill.fore_color.rgb = COLOR_WHITE
    bot.line.color.rgb = COLOR_BORDER
    bot.line.width = Pt(1)
    btf = bot.text_frame
    bp = btf.paragraphs[0]
    bp.alignment = PP_ALIGN.CENTER
    bp.text = "⚡ VibeSift by Pixir  •  \"Ship fast. Ship safe. Never launch blind.\"  •  vibesift.pixir.in"
    bp.font.name = "Arial"
    bp.font.size = Pt(13)
    bp.font.bold = True
    bp.font.color.rgb = COLOR_INK

# Build all 10 slides
build_slide_1()
build_slide_2()
build_slide_3()
build_slide_4()
build_slide_5()
build_slide_6()
build_slide_7()
build_slide_8()
build_slide_9()
build_slide_10()

out_path = "C:/vibesift/VibeSift_Presentation_Deck.pptx"
prs.save(out_path)
print(f"Generated Rich Stylized PPTX at {out_path}")

dl_path = "C:/Users/SUDHANSHU/Downloads/VibeSift_Presentation_Deck.pptx"
shutil.copyfile(out_path, dl_path)
print(f"Copied Rich Stylized PPTX to {dl_path}")
