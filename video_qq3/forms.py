"""Recreated QIM / QQ3 screens (native 1909 x 1049 px), generic example data only.

Each builder takes the scene prefix and returns HTML. Elements a scene animates carry ids
'<prefix>-<name>'. Dynamic states (messages, menus, warnings) are all present in the markup
and toggled by opacity in the scene timeline.
"""

TABS = ["Overview", "Risk Definition &amp; Team", "Description", "○ Activities", "5-WHY", "Causes",
        "TopQ - One Pager", "Reference Objects", "Administrative Data", "Change Documents"]

CSS = ""  # styles live in assets/css/forms.css


def title_bar(p, before="New Quality Issue: QQ3 - Internal Complaint (QQ3)", after=None):
    a = f'<span id="{p}-title-a">{before}</span>'
    if after:
        a += f'<span id="{p}-title-b" style="position:absolute;left:22px;opacity:0">{after}</span>'
    return f'<div class="qf-title">{a}<span class="ai">Additional Information</span></div>'


def toolbar(p, state="new"):
    dis = "" if state != "new" else " dis"
    disp = '<div class="qf-b" id="%s-b-display"><span class="ico" style="background:#666;box-shadow:none;border-radius:9px;width:20px;height:12px;vertical-align:0"></span>Display</div>' % p
    disp_html = disp if state != "new" else f'<div class="qf-b" id="{p}-b-display" style="opacity:0;position:absolute">Display</div>'
    return (f'<div class="qf-tb"><div class="qf-b" id="{p}-b-save"><span class="ico"></span>Save</div>'
            + (disp if state != "new" else "")
            + f'<div class="qf-b dd{dis}" id="{p}-b-status">Set Issue Status</div>'
            + f'<div class="qf-b{dis}" id="{p}-b-qrec">Q Record</div>'
            + f'<div class="qf-b dd dis">Follow-Up Issue</div>'
            + f'<div class="qf-b dis">Stop Issue manually</div><div class="qf-sp"></div>'
            + '<div class="qf-b dd"><span class="ico" style="background:#555;box-shadow:none;height:14px"></span>BROSE - ERP Activities</div>'
            + '<div class="qf-b">⇅</div><div class="qf-b">⏷</div><div class="qf-b">👥</div><div class="qf-b">🖶</div></div>')


def msg_line(p, extra=""):
    return (f'<div class="qf-msg"><div id="{p}-msg0"><span class="nm">No Messages</span><span class="lk">· Display Message Log</span></div>'
            + extra + '</div>')


def ok_msg(p, name, text):
    return f'<div id="{p}-{name}" style="opacity:0"><span class="qf-ok">✓</span>{text}</div>'


def tabs(active, p=""):
    out = []
    for i, t in enumerate(TABS):
        on = " on" if t.replace("○ ", "") == active else ""
        out.append(f'<div class="qf-tab{on}" id="{p}-tab{i}">{t}</div>')
    return '<div class="qf-tabs">' + "".join(out) + "</div>"


def fld(label, ctrl, lw=300, req=False, fid=None):
    r = '<span class="r">*</span>' if req else ""
    i = f' id="{fid}"' if fid else ""
    return f'<div class="qf-f"{i}><div class="l" style="width:{lw}px">{r}{label}:</div>{ctrl}</div>'


def inp(w, val="", cls="", iid=None, desc=None, did=None, unit=None):
    i = f' id="{iid}"' if iid else ""
    s = f'<div class="qf-i {cls}"{i} style="width:{w}px">{val}</div>'
    if desc is not None:
        d = f' id="{did}"' if did else ""
        s += f'<span class="qf-desc"{d}>{desc}</span>'
    if unit:
        s += f'<span class="qf-unit">{unit}</span>'
    return s


def shell(p, active, body, state="new", title_after=None, msgs="", title_before=None):
    tb = title_before or ("New Quality Issue: QQ3 - Internal Complaint (QQ3)" if state == "new"
                          else "Quality Issue: 1000123456, QQ3 - Internal Complaint (QQ3)")
    return (CSS + '<div class="qf">' + title_bar(p, tb, title_after) + toolbar(p, state) + msg_line(p, msgs)
            + tabs(active, p) + f'<div class="qf-body" id="{p}-body"><div id="{p}-scroll">' + body + "</div></div></div>")


