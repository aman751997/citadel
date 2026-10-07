// Three-step hint ladders for every <HintLadder> in advanced-graphs.mdx.
export const hints: Record<string, [string, string, string]> = {
  canFinish: [
    'A course can be taken once nothing it waits for is still untaken. Which courses can you take on day one?',
    'Draw a track b → a for each pair [a, b]. Count, for every course, how many tracks run into it (its in-degree). Courses at 0 go on a Ready queue.',
    'Pop a course, count it as taken, and decrement each course it points to; any that reach 0 join Ready. At the end, return taken == numCourses.',
  ],
  findOrder: [
    'The order in which Kahn’s algorithm pops courses already respects every rule. You only need to keep it.',
    'Same in-degrees, same Ready queue. Write each popped course into the next slot of an int[numCourses] answer.',
    'After the loop, if fewer than numCourses courses were written, a cycle blocked the rest: return new int[0]. Otherwise return the array.',
  ],
  alienOrder: [
    'A sorted dictionary hides its rules in neighbouring words. Where exactly do two neighbours first disagree?',
    'Every letter that appears is a node. For each adjacent pair, the first differing position gives one track: letter in the first word → letter in the second. If there is no difference and the first word is longer, return "".',
    'Deduplicate tracks before counting in-degrees, run Kahn’s algorithm over the letters, and return "" if fewer letters come out than went in (a cycle).',
  ],
  countComponents: [
    'Every junction starts as its own network. What happens to the count each time a track joins two different networks?',
    'Keep parent[] (each junction points toward its clan head) and a counter starting at n. find follows parents to the root; union links one root under the other.',
    'For each track, union its ends; if the roots differed, the counter drops by one. With path compression and union by size, return the counter.',
  ],
  validTree: [
    'A tree on n junctions has exactly two properties: one piece, and no loops. How many tracks does that force?',
    'If the number of tracks is not n − 1, return false at once.',
    'Otherwise union every track; if any union finds both ends already share a root, there is a loop: return false. If none fails, return true.',
  ],
  redundant: [
    'Lay the tracks one by one in the given order. When does a track first become unnecessary?',
    'Before laying a track, ask whether its two ends already share a clan head. Junctions are numbered 1..n, so size the register n + 1.',
    'Return the first track whose union fails. Only one loop exists, so this is also the loop’s last track in input order.',
  ],
  networkDelay: [
    'The last relay to hear the signal decides the answer. Its time is its cheapest route from the source.',
    'Keep dist[], all ∞ except the source at 0, and a min-heap of (time, relay). Pop the cheapest; if it is stale (time > dist), skip it.',
    'Otherwise relax every outgoing link: if dist[u] + w < dist[v], write it and push (dist[v], v). At the end, any ∞ means −1; else return the maximum.',
  ],
  minCostPoints: [
    'Every pair of points can be joined, so you need the cheapest set of cables that connects everything: a minimum spanning tree.',
    'Grow one tree from point 0. Keep best[v] = the cheapest cable from the tree to v. Each round, pick the outside point with the smallest best.',
    'Add best[u] to the total, mark u inside, then lower best[v] for every outside v using the distance to u. n rounds of O(n) work: O(n²), no heap needed.',
  ],
  cheapestFlights: [
    'k stops means at most k + 1 flights. What if you discovered fares one flight at a time?',
    'Keep cost[], all ∞ except src at 0. Run exactly k + 1 rounds; each round tries every flight.',
    'At the start of each round copy cost into prev, and relax from prev only: if prev[from] + price < cost[to], write cost[to]. Return cost[dst], or −1 if it is still ∞.',
  ],
  safeStates: [
    'A dead end is safe. Which stations become safe once you know some of their exits are safe?',
    'Reverse every track and count each station’s exits that are not yet proven safe. Dead ends start at 0 and go on a queue.',
    'Pop a safe station; for every station leading into it, decrement its count; at 0 it is safe too. Stations never popped can reach a loop. Return the safe ones in increasing order.',
  ],
  parallelCourses: [
    'With unlimited parallel work, a course starts as soon as its slowest prerequisite finishes.',
    'Run Kahn’s algorithm. Keep start[v] = the latest finish time among v’s prerequisites seen so far.',
    'When u pops, finish = start[u] + time[u]; push that into start[v] = max(start[v], finish) for each v after u. The answer is the largest finish.',
  ],
  accountsMerge: [
    'Two records are the same person when they share an address. Sharing is transitive, so this is grouping.',
    'Give every distinct email a number and remember its owner’s name. Union every email in a record with that record’s first email.',
    'Group emails by their root, sort each group, and put the owner’s name in front.',
  ],
  calcEquation: [
    'a / b = 2 and b / c = 3 make a / c = 6 by walking a chain. Could each variable remember its ratio to a clan head?',
    'Keep parent[x] and ratio[x] = x / parent[x]. During find, multiply ratios along the path and compress, so ratio[x] becomes x / root.',
    'For a / b = v with roots ra ≠ rb, set parent[ra] = rb and ratio[ra] = v · ratio[b] / ratio[a]. Answer c / d as ratio[c] / ratio[d] when both share a root; otherwise −1.',
  ],
  minEffort: [
    'A route’s cost is its worst single step. Can that cost ever go down if the route gets longer?',
    'No, so the cheapest-first argument still works. Keep effort[r][c] and a min-heap of (effort, r, c).',
    'Pop the cheapest; skip if stale; the new cost of a step is max(current effort, |height difference|). Relax the four neighbours. The corner’s value is final when popped.',
  ],
};
