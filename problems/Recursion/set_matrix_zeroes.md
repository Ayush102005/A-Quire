# Set Matrix Zeroes

- **Topic:** Recursion
- **Difficulty:** Medium
- **LeetCode Link:** [Solve on LeetCode](https://leetcode.com/problems/set-matrix-zeroes/)
- **TUF+ Link:** [Solve on TUF+](https://takeuforward.org/plus/dsa/problems/set-matrix-zeroes?source=strivers-sde-sheet)
- **YouTube Video:** [Watch Video Explanation](https://youtu.be/N0MgLvceX7M)
- **Article Link:** [Full Editorial](https://takeuforward.org/data-structure/set-matrix-zero/)

## Problem Statement

Given a matrix if an element in the matrix is 0 then you will have to set its entire column and row to 0 and then return the matrix..

---

## Approaches

### Brute force Approach

#### Complexity Analysis

- **Time Complexity:** O(m * n * (m + n)), We iterate through every cell (m * n), and for each zero, we potentially mark its entire row (O(n)) and column (O(m)), leading to O(m * n * (m + n)) overall.
- **Space Complexity:** O(1), We are not using any extra data structures, only modifying the matrix in place (apart from a few variables).

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
     // Function to set entire row and column to 0 if an element in the matrix is 0
    void setZeroes(vector<vector<int>>& matrix) {
        // Get number of rows
        int m = matrix.size();
        // Get number of columns
        int n = matrix[0].size();

        // Traverse each cell of the matrix
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                // If current cell is zero
                if (matrix[i][j] == 0) {
                    // Mark all elements in this row as -1 (except existing zeros)
                    for (int col = 0; col < n; col++) {
                        if (matrix[i][col] != 0)
                            matrix[i][col] = -1;
                    }
                    // Mark all elements in this column as -1 (except existing zeros)
                    for (int row = 0; row < m; row++) {
                        if (matrix[row][j] != 0)
                            matrix[row][j] = -1;
                    }
                }
            }
        }

        // Second pass: replace all -1 markers with 0
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (matrix[i][j] == -1)
                    matrix[i][j] = 0;
            }
        }
    }
};

int main() {
    // Example matrix
    vector<vector<int>> matrix = {{1,1,1},{1,0,1},{1,1,1}};
    
    // Create Solution object
    Solution sol;
    // Call function to modify matrix
    sol.setZeroes(matrix);
    
    // Print final matrix
    for (auto row : matrix) {
        for (auto val : row) {
            cout << val << " ";
        }
        cout << endl;
    }
    return 0;
}
```

##### JAVA

```java
import java.util.*;

class Solution {
    // Function to set entire row and column to 0 if an element in the matrix is 0
    public void setZeroes(int[][] matrix) {
        // Get number of rows
        int m = matrix.length;
        // Get number of columns
        int n = matrix[0].length;

        // First pass: mark rows and columns
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                // If the cell is zero
                if (matrix[i][j] == 0) {
                    // Mark entire row as -1 (except zeros)
                    for (int col = 0; col < n; col++) {
                        if (matrix[i][col] != 0)
                            matrix[i][col] = -1;
                    }
                    // Mark entire column as -1 (except zeros)
                    for (int row = 0; row < m; row++) {
                        if (matrix[row][j] != 0)
                            matrix[row][j] = -1;
                    }
                }
            }
        }

        // Second pass: replace -1 with 0
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (matrix[i][j] == -1)
                    matrix[i][j] = 0;
            }
        }
    }
}

public class Main {
    public static void main(String[] args) {
        // Example matrix
        int[][] matrix = {{1,1,1},{1,0,1},{1,1,1}};
        
        // Create Solution object
        Solution sol = new Solution();
        // Modify matrix
        sol.setZeroes(matrix);
        
        // Print result
        for (int[] row : matrix) {
            for (int val : row) {
                System.out.print(val + " ");
            }
            System.out.println();
        }
    }
}
```

##### PYTHON

```python
class Solution:
     # Function to set entire row and column to 0 if an element in the matrix is 0
    def setZeroes(self, matrix):
        # Get number of rows
        m = len(matrix)
        # Get number of columns
        n = len(matrix[0])

        # First pass: mark rows and columns
        for i in range(m):
            for j in range(n):
                # If current cell is zero
                if matrix[i][j] == 0:
                    # Mark entire row
                    for col in range(n):
                        if matrix[i][col] != 0:
                            matrix[i][col] = -1
                    # Mark entire column
                    for row in range(m):
                        if matrix[row][j] != 0:
                            matrix[row][j] = -1

        # Second pass: replace -1 with 0
        for i in range(m):
            for j in range(n):
                if matrix[i][j] == -1:
                    matrix[i][j] = 0