# ---------------------------------------------------------------- Overview (new issue)
def overview(p, state="new", filled=False, msgs="", title_after=None, codes=False, inproc=False, dates=None):
    show_dates = filled if dates is None else dates
    """Overview tab. filled=True shows reference object, status and quantities filled."""
    v = (lambda a, b: b if filled else a)
    L = 300
    left = (
        '<div class="qf-sec">Issue Definition</div>'
        + fld("Issue ID", inp(300, "1000123456" if state != "new" else "", "ro", f"{p}-id"), L)
        + fld("Issue Type", inp(400, "QQ3 - Internal Complaint", "ro"), L)
        + fld("Issue Description", inp(560, "Material caído al suelo – Línea 3" if state != "new" else "", "", f"{p}-desc"), L, True, f"{p}-f-desc")
        + fld("Reported By", inp(560, "Operador de montacargas" if state != "new" else "", "", f"{p}-rep"), L, False, f"{p}-f-rep")
        + fld("Person Responsible", inp(200, "USR8D01" if state != "new" else "", "vh", f"{p}-resp",
                                         "Líder 8D (ejemplo)" if state != "new" else "", f"{p}-respd"), L, True, f"{p}-f-resp")
        + fld("Internal Reference Number", inp(560), L)
        + fld("Issue is Master-8D", inp(110, "No", "dd") + '<span style="margin-left:40px;color:#444">Reference Master-8D:</span>' + inp(150, "", "vh"), L)
        + '<div class="qf-sec">Main Reference Object</div>'
        + fld("Plant", inp(160, v("", "1000"), "vh", f"{p}-plant", v("", "Planta ejemplo"), f"{p}-plantd"), L, True, f"{p}-f-plant")
        + fld("DUNS", inp(560), L)
        + fld("Material", inp(200, v("", "MAT-000123"), "vh", f"{p}-mat", v("", "Módulo de puerta (ejemplo)"), f"{p}-matd"), L, True, f"{p}-f-mat")
        + fld("Cost Center", inp(200, v("", "CC-4410"), "vh", f"{p}-cc", v("", "Ensamble (ejemplo)"), f"{p}-ccd"), L, False, f"{p}-f-cc")
        + '<div class="qf-sec">Status</div>'
        + fld("Issue Status", inp(300, "In Process" if inproc else "New", "ro", f"{p}-status"), L)
        + fld("Acceptance", inp(400, v("In Analysis", "Accepted (Brose fault)"), "dd", f"{p}-acc"), L, False, f"{p}-f-acc")
        + fld("Causer", inp(400, v("In Analysis", "Plant Operations"), "dd", f"{p}-cau"), L, False, f"{p}-f-cau")
        + fld("Part location", inp(400, v("", "Scrapped by Brose"), "dd", f"{p}-loc"), L, False, f"{p}-f-loc")
        + '<div class="qf-sec">Defect Quantities</div>'
        + fld("Quantity claimed", inp(120, v("0", "100"), "", f"{p}-qcl", unit="PC"), L, False, f"{p}-f-qcl")
        + fld("Quantity confirmed", inp(120, v("0", "50"), "", f"{p}-qcf", unit="PC"), L, False, f"{p}-f-qcf")
        + '<div class="qf-sec">Issue Codes</div>'
        + fld("Failure Loc. (Code Group)", inp(120, "L-NO" if codes else "L", "ro", f"{p}-flg",
                                               "NoShow" if codes else "Failure Location", f"{p}-flgd"), L)
        + fld("Failure Loc. (Code)", inp(200, "L-NO-FCL" if codes else "", "vh", f"{p}-flc",
                                         "NoShow - parts from customer claim list" if codes else "", f"{p}-flcd"), L, inproc or codes, f"{p}-f-flc")
    )
    R = 270
    DATES = [("D3", "24.10.2026"), ("D4", "02.11.2026"), ("D5/D6", "06.11.2026"), ("D7", "16.11.2026"), ("D8", "04.12.2026")]
    trows = ""
    for d, due in DATES:
        dd = d.replace("/", "")
        due_v = due if (show_dates and state != "new") else ""
        trows += ('<div class="qf-f"><div class="l" style="width:%dpx">Due Date %s:</div>' % (R, d)
                  + inp(170, due_v, "cal", f"{p}-due{dd}")
                  + '<div class="l" style="width:270px">Completion Date %s:</div>' % d
                  + inp(170, "", "cal", f"{p}-cmp{dd}")
                  + f'<div class="qf-tl" id="{p}-tl{dd}"><i></i></div></div>')
    right = (
        '<div class="qf-sec">Intercompany Customer (If Needed)</div>'
        + fld("Customer", inp(200, "", "vh"), R)
        + fld("Customer Contact", inp(420), R)
        + '<div class="qf-sec">Timing</div>'
        + fld("Complaint Date", inp(170, "19.11.2026", "cal", f"{p}-cdate"), R)
        + f'<div id="{p}-timing">' + trows + '</div>'
        + '<div class="qf-sec">Additional Information (relevant for TopQ)</div>'
        + fld("Business division", inp(420, v("", "GT"), "dd", f"{p}-bd"), R, inproc, f"{p}-f-bd")
        + fld("Product group", inp(420, v("", "Window Reg. &amp; Door Mod."), "dd", f"{p}-pg"), R, inproc, f"{p}-f-pg")
        + '<div class="qf-sec">Cost Objects</div>'
        + fld("QM Order", inp(200, "", "gr", f"{p}-qm"), R)
        + '<div class="qf-sec">Issue Codes</div>'
        + fld("Failure Type (Code Group)", inp(120, "T-FUNC" if codes else "T", "ro", f"{p}-ftg",
                                               "Functional Failure" if codes else "Failure Type", f"{p}-ftgd"), R)
        + fld("Failure Type (Code)", inp(200, "T-FUNC-CRA" if codes else "", "vh", f"{p}-ftc",
                                         "Crash performance / safety aspect" if codes else "", f"{p}-ftcd"), R, inproc or codes, f"{p}-f-ftc")
    )
    body = (f'<div style="display:flex;gap:40px"><div style="width:1000px">{left}</div><div style="flex:1">{right}</div></div>')
    return shell(p, "Overview", body, state, title_after, msgs)


