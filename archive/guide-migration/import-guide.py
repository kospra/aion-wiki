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


ROOT = Path(__file__).resolve().parents[2]
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


# Exactly ECMAScript \s (Python's \s also includes U+0085 and U+001C-001F).
JS_WHITESPACE = re.compile(
    r"[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]"
)


def normalize_whitespace(text):
    return re.sub(JS_WHITESPACE.pattern + "+", " ", text).strip(" ")


def css_declarations(body):
    return {
        key.strip(): value.strip()
        for declaration in body.split(";")
        if ":" in declaration
        for key, value in [declaration.split(":", 1)]
    }


def formatting_runs(tree, elements, source_blocks):
    """Freeze inline annotations from the captured Google export, in text order.

    Class rules follow stylesheet order (not the HTML class attribute order).
    Font/style annotations inherit through nested spans and links; tails belong
    to their parent. Layout/tag defaults are not inline source annotations.
    Each run stores a half-open UTF-16 range in JS-whitespace-normalized block
    text. Run text is that exact slice, excluding its boundary whitespace.
    """
    css = "\n".join(tree.xpath("//style/text()"))
    rules = [
        (selector.strip()[1:], css_declarations(body))
        for selector, body in re.findall(r"([^{}]+)\{([^{}]+)\}", css)
        if re.fullmatch(r"\.[A-Za-z0-9_-]+", selector.strip())
    ]

    def style(node, inherited):
        current = dict(inherited)
        names = set(node.get("class", "").split())
        declarations = {}
        for name, values in rules:
            if name in names:
                declarations.update(values)
        declarations.update(css_declarations(node.get("style", "")))
        for key, value in declarations.items():
            if value != "inherit":
                current[key] = value
        return current

    by_block = defaultdict(list)
    for record, element in zip(source_blocks, elements, strict=True):
        chunks = []

        def visit(node, inherited):
            current = style(node, inherited)
            if node.text:
                chunks.append((node.text, current))
            for child in node:
                if isinstance(child.tag, str):
                    visit(child, current)
                if child.tail:
                    chunks.append((child.tail, current))

        inherited = {}
        for ancestor in reversed(list(element.iterancestors())):
            inherited = style(ancestor, inherited)
        visit(element, inherited)
        # Preserve origin while collapsing whitespace across text-node boundaries.
        characters = []
        for index, (text, _) in enumerate(chunks):
            for character in text:
                if JS_WHITESPACE.fullmatch(character):
                    if characters and characters[-1][0] != " ":
                        characters.append((" ", index))
                else:
                    characters.append((character, index))
        if characters and characters[-1][0] == " ":
            characters.pop()
        normalized = "".join(character for character, _ in characters)
        if normalized != normalize_whitespace(record["text"]):
            raise ValueError(f"Saved HTML text mismatch for {record['id']}")

        positions = defaultdict(list)
        offset = 0
        for character, origin in characters:
            width = len(character.encode("utf-16-le")) // 2
            if character != " ":
                positions[origin].append((offset, offset + width))
            offset += width
        encoded = normalized.encode("utf-16-le")
        for origin, (_, current) in enumerate(chunks):
            if not positions[origin]:
                continue
            start = positions[origin][0][0]
            end = positions[origin][-1][1]
            result = {
                "text": encoded[start * 2:end * 2].decode("utf-16-le"),
                "start": start,
                "end": end,
            }
            weight = current.get("font-weight", "")
            if weight == "bold" or (weight.isdigit() and int(weight) >= 600):
                result["strong"] = True
            if current.get("font-style") in {"italic", "oblique"}:
                result["emphasis"] = True
            if "underline" in current.get("text-decoration", ""):
                result["underline"] = True
            highlight = current.get("background-color", "").lower()
            if highlight and highlight not in {"transparent", "#ffffff", "white"}:
                result["highlight"] = highlight
            if len(result) > 3:
                by_block[record["id"]].append(result)
    return by_block


def import_baseline(inventory, audit, tree):
    elements = source_elements(tree)
    source_blocks = inventory["blocks"]
    if len(elements) != len(source_blocks):
        raise ValueError("Saved HTML and inventory block counts disagree")

    links = defaultdict(list)
    for record in audit["links"]:
        links[record["block"]].append({"label": record["text"], "href": record["href"]})
    styles = formatting_runs(tree, elements, source_blocks)

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
            "node",
            str(ROOT / "node_modules" / "prettier" / "bin" / "prettier.cjs"),
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
