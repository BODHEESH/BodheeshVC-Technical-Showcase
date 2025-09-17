/**
 * Algorithms Implementation
 * Comprehensive collection of fundamental algorithms
 */

// 1. Sorting Algorithms
class SortingAlgorithms {
    /**
     * Quick Sort - Divide and Conquer
     * Time: O(n log n) average, O(n²) worst, Space: O(log n)
     */
    static quickSort(arr, low = 0, high = arr.length - 1) {
        if (low < high) {
            const pi = this.partition(arr, low, high);
            this.quickSort(arr, low, pi - 1);
            this.quickSort(arr, pi + 1, high);
        }
        return arr;
    }

    static partition(arr, low, high) {
        const pivot = arr[high];
        let i = low - 1;

        for (let j = low; j < high; j++) {
            if (arr[j] < pivot) {
                i++;
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
        }
        [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
        return i + 1;
    }

    /**
     * Merge Sort - Divide and Conquer
     * Time: O(n log n), Space: O(n)
     */
    static mergeSort(arr) {
        if (arr.length <= 1) return arr;

        const mid = Math.floor(arr.length / 2);
        const left = this.mergeSort(arr.slice(0, mid));
        const right = this.mergeSort(arr.slice(mid));

        return this.merge(left, right);
    }

    static merge(left, right) {
        const result = [];
        let i = 0, j = 0;

        while (i < left.length && j < right.length) {
            if (left[i] <= right[j]) {
                result.push(left[i]);
                i++;
            } else {
                result.push(right[j]);
                j++;
            }
        }

        return result.concat(left.slice(i)).concat(right.slice(j));
    }

    /**
     * Heap Sort
     * Time: O(n log n), Space: O(1)
     */
    static heapSort(arr) {
        const n = arr.length;

        // Build max heap
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            this.heapify(arr, n, i);
        }

        // Extract elements from heap one by one
        for (let i = n - 1; i > 0; i--) {
            [arr[0], arr[i]] = [arr[i], arr[0]];
            this.heapify(arr, i, 0);
        }

        return arr;
    }

    static heapify(arr, n, i) {
        let largest = i;
        const left = 2 * i + 1;
        const right = 2 * i + 2;

        if (left < n && arr[left] > arr[largest]) {
            largest = left;
        }

        if (right < n && arr[right] > arr[largest]) {
            largest = right;
        }

        if (largest !== i) {
            [arr[i], arr[largest]] = [arr[largest], arr[i]];
            this.heapify(arr, n, largest);
        }
    }
}

// 2. Searching Algorithms
class SearchingAlgorithms {
    /**
     * Binary Search - Divide and Conquer
     * Time: O(log n), Space: O(1)
     */
    static binarySearch(arr, target) {
        let left = 0;
        let right = arr.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);

            if (arr[mid] === target) {
                return mid;
            } else if (arr[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return -1;
    }

    /**
     * Binary Search (Recursive)
     * Time: O(log n), Space: O(log n)
     */
    static binarySearchRecursive(arr, target, left = 0, right = arr.length - 1) {
        if (left > right) return -1;

        const mid = Math.floor((left + right) / 2);

        if (arr[mid] === target) {
            return mid;
        } else if (arr[mid] < target) {
            return this.binarySearchRecursive(arr, target, mid + 1, right);
        } else {
            return this.binarySearchRecursive(arr, target, left, mid - 1);
        }
    }

    /**
     * Find First and Last Position of Element
     * Time: O(log n), Space: O(1)
     */
    static searchRange(nums, target) {
        const findFirst = (nums, target) => {
            let left = 0, right = nums.length - 1;
            let result = -1;

            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                if (nums[mid] === target) {
                    result = mid;
                    right = mid - 1;
                } else if (nums[mid] < target) {
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            }
            return result;
        };

        const findLast = (nums, target) => {
            let left = 0, right = nums.length - 1;
            let result = -1;

            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                if (nums[mid] === target) {
                    result = mid;
                    left = mid + 1;
                } else if (nums[mid] < target) {
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            }
            return result;
        };

        return [findFirst(nums, target), findLast(nums, target)];
    }
}

// 3. Graph Algorithms
class Graph {
    constructor() {
        this.adjacencyList = {};
    }

