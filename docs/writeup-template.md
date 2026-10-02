# Write-Up Template — D4RKGUNN3R / Dylan Senez

Canonical structure for machine walkthroughs, Sherlock investigations, and lab case studies.
Every published writeup follows this order. The same data model drives the on-site writeup
builder, the published HTML article, and both release channels (public + team).

> **Evidence standard.** `Validated` steps were directly reproduced. `Documented` steps are
> supported by preserved artifacts. `Staged` steps remain incomplete or await evidence. Never
> present a staged step as finished work.

---

## 0. Metadata (header block)

| Field | Purpose | Example |
|---|---|---|
| `title` | Machine / investigation name | `CCTV` |
| `platform` | Source platform | `Hack The Box` |
| `difficulty` | Published difficulty | `Easy` |
| `os` | Operating system | `Linux` |
| `status` | Honest state of the work | `Retired machine · validated walkthrough` |
| `assessmentType` | Authorization basis | `Authorized laboratory assessment` |
| `lastReviewed` | Date the writeup was last checked against evidence | `2026-10-02` |
| `themes` | Comma-separated technique tags (drives site search) | `blind SQL injection, credential reuse, cap_net_raw abuse` |

Rule: `lastReviewed` must never predate the evidence it reviews.

---

## 1. Case overview

- **`summary`** — one paragraph. What was the target, what was the chain, where did it end.
  Search-engine description; no flags, no passwords.
- **`outcome`** — what was actually achieved, in one or two sentences. State the terminal
  objective (e.g. root) and the decisive weakness.
- **`takeaway`** — the single most transferable security lesson. Written for a defender.

---

## 2. Attack path

One stage per line, top to bottom, using `→` freely. This is the map a reader scans first;
keep it reproducible end to end. Example:

```
nmap -p- <TARGET> → 22 (OpenSSH), 80 (Apache) — no other exposed ports
Default credentials admin:admin left in place on the web application
CVE-XXXX-XXXX authenticated blind SQL injection → dump users table → password hashes
hashcat -m 3200 → one hash cracks to an SSH password (<REDACTED>) → SSH foothold
Local enumeration → dangerous capability on a general-purpose binary
Intercept unencrypted management traffic → second account credential (<REDACTED>)
Lateral movement → user flag
Loopback-only management panel exposed via SSH local-forward
CVE-YYYY-YYYY authenticated command injection → root shell
cat /root/root.txt
```

---

## 3. Technical steps (repeat per step)

Each step is a self-contained evidence unit:

| Field | Meaning |
|---|---|
| `phase` | Reconnaissance / Initial Access / Internal Enumeration / Exploitation / User Access / Privilege Escalation / Evidence Collection / Other |
| `title` | Short factual headline |
| `status` | `Validated` / `Documented` / `Staged` |
| `environment` | Where it ran (`Kali / attacker`, `Target — www-data`, …) |
| `evidenceId` | Stable ID, `EVD-001`, `EVD-002`, … |
| `artifact` | File the output was saved to (`scans/initial.nmap`, `/tmp/exploit.rc`) |
| `objective` | What this step was trying to prove |
| `command` | Exact command / HTTP request, secrets redacted |
| `result` | Observed output, verbatim where it matters |
| `analysis` | **Required.** What the evidence means, and what it does *not* prove. Separate observation from inference. |
| `why` | Why this mattered to the chain |
| `screenshots` | Attached evidence images with captions |

Analysis discipline: a behavioral result proves exploitability and impact; it does not by
itself prove the exact source line, query construction, or database ordering. Label those as
*likely* or *inferred* unless source or logs were inspected.

---

## 4. Findings & remediation (repeat per finding)

| Field | Meaning |
|---|---|
| `id` | `F-1`, `F-2`, … |
| `title` | Vulnerability name |
| `severity` | Critical / High / Medium / Low / Informational — calibrated to demonstrated impact |
| `status` | `Validated` / `Documented` / `Staged` |
| `asset` | Affected host / component / parameter |
| `description` | What the weakness is, concretely |
| `impact` | Demonstrated confidentiality / integrity / availability blast radius |
| `rootCause` | Why it exists — mark inferred causes as inferred |
| `remediation` | One defensive action per line |
| `validation` | How it was confirmed (cite `EVD-` IDs) |

Use CVSS accurately. If an exploit requires authentication (`PR:H`), say so; do not market an
authenticated issue as unauthenticated. State the CVSS vector, not just a number.

---

## 5. Analysis

- **`analysisSummary`** — one paragraph that synthesises the whole chain: how the individual
  weaknesses linked, which assumption broke at each hop, and the single earliest control that
  would have stopped the chain. This is the section a reader remembers; write it for the person
  who has to defend the same estate, not to repeat the findings.

Distinguish observation from inference. A behavioural result proves exploitability and impact;
label exact source lines, query construction, or internals as *likely* or *inferred* unless you
inspected them.

---

## 6. Remediation

- **`remediationSummary`** — one prioritised action per line, consolidated across every finding.
  Order by what removes the most risk soonest (credential hygiene and patch level usually beat
  the most dramatic bug). Each finding still carries its own `remediation`, so the public-facing
  article shows both the per-finding fixes and this consolidated plan.

---

## 7. Defender perspective

- **`defenderPerspective`** — paragraph connecting the attacker's actions to telemetry and controls.
- **`detections`** — one detection opportunity per line (log source, condition, why it fires).

---

## 8. Closeout

- **`lessons`** — one lesson per line.
- **`openQuestions`** — what remains unproven or worth a follow-up.
- **`references`** — one reference per line (CVE records, vendor advisories, tool docs).

---

## 9. Troubleshooting & success factors

One item per line. The traps that cost time on the way in — the ones a reader will hit too.
This is the section most writeups omit and the one that saves the next operator 20 minutes.

```
Correct LHOST: reverse shell callbacks fail if you hardcode an address; derive the tun0 IP at run time
SSH authentication: Metasploit tries public-key auth first; force password auth with -o PubkeyAuthentication=no
Payload selection: default meterpreter payloads failed with "All encoders failed to encode"; use cmd/.../shell_reverse_tcp + set --clear encoder
```

---

## 10. Publication safety (release metadata)

- **`redactions`** — the sensitive values stripped from the *public* release. One per line,
  either `secret` or `secret => <PLACEHOLDER>`. Typical entries: flags, cracked passwords,
  password hashes, attacker/target addresses, API keys, usernames you do not want indexed.

Two release channels are produced from one data model:

| Channel | Redaction | Destination |
|---|---|---|
| **Public** | Applied | Pushed to `articles/<slug>.html` on the public portfolio |
| **Team** | Not applied | Downloaded as a standalone file; never pushed |

Redaction is driven entirely by the rules you list — every occurrence of a listed value is
replaced with its placeholder across commands, results, and prose. It is a safety net, not a
substitute for reviewing the **Public (redacted)** preview before you publish. A rule with no
explicit placeholder (`secret` on its own) is replaced with `<REDACTED>`. The **Team**
(unredacted) preview and exports keep the original values.

---

## Section order in the rendered article

1. Header / metadata
2. Case overview — outcome, key takeaway, validation summary
3. Attack path
4. Technical steps (1…n)
5. Findings & remediation (F-1…n)
6. Analysis — synthesised attack-chain analysis
7. Remediation — consolidated, prioritised fixes
8. Defender perspective + detection opportunities
9. Lessons learned + open questions
10. Troubleshooting & success factors (optional)
11. References
