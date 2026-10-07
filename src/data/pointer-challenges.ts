export const strategies = {
  ends: 'Compare or eliminate from opposite ends',
  writer: 'Read values and build a kept prefix',
  zones: 'Partition values into known and unknown zones',
  sequences: 'Walk two input sequences',
  anchor: 'Fix one value, then search for a pair',
  chase: 'Advance two readers through one sorted sequence',
  other: 'Use another tool; these pointer rules do not fit',
} as const;
export type Strategy = keyof typeof strategies;
export interface Challenge {
  id: string; topic: string; section: string; prompt: string; question: string;
  answer: number | number[] | boolean; strategy: Strategy;
  hints: [string,string,string]; rubric: [string,string,string]; explanation: string;
}
export const conceptIds = ['pair','compact','merge','mirror','colors','subsequence','rain','duplicates','triplets','delete-one','count-pairs','intersection','container','difference','squares','count-less','partition','unsorted'] as const;
export type ConceptId = typeof conceptIds[number];
const arr = (a: number[]) => `[${a.join(', ')}]`;
export function challengeFor(id: ConceptId, variant = 0): Challenge {
  const k = variant % 7 + 2;
  const common = { id, question: 'Enter only the result.', strategy: 'ends' as Strategy };
  switch(id) {
    case 'mirror': {
      const text = ['A,ba','0P','.,','No lemon, no melon'][variant%4];
      const clean=text.replace(/[^a-z0-9]/gi,'').toLowerCase();
      return {...common,topic:'Symmetry with skipping',section:'mirror-check',prompt:`Ignore punctuation and case in “${text}”. Does it read the same in both directions? Use constant extra space.`,question:'Enter yes or no.',answer:clean===[...clean].reverse().join(''),hints:['What must the two meaningful ends do?','Skip non-alphanumeric characters before comparing.','A mismatch is final; if the pointers meet, every required pair matched.'],rubric:['Both readers start at opposite ends.','Outside the readers, all meaningful pairs have matched.','Skip with bounds checks; stop when the readers meet or cross.'],explanation:'Punctuation does not create a mismatch; letters and digits do. The scan takes O(n) time and O(1) extra space.'};
    }
    case 'pair': {
      const a=[-k,1,k+1,2*k+3],target=k+2;
      return {...common,topic:'Sorted pair search',section:'find-a-pair',prompt:`Sorted input ${arr(a)}. Find two values at different positions that total ${target}. Use O(n) time and O(1) extra space.`,question:'Enter the two values in ascending order.',answer:[1,k+1],hints:['Sorted order can eliminate many pairs at once.','Use the smallest and largest remaining values.','Too small rules out the left value; too big rules out the right.'],rubric:['left and right are different positions.','A discarded number cannot work with any remaining partner.','Stop at a match or when left >= right; duplicates are allowed at distinct positions.'],explanation:`1 + ${k+1} = ${target}. Moving by the sum is justified by sorted order, not by whether values are positive.`};
    }
    case 'triplets': {
      const a=[-k,-k,0,k,2*k];
      return {...common,topic:'Fix one, search two',section:'build-a-triplet',strategy:'anchor',prompt:`For ${arr(a)}, how many unique VALUE triplets total zero? Repeated values at different positions may be used. Aim for O(n²) time.`,question:'Enter the number of unique triplets.',answer:2,hints:['Freeze the first member of a triplet.','Search its suffix for a pair with the opposite sum.','Two results exist: one repeats the negative value; one uses zero.'],rubric:['Sort, fix one position, and search only to its right.','Skip repeated answers, not all repeated input values.','Each anchor has a linear scan, giving O(n²) total time.'],explanation:`The triplets are [${-k}, ${-k}, ${2*k}] and [${-k}, 0, ${k}].`};
    }
    case 'container': {
      const a=[2,k+5,1,k+4]; const answer=Math.max(6,2*(k+4));
      return {...common,topic:'Move the limiting side',section:'biggest-container',prompt:`Vertical lines at unit-spaced positions have heights ${arr(a)}. Choose two lines to hold the largest area of water. Positions cannot change.`,question:'Enter the maximum area.',answer,hints:['The shorter line limits the usable height.','Multiply the shorter height by the distance, not the number of bars.','Moving the taller line cannot help while the shorter one stays.'],rubric:['Measure the current pair before moving.','Pairs keeping the shorter side and reducing width cannot improve that area.','Move the shorter side; stop when the endpoints meet.'],explanation:`Heights ${k+5} and ${k+4} are distance 2 apart, giving ${answer}. Sorting would destroy the widths.`};
    }
    case 'rain': {
      const a=[k+2,1,0,k,k+3];
      return {...common,topic:'Settle water by known walls',section:'catch-the-rain',prompt:`Rain falls on bars of width 1 with heights ${arr(a)}. How much water remains above the bars? Use O(1) working space.`,question:'Enter the total water.',answer:2*k+5,hints:['This adds water above each bar, not the area of one chosen pair.','Track the largest wall seen from each end.','The left wall is lower here. Subtract each inside bar from that wall height.'],rubric:['Track leftMax and rightMax.','The lower known wall has enough support from the other side to settle its next position.','Update the maximum before adding water; each position is processed once.'],explanation:`The inside contributions are ${k+1}, ${k+2}, and 2: total ${2*k+5}.`};
    }
    case 'compact': {
      const a=variant%2?[k,0,0,k+1,0]:[0,k,0,k+1,k+2]; const answer=[...a.filter(x=>x!==0),...a.filter(x=>x===0)];
      return {...common,topic:'Stable compaction',section:'keep-the-good-stuff',strategy:'writer',prompt:`Move zeroes to the end of ${arr(a)} in place. Keep the original order of nonzero values. Use one linear pass.`,question:'Enter the whole final array.',answer,hints:['Separate inspecting a value from keeping it.','read visits everything; write counts nonzero values already kept.','Swap each nonzero into write, then advance write. Always advance read.'],rubric:['The prefix before write is the finished nonzero sequence.','write advances for every kept value, including a self-swap.','Stop when read reaches the array length.'],explanation:`The result is ${arr(answer)}. Merely partitioning with arbitrary swaps could change the nonzero order.`};
    }
    case 'duplicates': {
      const limit=variant%2+2,a=[k,k,k,k,k+1,k+1,k+2];const answer=a.filter((v,i)=>i<limit||v!==a[i-limit]);
      return {...common,topic:'A configurable copy limit',section:'control-duplicates',strategy:'writer',prompt:`Sorted input ${arr(a)}. Keep at most ${limit} copies of each value, in place. Only the returned prefix matters.`,question:'Enter the kept prefix.',answer,hints:['Compare with the kept prefix, not just the previous input cell.',`write is the next kept slot. The first ${limit} kept values are safe.`,`After that, keep only when value != nums[write − ${limit}].`],rubric:['Sorted order groups equal values together.',`A match ${limit} kept slots back proves the allowed copies already exist.`,'Advance write only when keeping; return write as the logical length.'],explanation:`The kept prefix is ${arr(answer)}. The rest of the physical array is irrelevant.`};
    }
    case 'colors': {
      const a=variant%2?[2,0,2,1,0]:[1,2,0];
      return {...common,topic:'Three-way partitioning',section:'sort-three-colors',strategy:'zones',prompt:`Reorder ${arr(a)} into 0s, then 1s, then 2s in one pass with constant extra space.`,question:'Enter the final array.',answer:[...a].sort(),hints:['Keep a region of unexamined values.','low starts the 1-region, mid inspects, high ends the unknown region.','Swapping a 2 to high does not inspect the incoming value. Keep mid still.'],rubric:['The four regions are known 0s, known 1s, unknown values, and known 2s.','After a high-swap only high moves; after a low-swap low and mid advance.','The loop ends when mid > high, including inspection of the last unknown cell.'],explanation:'Sorting the final values is the easy part. The explanation check tests why each pointer move is safe.'};
    }
    case 'merge': {
      const a=[-k,1,k+2],b=[0,k,k+3];
      return {...common,topic:'Backwards merging',section:'merge-safely',strategy:'sequences',prompt:`nums1 has real values ${arr(a)} plus three spare slots. nums2 is ${arr(b)}. Merge into nums1 without an extra array.`,question:'Enter the final nums1.',answer:[...a,...b].sort((x,y)=>x-y),hints:['Where can you write without overwriting unread data?','Use a reader at the end of each input and a writer at the end of nums1.','Place the larger unread value. Stop when nums2 has no values left.'],rubric:['The suffix after write is already final.','Backwards writing protects unread nums1 values.','If nums1 empties, copy nums2 leftovers; if nums2 empties, stop.'],explanation:'Forward writing into nums1 can destroy unread data. The spare suffix makes backwards merging safe.'};
    }
    case 'subsequence': {
      const examples=[['axby','abc'],['ab','ba'],['aaaa','aa'],['xyz','abc']]; const [source,target]=examples[variant%examples.length];let needed=0;for(const ch of source)if(ch===target[needed])needed++;
      return {...common,topic:'Subsequence matching',section:'match-in-order',strategy:'sequences',prompt:`Source “${source}”, target “${target}”. Append as few characters as possible to the source so the target appears in order, with gaps allowed.`,question:'How many characters must you append?',answer:target.length-needed,hints:['A gap is allowed; reordering is not.','One reader scans source; another waits for the next needed target character.','Only advance the target reader on a match. Append its unmatched suffix.'],rubric:['The target prefix already matched in order.','Taking an earlier match leaves at least as much room for later matches.','Stop at source exhaustion or a complete target; count the unmatched target suffix.'],explanation:`Matched ${needed} target characters; append ${target.length-needed}.`};
    }
    case 'squares': {
      const a=[-k-3,-1,0,k];
      return {...common,topic:'Opposite ends with backwards output',section:'square-the-array',prompt:`Sorted input ${arr(a)}. Return its squares in sorted order in O(n) time. An output array is allowed.`,question:'Enter the output array.',answer:a.map(v=>v*v).sort((x,y)=>x-y),hints:['The biggest absolute value is at one of the ends.','Compare both end squares and fill the last free output slot.','Move the chosen end. Process the final single input value too.'],rubric:['The output suffix contains the largest processed squares in order.','An end always has the largest remaining absolute value.','Consume all input cells; the output costs O(n) space.'],explanation:'The largest original number may not have the largest square. Compare magnitudes, then write backwards.'};
    }
    case 'delete-one': {
      const text=['abca','abc','deeee','cbbcc'][variant%4]; const pal=(v:string)=>v===[...v].reverse().join(''); const answer=pal(text)||[...text].some((_,i)=>pal(text.slice(0,i)+text.slice(i+1)));
      return {...common,topic:'One deletion at a mismatch',section:'one-deletion',prompt:`For “${text}”, may you remove AT MOST one character to make a palindrome? All characters count. Aim for O(n) time.`,question:'Enter yes or no.',answer,hints:['Match inward until the first mismatch.','That mismatch can only be repaired by removing one of its two endpoints.','Check BOTH remaining ranges: skip left OR skip right. Neither check has another deletion.'],rubric:['Before the first mismatch all outside pairs match.','Any single deletion that fixes that mismatch must remove one of its endpoints.','The two remaining checks are ordinary palindrome scans, still O(n) total.'],explanation:answer?'At least one of the two endpoint-removal branches works (or it was already a palindrome).':'Neither endpoint-removal branch leaves a palindrome. A second deletion is not allowed.'};
    }
    case 'count-pairs': {
      const a=variant%2?[k,k,k,k]:[1,1,k,k],target=variant%2?2*k:k+1;
      return {...common,topic:'Count index pairs with duplicates',section:'count-pairs',prompt:`Sorted input ${arr(a)}. Count every pair of DISTINCT POSITIONS i < j summing to ${target}. Equal value pairs at different positions count separately.`,question:'Enter the number of pairs.',answer:variant%2?6:4,hints:['Finding one pair and counting all index pairs are different tasks.','On an unequal-value match, count copies on both ends and multiply.','If every remaining value is equal, m positions give m × (m − 1) / 2 pairs.'],rubric:['Move ends by sum until a match.','Different endpoint values contribute leftCount × rightCount.','Equal endpoint values mean the whole sorted remainder is one value; choose any two positions.'],explanation:variant%2?'Four identical values give 4 × 3 / 2 = 6 index pairs.':'Two copies at each end give 2 × 2 = 4 index pairs, but only one unique value pair.'};
    }
    case 'count-less': {
      const a=[1,2,k+2,k+5],target=k+5-(variant%2);let answer=0;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(a[i]+a[j]<target)answer++;
      return {...common,topic:'Count an entire range of pairs',section:'count-less',prompt:`Sorted input ${arr(a)}. Count position pairs i < j whose sum is STRICTLY LESS than ${target}, using O(n) time.`,question:'Enter the number of pairs.',answer,hints:['A valid pair at the largest remaining partner may prove several smaller partners valid too.','If a[left] + a[right] < target, every partner from left+1 through right works with left.','Add right − left, then advance left. Otherwise decrease right.'],rubric:['The comparison is strict: equality does not count.','A valid largest partner proves every smaller partner in range is valid for this left value.','Count each left value once, then retire it.'],explanation:`There are ${answer} qualifying pairs. Adding an entire range avoids enumerating each one.`};
    }
    case 'partition': {
      const a=[k+2,1,k,0,k+4];
      return {...common,topic:'Two-way partitioning',section:'two-way-partition',strategy:'zones',prompt:`Rearrange ${arr(a)} so all values < ${k+1} are before all other values. Relative order is unimportant. Use swaps and O(1) space.`,question:'At which zero-based index does the second group begin?',answer:3,hints:['You need a boundary between two categories, not sorted order within them.','Scan with read. write marks the first slot outside the known-small prefix.','When a value is small, swap it into write and advance write.'],rubric:['Everything before write satisfies the predicate.','The scanned region from write to read contains values that do not.','Every value is inspected once; this swapping form need not preserve both groups’ order.'],explanation:`The small values are 1, ${k}, and 0. The second group starts at index 3; several final orders are valid.`};
    }
    case 'difference': {
      const a=[1,k+1,3*k+2,5*k+4],gap=k;
      return {...common,topic:'Two readers moving forward',section:'target-difference',strategy:'chase',prompt:`Sorted input ${arr(a)}. Find two distinct positions whose larger value minus smaller value is ${gap}. Use O(n) time, O(1) space.`,question:'Enter the two values, smaller first.',answer:[1,k+1],hints:['A sum and a difference respond differently to pointer movement.','Start a small-value reader and a larger-value reader to its right.','If the difference is too small, advance the larger reader; if too large, advance the smaller. Keep positions distinct.'],rubric:['Both readers move forward through sorted input.','For a fixed smaller value, a too-small larger value can never help later larger small-values either.','Never reuse one position; stop when the larger reader leaves the array.'],explanation:`${k+1} − 1 = ${gap}. Applying the opposite-end SUM movement rule would not be justified here.`};
    }
    case 'intersection': {
      const a=[1,1,k+2,k+4],b=[1,k+1,k+2,k+2];
      return {...common,topic:'Merge-style intersection',section:'intersection',strategy:'sequences',prompt:`Two sorted inputs: ${arr(a)} and ${arr(b)}. Return values present in BOTH, with each output value appearing only once. Use a linear scan.`,question:'Enter the unique intersection in ascending order.',answer:[1,k+2],hints:['If the current values differ, which one is too small to match anything ahead in the other list?','Advance the smaller reader. On equality, emit once and advance both.','Suppress repeats in the output, or skip entire equal-value runs.'],rubric:['Output contains only values seen in both inputs.','A smaller value cannot match the other list’s current or later larger values.','Stop when either input ends; leftovers cannot create matches.'],explanation:`The unique intersection is [1, ${k+2}]. For a multiset intersection, duplicates would require different output rules.`};
    }
    case 'unsorted': {
      const a=[k+4,1,k+1,2];
      return {...common,topic:'Know when to choose another tool',section:'choose-the-tool',strategy:'other',prompt:`Input ${arr(a)} is unsorted and must remain unchanged. Return original zero-based positions of two values summing to ${k+2}. Expected O(n) time; O(n) extra space is allowed.`,question:'Enter the two positions in ascending order.',answer:[1,2],hints:['The endpoints are not necessarily the smallest and largest.', 'A seen-value lookup can remember original positions without changing input.',`For each value x, look for ${k+2} − x before storing x.`],rubric:['A hash map gives expected O(1) lookup per value.','Look up before inserting so a position cannot pair with itself.','Unsorted endpoint elimination has no sorted-order proof.'],explanation:`Positions 1 and 2 hold 1 and ${k+1}. A hash map fits these constraints; the sorted two-pointer recipe does not.`};
    }
  }
}
export function answerMatches(challenge: Challenge, input: string): boolean {
  const text=input.trim().replace(/−/g,'-');
  if(typeof challenge.answer==='boolean') return (challenge.answer?['yes','true']:['no','false']).includes(text.toLowerCase());
  if(typeof challenge.answer==='number') return /^-?\d+$/.test(text)&&Number(text)===challenge.answer;
  let cleaned=text;
  if(cleaned.startsWith('[')&&cleaned.endsWith(']')) cleaned=cleaned.slice(1,-1).trim();
  const pieces=cleaned===''?[]:cleaned.split(/[,\s]+/);
  const expected=challenge.answer;
  return pieces.length===expected.length&&pieces.every((value,i)=>/^-?\d+$/.test(value)&&Number(value)===expected[i]);
}
