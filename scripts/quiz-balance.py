#!/usr/bin/env python3
"""Measure answer-length bias in the built site's quizzes.

Usage: python3 scripts/quiz-balance.py <built-site-dir> [--by-lesson]
For every quiz question in the built HTML it checks whether the correct option is the
longest (or the shortest) of its options. With 4 options a fair quiz has the correct
answer longest about 25% of the time; a high rate lets learners guess "the long one".
"""
import sys, re, glob, os
from html.parser import HTMLParser

class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.qs=[]; self.cur=None; self.opt=None; self.depth=0
    def handle_starttag(self,t,a):
        a=dict(a); c=(a.get('class') or '').split()
        if t=='div' and 'quiz-q' in c: self.cur={'answer':a.get('data-answer'),'opts':[]}; self.qs.append(self.cur)
        if t=='button' and 'quiz-opt' in c and self.cur is not None:
            self.opt={'idx':a.get('data-idx'),'text':''}
    def handle_data(self,d):
        if self.opt is not None: self.opt['text']+=d
    def handle_endtag(self,t):
        if t=='button' and self.opt is not None:
            self.cur['opts'].append(self.opt); self.opt=None

def analyse(path):
    p=P(); p.feed(open(path,errors='ignore').read()); out=[]
    for q in p.qs:
        o=q['opts']
        if len(o)<3 or q['answer'] is None: continue
        lens={x['idx']:len(re.sub(r'\s+',' ',x['text']).strip()) for x in o}
        a=q['answer']
        if a not in lens: continue
        m=max(lens.values()); n=min(lens.values())
        longest = lens[a]==m and list(lens.values()).count(m)==1
        shortest = lens[a]==n and list(lens.values()).count(n)==1
        mean_others=(sum(lens.values())-lens[a])/(len(lens)-1)
        out.append((longest,shortest,lens[a]/max(mean_others,1),len(o)))
    return out

root=sys.argv[1]; by='--by-lesson' in sys.argv
rows={}
for f in glob.glob(os.path.join(root,'**','index.html'),recursive=True):
    r=analyse(f)
    if r: rows[os.path.relpath(f,root).replace('/index.html','')]=r
allr=[x for v in rows.values() for x in v]
def summ(rs):
    n=len(rs)
    return n, 100*sum(x[0] for x in rs)/n, 100*sum(x[1] for x in rs)/n, sum(x[2] for x in rs)/n
n,l,s,ratio=summ(allr)
exp=sum(100/x[3] for x in allr)/n
print(f"{n} questions: correct is LONGEST {l:.0f}% (fair ≈ {exp:.0f}%), SHORTEST {s:.0f}%, mean length ratio correct/other {ratio:.2f}")
if by:
    print(f"{'page':58} {'n':>4} {'longest%':>9} {'ratio':>6}")
    for k,v in sorted(rows.items(), key=lambda kv:-summ(kv[1])[1]):
        n,l,s,ratio=summ(v); print(f"{k:58} {n:>4} {l:>8.0f}% {ratio:>6.2f}")
