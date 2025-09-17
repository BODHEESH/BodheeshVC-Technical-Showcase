/**
 * Data Structures Implementation
 * Comprehensive collection of fundamental data structures
 */

// 1. Array Operations and Algorithms
class ArrayOperations {
    /**
     * Two Sum Problem - Find two numbers that add up to target
     * Time: O(n), Space: O(n)
     */
    static twoSum(nums, target) {
        const map = new Map();
        for (let i = 0; i < nums.length; i++) {
            const complement = target - nums[i];
            if (map.has(complement)) {
                return [map.get(complement), i];
            }
            map.set(nums[i], i);
        }
        return [];
    }

    /**
     * Maximum Subarray Sum (Kadane's Algorithm)
     * Time: O(n), Space: O(1)
     */
    static maxSubarraySum(nums) {
        let maxSum = nums[0];
        let currentSum = nums[0];
        
        for (let i = 1; i < nums.length; i++) {
            currentSum = Math.max(nums[i], currentSum + nums[i]);
            maxSum = Math.max(maxSum, currentSum);
        }
        
        return maxSum;
    }

    /**
     * Rotate Array Right by k positions
     * Time: O(n), Space: O(1)
     */
    static rotateArray(nums, k) {
        k = k % nums.length;
        this.reverse(nums, 0, nums.length - 1);
        this.reverse(nums, 0, k - 1);
        this.reverse(nums, k, nums.length - 1);
        return nums;
    }

    static reverse(nums, start, end) {
        while (start < end) {
            [nums[start], nums[end]] = [nums[end], nums[start]];
            start++;
            end--;
        }
    }
}

// 2. Linked List Implementation
class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

class LinkedList {
    constructor() {
        this.head = null;
        this.size = 0;
    }

    /**
     * Add element to the beginning
     * Time: O(1), Space: O(1)
     */
    prepend(val) {
        const newNode = new ListNode(val, this.head);
        this.head = newNode;
        this.size++;
    }

    /**
     * Add element to the end
     * Time: O(n), Space: O(1)
     */
    append(val) {
        const newNode = new ListNode(val);
        if (!this.head) {
            this.head = newNode;
        } else {
            let current = this.head;
            while (current.next) {
                current = current.next;
            }
            current.next = newNode;
        }
        this.size++;
    }

    /**
     * Remove element by value
     * Time: O(n), Space: O(1)
     */
    remove(val) {
        if (!this.head) return false;

        if (this.head.val === val) {
            this.head = this.head.next;
            this.size--;
            return true;
        }

        let current = this.head;
        while (current.next && current.next.val !== val) {
            current = current.next;
        }

        if (current.next) {
            current.next = current.next.next;
            this.size--;
            return true;
        }
        return false;
    }

    /**
     * Reverse the linked list
     * Time: O(n), Space: O(1)
     */
    reverse() {
        let prev = null;
        let current = this.head;
        
        while (current) {
            const next = current.next;
            current.next = prev;
            prev = current;
            current = next;
        }
        
        this.head = prev;
        return this;
    }

    /**
     * Detect cycle in linked list (Floyd's Algorithm)
     * Time: O(n), Space: O(1)
     */
    hasCycle() {
        if (!this.head || !this.head.next) return false;
        
        let slow = this.head;
        let fast = this.head.next;
        
        while (fast && fast.next) {
            if (slow === fast) return true;
            slow = slow.next;
            fast = fast.next.next;
        }
        
        return false;
    }

    toArray() {
        const result = [];
        let current = this.head;
        while (current) {
            result.push(current.val);
            current = current.next;
        }
        return result;
    }
}

// 3. Stack Implementation
class Stack {
    constructor() {
        this.items = [];
    }

    /**
     * Push element to top
     * Time: O(1), Space: O(1)
     */
    push(element) {
        this.items.push(element);
    }

    /**
     * Pop element from top
     * Time: O(1), Space: O(1)
     */
    pop() {
        if (this.isEmpty()) return null;
        return this.items.pop();
    }

    /**
     * Peek at top element
     * Time: O(1), Space: O(1)
     */
    peek() {
        if (this.isEmpty()) return null;
        return this.items[this.items.length - 1];
    }

    isEmpty() {
        return this.items.length === 0;
    }

    size() {
        return this.items.length;
    }

    /**
     * Valid Parentheses Problem
     * Time: O(n), Space: O(n)
     */
    static isValidParentheses(s) {
        const stack = new Stack();
        const mapping = { ')': '(', '}': '{', ']': '[' };
        
        for (let char of s) {
            if (char in mapping) {
                if (stack.isEmpty() || stack.pop() !== mapping[char]) {
                    return false;
                }
            } else {
                stack.push(char);
            }
        }
        
        return stack.isEmpty();
    }
}

// 4. Queue Implementation
class Queue {
    constructor() {
        this.items = [];
    }

    /**
     * Add element to rear
     * Time: O(1), Space: O(1)
     */
    enqueue(element) {
        this.items.push(element);
    }

    /**
     * Remove element from front
     * Time: O(n), Space: O(1) - due to array shift
     */
    dequeue() {
        if (this.isEmpty()) return null;
        return this.items.shift();
    }

    /**
     * Peek at front element
     * Time: O(1), Space: O(1)
     */
    front() {
        if (this.isEmpty()) return null;
        return this.items[0];
    }

    isEmpty() {
        return this.items.length === 0;
    }

    size() {
        return this.items.length;
    }
}

