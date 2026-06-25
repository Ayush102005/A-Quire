# Pascal's Triangle I

- **Topic:** Recursion
- **Difficulty:** Easy
- **LeetCode Link:** [Solve on LeetCode](https://leetcode.com/problems/pascals-triangle/)
- **TUF+ Link:** [Solve on TUF+](https://takeuforward.org/plus/dsa/problems/pascals-triangle-i?source=strivers-sde-sheet)
- **YouTube Video:** [Watch Video Explanation](https://youtu.be/bR7mQgwQ_o8)
- **Article Link:** [Full Editorial](https://takeuforward.org/data-structure/program-to-generate-pascals-triangle)

## Problem Statement

Write a program to generate Pascal's triangle. In Pascal’s triangle, each number is the sum of the two numbers directly above it as shown in the figure below:

---

## Approaches

### Approach - 1

#### Complexity Analysis

- **Time Complexity:** O(N^2), we generate all the elements in first N rows sequentially one by one.
- **Space Complexity:** O(N^2), additional space used for storing the entire pascal triangle.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

// Class containing Pascal's Triangle generation logic
class Solution {
public:
    // Function to generate Pascal's Triangle up to numRows
    vector<vector<int>> generate(int numRows) {
        // Result vector to hold all rows
        vector<vector<int>> triangle;

        // Loop for each row
        for (int i = 0; i < numRows; i++) {
            // Create a row with size (i+1) and initialize all elements to 1
            vector<int> row(i + 1, 1);

            // Fill elements from index 1 to i-1 (middle values)
            for (int j = 1; j < i; j++) {
                // Each element = sum of two elements above it
                row[j] = triangle[i - 1][j - 1] + triangle[i - 1][j];
            }

            // Add current row to the triangle
            triangle.push_back(row);
        }
        return triangle;
    }
};

int main() {
    Solution obj;
    int n = 5;

    // Generate and print Pascal's Triangle
    vector<vector<int>> result = obj.generate(n);
    for (auto &row : result) {
        for (auto &val : row) cout << val << " ";
        cout << endl;
    }
}
```

##### JAVA

```java
import java.util.*;

// Class containing Pascal's Triangle generation logic
class Solution {
    // Function to generate Pascal's Triangle up to numRows
    public List<List<Integer>> generate(int numRows) {
        // Result list to hold all rows
        List<List<Integer>> triangle = new ArrayList<>();

        // Loop for each row
        for (int i = 0; i < numRows; i++) {
            // Create a row with size (i+1)
            List<Integer> row = new ArrayList<>(Collections.nCopies(i + 1, 1));

            // Fill elements from index 1 to i-1 (middle values)
            for (int j = 1; j < i; j++) {
                // Each element = sum of two elements above it
                row.set(j, triangle.get(i - 1).get(j - 1) +
                           triangle.get(i - 1).get(j));
            }

            // Add current row to the triangle
            triangle.add(row);
        }
        return triangle;
    }
}

public class Main {
    public static void main(String[] args) {
        Solution obj = new Solution();
        int n = 5;

        // Generate and print Pascal's Triangle
        List<List<Integer>> result = obj.generate(n);
        for (List<Integer> row : result) {
            for (Integer val : row) System.out.print(val + " ");
            System.out.println();
        }
    }
}
```

##### PYTHON

```python
# Class containing Pascal's Triangle generation logic
class Solution:
    # Function to generate Pascal's Triangle up to numRows
    def generate(self, numRows):
        # Result list to hold all rows
        triangle = []

        # Loop for each row
        for i in range(numRows):
            # Create a row with size (i+1) and initialize all elements to 1
            row = [1] * (i + 1)

            # Fill elements from index 1 to i-1 (middle values)
            for j in range(1, i):
                # Each element = sum of two elements above it
                row[j] = triangle[i - 1][j - 1] + triangle[i - 1][j]

            # Add current row to the triangle
            triangle.append(row)

        return triangle


if __name__ == "__main__":
    obj = Solution()
    n = 5

    # Generate and print Pascal's Triangle
    result = obj.generate(n)
    for row in result:
        print(" ".join(map(str, row)))
```

##### JAVASCRIPT

```javascript
// Class containing Pascal's Triangle generation logic
class Solution {
    // Function to generate Pascal's Triangle up to numRows
    generate(numRows) {
        // Result array to hold all rows
        let triangle = [];

        // Loop for each row
        for (let i = 0; i < numRows; i++) {
            // Create a row with size (i+1) and initialize all elements to 1
            let row = new Array(i + 1).fill(1);

            // Fill elements from index 1 to i-1 (middle values)
            for (let j = 1; j < i; j++) {
                // Each element = sum of two elements above it
                row[j] = triangle[i - 1][j - 1] + triangle[i - 1][j];
            }

            // Add current row to the triangle
            triangle.push(row);
        }
        return triangle;
    }
}

// Main execution
let obj = new Solution();
let n = 5;

// Generate and print Pascal's Triangle
let result = obj.generate(n);
result.forEach(row => console.log(row.join(" ")));
```

---

### Approach - 2

#### Complexity Analysis

- **Time Complexity:** O(N), we iterate N times to compute each element of the row in O(1) time using the direct relation.
- **Space Complexity:** O(N), additional space used for storing the Nth row.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

// Class containing Pascal's Triangle row generation logic
class Solution {
public:
    // Function to generate the Nth row of Pascal's Triangle
    vector<long long> getNthRow(int N) {
        // Result vector to store the row
        vector<long long> row;
        
        // First value of the row is always 1
        long long val = 1;
        row.push_back(val);
        
        // Compute remaining values using the relation:
        // C(n, k) = C(n, k-1) * (n-k) / k
        for (int k = 1; k < N; k++) {
            val = val * (N - k) / k;
            row.push_back(val);
        }
        
        return row;
    }
};

int main() {
    int N = 5; // Example: 5th row
    Solution sol;
    vector<long long> result = sol.getNthRow(N);

    // Print the row
    for (auto num : result) {
        cout << num << " ";
    }
    return 0;
}
```

##### JAVA

```java
import java.util.*;

// Class containing Pascal's Triangle row generation logic
class Solution {
    // Function to generate the Nth row of Pascal's Triangle
    public List<Long> getNthRow(int N) {
        // Result list to store the row
        List<Long> row = new ArrayList<>();
        
        // First value of the row is always 1
        long val = 1;
        row.add(val);
        
        // Compute remaining values using the relation:
        // C(n, k) = C(n, k-1) * (n-k) / k
        for (int k = 1; k < N; k++) {
            val = val * (N - k) / k;
            row.add(val);
        }
        
        return row;
    }
}

public class Main {
    public static void main(String[] args) {
        int N = 5; // Example: 5th row
        Solution sol = new Solution();
        List<Long> result = sol.getNthRow(N);

        // Print the row
        for (long num : result) {
            System.out.print(num + " ");
        }
    }
}
```

##### PYTHON

```python
# Class containing Pascal's Triangle row generation logic
class Solution:
    # Function to generate the Nth row of Pascal's Triangle
    def getNthRow(self, N):
        # Result list to store the row
        row = []
        
        # First value of the row is always 1
        val = 1
        row.append(val)
        
        # Compute remaining values using the relation:
        # C(n, k) = C(n, k-1) * (n-k) / k
        for k in range(1, N):
            val = val * (N - k) // k
            row.append(val)
        
        return row

# Example usage
N = 5  # Example: 5th row
sol = Solution()
result = sol.getNthRow(N)

# Print the row
print(*result)
```

##### JAVASCRIPT

```javascript
// Class containing Pascal's Triangle row generation logic
class Solution {
    // Function to generate the Nth row of Pascal's Triangle
    getNthRow(N) {
        // Result array to store the row
        let row = [];
        
        // First value of the row is always 1
        let val = 1;
        row.push(val);
        
        // Compute remaining values using the relation:
        // C(n, k) = C(n, k-1) * (n-k) / k
        for (let k = 1; k < N; k++) {
            val = val * (N - k) / k;
            row.push(val);
        }
        
        return row;
    }
}

// Example usage
let N = 5; // Example: 5th row
let sol = new Solution();
let result = sol.getNthRow(N);

// Print the row
console.log(result.join(" "));
```

---

### Approach - 3

#### Complexity Analysis

- **Time Complexity:** O(min(c,r−c)), The loop runs for min(c−1,r−c) iterations because binomial coefficients are symmetric.
- **Space Complexity:** O(1), constant additional space is used.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

// Solution class to find the (r, c) element of Pascal's Triangle
class Solution {
public:
    // Function to compute binomial coefficient (nCr)
    long long findPascalElement(int r, int c) {
        // Element is C(r-1, c-1)
        int n = r - 1;
        int k = c - 1;

        long long result = 1;

        // Compute C(n, k) using iterative formula
        for (int i = 0; i < k; i++) {
            result *= (n - i);
            result /= (i + 1);
        }

        return result;
    }
};

int main() {
    Solution sol;
    int r = 5, c = 3;
    cout << sol.findPascalElement(r, c);
    return 0;
}
```

##### JAVA

```java
// Solution class to find the (r, c) element of Pascal's Triangle
class Solution {
    // Function to compute binomial coefficient (nCr)
    public long findPascalElement(int r, int c) {
        // Element is C(r-1, c-1)
        int n = r - 1;
        int k = c - 1;

        long result = 1;

        // Compute C(n, k) using iterative formula
        for (int i = 0; i < k; i++) {
            result *= (n - i);
            result /= (i + 1);
        }

        return result;
    }
}

// Main class to test the solution
public class Main {
    public static void main(String[] args) {
        Solution sol = new Solution();
        int r = 5, c = 3;
        System.out.println(sol.findPascalElement(r, c));
    }
}
```

##### PYTHON

```python
# Solution class to find the (r, c) element of Pascal's Triangle
class Solution:
    # Function to compute binomial coefficient (nCr)
    def findPascalElement(self, r, c):
        # Element is C(r-1, c-1)
        n = r - 1
        k = c - 1

        result = 1

        # Compute C(n, k) using iterative formula
        for i in range(k):
            result *= (n - i)
            result //= (i + 1)

        return result


# Main code to test the solution
if __name__ == "__main__":
    sol = Solution()
    r, c = 5, 3
    print(sol.findPascalElement(r, c))
```

##### JAVASCRIPT

```javascript
// Solution class to find the (r, c) element of Pascal's Triangle
class Solution {
    // Function to compute binomial coefficient (nCr)
    findPascalElement(r, c) {
        // Element is C(r-1, c-1)
        let n = r - 1;
        let k = c - 1;

        let result = 1;

        // Compute C(n, k) using iterative formula
        for (let i = 0; i < k; i++) {
            result *= (n - i);
            result /= (i + 1);
        }

        return result;
    }
}

// Main code to test the solution
const sol = new Solution();
let r = 5, c = 3;
console.log(sol.findPascalElement(r, c));
```

---

