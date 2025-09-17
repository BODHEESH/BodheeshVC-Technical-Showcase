/**
 * Problem Solving Patterns and Techniques
 * Common coding interview problems and algorithmic patterns
 */

// 1. Two Pointers Pattern
class TwoPointers {
    /**
     * Container With Most Water
     * Time: O(n), Space: O(1)
     */
    static maxArea(height) {
        let left = 0;
        let right = height.length - 1;
        let maxArea = 0;

        while (left < right) {
            const area = Math.min(height[left], height[right]) * (right - left);
            maxArea = Math.max(maxArea, area);

            if (height[left] < height[right]) {
                left++;
            } else {
                right--;
            }
        }

        return maxArea;
    }

    /**
     * 3Sum Problem
     * Time: O(n²), Space: O(1)
     */
    static threeSum(nums) {
        nums.sort((a, b) => a - b);
        const result = [];

        for (let i = 0; i < nums.length - 2; i++) {
            if (i > 0 && nums[i] === nums[i - 1]) continue;

            let left = i + 1;
            let right = nums.length - 1;

            while (left < right) {
                const sum = nums[i] + nums[left] + nums[right];

                if (sum === 0) {
                    result.push([nums[i], nums[left], nums[right]]);
                    
                    while (left < right && nums[left] === nums[left + 1]) left++;
                    while (left < right && nums[right] === nums[right - 1]) right--;
                    
                    left++;
                    right--;
                } else if (sum < 0) {
                    left++;
                } else {
                    right--;
                }
            }
        }

        return result;
    }

    /**
     * Remove Duplicates from Sorted Array
     * Time: O(n), Space: O(1)
     */
    static removeDuplicates(nums) {
        if (nums.length === 0) return 0;

        let slow = 0;
        for (let fast = 1; fast < nums.length; fast++) {
            if (nums[fast] !== nums[slow]) {
                slow++;
                nums[slow] = nums[fast];
            }
        }

        return slow + 1;
    }
}

// 2. Sliding Window Pattern
class SlidingWindow {
    /**
     * Longest Substring Without Repeating Characters
     * Time: O(n), Space: O(min(m,n))
     */
    static lengthOfLongestSubstring(s) {
        const charSet = new Set();
        let left = 0;
        let maxLength = 0;

        for (let right = 0; right < s.length; right++) {
            while (charSet.has(s[right])) {
                charSet.delete(s[left]);
                left++;
            }
            charSet.add(s[right]);
            maxLength = Math.max(maxLength, right - left + 1);
        }

        return maxLength;
    }

    /**
     * Minimum Window Substring
     * Time: O(|s| + |t|), Space: O(|s| + |t|)
     */
    static minWindow(s, t) {
        if (s.length === 0 || t.length === 0) return "";

        const dictT = {};
        for (let char of t) {
            dictT[char] = (dictT[char] || 0) + 1;
        }

        const required = Object.keys(dictT).length;
        let formed = 0;
        const windowCounts = {};

        let left = 0, right = 0;
        let ans = [Infinity, null, null];

        while (right < s.length) {
            const character = s[right];
            windowCounts[character] = (windowCounts[character] || 0) + 1;

            if (dictT[character] && windowCounts[character] === dictT[character]) {
                formed++;
            }

            while (left <= right && formed === required) {
                if (right - left + 1 < ans[0]) {
                    ans = [right - left + 1, left, right];
                }

                const leftChar = s[left];
                windowCounts[leftChar]--;
                if (dictT[leftChar] && windowCounts[leftChar] < dictT[leftChar]) {
                    formed--;
                }
                left++;
            }
            right++;
        }

        return ans[0] === Infinity ? "" : s.substring(ans[1], ans[2] + 1);
    }

    /**
     * Maximum Sum Subarray of Size K
     * Time: O(n), Space: O(1)
     */
    static maxSumSubarray(arr, k) {
        if (arr.length < k) return -1;

        let windowSum = 0;
        for (let i = 0; i < k; i++) {
            windowSum += arr[i];
        }

        let maxSum = windowSum;
        for (let i = k; i < arr.length; i++) {
            windowSum = windowSum - arr[i - k] + arr[i];
            maxSum = Math.max(maxSum, windowSum);
        }

        return maxSum;
    }
}