# ---------------------------------------------------------------- Risk Definition & Team
RISK = [
    ("Group Relevant", "[0] No"),
    ("Recall or Safety Critical?", "[0] No"),
    ("Expected Failure Costs", "[0] &lt; 25T€"),
    ("Customer Escalation Level", "[0] No escalation at customer"),
    ("Repeat Failure", "[0] No"),
    ("Risk of production stop at customer", "[0] No"),
    ("Requalification test", "[0] No"),
]


def risk(p, state="new", title_after=None, empty_team=True, level2=False):
    rows = ""
    team = [("8D Teamleader", "USR8D01", "Líder 8D (ejemplo)", "lider8d@ejemplo.com"),
            ("Champion", "USRCH01", "Champion (ejemplo)", "champion@ejemplo.com"),
            ("Quality Manager", "USRQM01", "Quality Manager (ejemplo)", "qm@ejemplo.com")]
    for i, (role, uid, name, mail) in enumerate(team):
        if empty_team and i > 0:
            uid, name, mail = "", "", ""
        rows += (f'<tr id="{p}-tr{i}"><td class="sel"></td><td><div class="qf-i dd" style="width:240px;font-weight:400">{role}</div></td>'
                 f'<td><span id="{p}-tid{i}" style="font-weight:700">{uid}</span></td><td id="{p}-tnm{i}">{name}</td>'
                 f'<td style="color:#2A6EAF;text-decoration:underline" id="{p}-tml{i}">{mail}</td></tr>')
    table = ('<div class="qf-tb" style="height:46px;background:#E9E9E9;border:1px solid #CFCFCF;border-bottom:0;width:1240px">'
             '<div class="qf-b"><span class="ico" style="background:#fff;box-shadow:inset 0 0 0 2px #777"></span>Partner</div><div class="qf-b dis">Delete</div></div>'
             '<table class="qf-t" style="width:1240px"><tr><th></th><th>Partner Role</th><th>Partner ID</th><th>Description</th><th>E-Mail</th></tr>'
             + rows + "</table>")
    risk_rows = ""
    vals = dict(enumerate([v for _, v in RISK]))
    if level2:
        vals[1] = "[2] PSC: D-characteristic affected"; vals[4] = "[1] Yes"
    for i, (lab, _v) in enumerate(RISK):
        val = vals[i]
        risk_rows += fld(lab, inp(520, val, "dd", f"{p}-rk{i}"), 420, False, f"{p}-f-rk{i}")
    risk_rows += fld("RISK LEVEL", f'<div class="qf-i gr" style="width:520px" id="{p}-rlv">'
                     + (f'<span id="{p}-rlv0">currently no Top-Q-Risk</span>' if not level2 else f'<span id="{p}-rlv0" style="color:#C0392B">Level 2 (high risk)</span>')
                     + f'<span id="{p}-rlv1" style="position:absolute;left:9px;opacity:0;color:#B26B00">Level 1 (medium risk)</span>'
                     f'<span id="{p}-rlv2" style="position:absolute;left:9px;opacity:0;color:#C0392B">Level 2 (high risk)</span></div>', 420)
    warn = (f'<div class="qf-warn" id="{p}-warn" style="opacity:{1 if level2 else 0};width:960px;margin-top:14px">'
            "Attention: Tab 'TopQ - OnePager' must be completed- an alert will be sent!</div>")
    right = ('<div class="qf-sec">Team</div>'
             + fld("Team", inp(300, "", "dd") + '<div class="qf-b" style="margin-left:12px">Add Team</div>', 120)
             + '<div class="qf-sec" style="margin-top:18px">Additional partners</div><div class="qf-box" style="height:180px"></div>')
    body = (table
            + '<div style="display:flex;gap:60px;margin-top:22px"><div style="width:960px"><div class="qf-sec">TopQ - Risk Level</div>'
            + risk_rows + warn + '</div><div style="flex:1">' + right + "</div></div>")
    msgs = ok_msg(p, "msgsched", "Basic Activity S_00012: Expected End Date has been scheduled automatically")
    msgs += ok_msg(p, "msgsaved", "Changes successfully saved")
    return shell(p, "Risk Definition &amp; Team", body, state, title_after, msgs)