// 5. Binary Tree Implementation
class TreeNode {
    constructor(val = 0, left = null, right = null) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

class BinaryTree {
    constructor() {
        this.root = null;
    }

    /**
     * Insert value in BST
     * Time: O(log n) average, O(n) worst, Space: O(log n)
     */
    insert(val) {
        this.root = this._insertRecursive(this.root, val);
    }

    _insertRecursive(node, val) {
        if (!node) return new TreeNode(val);
        
        if (val < node.val) {
            node.left = this._insertRecursive(node.left, val);
        } else if (val > node.val) {
            node.right = this._insertRecursive(node.right, val);
        }
        
        return node;
    }

    /**
     * Search value in BST
     * Time: O(log n) average, O(n) worst, Space: O(log n)
     */
    search(val) {
        return this._searchRecursive(this.root, val);
    }

    _searchRecursive(node, val) {
        if (!node || node.val === val) return node;
        
        if (val < node.val) {
            return this._searchRecursive(node.left, val);
        }
        return this._searchRecursive(node.right, val);
    }

    /**
     * Inorder Traversal (Left, Root, Right)
     * Time: O(n), Space: O(n)
     */
    inorderTraversal() {
        const result = [];
        this._inorderRecursive(this.root, result);
        return result;
    }

    _inorderRecursive(node, result) {
        if (node) {
            this._inorderRecursive(node.left, result);
            result.push(node.val);
            this._inorderRecursive(node.right, result);
        }
    }

    /**
     * Level Order Traversal (BFS)
     * Time: O(n), Space: O(n)
     */
    levelOrder() {
        if (!this.root) return [];
        
        const result = [];
        const queue = [this.root];
        
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
     * Maximum depth of binary tree
     * Time: O(n), Space: O(n)
     */
    maxDepth() {
        return this._maxDepthRecursive(this.root);
    }

    _maxDepthRecursive(node) {
        if (!node) return 0;
        
        const leftDepth = this._maxDepthRecursive(node.left);
        const rightDepth = this._maxDepthRecursive(node.right);
        
        return Math.max(leftDepth, rightDepth) + 1;
    }
}

// 6. Hash Table Implementation
class HashTable {
    constructor(size = 53) {
        this.keyMap = new Array(size);
    }

    /**
     * Hash function
     * Time: O(1), Space: O(1)
     */
    _hash(key) {
        let total = 0;
        let WEIRD_PRIME = 31;
        for (let i = 0; i < Math.min(key.length, 100); i++) {
            let char = key[i];
            let value = char.charCodeAt(0) - 96;
            total = (total * WEIRD_PRIME + value) % this.keyMap.length;
        }
        return total;
    }

    /**
     * Set key-value pair
     * Time: O(1) average, Space: O(1)
     */
    set(key, value) {
        let index = this._hash(key);
        if (!this.keyMap[index]) {
            this.keyMap[index] = [];
        }
        
        // Check if key already exists
        for (let i = 0; i < this.keyMap[index].length; i++) {
            if (this.keyMap[index][i][0] === key) {
                this.keyMap[index][i][1] = value;
                return;
            }
        }
        
        this.keyMap[index].push([key, value]);
    }

    /**
     * Get value by key
     * Time: O(1) average, Space: O(1)
     */
    get(key) {
        let index = this._hash(key);
        if (this.keyMap[index]) {
            for (let i = 0; i < this.keyMap[index].length; i++) {
                if (this.keyMap[index][i][0] === key) {
                    return this.keyMap[index][i][1];
                }
            }
        }
        return undefined;
    }

    /**
     * Get all keys
     * Time: O(n), Space: O(n)
     */
    keys() {
        let keysArr = [];
        for (let i = 0; i < this.keyMap.length; i++) {
            if (this.keyMap[i]) {
                for (let j = 0; j < this.keyMap[i].length; j++) {
                    keysArr.push(this.keyMap[i][j][0]);
                }
            }
        }
        return keysArr;
    }
}

// Example usage and tests
console.log("=== Data Structures Examples ===");

// Array Operations
console.log("\n1. Array Operations:");
console.log("Two Sum [2,7,11,15], target 9:", ArrayOperations.twoSum([2,7,11,15], 9));
console.log("Max Subarray [-2,1,-3,4,-1,2,1,-5,4]:", ArrayOperations.maxSubarraySum([-2,1,-3,4,-1,2,1,-5,4]));

// Linked List
console.log("\n2. Linked List:");
const ll = new LinkedList();
ll.append(1);
ll.append(2);
ll.append(3);
console.log("Original:", ll.toArray());
ll.reverse();
console.log("Reversed:", ll.toArray());

// Stack
console.log("\n3. Stack:");
console.log("Valid parentheses '()[]{}': ", Stack.isValidParentheses("()[]{}"));
console.log("Valid parentheses '([)]': ", Stack.isValidParentheses("([)]"));

// Binary Tree
console.log("\n4. Binary Tree:");
const bt = new BinaryTree();
[5, 3, 7, 2, 4, 6, 8].forEach(val => bt.insert(val));
console.log("Inorder traversal:", bt.inorderTraversal());
console.log("Level order traversal:", bt.levelOrder());
console.log("Max depth:", bt.maxDepth());

// Hash Table
console.log("\n5. Hash Table:");
const ht = new HashTable();
ht.set("name", "John");
ht.set("age", 25);
ht.set("city", "New York");
console.log("Get name:", ht.get("name"));
console.log("All keys:", ht.keys());

export { ArrayOperations, LinkedList, Stack, Queue, BinaryTree, HashTable };
