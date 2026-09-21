const nodeData = {
  kali: {
    kind: "CONTROLLED ADVERSARY",
    status: "Validated",
    statusClass: "confirmed",
    title: "Kali Linux",
    summary: "Attack workstation used to generate controlled network and authentication activity inside the isolated lab.",
    network: "VMnet7: 192.168.70.10",
    evidence: "Nmap AD service discovery, NetExec SMB/LDAP testing, and Sentinel validation.",
    tags: ["Nmap", "NetExec", "Linux"]
  },
  dc: {
    kind: "IDENTITY CONTROL PLANE",
    status: "Documented",
    statusClass: "confirmed",
    title: "DC-01",
    summary: "Windows Server domain controller providing Active Directory Domain Services inside the host-only range.",
    network: "VMnet7 host-only segment",
    evidence: "AD DS configured, BadBlood test data seeded, and DNS, Kerberos, LDAP, SMB, and RPC services observed during scanning.",
    tags: ["AD DS", "BadBlood", "Windows Server"]
  },
  win: {
    kind: "DOMAIN ENDPOINT",
    status: "Documented",
    statusClass: "confirmed",
    title: "WIN-01",
    summary: "Windows endpoint used for domain-member configuration and endpoint telemetry work; the build log is documented through its setup sequence.",
    network: "VMnet7 host-only segment",
    evidence: "Endpoint build progress, Windows event analysis, and planned repeatable attack-to-detection exercises.",
    tags: ["Windows", "Domain Member", "Event Logs"]
  },
  sysmon: {
    kind: "ENDPOINT SENSOR",
    status: "Active work",
    statusClass: "confirmed",
    title: "Sysmon",
    summary: "High-value Windows telemetry layer used to make process, network, and persistence behavior easier to investigate.",
    network: "Windows hosts → SIEM telemetry path",
    evidence: "Process-creation analysis and parent-child correlation work; expanded coverage remains an active lab milestone.",
    tags: ["Sysmon", "Process Trees", "Telemetry"]
  },
  splunk: {
    kind: "SELF-HOSTED SIEM",
    status: "Platform online",
    statusClass: "confirmed",
    title: "SPLUNK-01",
    summary: "Ubuntu server running Splunk Enterprise as the lab’s self-hosted search and investigation platform.",
    network: "VMware lab · web service on TCP 1137",
    evidence: "Splunk Enterprise 10.4.2 installed, service running, and TCP reachability validated. Windows ingestion is staged next.",
    tags: ["Splunk 10.4.2", "Ubuntu", "TCP 1137"]
  },
  sentinel: {
    kind: "CLOUD SIEM",
    status: "Receiving data",
    statusClass: "confirmed",
    title: "Microsoft Sentinel",
    summary: "Cloud SIEM used for lab telemetry, KQL hunts, and alert-development practice.",
    network: "Azure Monitor / data collection rule path",
    evidence: "Azure Connected Machine Agent, DCR work, incoming data validation, custom KQL queries, and alert exercises.",
    tags: ["Sentinel", "KQL", "Azure Monitor"]
  }
};

