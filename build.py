from pathlib import Path
import re

root = Path(__file__).resolve().parent
html = (root / 'page.html').read_text()
for stylesheet in re.findall(r'<link rel="stylesheet" href="([^"]+)">',html):
    html = html.replace(f'<link rel="stylesheet" href="{stylesheet}">', '<style>\n' + (root / stylesheet).read_text() + '\n</style>')
for script in re.findall(r'<script src="([^"]+)"></script>',html):
    html = html.replace(f'<script src="{script}"></script>', '<script>\n' + (root / script).read_text().replace('</script', '<\\/script') + '\n</script>')
(root / 'index.html').write_text(html)
print(f'Guía lista: {root / "index.html"} ({len(html.encode()):,} bytes)')
