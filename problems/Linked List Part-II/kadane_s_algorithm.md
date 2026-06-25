# Kadane's Algorithm

- **Topic:** Linked List Part-II
- **Difficulty:** Medium
- **LeetCode Link:** [Solve on LeetCode](https://leetcode.com/problems/maximum-subarray/)
- **TUF+ Link:** [Solve on TUF+](https://takeuforward.org/plus/dsa/problems/kadane's-algorithm?source=strivers-sde-sheet)
- **YouTube Video:** [Watch Video Explanation](https://youtu.be/AHZpyENo7k4?si=QJpof4R1hHokm1hw)
- **Article Link:** [Full Editorial](https://takeuforward.org/data-structure/kadanes-algorithm-maximum-subarray-sum-in-an-array/)

## Problem Statement

Given an integer array nums, find the subarray with the largest sum and return the sum of the elements present in that subarray.

A subarray is a contiguous non-empty sequence of elements within an array.

---

## Approaches

### Brute Force

#### Complexity Analysis

- **Time Complexity:** O(N^3), where N is the size of the array. This is because we have three nested loops: one for the starting index, one for the ending index, and one for calculating the sum of the subarray.
- **Space Complexity:** O(1), as we are using a constant amount of space for variables, regardless of the input size.

#### Code Solutions

##### CPP

```cpp
#include<bits/stdc++.h>
using namespace std;

class Solution {
public:
    //Function to find maximum sum of subarrays
    int maxSubArray(vector<int>& nums) {
        
        /* Initialize maximum sum with 
        the smallest possible integer*/
        int maxi = INT_MIN; 

        // Iterate over each starting index of subarrays
        for (int i = 0; i < nums.size(); i++) {
            
            /* Iterate over each ending index
            of subarrays starting from i*/
            for (int j = i; j < nums.size(); j++) {
                
                // Variable to store the sum of the current subarray
                int sum = 0; 

                // Calculate the sum of subarray nums[i...j]
                for (int k = i; k <= j; k++) {
                    sum += nums[k];
                }

                /* Update maxi with the maximum of its current 
                value and the sum of the current subarray*/
                maxi = max(maxi, sum);
                
            }
        }
        
        // Return the maximum subarray sum found
        return maxi; 
    }
};

int main() {
    vector<int> arr = { -2, 1, -3, 4, -1, 2, 1, -5, 4};
    
    //create an instance of Solution class
    Solution sol;
    
    int maxSum = sol.maxSubArray(arr);
    
    //Print the max subarray sum
    cout << "The maximum subarray sum is: " << maxSum << endl;
    return 0;
}
```

##### JAVA

```java
import java.util.*;

class Solution {
    // Function to find maximum sum of subarrays
    public int maxSubArray(int[] nums) {
        
        /* Initialize maximum sum with
           the smallest possible integer */
        int maxi = Integer.MIN_VALUE;

        // Iterate over each starting index of subarrays
        for (int i = 0; i < nums.length; i++) {
            
            /* Iterate over each ending index
               of subarrays starting from i */
            for (int j = i; j < nums.length; j++) {
                
                /* Variable to store the sum
                   of the current subarray */
                int sum = 0;

                // Calculate the sum of subarray nums[i...j]
                for (int k = i; k <= j; k++) {
                    sum += nums[k];
                }

                /* Update maxi with the maximum of its current
                   value and the sum of the current subarray */
                maxi = Math.max(maxi, sum);
            }
        }

        // Return the maximum subarray sum found
        return maxi;
    }
}

// Separate Main class
public class Main {
    public static void main(String[] args) {
        int[] arr = { -2, 1, -3, 4, -1, 2, 1, -5, 4 };

        // Create an instance of Solution class
        Solution sol = new Solution();

        int maxSum = sol.maxSubArray(arr);

        // Print the max subarray sum
        System.out.println("The maximum subarray sum is: " + maxSum);
    }
}
```

##### PYTHON

```python
from typing import List

class Solution:
    # Function to find maximum sum of subarrays
    def maxSubArray(self, nums: list[int]) -> int:
        
        """ Initialize maximum sum with
        the smallest possible integer"""
        maxi = float('-inf')

        # Iterate over each starting index of subarrays
        for i in range(len(nums)):
            
            """ Iterate over each ending index
            of subarrays starting from i"""
            for j in range(i, len(nums)):
                
                """ Variable to store the sum
                of the current subarray"""
                sum = 0

                # Calculate the sum of subarray nums[i...j]
                for k in range(i, j + 1):
                    sum += nums[k]

                """ Update maxi with the maximum of itscurrent
                value and the sum of the current subarray"""
                maxi = max(maxi, sum)

        # Return the maximum subarray sum found
        return maxi

# Test
arr = [-2, 1, -3, 4, -1, 2, 1, -5, 4]

#create an isinstance of Solution class
sol = Solution()

maxSum = sol.maxSubArray(arr)

#Print the max sum of subarrays
print("The maximum subarray sum is:", maxSum)
```

##### JAVASCRIPT

```javascript
class Solution {
    // Function to find maximum sum of subarrays
    maxSubArray(nums) {
        
        /* Initialize maximum sum with
        the smallest possible integer*/
        let maxi = -Infinity;

        // Iterate over each starting index of subarrays
        for (let i = 0; i < nums.length; i++) {
            
            /* Iterate over each ending index
            of subarrays starting from i*/
            for (let j = i; j < nums.length; j++) {
                
                /* Variable to store the sum
                of the current subarray*/
                let sum = 0;

                // Calculate the sum of subarray nums[i...j]
                for (let k = i; k <= j; k++) {
                    sum += nums[k];
                }

                /* Update maxi with the maximum of its current
                value and the sum of the current subarray*/
                maxi = Math.max(maxi, sum);
                
            }
        }

        // Return the maximum subarray sum found
        return maxi;
    }
}

// Main function to test the Solution class
function main() {
    let arr = [-2, 1, -3, 4, -1, 2, 1, -5, 4];

    // Create an instance of Solution class
    let sol = new Solution();

    let maxSum = sol.maxSubArray(arr);

    // Print the max subarray sum
    console.log("The maximum subarray sum is: " + maxSum);
}

main();
```

---

### Better Approach

#### Complexity Analysis

- **Time Complexity:** O(N^2), where N is the size of the array. This is because we have two nested loops: one for the starting index and one for the ending index of the subarray.
- **Space Complexity:** O(1), as we are using a constant amount of space for variables, regardless of the input size.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Function to find maximum sum of subarrays
    int maxSubArray(vector<int>& nums) {
        
        /* Initialize maximum sum with
        the smallest possible integer*/
        int maxi = INT_MIN; 

        // Iterate over each starting index of subarrays
        for (int i = 0; i < nums.size(); i++) {
            
            /* Variable to store the sum
            of the current subarray*/
            int sum = 0; 
            
            /* Iterate over each ending index
            of subarrays starting from i*/
            for (int j = i; j < nums.size(); j++) {
                
                /* Add the current element nums[j] to
                the sum i.e. sum of nums[i...j-1]*/
                sum += nums[j];

                /* Update maxi with the maximum of its current
                value and the sum of the current subarray*/
                maxi = max(maxi, sum);
            }
        }

        // Return the maximum subarray sum found
        return maxi;
    }
};

int main() {
    vector<int> arr = { -2, 1, -3, 4, -1, 2, 1, -5, 4 };

    // Create an instance of Solution class
    Solution sol;

    int maxSum = sol.maxSubArray(arr);

    // Print the max subarray sum
    cout << "The maximum subarray sum is: " << maxSum << endl;

    return 0;
}
```

##### JAVA

```java
import java.util.*;

class Solution {
    // Function to find maximum sum of subarrays
    public int maxSubArray(int[] nums) {
        
        /* Initialize maximum sum with
           the smallest possible integer */
        int maxi = Integer.MIN_VALUE;

        // Iterate over each starting index of subarrays
        for (int i = 0; i < nums.length; i++) {
            
            /* Variable to store the sum
               of the current subarray */
            int sum = 0; 
            
            /* Iterate over each ending index
               of subarrays starting from i */
            for (int j = i; j < nums.length; j++) {
                
                /* Add the current element nums[j] to
                   the sum i.e. sum of nums[i...j-1] */
                sum += nums[j];

                /* Update maxi with the maximum of its current
                   value and the sum of the current subarray */
                maxi = Math.max(maxi, sum);
            }
        }

        // Return the maximum subarray sum found
        return maxi;
    }
}

// Separate Main class in the same file
public class Main {
    public static void main(String[] args) {
        int[] arr = { -2, 1, -3, 4, -1, 2, 1, -5, 4 };

        // Create an instance of Solution class
        Solution sol = new Solution();

        int maxSum = sol.maxSubArray(arr);

        // Print the max subarray sum
        System.out.println("The maximum subarray sum is: " + maxSum);
    }
}
```

##### PYTHON

```python
from typing import List

class Solution:
    # Function to find maximum sum of subarrays
    def maxSubArray(self, nums: List[int]) -> int:
        
        """ Initialize maximum sum with
         the smallest possible integer"""
        maxi = float('-inf')

        # Iterate over each starting index of subarrays
        for i in range(len(nums)):
            
            """ Variable to store the sum
             of the current subarray"""
            sum = 0
            
            """ Iterate over each ending index
             of subarrays starting from i"""
            for j in range(i, len(nums)):
                
                """ Add the current element nums[j] to
                 the sum i.e. sum of nums[i...j-1]"""
                sum += nums[j]

                """ Update maxi with the maximum of its current
                 value and the sum of the current subarray"""
                maxi = max(maxi, sum)

        # Return the maximum subarray sum found
        return maxi

# Main function to test the Solution class
if __name__ == "__main__":
    arr = [-2, 1, -3, 4, -1, 2, 1, -5, 4]

    # Create an instance of Solution class
    sol = Solution()

    maxSum = sol.maxSubArray(arr)

    # Print the max subarray sum
    print(f"The maximum subarray sum is: {maxSum}")
```

##### JAVASCRIPT

```javascript
class Solution {
    // Function to find maximum sum of subarrays
    maxSubArray(nums) {
        
        /* Initialize maximum sum with
        the smallest possible integer*/
        let maxi = -Infinity; 

        // Iterate over each starting index of subarrays
        for (let i = 0; i < nums.length; i++) {
            
            /* Variable to store the sum
            of the current subarray*/
            let sum = 0; 
            
            /* Iterate over each ending index
            of subarrays starting from i*/
            for (let j = i; j < nums.length; j++) {
                
                /* Add the current element nums[j] to
                the sum i.e. sum of nums[i...j-1]*/
                sum += nums[j];

                /* Update maxi with the maximum of its current
                value and the sum of the current subarray*/
                maxi = Math.max(maxi, sum);
            }
        }

        // Return the maximum subarray sum found
        return maxi;
    }
}

function main() {
    let arr = [ -2, 1, -3, 4, -1, 2, 1, -5, 4 ];

    // Create an instance of Solution class
    let sol = new Solution();

    let maxSum = sol.maxSubArray(arr);

    // Print the max subarray sum
    console.log("The maximum subarray sum is: " + maxSum);
}

// Execute the main function
main();
```

---

### Optimal Approach

#### Complexity Analysis

- **Time Complexity:** O(n), where n is the number of elements in the array. We traverse the array only once.
- **Space Complexity:** O(1). We use a constant amount of space for variables.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Function to find maximum sum of subarrays
    int maxSubArray(vector<int>& nums) {
        
        // maximum sum
        long long maxi = LLONG_MIN; 
        
        // current sum of subarray
        long long sum = 0; 
        
        // Iterate through the array
        for (int i = 0; i < nums.size(); i++) {
            
            // Add current element to the sum
            sum += nums[i]; 
            
            // Update maxi if current sum is greater
            if (sum > maxi) {
                maxi = sum; 
            }
            
            // Reset sum to 0 if it becomes negative
            if (sum < 0) {
                sum = 0; 
            }
        }
        
        // Return the maximum subarray sum found
        return maxi;
    }
};

int main() {
    vector<int> arr = { -2, 1, -3, 4, -1, 2, 1, -5, 4 };

    // Create an instance of Solution class
    Solution sol;

    int maxSum = sol.maxSubArray(arr);

    // Print the max subarray sum
    cout << "The maximum subarray sum is: " << maxSum << endl;

    return 0;
}
```

##### JAVA

```java
import java.util.*;

class Solution {
    // Function to find maximum sum of subarrays
    public int maxSubArray(int[] nums) {
        
        // Maximum sum
        long maxi = Long.MIN_VALUE; 
        
        // Current sum of subarray 
        long sum = 0; 
        
        // Iterate through the array
        for (int i = 0; i < nums.length; i++) {
            
            // Add current element to the sum
            sum += nums[i]; 
            
            // Update maxi if current sum is greater
            if (sum > maxi) {
                maxi = sum; 
            }
            
            // Reset sum to 0 if it becomes negative
            if (sum < 0) {
                sum = 0; 
            }
        }
        
        // Return the maximum subarray sum found
        return (int) maxi;
    }
}

// Separate Main class in same file
public class Main {
    public static void main(String[] args) {
        int[] arr = { -2, 1, -3, 4, -1, 2, 1, -5, 4 };

        // Create an instance of Solution class
        Solution sol = new Solution();

        int maxSum = sol.maxSubArray(arr);

        // Print the max subarray sum
        System.out.println("The maximum subarray sum is: " + maxSum);
    }
}
```

##### PYTHON

```python
from typing import List

class Solution:
    # Function to find maximum sum of subarrays
    def maxSubArray(self, nums: List[int]) -> int:
        
        # maximum sum
        maxi = float('-inf') 
        
        # current sum of subarray
        sum = 0 
        
        # Iterate through the array
        for i in range(len(nums)):
            
            # Add current element to the sum
            sum += nums[i] 
            
            # Update maxi if current sum is greater
            if sum > maxi:
                maxi = sum 
            
            # Reset sum to 0 if it becomes negative
            if sum < 0:
                sum = 0 
        
        # Return the maximum subarray sum found
        return maxi

if __name__ == "__main__":
    arr = [ -2, 1, -3, 4, -1, 2, 1, -5, 4 ]

    # Create an instance of Solution class
    sol = Solution()

    maxSum = sol.maxSubArray(arr)

    # Print the max subarray sum
    print(f"The maximum subarray sum is: {maxSum}")
```

##### JAVASCRIPT

```javascript
class Solution {
    // Function to find maximum sum of subarrays
    maxSubArray(nums) {
        
        // maximum sum
        let maxi = -Infinity; 
        
        // current sum of subarray
        let sum = 0; 
        
        // Iterate through the array
        for (let i = 0; i < nums.length; i++) {
            
            // Add current element to the sum
            sum += nums[i]; 
            
            // Update maxi if current sum is greater
            if (sum > maxi) {
                maxi = sum; 
            }
            
            // Reset sum to 0 if it becomes negative
            if (sum < 0) {
                sum = 0; 
            }
        }
        
        // Return the maximum subarray sum found
        return maxi;
    }
}

function main() {
    let arr = [ -2, 1, -3, 4, -1, 2, 1, -5, 4 ];

    // Create an instance of Solution class
    let sol = new Solution();

    let maxSum = sol.maxSubArray(arr);

    // Print the max subarray sum
    console.log("The maximum subarray sum is: " + maxSum);
}

// Execute the main function
main();
```

---

### Follow Up

#### Complexity Analysis

- **Time Complexity:** O(n), where n is the number of elements in the array. We traverse the array only once.
- **Space Complexity:** O(1). We use a constant amount of space for variables.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Function to find maximum sum of subarrays and print the subarray having maximum sum
    int maxSubArray(vector<int>& nums) {
        
        // maximum sum
        long long maxi = LLONG_MIN; 
        
        // current sum of subarray
        long long sum = 0;
        
        // starting index of current subarray
        int start = 0; 
        
        // indices of the maximum sum subarray
        int ansStart = -1, ansEnd = -1; 
        
        // Iterate through the array
        for (int i = 0; i < nums.size(); i++) {
            
            // update starting index if sum is reset
            if (sum == 0) {
                start = i;
            }
            
            // add current element to the sum
            sum += nums[i]; 
            
            /* Update maxi and subarray indice
            s if current sum is greater*/
            if (sum > maxi) {
                maxi = sum;
                ansStart = start;
                ansEnd = i;
            }
            
            // Reset sum to 0 if it becomes negative
            if (sum < 0) {
                sum = 0;
            }
        }
        
        // Printing the subarray
        cout << "The subarray is: [";
        for (int i = ansStart; i <= ansEnd; i++) {
            cout << nums[i] << " ";
        }
        cout << "]" << endl;
        
        // Return the maximum subarray sum found
        return maxi;
    }
};

int main() {
    vector<int> arr = { -2, 1, -3, 4, -1, 2, 1, -5, 4 };

    // Create an instance of Solution class
    Solution sol;

    int maxSum = sol.maxSubArray(arr);

    // Print the max subarray sum
    cout << "The maximum subarray sum is: " << maxSum << endl;

    return 0;
}
```

##### JAVA

```java
import java.util.*;

class Solution {
    // Function to find maximum sum of subarrays and print the subarray having maximum sum
    public int maxSubArray(int[] nums) {
        
        // Maximum sum
        long maxi = Long.MIN_VALUE; 
        
        // Current sum of subarray
        long sum = 0; 
        
        // Starting index of current subarray
        int start = 0; 
        
        // Indices of the maximum sum subarray
        int ansStart = -1, ansEnd = -1; 
        
        // Iterate through the array
        for (int i = 0; i < nums.length; i++) {
            
            // Update starting index if sum is reset
            if (sum == 0) {
                start = i;
            }
            
            // Add current element to the sum
            sum += nums[i]; 
            
            // Update maxi and subarray indices if current sum is greater
            if (sum > maxi) {
                maxi = sum;
                ansStart = start;
                ansEnd = i;
            }
            
            // Reset sum to 0 if it becomes negative
            if (sum < 0) {
                sum = 0;
            }
        }
        
        // Printing the subarray
        System.out.print("The subarray is: [");
        for (int i = ansStart; i <= ansEnd; i++) {
            System.out.print(nums[i] + " ");
        }
        System.out.println("]");

        // Return the maximum subarray sum found
        return (int) maxi;
    }
}

// Separate Main class
public class Main {
    public static void main(String[] args) {
        int[] arr = { -2, 1, -3, 4, -1, 2, 1, -5, 4 };

        // Create an instance of Solution class
        Solution sol = new Solution();

        int maxSum = sol.maxSubArray(arr);

        // Print the max subarray sum
        System.out.println("The maximum subarray sum is: " + maxSum);
    }
}
```

##### PYTHON

```python
from typing import List

class Solution:
    # Function to find maximum sum of subarrays and print the subarray having maximum sum
    def maxSubArray(self, nums: List[int]) -> int:
        
        # maximum sum
        maxi = float('-inf') 
        
        # current sum of subarray
        sum = 0 
        
        # starting index of current subarray
        start = 0 
        
        # indices of the maximum sum subarray
        ansStart = -1
        ansEnd = -1
        
        # Iterate through the array
        for i in range(len(nums)):
            
            # update starting index if sum is reset
            if sum == 0:
                start = i
            
            # add current element to the sum
            sum += nums[i] 
            
            """ Update maxi and subarray indices
            if current sum is greater """
            if sum > maxi:
                maxi = sum
                ansStart = start
                ansEnd = i
            
            # Reset sum to 0 if it becomes negative
            if sum < 0:
                sum = 0
        
        # Printing the subarray
        print("The subarray is: [", end="")
        for i in range(ansStart, ansEnd + 1):
            print(nums[i], end=" ")
        print("]")

        # Return the maximum subarray sum found
        return maxi

if __name__ == "__main__":
    arr = [ -2, 1, -3, 4, -1, 2, 1, -5, 4 ]

    # Create an instance of Solution class
    sol = Solution()

    maxSum = sol.maxSubArray(arr)

    # Print the max subarray sum
    print(f"The maximum subarray sum is: {maxSum}")
```

##### JAVASCRIPT

```javascript
class Solution {
   // Function to find maximum sum of subarrays and print the subarray having maximum sum
    maxSubArray(nums) {
        
        // maximum sum
        let maxi = -Infinity; 
        
        // current sum of subarray
        let sum = 0; 
        
        // starting index of current subarray
        let start = 0; 
        
        // indices of the maximum sum subarray
        let ansStart = -1, ansEnd = -1; 
        
        // Iterate through the array
        for (let i = 0; i < nums.length; i++) {
            
            // update starting index if sum is reset
            if (sum === 0) {
                start = i;
            }
            
            // add current element to the sum
            sum += nums[i]; 
            
            /* Update maxi and subarray indices
            if current sum is greater */
            if (sum > maxi) {
                maxi = sum;
                ansStart = start;
                ansEnd = i;
            }
            
            // Reset sum to 0 if it becomes negative
            if (sum < 0) {
                sum = 0;
            }
        }
        
        // Printing the subarray
        process.stdout.write("The subarray is: [");
        for (let i = ansStart; i <= ansEnd; i++) {
            process.stdout.write(nums[i] + " ");
        }
        console.log("]");

        // Return the maximum subarray sum found
        return maxi;
    }
}

function main() {
    let arr = [ -2, 1, -3, 4, -1, 2, 1, -5, 4 ];

    // Create an instance of Solution class
    let sol = new Solution();

    let maxSum = sol.maxSubArray(arr);

    // Print the max subarray sum
    console.log("The maximum subarray sum is: " + maxSum);
}

// Execute the main function
main();
```

---