// 3. Fast & Slow Pointers (Floyd's Cycle Detection)
class FastSlowPointers {
    /**
     * Linked List Cycle Detection
     * Time: O(n), Space: O(1)
     */
    static hasCycle(head) {
        if (!head || !head.next) return false;

        let slow = head;
        let fast = head.next;

        while (fast && fast.next) {
            if (slow === fast) return true;
            slow = slow.next;
            fast = fast.next.next;
        }

        return false;
    }

    /**
     * Find Middle of Linked List
     * Time: O(n), Space: O(1)
     */
    static findMiddle(head) {
        if (!head) return null;

        let slow = head;
        let fast = head;

        while (fast && fast.next) {
            slow = slow.next;
            fast = fast.next.next;
        }

        return slow;
    }

    /**
     * Happy Number
     * Time: O(log n), Space: O(1)
     */
    static isHappy(n) {
        const getNext = (num) => {
            let totalSum = 0;
            while (num > 0) {
                const digit = num % 10;
                totalSum += digit * digit;
                num = Math.floor(num / 10);
            }
            return totalSum;
        };

        let slow = n;
        let fast = getNext(n);

        while (fast !== 1 && slow !== fast) {
            slow = getNext(slow);
            fast = getNext(getNext(fast));
        }

        return fast === 1;
    }
}

// 4. Merge Intervals Pattern
class MergeIntervals {
    /**
     * Merge Overlapping Intervals
     * Time: O(n log n), Space: O(1)
     */
    static merge(intervals) {
        if (intervals.length <= 1) return intervals;

        intervals.sort((a, b) => a[0] - b[0]);
        const merged = [intervals[0]];

        for (let i = 1; i < intervals.length; i++) {
            const current = intervals[i];
            const lastMerged = merged[merged.length - 1];

            if (current[0] <= lastMerged[1]) {
                lastMerged[1] = Math.max(lastMerged[1], current[1]);
            } else {
                merged.push(current);
            }
        }

        return merged;
    }

    /**
     * Insert Interval
     * Time: O(n), Space: O(1)
     */
    static insert(intervals, newInterval) {
        const result = [];
        let i = 0;

        // Add all intervals before newInterval
        while (i < intervals.length && intervals[i][1] < newInterval[0]) {
            result.push(intervals[i]);
            i++;
        }

        // Merge overlapping intervals
        while (i < intervals.length && intervals[i][0] <= newInterval[1]) {
            newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
            newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
            i++;
        }
        result.push(newInterval);

        // Add remaining intervals
        while (i < intervals.length) {
            result.push(intervals[i]);
            i++;
        }

        return result;
    }
}

// 5. Cyclic Sort Pattern
class CyclicSort {
    /**
     * Find Missing Number
     * Time: O(n), Space: O(1)
     */
    static findMissingNumber(nums) {
        let i = 0;
        const n = nums.length;

        while (i < n) {
            if (nums[i] < n && nums[i] !== nums[nums[i]]) {
                [nums[i], nums[nums[i]]] = [nums[nums[i]], nums[i]];
            } else {
                i++;
            }
        }

        for (let i = 0; i < n; i++) {
            if (nums[i] !== i) {
                return i;
            }
        }

        return n;
    }

    /**
     * Find All Duplicates
     * Time: O(n), Space: O(1)
     */
    static findDuplicates(nums) {
        const duplicates = [];

        for (let i = 0; i < nums.length; i++) {
            const index = Math.abs(nums[i]) - 1;
            if (nums[index] < 0) {
                duplicates.push(Math.abs(nums[i]));
            } else {
                nums[index] = -nums[index];
            }
        }

        return duplicates;
    }
}

// 6. Tree Traversal Patterns
class TreeTraversal {
    /**
     * Binary Tree Level Order Traversal
     * Time: O(n), Space: O(n)
     */
    static levelOrder(root) {
        if (!root) return [];

        const result = [];
        const queue = [root];

        while (queue.length > 0) {
            const levelSize = queue.length;
            const currentLevel = [];

            for (let i = 0; i < levelSize; i++) {
                const node = queue.shift();
                currentLevel.push(node.val);

                if (node.left) queue.push(node.left);
                if (node.right) queue.push(node.right);
            }

            result.push(currentLevel);
        }

        return result;
    }

