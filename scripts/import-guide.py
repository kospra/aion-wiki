"""Freeze the already captured guide into reviewable, deterministic source artifacts.

Run with the task's lxml-enabled Python environment. This importer never fetches
the live document or transforms the original figure bytes.
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import unicodedata
from collections import defaultdict
from pathlib import Path, PureWindowsPath

from lxml import html


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".local-tools" / "source-doc"
OUTPUT = ROOT / "content" / "source"
ASSETS = ROOT / "public" / "images" / "guide"
FINGERPRINTS = {
    "html": "3d1a5c34900c95b1cc7af1c19167be836adbf23570e71684172a2a00480c5eb8",
    "docx": "ac7c3833a4d39ada22045deb471772df73b1abaf9d54e53f0f92baeb9caed826",
}


def read_json(name: str):
    return json.loads((SOURCE / name).read_text(encoding="utf-8"))


def write_json(name: str, value) -> None:
    destination = OUTPUT / name
    destination.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def slugify(title: str) -> str:
    ascii_title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")
    if not slug:
        raise ValueError(f"Title has no ASCII slug: {title!r}")
    return slug


def source_elements(tree):
    elements = tree.xpath(
        "//body//*[self::p or self::li or self::h1 or self::h2 or self::h3 or self::h4]"
    )
    return [
        element
        for element in elements
        if not any(
            ancestor.tag in {"p", "li", "h1", "h2", "h3", "h4"}
            for ancestor in element.iterancestors()
        )
    ]


def formatting_runs(audit):
    by_block = defaultdict(list)
    for run in audit["styled_runs"]:
        style = {key.strip(): value.strip() for key, value in run["style"].items()}
        weight = style.get("font-weight", "")
        result = {"text": run["text"]}
        if weight == "bold" or (weight.isdigit() and int(weight) >= 600):
            result["strong"] = True
        if style.get("font-style") in {"italic", "oblique"}:
            result["emphasis"] = True
        if "underline" in style.get("text-decoration", ""):
            result["underline"] = True
        highlight = style.get("background-color", "").lower()
        if highlight and highlight not in {"transparent", "#ffffff", "white"}:
            result["highlight"] = highlight
        if len(result) > 1:
            by_block[run["block"]].append(result)
    return by_block


def add_italic_runs(tree, elements, source_blocks, styles) -> None:
    css = "\n".join(tree.xpath("//style/text()"))
    italic_classes = set()
    normal_classes = set()
    for name, body in re.findall(r"\.([A-Za-z0-9_-]+)\s*\{([^{}]+)\}", css):
        match = re.search(r"font-style\s*:\s*([a-z]+)", body)
        if match:
            target = italic_classes if match.group(1) in {"italic", "oblique"} else normal_classes
            target.add(name)

    for record, element in zip(source_blocks, elements, strict=True):
        for node in element.iter():
            if not node.text or not node.text.strip():
                continue
            italic = False
            for ancestor in [*reversed(list(node.iterancestors())), node]:
                for class_name in ancestor.get("class", "").split():
                    if class_name in normal_classes:
                        italic = False
                    if class_name in italic_classes:
                        italic = True
                inline_style = ancestor.get("style", "")
                match = re.search(r"font-style\s*:\s*([a-z]+)", inline_style)
                if match:
                    italic = match.group(1) in {"italic", "oblique"}
            if not italic:
                continue
            matching = next(
                (run for run in styles[record["id"]] if run["text"] == node.text), None
            )
            if matching is None:
                styles[record["id"]].append({"text": node.text, "emphasis": True})
            else:
                matching["emphasis"] = True

def import_baseline(inventory, audit, tree):
    elements = source_elements(tree)
    source_blocks = inventory["blocks"]
    if len(elements) != len(source_blocks):
        raise ValueError("Saved HTML and inventory block counts disagree")

    links = defaultdict(list)
    for record in audit["links"]:
        links[record["block"]].append({"label": record["text"], "href": record["href"]})
    styles = formatting_runs(audit)
    add_italic_runs(tree, elements, source_blocks, styles)

    blocks = []
    for record, element in zip(source_blocks, elements, strict=True):
        if record["tag"] != element.tag:
            raise ValueError(f"Saved HTML tag mismatch for {record['id']}")
        block = {
            "id": record["id"],
            "tag": record["tag"],
            "text": record["text"],
            "numbers": re.findall(r"\d+(?:[.,]\d+)*", record["text"]),
            "figureIds": record["figures"],
            "links": links[record["id"]],
            "formatting": styles[record["id"]],
        }
        anchor = element.get("id") or next(
            (child.get("id") for child in element.iterdescendants() if child.get("id")),
            None,
        )
        if anchor:
            block["anchor"] = anchor
        if element.tag == "li":
            parent = element.getparent()
            if parent.tag == "ol":
                block["ordered"] = True
                block["listStart"] = int(parent.get("start", "1")) + list(parent).index(
                    element
                )
            elif parent.tag == "ul":
                block["ordered"] = False
        blocks.append(block)

    placements = defaultdict(list)
    for block in blocks:
        for figure_id in block["figureIds"]:
            placements[figure_id].append(block["id"])

    figures = []
    for record in inventory["images"]:
        figure_id = record["id"]
        if len(placements[figure_id]) != 1:
            raise ValueError(f"Expected one source placement for {figure_id}")
        original_path = SOURCE / "media" / PureWindowsPath(record["path"]).name
        original_bytes = original_path.read_bytes()
        digest = hashlib.sha256(original_bytes).hexdigest()
        if digest != record["sha256"]:
            raise ValueError(f"Source figure hash mismatch: {figure_id}")
        destination = ASSETS / (digest + original_path.suffix.lower())
        if not destination.exists():
            destination.write_bytes(original_bytes)
        if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
            raise ValueError(f"Copied figure hash mismatch: {figure_id}")
        figures.append(
            {
                "id": figure_id,
                "sourceId": placements[figure_id][0],
                "sha256": digest,
                "src": "/images/guide/" + destination.name,
                "width": record["width"],
                "height": record["height"],
            }
        )
    return {"fingerprints": FINGERPRINTS, "blocks": blocks, "figures": figures}


def main() -> None:
    for export, expected in FINGERPRINTS.items():
        actual = sha256(SOURCE / ("source." + export))
        if actual != expected:
            raise ValueError(f"Saved {export} fingerprint mismatch: {actual}")
    inventory = read_json("inventory.json")
    audit = read_json("formatting-audit.json")
    taxonomy = read_json("proposed-taxonomy.json")
    figure_audit = read_json("figure-audit.json")
    tree = html.fromstring((SOURCE / "source-readable.html").read_bytes())

    OUTPUT.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    write_json("baseline.json", import_baseline(inventory, audit, tree))

    # The approved public page title omits the taxonomy audit's research label.
    taxonomy[-1] = {
        **taxonomy[-1],
        "sourceTitle": taxonomy[-1]["title"],
        "title": "Class Passives",
    }
    slugs = [slugify(page["title"]) for page in taxonomy]
    if len(slugs) != len(set(slugs)):
        raise ValueError("Approved page titles produce duplicate slugs")
    write_json(
        "taxonomy.json",
        [{"slug": slug, **page} for slug, page in zip(slugs, taxonomy, strict=True)],
    )
    write_json("figure-audit.json", figure_audit)
    subprocess.run(
        [
            str(ROOT / "node_modules" / ".bin" / "prettier"),
            "--write",
            *(
                str(OUTPUT / name)
                for name in ("baseline.json", "taxonomy.json", "figure-audit.json")
            ),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
    )


if __name__ == "__main__":
    main()
