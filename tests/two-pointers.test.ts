import test from 'node:test';
import assert from 'node:assert/strict';
import { createLab, moveLab, expectedAction, labActions, type LabMode, type LabState } from '../src/lib/pointer-lab.ts';
import { challengeFor, conceptIds, answerMatches } from '../src/data/pointer-challenges.ts';
import { parseBook, gradeReview, reviewQueue, DAY } from '../src/lib/pointer-review.ts';

const modes:LabMode[]=['pair','compact','colors','merge'];
const withoutMessage=(s:LabState)=>{const {message,...rest}=s;return rest;};
function solve(state:LabState) {
  let budget=3*(state.a.length+state.b.length)+5;
  while(!state.done&&budget-->0) {
    // Wrong actions must not move pointers, mutate input, or count as progress.
    for(const {action} of labActions[state.mode]) {
      const result=moveLab(state,action);
      if(!result.accepted)assert.deepEqual(withoutMessage(result.state),withoutMessage(state));
    }
    state=moveLab(state,expectedAction(state)).state;
  }
  assert.equal(state.done,true,'a trace must terminate');return state;
}
function assertResult(initial:LabState) {
  const original=[...initial.a];const final=solve(initial);
  if(initial.mode==='pair') {
    let exists=false;for(let i=0;i<original.length;i++)for(let j=i+1;j<original.length;j++)if(original[i]+original[j]===initial.target)exists=true;
    assert.equal(final.left<final.right,exists);
    if(exists)assert.equal(final.a[final.left]+final.a[final.right],initial.target);
  } else if(initial.mode==='compact') assert.deepEqual(final.a,[...original.filter(x=>x!==0),...original.filter(x=>x===0)]);
  else if(initial.mode==='colors') assert.deepEqual(final.a,[...original].sort((a,b)=>a-b));
  else assert.deepEqual(final.a,[...original.slice(0,initial.i+1),...initial.b].sort((a,b)=>a-b));
}
test('all sixteen playground cases terminate with correct results; wrong moves preserve the board',()=> {
  for(const mode of modes)for(let variant=0;variant<4;variant++)assertResult(createLab(mode,variant));
});
test('playground algorithms agree with independent results on varied small inputs',()=> {
  let seed=71;const random=(max:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;};
  for(let trial=0;trial<150;trial++) {
    const a=Array.from({length:random(8)},()=>random(11)-5);
    for(const mode of modes) {
      let state=createLab(mode);
      if(mode==='merge') {
        const b=Array.from({length:random(6)},()=>random(11)-5).sort((a,b)=>a-b);const first=[...a].sort((a,b)=>a-b);
        state={...state,a:[...first,...Array(b.length).fill(0)],b,i:first.length-1,j:b.length-1,write:first.length+b.length-1};
      } else {
        const input=mode==='pair'?[...a].sort((a,b)=>a-b):mode==='colors'?a.map(x=>Math.abs(x)%3):a;
        state={...state,a:[...input],right:input.length-1,target:random(15)-7};
      }
      assertResult(state);
    }
  }
});
test('both equal merge candidates are valid moves',()=> {
  const state={...createLab('merge'),a:[2,0],b:[2],i:0,j:0,write:1};
  assert.equal(moveLab(state,'take-a').accepted,true);assert.equal(moveLab(state,'take-b').accepted,true);
});
test('a wrong pair move names a real lost solution',()=> {
  const state=createLab('pair');const wrong=moveLab(state,'right');
  assert.doesNotMatch(wrong.state.message,/lose the valid pair/); // No valid pair uses 15 in this case.
  assert.match(wrong.state.message,/no elimination proof/);
  const witness={...state,a:[1,3,8],right:2,target:11};
  assert.match(moveLab(witness,'right').state.message,/8 \+ 3 = 11/);
});