# ---------------------------------------------------------------- 5-WHY
def why(p):
    blocks = [("Cause of Occurence", ["Material caído al suelo", "Operador no asegura la carga", "Distracción por paros de línea", "", ""], "Distracción del operador por paros de línea durante el día", True),
              ("Cause of Non Detection", ["Material caído al suelo", "Operador no asegura la carga", "No hay alarma de carga no asegurada", "", ""], "No hay una alarma que señale que la carga no está asegurada", False),
              ("Systemic Cause of Occurence", ["", "", "", "", ""], "", False)]
    out = ('<div style="font:700 21px Arial;margin:6px 0 4px">Issue Description: <span style="margin-left:40px">Material caído al suelo – Línea 3</span></div>')
    for bi, (name, whys, detail, main) in enumerate(blocks):
        out += f'<div class="qf-sec">{name}</div><div class="qf-mini"><span></span><span></span><span class="go"></span></div>'
        out += '<div style="display:flex;gap:14px;align-items:flex-start">'
        for wi in range(5):
            txt = whys[wi] if not main else ""
            en = (bi < 2 and (wi < 3 or (main and wi < 4))) or (wi == 0)
            cls = "qf-box" + ("" if en else " dis")
            out += (f'<div style="width:220px"><div style="text-align:center;font:700 19px Arial;margin-bottom:4px">Why:&nbsp; {wi+1}</div>'
                    f'<div class="{cls}" id="{p}-w{bi}{wi}" style="height:96px;font-size:18px">{txt}</div></div>')
        out += (f'<div style="width:380px"><div style="font:700 19px Arial;margin-bottom:4px">Detailed Description of Cause</div>'
                f'<div class="qf-box" id="{p}-det{bi}" style="height:96px;font-size:18px">{"" if main else detail}</div>'
                f'<div style="display:flex;align-items:center;margin-top:8px;gap:14px"><div class="qf-b" id="{p}-cc{bi}">Create Cause</div>'
                f'<span style="font:19px Arial">Cause ID:</span><span id="{p}-cid{bi}" style="font:700 19px Arial">{"" if main else "S_00024"}</span></div></div>')
        out += "</div>"
    return shell(p, "5-WHY", out, "saved")


