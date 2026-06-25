# Next Permutation

- **Topic:** Greedy Algorithm
- **Difficulty:** Medium
- **LeetCode Link:** [Solve on LeetCode](https://leetcode.com/problems/next-permutation/)
- **TUF+ Link:** [Solve on TUF+](https://takeuforward.org/plus/dsa/problems/next-permutation?source=strivers-sde-sheet)
- **YouTube Video:** [Watch Video Explanation](https://youtu.be/JDOXKqF60RQ)
- **Article Link:** [Full Editorial](https://takeuforward.org/data-structure/next_permutation-find-next-lexicographically-greater-permutation/)

## Problem Statement

Given an array Arr[] of integers, rearrange the numbers of the given array into the lexicographically next greater permutation of numbers.

If such an arrangement is not possible, it must rearrange to the lowest possible order (i.e., sorted in ascending order).

---

## Approaches

### Brute-Force Approach

#### Complexity Analysis

- **Time Complexity:** O(N!*N), since we are generating all possible permutations, it takes N! time.
- **Space Complexity:** O(N!), storing all permutations.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Function to find the next permutation
    vector<int> nextPermutation(vector<int>& nums) {
        // Store all permutations
        vector<vector<int>> all;

        // Generate all permutations
        sort(nums.begin(), nums.end());
        do {
            all.push_back(nums);
        } while (next_permutation(nums.begin(), nums.end()));

        // Traverse the list to find current permutation
        for (int i = 0; i < all.size(); i++) {
            if (all[i] == nums) {
                // If it's the last permutation
                if (i == all.size() - 1)
                    return all[0];
                // Return the next one
                return all[i + 1];
            }
        }

        // Return original if not found (shouldn't happen)
        return nums;
    }
};

int main() {
    Solution sol;
    vector<int> nums = {1, 2, 3};

    vector<int> result = sol.nextPermutation(nums);

    for (int x : result) cout << x << " ";
    cout << endl;

    return 0;
}
```

##### JAVA

```java
import java.util.*;

class Solution {
    // Function to find the next permutation
    public List<Integer> nextPermutation(int[] nums) {
        // List to hold all permutations
        List<List<Integer>> all = new ArrayList<>();

        // Sort the input to start from the smallest
        Arrays.sort(nums);

        // Generate all permutations
        permute(nums, 0, all);

        // Convert array to list for comparison
        List<Integer> current = new ArrayList<>();
        for (int num : nums)
            current.add(num);

        // Find and return the next permutation
        for (int i = 0; i < all.size(); i++) {
            if (all.get(i).equals(current)) {
                if (i == all.size() - 1)
                    return all.get(0);
                return all.get(i + 1);
            }
        }

        return current;
    }

    // Backtracking permutation generator
    private void permute(int[] nums, int start, List<List<Integer>> all) {
        if (start == nums.length) {
            List<Integer> temp = new ArrayList<>();
            for (int num : nums) temp.add(num);
            all.add(new ArrayList<>(temp));
            return;
        }
        for (int i = start; i < nums.length; i++) {
            swap(nums, i, start);
            permute(nums, start + 1, all);
            swap(nums, i, start);
        }
    }

    // Swap helper
    private void swap(int[] arr, int i, int j) {
        int tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
}

public class Main {
    public static void main(String[] args) {
        Solution sol = new Solution();
        int[] nums = {1, 2, 3};

        List<Integer> result = sol.nextPermutation(nums);
        for (int x : result)
            System.out.print(x + " ");
        System.out.println();
    }
}
```

##### PYTHON

```python
from itertools import permutations

class Solution:
    # Function to find the next permutation
    def nextPermutation(self, nums):
        # Generate all unique permutations
        perms = sorted(set(permutations(nums)))

        # Convert list to tuple for comparison
        current = tuple(nums)

        # Traverse the list
        for i in range(len(perms)):
            if perms[i] == current:
                # If last permutation, return first
                if i == len(perms) - 1:
                    return list(perms[0])
                # Else return next
                return list(perms[i + 1])

        return nums

# Driver code
sol = Solution()
nums = [1, 2, 3]
result = sol.nextPermutation(nums)
print(" ".join(map(str, result)))
```

##### JAVASCRIPT

```javascript
class Solution {
    // Helper to generate all permutations
    permute(nums) {
        const res = [];
        const backtrack = (start) => {
            if (start === nums.length) {
                res.push([...nums]);
                return;
            }
            for (let i = start; i < nums.length; i++) {
                [nums[i], nums[start]] = [nums[start], nums[i]];
                backtrack(start + 1);
                [nums[i], nums[start]] = [nums[start], nums[i]];
            }
        };
        nums.sort((a, b) => a - b);
        backtrack(0);
        return res;
    }

    // Main function to get next permutation
    nextPermutation(nums) {
        const perms = this.permute([...nums]);

        for (let i = 0; i < perms.length; i++) {
            let equal = true;
            for (let j = 0; j < nums.length; j++) {
                if (perms[i][j] !== nums[j]) {
                    equal = false;
                    break;
                }
            }
            if (equal) {
                if (i === perms.length - 1)
                    return perms[0];
                return perms[i + 1];
            }
        }
        return nums;
    }
}

// Driver
const sol = new Solution();
let nums = [1, 2, 3];
let result = sol.nextPermutation(nums);
console.log(result.join(" "));
```

---

### Optimal Approach

#### Complexity Analysis

- **Time Complexity:** O(N), we find the breaking point and reverse the subarray in linear time.
- **Space Complexity:** O(1), constant additional space is used.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

// Solution class
class Solution {
public:
    // Function to find next permutation
    void nextPermutation(vector<int>& nums) {
        // Set index to -1
        int index = -1;

        // Find the first decreasing element from end
        for (int i = nums.size() - 2; i >= 0; i--) {
            // If a smaller element found
            if (nums[i] < nums[i + 1]) {
                // Store index
                index = i;
                break;
            }
        }

        // If no such index found
        if (index == -1) {
            // Reverse the entire array
            reverse(nums.begin(), nums.end());
            return;
        }

        // Find element just greater than nums[index]
        for (int i = nums.size() - 1; i > index; i--) {
            // Swap the two
            if (nums[i] > nums[index]) {
                swap(nums[i], nums[index]);
                break;
            }
        }

        // Reverse the part after index
        reverse(nums.begin() + index + 1, nums.end());
    }
};

// Main function
int main() {
    // Input array
    vector<int> nums = {1, 2, 3};

    // Create object
    Solution sol;

    // Call the function
    sol.nextPermutation(nums);

    // Print result
    for (int num : nums) {
        cout << num << " ";
    }
    cout << endl;

    return 0;
}
```

##### JAVA

```java
import java.util.*;

// Solution class
class Solution {
    // Function to find next permutation
    public void nextPermutation(int[] nums) {
        // Set index to -1
        int index = -1;

        // Find the first decreasing element from end
        for (int i = nums.length - 2; i >= 0; i--) {
            // If smaller found
            if (nums[i] < nums[i + 1]) {
                // Store index
                index = i;
                break;
            }
        }

        // If no index found
        if (index == -1) {
            // Reverse the entire array
            reverse(nums, 0, nums.length - 1);
            return;
        }

        // Find just larger element
        for (int i = nums.length - 1; i > index; i--) {
            // Swap them
            if (nums[i] > nums[index]) {
                swap(nums, i, index);
                break;
            }
        }

        // Reverse part after index
        reverse(nums, index + 1, nums.length - 1);
    }

    // Helper to reverse array
    private void reverse(int[] arr, int start, int end) {
        while (start < end) {
            swap(arr, start, end);
            start++;
            end--;
        }
    }

    // Helper to swap
    private void swap(int[] arr, int i, int j) {
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
}

// Main class
public class Main {
    public static void main(String[] args) {
        // Input array
        int[] nums = {1, 2, 3};

        // Create object
        Solution sol = new Solution();

        // Call function
        sol.nextPermutation(nums);

        // Print result
        for (int num : nums) {
            System.out.print(num + " ");
        }
        System.out.println();
    }
}
```

##### PYTHON

```python
# Solution class
class Solution:
    # Function to find next permutation
    def nextPermutation(self, nums):
        # Set index
        index = -1

        # Find decreasing point
        for i in range(len(nums) - 2, -1, -1):
            # If smaller found
            if nums[i] < nums[i + 1]:
                index = i
                break

        # If no such index
        if index == -1:
            # Reverse whole list
            nums.reverse()
            return

        # Find just greater element
        for i in range(len(nums) - 1, index, -1):
            if nums[i] > nums[index]:
                # Swap them
                nums[i], nums[index] = nums[index], nums[i]
                break

        # Reverse part after index
        nums[index + 1:] = reversed(nums[index + 1:])

# Main driver
def main():
    # Input list
    nums = [1, 2, 3]

    # Create object
    sol = Solution()

    # Call function
    sol.nextPermutation(nums)

    # Print result
    print(" ".join(map(str, nums)))

# Run main
main()
```

##### JAVASCRIPT

```javascript
// Solution class
class Solution {
    // Function to find next permutation
    nextPermutation(nums) {
        // Set index
        let index = -1;

        // Find decreasing point
        for (let i = nums.length - 2; i >= 0; i--) {
            if (nums[i] < nums[i + 1]) {
                index = i;
                break;
            }
        }

        // If no index found
        if (index === -1) {
            // Reverse full array
            nums.reverse();
            return;
        }

        // Find just larger element
        for (let i = nums.length - 1; i > index; i--) {
            if (nums[i] > nums[index]) {
                // Swap them
                [nums[i], nums[index]] = [nums[index], nums[i]];
                break;
            }
        }

        // Reverse part after index
        let left = index + 1, right = nums.length - 1;
        while (left < right) {
            [nums[left], nums[right]] = [nums[right], nums[left]];
            left++;
            right--;
        }
    }
}

// Main driver
function main() {
    // Input array
    let nums = [1, 2, 3];

    // Create object
    const sol = new Solution();

    // Call function
    sol.nextPermutation(nums);

    // Print result
    console.log(nums.join(" "));
}

// Run main
main();
```

---