# Driver code
matrix = [[1,1,1],[1,0,1],[1,1,1]]
sol = Solution()
sol.setZeroes(matrix)
for row in matrix:
    print(row)
```

##### JAVASCRIPT

```javascript
class Solution {
    // Function to set entire row and column to 0 if an element in the matrix is 0
    setZeroes(matrix) {
        // Get number of rows
        let m = matrix.length;
        // Get number of columns
        let n = matrix[0].length;

        // First pass: mark with -1
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                if (matrix[i][j] === 0) {
                    // Mark row
                    for (let col = 0; col < n; col++) {
                        if (matrix[i][col] !== 0)
                            matrix[i][col] = -1;
                    }
                    // Mark column
                    for (let row = 0; row < m; row++) {
                        if (matrix[row][j] !== 0)
                            matrix[row][j] = -1;
                    }
                }
            }
        }

        // Second pass: replace -1 with 0
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                if (matrix[i][j] === -1)
                    matrix[i][j] = 0;
            }
        }
    }
}

// Driver code
let matrix = [[1,1,1],[1,0,1],[1,1,1]];
let sol = new Solution();
sol.setZeroes(matrix);
console.log(matrix);
```

---

### Better Approach

#### Complexity Analysis

- **Time Complexity:** O(m × n),We make two passes over the matrix.First pass to identify rows and columns to be zeroed (O(m × n)).Second pass to update the matrix using the markers (O(m × n)).Total time is proportional to the number of cells in the matrix, so O(m × n).
- **Space Complexity:** O(m + n),We store two extra arrays one for m rows and one for n columns.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Function to set entire row and column to 0 if an element in the matrix is 0
    void setZeroes(vector<vector<int>>& matrix) {
        // Get number of rows
        int m = matrix.size();
        // Get number of columns
        int n = matrix[0].size();

        // Create row marker array
        vector<int> row(m, 0);
        // Create column marker array
        vector<int> col(n, 0);

        // First pass: mark rows and columns that need to be zeroed
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                // If element is zero, mark its row and column
                if (matrix[i][j] == 0) {
                    row[i] = 1;
                    col[j] = 1;
                }
            }
        }

        // Second pass: set cells to zero based on markers
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                // If the row or column is marked, set cell to zero
                if (row[i] == 1 || col[j] == 1) {
                    matrix[i][j] = 0;
                }
            }
        }
    }
};

int main() {
    // Create the matrix
    vector<vector<int>> matrix = {{1,1,1},{1,0,1},{1,1,1}};
    
    // Create Solution object
    Solution obj;
    // Call function
    obj.setZeroes(matrix);
    
    // Print the updated matrix
    for (auto row : matrix) {
        for (auto val : row) {
            cout << val << " ";
        }
        cout << endl;
    }
    return 0;
}
```

##### JAVA

```java
import java.util.*;

class Solution {
    // Function to set entire row and column to 0 if an element in the matrix is 0
    public void setZeroes(int[][] matrix) {
        // Get number of rows
        int m = matrix.length;
        // Get number of columns
        int n = matrix[0].length;

        // Create row marker array
        boolean[] row = new boolean[m];
        // Create column marker array
        boolean[] col = new boolean[n];

        // First pass: mark rows and columns that need to be zeroed
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                // If element is zero, mark its row and column
                if (matrix[i][j] == 0) {
                    row[i] = true;
                    col[j] = true;
                }
            }
        }

        // Second pass: set cells to zero based on markers
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                // If the row or column is marked, set cell to zero
                if (row[i] || col[j]) {
                    matrix[i][j] = 0;
                }
            }
        }
    }
}

public class Main {
    public static void main(String[] args) {
        // Create the matrix
        int[][] matrix = {{1,1,1},{1,0,1},{1,1,1}};
        
        // Create Solution object
        Solution obj = new Solution();
        // Call function
        obj.setZeroes(matrix);
        
        // Print the updated matrix
        for (int[] row : matrix) {
            for (int val : row) {
                System.out.print(val + " ");
            }
            System.out.println();
        }
    }
}
```

##### PYTHON