# ---------------------------------------------------------------- Causes
def causes(p):
    rows = [("6000054630", "Technical Cause Occurence", "Distracción por paros de línea"),
            ("6000054631", "Technical Cause Non-Detection", "No hay alarma de carga no asegurada"),
            ("6000054632", "Systemic Cause Occurence", "Tiempo extra no avisado a logística"),
            ("6000054633", "Systemic Cause Non-Detection", "Sin revisión anual del proceso")]
    tr = ""
    for i, (cid, kind, desc) in enumerate(rows):
        tr += (f'<tr><td class="sel"></td><td>{cid}</td><td>{kind}</td><td>{desc}</td>'
               f'<td id="{p}-cg{i}" style="width:120px"></td><td id="{p}-cgt{i}" style="width:170px"></td>'
               f'<td id="{p}-cd{i}" style="width:120px"></td><td id="{p}-cdt{i}" style="width:220px"></td><td>External</td><td>0</td></tr>')
    table = ('<table class="qf-t" style="width:1830px"><tr><th></th><th>Cause ID</th><th>Kind of Cause</th><th>Cause Description</th>'
             '<th>Cause Code Group</th><th>Code Group Text</th><th>Cause Code</th><th>Code Text</th><th>Internal or External</th><th>% Contribution</th></tr>'
             + tr + "</table>")
    detail = ('<div class="qf-sec" style="margin-top:20px">Detail View for Cause 6000054630</div>'
              '<div style="display:flex;gap:60px"><div style="width:860px">'
              + fld("Type of cause", inp(420, "Technical Cause Occurence", "dd"), 260)
              + fld("Internal/External", inp(200, "External", "dd"), 260)
              + fld("Cause Description", inp(520, "Distracción por paros de línea"), 260)
              + '</div><div style="flex:1"><div class="qf-sec">Cause Code</div>'
              + fld("Cause Code Group", inp(180, "", "vh", f"{p}-dcg", "", f"{p}-dcgd"), 260, True, f"{p}-f-dcg")
              + fld("Cause Code", inp(180, "", "vh", f"{p}-dcd", "", f"{p}-dcdd"), 260, True, f"{p}-f-dcd")
              + "</div></div>")
    return shell(p, "Causes", table + detail, "saved")


# ---------------------------------------------------------------- One Pager
def onepager(p):
    def blk(t, txt, bid, h=120, dis=False, w=None):
        c = "qf-box" + (" dis" if dis else "")
        return (f'<div style="flex:1"><div style="font:700 20px Arial;margin:10px 0 6px">{t}</div>'
                f'<div class="{c}" id="{p}-{bid}" style="height:{h}px">{txt}</div></div>')
    top = ('<div style="display:flex;gap:60px"><div style="flex:1"><div class="qf-sec">Basic Data</div>'
           + fld("Issue ID", inp(300, "1000123456", "ro"), 260)
           + fld("Issue Type", inp(400, "QQ3 - Internal Complaint", "ro"), 260)
           + fld("Plant", inp(400, "1000  Planta ejemplo", "ro"), 260)
           + fld("First Incident", inp(300, "17.11.2026", "ro"), 260)
           + '</div><div style="flex:1"><div class="qf-sec">Risk</div>'
           + fld("Risk Level", inp(420, "Level 2 (high risk)", "gr"), 300)
           + fld("NOK Amount", inp(200, "50 PC", "ro"), 300)
           + fld("Expected Costs", inp(160, "0", "") + '<span class="qf-unit">EUR</span>', 300)
           + "</div></div>")
    rows = (
        '<div style="display:flex;gap:40px">' + blk("Problem Description", "", "pd", 92) + blk("Influence on Customer", "", "ic", 92) + "</div>"
        + '<div style="display:flex;gap:40px">' + blk("Cause(s) for Occurence", "", "co", 92) + blk("Cause(s) for Non-Detection", "", "cn", 92) + "</div>"
        + '<div style="display:flex;gap:40px">'
        + '<div style="flex:1"><div style="font:700 20px Arial;margin:10px 0 6px">Containment Action(s)</div>'
        + f'<div class="qf-box" id="{p}-ca" style="height:92px"></div>'
        + fld("Status for containment Action(s)", inp(220, "Open", "dd", f"{p}-cas"), 380, False, f"{p}-f-cas") + "</div>"
        + '<div style="flex:1"><div style="font:700 20px Arial;margin:10px 0 6px">Corrective Action(s)</div>'
        + f'<div class="qf-box" id="{p}-ka" style="height:92px"></div>'
        + fld("Status for corrective Action(s)", inp(220, "Open", "dd", f"{p}-kas"), 380, False, f"{p}-f-kas") + "</div>"
        + "</div>"
    )
    return shell(p, "TopQ - One Pager", top + rows, "saved")


