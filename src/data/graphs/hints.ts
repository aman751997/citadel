// Three-step hint ladders for every <HintLadder> in graphs.mdx.
export const hints: Record<string, [string, string, string]> = {
  islands: [
    'An island is a group of land squares joined up, down, left and right. What must happen to a whole group the first time you meet one of its squares?',
    'Scan the grid in reading order. On land that no flood has touched: count one island, then flood it, sinking every reachable land square to 0.',
    'The flood returns at once if it is off the grid or not on land; otherwise it sinks the square FIRST, then calls itself on the four neighbours. The count is the number of floods.',
  ],
  maxArea: [
    'Same flood as counting islands, but it has to report how many squares it claimed. Where does its unfinished work live?',
    'Use an ArrayDeque as an explicit stack. Push the first square and mark it; pop squares one at a time, adding 1 to the area for each pop.',
    'For each popped square, push every in-bounds, unmarked land neighbour and mark it in the same step. When the stack is empty, compare the area with the best so far.',
  ],
  shortestPath: [
    'Every move costs the same. Which search reaches squares in order of how far away they are?',
    'Guard: if the start (or goal) is rock, return −1. Enqueue the start, flag it, and set length = 1. Process the queue one ring at a time by reading its size first.',
    'Poll each square of the ring; if it is the goal, return length. Otherwise flag and enqueue every open, unflagged square among its 8 neighbours. After the ring, length++. An empty queue means −1.',
  ],
  rotting: [
    'The blight spreads from every rotten orange at once. What if all of them were in the first ring?',
    'Scan once: enqueue every rotten orange and count the fresh ones. Then run rings, one per minute, rotting (= flagging) each fresh neighbour and decrementing the count.',
    'Loop while fresh > 0 AND the queue is not empty; count a minute after each ring. Return the minutes if fresh reached 0, otherwise −1.',
  ],
  surrounded: [
    'Which Os are safe? Ask the border, not each O.',
    'Enqueue every O on all four edges and mark it S. Flood: any O next to an S becomes S and is enqueued.',
    'Final pass over every square: S becomes O, a remaining O becomes X, and X stays X.',
  ],
  pacific: [
    'Searching from every square towards the oceans repeats work. Which way could you walk instead?',
    'Start one flood from all Pacific shore squares (top row, left column) and one from all Atlantic shore squares (bottom row, right column), each with its own boolean grid.',
    'From a square, step to a neighbour whose height is ≥ the current height — you walk the water’s path backwards. Answer: every square marked in both grids. Use an explicit stack so big plateaus can’t overflow the call stack.',
  ],
  ladder: [
    'The words are islands and one-letter changes are ferries. The question asks for the fewest words, all moves costing the same.',
    'BFS from beginWord with a set of unvisited dictionary words; return 0 at once if endWord is not in the dictionary. Removing a word from the set is the flag.',
    'For each polled word, try every position with each other letter. If the candidate can be removed from the set: return words + 1 if it is endWord, else enqueue it. After each ring, words++.',
  ],
  clone: [
    'You must copy every node once, and a cycle will lead you back to nodes you are still copying. What do you need to remember?',
    'Keep a map from each original node to its copy. If the node is already in the map, return its copy.',
    'Otherwise create the copy and put it in the map BEFORE looping over the neighbours; then append cloneGraph(neighbour) for each neighbour, in order.',
  ],
  floodFill: [
    'One start, one region of the same colour. Which mark tells you a square is already done?',
    'The new colour is the mark: a repainted square no longer matches the old colour, so the flood never returns to it.',
    'If the old colour already equals the new one, return the image at once — otherwise the mark is invisible and the flood never ends. Else paint recursively in four directions.',
  ],
  provinces: [
    'Towns are nodes; a 1 in the matrix is an edge. What are you counting?',
    'Connected components — the island count, with a different costume. A town’s neighbours are the 1s in its row.',
    'For each unvisited town: count one province and visit it, recursing into every unvisited town j with isConnected[town][j] == 1. O(n²).',
  ],
  nearestZero: [
    'A search from every 1 repeats work. What if every 0 started at once?',
    'Enqueue every 0 with distance 0; give every 1 distance −1, meaning “not reached yet”.',
    'Poll a square; for each neighbour still at −1, set its distance to this square’s distance + 1 and enqueue it. Setting the distance is the flag.',
  ],
  bridge: [
    'The bridge can start from any square of the first island. How do you measure distance from a whole island?',
    'Find one land square, then flood its whole island, marking each square (as 2) and putting every one of them in the queue: the island is ring 0.',
    'BFS outward one ring at a time, claiming water. While polling ring k, meeting a 1 (the other island) means k squares of water were filled: return k.',
  ],
  openLock: [
    'Each lock setting is a node and each single click is an edge. What are the dead ends in this graph?',
    'BFS from "0000" over strings. Put the dead ends into the visited set up front; if "0000" is dead, return −1.',
    'For each polled setting, try each of 4 wheels turned +1 and −1 (+9 mod 10). Enqueue any setting the set accepts as new. Return the ring number when the target is polled.',
  ],
  bipartite: [
    'Two colours, and every edge must join different colours. How would rings help?',
    'BFS from an uncoloured node, giving it colour 1. Each newly discovered neighbour gets the opposite colour of the node that found it — on enqueue.',
    'If a neighbour already has the SAME colour as the current node, return false. Restart from every node that is still uncoloured, because the graph may be in pieces.',
  ],
};
