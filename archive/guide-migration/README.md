# Archived guide migration tools

These scripts preserve the original capture-to-baseline transformation. They are
not part of development, CI, builds, or routine content editing.

- `import-guide.py` requires Python with `lxml`, the original ignored
  `.local-tools/source-doc/` capture and audits, and installed Node dependencies.
  It verifies the frozen capture fingerprints, then **rewrites** the source
  baseline, taxonomy, figure audit, and any missing image assets. Do not run it
  to repair validation failures or import a newer live guide; use
  `npm run source:sync` for that.
- `formatting-import.py` exercises the importer with a small offline fixture.
  Run it explicitly with `python archive/guide-migration/formatting-import.py`
  when changing the archived importer.

For normal content edits, use the canonical files described in the root README
and run `npm run content:generate`. No Python environment is needed.