```python
class Solution:
    # Function to set entire row and column to 0 if an element in the matrix is 0
    def setZeroes(self, matrix):
        # Get number of rows
        m = len(matrix)
        # Get number of columns
        n = len(matrix[0])

        # Create row marker array
        row = [0] * m
        # Create column marker array
        col = [0] * n

        # First pass: mark rows and columns that need to be zeroed
        for i in range(m):
            for j in range(n):
                # If element is zero, mark its row and column
                if matrix[i][j] == 0:
                    row[i] = 1
                    col[j] = 1

        # Second pass: set cells to zero based on markers
        for i in range(m):
            for j in range(n):
                # If the row or column is marked, set cell to zero
                if row[i] == 1 or col[j] == 1:
                    matrix[i][j] = 0

# Driver code
matrix = [[1,1,1],[1,0,1],[1,1,1]]
obj = Solution()
obj.setZeroes(matrix)
for r in matrix:
    print(r)
```

##### JAVASCRIPT

```javascript
class Solution {
    // Function to set entire row and column to 0 if an element in the matrix is 0
    setZeroes(matrix) {
        // Get number of rows
        const m = matrix.length;
        // Get number of columns
        const n = matrix[0].length;

        // Create row marker array
        const row = new Array(m).fill(false);
        // Create column marker array
        const col = new Array(n).fill(false);

        // First pass: mark rows and columns that need to be zeroed
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                // If element is zero, mark its row and column
                if (matrix[i][j] === 0) {
                    row[i] = true;
                    col[j] = true;
                }
            }
        }

        // Second pass: set cells to zero based on markers
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                // If the row or column is marked, set cell to zero
                if (row[i] || col[j]) {
                    matrix[i][j] = 0;
                }
            }
        }
    }
}

// Driver code
let matrix = [[1,1,1],[1,0,1],[1,1,1]];
let obj = new Solution();
obj.setZeroes(matrix);
console.log(matrix);
```

---

### Optimal Approach

#### Complexity Analysis

- **Time Complexity:** O(m × n),We iterate over the entire matrix a constant number of times (first pass for markers, second pass for zeroing, final pass for first row/col), where m = number of rows and n = number of columns.
- **Space Complexity:** O(1),No extra space is used apart from a few boolean flags; all marker information is stored within the first row and column of the matrix itself.

#### Code Solutions

##### CPP

```cpp
#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    // Function to set entire row and column to 0 if an element in the matrix is 0 (Optimal O(1) space)
    void setZeroes(vector<vector<int>>& matrix) {
        // Get dimensions of matrix
        int m = matrix.size();
        int n = matrix[0].size();

        // Flag to track if first row should be zeroed
        bool firstRowZero = false;
        // Flag to track if first column should be zeroed
        bool firstColZero = false;

        // Check if first row has any zero
        for (int j = 0; j < n; j++) {
            if (matrix[0][j] == 0) {
                firstRowZero = true;
                break;
            }
        }

        // Check if first column has any zero
        for (int i = 0; i < m; i++) {
            if (matrix[i][0] == 0) {
                firstColZero = true;
                break;
            }
        }

        // Mark rows and columns in first row/column
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                if (matrix[i][j] == 0) {
                    matrix[i][0] = 0;
                    matrix[0][j] = 0;
                }
            }
        }

        // Set matrix cells to zero based on markers
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                if (matrix[i][0] == 0 || matrix[0][j] == 0) {
                    matrix[i][j] = 0;
                }
            }
        }

        // Handle first row
        if (firstRowZero) {
            for (int j = 0; j < n; j++) {
                matrix[0][j] = 0;
            }
        }

        // Handle first column
        if (firstColZero) {
            for (int i = 0; i < m; i++) {
                matrix[i][0] = 0;
            }
        }
    }
};

int main() {
    Solution obj;
    vector<vector<int>> matrix = {{0,1,2,0},{3,4,5,2},{1,3,1,5}};
    obj.setZeroes(matrix);
    for (auto row : matrix) {
        for (auto val : row) {
            cout << val << " ";
        }
        cout << endl;
    }
    return 0;
}
```

##### JAVA