const cases = {
  "ad-lab": {
    kicker: "CASE 01 · ACTIVE DIRECTORY + SOC",
    title: "SOC–Active Directory Lab",
    deck: "A segmented VMware environment built to connect adversary behavior with identity and endpoint evidence, then investigate the results in multiple SIEM workflows.",
    facts: [["Environment", "VMware"], ["Range", "Isolated"], ["Focus", "Attack → evidence"]],
    method: [
      "Isolated Active Directory lab traffic on the VMnet7 host-only network.",
      "Configured DC-01 with AD DS and seeded realistic directory objects using BadBlood.",
      "Used Kali to enumerate exposed AD services and generate controlled test activity.",
      "Validated telemetry in Sentinel and established SPLUNK-01 as a second analysis platform."
    ],
    evidence: [
      "Kali connected to the VMnet7 lab at 192.168.70.10/24.",
      "Observed ports 53, 88, 135, 139, 389, and 445 on the domain controller during service discovery.",
      "Sentinel data and custom KQL work documented; Splunk service reachability independently checked.",
      "CrowdSec was removed from the current design and is not presented as deployed."
    ],
    next: "Complete a repeatable attack matrix with saved telemetry, screenshots, queries, and report-ready findings for each scenario.",
    link: "https://github.com/Dylans7j/SOC-Lab"
  },
  "kql-hunts": {
    kicker: "CASE 02 · DETECTION ENGINEERING",
    title: "KQL Detection & Hunt Pack",
    deck: "A growing set of focused queries intended to shorten the path from Windows evidence to a defensible investigative answer.",
    facts: [["Language", "KQL"], ["Platform", "Sentinel"], ["State", "Active work"]],
    method: [
      "Start broad with time, host, user, and event constraints.",
      "Normalize process names, parent processes, command lines, and account context.",
      "Pivot on suspicious relationships and corroborate across adjacent events.",
      "Record what the data proves separately from analyst inference."
    ],
    evidence: [
      "Custom Sentinel queries created during lab validation.",
      "Process-creation and parent-child investigation patterns used in Windows event exercises.",
      "Alert-development work tied to incoming lab data rather than static examples alone."
    ],
    next: "Package each query with purpose, required tables, known limitations, test data, and an expected result screenshot.",
    link: "https://github.com/Dylans7j/SOC-Lab/tree/main/detections"
  },
  "event-4688": {
    kicker: "CASE 03 · WINDOWS FORENSICS",
    title: "Event 4688 Process Investigation",
    deck: "A Windows Security log exercise focused on reconstructing process ancestry around C2 beaconing while keeping observed facts distinct from attribution.",
    facts: [["Source", "Security.evtx"], ["Event", "4688"], ["Protocol", "TCP"]],
    method: [
      "Filtered process-creation events around the relevant time window.",
      "Compared NewProcessName, ParentProcessName, user context, and process identifiers.",
      "Followed candidate chains instead of stopping at the first suspicious executable.",
      "Used the network clue—TCP—as corroboration, not proof of a specific malware family."
    ],
    evidence: [
      "Event data included taskhostw.exe created beneath svchost.exe.",
      "Additional 4688 review surfaced WMIADAP.exe for correlation.",
      "The exercise answer identified TCP as the C2 protocol.",
      "No malware attribution is claimed from those process names alone."
    ],
    next: "Add process-ID correlation across Sysmon network events and Windows Security events to produce a complete timestamped process-to-connection chain."
  },
  "splunk-build": {
    kicker: "CASE 04 · SIEM ENGINEERING",
    title: "Splunk SIEM Build",
    deck: "A self-hosted Splunk deployment that adds a second investigation workflow to the lab without overstating data onboarding progress.",
    facts: [["Host", "SPLUNK-01"], ["OS", "Ubuntu"], ["Version", "10.4.2"]],
    method: [
      "Installed the Linux AMD64 Splunk Enterprise package on Ubuntu.",
      "Started the service and validated the configured web endpoint.",
      "Confirmed TCP connectivity to the lab-specific service port.",
      "Separated platform availability from the still-staged ingestion milestone."
    ],
    evidence: [
      "Splunk Enterprise package: 10.4.2-33c3bf42cd73.",
      "Service is running and the TCP test returned reachable.",
      "The lab web interface is configured on TCP 1137.",
      "No claim is made here that Windows forwarder ingestion is complete."
    ],
    next: "Onboard DC-01 and WIN-01 with a Universal Forwarder, verify sourcetypes, then reproduce one Sentinel investigation in SPL.",
    link: "https://github.com/Dylans7j/SOC-Lab/tree/main/Detection-engineering/Dual-Siem"
  },
  "llmnr-poisoning": {
    kicker: "CASE 05 · ATTACK TO DETECTION",
    title: "LLMNR/NBT-NS Poisoning Investigation",
    deck: "A controlled Active Directory scenario documenting how name-resolution poisoning creates credential exposure and how defenders can identify and reduce the risk.",
    facts: [["Tool", "Responder"], ["Environment", "Isolated AD lab"], ["State", "Documented"]],
    method: [
      "Generated controlled LLMNR/NBT-NS poisoning activity from Kali inside the isolated lab.",
      "Documented the attack path and the Windows and network evidence available to defenders.",
      "Mapped the behavior to MITRE ATT&CK and separated observed evidence from expected indicators.",
      "Recorded protocol-hardening, segmentation, and credential-protection recommendations."
    ],
    evidence: [
      "The complete scenario is published in the SOC-Lab repository.",
      "The write-up preserves the controlled commands and relevant detection opportunities.",
      "Remediation focuses on disabling legacy name-resolution protocols where feasible and reducing credential exposure."
    ],
    next: "Add a tested KQL/SPL detection with an expected-result screenshot and documented false-positive considerations.",
    link: "https://github.com/Dylans7j/SOC-Lab/blob/main/attack-scenarios/llmnr-nbtns-poisoning.md"
  },
  cs499: {
    kicker: "PROJECT 06 · SOFTWARE ENGINEERING",
    title: "CS 499 ePortfolio",
    deck: "A completed academic portfolio showing the ability to review code, enhance artifacts, and explain engineering decisions in writing.",
    facts: [["Program", "Computer Science"], ["State", "Published"], ["Host", "GitHub"]],
    method: [
      "Performed a code review before enhancement work.",
      "Organized artifacts and supporting narratives.",
      "Connected technical changes to outcomes and course objectives.",
      "Closed with a self-assessment of the complete portfolio."
    ],
    evidence: [
      "Public repository is available under the Dylans7j GitHub account.",
      "Repository includes code review, artifacts, narratives, and self-assessment material.",
      "Completion was documented in July 2026."
    ],
    next: "Cross-link the strongest software engineering artifact with a security-focused project that demonstrates telemetry, investigation, and reporting.",
    link: "https://github.com/Dylans7j/CS499-ePortfolio"
  }
};