    addVertex(vertex) {
        if (!this.adjacencyList[vertex]) {
            this.adjacencyList[vertex] = [];
        }
    }

    addEdge(v1, v2) {
        this.adjacencyList[v1].push(v2);
        this.adjacencyList[v2].push(v1);
    }

    /**
     * Depth First Search (DFS)
     * Time: O(V + E), Space: O(V)
     */
    dfsRecursive(start) {
        const result = [];
        const visited = {};
        const adjacencyList = this.adjacencyList;

        function dfs(vertex) {
            if (!vertex) return null;
            visited[vertex] = true;
            result.push(vertex);
            adjacencyList[vertex].forEach(neighbor => {
                if (!visited[neighbor]) {
                    return dfs(neighbor);
                }
            });
        }

        dfs(start);
        return result;
    }

    /**
     * Depth First Search (Iterative)
     * Time: O(V + E), Space: O(V)
     */
    dfsIterative(start) {
        const stack = [start];
        const result = [];
        const visited = {};
        let currentVertex;

        visited[start] = true;
        while (stack.length) {
            currentVertex = stack.pop();
            result.push(currentVertex);

            this.adjacencyList[currentVertex].forEach(neighbor => {
                if (!visited[neighbor]) {
                    visited[neighbor] = true;
                    stack.push(neighbor);
                }
            });
        }
        return result;
    }

    /**
     * Breadth First Search (BFS)
     * Time: O(V + E), Space: O(V)
     */
    bfs(start) {
        const queue = [start];
        const result = [];
        const visited = {};
        let currentVertex;

        visited[start] = true;

        while (queue.length) {
            currentVertex = queue.shift();
            result.push(currentVertex);

            this.adjacencyList[currentVertex].forEach(neighbor => {
                if (!visited[neighbor]) {
                    visited[neighbor] = true;
                    queue.push(neighbor);
                }
            });
        }
        return result;
    }
}

// 4. Dynamic Programming
class DynamicProgramming {
    /**
     * Fibonacci with Memoization
     * Time: O(n), Space: O(n)
     */
    static fibonacciMemo(n, memo = {}) {
        if (n in memo) return memo[n];
        if (n <= 2) return 1;
        memo[n] = this.fibonacciMemo(n - 1, memo) + this.fibonacciMemo(n - 2, memo);
        return memo[n];
    }

    /**
     * Fibonacci with Tabulation
     * Time: O(n), Space: O(n)
     */
    static fibonacciTab(n) {
        if (n <= 2) return 1;
        const fibNums = [0, 1, 1];
        for (let i = 3; i <= n; i++) {
            fibNums[i] = fibNums[i - 1] + fibNums[i - 2];
        }
        return fibNums[n];
    }

    /**
     * Coin Change Problem
     * Time: O(amount * coins.length), Space: O(amount)
     */
    static coinChange(coins, amount) {
        const dp = new Array(amount + 1).fill(amount + 1);
        dp[0] = 0;

        for (let i = 1; i <= amount; i++) {
            for (let coin of coins) {
                if (coin <= i) {
                    dp[i] = Math.min(dp[i], dp[i - coin] + 1);
                }
            }
        }

        return dp[amount] > amount ? -1 : dp[amount];
    }

