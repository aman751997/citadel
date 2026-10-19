# Quiz review dsa2 (heaps, trees-dfs, trees-bfs, graphs, advanced-graphs, backtracking)

Method: each question solved by hand first, then compared with `answer`; every `explain` read; code and number claims re-run in Python (subsets-II bug, word search no-restore, max-area late mark, flights in place, Dijkstra with a negative edge, ladder end-word bug, last stone, 10x10 BFS queue counts 100/181/184,755, build-tree with right built first). 31 quizzes, 98 questions: 92 OK, 6 FIXED, 0 REWRITTEN.

| lesson | quiz id | Q# | verdict | note |
|---|---|---|---|---|
| heaps | heaps-part-one | 1-4 | OK | children of index 1; sift-down peek 3; print [1,3,2]; int overflow wraps negative (4e9 - 2^32) |
| heaps | heaps-part-two | 1-4 | OK | max-heap loop returns 2 (evictions 3,5,6,4) |
| heaps | heaps-part-three | 1-3 | OK | `>=` bug traced by hand: low=[2,1], returns 2 |
| heaps | heaps-part-four | 1-3 | OK | AA n=1 is 3 |
| heaps | heaps-side-quests | 1-4 | OK | last stone run = 1; IPO = 4 |
| trees-dfs | trees-dfs-basics | 1-3 | OK | postorder 9 15 7 20 3 |
| trees-dfs | trees-dfs-part-one | 1-3 | OK | |
| trees-dfs | trees-dfs-part-two | 1-4 | OK | diameter example: root returns 5, diameter 6 edges (checked) |
| trees-dfs | trees-dfs-part-three | 1-4 | OK | Path Sum II stores live list: [[]] |
| trees-dfs | trees-dfs-part-four | 1-4 | OK | right-first build runs off preorder (simulated on [1,2,3] and the LeetCode example) |
| trees-dfs | trees-dfs-side-quests | 1-4 | OK | good nodes = 3,3,4,5 |
| trees-bfs | bfs-level-order | 1-3 | OK | live bound gives [[3,9],[20,15],[7]] |
| trees-bfs | bfs-zigzag | 1 | OK | |
| trees-bfs | bfs-zigzag | 2 | FIXED | explain[0] said level 1 is "processed as [2, 3]", contradicting `why` and the lesson (processed 3 then 2). Rewritten to 3 then 2. Stem now states the rule (offer right-first when the NEXT level is reversed) |
| trees-bfs | bfs-right-view | 1-3 | OK | |
| trees-bfs | bfs-side-quests | 1,3,4 | OK | |
| trees-bfs | bfs-side-quests | 2 | FIXED | explain[0] called 1 an "ancestor" of 5; 1 is 5's uncle (reached through ancestor 3). Distance-K output [5,7,4,5,5,1] re-derived |
| graphs | part-one | 1-3 | OK | |
| graphs | part-two | 1,3 | OK | |
| graphs | part-two | 2 | FIXED | stem did not say where BFS starts; 184,755 / 181 only hold from a corner (centre start gives 2,075). Added "starting at a corner"; counts re-run: 184755 / 181 |
| graphs | part-three | 1-3 | OK | |
| graphs | part-four | 1-3 | OK | ladder bug returns 5 (run) |
| graphs | side-quests | 1-3 | OK | |
| graphs | choose-the-tool | 1,2 | OK | |
| graphs | choose-the-tool | 3 | FIXED | wrong option explained as "Correct but slow"; now "Works, but slow"; right option's explain now says why |
| advanced-graphs | part-one | 1-3 | OK | |
| advanced-graphs | part-two | 1 | FIXED | explain[2] claimed "only the first edge could leave three roots"; after one edge there are already 2 roots. Reworded |
| advanced-graphs | part-two | 2-3 | OK | |
| advanced-graphs | part-three | 1-3 | OK | Dijkstra settles B at 2; in-place flights = 200 (run) |
| advanced-graphs | side-quests | 1-3 | OK | |
| advanced-graphs | choose | 1-2 | OK | |
| backtracking | part-one | 1-3 | OK | Subsets II `i>0` bug output [[],[1],[1,2],[2]] (run) |
| backtracking | part-two | 1-3 | OK | |
| backtracking | part-three | 1-2 | OK | |
| backtracking | part-four | 1,3 | OK | word search without restore returns False (run) |
| backtracking | part-four | 2 | FIXED | N-Queens stem gave no board size; column 3 only exists for n >= 4. Added "on a 4 by 4 board" |
| backtracking | side-quests | 1-3 | OK | |

Notes: no `answer` index changed. Nothing in Trace data or compiled Java blocks touched.