test('generated review answers match independent small-input oracles',()=> {
  for(const id of conceptIds)for(let variant=0;variant<21;variant++) {
    const c=challengeFor(id,variant);
    const arrays=[...c.prompt.matchAll(/\[([^\]]*)\]/g)].map(m=>m[1].split(',').map(Number));
    const a=arrays[0]||[],b=arrays[1]||[];
    let expected:number|number[]|boolean;
    switch(id) {
      case 'pair': { const target=Number(c.prompt.match(/total (-?\d+)/)![1]);const found:number[][]=[];for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(a[i]+a[j]===target)found.push([a[i],a[j]]);assert.equal(found.length,1,'pair prompt must have an unambiguous answer');expected=found[0];break; }
      case 'compact': expected=[...a.filter(x=>x!==0),...a.filter(x=>x===0)];break;
      case 'merge': expected=[...a,...b].sort((x,y)=>x-y);break;
      case 'colors': expected=[...a].sort((x,y)=>x-y);break;
      case 'duplicates': { const k=Number(c.prompt.match(/at most (\d+)/)![1]);const seen=new Map<number,number>();expected=a.filter(v=>{seen.set(v,(seen.get(v)||0)+1);return seen.get(v)!<=k;});break; }
      case 'squares': expected=a.map(v=>v*v).sort((x,y)=>x-y);break;
      case 'partition': expected=a.filter(v=>v<Number(c.prompt.match(/values < (\d+)/)![1])).length;break;
      case 'intersection': expected=[...new Set(a.filter(v=>b.includes(v)))];break;
      case 'difference': { const gap=Number(c.prompt.match(/value is (\d+)/)![1]);const found:number[][]=[];for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(a[j]-a[i]===gap)found.push([a[i],a[j]]);assert.equal(found.length,1,'difference prompt must have an unambiguous answer');expected=found[0];break; }
      case 'count-pairs':case 'count-less': { const target=Number(c.prompt.match(id==='count-pairs'?/summing to (\d+)/:/LESS than (\d+)/)![1]);let count=0;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(id==='count-pairs'?a[i]+a[j]===target:a[i]+a[j]<target)count++;expected=count;break; }
      case 'triplets': { const set=new Set<string>();for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)for(let k=j+1;k<a.length;k++)if(a[i]+a[j]+a[k]===0)set.add(JSON.stringify([a[i],a[j],a[k]].sort((x,y)=>x-y)));expected=set.size;break; }
      case 'container': {let best=0;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)best=Math.max(best,Math.min(a[i],a[j])*(j-i));expected=best;break;}
      case 'rain': expected=a.reduce((sum,v,i)=>sum+Math.min(Math.max(...a.slice(0,i+1)),Math.max(...a.slice(i)))-v,0);break;
      case 'mirror': {const text=c.prompt.match(/“([^”]*)”/)![1].replace(/[^a-z0-9]/gi,'').toLowerCase();expected=text===[...text].reverse().join('');break;}
      case 'delete-one': {const text=c.prompt.match(/“([^”]*)”/)![1];const pal=(v:string)=>v===[...v].reverse().join('');expected=pal(text)||[...text].some((_,i)=>pal(text.slice(0,i)+text.slice(i+1)));break;}
      case 'subsequence': {const words=[...c.prompt.matchAll(/“([^”]*)”/g)].map(m=>m[1]);const [source,target]=words;let matched=0;for(const ch of source)if(ch===target[matched])matched++;expected=target.length-matched;break;}
      case 'unsorted': {const target=Number(c.prompt.match(/summing to (\d+)/)![1]);const found:number[][]=[];for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(a[i]+a[j]===target)found.push([i,j]);assert.equal(found.length,1);expected=found[0];break;}
    }
    assert.deepEqual(c.answer,expected,`${id} variant ${variant}`);
    assert.equal(answerMatches(c,typeof expected==='boolean'?(expected?'yes':'no'):JSON.stringify(expected)),true);
    assert.equal(answerMatches(c,'not an answer'),false);
  }
});
test('review input accepts simple equivalent formatting, but not extra values or prose',()=> {
  const c=challengeFor('pair');assert.equal(answerMatches(c,'[ 1, 3 ]'),true);assert.equal(answerMatches(c,'1 3'),true);assert.equal(answerMatches(c,'1, 3, 3'),false);assert.equal(answerMatches(c,'the answer is 1 and 3'),false);
});
test('spaced reviews extend only when due; hints reset the interval',()=> {
  const now=10*DAY;let record=gradeReview(undefined,true,now,'my reasoning');assert.equal(record.due,now+DAY);
  const early=gradeReview(record,true,now+1);assert.equal(early.level,0);assert.equal(early.due,record.due);
  record=gradeReview(early,true,early.due);assert.equal(record.level,1);assert.equal(record.due,now+4*DAY);
  record=gradeReview(record,true,record.due);assert.equal(record.level,2);
  record=gradeReview(record,true,record.due);assert.equal(record.level,3);
  const helped=gradeReview(record,false,record.last+1);assert.equal(helped.level,0);assert.equal(helped.due,record.last+1+DAY);assert.equal(helped.clean,false);
});
test('due concepts precede new ones, which precede early reviews',()=> {
  const now=10*DAY;const due=gradeReview(undefined,false,now-2*DAY),early=gradeReview(undefined,true,now);
  const queue=reviewQueue({pair:early,intersection:due},now);assert.equal(queue[0],'intersection');assert.equal(queue.at(-1),'pair');assert.equal(new Set(queue).size,conceptIds.length);
});
test('malformed or stale saved data is ignored safely',()=> {
  for(const input of ['{','null','[]','42','"hi"'])assert.deepEqual(parseBook(input),{});
  assert.deepEqual(parseBook(JSON.stringify({pair:{attempts:-1,level:99,due:'tomorrow'}})),{});
  const valid=gradeReview(undefined,true,1000,'<script>text stays text</script>');assert.deepEqual(parseBook(JSON.stringify({pair:valid,unknown:valid})),{pair:valid});
});

test('review storage round-trips notes and reports denial without throwing',async()=> {
  const {loadBook,saveBook,REVIEW_KEY}=await import('../src/lib/pointer-review.ts');
  const oldStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage'), oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
  const data=new Map<string,string>();let notifications=0;
  try {
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)}});
    Object.defineProperty(globalThis,'window',{configurable:true,value:{dispatchEvent:()=>{notifications++;}}});
    const book={pair:gradeReview(undefined,true,1000,'Outside the readers, all candidates are ruled out.')};
    assert.equal(saveBook(book),true);assert.equal(notifications,1);assert.deepEqual(loadBook(),book);assert.ok(data.has(REVIEW_KEY));
    assert.notEqual(challengeFor('pair',book.pair.attempts).prompt,challengeFor('pair',0).prompt,'the next review must change the input');
    Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('storage denied');}});
    assert.deepEqual(loadBook(),{});assert.equal(saveBook(book),false);
  } finally {
    if(oldStorage)Object.defineProperty(globalThis,'localStorage',oldStorage);else Reflect.deleteProperty(globalThis,'localStorage');
    if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');
  }
});
