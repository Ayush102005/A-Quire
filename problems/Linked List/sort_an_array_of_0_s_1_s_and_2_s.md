# Sort an array of 0's 1's and 2's

- **Topic:** Linked List
- **Difficulty:** Medium
- **LeetCode Link:** [Solve on LeetCode](https://leetcode.com/problems/sort-colors/)
- **TUF+ Link:** [Solve on TUF+](https://takeuforward.org/plus/dsa/problems/sort-an-array-of-0's-1's-and-2's?source=strivers-sde-sheet)
- **YouTube Video:** [Watch Video Explanation](https://youtu.be/tp8JIuCXBaU)
- **Article Link:** [Full Editorial](https://takeuforward.org/data-structure/sort-an-array-of-0s-1s-and-2s/)

## Problem Statement

Given an array nums consisting of only 0, 1, or 2. Sort the array in non-decreasing order. The sorting must be done in-place, without making a copy of the original array.

---

## Approaches

### Brute force Approach

#### Complexity Analysis

- **Time Complexity:** O(n),We traverse the array twice: once to count, once to overwrite. Each operation is O(n).
- **Space Complexity:** O(1), We use only a constant number of counters regardless of the input size. No extra array is used.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Function to sort the array containing only 0s, 1s and 2s
    void sortZeroOneTwo(vector<int>& nums) {
        // Initialize count variables for 0s, 1s, and 2s
        int count0 = 0, count1 = 0, count2 = 0;

        // Count the frequency of 0s, 1s, and 2s in the array
        for(int i = 0; i < nums.size(); i++) {
            if(nums[i] == 0) count0++;
            else if(nums[i] == 1) count1++;
            else count2++;
        }

        // Overwrite the array with the counted values
        int index = 0;

        // Fill with 0s
        while(count0--) {
            nums[index++] = 0;
        }

        // Fill with 1s
        while(count1--) {
            nums[index++] = 1;
        }

        // Fill with 2s
        while(count2--) {
            nums[index++] = 2;
        }
    }
};

// Driver code
int main() {
    vector<int> nums = {1, 0, 2, 1, 0};

    Solution obj;
    obj.sortZeroOneTwo(nums);

    for(int x : nums) {
        cout << x << " ";
    }

    return 0;
}
```

##### JAVA

```java
import java.util.*;

class Solution {
    // Function to sort the array containing only 0s, 1s and 2s
    public void sortZeroOneTwo(int[] nums) {
        // Initialize count variables for 0s, 1s, and 2s
        int count0 = 0, count1 = 0, count2 = 0;

        // Count the frequency of 0s, 1s, and 2s
        for(int num : nums) {
            if(num == 0) count0++;
            else if(num == 1) count1++;
            else count2++;
        }

        // Overwrite the array with sorted values
        int index = 0;

        // Fill with 0s
        while(count0-- > 0) {
            nums[index++] = 0;
        }

        // Fill with 1s
        while(count1-- > 0) {
            nums[index++] = 1;
        }

        // Fill with 2s
        while(count2-- > 0) {
            nums[index++] = 2;
        }
    }
}

// Driver class
class Main {
    public static void main(String[] args) {
        int[] nums = {1, 0, 2, 1, 0};

        Solution obj = new Solution();
        obj.sortZeroOneTwo(nums);

        for(int num : nums) {
            System.out.print(num + " ");
        }
    }
}
```

##### PYTHON

```python
class Solution:
    # Function to sort the array containing only 0s, 1s and 2s
    def sortZeroOneTwo(self, nums):
        # Initialize count variables for 0s, 1s, and 2s
        count0 = count1 = count2 = 0

        # Count the frequency of 0s, 1s, and 2s
        for num in nums:
            if num == 0:
                count0 += 1
            elif num == 1:
                count1 += 1
            else:
                count2 += 1

        # Overwrite the array with sorted values
        index = 0

        # Fill with 0s
        for _ in range(count0):
            nums[index] = 0
            index += 1

        # Fill with 1s
        for _ in range(count1):
            nums[index] = 1
            index += 1

        # Fill with 2s
        for _ in range(count2):
            nums[index] = 2
            index += 1

# Driver code
nums = [1, 0, 2, 1, 0]
obj = Solution()
obj.sortZeroOneTwo(nums)
print(nums)
```

##### JAVASCRIPT

```javascript
class Solution {
    // Function to sort the array containing only 0s, 1s and 2s
    sortZeroOneTwo(nums) {
        // Initialize count variables for 0s, 1s, and 2s
        let count0 = 0, count1 = 0, count2 = 0;

        // Count the frequency of 0s, 1s, and 2s
        for (let num of nums) {
            if (num === 0) count0++;
            else if (num === 1) count1++;
            else count2++;
        }

        // Overwrite the array with sorted values
        let index = 0;

        // Fill with 0s
        while (count0--) {
            nums[index++] = 0;
        }

        // Fill with 1s
        while (count1--) {
            nums[index++] = 1;
        }

        // Fill with 2s
        while (count2--) {
            nums[index++] = 2;
        }
    }
}

// Driver code
let nums = [1, 0, 2, 1, 0];
let obj = new Solution();
obj.sortZeroOneTwo(nums);
console.log(nums);
```

---

### Better Approach

#### Complexity Analysis

- **Time Complexity:** ,O(n) We make two passes through the array: one for counting and one for updating. So the total time is proportional to the size of the array.
- **Space Complexity:** O(1),Only three integer variables (cnt0, cnt1, cnt2) are used for counting. No extra space is used proportional to the input size.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Function to sort an array containing only 0s, 1s, and 2s
    void sortZeroOneTwo(vector<int>& nums) {
        // Count of 0s, 1s, and 2s
        int cnt0 = 0, cnt1 = 0, cnt2 = 0;

        // First pass: Count the number of 0s, 1s, and 2s
        for (int i = 0; i < nums.size(); i++) {
            if (nums[i] == 0) cnt0++;
            else if (nums[i] == 1) cnt1++;
            else cnt2++;
        }

        // Second pass: Fill the array with 0s, then 1s, then 2s

        // Fill the first 'cnt0' elements with 0
        for (int i = 0; i < cnt0; i++) {
            nums[i] = 0;
        }

        // Fill the next 'cnt1' elements with 1
        for (int i = cnt0; i < cnt0 + cnt1; i++) {
            nums[i] = 1;
        }

        // Fill the remaining elements with 2
        for (int i = cnt0 + cnt1; i < nums.size(); i++) {
            nums[i] = 2;
        }
    }
};

// Driver code
int main() {
    vector<int> nums = {0, 2, 1, 2, 0, 1};

    Solution sol;
    sol.sortZeroOneTwo(nums);

    cout << "After sorting:" << endl;
    for (int i = 0; i < nums.size(); i++) {
        cout << nums[i] << " ";
    }
    cout << endl;

    return 0;
}
```

##### JAVA

```java
import java.util.*;

class Solution {
    // Function to sort an array containing only 0s, 1s, and 2s
    public void sortZeroOneTwo(int[] nums) {
        // Count of 0s, 1s, and 2s
        int cnt0 = 0, cnt1 = 0, cnt2 = 0;

        // First pass: Count the number of 0s, 1s, and 2s
        for (int num : nums) {
            if (num == 0) cnt0++;
            else if (num == 1) cnt1++;
            else cnt2++;
        }

        // Second pass: Fill the array with 0s, then 1s, then 2s

        // Fill the first 'cnt0' elements with 0
        for (int i = 0; i < cnt0; i++) {
            nums[i] = 0;
        }

        // Fill the next 'cnt1' elements with 1
        for (int i = cnt0; i < cnt0 + cnt1; i++) {
            nums[i] = 1;
        }

        // Fill the remaining elements with 2
        for (int i = cnt0 + cnt1; i < nums.length; i++) {
            nums[i] = 2;
        }
    }
}

// Driver code
class Main {
    public static void main(String[] args) {
        int[] nums = {0, 2, 1, 2, 0, 1};

        Solution sol = new Solution();
        sol.sortZeroOneTwo(nums);

        System.out.println("After sorting:");
        for (int num : nums) {
            System.out.print(num + " ");
        }
    }
}
```

##### PYTHON

```python
class Solution:
    # Function to sort an array containing only 0s, 1s, and 2s
    def sortZeroOneTwo(self, nums):
        # Count of 0s, 1s, and 2s
        cnt0 = cnt1 = cnt2 = 0

        # First pass: Count the number of 0s, 1s, and 2s
        for num in nums:
            if num == 0:
                cnt0 += 1
            elif num == 1:
                cnt1 += 1
            else:
                cnt2 += 1

        # Second pass: Fill the array with 0s, then 1s, then 2s

        # Fill first 'cnt0' elements with 0
        for i in range(cnt0):
            nums[i] = 0

        # Fill next 'cnt1' elements with 1
        for i in range(cnt0, cnt0 + cnt1):
            nums[i] = 1

        # Fill remaining elements with 2
        for i in range(cnt0 + cnt1, len(nums)):
            nums[i] = 2

# Driver code
nums = [0, 2, 1, 2, 0, 1]
sol = Solution()
sol.sortZeroOneTwo(nums)
print("After sorting:")
print(nums)
```

##### JAVASCRIPT

```javascript
class Solution {
    // Function to sort an array containing only 0s, 1s, and 2s
    sortZeroOneTwo(nums) {
        // Count of 0s, 1s, and 2s
        let cnt0 = 0, cnt1 = 0, cnt2 = 0;

        // First pass: Count the number of 0s, 1s, and 2s
        for (let num of nums) {
            if (num === 0) cnt0++;
            else if (num === 1) cnt1++;
            else cnt2++;
        }

        // Second pass: Fill the array with 0s, then 1s, then 2s

        // Fill the first 'cnt0' elements with 0
        for (let i = 0; i < cnt0; i++) {
            nums[i] = 0;
        }

        // Fill the next 'cnt1' elements with 1
        for (let i = cnt0; i < cnt0 + cnt1; i++) {
            nums[i] = 1;
        }

        // Fill the remaining elements with 2
        for (let i = cnt0 + cnt1; i < nums.length; i++) {
            nums[i] = 2;
        }
    }
}

// Driver code
const nums = [0, 2, 1, 2, 0, 1];
const sol = new Solution();
sol.sortZeroOneTwo(nums);
console.log("After sorting:");
console.log(nums);
```

---

### Optimal Approach

#### Complexity Analysis

- **Time Complexity:** O(n) The array is traversed only once using the `mid` pointer. Each element is checked at most once, and swaps are done in constant time. Space Complexity: O(1) Only a few integer pointers (`low`, `mid`, `high`) are used. Sorting is done in-place, requiring no additional space.
- **Space Complexity:** O(1) Only a few integer pointers (`low`, `mid`, `high`) are used. Sorting is done in-place, requiring no additional space.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Function to sort array containing 0s, 1s, and 2s using Dutch National Flag Algorithm
    void sortZeroOneTwo(vector<int>& nums) {
        // Initialize three pointers: low, mid starting from 0, high from end of array
        int low = 0, mid = 0, high = nums.size() - 1;

        // Process elements until mid pointer crosses high pointer
        while (mid <= high) {
            // If current element is 0, swap with low and move both pointers forward
            if (nums[mid] == 0) {
                swap(nums[mid], nums[low]);
                mid++;
                low++;
            }
            // If current element is 1, it's already in correct place → move mid forward
            else if (nums[mid] == 1) {
                mid++;
            }
            // If current element is 2, swap with high and move only high pointer backward
            else {
                swap(nums[mid], nums[high]);
                high--;
            }
        }
    }
};

// Driver code
int main() {
    Solution obj;
    vector<int> nums = {2, 0, 2, 1, 1, 0};

    obj.sortZeroOneTwo(nums);

    for (int val : nums)
        cout << val << " ";

    return 0;
}
```

##### JAVA

```java
import java.util.*;

class Solution {
    // Function to sort array containing 0s, 1s, and 2s using Dutch National Flag Algorithm
    public void sortZeroOneTwo(int[] nums) {
        // Initialize three pointers: low and mid at 0, high at the end
        int low = 0, mid = 0, high = nums.length - 1;

        // Continue processing until mid crosses high
        while (mid <= high) {
            // If current element is 0, swap with low and move both low and mid forward
            if (nums[mid] == 0) {
                int temp = nums[low];
                nums[low] = nums[mid];
                nums[mid] = temp;
                low++;
                mid++;
            }
            // If current element is 1, just move mid forward
            else if (nums[mid] == 1) {
                mid++;
            }
            // If current element is 2, swap with high and move only high backward
            else {
                int temp = nums[mid];
                nums[mid] = nums[high];
                nums[high] = temp;
                high--;
            }
        }
    }
}

// Driver code
class Main {
    public static void main(String[] args) {
        Solution obj = new Solution();
        int[] nums = {2, 0, 2, 1, 1, 0};

        obj.sortZeroOneTwo(nums);

        for (int num : nums) {
            System.out.print(num + " ");
        }
    }
}
```

##### PYTHON

```python
class Solution:
    # Function to sort list containing 0s, 1s, and 2s using Dutch National Flag Algorithm
    def sortZeroOneTwo(self, nums):
        # Initialize three pointers: low and mid at 0, high at end
        low, mid, high = 0, 0, len(nums) - 1

        # Traverse until mid crosses high
        while mid <= high:
            # If element is 0, swap with low, move both low and mid forward
            if nums[mid] == 0:
                nums[low], nums[mid] = nums[mid], nums[low]
                low += 1
                mid += 1
            # If element is 1, just move mid forward
            elif nums[mid] == 1:
                mid += 1
            # If element is 2, swap with high, move only high backward
            else:
                nums[mid], nums[high] = nums[high], nums[mid]
                high -= 1

# Driver code
nums = [2, 0, 2, 1, 1, 0]
obj = Solution()
obj.sortZeroOneTwo(nums)
print(nums)
```

##### JAVASCRIPT

```javascript
class Solution {
    // Function to sort array containing 0s, 1s, and 2s using Dutch National Flag Algorithm
    sortZeroOneTwo(nums) {
        // Initialize three pointers: low and mid at 0, high at array end
        let low = 0, mid = 0, high = nums.length - 1;

        // Traverse until mid crosses high
        while (mid <= high) {
            // If element is 0, swap with low, move both low and mid forward
            if (nums[mid] === 0) {
                [nums[mid], nums[low]] = [nums[low], nums[mid]];
                mid++;
                low++;
            }
            // If element is 1, just move mid forward
            else if (nums[mid] === 1) {
                mid++;
            }
            // If element is 2, swap with high, move only high backward
            else {
                [nums[mid], nums[high]] = [nums[high], nums[mid]];
                high--;
            }
        }
    }
}

// Driver code
let obj = new Solution();
let nums = [2, 0, 2, 1, 1, 0];
obj.sortZeroOneTwo(nums);
console.log(nums);
```

---

