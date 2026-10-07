// Hint ladders for every <HintLadder> in src/dsa-lessons/stacks.mdx.
export const hints: Record<string, [string, string, string]> = {
  parentheses: [
    'Which opener has to close first: the oldest one, or the most recent one?',
    'A stack of what each open bracket is waiting for. Push the expected closer, so a closer only needs one comparison.',
    'Opener: push its closer. Closer: if the stack is empty or the popped closer differs, return false. After the loop, return stack.isEmpty().',
  ],
  minStack: [
    'A pop has to bring back the minimum from before the last push. Where could that old minimum be kept?',
    'Two stacks of equal height: values, and mins, where each level stores the minimum at or below it.',
    'push: values.push(x); mins.push(min(x, current min)). pop: pop both. getMin: mins.peek(). Every operation is O(1).',
  ],
  rpn: [
    'An operator works on the two most recent results. Which structure hands you the most recent thing first?',
    'One stack of ints. Numbers are pushed; each operator pops its right operand first, then its left.',
    'For + − * /: right = pop(), left = pop(), push(left op right). Anything else is a number: parseInt and push. The final pop is the answer.',
  ],
  temps: [
    'Which days are still waiting for a warmer day when today arrives? Who can today answer?',
    'A stack of indexes of unanswered days. Their temperatures never increase from bottom to top. answer[] starts at zeros.',
    'For each day: while today is strictly warmer than the top, pop it and set answer[popped] = today − popped. Then push today. Leftovers keep 0.',
  ],
  circular: [
    'After one pass, the leftovers have only looked to their right. What would they see if the array wrapped around?',
    'Same waiting stack of indexes, and an answer array filled with −1. Read nums[i % n] for i from 0 to 2n − 1.',
    'While nums[i % n] > nums[top]: pop and record nums[i % n]. Push i only when i < n; the second lap only answers.',
  ],
  fleet: [
    'A car can only be held up by cars in front of it. So which car is settled first?',
    'Sort cars by position, closest to the target first. Each car’s solo arrival time is (target − position) / speed. Keep the arrival times of the fleets so far.',
    'If a car’s time is greater than the time of the fleet directly ahead, it leads a new fleet (push it). Otherwise it catches up and joins. Answer: the number of fleets.',
  ],
  histogram: [
    'Fix one bar as the shortest bar of the rectangle. How far can that rectangle stretch left and right?',
    'It stops at the nearest strictly shorter bar on each side. A stack of indexes with strictly increasing heights gives you both boundaries at the moment of the pop.',
    'Loop i from 0 to n, using height 0 at i = n. While heights[top] >= current: pop, width = empty ? i : i − peek − 1, update best. Then push i.',
  ],
  nextGreaterMap: [
    'The answers depend only on nums2. Can you compute every answer once and look them up?',
    'One waiting stack over nums2, and a map from value to its next greater value. Values are distinct, so they can be keys.',
    'While value > top: map.put(pop(), value). Push value. Then each nums1 entry is map.getOrDefault(x, −1).',
  ],
  span: [
    'Today’s span covers every earlier day that is no higher than today. Can earlier spans be reused?',
    'Stack of (price, span) pairs. When today pops a day, it inherits that day’s whole span too.',
    'span = 1; while top price <= today’s price: span += pop().span. Push (price, span) and return span.',
  ],
  asteroids: [
    'Only a left-mover arriving after a right-mover can collide. Which earlier rock does it hit first?',
    'A stack of survivors. The incoming rock fights the top while the top moves right and the incoming rock moves left.',
    'Smaller top: pop it and keep fighting. Equal: pop it and the incoming rock dies too. Bigger top: the incoming rock dies. If the incoming rock is still alive, push it.',
  ],
  removeDigits: [
    'Which single digit, if removed, makes the number smallest? Look for the first digit followed by a smaller one.',
    'Keep a stack of digits that is non-decreasing. A smaller arrival pops larger digits while removals remain.',
    'While k > 0 and top > digit: pop, k−−. Push the digit. Trim k more from the end, strip leading zeros, and return "0" if nothing is left.',
  ],
  rainStack: [
    'Water needs a wall on both sides. When a taller bar arrives, which earlier bars form a basin with it?',
    'A stack of indexes whose heights never increase from bottom to top. A popped bar is the floor; the new top is the left wall; today is the right wall.',
    'While height[i] > height[top]: floor = pop(); if the stack is empty, break; width = i − top − 1; depth = min(height[top], height[i]) − height[floor]; add width × depth. Push i.',
  ],
  subarrayMins: [
    'Instead of finding each subarray’s minimum, ask: for each element, in how many subarrays is it the minimum?',
    'The element’s reach stops at the nearest smaller element on each side. With duplicates, one side must stop at an equal element and the other must not.',
    'Same loop as the histogram: pop while arr[top] >= current. For a popped index m: left = new top or −1, contribution = arr[m] × (m − left) × (i − m). Use long and the modulus.',
  ],
};