    /**
     * Longest Common Subsequence
     * Time: O(m * n), Space: O(m * n)
     */
    static longestCommonSubsequence(text1, text2) {
        const m = text1.length;
        const n = text2.length;
        const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (text1[i - 1] === text2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        return dp[m][n];
    }

    /**
     * 0/1 Knapsack Problem
     * Time: O(n * W), Space: O(n * W)
     */
    static knapsack(weights, values, capacity) {
        const n = weights.length;
        const dp = Array(n + 1).fill().map(() => Array(capacity + 1).fill(0));

        for (let i = 1; i <= n; i++) {
            for (let w = 1; w <= capacity; w++) {
                if (weights[i - 1] <= w) {
                    dp[i][w] = Math.max(
                        values[i - 1] + dp[i - 1][w - weights[i - 1]],
                        dp[i - 1][w]
                    );
                } else {
                    dp[i][w] = dp[i - 1][w];
                }
            }
        }

        return dp[n][capacity];
    }
}

// 5. Greedy Algorithms
class GreedyAlgorithms {
    /**
     * Activity Selection Problem
     * Time: O(n log n), Space: O(1)
     */
    static activitySelection(activities) {
        // Sort by finish time
        activities.sort((a, b) => a.finish - b.finish);
        
        const selected = [activities[0]];
        let lastFinish = activities[0].finish;

        for (let i = 1; i < activities.length; i++) {
            if (activities[i].start >= lastFinish) {
                selected.push(activities[i]);
                lastFinish = activities[i].finish;
            }
        }

        return selected;
    }

    /**
     * Fractional Knapsack
     * Time: O(n log n), Space: O(1)
     */
    static fractionalKnapsack(items, capacity) {
        // Sort by value-to-weight ratio
        items.sort((a, b) => (b.value / b.weight) - (a.value / a.weight));
        
        let totalValue = 0;
        let remainingCapacity = capacity;

        for (let item of items) {
            if (remainingCapacity >= item.weight) {
                totalValue += item.value;
                remainingCapacity -= item.weight;
            } else {
                totalValue += (item.value / item.weight) * remainingCapacity;
                break;
            }
        }

        return totalValue;
    }
}

// Example usage and tests
console.log("=== Algorithms Examples ===");

// Sorting
console.log("\n1. Sorting Algorithms:");
const unsorted = [64, 34, 25, 12, 22, 11, 90];
console.log("Original:", unsorted);
console.log("Quick Sort:", SortingAlgorithms.quickSort([...unsorted]));
console.log("Merge Sort:", SortingAlgorithms.mergeSort([...unsorted]));
console.log("Heap Sort:", SortingAlgorithms.heapSort([...unsorted]));

// Searching
console.log("\n2. Searching Algorithms:");
const sorted = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
console.log("Binary Search for 7:", SearchingAlgorithms.binarySearch(sorted, 7));
console.log("Binary Search for 20:", SearchingAlgorithms.binarySearch(sorted, 20));

// Graph
console.log("\n3. Graph Algorithms:");
const g = new Graph();
["A", "B", "C", "D", "E", "F"].forEach(v => g.addVertex(v));
g.addEdge("A", "B");
g.addEdge("A", "C");
g.addEdge("B", "D");
g.addEdge("C", "E");
g.addEdge("D", "E");
g.addEdge("D", "F");
g.addEdge("E", "F");
console.log("DFS from A:", g.dfsRecursive("A"));
console.log("BFS from A:", g.bfs("A"));

// Dynamic Programming
console.log("\n4. Dynamic Programming:");
console.log("Fibonacci(10):", DynamicProgramming.fibonacciMemo(10));
console.log("Coin Change [1,3,4], amount 6:", DynamicProgramming.coinChange([1, 3, 4], 6));
console.log("LCS 'abcde', 'ace':", DynamicProgramming.longestCommonSubsequence("abcde", "ace"));

// Greedy
console.log("\n5. Greedy Algorithms:");
const activities = [
    { start: 1, finish: 4 },
    { start: 3, finish: 5 },
    { start: 0, finish: 6 },
    { start: 5, finish: 7 },
    { start: 8, finish: 9 },
    { start: 5, finish: 9 }
];
console.log("Activity Selection:", GreedyAlgorithms.activitySelection(activities));

export { SortingAlgorithms, SearchingAlgorithms, Graph, DynamicProgramming, GreedyAlgorithms };
