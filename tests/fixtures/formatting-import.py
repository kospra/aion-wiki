"""Offline importer regressions. Run with any Python environment containing lxml.

No captured .local-tools files are read: all input and expected positions are literals.
"""
import importlib.util
from pathlib import Path
import unittest
import sys

from lxml import html

sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location(
    "guide_importer", Path(__file__).resolve().parents[2] / "scripts/import-guide.py"
)
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class FormattingImportTest(unittest.TestCase):
    def test_text_tails_inheritance_cascade_whitespace_and_utf16(self):
        tree = html.fromstring('''<html><head><style>
          .normal { font-style: normal }
          .italic { font-style: italic }
          .bold { font-weight: 700 }
          .marked { text-decoration: underline; background-color: #ffff00 }
        </style></head><body><p class="italic">  🎮&nbsp;<span class="normal">P<span>erks</span></span>\n\t<span class="italic normal">Per<span class="bold marked"><a style="text-decoration:inherit">ks</a></span></span> tail <span style="font-style:normal">plain</span> end </p></body></html>''')
        text = '🎮 Perks Perks tail plain end'
        result = importer.import_baseline(
            {"blocks": [{"id": "block-0001", "tag": "p", "text": text, "figures": []}], "images": []},
            {"styled_runs": [], "links": []}, tree,
        )["blocks"][0]
        self.assertEqual(result["text"], text)
        self.assertEqual(result["formatting"], [
            {"text": "🎮", "start": 0, "end": 2, "emphasis": True},
            {"text": "Per", "start": 9, "end": 12, "emphasis": True},
            {"text": "ks", "start": 12, "end": 14, "strong": True, "emphasis": True, "underline": True, "highlight": "#ffff00"},
            {"text": "tail", "start": 15, "end": 19, "emphasis": True},
            {"text": "end", "start": 26, "end": 29, "emphasis": True},
        ])


if __name__ == "__main__":
    unittest.main()