const nodes = [...document.querySelectorAll(".node")];
const links = [...document.querySelectorAll(".link")];
const inspector = {
  kind: document.querySelector("#inspectorKind"),
  status: document.querySelector("#inspectorStatus"),
  title: document.querySelector("#inspectorTitle"),
  summary: document.querySelector("#inspectorSummary"),
  network: document.querySelector("#inspectorNetwork"),
  evidence: document.querySelector("#inspectorEvidence"),
  tags: document.querySelector("#inspectorTags")
};

function selectNode(key) {
  const data = nodeData[key];
  if (!data) return;

  nodes.forEach(node => {
    const selected = node.dataset.node === key;
    node.classList.toggle("active", selected);
    node.classList.toggle("dim", !selected && !links.some(link => link.dataset.link.split(" ").includes(key) && link.dataset.link.split(" ").includes(node.dataset.node)));
    node.setAttribute("aria-pressed", String(selected));
  });

  links.forEach(link => {
    const related = link.dataset.link.split(" ").includes(key);
    link.classList.toggle("highlight", related);
    link.classList.toggle("dim", !related);
  });

  inspector.kind.textContent = data.kind;
  inspector.status.textContent = data.status;
  inspector.status.className = `status ${data.statusClass}`;
  inspector.title.textContent = data.title;
  inspector.summary.textContent = data.summary;
  inspector.network.textContent = data.network;
  inspector.evidence.textContent = data.evidence;
  inspector.tags.replaceChildren(...data.tags.map(tag => {
    const span = document.createElement("span");
    span.textContent = tag;
    return span;
  }));
}

nodes.forEach(node => node.addEventListener("click", () => selectNode(node.dataset.node)));
document.querySelector("#resetTopology").addEventListener("click", () => {
  nodes.forEach(node => node.classList.remove("dim"));
  links.forEach(link => link.classList.remove("dim", "highlight"));
  selectNode("kali");
});

const filters = [...document.querySelectorAll(".filter")];
const projects = [...document.querySelectorAll(".project")];
filters.forEach(filter => filter.addEventListener("click", () => {
  const value = filter.dataset.filter;
  filters.forEach(button => {
    const active = button === filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  projects.forEach(project => {
    project.hidden = value !== "all" && !project.dataset.tech.split(" ").includes(value);
  });
}));

const dialog = document.querySelector("#caseDialog");
const caseTitle = document.querySelector("#caseTitle");
const caseKicker = document.querySelector("#caseKicker");
const caseDeck = document.querySelector("#caseDeck");
const caseFacts = document.querySelector("#caseFacts");
const caseMethod = document.querySelector("#caseMethod");
const caseEvidence = document.querySelector("#caseEvidence");
const caseNext = document.querySelector("#caseNext");
const caseLink = document.querySelector("#caseLink");

function listItems(items) {
  return items.map(item => {
    const li = document.createElement("li");
    li.textContent = item;
    return li;
  });
}

function openCase(key) {
  const data = cases[key];
  if (!data) return;
  caseKicker.textContent = data.kicker;
  caseTitle.textContent = data.title;
  caseDeck.textContent = data.deck;
  caseFacts.replaceChildren(...data.facts.map(([label, value]) => {
    const div = document.createElement("div");
    const span = document.createElement("span");
    const bold = document.createElement("b");
    span.textContent = label;
    bold.textContent = value;
    div.append(span, bold);
    return div;
  }));
  caseMethod.replaceChildren(...listItems(data.method));
  caseEvidence.replaceChildren(...listItems(data.evidence));
  caseNext.textContent = data.next;
  if (data.link) {
    caseLink.href = data.link;
    caseLink.classList.remove("hidden");
  } else {
    caseLink.classList.add("hidden");
  }
  dialog.showModal();
}

projects.forEach(project => project.querySelector(".case-button").addEventListener("click", () => openCase(project.dataset.case)));
document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  const bounds = dialog.getBoundingClientRect();
  const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  if (outside) dialog.close();
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll(".reveal").forEach(element => observer.observe(element));

selectNode("kali");