    /**
     * Binary Tree Zigzag Level Order Traversal
     * Time: O(n), Space: O(n)
     */
    static zigzagLevelOrder(root) {
        if (!root) return [];

        const result = [];
        const queue = [root];
        let leftToRight = true;

        while (queue.length > 0) {
            const levelSize = queue.length;
            const currentLevel = [];

            for (let i = 0; i < levelSize; i++) {
                const node = queue.shift();
                
                if (leftToRight) {
                    currentLevel.push(node.val);
                } else {
                    currentLevel.unshift(node.val);
                }

                if (node.left) queue.push(node.left);
                if (node.right) queue.push(node.right);
            }

            result.push(currentLevel);
            leftToRight = !leftToRight;
        }

        return result;
    }

    /**
     * Path Sum
     * Time: O(n), Space: O(h) where h is height
     */
    static hasPathSum(root, targetSum) {
        if (!root) return false;

        if (!root.left && !root.right) {
            return root.val === targetSum;
        }

        const remainingSum = targetSum - root.val;
        return this.hasPathSum(root.left, remainingSum) || 
               this.hasPathSum(root.right, remainingSum);
    }
}

// 7. Backtracking Pattern
class Backtracking {
    /**
     * Generate Parentheses
     * Time: O(4^n / √n), Space: O(4^n / √n)
     */
    static generateParenthesis(n) {
        const result = [];

        const backtrack = (current, open, close) => {
            if (current.length === 2 * n) {
                result.push(current);
                return;
            }

            if (open < n) {
                backtrack(current + '(', open + 1, close);
            }

            if (close < open) {
                backtrack(current + ')', open, close + 1);
            }
        };

        backtrack('', 0, 0);
        return result;
    }

    /**
     * Permutations
     * Time: O(n! * n), Space: O(n! * n)
     */
    static permute(nums) {
        const result = [];

        const backtrack = (current) => {
            if (current.length === nums.length) {
                result.push([...current]);
                return;
            }

            for (let num of nums) {
                if (current.includes(num)) continue;
                current.push(num);
                backtrack(current);
                current.pop();
            }
        };

        backtrack([]);
        return result;
    }

    /**
     * Subsets
     * Time: O(2^n * n), Space: O(2^n * n)
     */
    static subsets(nums) {
        const result = [];

        const backtrack = (start, current) => {
            result.push([...current]);

            for (let i = start; i < nums.length; i++) {
                current.push(nums[i]);
                backtrack(i + 1, current);
                current.pop();
            }
        };

        backtrack(0, []);
        return result;
    }
}

// Example usage and tests
console.log("=== Problem Solving Patterns ===");

// Two Pointers
console.log("\n1. Two Pointers:");
console.log("Max Area [1,8,6,2,5,4,8,3,7]:", TwoPointers.maxArea([1,8,6,2,5,4,8,3,7]));
console.log("Three Sum [-1,0,1,2,-1,-4]:", TwoPointers.threeSum([-1,0,1,2,-1,-4]));

// Sliding Window
console.log("\n2. Sliding Window:");
console.log("Longest substring 'abcabcbb':", SlidingWindow.lengthOfLongestSubstring("abcabcbb"));
console.log("Max sum subarray [2,1,5,1,3,2], k=3:", SlidingWindow.maxSumSubarray([2,1,5,1,3,2], 3));

// Fast & Slow Pointers
console.log("\n3. Fast & Slow Pointers:");
console.log("Is Happy Number 19:", FastSlowPointers.isHappy(19));
console.log("Is Happy Number 2:", FastSlowPointers.isHappy(2));

// Merge Intervals
console.log("\n4. Merge Intervals:");
console.log("Merge [[1,3],[2,6],[8,10],[15,18]]:", 
    MergeIntervals.merge([[1,3],[2,6],[8,10],[15,18]]));

// Cyclic Sort
console.log("\n5. Cyclic Sort:");
console.log("Missing number [3,0,1]:", CyclicSort.findMissingNumber([3,0,1]));
console.log("Find duplicates [4,3,2,7,8,2,3,1]:", CyclicSort.findDuplicates([4,3,2,7,8,2,3,1]));

// Backtracking
console.log("\n6. Backtracking:");
console.log("Generate Parentheses n=3:", Backtracking.generateParenthesis(3));
console.log("Permutations [1,2,3]:", Backtracking.permute([1,2,3]));
console.log("Subsets [1,2,3]:", Backtracking.subsets([1,2,3]));

export { 
    TwoPointers, 
    SlidingWindow, 
    FastSlowPointers, 
    MergeIntervals, 
    CyclicSort, 
    TreeTraversal, 
    Backtracking 
};