# ---------------------------------------------------------------- SAP GUI: activities tree + upload
def activities(p):
    css = ""  # styles live in assets/css/forms.css
    acts = [("8000002020069", "D2 - Description"), ("8000002020068", "D3 - Containment Action(s)"), ("8000002020065", "D4 - Cause(s)"),
            ("8000002020064", "D5/D6 - Corrective Actions"), ("8000002020063", "D7 - Preventive Action(s)"), ("8000002020060", "D8 - Completion")]
    tree = ('<div class="gui-row"><span class="tw">▸</span><span class="gui-ic fo"></span>Overview</div>'
            '<div class="gui-row"><span class="tw">▾</span><span class="gui-ic fo"></span>Activities</div>')
    for i, (n, d) in enumerate(acts):
        tree += (f'<div class="gui-row" id="{p}-act{i}" style="padding-left:40px"><span class="gui-ic ac"></span>[ {n} ] - <b style="margin-left:6px">{d}</b>'
                 f'<span class="gui-new">New</span></div>')
    for n in ["Causes", "Correspondence", "Costs", "Pictures", "Confidential Documents", "Document Output", "Templates"]:
        tree += f'<div class="gui-row"><span class="tw">▸</span><span class="gui-ic fo"></span>{n}</div>'
    left = (f'<div class="gui-pan" style="left:12px;width:1010px"><div class="gui-tb">Record ▾ · Processes ▾ · Outlook · Synchronous ▾ · Send Document · Display Issue</div>'
            '<div class="gui-th"><div style="width:560px">Description</div><div style="width:110px">Selection</div><div style="width:90px">Note</div><div style="width:90px">View</div><div style="flex:1">State</div></div>'
            + tree + "</div>")
    right = (f'<div class="gui-pan" id="{p}-rp" style="left:1034px;right:12px"><div class="gui-tb">Record · Up · ⟳ · <span style="color:#C0392B">✖</span></div>'
             '<div class="gui-th"><div style="width:330px">Description</div><div style="width:80px">Note</div><div style="width:80px">View</div><div style="width:100px">State</div><div style="flex:1">Assignment</div></div>'
             f'<div class="gui-row" id="{p}-newdoc" style="opacity:0;padding-left:10px"><span class="gui-ic doc"></span>evidencia_D3.jpg<span class="gui-new" style="margin-left:180px">D3 - Containment</span></div>'
             f'<div class="gui-drop" id="{p}-drop">--&gt; Store files from file system for upload here</div></div>')
    radios = "".join(f'<div class="r"><i id="{p}-rd{d}" class="{"on" if d == "D1" else ""}"></i>{d}</div>' for d in ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"])
    pop = (f'<div class="gui-pop" id="{p}-pop"><div class="h">Classification</div><div class="q">Please choose a classification</div>{radios}'
           f'<div class="f"><span style="color:#2E9E4F" id="{p}-okb">✓</span><span style="color:#C0392B">✗</span></div></div>')
    return (css + '<div class="gui"><div class="gui-menu"><b>☰</b> BMSystem <span>Edit</span><span>Goto</span><span>System</span><span>Help</span></div>'
            '<div class="gui-head">&lt; <span class="sap">SAP</span> QIM Record QQ3 Change</div>'
            '<div class="gui-cmd">✓ <div class="f"></div> Cancel</div>' + left + right + pop + '<div class="gui-foot"></div></div>')
