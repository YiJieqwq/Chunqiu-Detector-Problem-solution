from html.parser import HTMLParser
from pathlib import Path
class Parser(HTMLParser):
 def __init__(self):
  super().__init__(); self.stack=[]; self.entries=0; self.cards=0; self.footers=0; self.h3=0; self.h4=0; self.bad=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs); cls=a.get('class','').split()
  if tag=='details' and 'cq-entry' in cls: self.entries+=1
  if 'cq-entry-card' in cls:
   self.cards+=1
   if any('cq-entry-card' in x[1] for x in self.stack): self.bad.append('nested cards')
  if 'cq-copyright' in cls:
   self.footers+=1
   if any(set(x[1]) & {'cq-entry','cq-static-entry','cq-entry-card','cq-entry-block'} for x in self.stack): self.bad.append('nested copyright')
  if tag=='h3': self.h3+=1
  if tag=='h4': self.h4+=1
  if set(cls)&{'cq-card','cq-item-body','cq-collapsed'}: self.bad.append('legacy structure')
  if tag not in {'meta','link','img','hr','br','input','source','wbr','area','base','embed','param','track','col'}: self.stack.append((tag,cls))
 def handle_endtag(self,tag):
  if not self.stack or self.stack[-1][0]!=tag: self.bad.append('unbalanced '+tag)
  else: self.stack.pop()
for lang in ['zh','en']:
 for page in ['index','prologue','items']:
  p=Parser();p.feed(Path(f'docs/.vitepress/dist/{lang}/{page}.html').read_text())
  assert not p.bad,(lang,page,p.bad[:8])
  assert not p.stack
  assert p.footers==1
  assert p.entries==(89 if page=='items' else 0),(lang,page,p.entries)
  if page=='items': assert p.cards==p.entries
  print(lang,page,'native entries',p.entries,'cards',p.cards,'headings',p.h3,p.h4,'footer independent: PASS')