```java
import.java.util.*;
class Solution {
    // Function to set entire row and column to 0 if an element in the matrix 
    public void setZeroes(int[][] matrix) {
        // Get dimensions of matrix
        int m = matrix.length;
        int n = matrix[0].length;

        // Flag to track if first row should be zeroed
        boolean firstRowZero = false;
        // Flag to track if first column should be zeroed
        boolean firstColZero = false;

        // Check if first row has any zero
        for (int j = 0; j < n; j++) {
            if (matrix[0][j] == 0) {
                firstRowZero = true;
                break;
            }
        }

        // Check if first column has any zero
        for (int i = 0; i < m; i++) {
            if (matrix[i][0] == 0) {
                firstColZero = true;
                break;
            }
        }

        // Use first row/column as markers
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                if (matrix[i][j] == 0) {
                    matrix[i][0] = 0;
                    matrix[0][j] = 0;
                }
            }
        }

        // Set cells to zero based on markers
        for (int i = 1; i < m; i++) {
            for (int j = 1; j < n; j++) {
                if (matrix[i][0] == 0 || matrix[0][j] == 0) {
                    matrix[i][j] = 0;
                }
            }
        }

        // Zero the first row if needed
        if (firstRowZero) {
            for (int j = 0; j < n; j++) {
                matrix[0][j] = 0;
            }
        }

        // Zero the first column if needed
        if (firstColZero) {
            for (int i = 0; i < m; i++) {
                matrix[i][0] = 0;
            }
        }
    }
}

// Main class to run the program
public class Main {
    public static void main(String[] args) {
        Solution obj = new Solution();
        int[][] matrix = {{0,1,2,0},{3,4,5,2},{1,3,1,5}};
        obj.setZeroes(matrix);
        for (int[] row : matrix) {
            for (int val : row) {
                System.out.print(val + " ");
            }
            System.out.println();
        }
    }
}
```

##### PYTHON

```python
class Solution:
    # Function to set entire row and column to 0 if an element in the matrix 
    def setZeroes(self, matrix):
        # Get dimensions of matrix
        m = len(matrix)
        n = len(matrix[0])

        # Flag to track if first row should be zeroed
        first_row_zero = False
        # Flag to track if first column should be zeroed
        first_col_zero = False

        # Check if first row has any zero
        for j in range(n):
            if matrix[0][j] == 0:
                first_row_zero = True
                break

        # Check if first column has any zero
        for i in range(m):
            if matrix[i][0] == 0:
                first_col_zero = True
                break

        # Use first row/column as markers
        for i in range(1, m):
            for j in range(1, n):
                if matrix[i][j] == 0:
                    matrix[i][0] = 0
                    matrix[0][j] = 0

        # Set cells to zero based on markers
        for i in range(1, m):
            for j in range(1, n):
                if matrix[i][0] == 0 or matrix[0][j] == 0:
                    matrix[i][j] = 0

        # Zero the first row if needed
        if first_row_zero:
            for j in range(n):
                matrix[0][j] = 0

        # Zero the first column if needed
        if first_col_zero:
            for i in range(m):
                matrix[i][0] = 0


# Driver code
matrix = [[0,1,2,0],[3,4,5,2],[1,3,1,5]]
Solution().setZeroes(matrix)
for row in matrix:
    print(row)
```

##### JAVASCRIPT

```javascript
class Solution {
    // Function to set entire row and column to 0 if an element in the matrix 
    setZeroes(matrix) {
        // Get dimensions of matrix
        let m = matrix.length;
        let n = matrix[0].length;

        // Flag to track if first row should be zeroed
        let firstRowZero = false;
        // Flag to track if first column should be zeroed
        let firstColZero = false;

        // Check if first row has any zero
        for (let j = 0; j < n; j++) {
            if (matrix[0][j] === 0) {
                firstRowZero = true;
                break;
            }
        }

        // Check if first column has any zero
        for (let i = 0; i < m; i++) {
            if (matrix[i][0] === 0) {
                firstColZero = true;
                break;
            }
        }

        // Use first row/column as markers
        for (let i = 1; i < m; i++) {
            for (let j = 1; j < n; j++) {
                if (matrix[i][j] === 0) {
                    matrix[i][0] = 0;
                    matrix[0][j] = 0;
                }
            }
        }

        // Set cells to zero based on markers
        for (let i = 1; i < m; i++) {
            for (let j = 1; j < n; j++) {
                if (matrix[i][0] === 0 || matrix[0][j] === 0) {
                    matrix[i][j] = 0;
                }
            }
        }

        // Zero the first row if needed
        if (firstRowZero) {
            for (let j = 0; j < n; j++) {
                matrix[0][j] = 0;
            }
        }

        // Zero the first column if needed
        if (firstColZero) {
            for (let i = 0; i < m; i++) {
                matrix[i][0] = 0;
            }
        }
    }
}

// Driver code
let matrix = [[0,1,2,0],[3,4,5,2],[1,3,1,5]];
new Solution().setZeroes(matrix);
console.log(matrix);
```

---

